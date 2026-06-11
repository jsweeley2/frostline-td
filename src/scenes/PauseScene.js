import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';
import { sfx } from '../audio.js';

// ---------------------------------------------------------------------------
// PauseScene — overlay shown when the player pauses (P or the pause button).
// Resume / How to Play / Sound toggle / Main Menu. Launched over a paused
// GameScene.
// ---------------------------------------------------------------------------

export default class PauseScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PauseScene', active: false });
  }

  create() {
    const W = GAME_WIDTH, H = GAME_HEIGHT, cx = W / 2, cy = H / 2;
    this.add.rectangle(0, 0, W, H, 0x05070d, 0.8).setOrigin(0);
    const pw = 420, ph = 340;
    this.add.rectangle(cx, cy, pw, ph, 0x0a1828, 0.97).setStrokeStyle(2, 0x6fd0ff, 0.9);

    const title = this.add
      .text(cx, cy - 116, 'PAUSED', {
        fontFamily: '"Arial Black", system-ui, sans-serif', fontSize: '46px',
        color: '#dff4ff', fontStyle: 'bold',
      })
      .setOrigin(0.5);
    title.setShadow(0, 0, '#3fd0ff', 20, false, true);

    this.btn(cx, cy - 44, 'RESUME', 0x39c06a, '#04140a', () => this.resume());
    this.btn(cx, cy + 16, 'HOW TO PLAY', 0x6fd0ff, '#04161f', () => this.scene.launch('HowToScene', {}));
    this.soundBtn = this.btn(cx, cy + 76, '', 0x6fd0ff, '#04161f', () => {
      sfx.toggle(); this.updateSound();
    });
    this.updateSound();
    this.btn(cx, cy + 136, 'MAIN MENU', 0xe05a47, '#160604', () => {
      this.scene.stop('GameScene');
      this.scene.start('ModeSelectScene');
      this.scene.stop();
    });

    this.input.keyboard?.on('keydown-ESC', () => this.resume());
    this.input.keyboard?.on('keydown-P', () => this.resume());
  }

  updateSound() {
    this.soundBtn.txt.setText(`SOUND: ${sfx.muted ? 'OFF' : 'ON'}`);
  }

  btn(x, y, label, accent, textColor, onClick) {
    const w = 250, h = 46;
    const bg = this.add
      .rectangle(x, y, w, h, accent, 0.92).setStrokeStyle(2, 0xffffff, 0.25)
      .setInteractive({ useHandCursor: true });
    const txt = this.add
      .text(x, y, label, { fontFamily: 'system-ui, sans-serif', fontSize: '19px', color: textColor, fontStyle: 'bold' })
      .setOrigin(0.5);
    bg.on('pointerover', () => bg.setScale(1.04));
    bg.on('pointerout', () => bg.setScale(1));
    bg.on('pointerdown', () => { sfx.click(); onClick(); });
    return { bg, txt };
  }

  resume() {
    this.scene.stop();
    this.scene.resume('GameScene');
  }
}
