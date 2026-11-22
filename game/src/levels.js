// NIGHTGLASS — the five heists.
// Every map is 32 columns by 18 rows. Legend:
//   #  wall (blocks sight and movement)
//   .  marble floor (footsteps carry)
//   ,  carpet (quiet, dark — the safe path)
//   ;  stone floor (loud — every step echoes)
//   D  display case (cover: blocks sight and movement)
//   L  lantern (a pool of light; standing in it you are LIT)
//   H  shadow alcove (always dark, always safe)
//   T  treasure (grab it)
//   K  locked case (a treasure behind a lockpick)
//   M  the heist's target gem (steal it, then reach the exit)
//   X  exit (opens once the gem is stolen)
//   P  where the thief starts
//   G  a guard's patrol start
//
// Guard totals: 2 + 3 + 4 + 4 + 6 = 19 guards.
// Treasure totals: 4 + 6 + 7 + 8 + 11 = 36 treasures.

export const LEVELS = [
  {
    name: 'The Glass Atrium',
    grid: [
      '################################',
      '#P....,,.....D.......L....T....#',
      '#......,,.....D.......,........#',
      '#.##..,,....D.......,....###...#',
      '#......,,...........,...#M#....#',
      '#......,,..T........,...#.#....#',
      '#.####..D..........####...#....#',
      '#.......D......L...D.....#..X..#',
      '#..L...D.....,,....D.....#.....#',
      '#......D.....,,....D...,,......#',
      '#.####......,,.....D...,,..L...#',
      '#....T......,,..........,,.....#',
      '#..D........,,..D....D..,,.....#',
      '#..D..G......,,..D....D....G...#',
      '#..............................#',
      '#..T.......L...................#',
      '#..............................#',
      '################################',
    ],
    guards: [
      { waypoints: [[6, 13], [6, 10], [12, 10], [12, 13]] },
      { waypoints: [[27, 13], [27, 9], [20, 9], [20, 13]] },
    ],
  },
  {
    name: 'The Marble Gallery',
    grid: [
      '################################',
      '#P......,,,,......D............#',
      '#.......,,,,......D.....L......#',
      '#..##...,,,,..T...D.....,,,....#',
      '#.......,,,,......D.....,,,.M..#',
      '#..D....,,,,..D........D.......#',
      '#..D....,,,,..D...L....D....K..#',
      '#.......,,,,......D.....,,,....#',
      '#..L....,,,,..D...D.....,,,..X.#',
      '#.......,,,,......D.....,,,....#',
      '#..D....,,,,......D....D.......#',
      '#..D....T.........D....D...L...#',
      '#.......,,,,..D....T...D.......#',
      '#..G....,,,,..D....T...D....G..#',
      '#.......,,,,...................#',
      '#..T....,,,,..L.............G..#',
      '#.......,,,,...................#',
      '################################',
    ],
    guards: [
      { waypoints: [[3, 13], [3, 9], [9, 9], [9, 13]] },
      { waypoints: [[28, 13], [28, 8], [21, 8], [21, 13]] },
      { waypoints: [[28, 15], [20, 15], [20, 11], [28, 11]] },
    ],
  },
  {
    name: 'The Vault of Echoes',
    grid: [
      '################################',
      '#P...;;;....D.......L.....;;...#',
      '#....;;;....D.......;.........;#',
      '#.##.;;;....D....T..;....##....#',
      '#....;;;....D.......;...#M#....#',
      '#....;;;.T..D.......;...#.#.K..#',
      '#.####.....D......####....#.#..#',
      '#......;...D...L..D......#..X..#',
      '#..L..;....D...;..D...T...#....#',
      '#......;...D...;..D.....;;G....#',
      '#.####.....;....D.....;;..L....#',
      '#....T.....;..........;;.......#',
      '#..D......;..D....D...;;.......#',
      '#..D..G...;..D....D....;..G....#',
      '#.....;........................#',
      '#..T..;...L......T....;........#',
      '#.....;..........G.............#',
      '################################',
    ],
    guards: [
      { waypoints: [[26, 9], [26, 12], [20, 12], [20, 9]] },
      { waypoints: [[6, 13], [6, 10], [11, 10], [11, 13]] },
      { waypoints: [[26, 13], [26, 10], [21, 10], [21, 13]] },
      { waypoints: [[17, 16], [17, 11], [14, 11], [14, 16]] },
    ],
  },
  {
    name: 'The Lantern Wing',
    grid: [
      '################################',
      '#P....,,.....D....L....,,......#',
      '#......,,.....D.......,,.......#',
      '#.##..,,..T..D....L...,,.##....#',
      '#......,,.....D.......,,#M#....#',
      '#..L..,,..D..D....L....,,....K.#',
      '#.####....D.......####..#.#....#',
      '#.......L.D...T...D......#.X...#',
      '#..D....D.....,,......T...#....#',
      '#..D....D.....,,......,,..G....#',
      '#.####......,,....D...,,..L....#',
      '#....T......,,....D...,,.......#',
      '#..D....L...,,..D....D....T....#',
      '#..D..G.....,,..D....D....G....#',
      '#..........,,..................#',
      '#..K....L..,,......T....L......#',
      '#..........,,.....G............#',
      '################################',
    ],
    guards: [
      { waypoints: [[26, 9], [25, 12], [20, 12], [20, 9]] },
      { waypoints: [[6, 13], [6, 9], [11, 9], [11, 13]] },
      { waypoints: [[26, 13], [26, 10], [21, 10], [22, 13]] },
      { waypoints: [[18, 16], [18, 12], [13, 12], [13, 16]] },
    ],
  },
  {
    name: 'The Hollow Moon',
    grid: [
      '################################',
      '#P....,,.....D....L....,,..T...#',
      '#......,,.....D.......,,..K....#',
      '#.##..,,..T..D....L...,,.##....#',
      '#......,,.....D.......,,#M#....#',
      '#..L..,,..D..D....L....,,....T.#',
      '#.####....D.......####..#.#....#',
      '#.......L.D...T...D......#.X...#',
      '#..D....D.....,,..........#..G.#',
      '#..D..G.D.....,,......,,...G...#',
      '#.####......,,....D...,,..L....#',
      '#....T......,,....D...,,.......#',
      '#..D....L...,,..D....D....T....#',
      '#..D..G.....,,..D....D....G....#',
      '#..........,,..................#',
      '#..K....L..,,......T....L..T...#',
      '#..........,,.....G......K.....#',
      '################################',
    ],
    guards: [
      { waypoints: [[29, 8], [29, 12], [24, 12], [24, 8]] },
      { waypoints: [[6, 9], [6, 5], [11, 5], [11, 9]] },
      { waypoints: [[27, 9], [27, 12], [22, 12], [22, 9]] },
      { waypoints: [[6, 13], [6, 10], [11, 10], [11, 13]] },
      { waypoints: [[26, 13], [26, 10], [21, 10], [22, 13]] },
      { waypoints: [[18, 16], [18, 12], [13, 12], [13, 16]] },
    ],
  },
];

