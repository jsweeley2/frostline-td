import Phaser from 'phaser';
import {
  TILE,
  COLS,
  ROWS,
  GAME_WIDTH,
  GAME_HEIGHT,
  GRID_X,
  GRID_Y,
  GRID_W,
  GRID_H,
  TOP_BAR_H,
  BOTTOM_BAR_H,
  COLORS,
  ENEMIES,
  TOWERS,
  TOWER_ORDER,
  STARTING_CREDITS,
  SPEED_STEPS,
  AUTO_START_DELAY_MS,
} from '../config.js';
import { cellCenter, pixelToCell, inBounds } from '../grid.js';
import { level1 } from '../maps/level1.js';
import { WAVES } from '../maps/waves.js';
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
    this.credits = STARTING_CREDITS;
    this.selectedTool = null; // currently selected tower type, or null

    // Wave state. Waves may overlap: the next can be launched before the
    // previous is cleared, so we track total launched + total pending spawns
    // rather than a single "active" flag.
    this.currentWave = 0; // number of waves launched so far
    this.pendingSpawns = 0; // enemies scheduled but not yet spawned (all waves)
    this.allWavesCleared = false;

    // Controls.
    this.gameSpeed = 1; // 1x / 2x / 3x
    this.autoStart = false; // auto-launch next wave once field clears
    this.autoStartPending = false; // a queued auto-start timer is in flight

    this.gameEnded = false; // win or lose reached

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

    this.refreshWaveUi();
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
    if (stats && stats.cost > this.credits) return false; // can't afford it

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
    this.credits -= stats.cost;
    this.occupied[row][col] = true;
    const tower = new Tower(this, col, row, stats);
    this.towers.push(tower);
    if (stats.blocks) {
      this.blocked[row][col] = true;
      this.recomputePath();
    }
    this.updateHud();
  }

  // ---- waves -------------------------------------------------------------

  // True while enemies are still spawning or on the field.
  get waveInProgress() {
    return this.pendingSpawns > 0 || this.enemies.length > 0;
  }

  // Launch the next wave. Allowed any time there are waves left, even while an
  // earlier wave is still on the field — so the "Next Wave" button can rush the
  // next wave in early, and waves can overlap.
  launchWave() {
    if (this.allWavesCleared) return;
    if (this.currentWave >= WAVES.length) return;

    this.currentWave += 1;
    const wave = WAVES[this.currentWave - 1];
    let cursor = 0; // ms offset from wave start
    for (const group of wave.groups) {
      cursor += group.startDelay || 0;
      const stats = ENEMIES[group.type];
      for (let i = 0; i < group.count; i++) {
        const at = cursor + i * group.gap;
        this.pendingSpawns += 1;
        this.time.delayedCall(at, () => {
          this.pendingSpawns -= 1;
          this.spawnEnemy(stats);
        });
      }
      cursor += group.count * group.gap;
    }

    this.refreshWaveUi();
  }

  // Per-frame wave bookkeeping: detect the win, and auto-launch the next wave
  // (after a short grace delay) when auto-start is on and the field is clear.
  updateWaves() {
    if (this.allWavesCleared) return;

    const allLaunched = this.currentWave >= WAVES.length;

    if (allLaunched && !this.waveInProgress) {
      this.allWavesCleared = true;
      this.refreshWaveUi();
      this.endGame(true); // survived every wave
      return;
    }

    if (
      this.autoStart &&
      !this.autoStartPending &&
      !allLaunched &&
      !this.waveInProgress
    ) {
      this.autoStartPending = true;
      this.time.delayedCall(AUTO_START_DELAY_MS, () => {
        this.autoStartPending = false;
        if (this.autoStart) this.launchWave();
      });
    }
  }

  // Freeze the game and show the win/lose overlay. Guarded so it fires once.
  endGame(win) {
    if (this.gameEnded) return;
    this.gameEnded = true;
    this.scene.pause();
    this.scene.launch('EndScene', {
      win,
      wave: this.currentWave,
      kills: this.kills,
    });
  }

  spawnEnemy(stats) {
    if (!this.path) return;
    this.enemies.push(new Enemy(this, stats, this.path));
  }

  // ---- per-frame update --------------------------------------------------

  update(time, delta) {
    // Scale the per-frame step by the speed multiplier. Spawn timers and tweens
    // are scaled separately via time.timeScale / tweens.timeScale (see
    // setGameSpeed), so everything stays in sync.
    const dt = delta * this.gameSpeed;
    for (const tower of this.towers) tower.update(dt, this.enemies);
    for (const enemy of this.enemies) enemy.update(dt);
    this.enemies = this.enemies.filter((e) => e.alive);
    this.updateWaves();
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

  // Plasma splash flash: a filled circle that expands and fades.
  explosion(x, y, radius, color) {
    const c = this.add.circle(x, y, radius, color, 0.4).setDepth(5);
    this.tweens.add({
      targets: c,
      scale: { from: 0.5, to: 1.1 },
      alpha: 0,
      duration: 220,
      onComplete: () => c.destroy(),
    });
  }

  // Disruptor EMP: an expanding ring where a tower got knocked offline.
  empPulse(x, y) {
    const ring = this.add.circle(x, y, 14).setStrokeStyle(3, COLORS.emp, 0.9).setDepth(5);
    this.tweens.add({
      targets: ring,
      scale: { from: 0.4, to: 2.4 },
      alpha: 0,
      duration: 360,
      onComplete: () => ring.destroy(),
    });
  }

  // ---- enemy outcomes ----------------------------------------------------

  onEnemyReachBase(enemy) {
    this.baseHp = Math.max(0, this.baseHp - enemy.damage);
    this.updateHud();
    if (this.baseHp <= 0) this.endGame(false);
  }

  onEnemyKilled(enemy) {
    this.kills += 1;
    this.credits += enemy.stats.reward || 0;
    this.updateHud();
  }

  // ---- input -------------------------------------------------------------

  createInput() {
    // Phaser delivers pointer events only to the topmost interactive object,
    // so UI buttons (higher depth) won't also trigger grid placement.
    this.input.setTopOnly(true);

    this.gridZone = this.add
      .zone(GRID_X, GRID_Y, GRID_W, GRID_H)
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
    // Top bar (HUD + controls) and bottom bar (tower palette).
    this.add.rectangle(0, 0, GAME_WIDTH, TOP_BAR_H, COLORS.uiPanel, 0.92).setOrigin(0).setDepth(8);
    const bottomY = GRID_Y + GRID_H;
    this.add
      .rectangle(0, bottomY, GAME_WIDTH, BOTTOM_BAR_H, COLORS.uiPanel, 0.92)
      .setOrigin(0)
      .setDepth(8);

    this.hudText = this.add
      .text(14, 16, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '15px',
        color: '#dfe9f5',
        fontStyle: 'bold',
      })
      .setDepth(10);

    // Control buttons: speed, auto-start, rush-the-next-wave (top-right).
    this.speedBtn = this.makeButton(608, 8, 78, 32, '', COLORS.uiButton, '#dfe9f5', () =>
      this.cycleSpeed()
    );
    this.autoBtn = this.makeButton(694, 8, 110, 32, '', COLORS.uiButton, '#dfe9f5', () =>
      this.toggleAutoStart()
    );
    this.nextWaveBtn = this.makeButton(812, 8, 138, 32, '', COLORS.ghostOk, '#08240f', () =>
      this.launchWave()
    );

    // Ability hint line at the top of the bottom bar.
    this.hintText = this.add
      .text(GAME_WIDTH / 2, bottomY + 7, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '12px',
        color: '#9fc0ff',
        align: 'center',
        wordWrap: { width: GAME_WIDTH - 40 },
      })
      .setOrigin(0.5, 0)
      .setDepth(10);

    // Tower palette across the bottom bar.
    const n = TOWER_ORDER.length;
    const margin = 12;
    const gap = 10;
    const w = (GAME_WIDTH - margin * 2 - gap * (n - 1)) / n;
    const btnY = bottomY + 30;
    this.toolButtons = TOWER_ORDER.map((key, i) =>
      this.makeToolButton(margin + i * (w + gap), btnY, w, 46, TOWERS[key])
    );

    this.updateSpeedBtn();
    this.updateAutoBtn();
    this.updateHud();
  }

  // Generic labeled button. Returns { bg, label }.
  makeButton(x, y, w, h, text, fill, textColor, onClick) {
    const bg = this.add
      .rectangle(x, y, w, h, fill)
      .setOrigin(0)
      .setStrokeStyle(2, 0x0c1d33)
      .setDepth(9)
      .setInteractive({ useHandCursor: true });
    const label = this.add
      .text(x + w / 2, y + h / 2, text, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '13px',
        color: textColor,
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(10);
    bg.on('pointerdown', onClick);
    return { bg, label };
  }

  makeToolButton(x, y, w, h, stats) {
    const bg = this.add
      .rectangle(x, y, w, h, COLORS.uiButton)
      .setOrigin(0)
      .setStrokeStyle(2, COLORS.uiButtonOn)
      .setDepth(9)
      .setInteractive({ useHandCursor: true });
    const label = this.add
      .text(x + w / 2, y + h / 2, `${stats.name}\nCost ${stats.cost}`, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '13px',
        color: '#dfe9f5',
        fontStyle: 'bold',
        align: 'center',
        lineSpacing: 2,
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
    this.hintText.setText(stats ? stats.desc : '');
  }

  // ---- control buttons ---------------------------------------------------

  cycleSpeed() {
    const i = SPEED_STEPS.indexOf(this.gameSpeed);
    this.setGameSpeed(SPEED_STEPS[(i + 1) % SPEED_STEPS.length]);
  }

  setGameSpeed(mult) {
    this.gameSpeed = mult;
    // Scale Phaser's clock (spawn timers) and tweens (tracers) to match the
    // manually-scaled per-frame movement step in update().
    this.time.timeScale = mult;
    this.tweens.timeScale = mult;
    this.updateSpeedBtn();
  }

  updateSpeedBtn() {
    this.speedBtn.label.setText(`Speed ${this.gameSpeed}x`);
  }

  toggleAutoStart() {
    this.autoStart = !this.autoStart;
    this.updateAutoBtn();
  }

  updateAutoBtn() {
    this.autoBtn.label.setText(`Auto-Start: ${this.autoStart ? 'ON' : 'OFF'}`);
    this.autoBtn.bg.setFillStyle(this.autoStart ? COLORS.uiButtonOn : COLORS.uiButton);
  }

  updateHud() {
    this.hudText.setText(
      `Wave ${this.currentWave}/${WAVES.length}     Credits ${this.credits}     ` +
        `Shield ${this.baseHp}`
    );
    if (this.toolButtons) {
      for (const btn of this.toolButtons) {
        const afford = btn.stats.cost <= this.credits;
        btn.bg.setAlpha(afford ? 1 : 0.4);
        btn.label.setAlpha(afford ? 1 : 0.5);
      }
    }
  }

  // The Next-Wave button stays available while any waves remain to launch (even
  // mid-wave, so you can rush the next one in); it hides once all are sent.
  refreshWaveUi() {
    this.updateHud();

    const canLaunch = !this.allWavesCleared && this.currentWave < WAVES.length;
    this.nextWaveBtn.bg.setVisible(canLaunch);
    this.nextWaveBtn.label.setVisible(canLaunch);
    if (canLaunch) {
      this.nextWaveBtn.label.setText(`Start Wave ${this.currentWave + 1}`);
    }
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
        g.fillRect(GRID_X + col * TILE, GRID_Y + row * TILE, TILE, TILE);
      }
    }
  }

  drawGridLines() {
    const g = this.add.graphics();
    g.lineStyle(1, COLORS.grid, 0.6);
    for (let col = 0; col <= COLS; col++) {
      g.lineBetween(GRID_X + col * TILE, GRID_Y, GRID_X + col * TILE, GRID_Y + GRID_H);
    }
    for (let row = 0; row <= ROWS; row++) {
      g.lineBetween(GRID_X, GRID_Y + row * TILE, GRID_X + GRID_W, GRID_Y + row * TILE);
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
