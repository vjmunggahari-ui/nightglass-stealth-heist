// NIGHTGLASS — the thief.
// Walk, sneak, run: each gait moves at its own speed and makes its own
// noise, and the floor underfoot decides how far that noise carries.
// Treasures are lifted by walking over them; locked cases need a
// lockpick (hold E, tap E in the green zone three times); the target
// gem opens the exit.
import {
  PLAYER_WALK_SPEED,
  PLAYER_SNEAK_SPEED,
  PLAYER_RUN_SPEED,
  NOISE_WALK_MARBLE,
  NOISE_WALK_CARPET,
  NOISE_WALK_STONE,
  NOISE_SNEAK_ANY,
  NOISE_RUN_MARBLE,
  NOISE_RUN_CARPET,
  NOISE_RUN_STONE,
  NOISE_TREASURE_GRAB,
  LOCKPICK_HITS_NEEDED,
  LOCKPICK_SWEEP_SECONDS,
} from './config.js';
import { clamp, tileDistance } from './random.js';
import { isWalkable } from './levels.js';

export class Player {
  constructor(start) {
    this.x = start.col + 0.5;
    this.y = start.row + 0.5;
    this.facing = -Math.PI / 2; // start looking up the map
    this.sneaking = false;
    this.running = false;
    this.moving = false;
    this.stepTimer = 0;
    this.stepPhase = 0; // 0..1 through a stride, drives footstep timing
    this.treasures = 0;
    this.lockedOpened = 0;
    this.hasGem = false;
    this.everSeen = false; // any guard meter ever reached suspicious
    this.lockpick = null; // { locked, needle, direction, hits, window }
    this.hideBonus = false;
    this.randState = 1234567; // deterministic pick-zone shuffles
  }

  // Small deterministic random, 0..1: lockpick zones must not depend on
  // Math.random, so a scripted run replays identically.
  nextRandom() {
    this.randState = (Math.imul(this.randState, 1103515245) + 12345) >>> 0;
    return this.randState / 4294967296;
  }

  get speed() {
    if (this.sneaking) return PLAYER_SNEAK_SPEED;
    if (this.running) return PLAYER_RUN_SPEED;
    return PLAYER_WALK_SPEED;
  }

  // Noise radius of one footstep, in tiles, from gait and floor.
  noiseRadius(level) {
    const floor = level.floors.get(`${Math.floor(this.x)},${Math.floor(this.y)}`) || '.';
    if (this.sneaking) return NOISE_SNEAK_ANY;
    if (this.running) {
      if (floor === ',') return NOISE_RUN_CARPET;
      if (floor === ';') return NOISE_RUN_STONE;
      return NOISE_RUN_MARBLE;
    }
    if (floor === ',') return NOISE_WALK_CARPET;
    if (floor === ';') return NOISE_WALK_STONE;
    return NOISE_WALK_MARBLE;
  }

  // Axis-separated movement with collision against walls and cases.
  move(dx, dy, dt, level) {
    const radius = 0.32; // thief's body radius, in tiles
    const nx = this.x + dx * this.speed * dt;
    if (this.canStand(nx, this.y, radius, level)) this.x = nx;
    const ny = this.y + dy * this.speed * dt;
    if (this.canStand(this.x, ny, radius, level)) this.y = ny;
  }

  canStand(x, y, radius, level) {
    for (const [cx, cy] of [
      [Math.floor(x - radius), Math.floor(y - radius)],
      [Math.floor(x + radius), Math.floor(y - radius)],
      [Math.floor(x - radius), Math.floor(y + radius)],
      [Math.floor(x + radius), Math.floor(y + radius)],
    ]) {
      if (!isWalkable(level, cx, cy)) return false;
    }
    return true;
  }

  // The nearest locked case within reach, if any.
  nearestLocked(level) {
    let best = null;
    let bestD = 1.3;
    for (const locked of level.locked) {
      if (locked.taken) continue;
      const d = tileDistance(this.x, this.y, locked.col + 0.5, locked.row + 0.5);
      if (d < bestD) {
        bestD = d;
        best = locked;
      }
    }
    return best;
  }

