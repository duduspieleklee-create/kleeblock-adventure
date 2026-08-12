import Phaser from 'phaser';
import { TEXT_STYLES, UI_CONFIG } from '../ui/UIConstants';

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainMenuScene' });
  }

  create(): void {
    const { width, height } = this.scale.gameSize;
    const cx = Math.round(width / 2);
    const cy = Math.round(height / 2);

    this.add
      .text(cx, cy - 80, 'KleeBlock Adventure', {
        ...TEXT_STYLES.menuTitle,
        fontSize: '32px',
        align: 'center',
        wordWrap: { width: width - UI_CONFIG.MARGIN * 2 },
      })
      .setOrigin(0.5);

    const playButton = this.add
      .text(cx, cy, 'PLAY', {
        ...TEXT_STYLES.menuButton,
      })
      .setOrigin(0.5);

    playButton.setInteractive({ useHandCursor: true });
    playButton.on('pointerdown', () => this.scene.start('IslandScene'));
    playButton.on('pointerover', () => {
      playButton.setColor('#88ffcc');
    });
    playButton.on('pointerout', () => {
      playButton.setColor('#00ff88');
    });

    this.add
      .text(cx, cy + 80, String(import.meta.env.GAME_VERSION ?? ''), {
        ...TEXT_STYLES.small,
        color: '#888888',
      })
      .setOrigin(0.5)
      .setAlpha(0.8);
  }
}
