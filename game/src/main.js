// NIGHTGLASS — game loop and state machine.
// Title → briefing → playing → caught / heist complete → next heist →
// campaign complete. The loop runs guards, detection, hearing, the
// lockpick, the alarm and the score; ?shot=N instead loads a scripted
// pose and freezes the simulation for a deterministic screenshot.
import {
  VIEW_W,
  VIEW_H,
  SCORE_TREASURE,
  SCORE_GEM,
  SCORE_GHOST_BONUS,
  SCORE_TIME_BONUS_PER_SECOND,
  HEIST_NAMES,
} from './config.js';
import { parseLevel, campaignTotals } from './levels.js';
import { Guard, GUARD_STATE } from './guards.js';
import { Player } from './player.js';
import { SoundBank } from './audio.js';
import { Renderer } from './render.js';
import { SHOTS } from './shots.js';
import { tileDistance } from './random.js';

const PAR_SECONDS = [90, 120, 150, 180, 240];
const DUMMY_PLAYER = { x: -50, y: -50, sneaking: false, running: false, moving: false };

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new Renderer(canvas);
    this.sound = new SoundBank();
    this.campaignTotals = campaignTotals();
    this.bestScores = this.loadBestScores();
    this.score = 0;
    this.ghostHeists = 0;
    this.heistIndex = 0;
    this.state = 'title';
    this.time = 0;
    this.elapsed = 0;
    this.heistScore = 0;
    this.alarmLevel = 0;
    this.noiseRings = [];
    this.toast = null;
    this.toastAge = 0;
    this.toastMaxAge = 3.2;
    this.input = { up: false, down: false, left: false, right: false, sneak: false, run: false };
    this.shotMode = null;
    this.shotFrozen = false;
    this.shotFrames = 0;
    this.lastTimestamp = 0;
    this.loadHeist(0);
    this.bindInput();
    const params = new URLSearchParams(window.location.search);
    const shot = Number(params.get('shot') || 0);
    if (SHOTS[shot]) {
      this.applyShot(shot);
    } else {
      this.state = 'title';
    }
    requestAnimationFrame((t) => this.loop(t));
  }

  loadBestScores() {
    try {
      const raw = window.localStorage.getItem('nightglass-best');
      if (!raw) return [0, 0, 0, 0, 0];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.slice(0, 5) : [0, 0, 0, 0, 0];
    } catch {
      return [0, 0, 0, 0, 0];
    }
  }

  saveBestScores() {
    try {
      window.localStorage.setItem('nightglass-best', JSON.stringify(this.bestScores));
    } catch {
      // Best scores are a nicety; the game plays without them.
    }
  }

  loadHeist(index) {
    this.heistIndex = index;
    this.level = parseLevel(index);
    this.player = new Player(this.level.playerStart);
    this.guards = this.level.guardDefs.map(
      (def, i) => new Guard(def, this.level.guardSpawns[i], i),
    );
    this.elapsed = 0;
    this.heistScore = 0;
    this.alarmLevel = 0;
    this.noiseRings = [];
    this.toast = null;
    this.toastAge = 0;
    this.gemToastShown = false;
    this.state = 'briefing';
  }

  startHeist() {
    this.sound.ensure();
    this.sound.resume();
    this.sound.startDrone();
    this.state = 'playing';
  }

  // A noise at the player's position: a ring on the floor, a sound for
  // the player's ears, and every guard in earshot turns to look.
  emitNoise(radius, kind = 'step') {
    const noise = { x: this.player.x, y: this.player.y, radius, kind };
    this.noiseRings.push({ x: noise.x, y: noise.y, radius, age: 0, maxAge: 1.1 });
    for (const guard of this.guards) guard.hear(noise);
    if (kind === 'step') {
      const floor = this.level.floors.get(`${Math.floor(this.player.x)},${Math.floor(this.player.y)}`) || '.';
      this.sound.footstep(floor, this.player.running ? 'run' : this.player.sneaking ? 'sneak' : 'walk');
      for (const guard of this.guards) {
        this.sound.guardStep(tileDistance(guard.x, guard.y, this.player.x, this.player.y));
      }
    } else if (kind === 'rattle') {
      this.sound.lockpickClick(false);
    }
  }

  formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  // Alarm level from guard states: 2 while any guard chases,
  // 1 while any investigates or searches, else 0.
  recomputeAlarm() {
    let level = 0;
    for (const guard of this.guards) {
      if (guard.state === GUARD_STATE.ALERT) level = Math.max(level, 2);
      else if (
        guard.state === GUARD_STATE.SUSPICIOUS ||
        guard.state === GUARD_STATE.SEARCH
      ) {
        level = Math.max(level, 1);
      }
    }
    this.alarmLevel = level;
  }

  showToast(text) {
    this.toast = text;
    this.toastAge = 0;
  }

  completeHeist() {
    const timeBonus = Math.max(0, Math.round((PAR_SECONDS[this.heistIndex] - this.elapsed) * SCORE_TIME_BONUS_PER_SECOND));
    const ghost = !this.player.everSeen;
    this.heistScore =
      this.player.treasures * SCORE_TREASURE +
      SCORE_GEM +
      (ghost ? SCORE_GHOST_BONUS : 0) +
      timeBonus;
    this.score += this.heistScore;
    if (ghost) this.ghostHeists += 1;
    if (this.heistScore > this.bestScores[this.heistIndex]) {
      this.bestScores[this.heistIndex] = this.heistScore;
      this.saveBestScores();
    }
    this.sound.winSting();
    this.state = 'heistComplete';
  }

  failHeist() {
    this.sound.caughtSting();
    this.state = 'caught';
  }

  update(dt) {
    this.time += dt;
    if (this.state === 'title' || this.state === 'briefing') {
      // Guards patrol behind the menu; the thief is not on the floor yet.
      for (const guard of this.guards) {
        guard.update(dt, { player: DUMMY_PLAYER, level: this.level, time: this.time });
      }
      return;
    }
    if (this.state !== 'playing') return;
    this.elapsed += dt;

    this.player.update(dt, this.input, this.level, (radius, kind) => this.emitNoise(radius, kind));
    for (const guard of this.guards) {
      const prevState = guard.state;
      guard.update(dt, {
        player: this.player,
        level: this.level,
        time: this.time,
        onSpotted: () => {
          this.showToast('SPOTTED! Break line of sight!');
          this.sound.alertSting();
        },
      });
      if (prevState === GUARD_STATE.PATROL && guard.state === GUARD_STATE.SUSPICIOUS) {
        this.showToast('A guard heard something…');
        this.sound.suspiciousBlip();
      }
      if (guard.meter >= 0.45) this.player.everSeen = true;
    }
    this.recomputeAlarm();

    // Caught: a chasing guard closes in.
    for (const guard of this.guards) {
      if (guard.catches(this.player)) {
        this.failHeist();
        return;
      }
    }
    // The gem is stolen and the thief reaches the exit: heist complete.
    if (this.player.hasGem && this.level.exit) {
      if (tileDistance(this.player.x, this.player.y, this.level.exit.col + 0.5, this.level.exit.row + 0.5) < 0.6) {
        this.completeHeist();
        return;
      }
    }
    if (this.player.hasGem && !this.gemToastShown) {
      this.gemToastShown = true;
      this.showToast('The Hollow Moon is yours — reach the EXIT unseen');
      this.sound.gemChime();
    }
    // Age the noise rings and the toast.
    for (const ring of this.noiseRings) ring.age += dt;
    this.noiseRings = this.noiseRings.filter((r) => r.age < r.maxAge);
    this.toastAge += dt;
  }

  // ---- scripted screenshot poses ---------------------------------------
  applyShot(n) {
    const shot = SHOTS[n];
    this.shotMode = n;
    this.shotFrozen = true;
    this.loadHeist(shot.heist);
    this.state = shot.state;
    this.time = shot.time;
    this.elapsed = shot.elapsed;
    this.score = shot.score;
    this.heistScore = shot.heistScore || 0;
    // Place the thief.
    const p = shot.player;
    this.player.x = p.col + 0.5;
    this.player.y = p.row + 0.5;
    this.player.facing = p.facing;
    this.player.sneaking = !!p.sneaking;
    this.player.moving = false;
    this.player.treasures = shot.treasuresTaken;
    if (p.hasGem) {
      this.player.hasGem = true;
      this.level.gem.taken = true;
    }
    if (shot.ghost) this.player.everSeen = false;
    // Lift the counted treasures off the floor.
    let taken = 0;
    for (const treasure of this.level.treasures) {
      if (taken >= shot.treasuresTaken) break;
      treasure.taken = true;
      taken += 1;
    }
    // Place the guards.
    shot.guards.forEach((pose, i) => {
      const guard = this.guards[i];
      if (!guard) return;
      guard.x = pose.col + 0.5;
      guard.y = pose.row + 0.5;
      guard.facing = pose.facing;
      guard.meter = pose.meter;
      guard.state = pose.state;
    });
    // A lockpick in progress for the lockpick shot.
    if (shot.lockpick && this.level.locked.length > 0) {
      this.player.lockpick = {
        locked: this.level.locked[0],
        needle: shot.lockpick.needle,
        direction: 1,
        hits: shot.lockpick.hits,
        zoneCentre: shot.lockpick.zoneCentre,
        zoneHalf: shot.lockpick.zoneHalf,
      };
    }
    if (shot.toast) {
      this.toast = shot.toast;
      this.toastAge = shot.toastAge || 0;
    }
    this.recomputeAlarm();
    this.shotFrames = 0;
  }

  // ---- input --------------------------------------------------------------
  bindInput() {
    const keymap = {
      KeyW: 'up',
      ArrowUp: 'up',
      KeyS: 'down',
      ArrowDown: 'down',
      KeyA: 'left',
      ArrowLeft: 'left',
      KeyD: 'right',
      ArrowRight: 'right',
      ShiftLeft: 'sneak',
      ShiftRight: 'sneak',
      Space: 'run',
    };
    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }
      if (keymap[e.code]) {
        this.input[keymap[e.code]] = true;
        return;
      }
      if (e.repeat) return;
      if (e.code === 'Enter') {
        this.sound.ensure();
        this.sound.resume();
        if (this.state === 'title') this.loadHeist(0);
        else if (this.state === 'briefing') this.startHeist();
        else if (this.state === 'heistComplete') {
          if (this.heistIndex + 1 < 5) {
            this.loadHeist(this.heistIndex + 1);
            this.startHeist();
          } else {
            this.state = 'campaignComplete';
          }
        } else if (this.state === 'campaignComplete') {
          this.score = 0;
          this.ghostHeists = 0;
          this.loadHeist(0);
        }
      } else if (e.code === 'KeyE') {
        if (this.state !== 'playing') return;
        if (this.player.lockpick) {
          const result = this.player.lockpickTap((radius) => this.emitNoise(radius, 'rattle'));
          if (result === 'hit') this.sound.lockpickClick(true);
          else if (result === 'open') {
            this.sound.lockpickOpen();
            this.showToast('Case cracked — the treasure is yours');
          }
        } else {
          const locked = this.player.nearestLocked(this.level);
          if (locked) {
            this.player.startLockpick(locked);
            this.sound.lockpickClick(true);
          }
        }
      } else if (e.code === 'KeyR') {
        if (this.state === 'caught') {
          this.loadHeist(this.heistIndex);
          this.startHeist();
        }
      } else if (e.code === 'Escape') {
        if (this.state === 'caught' || this.state === 'playing' || this.state === 'briefing' || this.state === 'paused') {
          this.loadHeist(0);
          this.state = 'title';
        }
      } else if (e.code === 'KeyP') {
        if (this.state === 'playing') this.state = 'paused';
        else if (this.state === 'paused') this.state = 'playing';
      } else if (e.code === 'KeyM') {
        this.sound.ensure();
        this.sound.setMuted(!this.sound.muted);
      }
    });
    window.addEventListener('keyup', (e) => {
      if (keymap[e.code]) this.input[keymap[e.code]] = false;
    });
    this.canvas.addEventListener('pointerdown', () => {
      this.sound.ensure();
      this.sound.resume();
      if (this.state === 'title') this.loadHeist(0);
      else if (this.state === 'briefing') this.startHeist();
    });
  }

  // ---- frame ---------------------------------------------------------------
  loop(timestamp) {
    // In a scripted shot the clock is fixed: the same pose renders the
    // same pixels every time, so the screenshots are reproducible.
    const dt = this.shotFrozen
      ? 1 / 60
      : Math.min((timestamp - this.lastTimestamp) / 1000 || 0.016, 0.05);
    this.lastTimestamp = timestamp;
    if (this.shotFrozen) {
      // Deterministic pose: fixed time steps, no simulation, no input.
      // After the fifth frame the clock stops, so every later render —
      // including the one the screenshot takes — shows the same pixels.
      if (this.shotFrames < 5) {
        this.time += dt;
        this.shotFrames += 1;
      }
      this.renderer.draw(this);
      if (this.shotFrames >= 5) window.__shotReady = true;
    } else {
      this.update(dt);
      this.renderer.draw(this);
    }
    requestAnimationFrame((t) => this.loop(t));
  }
}

const canvas = document.getElementById('game');
export const game = new Game(canvas);
// Debug handle for play-testing (read-only inspection from the console).
window.__nightglass = game;