  startLockpick(locked) {
    this.lockpick = {
      locked,
      needle: 0,
      direction: 1,
      hits: 0,
      // Green zone centre and half-width, 0..1 across the bar.
      zoneCentre: 0.5,
      zoneHalf: 0.13,
    };
  }

  // One lockpick tap: inside the green zone scores a hit and moves the
  // zone; outside it the pick slips, the case rattles, and the noise
  // carries. Returns 'hit' | 'fail' | 'open' | null.
  lockpickTap(onNoise) {
    const lp = this.lockpick;
    if (!lp) return null;
    const inZone = Math.abs(lp.needle - lp.zoneCentre) <= lp.zoneHalf;
    if (!inZone) {
      lp.hits = 0;
      lp.zoneCentre = 0.35 + this.nextRandom() * 0.3;
      onNoise?.(4.0);
      return 'fail';
    }
    lp.hits += 1;
    lp.zoneCentre = 0.3 + this.nextRandom() * 0.4;
    if (lp.hits >= LOCKPICK_HITS_NEEDED) {
      lp.locked.taken = true;
      this.lockedOpened += 1;
      this.lockpick = null;
      return 'open';
    }
    return 'hit';
  }

  update(dt, input, level, onNoise) {
    // Cancel a lockpick by moving away from the case.
    if (this.lockpick) {
      const lp = this.lockpick;
      const d = tileDistance(this.x, this.y, lp.locked.col + 0.5, lp.locked.row + 0.5);
      if (d > 1.6) this.lockpick = null;
      else {
        lp.needle += lp.direction * (dt / LOCKPICK_SWEEP_SECONDS);
        if (lp.needle >= 1) {
          lp.needle = 1;
          lp.direction = -1;
        } else if (lp.needle <= 0) {
          lp.needle = 0;
          lp.direction = 1;
        }
        return; // picking a lock means standing still and quiet
      }
    }

    let dx = 0;
    let dy = 0;
    if (input.left) dx -= 1;
    if (input.right) dx += 1;
    if (input.up) dy -= 1;
    if (input.down) dy += 1;
    this.sneaking = !!input.sneak;
    this.running = !!input.run && !this.sneaking;
    this.moving = dx !== 0 || dy !== 0;
    if (this.moving) {
      const len = Math.sqrt(dx * dx + dy * dy);
      dx /= len;
      dy /= len;
      this.facing = Math.atan2(dy, dx);
      this.move(dx, dy, dt, level);
      // A footstep each half-stride; faster gaits step more often.
      this.stepPhase += (this.speed * dt) / 1.1;
      if (this.stepPhase >= 0.5) {
        this.stepPhase -= 0.5;
        onNoise?.(this.noiseRadius(level));
      }
    } else {
      this.stepPhase = 0;
    }

    // Lift treasures by walking over them; the gem opens the exit.
    for (const treasure of level.treasures) {
      if (treasure.taken) continue;
      if (tileDistance(this.x, this.y, treasure.col + 0.5, treasure.row + 0.5) < 0.55) {
        treasure.taken = true;
        this.treasures += 1;
        onNoise?.(NOISE_TREASURE_GRAB);
      }
    }
    for (const locked of level.locked) {
      if (!locked.taken || locked.collected) continue;
      if (tileDistance(this.x, this.y, locked.col + 0.5, locked.row + 0.5) < 0.55) {
        locked.collected = true;
        this.treasures += 1;
        onNoise?.(NOISE_TREASURE_GRAB);
      }
    }
    if (level.gem && !level.gem.taken) {
      if (tileDistance(this.x, this.y, level.gem.col + 0.5, level.gem.row + 0.5) < 0.6) {
        level.gem.taken = true;
        this.hasGem = true;
      }
    }
  }
}
