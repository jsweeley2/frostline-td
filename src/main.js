import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from './config.js';
import GameScene from './scenes/GameScene.js';

// ---------------------------------------------------------------------------
// Phaser game entry point. Scenes are registered here; GameScene is the board.
// ---------------------------------------------------------------------------

const config = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  parent: 'game',
  backgroundColor: COLORS.snow,
  // Scale the whole board to fit the window while keeping its aspect ratio,
  // so the entire field (spawn on the left, base on the right) is always visible.
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [GameScene],
};

// eslint-disable-next-line no-new
new Phaser.Game(config);
