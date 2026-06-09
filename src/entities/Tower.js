import { TILE } from '../config.js';
import { cellCenter } from '../grid.js';

// ---------------------------------------------------------------------------
// Tower — occupies one grid cell. The `kind` (from stats) picks its behavior:
//   'shooter' : fires at the nearest enemy in range. Optional stats give it a
//               special: splashRadius (Plasma Mortar, area damage) or
//               chainCount/chainRange (Tesla Coil, lightning that jumps).
//   'trap'    : a flat ground hazard (Tripwire Hook). Doesn't block the path;
//               triggers on heavy enemies, hits + immobilizes, then re-arms.
//   'slow'    : a continuous aura (Frost Tower) that slows + chips every enemy
//               in range.
//
// Any tower can be DISABLED by a Disruptor's EMP for a few seconds, during
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

    if (stats.kind === 'trap') this.drawTrap();
    else this.drawStructure();
  }

  drawStructure() {
    const body = this.scene.add
      .rectangle(this.x, this.y, TILE - 6, TILE - 6, this.stats.bodyColor)
      .setStrokeStyle(2, 0x0c1d33)
      .setDepth(3);
    const accent = this.scene.add
      .circle(this.x, this.y, TILE * 0.18, this.stats.accentColor)
      .setDepth(4);
    this.parts.push(body, accent);
  }

  // A flat hazard marker at ground level (depth 1, under enemies at depth 2).
  drawTrap() {
    this.trapMarker = this.scene.add
      .rectangle(this.x, this.y, TILE - 12, TILE - 12, this.stats.color, 0.85)
      .setStrokeStyle(2, this.stats.armColor)
      .setAngle(45)
      .setDepth(1);
    this.parts.push(this.trapMarker);
  }

  // Knocked offline by a Disruptor EMP.
  disable(ms) {
    this.disabledTimer = Math.max(this.disabledTimer, ms);
    for (const p of this.parts) p.setAlpha(0.35);
  }

  update(deltaMs, enemies) {
    if (this.disabledTimer > 0) {
      this.disabledTimer = Math.max(0, this.disabledTimer - deltaMs);
      if (this.disabledTimer === 0) {
        for (const p of this.parts) p.setAlpha(1);
      }
      return; // disabled: do nothing this frame
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

  // Plasma Mortar: everything within splashRadius of the impact also takes the
  // hit (the primary target was already damaged above).
  fireSplash(target, enemies) {
    this.scene.explosion(target.x, target.y, this.stats.splashRadius, this.stats.tracerColor);
    for (const e of enemies) {
      if (!e.alive || e === target) continue;
      if (Math.hypot(e.x - target.x, e.y - target.y) <= this.stats.splashRadius) {
        e.takeDamage(this.stats.damage);
      }
    }
  }

  // Tesla Coil: the bolt jumps from the target to nearby enemies, losing a bit
  // of damage each jump.
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
