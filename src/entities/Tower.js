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

  // ---- visuals -----------------------------------------------------------

  basePlatform() {
    const pad = this.scene.add
      .rectangle(this.x, this.y, TILE - 6, TILE - 6, 0x24323f)
      .setStrokeStyle(2, 0x0c1d33)
      .setDepth(3);
    this.parts.push(pad);
  }

  drawSniper() {
    this.basePlatform();
    const { x, y } = this;
    // Rotating barrel (pivots at the tower center, extends outward).
    this.barrel = this.scene.add
      .rectangle(x, y, TILE * 0.5, 6, 0xcfe0ff)
      .setOrigin(0, 0.5)
      .setStrokeStyle(1, 0x0c1d33)
      .setDepth(4);
    const hub = this.scene.add
      .circle(x, y, TILE * 0.2, this.stats.bodyColor)
      .setStrokeStyle(2, 0x0c1d33)
      .setDepth(5);
    const scope = this.scene.add.circle(x, y, TILE * 0.07, this.stats.accentColor).setDepth(6);
    this.parts.push(this.barrel, hub, scope);
  }

  drawPlasma() {
    this.basePlatform();
    const { x, y } = this;
    this.barrel = this.scene.add
      .rectangle(x, y, TILE * 0.34, 13, 0x4a2a78)
      .setOrigin(0, 0.5)
      .setStrokeStyle(1, 0x0c1d33)
      .setDepth(4);
    const hub = this.scene.add
      .circle(x, y, TILE * 0.22, this.stats.bodyColor)
      .setStrokeStyle(2, 0x0c1d33)
      .setDepth(5);
    const orb = this.scene.add.circle(x, y, TILE * 0.1, this.stats.accentColor).setDepth(6);
    this.scene.tweens.add({ targets: orb, alpha: { from: 0.6, to: 1 }, duration: 700, yoyo: true, repeat: -1 });
    this.parts.push(this.barrel, hub, orb);
  }

  drawTesla() {
    this.basePlatform();
    const { x, y } = this;
    const post = this.scene.add
      .rectangle(x, y + 5, 9, TILE * 0.42, this.stats.bodyColor)
      .setStrokeStyle(2, 0x0c1d33)
      .setDepth(4);
    // Stacked coil rings.
    for (let i = 0; i < 3; i++) {
      this.parts.push(
        this.scene.add.rectangle(x, y + 6 - i * 7, 18 - i * 3, 4, 0x9be8dd).setDepth(5)
      );
    }
    const orb = this.scene.add.circle(x, y - TILE * 0.2, TILE * 0.15, this.stats.accentColor).setDepth(6);
    this.scene.tweens.add({
      targets: orb,
      alpha: { from: 0.55, to: 1 },
      scale: { from: 0.8, to: 1.15 },
      duration: 550, yoyo: true, repeat: -1,
    });
    this.parts.push(post, orb);
  }

  drawFrost() {
    const { x, y } = this;
    // Faint slowing aura covering the tower's range.
    const aura = this.scene.add
      .circle(x, y, this.stats.range, COLORS.frostAura, 0.06)
      .setStrokeStyle(1, COLORS.frostAura, 0.3)
      .setDepth(1);
    this.scene.tweens.add({ targets: aura, alpha: { from: 0.04, to: 0.13 }, duration: 1700, yoyo: true, repeat: -1 });

    this.basePlatform();
    const hub = this.scene.add
      .circle(x, y, TILE * 0.2, this.stats.bodyColor)
      .setStrokeStyle(2, 0x0c1d33)
      .setDepth(4);
    // Slowly spinning snowflake.
    const flake = this.scene.add.graphics({ x, y }).setDepth(5);
    flake.lineStyle(3, 0xffffff, 0.95);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      flake.lineBetween(0, 0, Math.cos(a) * TILE * 0.16, Math.sin(a) * TILE * 0.16);
    }
    this.scene.tweens.add({ targets: flake, rotation: Math.PI * 2, duration: 5200, repeat: -1 });
    this.parts.push(aura, hub, flake);
  }

  // A flat hazard marker at ground level (depth 1, under enemies at depth 2).
  drawTrap() {
    const { x, y } = this;
    this.trapMarker = this.scene.add
      .rectangle(x, y, TILE - 12, TILE - 12, this.stats.color, 0.85)
      .setStrokeStyle(2, this.stats.armColor)
      .setAngle(45)
      .setDepth(1);
    // Hook prongs in the corners.
    const prongs = this.scene.add.graphics({ x, y }).setDepth(1);
    prongs.lineStyle(2, 0x5c4410, 0.9);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      prongs.lineBetween(Math.cos(a) * 6, Math.sin(a) * 6, Math.cos(a) * 13, Math.sin(a) * 13);
    }
    this.parts.push(this.trapMarker, prongs);
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

    this.scene.fireTracer(this.x, this.y, target.x, target.y, this.stats.tracerColor);
    target.takeDamage(this.stats.damage);

    if (this.stats.splashRadius) this.fireSplash(target, enemies);
    if (this.stats.chainCount) this.fireChain(target, enemies);

    this.cooldown = this.stats.fireRateMs;
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
      this.scene.fireTracer(from.x, from.y, next.x, next.y, this.stats.tracerColor);
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
    this.trapMarker.setFillStyle(
      armed ? this.stats.color : this.stats.armColor,
      armed ? 0.85 : 0.5
    );
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
