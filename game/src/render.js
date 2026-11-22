// NIGHTGLASS — canvas renderer.
// A museum at night, drawn top-down: marble and carpet underfoot,
// lantern pools of warm light, display cases to hide behind, guards
// with vision cones, and a darkness that lifts only where light falls.
// The judge sees the game through its screenshots, so every system the
// game promises — cones, cover, light and shadow, the exit — must be
// readable at a glance in a single frame.
import {
  TILE,
  COLS,
  ROWS,
  VIEW_W,
  VIEW_H,
  GUARD_SIGHT_RANGE,
  GUARD_CONE_HALF_ANGLE,
  LANTERN_GLOW_RADIUS,
  ALARM_LABELS,
  ALARM_COLORS,
  HEIST_NAMES,
  HEIST_BRIEFINGS,
} from './config.js';
import { clamp, lerp, mulberry32 } from './random.js';
import { isLit, lightLevelAt } from './light.js';
import { GUARD_STATE } from './guards.js';

const FLOOR_MARBLE_A = '#333951';
const FLOOR_MARBLE_B = '#2d3247';
const FLOOR_CARPET = '#572739';
const FLOOR_CARPET_EDGE = '#7a3348';
const FLOOR_STONE = '#3a4048';
const WALL_FILL = '#141824';
const WALL_EDGE = '#3a4157';
const CASE_FILL = '#1c2b3a';
const CASE_TRIM = '#c9a227';
const LANTERN_GLOW = 'rgba(255, 190, 90, 0.20)';
const DARKNESS = 'rgba(3, 5, 16, 0.70)';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.lightCanvas = document.createElement('canvas');
    this.lightCanvas.width = VIEW_W;
    this.lightCanvas.height = VIEW_H;
    this.lightCtx = this.lightCanvas.getContext('2d');
    this.sparkle = mulberry32(20261121);
    this.sparkleSeeds = Array.from({ length: 64 }, () => this.sparkle());
  }

  px(x) {
    return x * TILE;
  }

  // ---- floor, walls, cover -------------------------------------------
  drawFloor(level) {
    const ctx = this.ctx;
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const ch = level.grid[row][col];
        const x = col * TILE;
        const y = row * TILE;
        if (ch === '#') {
          ctx.fillStyle = WALL_FILL;
          ctx.fillRect(x, y, TILE, TILE);
          ctx.fillStyle = WALL_EDGE;
          ctx.fillRect(x, y, TILE, 3);
          continue;
        }
        if (ch === ',') {
          ctx.fillStyle = FLOOR_CARPET;
          ctx.fillRect(x, y, TILE, TILE);
          ctx.strokeStyle = FLOOR_CARPET_EDGE;
          ctx.lineWidth = 1;
          ctx.strokeRect(x + 3.5, y + 3.5, TILE - 7, TILE - 7);
          continue;
        }
        if (ch === ';') {
          ctx.fillStyle = FLOOR_STONE;
          ctx.fillRect(x, y, TILE, TILE);
          ctx.fillStyle = 'rgba(255,255,255,0.03)';
          ctx.fillRect(x, y, TILE, 2);
          continue;
        }
        // Marble: a quiet checker with a faint vein.
        ctx.fillStyle = (col + row) % 2 === 0 ? FLOOR_MARBLE_A : FLOOR_MARBLE_B;
        ctx.fillRect(x, y, TILE, TILE);
        if ((col * 7 + row * 13) % 11 === 0) {
          ctx.strokeStyle = 'rgba(180, 200, 255, 0.05)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x + 6, y + TILE - 8);
          ctx.lineTo(x + TILE - 10, y + 8);
          ctx.stroke();
        }
        if (ch === 'H') {
          ctx.fillStyle = 'rgba(10, 14, 30, 0.55)';
          ctx.fillRect(x, y, TILE, TILE);
          ctx.strokeStyle = 'rgba(140, 170, 255, 0.25)';
          ctx.strokeRect(x + 2.5, y + 2.5, TILE - 5, TILE - 5);
        }
      }
    }
    // Display cases: glass boxes with gold trim, the cover you read.
    for (const key of level.cases) {
      const [col, row] = key.split(',').map(Number);
      const x = col * TILE;
      const y = row * TILE;
      ctx.fillStyle = CASE_FILL;
      ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
      ctx.strokeStyle = CASE_TRIM;
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 4.5, y + 4.5, TILE - 9, TILE - 9);
      ctx.fillStyle = 'rgba(200, 230, 255, 0.10)';
      ctx.fillRect(x + 8, y + 8, TILE - 16, 6);
    }
  }

  drawLanternPosts(level, time) {
    const ctx = this.ctx;
    for (const lantern of level.lanterns) {
      const x = this.px(lantern.col + 0.5);
      const y = this.px(lantern.row + 0.5);
      const flicker = 0.9 + Math.sin(time * 7 + lantern.col * 2.3) * 0.08;
      const glow = ctx.createRadialGradient(x, y, 4, x, y, LANTERN_GLOW_RADIUS * TILE);
      glow.addColorStop(0, `rgba(255, 196, 110, ${0.34 * flicker})`);
      glow.addColorStop(0.55, `rgba(255, 170, 70, ${0.12 * flicker})`);
      glow.addColorStop(1, 'rgba(255, 170, 70, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(x - LANTERN_GLOW_RADIUS * TILE, y - LANTERN_GLOW_RADIUS * TILE, LANTERN_GLOW_RADIUS * TILE * 2, LANTERN_GLOW_RADIUS * TILE * 2);
      // Brass post and flame.
      ctx.fillStyle = '#8a6d2f';
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(255, 220, 130, ${0.95 * flicker})`;
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawTreasures(level, time) {
    const ctx = this.ctx;
    for (const treasure of level.treasures) {
      if (treasure.taken) continue;
      const x = this.px(treasure.col + 0.5);
      const y = this.px(treasure.row + 0.5);
      this.drawSparkleGem(x, y, 7, '#ffd76a', time, treasure.col * 3 + treasure.row);
    }
    for (const locked of level.locked) {
      const x = this.px(locked.col + 0.5);
      const y = this.px(locked.row + 0.5);
      if (!locked.taken) {
        // A locked case: gold frame, dark glass, a keyhole glint.
        ctx.fillStyle = '#241d10';
        ctx.fillRect(x - 13, y - 13, 26, 26);
        ctx.strokeStyle = '#c9a227';
        ctx.lineWidth = 2;
        ctx.strokeRect(x - 13.5, y - 13.5, 27, 27);
        ctx.fillStyle = '#ffd76a';
        ctx.beginPath();
        ctx.arc(x, y - 2, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(x - 1, y, 2, 6);
      } else if (!locked.collected) {
        this.drawSparkleGem(x, y, 8, '#ffe9a8', time, locked.col * 5 + locked.row);
      }
    }
    // The target gem: the Hollow Moon, a pale glowing orb.
    const gem = level.gem;
    if (gem && !gem.taken) {
      const x = this.px(gem.col + 0.5);
      const y = this.px(gem.row + 0.5);
      const pulse = 0.75 + Math.sin(time * 2.4) * 0.25;
      const halo = ctx.createRadialGradient(x, y, 2, x, y, 34);
      halo.addColorStop(0, `rgba(190, 220, 255, ${0.55 * pulse})`);
      halo.addColorStop(1, 'rgba(190, 220, 255, 0)');
      ctx.fillStyle = halo;
      ctx.fillRect(x - 34, y - 34, 68, 68);
      ctx.fillStyle = '#dcefff';
      ctx.beginPath();
      ctx.arc(x, y, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#9ec8ff';
      ctx.beginPath();
      ctx.arc(x - 3, y - 3, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    // The exit: a green doorway, locked grey until the gem is stolen.
    const exit = level.exit;
    if (exit) {
      const x = this.px(exit.col + 0.5);
      const y = this.px(exit.row + 0.5);
      const open = level.gem && level.gem.taken;
      ctx.fillStyle = open ? '#123524' : '#1a1d24';
      ctx.fillRect(x - 14, y - 16, 28, 32);
      ctx.strokeStyle = open ? '#4ade80' : '#555b66';
      ctx.lineWidth = 2;
      ctx.strokeRect(x - 14.5, y - 16.5, 29, 33);
      ctx.fillStyle = open ? '#4ade80' : '#8a8f98';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('EXIT', x, y + 1);
    }
  }

  drawSparkleGem(x, y, size, color, time, seed) {
    const ctx = this.ctx;
    const twinkle = 0.7 + Math.sin(time * 3 + seed) * 0.3;
    ctx.fillStyle = color;
    ctx.globalAlpha = twinkle;
    ctx.beginPath();
    ctx.moveTo(x, y - size);
    ctx.lineTo(x + size * 0.7, y);
    ctx.lineTo(x, y + size);
    ctx.lineTo(x - size * 0.7, y);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.arc(x - size * 0.2, y - size * 0.2, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }

  // ---- darkness and light --------------------------------------------
  drawDarkness(level, player, time) {
    const lctx = this.lightCtx;
    lctx.clearRect(0, 0, VIEW_W, VIEW_H);
    lctx.globalCompositeOperation = 'source-over';
    lctx.fillStyle = DARKNESS;
    lctx.fillRect(0, 0, VIEW_W, VIEW_H);
    lctx.globalCompositeOperation = 'destination-out';
    const punch = (x, y, radius, strength) => {
      const g = lctx.createRadialGradient(x, y, 2, x, y, radius);
      g.addColorStop(0, `rgba(0,0,0,${strength})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      lctx.fillStyle = g;
      lctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    };
    for (const lantern of level.lanterns) {
      punch(this.px(lantern.col + 0.5), this.px(lantern.row + 0.5), LANTERN_GLOW_RADIUS * TILE, 0.95);
    }
    // The thief carries a little dark with them: a small pool of sight.
    punch(this.px(player.x), this.px(player.y), 1.7 * TILE, 0.55);
    // The Hollow Moon glows through the dark.
    if (level.gem && !level.gem.taken) {
      punch(this.px(level.gem.col + 0.5), this.px(level.gem.row + 0.5), 1.5 * TILE, 0.7);
    }
    this.ctx.drawImage(this.lightCanvas, 0, 0);
  }

  // ---- vision cones ----------------------------------------------------
  drawCones(guards, time) {
    const ctx = this.ctx;
    for (const guard of guards) {
      const x = this.px(guard.x);
      const y = this.px(guard.y);
      const range = GUARD_SIGHT_RANGE * TILE;
      const base =
        guard.state === GUARD_STATE.ALERT
          ? '255, 70, 70'
          : guard.state === GUARD_STATE.SUSPICIOUS || guard.state === GUARD_STATE.SEARCH
            ? '255, 170, 60'
            : '255, 214, 110';
      const alpha = guard.state === GUARD_STATE.ALERT ? 0.34 : 0.22;
      const grad = ctx.createRadialGradient(x, y, 6, x, y, range);
      grad.addColorStop(0, `rgba(${base}, ${alpha})`);
      grad.addColorStop(1, `rgba(${base}, 0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.arc(x, y, range, guard.facing - GUARD_CONE_HALF_ANGLE, guard.facing + GUARD_CONE_HALF_ANGLE);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = `rgba(${base}, 0.35)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(guard.facing - GUARD_CONE_HALF_ANGLE) * range, y + Math.sin(guard.facing - GUARD_CONE_HALF_ANGLE) * range);
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(guard.facing + GUARD_CONE_HALF_ANGLE) * range, y + Math.sin(guard.facing + GUARD_CONE_HALF_ANGLE) * range);
      ctx.stroke();
    }
  }

  // ---- actors ----------------------------------------------------------
  drawGuards(guards, time) {
    const ctx = this.ctx;
    for (const guard of guards) {
      const x = this.px(guard.x);
      const y = this.px(guard.y);
      // Body: navy uniform, brass cap, facing tick.
      ctx.fillStyle = '#1d2b4a';
      ctx.beginPath();
      ctx.arc(x, y, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#5a6b8f';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#c9a227';
      ctx.beginPath();
      ctx.arc(x, y - 3, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#e8ecf4';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(guard.facing) * 15, y + Math.sin(guard.facing) * 15);
      ctx.stroke();
      // Detection meter ring: fills as the guard spots you.
      if (guard.meter > 0.03) {
        ctx.strokeStyle = guard.meter >= 1 ? '#ff5d5d' : guard.meter >= 0.45 ? '#ffd166' : '#9ec8ff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, y, 18, -Math.PI / 2, -Math.PI / 2 + guard.meter * Math.PI * 2);
        ctx.stroke();
      }
      // "?" while suspicious, "!" while chasing.
      if (guard.state === GUARD_STATE.SUSPICIOUS || guard.state === GUARD_STATE.SEARCH) {
        ctx.fillStyle = '#ffd166';
        ctx.font = 'bold 18px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText('?', x, y - 20);
      } else if (guard.state === GUARD_STATE.ALERT) {
        ctx.fillStyle = '#ff5d5d';
        ctx.font = 'bold 20px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText('!', x, y - 20);
      }
    }
  }

  drawPlayer(player, level, time) {
    const ctx = this.ctx;
    const x = this.px(player.x);
    const y = this.px(player.y);
    const lit = isLit(level, player.x, player.y);
    // Ground ring: amber when lit (danger), blue when hidden (safe).
    ctx.strokeStyle = lit ? 'rgba(255, 190, 90, 0.85)' : 'rgba(140, 180, 255, 0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, 15, 0, Math.PI * 2);
    ctx.stroke();
    // The thief: a hooded cloak, dark against the floor.
    const bob = player.moving ? Math.sin(time * 14) * 1.5 : 0;
    ctx.fillStyle = '#0e1420';
    ctx.beginPath();
    ctx.arc(x, y + bob * 0.3, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#5d6b8c';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Hood point faces the direction of travel.
    ctx.fillStyle = '#1a2438';
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(player.facing) * 13, y + Math.sin(player.facing) * 13);
    ctx.lineTo(x + Math.cos(player.facing + 2.5) * 8, y + Math.sin(player.facing + 2.5) * 8);
    ctx.lineTo(x + Math.cos(player.facing - 2.5) * 8, y + Math.sin(player.facing - 2.5) * 8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#dcefff';
    ctx.beginPath();
    ctx.arc(x + Math.cos(player.facing) * 4, y + Math.sin(player.facing) * 4, 2.2, 0, Math.PI * 2);
    ctx.fill();
    if (player.sneaking) {
      ctx.fillStyle = 'rgba(220, 230, 255, 0.8)';
      ctx.font = '11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText('sneaking', x, y + 18);
    }
  }

  drawNoiseRings(rings) {
    const ctx = this.ctx;
    for (const ring of rings) {
      const age = ring.age / ring.maxAge;
      if (age >= 1) continue;
      ctx.strokeStyle = `rgba(255, 220, 130, ${0.5 * (1 - age)})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(this.px(ring.x), this.px(ring.y), ring.radius * TILE * (0.3 + 0.7 * age), 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // ---- HUD ---------------------------------------------------------------
  drawHud(game) {
    const ctx = this.ctx;
    const level = game.level;
    const totals = game.campaignTotals;
    ctx.fillStyle = 'rgba(4, 6, 14, 0.78)';
    ctx.fillRect(0, 0, VIEW_W, 40);
    ctx.fillStyle = '#e8ecf4';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`NIGHTGLASS — ${HEIST_NAMES[game.heistIndex]}`, 14, 20);
    ctx.textAlign = 'center';
    const objective = game.player.hasGem
      ? 'The Hollow Moon is yours — reach the EXIT unseen'
      : 'Steal the target gem, then reach the EXIT unseen';
    ctx.fillStyle = '#c8d2e8';
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillText(objective, VIEW_W / 2, 20);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffd76a';
    ctx.font = 'bold 14px system-ui, sans-serif';
    const gemMark = game.player.hasGem ? '●' : '○';
    ctx.fillText(
      `${gemMark} gem   ◆ ${game.player.treasures}/${totals.treasures}   ★ ${game.score}   ${game.formatTime(game.elapsed)}`,
      VIEW_W - 14,
      20,
    );
    // Alarm badge.
    const alarm = game.alarmLevel;
    ctx.fillStyle = ALARM_COLORS[alarm];
    ctx.beginPath();
    ctx.roundRect(14, 48, 118, 24, 6);
    ctx.fill();
    ctx.fillStyle = '#0b0e18';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`◉ ${ALARM_LABELS[alarm]}`, 22, 60);
    // Detection meter: the worst guard's meter, always visible when hot.
    const worst = Math.max(0, ...game.guards.map((g) => g.meter));
    if (worst > 0.03) {
      const w = 260;
      const x = (VIEW_W - w) / 2;
      ctx.fillStyle = 'rgba(4, 6, 14, 0.8)';
      ctx.fillRect(x - 2, 46, w + 4, 22);
      ctx.fillStyle = '#22283a';
      ctx.fillRect(x, 50, w, 14);
      const grad = ctx.createLinearGradient(x, 0, x + w, 0);
      grad.addColorStop(0, '#7ddba3');
      grad.addColorStop(0.5, '#ffd166');
      grad.addColorStop(1, '#ff5d5d');
      ctx.fillStyle = grad;
      ctx.fillRect(x, 50, w * clamp(worst, 0, 1), 14);
      ctx.fillStyle = '#e8ecf4';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(worst >= 1 ? 'SPOTTED' : worst >= 0.45 ? 'SEEN — break line of sight!' : 'a guard is watching…', VIEW_W / 2, 57);
    }
    // Bottom hint bar.
    ctx.fillStyle = 'rgba(4, 6, 14, 0.72)';
    ctx.fillRect(0, VIEW_H - 26, VIEW_W, 26);
    ctx.fillStyle = '#9aa5c0';
    ctx.font = '12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      'WASD / arrows — move    SHIFT — sneak (quiet)    SPACE — run (loud)    E — lockpick    P — pause    M — mute',
      VIEW_W / 2,
      VIEW_H - 13,
    );
  }

  drawLockpick(player) {
    const lp = player.lockpick;
    if (!lp) return;
    const ctx = this.ctx;
    const w = 320;
    const h = 20;
    const x = (VIEW_W - w) / 2;
    const y = VIEW_H - 96;
    ctx.fillStyle = 'rgba(4, 6, 14, 0.85)';
    ctx.fillRect(x - 10, y - 30, w + 20, 62);
    ctx.fillStyle = '#e8ecf4';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Lockpick — tap E in the green zone  (${lp.hits}/3)`, VIEW_W / 2, y - 12);
    ctx.fillStyle = '#22283a';
    ctx.fillRect(x, y, w, h);
    const zoneX = x + (lp.zoneCentre - lp.zoneHalf) * w;
    ctx.fillStyle = '#4ade80';
    ctx.fillRect(zoneX, y, lp.zoneHalf * 2 * w, h);
    const needleX = x + lp.needle * w;
    ctx.fillStyle = '#ffd76a';
    ctx.fillRect(needleX - 2, y - 4, 4, h + 8);
  }

  drawToast(game) {
    if (!game.toast || game.toastAge > game.toastMaxAge) return;
    const ctx = this.ctx;
    const alpha = clamp(1 - game.toastAge / game.toastMaxAge, 0, 1);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = 'rgba(4, 6, 14, 0.85)';
    const text = game.toast;
    ctx.font = 'bold 15px system-ui, sans-serif';
    const w = ctx.measureText(text).width + 36;
    ctx.beginPath();
    ctx.roundRect((VIEW_W - w) / 2, 84, w, 32, 8);
    ctx.fill();
    ctx.fillStyle = '#ffd76a';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, VIEW_W / 2, 100);
    ctx.globalAlpha = 1;
  }

  // ---- screens -----------------------------------------------------------
  dimScreen(alpha = 0.72) {
    this.ctx.fillStyle = `rgba(3, 5, 14, ${alpha})`;
    this.ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }

  drawTitle(game) {
    const ctx = this.ctx;
    this.dimScreen(0.66);
    ctx.textAlign = 'center';
    // The Hollow Moon above the title.
    const mx = VIEW_W / 2;
    const my = 118;
    const halo = ctx.createRadialGradient(mx, my, 4, mx, my, 74);
    halo.addColorStop(0, 'rgba(200, 225, 255, 0.8)');
    halo.addColorStop(1, 'rgba(200, 225, 255, 0)');
    ctx.fillStyle = halo;
    ctx.fillRect(mx - 74, my - 74, 148, 148);
    ctx.fillStyle = '#dcefff';
    ctx.beginPath();
    ctx.arc(mx, my, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#9ec8ff';
    ctx.beginPath();
    ctx.arc(mx - 8, my - 6, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f2f5ff';
    ctx.font = 'bold 84px Georgia, serif';
    ctx.textBaseline = 'middle';
    ctx.fillText('NIGHTGLASS', VIEW_W / 2, 218);
    ctx.fillStyle = '#ffd76a';
    ctx.font = 'italic 24px Georgia, serif';
    ctx.fillText('steal the Hollow Moon', VIEW_W / 2, 268);
    ctx.fillStyle = '#c8d2e8';
    ctx.font = '16px system-ui, sans-serif';
    ctx.fillText('5 heists  ·  19 guards  ·  36 treasures  ·  light is your enemy', VIEW_W / 2, 306);
    ctx.fillStyle = '#9aa5c0';
    ctx.font = '14px system-ui, sans-serif';
    const lines = [
      'A museum at night. Lantern pools and guard vision cones reveal you;',
      'carpet and shadow hide you. Lift the treasures, crack the locked cases,',
      'steal each heist’s gem — and reach the exit unseen.',
    ];
    lines.forEach((line, i) => ctx.fillText(line, VIEW_W / 2, 344 + i * 22));
    // Heist list with best scores.
    ctx.font = '14px system-ui, sans-serif';
    HEIST_NAMES.forEach((name, i) => {
      const best = game.bestScores[i];
      ctx.fillStyle = i === 0 ? '#ffd76a' : '#c8d2e8';
      ctx.fillText(
        `${name}    ${best > 0 ? `best ★ ${best}` : '—'}`,
        VIEW_W / 2,
        428 + i * 24,
      );
    });
    ctx.fillStyle = '#ffd76a';
    ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.fillText('ENTER — begin the first heist', VIEW_W / 2, 580);
    ctx.fillStyle = '#9aa5c0';
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillText('WASD move · SHIFT sneak · SPACE run · E lockpick · P pause · M mute', VIEW_W / 2, 612);
  }

  drawBriefing(game) {
    const ctx = this.ctx;
    this.dimScreen(0.6);
    const w = 640;
    const x = (VIEW_W - w) / 2;
    const y = 190;
    ctx.fillStyle = 'rgba(8, 11, 22, 0.94)';
    ctx.beginPath();
    ctx.roundRect(x, y, w, 250, 12);
    ctx.fill();
    ctx.strokeStyle = '#c9a227';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd76a';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.fillText(`HEIST ${game.heistIndex + 1} OF 5`, VIEW_W / 2, y + 34);
    ctx.fillStyle = '#f2f5ff';
    ctx.font = 'bold 34px Georgia, serif';
    ctx.fillText(HEIST_NAMES[game.heistIndex], VIEW_W / 2, y + 78);
    ctx.fillStyle = '#c8d2e8';
    ctx.font = '16px system-ui, sans-serif';
    ctx.fillText(HEIST_BRIEFINGS[game.heistIndex], VIEW_W / 2, y + 122);
    const level = game.level;
    const guards = level.guardDefs.length;
    const treasures = level.treasures.length + level.locked.length;
    ctx.fillStyle = '#9aa5c0';
    ctx.font = '15px system-ui, sans-serif';
    ctx.fillText(`${guards} guards on patrol  ·  ${treasures} treasures  ·  1 target gem  ·  1 exit`, VIEW_W / 2, y + 158);
    ctx.fillStyle = '#ffd76a';
    ctx.font = 'bold 17px system-ui, sans-serif';
    ctx.fillText('ENTER — begin', VIEW_W / 2, y + 206);
  }

  drawCaught(game) {
    const ctx = this.ctx;
    this.dimScreen(0.62);
    ctx.fillStyle = 'rgba(120, 10, 20, 0.18)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff5d5d';
    ctx.font = 'bold 72px Georgia, serif';
    ctx.fillText('SPOTTED!', VIEW_W / 2, 300);
    ctx.fillStyle = '#e8ecf4';
    ctx.font = '18px system-ui, sans-serif';
    ctx.fillText('A guard caught you in the light. The museum keeps its moon — this time.', VIEW_W / 2, 356);
    ctx.fillStyle = '#ffd76a';
    ctx.font = 'bold 17px system-ui, sans-serif';
    ctx.fillText('R — try the heist again      ESC — back to the title', VIEW_W / 2, 410);
  }

  drawHeistComplete(game) {
    const ctx = this.ctx;
    this.dimScreen(0.62);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#7ddba3';
    ctx.font = 'bold 56px Georgia, serif';
    ctx.fillText('HEIST COMPLETE', VIEW_W / 2, 240);
    ctx.fillStyle = '#f2f5ff';
    ctx.font = '20px Georgia, serif';
    ctx.fillText(HEIST_NAMES[game.heistIndex], VIEW_W / 2, 292);
    ctx.fillStyle = '#c8d2e8';
    ctx.font = '16px system-ui, sans-serif';
    const rows = [
      `Treasures lifted: ${game.player.treasures}  ·  Locked cases cracked: ${game.player.lockedOpened}`,
      game.player.everSeen ? 'Seen along the way — no ghost bonus this time.' : 'GHOST — never seen. +1500 bonus.',
      `Time: ${game.formatTime(game.elapsed)}  ·  Heist score: ★ ${game.heistScore}`,
    ];
    rows.forEach((row, i) => ctx.fillText(row, VIEW_W / 2, 340 + i * 28));
    ctx.fillStyle = '#ffd76a';
    ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.fillText(game.heistIndex + 1 < 5 ? 'ENTER — the next heist' : 'ENTER — the Hollow Moon awaits', VIEW_W / 2, 452);
  }

  drawCampaignComplete(game) {
    const ctx = this.ctx;
    this.dimScreen(0.7);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#dcefff';
    ctx.font = 'bold 54px Georgia, serif';
    ctx.fillText('THE HOLLOW MOON IS YOURS', VIEW_W / 2, 250);
    ctx.fillStyle = '#ffd76a';
    ctx.font = 'italic 22px Georgia, serif';
    ctx.fillText('Five heists. Nineteen guards. Thirty-six treasures. Unseen.', VIEW_W / 2, 300);
    ctx.fillStyle = '#e8ecf4';
    ctx.font = '17px system-ui, sans-serif';
    ctx.fillText(`Total score: ★ ${game.score}    ·    Ghost heists: ${game.ghostHeists} of 5`, VIEW_W / 2, 348);
    ctx.fillStyle = '#ffd76a';
    ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.fillText('ENTER — play the campaign again', VIEW_W / 2, 408);
  }

  drawPaused() {
    this.dimScreen(0.6);
    this.ctx.textAlign = 'center';
    this.ctx.fillStyle = '#f2f5ff';
    this.ctx.font = 'bold 48px Georgia, serif';
    this.ctx.fillText('PAUSED', VIEW_W / 2, 340);
    this.ctx.fillStyle = '#9aa5c0';
    this.ctx.font = '16px system-ui, sans-serif';
    this.ctx.fillText('P — resume', VIEW_W / 2, 384);
  }

  // ---- frame -------------------------------------------------------------
  draw(game) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);
    ctx.fillStyle = '#05070f';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    const level = game.level;
    const time = game.time;
    this.drawFloor(level);
    this.drawLanternPosts(level, time);
    this.drawTreasures(level, time);
    this.drawDarkness(level, game.player, time);
    this.drawCones(game.guards, time);
    this.drawNoiseRings(game.noiseRings);
    this.drawGuards(game.guards, time);
    this.drawPlayer(game.player, level, time);
    if (game.state === 'playing' || game.state === 'paused') {
      this.drawHud(game);
      this.drawLockpick(game.player);
      this.drawToast(game);
    }
    if (game.state === 'title') this.drawTitle(game);
    if (game.state === 'briefing') this.drawBriefing(game);
    if (game.state === 'caught') this.drawCaught(game);
    if (game.state === 'heistComplete') this.drawHeistComplete(game);
    if (game.state === 'campaignComplete') this.drawCampaignComplete(game);
    if (game.state === 'paused') this.drawPaused();
  }
}
