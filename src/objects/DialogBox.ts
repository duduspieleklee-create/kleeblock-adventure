import Phaser from 'phaser';

export class DialogBox extends Phaser.GameObjects.Container {
  constructor(scene: Phaser.Scene, x: number, y: number, text: string) {
    super(scene, x, y);

    // Background
    const bg = scene.add.graphics();
    bg.fillStyle(0x000000, 0.9);
    bg.fillRoundedRect(-190, -30, 380, 80, 10);
    this.add(bg);

    // Text
    const textBox = scene.add.text(0, 0, text, {
      fontSize: '16px',
      color: '#ffffff',
      wordWrap: { width: 340 },
    }).setOrigin(0.5);
    this.add(textBox);

    // Close instruction
    const closeText = scene.add.text(0, 35, 'Press E to close', {
      fontSize: '12px',
      color: '#aaaaaa',
    }).setOrigin(0.5);
    this.add(closeText);

    scene.add.existing(this);

    // Fix scroll factor so dialog stays anchored to screen, not the world
    this.setScrollFactor(0);
  }

  destroy(fromScene?: boolean): void {
    // Container's super.destroy() already destroys children.
    // But children were added via scene.add() (registered with scene) then
    // this.add() (registered with container), so we must explicitly remove
    // them from the scene to avoid orphaning.
    for (const child of this.getAll()) {
      if (child instanceof Phaser.GameObjects.GameObject) {
        child.destroy();
      }
    }
    this.removeAll(true);
    super.destroy(fromScene);
  }
}