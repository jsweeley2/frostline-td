import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, PERKS } from '../config.js';

// ---------------------------------------------------------------------------
// ShopScene — the "Resupply" shop that opens every 5 cleared waves (solo).
// Launched over a paused GameScene. Spend KILLS on stacking global perks, then
// Continue to resume the defense. Styled to match the title / end screens.
// ---------------------------------------------------------------------------

export default class ShopScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ShopScene', active: false });
  }

  init(data) {
    this.wave = (data && data.wave) || 0;
  }

  create() {
    const W = GAME_WIDTH, H = GAME_HEIGHT, cx = W / 2, cy = H / 2;
    this.gs = this.scene.get('GameScene');
    const accent = 0x6fd0ff;

    // Backdrop.
    this.add.rectangle(0, 0, W, H, 0x05070d, 0.82).setOrigin(0);
    this.add.ellipse(cx, cy, 640, 520, accent, 0.08).setBlendMode(Phaser.BlendModes.ADD);
    const sl = this.add.graphics();
    sl.fillStyle(0x000000, 0.06);
    for (let y = 0; y < H; y += 4) sl.fillRect(0, y, W, 1);

    // Panel.
    const pw = 560, ph = 470;
    this.add.rectangle(cx, cy, pw, ph, 0x0a1828, 0.97).setStrokeStyle(2, accent, 0.9);

    const title = this.add
      .text(cx, cy - ph / 2 + 38, 'RESUPPLY', {
        fontFamily: '"Arial Black", system-ui, sans-serif', fontSize: '40px',
        color: '#dff4ff', fontStyle: 'bold',
      })
      .setOrigin(0.5);
    title.setShadow(0, 0, '#3fd0ff', 20, false, true);
    this.add
      .text(cx, cy - ph / 2 + 70, `Wave ${this.wave} cleared  ·  spend kills on upgrades`, {
        fontFamily: 'system-ui, sans-serif', fontSize: '14px', color: '#9fc0ff',
      })
      .setOrigin(0.5);

    this.killsText = this.add
      .text(cx, cy - ph / 2 + 98, '', {
        fontFamily: '"Courier New", monospace', fontSize: '18px', color: '#ffd23f', fontStyle: 'bold',
      })
      .setOrigin(0.5);

    // Perk rows.
    this.rows = [];
    const top = cy - ph / 2 + 130;
    PERKS.forEach((perk, i) => {
      const y = top + i * 46;
      const bg = this.add
        .rectangle(cx, y, pw - 50, 40, 0x12283f, 0.95)
        .setStrokeStyle(1, accent, 0.5)
        .setInteractive({ useHandCursor: true });
      const label = this.add
        .text(cx - pw / 2 + 38, y, `${perk.name}  —  ${perk.desc}`, {
          fontFamily: 'system-ui, sans-serif', fontSize: '15px', color: '#dff4ff', fontStyle: 'bold',
        })
        .setOrigin(0, 0.5);
      const price = this.add
        .text(cx + pw / 2 - 38, y, `${perk.cost} kills`, {
          fontFamily: '"Courier New", monospace', fontSize: '14px', color: '#ffd23f', fontStyle: 'bold',
        })
        .setOrigin(1, 0.5);
      bg.on('pointerover', () => bg.setFillStyle(0x1b3a57, 0.98));
      bg.on('pointerout', () => bg.setFillStyle(0x12283f, 0.95));
      bg.on('pointerdown', () => this.buy(perk));
      this.rows.push({ perk, bg, label, price });
    });

    // Continue.
    const by = cy + ph / 2 - 40;
    const cont = this.add
      .rectangle(cx, by, 230, 44, 0x39c06a, 0.95)
      .setStrokeStyle(2, 0xffffff, 0.25)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(cx, by, 'CONTINUE', {
        fontFamily: 'system-ui, sans-serif', fontSize: '20px', color: '#04140a', fontStyle: 'bold',
      })
      .setOrigin(0.5);
    cont.on('pointerover', () => cont.setScale(1.04));
    cont.on('pointerout', () => cont.setScale(1));
    cont.on('pointerdown', () => this.resume());
    this.input.keyboard?.on('keydown-ENTER', () => this.resume());
    this.input.keyboard?.on('keydown-SPACE', () => this.resume());

    this.refresh();
  }

  buy(perk) {
    if (this.gs.buyPerk(perk)) this.refresh();
  }

  refresh() {
    const k = this.gs.killPoints;
    this.killsText.setText(`KILLS AVAILABLE: ${k}`);
    for (const row of this.rows) {
      const afford = k >= row.perk.cost;
      row.bg.setAlpha(afford ? 1 : 0.45);
      row.price.setColor(afford ? '#ffd23f' : '#7a6a3a');
    }
  }

  resume() {
    this.scene.stop();
    this.scene.resume('GameScene');
  }
}
