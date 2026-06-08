import { TILE } from '../config.js';
import { cellCenter } from '../grid.js';

// ---------------------------------------------------------------------------
// Tower — occupies one grid cell. Two kinds, driven by the stats object:
//   'shooter' (Sniper Tower): a wall that fires at enemies in range.
//   'trap'    (Tripwire Hook): a low ground hazard enemies walk over. It does
//             NOT block the path; it triggers on heavy enemies, hitting and
//             briefly immobilizing them, then re-arms after a cooldown.
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

    this.cooldown = 0; // shared timer: reload (shooter) / re-arm (trap)
    this.parts = []; // graphics objects to clean up on destroy

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

  update(deltaMs, enemies) {
    if (this.stats.kind === 'shooter') this.updateShooter(deltaMs, enemies);
    else if (this.stats.kind === 'trap') this.updateTrap(deltaMs, enemies);
  }

  // Picks the nearest enemy in range and fires when reloaded. The slow fire
  // rate is what makes the Sniper strong vs fragile Scouts but weak vs Walkers.
  updateShooter(deltaMs, enemies) {
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

  // Triggers on the first tripwire-triggering enemy standing on the trap, then
  // re-arms. Light Scouts pass over harmlessly (triggersTripwire is false).
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
        this.scene.fireTracer(this.x, this.y - 1, this.x, this.y + 1, 0xffffff);
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

  destroy() {
    for (const p of this.parts) p.destroy();
    this.parts = [];
  }
}
