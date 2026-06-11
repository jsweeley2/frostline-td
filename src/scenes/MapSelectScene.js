import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLS, ROWS } from '../config.js';
import { MAPS, MAP_ORDER } from '../maps/maps.js';

// ---------------------------------------------------------------------------
// MapSelectScene — pick a battlefield. Reached after choosing a mode; carries
// the mode data through and adds the chosen mapId before starting the game.
// Each map shows a mini preview (the fixed lane, or an open field for maze).
// ---------------------------------------------------------------------------

export default class MapSelectScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MapSelectScene', active: false });
  }

  init(data) {
    this.modeData = data || { mode: 'solo' };
  }

  create() {
    const W = GAME_WIDTH, H = GAME_HEIGHT, cx = W / 2;
    this.cameras.main.setBackgroundColor('#05070d');

    for (let i = 0; i < 70; i++) {
      this.add.circle(Phaser.Math.Between(0, W), Phaser.Math.Between(0, H),
        Phaser.Math.FloatBetween(0.5, 1.5), 0xffffff, Phaser.Math.FloatBetween(0.2, 0.8));
    }
    const sl = this.add.graphics();
    sl.fillStyle(0x000000, 0.06);
    for (let y = 0; y < H; y += 4) sl.fillRect(0, y, W, 1);

    const head = this.add
      .text(cx, H * 0.13, 'SELECT MAP', {
        fontFamily: '"Arial Black", system-ui, sans-serif', fontSize: '48px',
        color: '#dff4ff', fontStyle: 'bold',
      })
      .setOrigin(0.5);
    head.setShadow(0, 0, '#3fd0ff', 22, false, true);

    const ys = [H * 0.32, H * 0.52, H * 0.72];
    MAP_ORDER.forEach((id, i) => this.card(cx, ys[i], MAPS[id]));

    this.add
      .text(cx, H * 0.9, 'ESC  ·  back', {
        fontFamily: 'system-ui, sans-serif', fontSize: '13px', color: '#5f9fc0',
      })
      .setOrigin(0.5);
    this.input.keyboard?.on('keydown-ESC', () => this.scene.start('ModeSelectScene'));
  }

  card(cx, y, map) {
    const w = 580, h = 116;
    const x = cx - w / 2;
    const accent = map.type === 'fixed' ? 0xffb24d : 0x6fd0ff;
    const bg = this.add
      .rectangle(cx, y, w, h, 0x0a1828, 0.95)
      .setStrokeStyle(2, accent, 0.9)
      .setInteractive({ useHandCursor: true });
    this.add.text(x + 24, y - 34, map.name, {
      fontFamily: 'system-ui, sans-serif', fontSize: '23px', color: '#dff4ff', fontStyle: 'bold',
    }).setOrigin(0, 0.5);
    this.add.text(x + 24, y - 6, map.type === 'fixed' ? 'FIXED PATH' : 'FREEFORM MAZE', {
      fontFamily: '"Courier New", monospace', fontSize: '12px',
      color: map.type === 'fixed' ? '#ffb24d' : '#6fd0ff', fontStyle: 'bold',
    }).setOrigin(0, 0.5);
    this.add.text(x + 24, y + 24, map.desc, {
      fontFamily: 'system-ui, sans-serif', fontSize: '13px', color: '#9fc0ff',
      wordWrap: { width: w - 230 },
    }).setOrigin(0, 0.5);

    this.preview(x + w - 150, y - 38, 130, 76, map);

    bg.on('pointerover', () => { bg.setFillStyle(0x12283f, 0.98); bg.setScale(1.01); });
    bg.on('pointerout', () => { bg.setFillStyle(0x0a1828, 0.95); bg.setScale(1); });
    bg.on('pointerdown', () => this.choose(map.id));
  }

  // A small schematic of the map: lane for fixed, dashed straight line for maze.
  preview(px, py, pw, ph, map) {
    this.add.rectangle(px, py, pw, ph, 0x081320, 1).setOrigin(0).setStrokeStyle(1, 0x2a4a66, 0.8);
    const g = this.add.graphics();
    const sx = pw / COLS, sy = ph / ROWS;
    const P = (c, r) => ({ x: px + (c + 0.5) * sx, y: py + (r + 0.5) * sy });

    if (map.type === 'fixed') {
      const pts = map.waypoints.map((wp) => P(wp.col, wp.row));
      g.lineStyle(3, 0xffb24d, 0.9);
      g.strokePoints(pts);
    } else {
      const a = P(map.spawn.col, map.spawn.row), b = P(map.base.col, map.base.row);
      g.lineStyle(2, 0x6fd0ff, 0.5);
      for (let t = 0; t < 1; t += 0.12) {
        g.lineBetween(a.x + (b.x - a.x) * t, a.y, a.x + (b.x - a.x) * (t + 0.06), b.y);
      }
    }
    const s = P(map.spawn.col, map.spawn.row), e = P(map.base.col, map.base.row);
    g.fillStyle(0xe05a47, 1); g.fillCircle(s.x, s.y, 3.5);
    g.fillStyle(0x2bd4d9, 1); g.fillCircle(e.x, e.y, 3.5);
  }

  choose(mapId) {
    this.cameras.main.fadeOut(240, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () =>
      this.scene.start('GameScene', { ...this.modeData, mapId })
    );
  }
}
