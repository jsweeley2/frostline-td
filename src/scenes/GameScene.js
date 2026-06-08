import Phaser from 'phaser';
import { TILE, COLS, ROWS, GAME_WIDTH, GAME_HEIGHT, COLORS, ENEMIES } from '../config.js';
import { cellCenter } from '../grid.js';
import { level1 } from '../maps/level1.js';
import { findPath } from '../pathfinding/astar.js';
import Enemy from '../entities/Enemy.js';

// ---------------------------------------------------------------------------
// GameScene — the playfield.
//   Step 2: static board (snowfield, entry, shield generator).
//   Step 3: Light Scouts spawn at the entry and walk to the base via A*,
//           damaging the shield generator on arrival.
// ---------------------------------------------------------------------------

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  create() {
    this.level = level1;
    this.baseHp = level1.baseHp;
    this.enemies = [];

    // Blocked-cell grid: false = walkable. Towers will flip cells to true in
    // step 4. Stored row-major as blocked[row][col].
    this.blocked = Array.from({ length: ROWS }, () => Array(COLS).fill(false));

    this.drawSnowfield();
    this.drawGridLines();

    this.pathGraphics = this.add.graphics();
    this.recomputePath();

    this.drawSpawn();
    this.drawBase();
    this.createDebugHud();

    this.startSpawning();
  }

  // ---- pathfinding -------------------------------------------------------

  isBlocked(col, row) {
    return this.blocked[row][col];
  }

  // Recompute the spawn->base route and redraw the debug overlay. Called once
  // now; step 4 calls it again whenever a tower is added or removed.
  recomputePath() {
    this.path = findPath(
      COLS,
      ROWS,
      (c, r) => this.isBlocked(c, r),
      this.level.spawn,
      this.level.base
    );
    this.drawPath();
  }

  drawPath() {
    const g = this.pathGraphics;
    g.clear();
    if (!this.path || this.path.length < 2) return;
    g.lineStyle(3, COLORS.path, 0.5);
    const first = cellCenter(this.path[0].col, this.path[0].row);
    g.beginPath();
    g.moveTo(first.x, first.y);
    for (let i = 1; i < this.path.length; i++) {
      const p = cellCenter(this.path[i].col, this.path[i].row);
      g.lineTo(p.x, p.y);
    }
    g.strokePath();
  }

  // ---- spawning ----------------------------------------------------------

  // Step 3 is pre-waves, so just trickle a handful of Light Scouts onto the
  // field to prove spawning + pathfinding + base damage all work. Real wave
  // structure arrives in step 7.
  startSpawning() {
    let spawned = 0;
    const total = 6;
    this.time.addEvent({
      delay: 900,
      repeat: total - 1,
      callback: () => {
        spawned += 1;
        this.spawnEnemy(ENEMIES.lightScout);
      },
    });
  }

  spawnEnemy(stats) {
    if (!this.path) return;
    const enemy = new Enemy(this, stats, this.path);
    this.enemies.push(enemy);
  }

  // ---- per-frame update --------------------------------------------------

  update(time, delta) {
    for (const enemy of this.enemies) {
      enemy.update(delta);
    }
    // Drop dead/arrived enemies from the active list.
    this.enemies = this.enemies.filter((e) => e.alive);
  }

  // ---- enemy outcomes ----------------------------------------------------

  onEnemyReachBase(enemy) {
    this.baseHp = Math.max(0, this.baseHp - enemy.damage);
    this.updateDebugHud();
  }

  onEnemyKilled() {
    // Credits/kill rewards land in step 8.
  }

  // ---- drawing -----------------------------------------------------------

  drawSnowfield() {
    const g = this.add.graphics();
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const shade = (col + row) % 2 === 0 ? COLORS.snow : COLORS.snowAlt;
        g.fillStyle(shade, 1);
        g.fillRect(col * TILE, row * TILE, TILE, TILE);
      }
    }
  }

  drawGridLines() {
    const g = this.add.graphics();
    g.lineStyle(1, COLORS.grid, 0.6);
    for (let col = 0; col <= COLS; col++) {
      g.lineBetween(col * TILE, 0, col * TILE, GAME_HEIGHT);
    }
    for (let row = 0; row <= ROWS; row++) {
      g.lineBetween(0, row * TILE, GAME_WIDTH, row * TILE);
    }
  }

  drawSpawn() {
    const { col, row } = this.level.spawn;
    const { x, y } = cellCenter(col, row);
    this.add.rectangle(x, y, TILE, TILE, COLORS.spawn, 0.35);
    this.add
      .triangle(x, y, -10, -12, -10, 12, 12, 0, COLORS.spawn)
      .setStrokeStyle(2, 0x7a1f15);
    this.add
      .text(x, y - TILE * 0.7, 'ENTRY', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '12px',
        color: '#7a1f15',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
  }

  drawBase() {
    const { col, row } = this.level.base;
    const { x, y } = cellCenter(col, row);
    this.add.circle(x, y, TILE * 0.55, COLORS.baseRing, 0.25);
    this.add.circle(x, y, TILE * 0.42).setStrokeStyle(3, COLORS.baseRing);
    this.add.circle(x, y, TILE * 0.28, COLORS.base);
    this.add
      .text(x, y - TILE * 0.8, 'SHIELD', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '12px',
        color: '#0c5a60',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
  }

  // Temporary on-screen readout so we can watch base HP fall. The real HUD
  // (credits, wave, HP) is built in step 8/9.
  createDebugHud() {
    this.hudText = this.add
      .text(10, 8, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '16px',
        color: '#12386b',
        fontStyle: 'bold',
      })
      .setDepth(10);
    this.updateDebugHud();
  }

  updateDebugHud() {
    this.hudText.setText(`Shield HP: ${this.baseHp}`);
  }
}
