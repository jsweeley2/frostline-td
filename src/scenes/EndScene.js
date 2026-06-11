import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';
import { WAVES } from '../maps/waves.js';

// ---------------------------------------------------------------------------
// EndScene — the end / intermission overlay, styled to match the title screen.
// Handles four cases by the data it's launched with:
//   solo  { win, wave, kills, endless }            — single player win/lose
//   avd   { avd, defenderWon, wave, kills }         — Attacker vs Defender result
//   duel  { duel, player, score }                   — Score Duel turn handoff /
//                                                     final result
// ---------------------------------------------------------------------------

export default class EndScene extends Phaser.Scene {
  constructor() {
    super({ key: 'EndScene', active: false });
  }

  init(data) {
    this.result = data || { win: false, wave: 0, kills: 0, endless: false };
  }

  create() {
    if (this.result.duel) this.buildDuel();
    else if (this.result.avd) this.buildAvd();
    else this.buildSolo();
  }

  // Shared dark sci-fi backdrop + panel. Returns panel geometry.
  backdrop(accent) {
    const W = GAME_WIDTH, H = GAME_HEIGHT, cx = W / 2, cy = H / 2;
    this.add.rectangle(0, 0, W, H, 0x05070d, 0.82).setOrigin(0);
    this.add.ellipse(cx, cy, 620, 460, accent, 0.09).setBlendMode(Phaser.BlendModes.ADD);
    for (let i = 0; i < 50; i++) {
      this.add.circle(Phaser.Math.Between(0, W), Phaser.Math.Between(0, H),
        Phaser.Math.FloatBetween(0.5, 1.5), 0xffffff, Phaser.Math.FloatBetween(0.2, 0.7));
    }
    const sl = this.add.graphics();
    sl.fillStyle(0x000000, 0.06);
    for (let y = 0; y < H; y += 4) sl.fillRect(0, y, W, 1);
    const pw = 520, ph = 360;
    this.add.rectangle(cx, cy, pw, ph, 0x0a1828, 0.97).setStrokeStyle(2, accent, 0.9);
    this.panelBrackets(cx, cy, pw, ph, accent);
    return { cx, cy, pw, ph };
  }

  titleText(cx, y, str, hex) {
    const t = this.add
      .text(cx, y, str, {
        fontFamily: '"Arial Black", system-ui, sans-serif', fontSize: '50px',
        color: hex, fontStyle: 'bold', align: 'center',
      })
      .setOrigin(0.5);
    t.setShadow(0, 0, hex, 22, false, true);
    t.setScale(0.85);
    this.tweens.add({ targets: t, scale: 1, duration: 500, ease: 'Back.Out' });
    return t;
  }

  // ---- solo --------------------------------------------------------------

  buildSolo() {
    const { win, wave, kills, endless } = this.result;
    const accent = win ? 0x39c06a : 0xe05a47;
    const hex = win ? '#39c06a' : '#ff7a5e';
    const { cx, cy, pw } = this.backdrop(accent);

    this.titleText(cx, cy - 118, win ? 'VICTORY' : 'GAME OVER', hex);
    let subtitle;
    if (win) subtitle = `You held the shield through all ${WAVES.length} waves.`;
    else if (endless) subtitle = `Endless mode: you reached wave ${wave}.`;
    else subtitle = `The shield generator fell on wave ${wave} of ${WAVES.length}.`;
    this.subtitle(cx, cy - 64, subtitle, pw);

    const recap = endless
      ? `WAVES SURVIVED: ${wave}        KILLS: ${kills}`
      : `WAVES REACHED: ${wave} / ${WAVES.length}        KILLS: ${kills}`;
    this.recap(cx, cy - 24, recap);

    this.makeButton(cx, cy + 36, 'PLAY AGAIN', accent, '#04140a',
      () => this.go('GameScene', { endless: this.result.endless }));
    this.makeButton(cx, cy + 100, 'MAIN MENU', 0x6fd0ff, '#04161f', () => this.go('ModeSelectScene'));
    this.input.keyboard?.on('keydown-ENTER', () => this.go('GameScene', { endless: this.result.endless }));
    this.input.keyboard?.on('keydown-ESC', () => this.go('ModeSelectScene'));
  }

  // ---- attacker vs defender ----------------------------------------------

