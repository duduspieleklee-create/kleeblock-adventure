import Phaser from 'phaser';
import { applyCharacterBodyWhenReady } from './characterBody';

export class NPC extends Phaser.Physics.Arcade.Sprite {
  private _dialogueId: string;

  get dialogueId(): string {
    return this._dialogueId;
  }

  constructor(scene: Phaser.Scene, x: number, y: number, dialogueId: string) {
    super(scene, x, y, 'ss_idle', 1);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCollideWorldBounds(true);
    this.setScale(0.6);
    this.setOrigin(0.5, 0.5);
    this.setImmovable(true);
    this._dialogueId = dialogueId;

    // Same feet hitbox as the player for consistent collision feel
    applyCharacterBodyWhenReady(scene, this);

    // NPC idle animation (facing down, bobbing)
    scene.anims.create({
      key: 'npc_idle',
      frames: [
        { key: 'ss_idle', frame: 1 },
        { key: 'ss_idle', frame: 3 },
        { key: 'ss_idle', frame: 5 },
        { key: 'ss_idle', frame: 7 },
      ],
      frameRate: 6,
      repeat: -1,
    });

    this.anims.play('npc_idle');
  }
}
