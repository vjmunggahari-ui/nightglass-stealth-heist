// NIGHTGLASS — guard patrol AI.
// A guard patrols waypoints, scans with a vision cone, hears footsteps,
// investigates what it half-sees, chases what it fully sees, and gives
// up and goes back to patrol when the trail goes cold — so a near miss
// raises the alarm without ending the heist.
import {
  GUARD_PATROL_SPEED,
  GUARD_SUSPICIOUS_SPEED,
  GUARD_CHASE_SPEED,
  GUARD_SIGHT_RANGE,
  GUARD_CONE_HALF_ANGLE,
  DETECT_BASE_RATE,
  DETECT_LIT_MULT,
  DETECT_SHADOW_MULT,
  DETECT_SNEAK_MULT,
  DETECT_RUN_MULT,
  DETECT_DRAIN_RATE,
  DETECT_SUSPICIOUS_AT,
  DETECT_SEARCH_SECONDS,
} from './config.js';
import { angleDifference, angleTo, clamp, tileDistance } from './random.js';
import { isLit, isShadow, lineOfSightClear } from './light.js';

export const GUARD_STATE = {
  PATROL: 'patrol',
  SUSPICIOUS: 'suspicious',
  ALERT: 'alert',
  SEARCH: 'search',
  RETURN: 'return',
};

export class Guard {
  constructor(def, spawn, index) {
    this.index = index;
    this.waypoints = def.waypoints;
    this.x = spawn.col + 0.5;
    this.y = spawn.row + 0.5;
    this.facing = 0;
    this.state = GUARD_STATE.PATROL;
    this.waypointIndex = 1 % this.waypoints.length;
    this.meter = 0; // 0 unseen, 1 fully spotted
    this.target = null; // {x, y} being investigated or chased
    this.lastSeen = null;
    this.searchTimer = 0;
    this.scanTimer = 0; // idle look-around at a waypoint
    this.scanDirection = 1;
    this.heard = null;
    this.speed = GUARD_PATROL_SPEED;
    this.moving = false;
  }

  // How well this guard can see the player right now, 0 to 1.
  // Range, cone angle, line of sight, light and the player's motion
  // all matter: a sneaking thief in shadow at the cone's edge is
  // barely a flicker; a running thief in a lantern pool is obvious.
  visibilityOf(player, level) {
    const d = tileDistance(this.x, this.y, player.x, player.y);
    if (d > GUARD_SIGHT_RANGE) return 0;
    const angle = angleTo(this.x, this.y, player.x, player.y);
    if (angleDifference(angle, this.facing) > GUARD_CONE_HALF_ANGLE) return 0;
    if (!lineOfSightClear(level, this.x, this.y, player.x, player.y)) return 0;
    let v = 1 - (d / GUARD_SIGHT_RANGE) * 0.55;
    if (isLit(level, player.x, player.y)) v *= DETECT_LIT_MULT;
    else if (isShadow(level, player.x, player.y)) v *= DETECT_SHADOW_MULT;
    if (player.sneaking) v *= DETECT_SNEAK_MULT;
    if (player.running) v *= DETECT_RUN_MULT;
    if (!player.moving) v *= 0.8;
    return clamp(v, 0, 1.6);
  }

  // A noise event the guard can hear: turn suspicious and investigate.
  hear(noise) {
    if (this.state === GUARD_STATE.ALERT) return;
    const d = tileDistance(this.x, this.y, noise.x, noise.y);
    if (d > noise.radius) return;
    this.heard = { x: noise.x, y: noise.y };
    if (this.state === GUARD_STATE.PATROL || this.state === GUARD_STATE.RETURN) {
      this.state = GUARD_STATE.SUSPICIOUS;
      this.target = { x: noise.x, y: noise.y };
    }
  }

