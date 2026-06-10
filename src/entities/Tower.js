import { TILE, COLORS } from '../config.js';
import { cellCenter } from '../grid.js';

// ---------------------------------------------------------------------------
// Tower — occupies one grid cell. The `kind` (from stats) picks its behavior:
//   'shooter' : fires at the nearest enemy in range. Optional stats give it a
//               special: splashRadius (Plasma Mortar) or chainCount/chainRange
//               (Tesla Coil).
//   'trap'    : a flat ground hazard (Tripwire Hook). Doesn't block the path.
//   'slow'    : a continuous aura (Frost Tower) that slows + chips enemies.
//
// The visuals are built per tower type for flavor; shooter barrels rotate to
// track their target. Any tower can be DISABLED by a Disruptor EMP, during
// which it does nothing and renders dimmed.
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

    this.cooldown = 0; // reload (shooter) / re-arm (trap)
    this.disabledTimer = 0; // ms left disabled by an EMP
    this.parts = []; // game objects to clean up on destroy
    this.barrel = null; // rotating barrel for shooter towers

    // Per-tower (upgradeable) stats, copied from the config so upgrades don't
    // mutate the shared template. Methods read these, not this.stats.<x>.
    this.level = 1;
    this.maxLevel = 3;
    this.range = stats.range;
    this.damage = stats.damage;
    this.fireRateMs = stats.fireRateMs;
    this.splashRadius = stats.splashRadius;
    this.chainCount = stats.chainCount;
    this.chainRange = stats.chainRange;
    this.chainFalloff = stats.chainFalloff;
    this.immobilizeMs = stats.immobilizeMs;
    this.cooldownMs = stats.cooldownMs;
    this.triggerRadius = stats.triggerRadius;
    this.slowFactor = stats.slowFactor;
    this.damagePerSec = stats.damagePerSec;
    this.tracerColor = stats.tracerColor;

    if (stats.kind === 'trap') this.drawTrap();
    else if (stats.kind === 'slow') this.drawFrost();
    else if (stats.key === 'plasma') this.drawPlasma();
    else if (stats.key === 'tesla') this.drawTesla();
    else this.drawSniper();

    this.addRankPips();
  }

  // ---- upgrades ----------------------------------------------------------

  canUpgrade() {
    return this.level < this.maxLevel;
  }

  // Cost to go from the current level to the next.
  upgradeCost() {
    return Math.round(this.stats.cost * 0.8 * this.level);
  }

  // Improve the tower's stats by one level. Returns false if already maxed.
  upgrade() {
    if (!this.canUpgrade()) return false;
    this.level += 1;
    if (this.stats.kind === 'shooter') {
      this.damage = Math.round(this.damage * 1.45);
      this.range = Math.round(this.range * 1.12);
      this.fireRateMs = Math.round(this.fireRateMs * 0.84);
      if (this.splashRadius) this.splashRadius = Math.round(this.splashRadius * 1.15);
      if (this.chainCount) this.chainCount += 1;
    } else if (this.stats.kind === 'trap') {
      this.damage = Math.round(this.damage * 1.5);
      this.immobilizeMs = Math.round(this.immobilizeMs * 1.2);
      this.cooldownMs = Math.round(this.cooldownMs * 0.85);
    } else if (this.stats.kind === 'slow') {
      this.slowFactor = Math.max(0.2, Math.round((this.slowFactor - 0.12) * 100) / 100);
      this.damagePerSec = Math.round(this.damagePerSec * 1.5);
      this.range = Math.round(this.range * 1.1);
      if (this.frostAura) this.frostAura.setRadius(this.range);
    }
    this.addRankPips();
    return true;
  }

  // Small gold pips above the tower showing its level.
  addRankPips() {
    if (this.rankGfx) this.rankGfx.destroy();
    this.rankGfx = this.scene.add.graphics().setDepth(7);
    this.rankGfx.fillStyle(0xffd23f, 1);
    this.rankGfx.lineStyle(1, 0x7a5a10, 1);
    const total = this.level;
    const startX = this.x - (total - 1) * 4;
    for (let i = 0; i < total; i++) {
      this.rankGfx.fillCircle(startX + i * 8, this.y - TILE * 0.5, 2.5);
      this.rankGfx.strokeCircle(startX + i * 8, this.y - TILE * 0.5, 2.5);
    }
  }

  // ---- visuals (baked sprite textures from art.js) -----------------------

  drawSniper() {
    const { x, y } = this;
    this.parts.push(this.scene.add.image(x, y, 'tower_sniper').setDepth(3));
    // Barrel pivots near the hub (origin biased left) and tracks the target.
    this.barrel = this.scene.add.image(x, y, 'tower_sniper_barrel').setOrigin(0.18, 0.5).setDepth(4);
    this.parts.push(this.barrel);
  }

  drawPlasma() {
    const { x, y } = this;
    this.parts.push(this.scene.add.image(x, y, 'tower_plasma').setDepth(3));
    this.barrel = this.scene.add.image(x, y, 'tower_plasma_barrel').setOrigin(0.2, 0.5).setDepth(4);
    this.parts.push(this.barrel);
  }

  drawTesla() {
    const { x, y } = this;
    this.parts.push(this.scene.add.image(x, y, 'tower_tesla').setDepth(3));
    const orb = this.scene.add.circle(x, y - 8, 7, this.stats.accentColor, 0.6).setDepth(4);
    this.scene.tweens.add({
      targets: orb, alpha: { from: 0.25, to: 0.8 }, scale: { from: 0.8, to: 1.25 },
      duration: 550, yoyo: true, repeat: -1,
    });
    this.parts.push(orb);
  }

  drawFrost() {
    const { x, y } = this;
    this.frostAura = this.scene.add
      .circle(x, y, this.range, COLORS.frostAura, 0.06)
      .setStrokeStyle(1, COLORS.frostAura, 0.3)
      .setDepth(1);
    this.scene.tweens.add({ targets: this.frostAura, alpha: { from: 0.04, to: 0.13 }, duration: 1700, yoyo: true, repeat: -1 });
    this.parts.push(this.frostAura);
    this.parts.push(this.scene.add.image(x, y, 'tower_frost').setDepth(3));
  }

  // A flat hazard marker at ground level (depth 1, under enemies at depth 2).
  drawTrap() {
    this.trapMarker = this.scene.add.image(this.x, this.y, 'tower_tripwire').setDepth(1);
    this.parts.push(this.trapMarker);
  }

  // Knocked offline by a Disruptor EMP.
  disable(ms) {
    this.disabledTimer = Math.max(this.disabledTimer, ms);
    for (const p of this.parts) p.setAlpha(0.35);
  }

  // ---- update ------------------------------------------------------------

  update(deltaMs, enemies) {
    if (this.disabledTimer > 0) {
      this.disabledTimer = Math.max(0, this.disabledTimer - deltaMs);
      if (this.disabledTimer === 0) {
        for (const p of this.parts) p.setAlpha(1);
      }
      return; // disabled: do nothing this frame
    }

    // Shooter barrels track the nearest target even between shots.
    if (this.barrel) {
      const aim = this.findTarget(enemies);
      if (aim) this.barrel.rotation = Math.atan2(aim.y - this.y, aim.x - this.x);
    }

    if (this.stats.kind === 'shooter') this.updateShooter(deltaMs, enemies);
    else if (this.stats.kind === 'trap') this.updateTrap(deltaMs, enemies);
    else if (this.stats.kind === 'slow') this.updateSlow(deltaMs, enemies);
  }

  // ---- shooter (Sniper / Plasma / Tesla) ---------------------------------

  updateShooter(deltaMs, enemies) {
    this.cooldown = Math.max(0, this.cooldown - deltaMs);
    if (this.cooldown > 0) return;

    const target = this.findTarget(enemies);
    if (!target) return;

    const color = this.tracerColor;
    if (this.barrel) this.muzzleFlash();
    if (this.chainCount) {
      this.scene.lightning(this.x, this.y, target.x, target.y, color);
    } else {
      this.scene.bolt(this.x, this.y, target.x, target.y, color);
    }
    target.takeDamage(this.damage);

    if (this.splashRadius) this.fireSplash(target, enemies);
    if (this.chainCount) this.fireChain(target, enemies);

    this.cooldown = this.fireRateMs;
  }

  // Flash at the tip of the rotating barrel.
  muzzleFlash() {
    const len = TILE * 0.5;
    this.scene.muzzleFlash(
      this.x + Math.cos(this.barrel.rotation) * len,
      this.y + Math.sin(this.barrel.rotation) * len,
      this.tracerColor
    );
  }

  fireSplash(target, enemies) {
    this.scene.explosion(target.x, target.y, this.splashRadius, this.tracerColor);
    for (const e of enemies) {
      if (!e.alive || e === target) continue;
      if (Math.hypot(e.x - target.x, e.y - target.y) <= this.splashRadius) {
        e.takeDamage(this.damage);
      }
    }
  }

  fireChain(target, enemies) {
    const hit = new Set([target]);
    let from = target;
    let dmg = this.damage * this.chainFalloff;
    for (let i = 0; i < this.chainCount; i++) {
      let next = null;
      let bestDist = Infinity;
      for (const e of enemies) {
        if (!e.alive || hit.has(e)) continue;
        const d = Math.hypot(e.x - from.x, e.y - from.y);
        if (d <= this.chainRange && d < bestDist) {
          bestDist = d;
          next = e;
        }
      }
      if (!next) break;
      this.scene.lightning(from.x, from.y, next.x, next.y, this.tracerColor);
      this.scene.impactSpark(next.x, next.y, this.tracerColor);
      next.takeDamage(dmg);
      hit.add(next);
      from = next;
      dmg *= this.chainFalloff;
    }
  }

  findTarget(enemies) {
    let best = null;
    let bestDist = Infinity;
    for (const e of enemies) {
      if (!e.alive) continue;
      const d = Math.hypot(e.x - this.x, e.y - this.y);
      if (d <= this.range && d < bestDist) {
        bestDist = d;
        best = e;
      }
    }
    return best;
  }

  // ---- trap (Tripwire Hook) ----------------------------------------------

  updateTrap(deltaMs, enemies) {
    if (this.cooldown > 0) {
      this.cooldown = Math.max(0, this.cooldown - deltaMs);
      if (this.cooldown === 0) this.setArmed(true);
      return;
    }

    for (const e of enemies) {
      if (!e.alive || !e.stats.triggersTripwire) continue;
      const d = Math.hypot(e.x - this.x, e.y - this.y);
      if (d <= this.triggerRadius) {
        e.takeDamage(this.damage);
        e.immobilize(this.immobilizeMs);
        this.cooldown = this.cooldownMs;
        this.setArmed(false);
        break;
      }
    }
  }

  setArmed(armed) {
    if (!this.trapMarker) return;
    // Tint + dim the sprite while the trap re-arms.
    this.trapMarker.setTint(armed ? 0xffffff : 0x8a8a8a);
    this.trapMarker.setAlpha(armed ? 1 : 0.6);
  }

  // ---- slow aura (Frost Tower) -------------------------------------------

  updateSlow(deltaMs, enemies) {
    const dot = (this.damagePerSec || 0) * (deltaMs / 1000);
    for (const e of enemies) {
      if (!e.alive) continue;
      if (Math.hypot(e.x - this.x, e.y - this.y) <= this.range) {
        e.applySlow(this.slowFactor, 250);
        if (dot > 0) e.takeDamage(dot);
      }
    }
  }

  destroy() {
    for (const p of this.parts) p.destroy();
    if (this.rankGfx) this.rankGfx.destroy();
    this.parts = [];
  }
}
