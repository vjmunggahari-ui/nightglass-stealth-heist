// NIGHTGLASS — scripted poses for the screenshots.
// Each shot is a real render of the game's own code: the game loads a
// heist, places the thief and the guards exactly as described, freezes
// the simulation, and renders a few frames at a fixed time so the shot
// is deterministic. ?shot=1 is the cover, ?shot=4 the win screen.
import { GUARD_STATE } from './guards.js';

export const SHOTS = {
  // Cover: the final heist, the thief sneaking across carpet in shadow
  // while two patrol cones sweep the hall, the Hollow Moon glowing above.
  1: {
    heist: 4,
    state: 'playing',
    time: 2.4,
    player: { col: 14, row: 11, facing: -0.4, sneaking: true },
    guards: [
      { col: 11, row: 10, facing: 0.5, meter: 0.18, state: GUARD_STATE.PATROL },
      { col: 20, row: 12, facing: Math.PI - 0.3, meter: 0.0, state: GUARD_STATE.PATROL },
      { col: 24, row: 8, facing: Math.PI * 0.85, meter: 0.0, state: GUARD_STATE.PATROL },
      { col: 6, row: 9, facing: -0.9, meter: 0.0, state: GUARD_STATE.PATROL },
      { col: 27, row: 12, facing: 2.6, meter: 0.0, state: GUARD_STATE.PATROL },
      { col: 18, row: 16, facing: -1.2, meter: 0.0, state: GUARD_STATE.PATROL },
    ],
    treasuresTaken: 3,
    elapsed: 61,
    score: 750,
    toast: null,
  },
  // Tension: the thief at the Hollow Moon while a guard's cone sweeps
  // in, detection half-full, alarm suspicious.
  2: {
    heist: 4,
    state: 'playing',
    time: 4.1,
    player: { col: 24, row: 5, facing: 0.2, sneaking: true, hasGem: true },
    guards: [
      { col: 20, row: 5, facing: 0.15, meter: 0.62, state: GUARD_STATE.SUSPICIOUS },
      { col: 11, row: 10, facing: 0.5, meter: 0.0, state: GUARD_STATE.PATROL },
      { col: 27, row: 12, facing: 2.6, meter: 0.0, state: GUARD_STATE.PATROL },
      { col: 6, row: 9, facing: -0.9, meter: 0.0, state: GUARD_STATE.PATROL },
      { col: 24, row: 8, facing: Math.PI * 0.85, meter: 0.0, state: GUARD_STATE.PATROL },
      { col: 18, row: 16, facing: -1.2, meter: 0.0, state: GUARD_STATE.PATROL },
    ],
    treasuresTaken: 7,
    elapsed: 143,
    score: 2750,
    toast: 'A guard heard something…',
    toastAge: 0.4,
  },
  // The lockpick: the thief cracking a case in the Marble Gallery while
  // a patrol passes behind the glass.
  3: {
    heist: 1,
    state: 'playing',
    time: 1.7,
    player: { col: 27, row: 6, facing: 0, sneaking: false },
    lockpick: { needle: 0.55, hits: 2, zoneCentre: 0.5, zoneHalf: 0.13 },
    guards: [
      { col: 24, row: 8, facing: Math.PI * 0.9, meter: 0.0, state: GUARD_STATE.PATROL },
      { col: 9, row: 9, facing: 0.3, meter: 0.12, state: GUARD_STATE.PATROL },
      { col: 20, row: 15, facing: -1.4, meter: 0.0, state: GUARD_STATE.PATROL },
    ],
    treasuresTaken: 2,
    elapsed: 48,
    score: 500,
    toast: 'Crack the case — tap E in the green zone',
    toastAge: 0.3,
  },
  // The win: the first heist complete, ghost run, at the exit.
  4: {
    heist: 0,
    state: 'heistComplete',
    time: 3.3,
    player: { col: 28, row: 7, facing: 0, sneaking: false, hasGem: true },
    guards: [
      { col: 12, row: 10, facing: 0.5, meter: 0.0, state: GUARD_STATE.PATROL },
      { col: 20, row: 9, facing: Math.PI - 0.3, meter: 0.0, state: GUARD_STATE.PATROL },
    ],
    treasuresTaken: 4,
    elapsed: 74,
    score: 3660,
    heistScore: 3660,
    ghost: true,
    toast: null,
  },
};
