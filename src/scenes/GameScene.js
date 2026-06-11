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
  COST_GROWTH,
  SELL_REFUND,
  AVD,
} from '../config.js';
import { cellCenter, pixelToCell, inBounds } from '../grid.js';
import { level1 } from '../maps/level1.js';
import { WAVES, getWave } from '../maps/waves.js';
import { findPath } from '../pathfinding/astar.js';
import { buildGameTextures } from '../art.js';
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
    // active:false — the TitleScene starts this scene when the player begins.
    super({ key: 'GameScene', active: false });
  }

  // Receives { mode, player, endless } when started from mode select / replay.
  //   mode: 'solo' (default) | 'avd' (attacker vs defender) | 'duel' (score duel)
  init(data) {
    data = data || {};
    this.mode = data.mode || 'solo';
    this.duelPlayer = data.player || 1;
    // Score Duel is always an Endless survival race.
    this.startEndless = this.mode === 'duel' ? true : !!data.endless;
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
    this.endless = this.startEndless || false; // Campaign vs Endless (from init)

    // Two grids:
    //   blocked  — pathfinding walls (only structure towers set this true).
    //   occupied — any tower (wall OR trap), so we never stack two on a cell.
    this.blocked = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
    this.occupied = Array.from({ length: ROWS }, () => Array(COLS).fill(false));

    buildGameTextures(this); // bake all sprite textures once

    this.drawSnowfield();
    this.drawGridLines();

    this.pathGraphics = this.add.graphics();
    this.recomputePath();

    this.drawSpawn();
    this.drawBase();
    this.createAmbience();
    this.createVignette();
    this.drawBorder();

    this.createInput();
    this.createUi();

    this.setupMode();
    this.refreshWaveUi();
  }

  // Apply per-mode setup once the board + UI exist.
  setupMode() {
    if (this.mode === 'duel') {
      // Score Duel: an Endless survival race, auto-running so the idle player
      // can't stall. Hide wave controls; show whose turn + score.
      this.autoStart = true;
      this.modeBtn?.bg.setVisible(false); this.modeBtn?.label.setVisible(false);
      this.autoBtn?.bg.setVisible(false); this.autoBtn?.label.setVisible(false);
      this.nextWaveBtn?.bg.setVisible(false); this.nextWaveBtn?.label.setVisible(false);
      this.launchWave(); // kick off the first wave immediately
    } else if (this.mode === 'avd') {
      // Attacker vs Defender: no preset waves. Defender builds; attacker sends
      // units with number keys, spending regenerating menace. Survive the timer.
      this.credits = AVD.startCredits;
      this.menace = AVD.startMenace;
      this.surviveLeft = AVD.surviveMs;
      this.modeBtn?.bg.setVisible(false); this.modeBtn?.label.setVisible(false);
      this.autoBtn?.bg.setVisible(false); this.autoBtn?.label.setVisible(false);
      this.nextWaveBtn?.bg.setVisible(false); this.nextWaveBtn?.label.setVisible(false);
      this.createAttackerUi();
      const K = Phaser.Input.Keyboard.KeyCodes;
      [K.ONE, K.TWO, K.THREE, K.FOUR, K.FIVE].forEach((code, i) => {
        this.input.keyboard?.on(`keydown-${['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE'][i]}`, () => this.sendAttackUnit(i));
      });
    }
    this.updateHud();
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

  // ---- tower placement, pricing + caps -----------------------------------

  // How many of this tower type are currently on the field.
  countOf(key) {
    return this.towers.reduce((n, t) => n + (t.stats.key === key ? 1 : 0), 0);
  }

  // Price rises with each tower of that type you already own.
  costToBuild(stats) {
    return Math.round(stats.cost * COST_GROWTH ** this.countOf(stats.key));
  }

  atMax(stats) {
    return this.countOf(stats.key) >= stats.max;
  }

  // Can this tower go on this cell? Must be in bounds, not the spawn/base, not
  // occupied, under the build cap, and affordable. A wall-type tower also must
  // not seal off the path to the base; a trap never blocks, so it skips that.
  canPlace(col, row, stats) {
    if (!inBounds(col, row)) return false;
    if (this.isReserved(col, row)) return false;
    if (this.isOccupied(col, row)) return false;
    if (stats && this.atMax(stats)) return false; // hit the build cap
    if (stats && this.costToBuild(stats) > this.credits) return false; // can't afford

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
    const cost = this.costToBuild(stats);
    this.credits -= cost;
    this.occupied[row][col] = true;
    const tower = new Tower(this, col, row, stats);
    tower.spent = cost; // tracked for sell refunds (grows with upgrades)
    this.towers.push(tower);
    this.placeFx(tower.x, tower.y);
    if (stats.blocks) {
      this.blocked[row][col] = true;
      this.recomputePath();
    }
    this.updateHud();
  }

  // Sell a placed tower for a refund of part of everything spent on it.
  sellTower(tower) {
    const refund = Math.round((tower.spent || tower.stats.cost) * SELL_REFUND);
    this.credits += refund;
    this.occupied[tower.row][tower.col] = false;
    this.towers = this.towers.filter((t) => t !== tower);
    if (tower.stats.blocks) {
      this.blocked[tower.row][tower.col] = false;
      this.recomputePath();
    }
    this.placeFx(tower.x, tower.y);
    tower.destroy();
    this.deselectTower();
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
    // Campaign stops at the last hand-built wave; Endless never stops.
    if (!this.endless && this.currentWave >= WAVES.length) return;

    this.currentWave += 1;
    const wave = getWave(this.currentWave);
    const hpScale = wave.hpScale || 1;
    let cursor = 0; // ms offset from wave start
    for (const group of wave.groups) {
      cursor += group.startDelay || 0;
      const stats = ENEMIES[group.type];
      for (let i = 0; i < group.count; i++) {
        const at = cursor + i * group.gap;
        this.pendingSpawns += 1;
        this.time.delayedCall(at, () => {
          this.pendingSpawns -= 1;
          this.spawnEnemy(stats, hpScale);
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

    // Endless mode never "completes"; only Campaign can be won.
    const allLaunched = !this.endless && this.currentWave >= WAVES.length;

    if (allLaunched && !this.waveInProgress) {
      this.allWavesCleared = true;
      this.refreshWaveUi();
      this.endGame(true); // survived every campaign wave
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

  // Freeze the game and show the right end overlay. Guarded so it fires once.
  // `win` means: solo = cleared all waves; avd = defender survived the timer.
  endGame(win) {
    if (this.gameEnded) return;
    this.gameEnded = true;
    this.scene.pause();

    if (this.mode === 'duel') {
      // Record this player's survival score, then advance the duel.
      const score = { wave: this.currentWave, kills: this.kills };
      this.scene.launch('EndScene', { duel: true, player: this.duelPlayer, score });
      return;
    }
    if (this.mode === 'avd') {
      this.scene.launch('EndScene', { avd: true, defenderWon: win, wave: this.currentWave, kills: this.kills });
      return;
    }
    this.scene.launch('EndScene', {
      win,
      wave: this.currentWave,
      kills: this.kills,
      endless: this.endless,
    });
  }

  spawnEnemy(stats, hpScale = 1) {
    if (!this.path) return;
    this.enemies.push(new Enemy(this, stats, this.path, hpScale));
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
    if (this.mode === 'avd') this.updateAvd(dt);
    else this.updateWaves();
  }

  // ---- Attacker vs Defender ----------------------------------------------

  updateAvd(dt) {
    if (this.gameEnded) return;
    // Regenerate the attacker's menace points.
    this.menace = Math.min(AVD.maxMenace, this.menace + (AVD.menaceRegenPerSec * dt) / 1000);
    // Tick the survival timer; defender wins if it runs out.
    this.surviveLeft -= dt;
    if (this.surviveLeft <= 0) {
      this.surviveLeft = 0;
      this.endGame(true); // defender survived
      return;
    }
    this.updateAttackerUi();
    this.updateHud();
  }

  // Attacker presses 1-5 to spend menace and send a unit from the entry.
  sendAttackUnit(index) {
    if (this.mode !== 'avd' || this.gameEnded) return;
    const unit = AVD.units[index];
    if (!unit || this.menace < unit.cost) return;
    this.menace -= unit.cost;
    this.spawnEnemy(ENEMIES[unit.key], 1);
    this.updateAttackerUi();
  }

  createAttackerUi() {
    // Attacker control panel in the top bar, right side (where the hidden wave
    // controls were). The defender keeps the bottom tower palette.
    this.attackerText = this.add
      .text(GAME_WIDTH - 14, 6, '', {
        fontFamily: '"Courier New", monospace', fontSize: '12px',
        color: '#ff9a7a', align: 'right', lineSpacing: 3, fontStyle: 'bold',
      })
      .setOrigin(1, 0).setDepth(11);
    this.updateAttackerUi();
  }

  updateAttackerUi() {
    if (!this.attackerText) return;
    const legend = AVD.units
      .map((u, i) => `[${i + 1}] ${u.label} ${u.cost}`)
      .join('   ');
    this.attackerText.setText(`ATTACKER  ·  MENACE ${Math.floor(this.menace)}/${AVD.maxMenace}\n${legend}`);
  }

  // Brief shot tracer from tower to target, fading out. (Kept as a simple
  // fallback; most shots now use bolt()/lightning() below.)
  fireTracer(x1, y1, x2, y2, color) {
    const g = this.add.graphics().setDepth(5);
    g.lineStyle(2, color, 0.95);
    g.lineBetween(x1, y1, x2, y2);
    this.tweens.add({ targets: g, alpha: 0, duration: 120, onComplete: () => g.destroy() });
  }

  // A glowing bolt (Sniper/Plasma): a soft halo line + a bright core, plus a
  // little tracer dot that streaks to the impact and sparks.
  bolt(x1, y1, x2, y2, color) {
    const g = this.add.graphics().setDepth(5);
    g.lineStyle(5, color, 0.3);
    g.lineBetween(x1, y1, x2, y2);
    g.lineStyle(1.5, 0xffffff, 0.95);
    g.lineBetween(x1, y1, x2, y2);
    this.tweens.add({ targets: g, alpha: 0, duration: 130, onComplete: () => g.destroy() });

    const dot = this.add.circle(x1, y1, 4, color).setDepth(6);
    this.tweens.add({
      targets: dot, x: x2, y: y2, duration: 80,
      onComplete: () => { dot.destroy(); this.impactSpark(x2, y2, color); },
    });
  }

  // Jagged lightning (Tesla): a zig-zag glow + bright core that flickers out.
  lightning(x1, y1, x2, y2, color) {
    const segs = 6;
    const pts = [{ x: x1, y: y1 }];
    for (let i = 1; i < segs; i++) {
      const t = i / segs;
      pts.push({
        x: x1 + (x2 - x1) * t + Phaser.Math.Between(-11, 11),
        y: y1 + (y2 - y1) * t + Phaser.Math.Between(-11, 11),
      });
    }
    pts.push({ x: x2, y: y2 });
    const g = this.add.graphics().setDepth(5);
    g.lineStyle(4, color, 0.35);
    g.strokePoints(pts);
    g.lineStyle(1.5, 0xffffff, 0.95);
    g.strokePoints(pts);
    this.tweens.add({ targets: g, alpha: 0, duration: 160, onComplete: () => g.destroy() });
  }

  // A bright pop at the muzzle when a barrel fires.
  muzzleFlash(x, y, color) {
    const f = this.add.circle(x, y, 7, 0xffffff, 0.95).setDepth(6);
    f.setStrokeStyle(2, color, 0.9);
    this.tweens.add({ targets: f, scale: { from: 1, to: 0.2 }, alpha: 0, duration: 110, onComplete: () => f.destroy() });
  }

  // Tiny shard burst where a shot lands.
  impactSpark(x, y, color) {
    for (let i = 0; i < 4; i++) {
      const a = Math.random() * Math.PI * 2;
      const p = this.add.circle(x, y, 2, color).setDepth(5);
      this.tweens.add({
        targets: p, x: x + Math.cos(a) * 10, y: y + Math.sin(a) * 10,
        alpha: 0, duration: 180, onComplete: () => p.destroy(),
      });
    }
  }

  // Ripple when a tower is placed.
  placeFx(x, y) {
    const ring = this.add.circle(x, y, 8).setStrokeStyle(3, 0x8fdcff, 0.9).setDepth(6);
    this.tweens.add({ targets: ring, scale: { from: 0.4, to: 2.2 }, alpha: 0, duration: 300, onComplete: () => ring.destroy() });
  }

  // Red pulse over the field + a flare at the generator when the shield is hit.
  baseHitFx() {
    const flash = this.add
      .rectangle(GRID_X, GRID_Y, GRID_W, GRID_H, 0xff3b3b, 0.16)
      .setOrigin(0).setDepth(5);
    this.tweens.add({ targets: flash, alpha: 0, duration: 280, onComplete: () => flash.destroy() });
    const { x, y } = cellCenter(this.level.base.col, this.level.base.row);
    const flare = this.add.circle(x, y, TILE * 0.5, 0xff7a7a, 0.55).setDepth(5);
    this.tweens.add({ targets: flare, scale: { from: 0.8, to: 1.6 }, alpha: 0, duration: 320, onComplete: () => flare.destroy() });
  }

  // Plasma splash: an expanding filled blast plus a bright shock ring.
  explosion(x, y, radius, color) {
    const c = this.add.circle(x, y, radius, color, 0.45).setDepth(5);
    this.tweens.add({ targets: c, scale: { from: 0.4, to: 1.15 }, alpha: 0, duration: 240, onComplete: () => c.destroy() });
    const ring = this.add.circle(x, y, radius).setStrokeStyle(3, 0xffffff, 0.9).setDepth(6);
    this.tweens.add({ targets: ring, scale: { from: 0.3, to: 1.3 }, alpha: 0, duration: 300, onComplete: () => ring.destroy() });
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
    this.baseHitFx();
    this.updateHud();
    if (this.baseHp <= 0) this.endGame(false);
  }

  onEnemyKilled(enemy) {
    this.kills += 1;
    this.credits += enemy.stats.reward || 0;
    this.enemyDeathFx(enemy.x, enemy.y, enemy.stats.color);
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

    // Right-click or Escape cancels tool placement and clears any selection.
    this.input.mouse?.disableContextMenu();
    this.input.on('pointerdown', (pointer) => {
      if (pointer.rightButtonDown()) { this.selectTool(null); this.deselectTower(); }
    });
    this.input.keyboard?.on('keydown-ESC', () => { this.selectTool(null); this.deselectTower(); });
    // U upgrades the selected tower; S sells it.
    this.input.keyboard?.on('keydown-U', () => this.upgradeSelected());
    this.input.keyboard?.on('keydown-S', () => this.sellSelected());

    this.createUpgradeUi();
  }

  // ---- tower selection + upgrades ----------------------------------------

  createUpgradeUi() {
    this.selectedTower = null;

    // Highlight ring + range circle drawn on the selected tower.
    this.selectRing = this.add.circle(0, 0, TILE * 0.6).setStrokeStyle(3, 0xffd23f, 0.9).setDepth(6).setVisible(false);
    this.selectRange = this.add
      .circle(0, 0, 10, 0xffd23f, 0.05)
      .setStrokeStyle(1, 0xffd23f, 0.4)
      .setDepth(5)
      .setVisible(false);

    // Floating info / upgrade / sell panel (top-left of the field).
    const px = GRID_X + 12, py = GRID_Y + 12, pw = 252, ph = 140;
    this.upPanel = this.add.container(px, py).setDepth(13).setVisible(false);
    const bg = this.add.rectangle(0, 0, pw, ph, 0x0d1a2b, 0.95).setOrigin(0).setStrokeStyle(2, 0x8fdcff, 0.6);
    this.upTitle = this.add.text(12, 8, '', { fontFamily: 'system-ui, sans-serif', fontSize: '15px', color: '#dfe9f5', fontStyle: 'bold' });
    this.upStats = this.add.text(12, 32, '', { fontFamily: 'system-ui, sans-serif', fontSize: '12px', color: '#9fc0ff', lineSpacing: 3 });

    this.upBtnBg = this.add.rectangle(12, ph - 64, pw - 24, 26, COLORS.ghostOk).setOrigin(0).setInteractive({ useHandCursor: true });
    this.upBtnText = this.add.text(pw / 2, ph - 51, '', { fontFamily: 'system-ui, sans-serif', fontSize: '13px', color: '#08240f', fontStyle: 'bold' }).setOrigin(0.5);
    this.upBtnBg.on('pointerdown', () => this.upgradeSelected());

    this.sellBtnBg = this.add.rectangle(12, ph - 32, pw - 24, 26, 0xc7873b).setOrigin(0).setInteractive({ useHandCursor: true });
    this.sellBtnText = this.add.text(pw / 2, ph - 19, '', { fontFamily: 'system-ui, sans-serif', fontSize: '13px', color: '#2a1705', fontStyle: 'bold' }).setOrigin(0.5);
    this.sellBtnBg.on('pointerdown', () => this.sellSelected());

    this.upPanel.add([bg, this.upTitle, this.upStats, this.upBtnBg, this.upBtnText, this.sellBtnBg, this.sellBtnText]);
  }

  selectTower(tower) {
    this.selectedTower = tower;
    this.selectRing.setPosition(tower.x, tower.y).setVisible(true);
    if (tower.range) {
      this.selectRange.setPosition(tower.x, tower.y).setRadius(tower.range).setVisible(true);
    } else {
      this.selectRange.setVisible(false);
    }
    this.refreshUpgradePanel();
    this.upPanel.setVisible(true);
  }

  deselectTower() {
    this.selectedTower = null;
    if (this.selectRing) this.selectRing.setVisible(false);
    if (this.selectRange) this.selectRange.setVisible(false);
    if (this.upPanel) this.upPanel.setVisible(false);
  }

  refreshUpgradePanel() {
    const t = this.selectedTower;
    if (!t) return;
    this.upTitle.setText(`${t.stats.name}   Lv ${t.level}/${t.maxLevel}`);

    let stats;
    if (t.stats.kind === 'slow') {
      stats = `Slow ${Math.round((1 - t.slowFactor) * 100)}%\nDamage/sec ${t.damagePerSec}\nRange ${t.range}`;
    } else if (t.stats.kind === 'trap') {
      stats = `Damage ${t.damage}\nFreeze ${(t.immobilizeMs / 1000).toFixed(1)}s`;
    } else {
      stats = `Damage ${t.damage}\nRange ${t.range}   Rate ${(t.fireRateMs / 1000).toFixed(1)}s`;
      if (t.chainCount) stats += `\nChains ${t.chainCount}`;
    }
    this.upStats.setText(stats);

    if (!t.canUpgrade()) {
      this.upBtnText.setText('MAX LEVEL');
      this.upBtnBg.setFillStyle(0x3a4d63);
    } else {
      const cost = t.upgradeCost();
      const afford = this.credits >= cost;
      this.upBtnText.setText(`Upgrade: ${cost}  [U]`);
      this.upBtnBg.setFillStyle(afford ? COLORS.ghostOk : 0x7a4a4a);
    }

    const refund = Math.round((t.spent || t.stats.cost) * SELL_REFUND);
    this.sellBtnText.setText(`Sell: +${refund}  [S]`);
  }

  upgradeSelected() {
    const t = this.selectedTower;
    if (!t || !t.canUpgrade()) return;
    const cost = t.upgradeCost();
    if (this.credits < cost) return;
    this.credits -= cost;
    t.spent = (t.spent || t.stats.cost) + cost; // counts toward sell refund
    t.upgrade();
    this.placeFx(t.x, t.y);
    if (t.range) this.selectRange.setRadius(t.range);
    this.updateHud();
    this.refreshUpgradePanel();
  }

  sellSelected() {
    if (this.selectedTower) this.sellTower(this.selectedTower);
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
    const { col, row } = pixelToCell(pointer.worldX, pointer.worldY);

    // Placement mode: drop the selected tower.
    if (this.selectedTool) {
      if (this.canPlace(col, row, this.selectedTool)) {
        this.placeTower(col, row, this.selectedTool);
        this.onGridHover(pointer); // refresh ghost (cell is now occupied)
      }
      return;
    }

    // Otherwise: click a placed tower to select it for upgrading.
    const tower = this.towerAt(col, row);
    if (tower) this.selectTower(tower);
    else this.deselectTower();
  }

  towerAt(col, row) {
    return this.towers.find((t) => t.col === col && t.row === row) || null;
  }

  // ---- UI ----------------------------------------------------------------

  createUi() {
    // Top bar (HUD + controls) and bottom bar (tower palette).
    this.add.rectangle(0, 0, GAME_WIDTH, TOP_BAR_H, COLORS.uiPanel, 0.95).setOrigin(0).setDepth(8);
    const bottomY = GRID_Y + GRID_H;
    this.add
      .rectangle(0, bottomY, GAME_WIDTH, BOTTOM_BAR_H, COLORS.uiPanel, 0.95)
      .setOrigin(0)
      .setDepth(8);

    // Glowing cyan accent lines along the inner edges of the HUD bars.
    const accent = this.add.graphics().setDepth(9);
    accent.fillStyle(0x6fd0ff, 0.85);
    accent.fillRect(0, TOP_BAR_H - 2, GAME_WIDTH, 2);
    accent.fillRect(0, bottomY, GAME_WIDTH, 2);
    accent.fillStyle(0x6fd0ff, 0.25);
    accent.fillRect(0, TOP_BAR_H, GAME_WIDTH, 4);
    accent.fillRect(0, bottomY - 4, GAME_WIDTH, 4);

    this.hudText = this.add
      .text(14, 16, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '15px',
        color: '#dff4ff',
        fontStyle: 'bold',
      })
      .setDepth(10);
    this.hudText.setShadow(0, 0, '#3fd0ff', 8, false, true);

    // Control buttons: mode, speed, auto-start, rush-the-next-wave (top-right).
    this.modeBtn = this.makeButton(430, 8, 150, 32, '', COLORS.uiButton, '#dfe9f5', () =>
      this.toggleMode()
    );
    this.speedBtn = this.makeButton(588, 8, 72, 32, '', COLORS.uiButton, '#dfe9f5', () =>
      this.cycleSpeed()
    );
    this.autoBtn = this.makeButton(668, 8, 104, 32, '', COLORS.uiButton, '#dfe9f5', () =>
      this.toggleAutoStart()
    );
    this.nextWaveBtn = this.makeButton(780, 8, 168, 32, '', COLORS.ghostOk, '#08240f', () =>
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
    this.updateModeBtn();
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
    if (stats) this.deselectTower(); // can't place and inspect at once
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

  // Campaign = the 20 hand-built waves with a Victory at the end.
  // Endless = waves never stop and there's no win, only how far you get.
  toggleMode() {
    this.endless = !this.endless;
    this.updateModeBtn();
    this.refreshWaveUi();
  }

  updateModeBtn() {
    this.modeBtn.label.setText(`Mode: ${this.endless ? 'Endless' : 'Campaign'}`);
    this.modeBtn.bg.setFillStyle(this.endless ? COLORS.uiButtonOn : COLORS.uiButton);
  }

  updateHud() {
    let label;
    if (this.mode === 'avd') {
      const s = Math.max(0, Math.ceil((this.surviveLeft || 0) / 1000));
      label = `Defend  ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    } else if (this.mode === 'duel') {
      label = `Player ${this.duelPlayer}  ·  Wave ${this.currentWave}`;
    } else {
      label = this.endless
        ? `Wave ${this.currentWave} (Endless)`
        : `Wave ${this.currentWave}/${WAVES.length}`;
    }
    this.hudText.setText(`${label}     Credits ${this.credits}     Shield ${this.baseHp}`);
    this.refreshToolButtons();
    // Keep the upgrade panel's affordability current as credits change.
    if (this.selectedTower) this.refreshUpgradePanel();
  }

  // Update each palette button with its live price + count/cap, and dim it when
  // unaffordable or maxed out.
  refreshToolButtons() {
    if (!this.toolButtons) return;
    for (const btn of this.toolButtons) {
      const count = this.countOf(btn.stats.key);
      const maxed = count >= btn.stats.max;
      const cost = this.costToBuild(btn.stats);
      const line2 = maxed ? `MAX  ${count}/${btn.stats.max}` : `${cost}c   ${count}/${btn.stats.max}`;
      btn.label.setText(`${btn.stats.name}\n${line2}`);
      const usable = !maxed && cost <= this.credits;
      btn.bg.setAlpha(usable ? 1 : 0.4);
      btn.label.setAlpha(usable ? 1 : 0.55);
    }
  }

  // The Next-Wave button stays available while any waves remain to launch (even
  // mid-wave, so you can rush the next one in); it hides once all are sent.
  refreshWaveUi() {
    this.updateHud();

    // Only Solo uses the manual Next-Wave button; 2P modes hide it.
    if (this.mode !== 'solo') {
      this.nextWaveBtn.bg.setVisible(false);
      this.nextWaveBtn.label.setVisible(false);
      return;
    }
    // In Endless mode there's always a next wave to launch.
    const canLaunch =
      !this.allWavesCleared && (this.endless || this.currentWave < WAVES.length);
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
    // A glowing energy lane: wide soft halo, brighter mid, bright core.
    const pts = this.path.map((p) => cellCenter(p.col, p.row));
    g.lineStyle(9, 0x2bd4d9, 0.12); g.strokePoints(pts);
    g.lineStyle(4, 0x49e6ea, 0.32); g.strokePoints(pts);
    g.lineStyle(1.5, 0xbafcff, 0.6); g.strokePoints(pts);
  }

  drawSnowfield() {
    const g = this.add.graphics().setDepth(0);

    // Dark holographic battle-map ground with a vertical gradient.
    g.fillGradientStyle(0x0a1828, 0x0a1828, 0x123049, 0x163a52, 1);
    g.fillRect(GRID_X, GRID_Y, GRID_W, GRID_H);

    // Soft command-console glow in the center.
    g.fillStyle(0x2f88b8, 0.1);
    g.fillEllipse(GRID_X + GRID_W / 2, GRID_Y + GRID_H / 2, GRID_W * 0.72, GRID_H * 0.85);

    // Faint checker tint for subtle surface texture.
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        if ((col + row) % 2 === 0) {
          g.fillStyle(0x9fd6ff, 0.035);
          g.fillRect(GRID_X + col * TILE, GRID_Y + row * TILE, TILE, TILE);
        }
      }
    }

    // Cool terrain detail: frozen sheets (cyan-rimmed), ice glints, sparkles,
    // glowing cracks. Purely cosmetic; drawn once, under everything else.
    const rand = (a, b) => Phaser.Math.Between(a, b);
    for (let i = 0; i < 12; i++) {
      const x = rand(GRID_X + 60, GRID_X + GRID_W - 60);
      const y = rand(GRID_Y + 60, GRID_Y + GRID_H - 60);
      const rw = rand(34, 72);
      g.fillStyle(0x14384f, 0.5); g.fillEllipse(x, y, rw, rw * 0.7);
      g.lineStyle(1, 0x4fb6d6, 0.22); g.strokeEllipse(x, y, rw, rw * 0.7);
      g.fillStyle(0x8fdcff, 0.16); g.fillEllipse(x - rw * 0.15, y - rw * 0.18, rw * 0.34, rw * 0.18);
    }
    for (let i = 0; i < 26; i++) {
      const x = rand(GRID_X + 20, GRID_X + GRID_W - 20);
      const y = rand(GRID_Y + 20, GRID_Y + GRID_H - 20);
      const s = rand(2, 5);
      g.fillStyle(0x8fdcff, 0.55);
      g.fillPoints([{ x, y: y - s }, { x: x + s * 0.6, y }, { x, y: y + s }, { x: x - s * 0.6, y }], true);
    }
    for (let i = 0; i < 55; i++) {
      const x = rand(GRID_X + 10, GRID_X + GRID_W - 10);
      const y = rand(GRID_Y + 10, GRID_Y + GRID_H - 10);
      g.fillStyle(0xcfeeff, Phaser.Math.FloatBetween(0.12, 0.5));
      g.fillCircle(x, y, Phaser.Math.FloatBetween(0.6, 1.6));
    }
    for (let i = 0; i < 16; i++) {
      const x = rand(GRID_X + 30, GRID_X + GRID_W - 30);
      const y = rand(GRID_Y + 30, GRID_Y + GRID_H - 30);
      g.lineStyle(1, 0x5fbfe0, 0.22);
      g.lineBetween(x, y, x + rand(-24, 24), y + rand(-16, 16));
    }
  }

  // A chunky containment frame around the battlefield: a dark metal border with
  // a top bevel, a glowing inner energy edge, corner brackets and rivets.
  drawBorder() {
    const x = GRID_X, y = GRID_Y, w = GRID_W, h = GRID_H, t = 8;
    const g = this.add.graphics().setDepth(6);

    // Dark metal frame (four bands).
    g.fillStyle(0x16202e, 1);
    g.fillRect(x, y, w, t);
    g.fillRect(x, y + h - t, w, t);
    g.fillRect(x, y, t, h);
    g.fillRect(x + w - t, y, t, h);

    // Top/left bevel highlight.
    g.fillStyle(0x32465e, 1);
    g.fillRect(x, y, w, 3);
    g.fillRect(x, y, 3, h);

    // Glowing inner energy edge.
    g.lineStyle(2, 0x8fdcff, 0.7);
    g.strokeRect(x + t, y + t, w - 2 * t, h - 2 * t);

    // Corner brackets.
    g.lineStyle(3, 0x8fdcff, 0.95);
    const b = 24, i = t + 4;
    const corner = (cx, cy, sx, sy) => {
      g.lineBetween(cx, cy, cx + b * sx, cy);
      g.lineBetween(cx, cy, cx, cy + b * sy);
    };
    corner(x + i, y + i, 1, 1);
    corner(x + w - i, y + i, -1, 1);
    corner(x + i, y + h - i, 1, -1);
    corner(x + w - i, y + h - i, -1, -1);

    // Rivets along the top and bottom bands.
    g.fillStyle(0x46607d, 1);
    for (let rx = x + 24; rx < x + w - 10; rx += 60) {
      g.fillCircle(rx, y + t / 2, 2);
      g.fillCircle(rx, y + h - t / 2, 2);
    }
  }

  // Soft inner shadow around the field edges for depth.
  createVignette() {
    const fog = this.add.graphics().setDepth(1);
    for (let i = 0; i < 10; i++) {
      fog.lineStyle(2, 0x0b1320, 0.04);
      fog.strokeRect(GRID_X + i * 2, GRID_Y + i * 2, GRID_W - i * 4, GRID_H - i * 4);
    }
  }

  // Gentle ambient snowfall drifting across the field.
  createAmbience() {
    if (!this.textures.exists('snowflake')) {
      const gg = this.make.graphics({ x: 0, y: 0, add: false });
      gg.fillStyle(0xffffff, 1);
      gg.fillCircle(4, 4, 3);
      gg.generateTexture('snowflake', 8, 8);
      gg.destroy();
    }
    this.add
      .particles(0, 0, 'snowflake', {
        x: { min: GRID_X, max: GRID_X + GRID_W },
        y: { min: GRID_Y, max: GRID_Y + GRID_H },
        lifespan: 5200,
        speedY: { min: 14, max: 42 },
        speedX: { min: -14, max: 14 },
        scale: { min: 0.25, max: 0.85 },
        alpha: { start: 0.7, end: 0 },
        frequency: 110,
        quantity: 2,
      })
      .setDepth(7);

    // Drifting aurora wisps echoing the title screen.
    const auroras = [
      { c: 0x1f6f8f, x: GRID_X + GRID_W * 0.28, y: GRID_Y + GRID_H * 0.25 },
      { c: 0x2f9e7f, x: GRID_X + GRID_W * 0.74, y: GRID_Y + GRID_H * 0.78 },
    ];
    auroras.forEach((a, i) => {
      const e = this.add.ellipse(a.x, a.y, 420, 180, a.c, 0.08).setDepth(0);
      this.tweens.add({
        targets: e, x: a.x + (i % 2 ? 40 : -40),
        alpha: { from: 0.05, to: 0.13 }, duration: 5000 + i * 1100, yoyo: true, repeat: -1,
      });
    });

    // A cyan scan-line sweeping down the battlefield.
    const sweep = this.add
      .rectangle(GRID_X, GRID_Y, GRID_W, 2, 0x8fdcff, 0.18)
      .setOrigin(0, 0).setDepth(7).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: sweep, y: GRID_Y + GRID_H, duration: 5600, repeat: -1 });
  }

  // A little burst when an enemy dies.
  enemyDeathFx(x, y, color) {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const shard = this.add.circle(x, y, 3, color).setDepth(5);
      this.tweens.add({
        targets: shard,
        x: x + Math.cos(a) * 18,
        y: y + Math.sin(a) * 18,
        alpha: 0,
        scale: 0.2,
        duration: 280,
        onComplete: () => shard.destroy(),
      });
    }
  }

  drawGridLines() {
    const g = this.add.graphics().setDepth(0);

    // Minor glowing grid.
    g.lineStyle(1, 0x3f7ea0, 0.22);
    for (let col = 0; col <= COLS; col++) {
      g.lineBetween(GRID_X + col * TILE, GRID_Y, GRID_X + col * TILE, GRID_Y + GRID_H);
    }
    for (let row = 0; row <= ROWS; row++) {
      g.lineBetween(GRID_X, GRID_Y + row * TILE, GRID_X + GRID_W, GRID_Y + row * TILE);
    }

    // Brighter major grid every 4 cells.
    g.lineStyle(1, 0x6fd0ff, 0.3);
    for (let col = 0; col <= COLS; col += 4) {
      g.lineBetween(GRID_X + col * TILE, GRID_Y, GRID_X + col * TILE, GRID_Y + GRID_H);
    }
    for (let row = 0; row <= ROWS; row += 4) {
      g.lineBetween(GRID_X, GRID_Y + row * TILE, GRID_X + GRID_W, GRID_Y + row * TILE);
    }

    // Glowing nodes at major intersections.
    g.fillStyle(0x8fdcff, 0.3);
    for (let col = 0; col <= COLS; col += 4) {
      for (let row = 0; row <= ROWS; row += 4) {
        g.fillCircle(GRID_X + col * TILE, GRID_Y + row * TILE, 1.7);
      }
    }
  }

  drawSpawn() {
    const { col, row } = this.level.spawn;
    const { x, y } = cellCenter(col, row);

    // Dark rift the enemies pour out of.
    this.add.circle(x, y, TILE * 0.5, 0x2a0d0a, 0.55).setDepth(1);

    // Swirling arcs that rotate.
    const swirl = this.add.graphics({ x, y }).setDepth(2);
    swirl.lineStyle(3, COLORS.spawn, 0.9);
    for (let i = 0; i < 3; i++) {
      const a0 = (i / 3) * Math.PI * 2;
      swirl.beginPath();
      swirl.arc(0, 0, TILE * 0.34, a0, a0 + Math.PI * 0.7);
      swirl.strokePath();
    }
    this.tweens.add({ targets: swirl, rotation: Math.PI * 2, duration: 2600, repeat: -1 });

    // Pulsing hot core.
    const glow = this.add.circle(x, y, TILE * 0.2, COLORS.spawn, 0.8).setDepth(2);
    this.tweens.add({
      targets: glow,
      scale: { from: 0.7, to: 1.35 },
      alpha: { from: 0.8, to: 0.25 },
      duration: 1100, yoyo: true, repeat: -1,
    });

    this.add
      .text(x, y - TILE * 0.78, 'ENTRY', {
        fontFamily: 'system-ui, sans-serif', fontSize: '12px',
        color: '#7a1f15', fontStyle: 'bold',
      })
      .setOrigin(0.5).setDepth(5);
  }

  drawBase() {
    const { col, row } = this.level.base;
    const { x, y } = cellCenter(col, row);

    // Breathing shield dome.
    const dome = this.add.circle(x, y, TILE * 0.6, COLORS.base, 0.16).setDepth(2);
    this.tweens.add({
      targets: dome,
      scale: { from: 0.9, to: 1.14 },
      alpha: { from: 0.12, to: 0.3 },
      duration: 1500, yoyo: true, repeat: -1,
    });

    // Rotating generator ring with spokes.
    const ring = this.add.graphics({ x, y }).setDepth(3);
    ring.lineStyle(3, COLORS.baseRing, 0.95);
    ring.strokeCircle(0, 0, TILE * 0.42);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      ring.lineBetween(Math.cos(a) * TILE * 0.3, Math.sin(a) * TILE * 0.3, Math.cos(a) * TILE * 0.42, Math.sin(a) * TILE * 0.42);
    }
    this.tweens.add({ targets: ring, rotation: Math.PI * 2, duration: 7000, repeat: -1 });

    // Pulsing core with a bright center.
    const core = this.add.circle(x, y, TILE * 0.24, COLORS.base).setDepth(4);
    this.tweens.add({ targets: core, scale: { from: 0.85, to: 1.12 }, duration: 950, yoyo: true, repeat: -1 });
    this.add.circle(x, y, TILE * 0.1, 0xffffff, 0.9).setDepth(5);

    this.add
      .text(x, y - TILE * 0.85, 'SHIELD', {
        fontFamily: 'system-ui, sans-serif', fontSize: '12px',
        color: '#0c5a60', fontStyle: 'bold',
      })
      .setOrigin(0.5).setDepth(5);
  }
}
