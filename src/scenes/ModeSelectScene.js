import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';

// ---------------------------------------------------------------------------
// ModeSelectScene — pick how to play. Reached from the title screen.
//   Solo Defense            — the normal 1-player game.
//   Attacker vs Defender    — 2P: one builds, one sends waves (keyboard).
//   Score Duel              — 2P: take turns surviving; highest wave wins.
// Styled to match the sci-fi title / end screens.
// ---------------------------------------------------------------------------

export default class ModeSelectScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ModeSelectScene', active: false });
  }

  create() {
    const W = GAME_WIDTH, H = GAME_HEIGHT;
    const cx = W / 2;
    this.cameras.main.setBackgroundColor('#05070d');

    // Starfield + scan lines backdrop.
    for (let i = 0; i < 70; i++) {
      this.add.circle(
        Phaser.Math.Between(0, W), Phaser.Math.Between(0, H),
        Phaser.Math.FloatBetween(0.5, 1.5), 0xffffff, Phaser.Math.FloatBetween(0.2, 0.8)
      );
    }
    const sl = this.add.graphics();
    sl.fillStyle(0x000000, 0.06);
    for (let y = 0; y < H; y += 4) sl.fillRect(0, y, W, 1);
    this.add.ellipse(cx, H * 0.42, 700, 460, 0x1f6f8f, 0.08).setBlendMode(Phaser.BlendModes.ADD);

    // Heading.
    const head = this.add
      .text(cx, H * 0.16, 'SELECT MODE', {
        fontFamily: '"Arial Black", system-ui, sans-serif', fontSize: '52px',
        color: '#dff4ff', fontStyle: 'bold',
      })
      .setOrigin(0.5);
    head.setShadow(0, 0, '#3fd0ff', 22, false, true);

    // Mode cards.
    this.card(cx, H * 0.36, 'SOLO DEFENSE', 'Hold the line alone across 20 waves (or Endless).',
      0x6fd0ff, () => this.start({ mode: 'solo' }));
    this.card(cx, H * 0.53, 'ATTACKER vs DEFENDER', '2 players: one builds towers, one sends the waves (keys 1-5).',
      0xe05a47, () => this.start({ mode: 'avd' }));
    this.card(cx, H * 0.70, 'SCORE DUEL  (2P)', 'Take turns surviving Endless. Highest wave reached wins.',
      0x39c06a, () => this.startDuel());

    this.add
      .text(cx, H * 0.88, 'ESC  ·  back to title', {
        fontFamily: 'system-ui, sans-serif', fontSize: '13px', color: '#5f9fc0',
      })
      .setOrigin(0.5);
    this.input.keyboard?.on('keydown-ESC', () => this.scene.start('TitleScene'));

    // Corner brackets.
    const g = this.add.graphics();
    g.lineStyle(3, 0x6fd0ff, 0.8);
    const m = 18, b = 40;
    const corner = (x, y, sx, sy) => { g.lineBetween(x, y, x + b * sx, y); g.lineBetween(x, y, x, y + b * sy); };
    corner(m, m, 1, 1); corner(W - m, m, -1, 1); corner(m, H - m, 1, -1); corner(W - m, H - m, -1, -1);
  }

  card(x, y, label, desc, accent, onClick) {
    const w = 540, h = 78;
    const bg = this.add
      .rectangle(x, y, w, h, 0x0a1828, 0.95)
      .setStrokeStyle(2, accent, 0.9)
      .setInteractive({ useHandCursor: true });
    const title = this.add
      .text(x, y - 14, label, {
        fontFamily: 'system-ui, sans-serif', fontSize: '24px',
        color: '#dff4ff', fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.add
      .text(x, y + 18, desc, {
        fontFamily: 'system-ui, sans-serif', fontSize: '13px', color: '#9fc0ff',
      })
      .setOrigin(0.5);
    bg.on('pointerover', () => { bg.setFillStyle(0x12283f, 0.98); bg.setScale(1.02); });
    bg.on('pointerout', () => { bg.setFillStyle(0x0a1828, 0.95); bg.setScale(1); });
    bg.on('pointerdown', onClick);
    return { bg, title };
  }

  startDuel() {
    this.registry.set('duelP1', null);
    this.registry.set('duelP2', null);
    this.start({ mode: 'duel', player: 1 });
  }

  start(data) {
    this.cameras.main.fadeOut(260, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('GameScene', data));
  }
}
