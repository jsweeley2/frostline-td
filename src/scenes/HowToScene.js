import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';
import { sfx } from '../audio.js';

// ---------------------------------------------------------------------------
// HowToScene — a quick controls / tips panel. Opened from the mode select
// (with { back: 'ModeSelectScene' }) or as an overlay from the pause menu (no
// back key, so closing just reveals the pause menu underneath).
// ---------------------------------------------------------------------------

const LINES = [
  'GOAL  ·  Stop enemies from reaching your shield generator.',
  '',
  'BUILD  ·  Click a tower button, then click a cell to place it.',
  'UPGRADE / SELL  ·  Click a placed tower, then U to upgrade or S to sell.',
  'WAVES  ·  Press "Start Wave" (or turn on Auto-Start). Speed toggles 1x-3x.',
  'KILL SHOP  ·  Every 5 waves (solo), spend your kills on global upgrades.',
  '',
  'TOWERS  ·  Sniper (single), Tripwire (trap), Frost (slow), Plasma (splash), Tesla (chain).',
  'MAPS  ·  Maze maps let towers act as walls; fixed-path maps have a set lane.',
  '',
  '2-PLAYER  ·  Attacker vs Defender (attacker presses 1-5 to send units) and',
  'Score Duel (take turns; highest wave wins).',
  '',
  'KEYS  ·  P pause   ·   M sound on/off   ·   Esc cancel selection',
];

export default class HowToScene extends Phaser.Scene {
  constructor() {
    super({ key: 'HowToScene', active: false });
  }

  init(data) {
    this.back = (data && data.back) || null;
  }

  create() {
    const W = GAME_WIDTH, H = GAME_HEIGHT, cx = W / 2, cy = H / 2;
    this.add.rectangle(0, 0, W, H, 0x05070d, 0.88).setOrigin(0);
    const pw = 720, ph = 480;
    this.add.rectangle(cx, cy, pw, ph, 0x0a1828, 0.98).setStrokeStyle(2, 0x6fd0ff, 0.9);

    const title = this.add
      .text(cx, cy - ph / 2 + 40, 'HOW TO PLAY', {
        fontFamily: '"Arial Black", system-ui, sans-serif', fontSize: '40px',
        color: '#dff4ff', fontStyle: 'bold',
      })
      .setOrigin(0.5);
    title.setShadow(0, 0, '#3fd0ff', 20, false, true);

    this.add
      .text(cx, cy - ph / 2 + 86, LINES.join('\n'), {
        fontFamily: 'system-ui, sans-serif', fontSize: '15px', color: '#cfe6ff',
        align: 'left', lineSpacing: 5, wordWrap: { width: pw - 70 },
      })
      .setOrigin(0.5, 0);

    const by = cy + ph / 2 - 40;
    const bg = this.add
      .rectangle(cx, by, 200, 44, 0x39c06a, 0.95).setStrokeStyle(2, 0xffffff, 0.25)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(cx, by, this.back ? 'BACK' : 'CLOSE', {
        fontFamily: 'system-ui, sans-serif', fontSize: '19px', color: '#04140a', fontStyle: 'bold',
      })
      .setOrigin(0.5);
    bg.on('pointerover', () => bg.setScale(1.04));
    bg.on('pointerout', () => bg.setScale(1));
    bg.on('pointerdown', () => { sfx.click(); this.close(); });
    this.input.keyboard?.on('keydown-ESC', () => this.close());
  }

  close() {
    if (this.back) this.scene.start(this.back);
    else this.scene.stop(); // overlay (e.g., over the pause menu)
  }
}
