import { TILE, COLS, ROWS, GRID_X, GRID_Y } from './config.js';

// ---------------------------------------------------------------------------
// Grid <-> pixel helpers. The game thinks in grid cells {col, row}; Phaser draws
// in pixels. The grid is offset by (GRID_X, GRID_Y) so the top HUD bar and the
// bottom tower palette don't overlap the play area. Everything that places or
// moves things on the field goes through these helpers.
// ---------------------------------------------------------------------------

// Center pixel of a cell — where we draw/aim things.
export function cellCenter(col, row) {
  return {
    x: GRID_X + col * TILE + TILE / 2,
    y: GRID_Y + row * TILE + TILE / 2,
  };
}

// Which cell does a pixel point fall in? (May be out of bounds — check inBounds.)
export function pixelToCell(x, y) {
  return {
    col: Math.floor((x - GRID_X) / TILE),
    row: Math.floor((y - GRID_Y) / TILE),
  };
}

export function inBounds(col, row) {
  return col >= 0 && col < COLS && row >= 0 && row < ROWS;
}
