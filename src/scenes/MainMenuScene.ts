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

    // Play button
    const playButton = this.add.text(width / 2, height / 2, 'PLAY', {
      fontSize: '36px',
      color: '#00ff88',
      fontFamily: 'Arial',
    }).setOrigin(0.5);

    playButton.setInteractive({ useHandCursor: true });
    playButton.on('pointerdown', () => this.scene.start('IslandScene'));
    playButton.on('pointerover', () => playButton.setScale(1.1));
    playButton.on('pointerout', () => playButton.setScale(1.0));

    // Version badge
    this.add.text(width / 2, height / 2 + 60, import.meta.env.GAME_VERSION, {
      fontSize: '14px',
      color: '#ffffff',
    }).setOrigin(0.5).setAlpha(0.6);
  }
}