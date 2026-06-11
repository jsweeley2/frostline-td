import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';
import { buildGameTextures } from '../art.js';

// ---------------------------------------------------------------------------
// TitleScene — the sci-fi title screen shown before the game starts.
//
// Animated backdrop (aurora, starfield, an ice-planet horizon, scan-lines and a
// scanning sweep), a glowing FROSTLINE title, an original in-universe quote, and
// a pulsing start button. Click anywhere or press Enter/Space to begin.
// ---------------------------------------------------------------------------

export default class TitleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TitleScene', active: true });
  }

  create() {
    const W = GAME_WIDTH;
    const H = GAME_HEIGHT;
    this.started = false;
    this.cameras.main.setBackgroundColor('#05070d');

    buildGameTextures(this); // so we can show real game art on the menu

    this.buildBackdrop(W, H);
    this.buildGrid(W, H);
    this.buildFleet(W, H);
    this.buildTitle(W, H);
    this.buildQuote(W, H);
    this.buildStart(W, H);
    this.buildFrame(W, H);
    this.buildTelemetry(W, H);

    // Begin on click, Enter or Space.
    const begin = () => this.begin();
    this.input.on('pointerdown', begin);
    this.input.keyboard?.on('keydown-ENTER', begin);
    this.input.keyboard?.on('keydown-SPACE', begin);
  }

  // ---- backdrop ----------------------------------------------------------

  buildBackdrop(W, H) {
    // Drifting aurora bands.
    const auroras = [
      { c: 0x1f6f8f, x: W * 0.3, y: H * 0.32 },
      { c: 0x2f9e7f, x: W * 0.72, y: H * 0.26 },
      { c: 0x5b3fa0, x: W * 0.52, y: H * 0.5 },
    ];
    auroras.forEach((a, i) => {
      const e = this.add.ellipse(a.x, a.y, 560, 250, a.c, 0.12).setDepth(1);
      this.tweens.add({
        targets: e, x: a.x + (i % 2 ? 50 : -50),
        alpha: { from: 0.06, to: 0.18 }, duration: 4200 + i * 900, yoyo: true, repeat: -1,
      });
    });

    // Starfield (a few twinkle).
    for (let i = 0; i < 90; i++) {
      const x = Phaser.Math.Between(0, W);
      const y = Phaser.Math.Between(0, H * 0.7);
      const r = Phaser.Math.FloatBetween(0.5, 1.6);
      const star = this.add.circle(x, y, r, 0xffffff, Phaser.Math.FloatBetween(0.4, 1)).setDepth(2);
      if (i % 7 === 0) {
        this.tweens.add({ targets: star, alpha: { from: 0.2, to: 1 }, duration: Phaser.Math.Between(900, 1800), yoyo: true, repeat: -1 });
      }
    }

    // Ice-planet horizon arc at the bottom.
    this.add.circle(W / 2, H + 340, 560, 0x123347).setDepth(3);
    this.add.circle(W / 2, H + 340, 560).setStrokeStyle(3, 0x6fd0ff, 0.55).setDepth(4);
    this.add.circle(W / 2, H + 348, 548, 0x1c4a63, 0.5).setDepth(3);

    // Ambient snow.
    if (!this.textures.exists('titlesnow')) {
      const gg = this.make.graphics({ x: 0, y: 0, add: false });
      gg.fillStyle(0xffffff, 1); gg.fillCircle(3, 3, 2);
      gg.generateTexture('titlesnow', 6, 6); gg.destroy();
    }
    this.add.particles(0, 0, 'titlesnow', {
      x: { min: 0, max: W }, y: { min: -10, max: H },
      lifespan: 6000, speedY: { min: 12, max: 40 }, speedX: { min: -12, max: 12 },
      scale: { min: 0.3, max: 0.9 }, alpha: { start: 0.6, end: 0 }, frequency: 120, quantity: 2,
    }).setDepth(5);

    // CRT-ish scan lines + a scanning sweep.
    const sl = this.add.graphics().setDepth(40);
    sl.fillStyle(0x000000, 0.07);
    for (let y = 0; y < H; y += 4) sl.fillRect(0, y, W, 1);
    const sweep = this.add.rectangle(0, 0, W, 3, 0x6fd0ff, 0.22).setOrigin(0, 0).setDepth(41);
    this.tweens.add({ targets: sweep, y: H, duration: 5200, repeat: -1 });
  }

  // ---- title -------------------------------------------------------------

  buildTitle(W, H) {
    const ty = H * 0.28;
    const title = this.add
      .text(W / 2, ty, 'FROSTLINE', {
        fontFamily: '"Arial Black", system-ui, sans-serif', fontSize: '94px',
        color: '#dff4ff', fontStyle: 'bold',
      })
      .setOrigin(0.5).setDepth(20);
    title.setShadow(0, 0, '#3fd0ff', 26, false, true);

    const sub = this.add
      .text(W / 2, ty + 64, 'T O W E R   D E F E N S E', {
        fontFamily: 'system-ui, sans-serif', fontSize: '22px', color: '#7fd6f5', fontStyle: 'bold',
      })
      .setOrigin(0.5).setDepth(20);
    sub.setShadow(0, 0, '#2f9ed0', 10, false, true);

    // Glowing energy underline that sweeps to full width.
    const underline = this.add.rectangle(W / 2, ty + 88, 10, 3, 0x6fd0ff, 0.95).setDepth(20);
    underline.setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: underline, width: 420, duration: 900, delay: 400, ease: 'Cubic.Out' });
    this.tweens.add({ targets: underline, alpha: { from: 0.5, to: 1 }, duration: 1400, yoyo: true, repeat: -1, delay: 1300 });

    // Intro animation.
    title.setScale(0.85).setAlpha(0);
    this.tweens.add({ targets: title, scale: 1, alpha: 1, duration: 800, ease: 'Back.Out' });
    sub.setAlpha(0);
    this.tweens.add({ targets: sub, alpha: 1, duration: 700, delay: 500 });
  }

  // ---- quote -------------------------------------------------------------

  buildQuote(W, H) {
    const qy = H * 0.5;
    const quote = this.add
      .text(W / 2, qy,
        '"They told us the long winter would take everything.\nWe answered with light, and held the line."', {
        fontFamily: 'Georgia, "Times New Roman", serif', fontSize: '21px',
        color: '#bfe6ff', fontStyle: 'italic', align: 'center', lineSpacing: 8,
      })
      .setOrigin(0.5).setDepth(20);
    const attr = this.add
      .text(W / 2, qy + 56, '— FROSTLINE COMMAND, FIRST WINTER', {
        fontFamily: 'system-ui, sans-serif', fontSize: '13px', color: '#5f9fc0', fontStyle: 'bold',
      })
      .setOrigin(0.5).setDepth(20);

    [quote, attr].forEach((t) => {
      t.setAlpha(0);
      this.tweens.add({ targets: t, alpha: 1, duration: 900, delay: 900 });
    });
  }

  // ---- start button ------------------------------------------------------

  buildStart(W, H) {
    const by = H * 0.76;
    const btn = this.add
      .rectangle(W / 2, by, 290, 58, 0x0c2030, 0.92)
      .setStrokeStyle(2, 0x6fd0ff, 0.9).setDepth(20).setInteractive({ useHandCursor: true });
    const text = this.add
      .text(W / 2, by, 'INITIATE DEFENSE', {
        fontFamily: 'system-ui, sans-serif', fontSize: '22px', color: '#dff4ff', fontStyle: 'bold',
      })
      .setOrigin(0.5).setDepth(21);
    text.setShadow(0, 0, '#3fd0ff', 12, false, true);

    this.tweens.add({ targets: [btn, text], alpha: { from: 1, to: 0.5 }, duration: 950, yoyo: true, repeat: -1 });
    btn.on('pointerover', () => btn.setFillStyle(0x12344a, 0.96));
    btn.on('pointerout', () => btn.setFillStyle(0x0c2030, 0.92));

    this.add
      .text(W / 2, by + 46, 'click anywhere  ·  or press ENTER', {
        fontFamily: 'system-ui, sans-serif', fontSize: '13px', color: '#5f9fc0',
      })
      .setOrigin(0.5).setDepth(20);
  }

  // Cyan corner brackets framing the screen.
  buildFrame(W, H) {
    const g = this.add.graphics().setDepth(20);
    g.lineStyle(3, 0x6fd0ff, 0.8);
    const m = 18, b = 40;
    const corner = (x, y, sx, sy) => {
      g.lineBetween(x, y, x + b * sx, y);
      g.lineBetween(x, y, x, y + b * sy);
    };
    corner(m, m, 1, 1);
    corner(W - m, m, -1, 1);
    corner(m, H - m, 1, -1);
    corner(W - m, H - m, -1, -1);
  }

  // A perspective energy grid across the ice-planet surface for depth.
  buildGrid(W, H) {
    const g = this.add.graphics().setDepth(4);
    g.lineStyle(1, 0x4fb6d6, 0.16);
    const vpX = W / 2, vpY = H * 0.6, baseY = H + 30;
    for (let i = -7; i <= 7; i++) {
      g.lineBetween(vpX, vpY, W / 2 + i * (W / 8), baseY);
    }
    for (let j = 1; j <= 7; j++) {
      const t = j / 8;
      const y = vpY + (baseY - vpY) * Math.pow(t, 1.7);
      g.lineBetween(0, y, W, y);
    }
  }

  // Drifting previews of real in-game sprites, so the menu shows off the art.
  buildFleet(W, H) {
    const float = (key, x, y, scale, alpha, spin) => {
      const img = this.add.image(x, y, key).setDepth(6).setScale(scale).setAlpha(alpha);
      this.tweens.add({ targets: img, y: y + 12, duration: 2600 + Math.random() * 1200, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      if (spin) this.tweens.add({ targets: img, angle: 360, duration: 9000, repeat: -1 });
      return img;
    };
    float('tower_sniper', W * 0.13, H * 0.34, 1.5, 0.5);
    float('tower_tesla', W * 0.87, H * 0.36, 1.4, 0.5);
    float('enemy_juggernaut', W * 0.12, H * 0.66, 1.3, 0.55);
    float('enemy_disruptor', W * 0.88, H * 0.64, 1.4, 0.6, true);
  }

  // Faux command-console telemetry in the corners for sci-fi flavor.
  buildTelemetry(W, H) {
    const style = { fontFamily: '"Courier New", monospace', fontSize: '13px', color: '#5fbfe0' };
    const lines = [
      { t: 'SECTOR 07 // GLACIUS', x: 44, y: 40, ox: 0, oy: 0 },
      { t: 'SHIELD GENERATOR: ONLINE', x: W - 44, y: 40, ox: 1, oy: 0 },
      { t: 'THREAT LEVEL: ELEVATED', x: 44, y: H - 44, ox: 0, oy: 1 },
      { t: 'FROSTLINE OS  v1.0', x: W - 44, y: H - 44, ox: 1, oy: 1 },
    ];
    lines.forEach((l) => {
      const txt = this.add.text(l.x, l.y, l.t, style).setOrigin(l.ox, l.oy).setDepth(20).setAlpha(0.7);
      if (l.t.includes('THREAT')) {
        this.tweens.add({ targets: txt, alpha: { from: 0.35, to: 0.85 }, duration: 700, yoyo: true, repeat: -1 });
      }
    });
  }

  begin() {
    if (this.started) return;
    this.started = true;
    this.cameras.main.fadeOut(320, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('ModeSelectScene'));
  }
}