  // Step toward a point at the given speed. Returns true on arrival.
  stepToward(tx, ty, speed, dt) {
    const dx = tx - this.x;
    const dy = ty - this.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < 0.05) {
      this.moving = false;
      return true;
    }
    const step = Math.min(d, speed * dt);
    this.x += (dx / d) * step;
    this.y += (dy / d) * step;
    this.facing = Math.atan2(dy, dx);
    this.moving = true;
    return d - step < 0.05;
  }

  update(dt, ctx) {
    const { player, level, time } = ctx;
    // --- vision: fill or drain the detection meter ---
    const seen = this.visibilityOf(player, level);
    if (seen > 0) {
      this.meter = clamp(this.meter + DETECT_BASE_RATE * seen * dt, 0, 1);
      this.lastSeen = { x: player.x, y: player.y, time };
    } else {
      this.meter = clamp(this.meter - DETECT_DRAIN_RATE * dt, 0, 1);
    }

    // Fully spotted: chase the last-seen position.
    if (this.meter >= 1 && this.state !== GUARD_STATE.ALERT) {
      this.state = GUARD_STATE.ALERT;
      this.target = { ...this.lastSeen };
      ctx.onSpotted?.(this);
    }
    // Half seen: go and look.
    if (
      this.meter >= DETECT_SUSPICIOUS_AT &&
      this.state === GUARD_STATE.PATROL &&
      this.lastSeen
    ) {
      this.state = GUARD_STATE.SUSPICIOUS;
      this.target = { ...this.lastSeen };
    }

    switch (this.state) {
      case GUARD_STATE.PATROL: {
        this.speed = GUARD_PATROL_SPEED;
        const wp = this.waypoints[this.waypointIndex];
        const arrived = this.stepToward(wp[0] + 0.5, wp[1] + 0.5, this.speed, dt);
        if (arrived) {
          // Pause at the waypoint and sweep the cone across the room.
          this.scanTimer += dt;
          this.facing += Math.sin(time * 0.9 + this.index * 1.7) * 0.35 * dt;
          if (this.scanTimer > 2.2) {
            this.scanTimer = 0;
            this.waypointIndex = (this.waypointIndex + 1) % this.waypoints.length;
          }
        } else {
          this.scanTimer = 0;
        }
        break;
      }
      case GUARD_STATE.SUSPICIOUS: {
        this.speed = GUARD_SUSPICIOUS_SPEED;
        if (!this.target) {
          this.state = GUARD_STATE.RETURN;
          break;
        }
        const arrived = this.stepToward(this.target.x, this.target.y, this.speed, dt);
        if (arrived) {
          this.scanTimer += dt;
          this.facing += this.scanDirection * 1.4 * dt;
          if (this.scanTimer > 2.4) {
            this.scanTimer = 0;
            this.scanDirection *= -1;
            this.state = GUARD_STATE.RETURN;
            this.target = null;
            this.heard = null;
          }
        }
        if (this.meter < 0.12) {
          this.state = GUARD_STATE.RETURN;
          this.target = null;
        }
        break;
      }
      case GUARD_STATE.ALERT: {
        this.speed = GUARD_CHASE_SPEED;
        if (!this.target) {
          this.state = GUARD_STATE.SEARCH;
          this.searchTimer = DETECT_SEARCH_SECONDS;
          break;
        }
        const arrived = this.stepToward(this.target.x, this.target.y, this.speed, dt);
        // Keep chasing a fresh sighting; lose the trail and start searching.
        if (seen > 0 && this.lastSeen) this.target = { ...this.lastSeen };
        if (arrived) {
          this.state = GUARD_STATE.SEARCH;
          this.searchTimer = DETECT_SEARCH_SECONDS;
        }
        break;
      }
      case GUARD_STATE.SEARCH: {
        this.speed = GUARD_SUSPICIOUS_SPEED;
        this.searchTimer -= dt;
        this.facing += 1.9 * dt; // sweep the room looking for the thief
        if (seen > 0 && this.lastSeen) {
          this.state = GUARD_STATE.ALERT;
          this.target = { ...this.lastSeen };
        } else if (this.searchTimer <= 0) {
          this.meter = Math.min(this.meter, DETECT_SUSPICIOUS_AT);
          this.state = GUARD_STATE.RETURN;
        }
        break;
      }
      case GUARD_STATE.RETURN: {
        this.speed = GUARD_PATROL_SPEED;
        // Head for the nearest waypoint, then resume the patrol.
        let best = 0;
        let bestD = Infinity;
        this.waypoints.forEach((wp, i) => {
          const d = tileDistance(this.x, this.y, wp[0] + 0.5, wp[1] + 0.5);
          if (d < bestD) {
            bestD = d;
            best = i;
          }
        });
        const wp = this.waypoints[best];
        const arrived = this.stepToward(wp[0] + 0.5, wp[1] + 0.5, this.speed, dt);
        if (arrived) {
          this.waypointIndex = (best + 1) % this.waypoints.length;
          this.state = GUARD_STATE.PATROL;
        }
        break;
      }
    }
  }

  // Caught the thief: close enough while chasing.
  catches(player) {
    return (
      this.state === GUARD_STATE.ALERT &&
      tileDistance(this.x, this.y, player.x, player.y) < 0.55
    );
  }
}
