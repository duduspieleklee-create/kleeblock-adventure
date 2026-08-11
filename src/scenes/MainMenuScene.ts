import Phaser from 'phaser';

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainMenuScene' });
  }

  create(): void {
    const { width, height } = this.cameras.main;

    this.add.text(width / 2, height / 2 - 60, 'KleeBlock Adventure', {
      fontSize: '48px',
      color: '#ffffff',
      fontFamily: 'Arial',
    }).setOrigin(0.5);

    // Play button — Forest level
    const playButton = this.add.text(width / 2, height / 2 - 20, 'FOREST', {
      fontSize: '32px',
      color: '#00ff88',
      fontFamily: 'Arial',
    }).setOrigin(0.5);

    playButton.setInteractive({ useHandCursor: true });
    playButton.on('pointerdown', () => {
      this.scene.start('GameScene');
    });

    playButton.on('pointerover', () => playButton.setScale(1.1));
    playButton.on('pointerout', () => playButton.setScale(1.0));

    // Island button
    const islandButton = this.add.text(width / 2, height / 2 + 30, 'ISLAND', {
      fontSize: '32px',
      color: '#00aaff',
      fontFamily: 'Arial',
    }).setOrigin(0.5);

    islandButton.setInteractive({ useHandCursor: true });
    islandButton.on('pointerdown', () => {
      this.scene.start('IslandScene');
    });

    islandButton.on('pointerover', () => islandButton.setScale(1.1));
    islandButton.on('pointerout', () => islandButton.setScale(1.0));

    // Version badge — below island button
    this.add.text(width / 2, height / 2 + 80, import.meta.env.GAME_VERSION, {
      fontSize: '14px',
      color: '#ffffff',
    }).setOrigin(0.5).setAlpha(0.6);
  }
}