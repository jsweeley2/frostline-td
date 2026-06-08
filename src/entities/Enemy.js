import { cellCenter } from '../grid.js';

// ---------------------------------------------------------------------------
// Enemy — walks a grid path from the spawn to the shield generator. The path is
// a list of {col, row} cells (from A*); the enemy moves smoothly between cell
// centers at its own speed. When it runs out of path it has reached the base
// and damages it.
//
// The path can be replaced mid-walk (setPath) — that's how step 4 reroutes
// enemies when a tower is placed.
// ---------------------------------------------------------------------------

export default class Enemy {
  constructor(scene, stats, path) {
    this.scene = scene;
    this.stats = stats;
    this.hp = stats.hp;
    this.speed = stats.speed;
    this.damage = stats.damage;
    this.alive = true;
    this.stunTimer = 0; // ms of immobilization remaining (Tripwire Hook)

    const start = cellCenter(path[0].col, path[0].row);
    this.x = start.x;
    this.y = start.y;

    // Light Scouts are circles, Heavy Walkers are squares — distinct silhouettes
    // until real sprites arrive. Depth 2 keeps them above ground traps (depth 1).
    const r = stats.radius;
    this.sprite =
      stats.shape === 'square'
        ? scene.add.rectangle(this.x, this.y, r * 2, r * 2, stats.color)
        : scene.add.circle(this.x, this.y, r, stats.color);
    this.sprite.setStrokeStyle(2, 0x2b2b3a).setDepth(2);

    this.setPath(path);
  }

  // Point the enemy at a fresh path. We keep walking toward the next cell that
  // is still ahead of us so a reroute doesn't make the enemy backtrack.
  setPath(path) {
    this.path = path;
    // Advance the index past any cell we've effectively already passed.
    this.pathIndex = path.length > 1 ? 1 : 0;
  }

  update(deltaMs) {
    if (!this.alive) return;

    // Immobilized (e.g. snagged by a Tripwire Hook): hold position.
    if (this.stunTimer > 0) {
      this.stunTimer -= deltaMs;
      return;
    }

    if (this.pathIndex >= this.path.length) {
      this.reachBase();
      return;
    }

    const target = cellCenter(
      this.path[this.pathIndex].col,
      this.path[this.pathIndex].row
    );
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.hypot(dx, dy);
    const step = (this.speed * deltaMs) / 1000;

    if (step >= dist) {
      // Reached this cell; line up on the next one.
      this.x = target.x;
      this.y = target.y;
      this.pathIndex += 1;
    } else {
      this.x += (dx / dist) * step;
      this.y += (dy / dist) * step;
    }

    this.sprite.setPosition(this.x, this.y);
  }

  takeDamage(amount) {
    if (!this.alive) return;
    this.hp -= amount;
    if (this.hp <= 0) this.die();
  }

  immobilize(ms) {
    if (!this.alive) return;
    this.stunTimer = Math.max(this.stunTimer, ms);
  }

  reachBase() {
    this.scene.onEnemyReachBase(this);
    this.destroy();
  }

  die() {
    this.scene.onEnemyKilled(this);
    this.destroy();
  }

  destroy() {
    if (!this.alive) return;
    this.alive = false;
    this.sprite.destroy();
  }
}
