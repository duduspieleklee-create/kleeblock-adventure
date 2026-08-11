import Phaser from 'phaser';

export class NPC extends Phaser.Physics.Arcade.Sprite {
  private _dialogText: string;

  get dialogText(): string {
    return this._dialogText;
  }

  constructor(scene: Phaser.Scene, x: number, y: number, dialogText: string) {
    super(scene, x, y, 'ss_idle', 1);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCollideWorldBounds(true);
    this.setScale(0.6);
    this.setOrigin(0.5, 0.5);
    this.setDepth(10);
    this._dialogText = dialogText;

    // Use Sunnyside idle frames (side-facing for NPC)
    this.anims.play('npc_idle');
  }
}