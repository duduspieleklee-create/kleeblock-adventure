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

    this.add.text(width / 2, height / 2 + 40, 'Loading...', {
      fontSize: '16px',
      color: '#aaaaaa',
    }).setOrigin(0.5);

    // --- Tilesets ---
    this.load.image('floors', 'assets/tilesets/floors.png');
    this.load.image('sunnyside', 'assets/tilesets/spr_tileset_sunnysideworld_16px.png');

    // --- Tilemap JSON ---
    this.load.tilemapTiledJSON('forest', 'assets/tilemaps/forest_beginner.json');
    this.load.tilemapTiledJSON('island', 'assets/tilemaps/island.json');

    // --- Player character spritesheets (32px frame width, 16px height) ---
    this.load.spritesheet('player_idle_down', 'assets/characters/player_idle_down.png', { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet('player_idle_side', 'assets/characters/player_idle_side.png', { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet('player_idle_up', 'assets/characters/player_idle_up.png', { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet('player_walk_down', 'assets/characters/player_walk_down.png', { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet('player_walk_side', 'assets/characters/player_walk_side.png', { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet('player_walk_up', 'assets/characters/player_walk_up.png', { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet('player_run_down', 'assets/characters/player_run_down.png', { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet('player_run_side', 'assets/characters/player_run_side.png', { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet('player_run_up', 'assets/characters/player_run_up.png', { frameWidth: 16, frameHeight: 16 });

    // --- NPC: use player_idle_side as placeholder (same format) ---
    this.load.spritesheet('npc_idle', 'assets/characters/player_idle_side.png', { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet('npc_walk', 'assets/characters/player_walk_side.png', { frameWidth: 16, frameHeight: 16 });

    // --- Trees ---
    this.load.image('tree1_s3', 'assets/images/trees/tree1_s3.png');
    this.load.image('tree2_s3', 'assets/images/trees/tree2_s3.png');
    this.load.image('tree3_s3', 'assets/images/trees/tree3_s3.png');

    // --- Vegetation & rocks ---
    this.load.image('vegetation', 'assets/images/vegetation.png');
    this.load.image('rocks', 'assets/images/rocks.png');
  }

  create(): void {
    // No more placeholder textures — all real assets loaded above
    this.scene.start('MainMenuScene');
  }
}