import Phaser from 'phaser';

// ---------------------------------------------------------------------------
// Step 1 (Pipeline check): the smallest possible Phaser scene that proves the
// whole toolchain works end-to-end. It draws a single colored square so we can
// confirm the game renders locally and on Vercel before building anything real.
// ---------------------------------------------------------------------------

const GAME_WIDTH = 960;
const GAME_HEIGHT = 640;

class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create() {
    // Snowfield-ish background fill.
    this.cameras.main.setBackgroundColor('#dfe9f5');

    // A single colored square in the center: our pipeline-check sprite.
    const square = this.add.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      120,
      120,
      0x2b7de9
    );
    square.setStrokeStyle(4, 0x12386b);

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 110, 'Frostline TD: pipeline OK', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '20px',
        color: '#12386b',
      })
      .setOrigin(0.5);
  }
}

const config = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  parent: 'game',
  backgroundColor: '#dfe9f5',
  scene: [BootScene],
};

// eslint-disable-next-line no-new
new Phaser.Game(config);
