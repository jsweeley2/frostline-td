import Phaser from 'phaser';
import { TILE, COLS, ROWS, GAME_WIDTH, GAME_HEIGHT, COLORS } from '../config.js';
import { cellCenter } from '../grid.js';
import { level1 } from '../maps/level1.js';

// ---------------------------------------------------------------------------
// GameScene — the playfield. Step 2 draws the static board: snowfield grid,
// the enemy entry point, and the shield generator. Enemies, towers, and the
// HUD get layered on in later steps.
// ---------------------------------------------------------------------------

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  create() {
    this.level = level1;

    this.drawSnowfield();
    this.drawGridLines();
    this.drawSpawn();
    this.drawBase();
  }

  // Checkerboard snowfield so individual tiles are readable.
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

  // Faint grid lines to make cell boundaries obvious when placing towers.
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

  // Enemy entry point: a warm-red marker on the left edge.
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

  // Shield generator (the base): a glowing cyan core inside a ring.
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