  buildAvd() {
    const { defenderWon, wave, kills } = this.result;
    const accent = defenderWon ? 0x39c06a : 0xe05a47;
    const hex = defenderWon ? '#39c06a' : '#ff7a5e';
    const { cx, cy, pw } = this.backdrop(accent);

    this.titleText(cx, cy - 116, defenderWon ? 'DEFENDERS HOLD' : 'BASE OVERRUN', hex);
    this.subtitle(cx, cy - 60,
      defenderWon ? 'The shield held until the timer ran out. Defender wins!'
        : 'The shield generator was destroyed. Attacker wins!', pw);
    this.recap(cx, cy - 22, `ENEMIES DESTROYED: ${kills}`);

    this.makeButton(cx, cy + 38, 'REMATCH', accent, '#04140a', () => this.go('GameScene', { mode: 'avd' }));
    this.makeButton(cx, cy + 102, 'MAIN MENU', 0x6fd0ff, '#04161f', () => this.go('ModeSelectScene'));
    this.input.keyboard?.on('keydown-ESC', () => this.go('ModeSelectScene'));
  }

  // ---- score duel --------------------------------------------------------

  buildDuel() {
    const { player, score } = this.result;
    this.registry.set(player === 1 ? 'duelP1' : 'duelP2', score);

    if (player === 1) {
      // Handoff to player 2.
      const { cx, cy, pw } = this.backdrop(0x6fd0ff);
      this.titleText(cx, cy - 116, 'PLAYER 1 DONE', '#6fd0ff');
      this.subtitle(cx, cy - 58, 'Pass the controls. Player 2, defend the shield!', pw);
      this.recap(cx, cy - 20, `PLAYER 1  —  WAVE ${score.wave}   ·   KILLS ${score.kills}`);
      this.makeButton(cx, cy + 40, 'PLAYER 2 START', 0x39c06a, '#04140a',
        () => this.go('GameScene', { mode: 'duel', player: 2 }));
      this.makeButton(cx, cy + 104, 'MAIN MENU', 0x6fd0ff, '#04161f', () => this.go('ModeSelectScene'));
      return;
    }

    // Player 2 done — compare and show the winner.
    const p1 = this.registry.get('duelP1') || { wave: 0, kills: 0 };
    const p2 = score;
    let result, accent, hex;
    const cmp = p2.wave - p1.wave || p2.kills - p1.kills;
    if (cmp > 0) { result = 'PLAYER 2 WINS'; accent = 0x39c06a; hex = '#39c06a'; }
    else if (cmp < 0) { result = 'PLAYER 1 WINS'; accent = 0x39c06a; hex = '#39c06a'; }
    else { result = "IT'S A TIE"; accent = 0x6fd0ff; hex = '#6fd0ff'; }

    const { cx, cy, pw } = this.backdrop(accent);
    this.titleText(cx, cy - 116, result, hex);
    this.subtitle(cx, cy - 64, 'Score Duel complete.', pw);
    this.add
      .text(cx, cy - 24, `P1  ·  WAVE ${p1.wave}  ·  KILLS ${p1.kills}\nP2  ·  WAVE ${p2.wave}  ·  KILLS ${p2.kills}`, {
        fontFamily: '"Courier New", monospace', fontSize: '15px', color: '#6fd0ff',
        fontStyle: 'bold', align: 'center', lineSpacing: 6,
      })
      .setOrigin(0.5);

    this.makeButton(cx, cy + 46, 'REMATCH', accent, '#04140a', () => {
      this.registry.set('duelP1', null); this.registry.set('duelP2', null);
      this.go('GameScene', { mode: 'duel', player: 1 });
    });
    this.makeButton(cx, cy + 110, 'MAIN MENU', 0x6fd0ff, '#04161f', () => this.go('ModeSelectScene'));
  }

  // ---- shared helpers ----------------------------------------------------

  subtitle(cx, y, str, pw) {
    this.add
      .text(cx, y, str, {
        fontFamily: 'system-ui, sans-serif', fontSize: '16px', color: '#cfe6ff',
        align: 'center', wordWrap: { width: pw - 60 },
      })
      .setOrigin(0.5);
  }

  recap(cx, y, str) {
    this.add
      .text(cx, y, str, {
        fontFamily: '"Courier New", monospace', fontSize: '14px', color: '#6fd0ff', fontStyle: 'bold',
      })
      .setOrigin(0.5);
  }

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

  // Stop the paused GameScene (if any) and go to the target scene.
  go(key, data) {
    this.scene.stop('GameScene');
    this.scene.start(key, data);
    this.scene.stop();
  }
}