// A tile blocks movement when it is a wall or a display case.
export function tileBlocksMovement(ch) {
  return ch === '#' || ch === 'D';
}

// A tile blocks a guard's line of sight when it is a wall or a display case.
export function tileBlocksSight(ch) {
  return ch === '#' || ch === 'D';
}

// The floor under a tile: marble '.', carpet ',' or stone ';'.
// Markers (P, G, T, K, M, X, L, H) sit on marble.
export function tileFloor(ch) {
  if (ch === ',' || ch === ';') return ch;
  return '.';
}

// Parse one level into the structures the game loop uses.
export function parseLevel(index) {
  const def = LEVELS[index];
  const walls = new Set();
  const cases = new Set();
  const floors = new Map();
  const lanterns = [];
  const alcoves = [];
  const treasures = [];
  const locked = [];
  let gem = null;
  let exit = null;
  let playerStart = null;
  const guardSpawns = [];
  for (let row = 0; row < def.grid.length; row++) {
    const line = def.grid[row];
    for (let col = 0; col < line.length; col++) {
      const ch = line[col];
      const key = `${col},${row}`;
      if (ch === '#') walls.add(key);
      if (ch === 'D') cases.add(key);
      floors.set(key, tileFloor(ch));
      if (ch === 'L') lanterns.push({ col, row });
      if (ch === 'H') alcoves.push({ col, row });
      if (ch === 'T') treasures.push({ col, row, taken: false });
      if (ch === 'K') locked.push({ col, row, taken: false, picked: 0 });
      if (ch === 'M') gem = { col, row, taken: false };
      if (ch === 'X') exit = { col, row };
      if (ch === 'P') playerStart = { col, row };
      if (ch === 'G') guardSpawns.push({ col, row });
    }
  }
  return {
    index,
    name: def.name,
    grid: def.grid,
    walls,
    cases,
    floors,
    lanterns,
    alcoves,
    treasures,
    locked,
    gem,
    exit,
    playerStart,
    guardSpawns,
    guardDefs: def.guards,
  };
}

