import Phaser from 'phaser';

/**
 * Capability detection via Phaser device flags — not user-agent alone.
 */
export class DeviceDetector {
  static isTouchCapable(game: Phaser.Game): boolean {
    return !!game.device.input.touch;
  }

  static supportsMouse(game: Phaser.Game): boolean {
    return !!game.device.input.mouse;
  }

  static isHybrid(game: Phaser.Game): boolean {
    return this.isTouchCapable(game) && this.supportsMouse(game);
  }
}
