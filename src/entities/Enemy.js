import Phaser from 'phaser';
import { cellCenter } from '../grid.js';

// ---------------------------------------------------------------------------
// Enemy — walks a grid path from the spawn to the shield generator. The path is
// a list of {col, row} cells (from A*); the enemy moves smoothly between cell
// centers at its own speed. When it runs out of path it has reached the base
// and damages it.
//
// Each enemy type gets its own little drawn silhouette (a Container of shapes),
// plus a health bar that appears once it's been hurt and a frost tint while
// slowed. Gameplay still keys off this.x / this.y / stats only.
// ---------------------------------------------------------------------------

export default class Enemy {
  constructor(scene, stats, path, hpScale = 1) {
    this.scene = scene;
    this.stats = stats;
    this.hp = Math.round(stats.hp * hpScale); // scaled up in endless mode
    this.maxHp = this.hp;
    this.speed = stats.speed;
    this.damage = stats.damage;
    this.alive = true;
    this.stunTimer = 0; // ms of immobilization remaining (Tripwire Hook)
    this.slowFactor = 1; // movement multiplier (1 = normal, <1 = slowed by Frost)
    this.slowTimer = 0; // ms the current slow lasts
    this.empTimer = stats.stunsTowers ? stats.stunsTowers.intervalMs : 0;
    this.bobT = Math.random() * 1000; // phase offset so they don't bob in sync

    const start = cellCenter(path[0].col, path[0].row);
    this.x = start.x;
    this.y = start.y;
    this.buildArt(scene, stats);

    this.setPath(path);
  }

  // Build the enemy from its baked sprite texture, plus a soft shadow, a frost
  // tint (while slowed), the Disruptor's spinning emitter ring, and a health
  // bar that appears once it's hurt.
  buildArt(scene, stats) {
    const c = scene.add.container(this.x, this.y).setDepth(2);
    const r = stats.radius;

    const shadow = scene.add.ellipse(0, r * 0.8, r * 1.8, r * 0.7, 0x0a0f18, 0.28);
    this.frostOverlay = scene.add.circle(0, 0, r + 3, 0x8fdcff, 0.5).setVisible(false);

    const texKey = scene.textures.exists(`enemy_${stats.key}`)
      ? `enemy_${stats.key}`
      : 'enemy_lightScout';
    const body = scene.add.image(0, 0, texKey);
    c.add([shadow, this.frostOverlay, body]);

    // Disruptor's rotating emitter ring.
    if (stats.key === 'disruptor') {
      const ring = scene.add.graphics();
      ring.lineStyle(2, 0xd9c2ff, 0.9);
      ring.strokeCircle(0, 0, r * 0.95);
      scene.tweens.add({ targets: ring, rotation: Math.PI * 2, duration: 1400, repeat: -1 });
      c.add(ring);
    }

    // Health bar (origin-left fill so it shrinks rightward).
    this.hpBarW = r * 2 + 4;
    const barY = -(r + 9);
    this.hpBarBg = scene.add
      .rectangle(-this.hpBarW / 2, barY, this.hpBarW, 5, 0x10131c)
      .setOrigin(0, 0.5).setVisible(false);
    this.hpBarFill = scene.add
      .rectangle(-this.hpBarW / 2, barY, this.hpBarW, 5, 0x46d36a)
      .setOrigin(0, 0.5).setVisible(false);
    c.add([this.hpBarBg, this.hpBarFill]);

    this.sprite = c;
  }

  // Point the enemy at a fresh path. We keep walking toward the next cell that
  // is still ahead of us so a reroute doesn't make the enemy backtrack.
  setPath(path) {
    this.path = path;
    this.pathIndex = path.length > 1 ? 1 : 0;
  }

  update(deltaMs) {
    if (!this.alive) return;

    // Slow (Frost Tower) decays over time; refreshed while in an aura.
    if (this.slowTimer > 0) {
      this.slowTimer -= deltaMs;
      if (this.slowTimer <= 0) this.slowFactor = 1;
    }
    this.frostOverlay.setVisible(this.slowFactor < 1);

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

    const target = cellCenter(this.path[this.pathIndex].col, this.path[this.pathIndex].row);
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.hypot(dx, dy);
    const step = (this.speed * this.slowFactor * deltaMs) / 1000;

    if (step >= dist) {
      this.x = target.x;
      this.y = target.y;
      this.pathIndex += 1;
    } else {
      this.x += (dx / dist) * step;
      this.y += (dy / dist) * step;
    }

    // A gentle bob while moving so units feel alive. Cosmetic only — gameplay
    // uses this.x / this.y, which are unaffected.
    this.bobT += deltaMs;
    const bob = Math.sin(this.bobT * 0.012) * 1.5;
    this.sprite.setPosition(this.x, this.y + bob);
  }

  takeDamage(amount) {
    if (!this.alive) return;
    this.hp -= amount;
    this.updateHpBar();
    if (this.hp <= 0) this.die();
  }

  updateHpBar() {
    const ratio = Phaser.Math.Clamp(this.hp / this.maxHp, 0, 1);
    const show = ratio < 1;
    this.hpBarBg.setVisible(show);
    this.hpBarFill.setVisible(show);
    this.hpBarFill.setSize(Math.max(0.001, this.hpBarW * ratio), 5);
    const color = ratio > 0.5 ? 0x46d36a : ratio > 0.25 ? 0xf2c14e : 0xe05a47;
    this.hpBarFill.setFillStyle(color);
  }

  immobilize(ms) {
    if (!this.alive) return;
    this.stunTimer = Math.max(this.stunTimer, ms);
  }

  applySlow(factor, ms) {
    if (!this.alive) return;
    this.slowFactor = Math.min(this.slowFactor, factor);
    this.slowTimer = Math.max(this.slowTimer, ms);
  }

  updateStunAttack(deltaMs) {
    this.empTimer -= deltaMs;
    if (this.empTimer > 0) return;

    const { range, durationMs } = this.stats.stunsTowers;
    let best = null;
    let bestDist = Infinity;
    for (const t of this.scene.towers) {
      if (t.disabledTimer > 0) continue;
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
