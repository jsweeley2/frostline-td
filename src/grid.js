import { TILE, COLS, ROWS } from './config.js';

// ---------------------------------------------------------------------------
// Grid <-> pixel helpers. The game thinks in grid cells {col, row}; Phaser draws
// in pixels. Everything that places or moves things on the field goes through
// these so pathfinding, towers, and enemies all agree on where a cell is.
// ---------------------------------------------------------------------------

// Center pixel of a cell — where we draw/aim things.
export function cellCenter(col, row) {
  return {
    x: col * TILE + TILE / 2,
    y: row * TILE + TILE / 2,
  };
}

// Which cell does a pixel point fall in?
export function pixelToCell(x, y) {
  return {
    col: Math.floor(x / TILE),
    row: Math.floor(y / TILE),
  };
}

export function inBounds(col, row) {
  return col >= 0 && col < COLS && row >= 0 && row < ROWS;
}
