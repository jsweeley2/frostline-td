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
  constructor(scene, stats, path, hpScale = 1) {
    this.scene = scene;
    this.stats = stats;
    this.hp = Math.round(stats.hp * hpScale); // scaled up in endless mode
    this.speed = stats.speed;
    this.damage = stats.damage;
    this.alive = true;
    this.stunTimer = 0; // ms of immobilization remaining (Tripwire Hook)
    this.slowFactor = 1; // movement multiplier (1 = normal, <1 = slowed by Frost)
    this.slowTimer = 0; // ms the current slow lasts
    this.empTimer = stats.stunsTowers ? stats.stunsTowers.intervalMs : 0;

    const start = cellCenter(path[0].col, path[0].row);
    this.x = start.x;
    this.y = start.y;
    this.sprite = this.makeSprite(scene, stats);

    this.setPath(path);
  }

  // Distinct placeholder silhouettes per shape. Depth 2 keeps enemies above
  // ground traps (depth 1) but below structure towers (depth 3).
  makeSprite(scene, stats) {
    const r = stats.radius;
    let sprite;
    if (stats.shape === 'square') {
      sprite = scene.add.rectangle(this.x, this.y, r * 2, r * 2, stats.color);
    } else if (stats.shape === 'diamond') {
      sprite = scene.add.rectangle(this.x, this.y, r * 1.7, r * 1.7, stats.color).setAngle(45);
    } else {
      sprite = scene.add.circle(this.x, this.y, r, stats.color);
    }
    return sprite.setStrokeStyle(2, 0x2b2b3a).setDepth(2);
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

    // Slow (Frost Tower) decays over time; refreshed while in an aura.
    if (this.slowTimer > 0) {
      this.slowTimer -= deltaMs;
      if (this.slowTimer <= 0) this.slowFactor = 1;
    }

    // Stun attack (Disruptor): periodically disable the nearest tower in range.
    if (this.stats.stunsTowers) this.updateStunAttack(deltaMs);

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
    const step = (this.speed * this.slowFactor * deltaMs) / 1000;

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

  // Apply a movement slow. The strongest active slow wins; the timer is
  // refreshed so it persists while the enemy stays inside a Frost aura.
  applySlow(factor, ms) {
    if (!this.alive) return;
    this.slowFactor = Math.min(this.slowFactor, factor);
    this.slowTimer = Math.max(this.slowTimer, ms);
  }

  // Disruptor's EMP: on a timer, disable the closest tower within range.
  updateStunAttack(deltaMs) {
    this.empTimer -= deltaMs;
    if (this.empTimer > 0) return;

    const { range, durationMs } = this.stats.stunsTowers;
    let best = null;
    let bestDist = Infinity;
    for (const t of this.scene.towers) {
      if (t.disabledTimer > 0) continue; // already down
      const d = Math.hypot(t.x - this.x, t.y - this.y);
      if (d <= range && d < bestDist) {
        bestDist = d;
        best = t;
      }
    }

    this.empTimer = this.stats.stunsTowers.intervalMs;
    if (best) {
      best.disable(durationMs);
      this.scene.empPulse(this.x, this.y);
    }
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
