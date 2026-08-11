import Phaser from 'phaser';

export class DialogBox extends Phaser.GameObjects.Container {
  constructor(scene: Phaser.Scene, text: string) {
    super(scene);

    const fontSize = '10px';
    const padding = 6;
    const maxWidth = 160;

    // Measure text first to get exact box size
    const tempText = scene.add
      .text(0, 0, text, {
        fontSize: fontSize,
        color: '#e0e0e0',
        wordWrap: { width: maxWidth },
      })
      .setOrigin(0);

    const bounds = tempText.getBounds();
    const boxW = Math.round(bounds.width + padding * 2);
    const boxH = Math.round(bounds.height + padding * 2);
    tempText.destroy();

    // Background
    const bg = scene.add.graphics();
    bg.fillStyle(0x1a1a2e, 0.95);
    bg.fillRoundedRect(-boxW / 2, -boxH / 2, boxW, boxH, 3);
    bg.lineStyle(1, 0x5a5a7a, 0.9);
    bg.strokeRoundedRect(-boxW / 2, -boxH / 2, boxW, boxH, 3);
    this.add(bg);

    // Text - centered
    const textBox = scene.add
      .text(0, 0, text, {
        fontSize: fontSize,
        color: '#e0e0e0',
        wordWrap: { width: boxW - padding * 2 },
      })
      .setOrigin(0.5);
    this.add(textBox);

    scene.add.existing(this);
    this.setScrollFactor(0);
    this.setDepth(10000);
  }

  /** Position above NPC head, clamped to camera bounds */
  positionAtNPC(npc: { x: number; y: number }, cam: Phaser.Cameras.Scene2D.Camera): void {
    const offset = 40;

    // Convert world position to screen space (ignoring zoom)
    let x = (npc.x - cam.scrollX) * cam.zoom;
    let y = (npc.y - offset - cam.scrollY) * cam.zoom;

    const minX = 60;
    const maxX = cam.width - 60;
    const minY = 10;
    const maxY = cam.height - 10;

    x = Phaser.Math.Clamp(x, minX, maxX);
    y = Phaser.Math.Clamp(y, minY, maxY);

    this.setPosition(x, y);
  }

  destroy(fromScene?: boolean): void {
    this.removeAll(true);
    super.destroy(fromScene);
  }
}
