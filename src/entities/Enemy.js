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

  // Build the enemy's drawn silhouette as a Container of shapes, plus a frost
  // tint and a health bar (hidden until damaged).
  buildArt(scene, stats) {
    const c = scene.add.container(this.x, this.y).setDepth(2);
    const r = stats.radius;

    // Frost tint (shown only while slowed), behind the body.
    this.frostOverlay = scene.add
      .circle(0, 0, r + 3, 0x8fdcff, 0.5)
      .setVisible(false);
    c.add(this.frostOverlay);

    for (const part of this.bodyParts(scene, stats, r)) c.add(part);

    // Health bar (origin-left fill so it shrinks rightward).
    this.hpBarW = r * 2 + 4;
    const barY = -(r + 9);
    this.hpBarBg = scene.add
      .rectangle(-this.hpBarW / 2, barY, this.hpBarW, 5, 0x10131c)
      .setOrigin(0, 0.5).setVisible(false);
    this.hpBarFill = scene.add
      .rectangle(-this.hpBarW / 2, barY, this.hpBarW, 5, 0x46d36a)
      .setOrigin(0, 0.5).setVisible(false);
    c.add(this.hpBarBg);
    c.add(this.hpBarFill);

    this.sprite = c;
  }

  // Per-type placeholder art. Returns an array of shapes centered on (0,0).
  bodyParts(scene, stats, r) {
    const dark = 0x2b2b3a;
    const tri = (x1, y1, x2, y2, x3, y3, color) =>
      scene.add.triangle(0, 0, x1, y1, x2, y2, x3, y3, color).setStrokeStyle(2, dark);

    switch (stats.key) {
      case 'runner':
        return [
          scene.add.rectangle(-r, -2, r * 0.8, 2, 0xffd1e0),
          scene.add.rectangle(-r, 2, r * 0.8, 2, 0xffd1e0),
          tri(-r, -r * 0.7, -r, r * 0.7, r * 1.3, 0, stats.color),
        ];
      case 'heavyWalker': {
        const leg = (lx, ly) => scene.add.rectangle(lx, ly, 5, 9, 0x3a3550);
        return [
          leg(-r * 0.7, r * 0.7), leg(r * 0.7, r * 0.7),
          leg(-r * 0.7, -r * 0.7), leg(r * 0.7, -r * 0.7),
          scene.add.rectangle(0, 0, r * 1.7, r * 1.5, stats.color).setStrokeStyle(2, dark),
          scene.add.rectangle(r * 0.5, 0, r * 0.5, r * 0.6, 0x4a4466),
          scene.add.circle(r * 0.7, 0, 2.5, 0xff5a5a),
        ];
      }
      case 'disruptor': {
        const core = scene.add.circle(0, 0, r * 0.4, 0xfff0ff);
        scene.tweens.add({ targets: core, alpha: { from: 0.5, to: 1 }, duration: 500, yoyo: true, repeat: -1 });
        const ring = scene.add.graphics();
        ring.lineStyle(2, 0xd9c2ff, 0.9);
        ring.strokeCircle(0, 0, r * 0.85);
        scene.tweens.add({ targets: ring, rotation: Math.PI * 2, duration: 1400, repeat: -1 });
        return [
          scene.add.rectangle(0, 0, r * 1.4, r * 1.4, stats.color).setStrokeStyle(2, dark).setAngle(45),
          ring, core,
        ];
      }
      case 'juggernaut':
        return [
          scene.add.rectangle(-r * 0.85, 0, 6, r * 1.7, 0x20242e), // treads
          scene.add.rectangle(r * 0.85, 0, 6, r * 1.7, 0x20242e),
          scene.add.rectangle(0, 0, r * 1.6, r * 1.6, stats.color).setStrokeStyle(3, 0x14161d),
          scene.add.rectangle(0, -r * 0.3, r * 1.2, r * 0.5, 0x565d72), // armor plate
          scene.add.circle(-r * 0.4, r * 0.4, 3, 0xff5a5a), // eyes
          scene.add.circle(r * 0.4, r * 0.4, 3, 0xff5a5a),
        ];
      default: // lightScout
        return [
          tri(-r, -r * 0.8, -r, r * 0.8, r * 1.2, 0, stats.color),
          scene.add.circle(r * 0.2, 0, r * 0.35, 0xbfeaff),
        ];
    }
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
