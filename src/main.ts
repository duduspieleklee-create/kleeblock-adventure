import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { PreloaderScene } from './scenes/PreloaderScene';
import { MainMenuScene } from './scenes/MainMenuScene';
import { IslandScene } from './scenes/IslandScene';

// Global error catchers — turn silent freezes into console logs
window.onerror = (msg, _src, _line, _col, err) => {
  console.error('GLOBAL ERROR:', msg, err?.stack);
};
window.onunhandledrejection = (ev) => {
  console.error('UNHANDLED REJECTION:', ev.reason);
};

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 480,
  height: 360,
  parent: 'game-container',
  backgroundColor: '#1d1d2b',
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scene: [BootScene, PreloaderScene, MainMenuScene, IslandScene],
};

const game = new Phaser.Game(config);

// Expose game instance for playtest harness (dev only)
if (import.meta.env.DEV) (window as any).__PHASER_GAME__ = game;
export default game;
