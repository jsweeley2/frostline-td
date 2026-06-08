import Phaser from 'phaser';
import {
  TILE,
  COLS,
  ROWS,
  GAME_WIDTH,
  GAME_HEIGHT,
  COLORS,
  ENEMIES,
  TOWERS,
} from '../config.js';
import { cellCenter, pixelToCell, inBounds } from '../grid.js';
import { level1 } from '../maps/level1.js';
import { findPath } from '../pathfinding/astar.js';
import Enemy from '../entities/Enemy.js';
import Tower from '../entities/Tower.js';

// ---------------------------------------------------------------------------
// GameScene — the playfield.
//   Step 2: static board.   Step 3: enemies + A* pathfinding.
//   Step 4: place Sniper Towers (which act as walls). Placement is rejected if
//           it would fully block the path to the base; valid placements reroute
//           every live enemy in real time.
// ---------------------------------------------------------------------------

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  create() {
    this.level = level1;
    this.baseHp = level1.baseHp;
    this.enemies = [];
    this.towers = [];
    this.kills = 0;
    this.selectedTool = null; // currently selected tower type, or null

    // Two grids:
    //   blocked  — pathfinding walls (only structure towers set this true).
    //   occupied — any tower (wall OR trap), so we never stack two on a cell.
    this.blocked = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
    this.occupied = Array.from({ length: ROWS }, () => Array(COLS).fill(false));

    this.drawSnowfield();
    this.drawGridLines();

    this.pathGraphics = this.add.graphics();
    this.recomputePath();

    this.drawSpawn();
    this.drawBase();

    this.createInput();
    this.createUi();

    this.startSpawning();
  }

  // ---- pathfinding -------------------------------------------------------

  isBlocked(col, row) {
    return this.blocked[row][col];
  }

  isOccupied(col, row) {
    return this.occupied[row][col];
  }

  isReserved(col, row) {
    const s = this.level.spawn;
    const b = this.level.base;
    return (col === s.col && row === s.row) || (col === b.col && row === b.row);
  }

  // Recompute the spawn->base route (for the overlay + new spawns) and reroute
  // every live enemy from its current cell so a freshly-placed tower takes
  // effect immediately without making anyone backtrack.
  recomputePath() {
    this.path = this.findPathFrom(this.level.spawn);
    this.drawPath();

    for (const enemy of this.enemies) {
      const cell = pixelToCell(enemy.x, enemy.y);
      const p = this.findPathFrom(cell);
      if (p) enemy.setPath(p);
    }
  }

  findPathFrom(start) {
    return findPath(COLS, ROWS, (c, r) => this.isBlocked(c, r), start, this.level.base);
  }

  // ---- tower placement ---------------------------------------------------

  // Can this tower go on this cell? Must be in bounds, not the spawn/base, and
  // not already occupied. A wall-type tower additionally must not seal off the
  // path to the base; a trap never blocks, so it skips that check.
  canPlace(col, row, stats) {
    if (!inBounds(col, row)) return false;
    if (this.isReserved(col, row)) return false;
    if (this.isOccupied(col, row)) return false;

    if (stats && stats.blocks) {
      // Tentatively block it and confirm a path still exists.
      this.blocked[row][col] = true;
      const stillReachable = this.findPathFrom(this.level.spawn) !== null;
      this.blocked[row][col] = false;
      return stillReachable;
    }
    return true;
  }

  placeTower(col, row, stats) {
    this.occupied[row][col] = true;
    const tower = new Tower(this, col, row, stats);
    this.towers.push(tower);
    if (stats.blocks) {
      this.blocked[row][col] = true;
      this.recomputePath();
    }
    this.updateHud();
  }

  // ---- spawning ----------------------------------------------------------

  // Step 6 is still pre-waves: trickle a mix of both enemy types so we can see
  // both towers and the type interactions. Real wave structure arrives in step 7.
  startSpawning() {
    const script = [
      ENEMIES.lightScout,
      ENEMIES.lightScout,
      ENEMIES.lightScout,
      ENEMIES.heavyWalker,
      ENEMIES.heavyWalker,
      ENEMIES.lightScout,
      ENEMIES.heavyWalker,
    ];
    let i = 0;
    this.time.addEvent({
      delay: 1200,
      repeat: script.length - 1,
      callback: () => this.spawnEnemy(script[i++]),
    });
  }

  spawnEnemy(stats) {
    if (!this.path) return;
    this.enemies.push(new Enemy(this, stats, this.path));
  }

  // ---- per-frame update --------------------------------------------------

  update(time, delta) {
    for (const tower of this.towers) tower.update(delta, this.enemies);
    for (const enemy of this.enemies) enemy.update(delta);
    this.enemies = this.enemies.filter((e) => e.alive);
  }

  // Brief shot tracer from tower to target, fading out.
  fireTracer(x1, y1, x2, y2, color) {
    const g = this.add.graphics().setDepth(5);
    g.lineStyle(2, color, 0.95);
    g.lineBetween(x1, y1, x2, y2);
    this.tweens.add({
      targets: g,
      alpha: 0,
      duration: 120,
      onComplete: () => g.destroy(),
    });
  }

  // ---- enemy outcomes ----------------------------------------------------

  onEnemyReachBase(enemy) {
    this.baseHp = Math.max(0, this.baseHp - enemy.damage);
    this.updateHud();
  }

  onEnemyKilled() {
    this.kills += 1;
    this.updateHud();
    // Credit rewards are added in step 8.
  }

  // ---- input -------------------------------------------------------------

  createInput() {
    // Phaser delivers pointer events only to the topmost interactive object,
    // so UI buttons (higher depth) won't also trigger grid placement.
    this.input.setTopOnly(true);

    this.gridZone = this.add
      .zone(0, 0, GAME_WIDTH, GAME_HEIGHT)
      .setOrigin(0)
      .setInteractive();

    this.ghost = this.add
      .rectangle(0, 0, TILE, TILE, COLORS.ghostOk, 0.45)
      .setVisible(false)
      .setDepth(6);

    // Faint circle showing the selected tower's range while placing.
    this.ghostRange = this.add
      .circle(0, 0, 10, COLORS.ghostOk, 0.08)
      .setStrokeStyle(1, COLORS.ghostOk, 0.5)
      .setVisible(false)
      .setDepth(5);

    this.gridZone.on('pointermove', (pointer) => this.onGridHover(pointer));
    this.gridZone.on('pointerout', () => {
      this.ghost.setVisible(false);
      this.ghostRange.setVisible(false);
    });
    this.gridZone.on('pointerdown', (pointer) => this.onGridClick(pointer));

    // Right-click or Escape cancels the current tower selection.
    this.input.mouse?.disableContextMenu();
    this.input.on('pointerdown', (pointer) => {
      if (pointer.rightButtonDown()) this.selectTool(null);
    });
    this.input.keyboard?.on('keydown-ESC', () => this.selectTool(null));
  }

  onGridHover(pointer) {
    if (!this.selectedTool) {
      this.ghost.setVisible(false);
      this.ghostRange.setVisible(false);
      return;
    }
    const { col, row } = pixelToCell(pointer.worldX, pointer.worldY);
    if (!inBounds(col, row)) {
      this.ghost.setVisible(false);
      this.ghostRange.setVisible(false);
      return;
    }
    const { x, y } = cellCenter(col, row);
    const ok = this.canPlace(col, row, this.selectedTool);
    const tint = ok ? COLORS.ghostOk : COLORS.ghostBad;
    this.ghost.setPosition(x, y).setFillStyle(tint, 0.45).setVisible(true);

    const range = this.selectedTool.range || 0;
    if (range > 0) {
      this.ghostRange
        .setPosition(x, y)
        .setRadius(range)
        .setStrokeStyle(1, tint, 0.5)
        .setVisible(true);
    } else {
      this.ghostRange.setVisible(false);
    }
  }

  onGridClick(pointer) {
    if (!this.selectedTool) return;
    const { col, row } = pixelToCell(pointer.worldX, pointer.worldY);
    if (this.canPlace(col, row, this.selectedTool)) {
      this.placeTower(col, row, this.selectedTool);
      this.onGridHover(pointer); // refresh ghost (cell is now occupied)
    }
  }

  // ---- UI ----------------------------------------------------------------

  createUi() {
    // Top bar.
    this.add.rectangle(0, 0, GAME_WIDTH, 44, COLORS.uiPanel, 0.85).setOrigin(0).setDepth(8);

    this.hudText = this.add
      .text(12, 14, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '16px',
        color: '#dfe9f5',
        fontStyle: 'bold',
      })
      .setDepth(10);

    // Tool buttons, laid out right-to-left along the top bar.
    this.toolButtons = [
      this.makeToolButton(GAME_WIDTH - 180, 6, TOWERS.sniper),
      this.makeToolButton(GAME_WIDTH - 356, 6, TOWERS.tripwire),
    ];

    this.hintText = this.add
      .text(GAME_WIDTH - 366, 50, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '12px',
        color: '#9fc0ff',
        align: 'right',
      })
      .setOrigin(1, 0)
      .setDepth(10);

    this.updateHud();
  }

  makeToolButton(x, y, stats) {
    const w = 168;
    const h = 32;
    const bg = this.add
      .rectangle(x, y, w, h, COLORS.uiButton)
      .setOrigin(0)
      .setStrokeStyle(2, COLORS.uiButtonOn)
      .setDepth(9)
      .setInteractive({ useHandCursor: true });
    const label = this.add
      .text(x + w / 2, y + h / 2, `${stats.name}  (${stats.cost})`, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '13px',
        color: '#dfe9f5',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(10);

    bg.on('pointerdown', () => {
      this.selectTool(this.selectedTool === stats ? null : stats);
    });

    return { bg, label, stats };
  }

  selectTool(stats) {
    this.selectedTool = stats;
    for (const btn of this.toolButtons) {
      btn.bg.setFillStyle(btn.stats === stats ? COLORS.uiButtonOn : COLORS.uiButton);
    }
    if (!stats) {
      this.ghost.setVisible(false);
      this.ghostRange.setVisible(false);
    }
    this.hintText.setText(
      stats ? 'Click a cell to place.\nRight-click / Esc to cancel.' : ''
    );
  }

  updateHud() {
    this.hudText.setText(
      `Shield HP: ${this.baseHp}    Towers: ${this.towers.length}    Kills: ${this.kills}`
    );
  }

  // ---- drawing -----------------------------------------------------------

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
}
