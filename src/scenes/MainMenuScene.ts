import Phaser from 'phaser';

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainMenuScene' });
  }

  create(): void {
    const { width, height } = this.cameras.main;

    this.add
      .text(width / 2, height / 2 - 60, 'KleeBlock Adventure', {
        fontSize: '48px',
        color: '#ffffff',
        fontFamily: 'Arial',
      })
      .setOrigin(0.5);

    // Play button
    const baseScale = 1;
    const hoverScale = 1.1;
    const cx = Math.round(width / 2);
    const cy = Math.round(height / 2);

    const playButton = this.add
      .text(cx, cy, 'PLAY', {
        fontSize: '36px',
        color: '#00ff88',
        fontFamily: 'Arial',
      })
      .setOrigin(0.5);

    playButton.setInteractive({ useHandCursor: true });
    playButton.on('pointerdown', () => this.scene.start('IslandScene'));
    playButton.on('pointerover', () => {
      playButton.setScale(hoverScale);
      playButton.setPosition(
        Math.round(width / 2 / hoverScale),
        Math.round(height / 2 / hoverScale),
      );
    });
    playButton.on('pointerout', () => {
      playButton.setScale(baseScale);
      playButton.setPosition(cx, cy);
    });

    // Version badge
    this.add
      .text(width / 2, height / 2 + 60, import.meta.env.GAME_VERSION, {
        fontSize: '14px',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setAlpha(0.6);
  }
}