// True when the tile at (col, row) can be walked on.
export function isWalkable(level, col, row) {
  if (col < 0 || row < 0 || col >= 32 || row >= 18) return false;
  const ch = level.grid[row][col];
  return !tileBlocksMovement(ch);
}

// Flood fill from the player start over walkable tiles. Returns the set
// of reachable "col,row" keys. Used by the build-time level check.
export function reachableTiles(level) {
  const start = level.playerStart;
  const seen = new Set([`${start.col},${start.row}`]);
  const queue = [[start.col, start.row]];
  while (queue.length > 0) {
    const [col, row] = queue.pop();
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nc = col + dc;
      const nr = row + dr;
      const key = `${nc},${nr}`;
      if (!seen.has(key) && isWalkable(level, nc, nr)) {
        seen.add(key);
        queue.push([nc, nr]);
      }
    }
  }
  return seen;
}

// Static checks every level must pass: shape, counts, reachability.
export function validateLevel(index) {
  const def = LEVELS[index];
  const errors = [];
  if (def.grid.length !== 18) errors.push(`rows ${def.grid.length} != 18`);
  def.grid.forEach((line, row) => {
    if (line.length !== 32) errors.push(`row ${row} length ${line.length} != 32`);
  });
  const level = parseLevel(index);
  const count = (ch) => def.grid.join('').split(ch).length - 1;
  if (count('P') !== 1) errors.push(`P count ${count('P')} != 1`);
  if (count('M') !== 1) errors.push(`M count ${count('M')} != 1`);
  if (count('X') !== 1) errors.push(`X count ${count('X')} != 1`);
  if (count('G') !== def.guards.length) {
    errors.push(`G count ${count('G')} != guard defs ${def.guards.length}`);
  }
  const reached = reachableTiles(level);
  const need = [
    ...level.treasures.map((t) => [t.col, t.row, 'treasure']),
    ...level.locked.map((t) => [t.col, t.row, 'locked case']),
    [level.gem.col, level.gem.row, 'gem'],
    [level.exit.col, level.exit.row, 'exit'],
  ];
  for (const [col, row, what] of need) {
    if (!reached.has(`${col},${row}`)) errors.push(`${what} at ${col},${row} unreachable`);
  }
  level.guardDefs.forEach((g, i) => {
    g.waypoints.forEach(([col, row], w) => {
      if (!isWalkable(level, col, row)) errors.push(`guard ${i} waypoint ${w} at ${col},${row} not walkable`);
    });
    const spawn = level.guardSpawns[i];
    if (!spawn) errors.push(`guard ${i} has no G spawn tile`);
    else if (spawn.col !== g.waypoints[0][0] || spawn.row !== g.waypoints[0][1]) {
      errors.push(`guard ${i} spawn ${spawn.col},${spawn.row} != first waypoint ${g.waypoints[0]}`);
    }
  });
  return errors;
}

// Totals across the campaign, for the title and the HUD.
export function campaignTotals() {
  let guards = 0;
  let treasures = 0;
  for (const def of LEVELS) {
    guards += def.guards.length;
    const flat = def.grid.join('');
    treasures += (flat.split('T').length - 1) + (flat.split('K').length - 1);
  }
  return { guards, treasures, heists: LEVELS.length };
}
