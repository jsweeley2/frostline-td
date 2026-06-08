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

    // Combat state (used by shooter-kind towers in update()).
    this.cooldown = 0;

    // Body: a rounded square filling most of the cell.
    this.body = scene.add
      .rectangle(x, y, TILE - 6, TILE - 6, stats.bodyColor)
      .setStrokeStyle(2, 0x0c1d33)
      .setDepth(3);

    // Accent: a small barrel/dish so towers read as distinct from terrain.
    this.accent = scene.add.circle(x, y, TILE * 0.18, stats.accentColor).setDepth(4);
  }

  // Called every frame for shooter-kind towers. Picks the nearest enemy in
  // range and, when reloaded, fires at it. The Sniper's slow fire rate is what
  // makes it strong against fragile Light Scouts but weak against Heavy Walkers.
  update(deltaMs, enemies) {
    if (this.stats.kind !== 'shooter') return;

    this.cooldown = Math.max(0, this.cooldown - deltaMs);
    if (this.cooldown > 0) return;

    const target = this.findTarget(enemies);
    if (!target) return;

    this.scene.fireTracer(this.x, this.y, target.x, target.y, this.stats.tracerColor);
    target.takeDamage(this.stats.damage);
    this.cooldown = this.stats.fireRateMs;
  }

  findTarget(enemies) {
    let best = null;
    let bestDist = Infinity;
    for (const e of enemies) {
      if (!e.alive) continue;
      const d = Math.hypot(e.x - this.x, e.y - this.y);
      if (d <= this.stats.range && d < bestDist) {
        bestDist = d;
        best = e;
      }
    }
    return best;
  }

  destroy() {
    this.body.destroy();
    this.accent.destroy();
  }
}
