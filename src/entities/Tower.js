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

    if (stats.kind === 'trap') this.drawTrap();
    else if (stats.kind === 'slow') this.drawFrost();
    else if (stats.key === 'plasma') this.drawPlasma();
    else if (stats.key === 'tesla') this.drawTesla();
    else this.drawSniper();
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
    const aura = this.scene.add
      .circle(x, y, this.stats.range, COLORS.frostAura, 0.06)
      .setStrokeStyle(1, COLORS.frostAura, 0.3)
      .setDepth(1);
    this.scene.tweens.add({ targets: aura, alpha: { from: 0.04, to: 0.13 }, duration: 1700, yoyo: true, repeat: -1 });
    this.parts.push(aura);
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

    const color = this.stats.tracerColor;
    if (this.barrel) this.muzzleFlash();
    if (this.stats.chainCount) {
      this.scene.lightning(this.x, this.y, target.x, target.y, color);
    } else {
      this.scene.bolt(this.x, this.y, target.x, target.y, color);
    }
    target.takeDamage(this.stats.damage);

    if (this.stats.splashRadius) this.fireSplash(target, enemies);
    if (this.stats.chainCount) this.fireChain(target, enemies);

    this.cooldown = this.stats.fireRateMs;
  }

  // Flash at the tip of the rotating barrel.
  muzzleFlash() {
    const len = TILE * 0.5;
    this.scene.muzzleFlash(
      this.x + Math.cos(this.barrel.rotation) * len,
      this.y + Math.sin(this.barrel.rotation) * len,
      this.stats.tracerColor
    );
  }

  fireSplash(target, enemies) {
    this.scene.explosion(target.x, target.y, this.stats.splashRadius, this.stats.tracerColor);
    for (const e of enemies) {
      if (!e.alive || e === target) continue;
      if (Math.hypot(e.x - target.x, e.y - target.y) <= this.stats.splashRadius) {
        e.takeDamage(this.stats.damage);
      }
    }
  }

  fireChain(target, enemies) {
    const hit = new Set([target]);
    let from = target;
    let dmg = this.stats.damage * this.stats.chainFalloff;
    for (let i = 0; i < this.stats.chainCount; i++) {
      let next = null;
      let bestDist = Infinity;
      for (const e of enemies) {
        if (!e.alive || hit.has(e)) continue;
        const d = Math.hypot(e.x - from.x, e.y - from.y);
        if (d <= this.stats.chainRange && d < bestDist) {
          bestDist = d;
          next = e;
        }
      }
      if (!next) break;
      this.scene.lightning(from.x, from.y, next.x, next.y, this.stats.tracerColor);
      this.scene.impactSpark(next.x, next.y, this.stats.tracerColor);
      next.takeDamage(dmg);
      hit.add(next);
      from = next;
      dmg *= this.stats.chainFalloff;
    }
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
      if (d <= this.stats.triggerRadius) {
        e.takeDamage(this.stats.damage);
        e.immobilize(this.stats.immobilizeMs);
        this.cooldown = this.stats.cooldownMs;
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
    const dot = (this.stats.damagePerSec || 0) * (deltaMs / 1000);
    for (const e of enemies) {
      if (!e.alive) continue;
      if (Math.hypot(e.x - this.x, e.y - this.y) <= this.stats.range) {
        e.applySlow(this.stats.slowFactor, 250);
        if (dot > 0) e.takeDamage(dot);
      }
    }
  }

  destroy() {
    for (const p of this.parts) p.destroy();
    this.parts = [];
  }
}
