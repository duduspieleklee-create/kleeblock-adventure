import Phaser from 'phaser';

export class PreloaderScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloaderScene' });
  }

  preload(): void {
    const { width, height } = this.cameras.main;

    // Loading bar background
    const bg = this.add.graphics();
    bg.fillStyle(0x222222, 0.8);
    bg.fillRect(width / 2 - 160, height / 2 - 25, 320, 50);

    // Loading bar fill
    const bar = this.add.graphics();
    this.load.on('progress', (value: number) => {
      bar.clear();
      bar.fillStyle(0x00ff88, 1);
      bar.fillRect(width / 2 - 150, height / 2 - 15, 300 * value, 30);
    });

    // Fallback: auto-advance if loading stalls (>10s) or fails
    this.load.on('error', (_file: unknown, _error: unknown) => {
      console.error('[Preloader] Asset load failed — continuing anyway');
    });

    this.time.addEvent({
      delay: 10_000,
      callback: () => {
        if (this.scene.isActive('PreloaderScene')) {
          console.warn('[Preloader] Timed out — forcing menu');
          this.scene.start('MainMenuScene');
        }
      },
    });

    this.add.text(width / 2, height / 2 + 40, 'Loading...', {
      fontSize: '16px',
      color: '#aaaaaa',
    }).setOrigin(0.5);

    // --- Tilesets ---
    this.load.image('sunnyside', 'assets/tilesets/spr_tileset_sunnysideworld_16px.png');

    // --- Tilemap JSON ---
    this.load.tilemapTiledJSON('island', 'assets/tilemaps/island.json');

    // --- Sunnyside Human character (96x64 frames) ---
    this.load.spritesheet('ss_idle', 'assets/characters/sunnyside/base_idle_strip9.png', { frameWidth: 96, frameHeight: 64 });
    this.load.spritesheet('ss_walk', 'assets/characters/sunnyside/base_walk_strip8.png', { frameWidth: 96, frameHeight: 64 });
    this.load.spritesheet('ss_run',  'assets/characters/sunnyside/base_run_strip8.png', { frameWidth: 96, frameHeight: 64 });
  }

  create(): void {
    this.scene.start('MainMenuScene');
  }
}