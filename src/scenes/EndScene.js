import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';
import { WAVES } from '../maps/waves.js';

// ---------------------------------------------------------------------------
// EndScene — the win/lose overlay, styled to match the sci-fi title screen.
// Launched on top of a paused GameScene with { win, wave, kills, endless }.
// Shows the outcome, a recap, and Play Again / Main Menu buttons.
// ---------------------------------------------------------------------------

export default class EndScene extends Phaser.Scene {
  constructor() {
    super({ key: 'EndScene', active: false });
  }

  init(data) {
    this.result = data || { win: false, wave: 0, kills: 0, endless: false };
  }

  create() {
    const { win, wave, kills, endless } = this.result;
    const W = GAME_WIDTH, H = GAME_HEIGHT;
    const cx = W / 2, cy = H / 2;
    const accent = win ? 0x39c06a : 0xe05a47;
    const accentHex = win ? '#39c06a' : '#ff7a5e';

    // Dim the frozen battlefield + a colored glow behind the panel.
    this.add.rectangle(0, 0, W, H, 0x05070d, 0.8).setOrigin(0);
    this.add.ellipse(cx, cy, 620, 460, accent, 0.09).setBlendMode(Phaser.BlendModes.ADD);

    // Starfield + scan lines for the sci-fi feel.
    for (let i = 0; i < 50; i++) {
      this.add.circle(
        Phaser.Math.Between(0, W), Phaser.Math.Between(0, H),
        Phaser.Math.FloatBetween(0.5, 1.5), 0xffffff, Phaser.Math.FloatBetween(0.2, 0.7)
      );
    }
    const sl = this.add.graphics();
    sl.fillStyle(0x000000, 0.06);
    for (let y = 0; y < H; y += 4) sl.fillRect(0, y, W, 1);

    // Panel.
    const pw = 500, ph = 340;
    this.add.rectangle(cx, cy, pw, ph, 0x0a1828, 0.97).setStrokeStyle(2, accent, 0.9);
    this.panelBrackets(cx, cy, pw, ph, accent);

    // Title.
    const title = this.add
      .text(cx, cy - 118, win ? 'VICTORY' : 'GAME OVER', {
        fontFamily: '"Arial Black", system-ui, sans-serif', fontSize: '56px',
        color: accentHex, fontStyle: 'bold',
      })
      .setOrigin(0.5);
    title.setShadow(0, 0, accentHex, 22, false, true);
    title.setScale(0.85);
    this.tweens.add({ targets: title, scale: 1, duration: 500, ease: 'Back.Out' });

    // Subtitle.
    let subtitle;
    if (win) subtitle = `You held the shield through all ${WAVES.length} waves.`;
    else if (endless) subtitle = `Endless mode: you reached wave ${wave}.`;
    else subtitle = `The shield generator fell on wave ${wave} of ${WAVES.length}.`;
    this.add
      .text(cx, cy - 64, subtitle, {
        fontFamily: 'system-ui, sans-serif', fontSize: '16px', color: '#cfe6ff',
        align: 'center', wordWrap: { width: pw - 60 },
      })
      .setOrigin(0.5);

    // Recap line (telemetry style).
    const recap = endless
      ? `WAVES SURVIVED: ${wave}        KILLS: ${kills}`
      : `WAVES REACHED: ${wave} / ${WAVES.length}        KILLS: ${kills}`;
    this.add
      .text(cx, cy - 24, recap, {
        fontFamily: '"Courier New", monospace', fontSize: '14px', color: '#6fd0ff', fontStyle: 'bold',
      })
      .setOrigin(0.5);

    // Buttons.
    this.makeButton(cx, cy + 36, 'PLAY AGAIN', accent, '#04140a', () => this.playAgain());
    this.makeButton(cx, cy + 100, 'MAIN MENU', 0x6fd0ff, '#04161f', () => this.mainMenu());

    this.input.keyboard?.on('keydown-ENTER', () => this.playAgain());
    this.input.keyboard?.on('keydown-ESC', () => this.mainMenu());
  }

  // Cyan corner brackets around the panel.
  panelBrackets(cx, cy, pw, ph, accent) {
    const g = this.add.graphics();
    g.lineStyle(2, accent, 0.9);
    const x = cx - pw / 2, y = cy - ph / 2, b = 22, m = 8;
    const corner = (px, py, sx, sy) => {
      g.lineBetween(px, py, px + b * sx, py);
      g.lineBetween(px, py, px, py + b * sy);
    };
    corner(x + m, y + m, 1, 1);
    corner(x + pw - m, y + m, -1, 1);
    corner(x + m, y + ph - m, 1, -1);
    corner(x + pw - m, y + ph - m, -1, -1);
  }

  makeButton(x, y, label, accent, textColor, onClick) {
    const w = 230, h = 48;
    const bg = this.add
      .rectangle(x, y, w, h, accent, 0.92)
      .setStrokeStyle(2, 0xffffff, 0.25)
      .setInteractive({ useHandCursor: true });
    const txt = this.add
      .text(x, y, label, {
        fontFamily: 'system-ui, sans-serif', fontSize: '20px', color: textColor, fontStyle: 'bold',
      })
      .setOrigin(0.5);
    bg.on('pointerover', () => { bg.setAlpha(1); bg.setScale(1.04); txt.setScale(1.04); });
    bg.on('pointerout', () => { bg.setAlpha(0.92); bg.setScale(1); txt.setScale(1); });
    bg.on('pointerdown', onClick);
    return { bg, txt };
  }

  playAgain() {
    this.scene.start('GameScene', { endless: this.result.endless }); // keep mode
    this.scene.stop();
  }

  mainMenu() {
    this.scene.stop('GameScene');
    this.scene.start('TitleScene');
    this.scene.stop();
  }
}
