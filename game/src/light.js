// NIGHTGLASS — line of sight and lantern light.
// Light is the game's central system: a lantern pool or a guard's cone
// reveals you, carpet and shadow alcoves hide you.
import { LANTERN_RADIUS } from './config.js';
import { tileBlocksSight } from './levels.js';
import { tileDistance } from './random.js';

// Bresenham walk over tiles between two tile-space points. True when no
// tile between them blocks sight (endpoints excluded: a guard standing in
// a doorway can still see out of it).
export function lineOfSightClear(level, x0, y0, x1, y1) {
  let cx = Math.floor(x0);
  let cy = Math.floor(y0);
  const tx = Math.floor(x1);
  const ty = Math.floor(y1);
  const dx = Math.abs(tx - cx);
  const dy = Math.abs(ty - cy);
  const sx = cx < tx ? 1 : -1;
  const sy = cy < ty ? 1 : -1;
  let err = dx - dy;
  let guard = 0;
  while (guard++ < 128) {
    if (cx === tx && cy === ty) return true;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      cx += sx;
    }
    if (e2 < dx) {
      err += dx;
      cy += sy;
    }
    if (cx === tx && cy === ty) return true;
    const ch = level.grid[cy] && level.grid[cy][cx];
    if (ch === undefined || tileBlocksSight(ch)) return false;
  }
  return false;
}

// How lit the tile point (x, y) is, 0 in full dark to 1 in a lantern pool.
// Shadow alcoves (H) are always dark. A lantern lights only tiles it can
// see: a display case between you and the lantern keeps you in shadow.
export function lightLevelAt(level, x, y) {
  const tile = level.grid[Math.floor(y)]?.[Math.floor(x)];
  if (tile === 'H') return 0;
  let lit = 0;
  for (const lantern of level.lanterns) {
    const lx = lantern.col + 0.5;
    const ly = lantern.row + 0.5;
    const d = tileDistance(x, y, lx, ly);
    if (d > LANTERN_RADIUS) continue;
    if (!lineOfSightClear(level, lx, ly, x, y)) continue;
    const falloff = 1 - d / LANTERN_RADIUS;
    lit = Math.max(lit, falloff);
  }
  return lit;
}

// True when the point (x, y) counts as LIT for detection: bright enough
// that a guard's cone fills fast.
export function isLit(level, x, y) {
  return lightLevelAt(level, x, y) > 0.35;
}

// True when the point (x, y) is deep shadow: a guard's cone fills slowly.
export function isShadow(level, x, y) {
  return lightLevelAt(level, x, y) < 0.12;
}
