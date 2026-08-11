import Phaser from 'phaser';

export class DialogBox extends Phaser.GameObjects.Container {
  constructor(scene: Phaser.Scene, text: string) {
    super(scene);

    const cam = scene.cameras.main;
    const w = 400;
    const h = 44;

    // Position container at bottom-center of screen
    const x = cam.width / 2;
    const y = cam.height - 52;

    // Background — centered on container origin
    const bg = scene.add.graphics();
    bg.fillStyle(0x1a1a2e, 0.92);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 8);
    bg.lineStyle(2, 0x4a4a6a, 0.8);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 8);
    this.add(bg);

    // Text — centered on container origin
    const textBox = scene.add.text(0, 0, text, {
      fontSize: '12px',
      color: '#e0e0e0',
      wordWrap: { width: w - 24 },
    }).setOrigin(0.5);
    this.add(textBox);

    scene.add.existing(this);
    this.setPosition(x, y);
    this.setScrollFactor(0);
  }

  destroy(fromScene?: boolean): void {
    this.removeAll(true);
    super.destroy(fromScene);
  }
}