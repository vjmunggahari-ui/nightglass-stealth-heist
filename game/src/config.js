// NIGHTGLASS — shared tuning and heist metadata.
// One museum at night. Light is your enemy: lantern pools and guard
// vision cones reveal you, carpet and shadow hide you.
export const TILE = 40;
export const COLS = 32;
export const ROWS = 18;
export const VIEW_W = COLS * TILE; // 1280
export const VIEW_H = ROWS * TILE; // 720

// Player movement, tiles per second.
export const PLAYER_WALK_SPEED = 3.4;
export const PLAYER_SNEAK_SPEED = 1.9;
export const PLAYER_RUN_SPEED = 5.2;

// Guard movement, tiles per second.
export const GUARD_PATROL_SPEED = 1.5;
export const GUARD_SUSPICIOUS_SPEED = 2.1;
export const GUARD_CHASE_SPEED = 3.1;

// Vision: how far a guard sees, in tiles, and the cone half-angle.
export const GUARD_SIGHT_RANGE = 5.6;
export const GUARD_CONE_HALF_ANGLE = 0.61; // ~35 degrees

// Detection meter: 0 unseen, 1 caught by that guard. Fill per second
// while the guard sees you; the rate is multiplied by light and motion.
export const DETECT_BASE_RATE = 0.85;
export const DETECT_LIT_MULT = 1.9;
export const DETECT_SHADOW_MULT = 0.45;
export const DETECT_SNEAK_MULT = 0.55;
export const DETECT_RUN_MULT = 1.5;
export const DETECT_DRAIN_RATE = 0.35; // per second while unseen
export const DETECT_SUSPICIOUS_AT = 0.45; // meter where a guard investigates
export const DETECT_SEARCH_SECONDS = 6; // how long a guard hunts a last-seen spot
export const DETECT_FORGET_SECONDS = 9; // unseen time before alarm fully decays

// Hearing: footstep noise radius in tiles, by floor and gait.
export const NOISE_WALK_MARBLE = 2.2;
export const NOISE_WALK_CARPET = 0.9;
export const NOISE_WALK_STONE = 2.8;
export const NOISE_SNEAK_ANY = 0.5;
export const NOISE_RUN_MARBLE = 4.4;
export const NOISE_RUN_CARPET = 2.0;
export const NOISE_RUN_STONE = 5.4;
export const NOISE_LOCKPICK_FAIL = 4.0;
export const NOISE_TREASURE_GRAB = 0.8;

// Lantern light: radius of a lit pool in tiles; inside it you are LIT.
export const LANTERN_RADIUS = 2.6;
export const LANTERN_GLOW_RADIUS = 3.4;

// Lockpick: hold E, needle sweeps; press E in the green zone 3 times.
export const LOCKPICK_HITS_NEEDED = 3;
export const LOCKPICK_SWEEP_SECONDS = 1.15;

// Scoring.
export const SCORE_TREASURE = 250;
export const SCORE_GEM = 1000;
export const SCORE_GHOST_BONUS = 1500; // finish a heist never seen at all
export const SCORE_TIME_BONUS_PER_SECOND = 10;

export const HEIST_NAMES = [
  'I — The Glass Atrium',
  'II — The Marble Gallery',
  'III — The Vault of Echoes',
  'IV — The Lantern Wing',
  'V — The Hollow Moon',
];

export const HEIST_BRIEFINGS = [
  'First night on the job. Two guards, four treasures, one glass case to crack. Stay in the dark.',
  'Marble carries every footstep. Walk the carpets, mind the patrols, lift six treasures.',
  'The vault hums. Four guards, echoing stone, seven treasures — and a locked case worth the risk.',
  'Lanterns everywhere. Light is the enemy now: cross only through shadow, and never run.',
  'The Hollow Moon waits in the grand vault. Six guards. Eleven treasures. Vanish unseen.',
];

// Alarm levels shown in the HUD.
export const ALARM_LABELS = ['CALM', 'SUSPICIOUS', 'ALARM'];
export const ALARM_COLORS = ['#7ddba3', '#ffd166', '#ff5d5d'];
