import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from './config.js';
import TitleScene from './scenes/TitleScene.js';
import ModeSelectScene from './scenes/ModeSelectScene.js';
import MapSelectScene from './scenes/MapSelectScene.js';
import GameScene from './scenes/GameScene.js';
import ShopScene from './scenes/ShopScene.js';
import PauseScene from './scenes/PauseScene.js';
import HowToScene from './scenes/HowToScene.js';
import EndScene from './scenes/EndScene.js';

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
  scene: [TitleScene, ModeSelectScene, MapSelectScene, GameScene, ShopScene, PauseScene, HowToScene, EndScene],
};

const game = new Phaser.Game(config);

// Debug handle so the running game can be inspected from the console.
if (typeof window !== 'undefined') window.__GAME__ = game;
