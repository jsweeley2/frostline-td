import { COLS, ROWS } from '../config.js';

// ---------------------------------------------------------------------------
// Maps. Two kinds:
//   type 'maze'  — freeform: no preset path. Towers act as walls and the route
//                  is found with A* (the original Frostline battlefield).
//   type 'fixed' — a classic tower-defense lane: enemies follow a preset path
//                  defined by `waypoints`; towers are placed BESIDE the lane and
//                  never block it.
// Fixed maps expand their corner waypoints into a full list of path cells, and
// derive spawn/base from the path's ends.
// ---------------------------------------------------------------------------

const mid = Math.floor(ROWS / 2);

// Expand axis-aligned corner waypoints into a contiguous list of {col,row}.
function expandPath(wp) {
  const cells = [];
  const push = (c, r) => {
    const last = cells[cells.length - 1];
    if (!last || last.col !== c || last.row !== r) cells.push({ col: c, row: r });
  };
  for (let i = 0; i < wp.length - 1; i++) {
    const a = wp[i], b = wp[i + 1];
    const dc = Math.sign(b.col - a.col);
    const dr = Math.sign(b.row - a.row);
    let c = a.col, r = a.row;
    push(c, r);
    while (c !== b.col || r !== b.row) {
      if (c !== b.col) c += dc;
      else if (r !== b.row) r += dr;
      push(c, r);
    }
  }
  return cells;
}

function fixedMap(id, name, desc, waypoints, baseHp = 100) {
  const path = expandPath(waypoints);
  return {
    id, name, desc, type: 'fixed', baseHp,
    waypoints, path,
    spawn: path[0],
    base: path[path.length - 1],
  };
}

export const MAPS = {
  snowfield: {
    id: 'snowfield', name: 'Open Snowfield', type: 'maze',
    desc: 'Freeform. Build towers as walls to carve your own maze.',
    spawn: { col: 0, row: mid }, base: { col: COLS - 1, row: mid }, baseHp: 100,
  },
  switchback: fixedMap('switchback', 'Switchback Pass',
    'A fixed S-shaped lane. Place towers along the curves.',
    [{ col: 0, row: 3 }, { col: 20, row: 3 }, { col: 20, row: 8 },
     { col: 3, row: 8 }, { col: 3, row: 12 }, { col: 23, row: 12 }]),
  gauntlet: fixedMap('gauntlet', 'The Gauntlet',
    'A long winding lane with many turns to line your guns against.',
    [{ col: 0, row: 8 }, { col: 5, row: 8 }, { col: 5, row: 2 },
     { col: 12, row: 2 }, { col: 12, row: 13 }, { col: 18, row: 13 },
     { col: 18, row: 7 }, { col: 23, row: 7 }]),
};

export const MAP_ORDER = ['snowfield', 'switchback', 'gauntlet'];
export const DEFAULT_MAP = 'snowfield';
