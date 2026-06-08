import { COLS, ROWS } from '../config.js';

// ---------------------------------------------------------------------------
// Level 1 layout. A single open snowfield: enemies enter on the left edge and
// march toward the shield generator on the right edge. Positions are in grid
// coordinates {col, row}, NOT pixels. Wave definitions get added in step 7.
// ---------------------------------------------------------------------------

export const level1 = {
  cols: COLS,
  rows: ROWS,

  // Enemy entry point: left edge, vertically centered.
  spawn: { col: 0, row: Math.floor(ROWS / 2) },

  // Shield generator (the base we defend): right edge, vertically centered.
  base: { col: COLS - 1, row: Math.floor(ROWS / 2) },

  baseHp: 100,
};
