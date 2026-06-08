import { TILE } from '../config.js';
import { cellCenter } from '../grid.js';

// ---------------------------------------------------------------------------
// Tower — occupies one grid cell and acts as a wall (enemies route around it).
// Step 4 just places and draws it; shooting is added in step 5. Built generic
// over a stats object so the Tripwire Hook (step 6) reuses the same class.
// ---------------------------------------------------------------------------

export default class Tower {
  constructor(scene, col, row, stats) {
    this.scene = scene;
    this.col = col;
    this.row = row;
    this.stats = stats;

    const { x, y } = cellCenter(col, row);
    this.x = x;
    this.y = y;

    // Body: a rounded square filling most of the cell.
    this.body = scene.add
      .rectangle(x, y, TILE - 6, TILE - 6, stats.bodyColor)
      .setStrokeStyle(2, 0x0c1d33)
      .setDepth(3);

    // Accent: a small barrel/dish so towers read as distinct from terrain.
    this.accent = scene.add.circle(x, y, TILE * 0.18, stats.accentColor).setDepth(4);
  }

  destroy() {
    this.body.destroy();
    this.accent.destroy();
  }
}
