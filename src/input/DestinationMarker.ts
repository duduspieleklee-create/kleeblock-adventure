import Phaser from 'phaser';

/**
 * Visual ground marker for click/tap destinations.
 * Lives in the world scene; hide when arrived or cancelled.
 */
export class DestinationMarker {
  private readonly gfx: Phaser.GameObjects.Graphics;
  private visible = false;

  constructor(scene: Phaser.Scene) {
    this.gfx = scene.add.graphics().setDepth(8);
  }

  show(x: number, y: number): void {
    this.visible = true;
    this.gfx.clear();
    this.gfx.lineStyle(2, 0x00ff88, 0.9);
    this.gfx.strokeCircle(Math.round(x), Math.round(y), 8);
    this.gfx.lineStyle(1, 0xffffff, 0.6);
    this.gfx.strokeCircle(Math.round(x), Math.round(y), 4);
  }

  hide(): void {
    if (!this.visible) return;
    this.visible = false;
    this.gfx.clear();
  }

  isVisible(): boolean {
    return this.visible;
  }

  destroy(): void {
    this.gfx.destroy();
  }
}
