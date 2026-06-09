import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../config.js';
import { WAVES } from '../maps/waves.js';

// ---------------------------------------------------------------------------
// EndScene — the win/lose overlay. Launched on top of a paused GameScene with
// { win, wave, kills }. Shows the outcome, a quick recap, and a Play Again
// button that restarts a fresh game.
// ---------------------------------------------------------------------------

export default class EndScene extends Phaser.Scene {
  constructor() {
    // active:false so it does NOT auto-start with the game; we launch it on demand.
    super({ key: 'EndScene', active: false });
  }

  init(data) {
    this.result = data || { win: false, wave: 0, kills: 0, endless: false };
  }

  create() {
    const { win, wave, kills, endless } = this.result;
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    // Dim the frozen game behind us.
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x05070d, 0.72).setOrigin(0);

    // Panel.
    this.add
      .rectangle(cx, cy, 460, 280, COLORS.uiPanel, 0.98)
      .setStrokeStyle(3, win ? COLORS.ghostOk : COLORS.spawn);

    this.add
      .text(cx, cy - 96, win ? 'VICTORY' : 'GAME OVER', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '46px',
        color: win ? '#39c06a' : '#e05a47',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    let subtitle;
    if (win) subtitle = `You held the shield through all ${WAVES.length} waves.`;
    else if (endless) subtitle = `Endless mode: you reached wave ${wave}.`;
    else subtitle = `The shield generator fell on wave ${wave} of ${WAVES.length}.`;

    this.add
      .text(cx, cy - 44, subtitle, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '16px',
        color: '#dfe9f5',
        align: 'center',
        wordWrap: { width: 420 },
      })
      .setOrigin(0.5);

    const recap = endless
      ? `Waves survived: ${wave}      Kills: ${kills}`
      : `Waves reached: ${wave} / ${WAVES.length}      Kills: ${kills}`;
    this.add
      .text(cx, cy + 6, recap, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '15px',
        color: '#9fc0ff',
      })
      .setOrigin(0.5);

    // Play Again button.
    const bw = 200;
    const bh = 48;
    const btn = this.add
      .rectangle(cx, cy + 78, bw, bh, COLORS.ghostOk)
      .setStrokeStyle(2, 0x2a8a4d)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(cx, cy + 78, 'Play Again', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '20px',
        color: '#08240f',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    btn.on('pointerover', () => btn.setFillStyle(0x4cd17e));
    btn.on('pointerout', () => btn.setFillStyle(COLORS.ghostOk));
    btn.on('pointerdown', () => this.playAgain());
    this.input.keyboard?.on('keydown-ENTER', () => this.playAgain());
  }

  playAgain() {
    this.scene.start('GameScene'); // shut down + recreate a fresh game
    this.scene.stop(); // close this overlay
  }
}
