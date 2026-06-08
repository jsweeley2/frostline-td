// ---------------------------------------------------------------------------
// A* pathfinding over the grid. Movement is 4-directional (no diagonals) so
// enemies can never slip through the corner gap between two diagonally-placed
// towers — important for maze TD where towers act as walls.
//
//   cols, rows : grid dimensions
//   isBlocked  : (col, row) => boolean, true if a cell cannot be walked
//   start, goal: {col, row}
//
// Returns an array of {col, row} from start to goal (inclusive), or null if no
// path exists.
// ---------------------------------------------------------------------------

const NEIGHBORS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

export function findPath(cols, rows, isBlocked, start, goal) {
  const key = (c, r) => r * cols + c;
  const startK = key(start.col, start.row);
  const goalK = key(goal.col, goal.row);

  const heuristic = (c, r) => Math.abs(c - goal.col) + Math.abs(r - goal.row);

  const open = new Set([startK]);
  const cameFrom = new Map();
  const gScore = new Map([[startK, 0]]);
  const fScore = new Map([[startK, heuristic(start.col, start.row)]]);

  while (open.size > 0) {
    // Pick the open node with the lowest fScore. The grid is small (~384
    // cells) so a linear scan is plenty fast and keeps the code simple.
    let currentK = null;
    let bestF = Infinity;
    for (const k of open) {
      const f = fScore.has(k) ? fScore.get(k) : Infinity;
      if (f < bestF) {
        bestF = f;
        currentK = k;
      }
    }

    if (currentK === goalK) {
      return reconstruct(cameFrom, currentK, cols);
    }

    open.delete(currentK);
    const cc = currentK % cols;
    const cr = Math.floor(currentK / cols);

    for (const [dc, dr] of NEIGHBORS) {
      const nc = cc + dc;
      const nr = cr + dr;
      if (nc < 0 || nc >= cols || nr < 0 || nr >= rows) continue;
      if (isBlocked(nc, nr)) continue;

      const nk = key(nc, nr);
      const tentativeG = (gScore.has(currentK) ? gScore.get(currentK) : Infinity) + 1;
      if (tentativeG < (gScore.has(nk) ? gScore.get(nk) : Infinity)) {
        cameFrom.set(nk, currentK);
        gScore.set(nk, tentativeG);
        fScore.set(nk, tentativeG + heuristic(nc, nr));
        open.add(nk);
      }
    }
  }

  return null; // no path
}

function reconstruct(cameFrom, endK, cols) {
  const path = [];
  let k = endK;
  while (k !== undefined) {
    path.unshift({ col: k % cols, row: Math.floor(k / cols) });
    k = cameFrom.get(k);
  }
  return path;
}
