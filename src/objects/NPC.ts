import Phaser from 'phaser';
import { applyCharacterBodyWhenReady } from './characterBody';
import { AssetKeys } from '../config/AssetKeys';

export class NPC extends Phaser.Physics.Arcade.Sprite {
  private _dialogueId: string;
  private questMarker?: Phaser.GameObjects.Text;
  private markerTween?: Phaser.Tweens.Tween;

  get dialogueId(): string {
    return this._dialogueId;
  }

  constructor(scene: Phaser.Scene, x: number, y: number, dialogueId: string) {
    super(scene, x, y, AssetKeys.Characters.IDLE, 1);
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
    if (!scene.anims.exists('npc_idle')) {
      scene.anims.create({
        key: 'npc_idle',
        frames: [
          { key: AssetKeys.Characters.IDLE, frame: 1 },
          { key: AssetKeys.Characters.IDLE, frame: 3 },
          { key: AssetKeys.Characters.IDLE, frame: 5 },
          { key: AssetKeys.Characters.IDLE, frame: 7 },
        ],
        frameRate: 6,
        repeat: -1,
      });
    }

    this.anims.play('npc_idle');
  }

  /**
   * Show or hide the spatial quest marker (!)
   */
  setQuestMarker(visible: boolean, color: string = '#ffcc00'): void {
    if (visible) {
      if (!this.questMarker) {
        this.questMarker = this.scene.add
          .text(this.x, this.y - 28, '!', {
            fontSize: '16px',
            color: color,
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 3,
          })
          .setOrigin(0.5)
          .setDepth(20);

        // Gentle bobbing animation
        this.markerTween = this.scene.tweens.add({
          targets: this.questMarker,
          y: this.y - 34,
          duration: 600,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      } else {
        this.questMarker.setVisible(true);
        this.questMarker.setColor(color);
      }
    } else if (this.questMarker) {
      this.questMarker.setVisible(false);
    }
  }

  /**
   * Keep marker positioned above the NPC (call in update if NPC can move)
   */
  updateQuestMarkerPosition(): void {
    if (this.questMarker && this.questMarker.visible) {
      this.questMarker.setPosition(this.x, this.questMarker.y);
    }
  }

  destroy(fromScene?: boolean): void {
    if (this.markerTween) {
      this.markerTween.destroy();
    }
    if (this.questMarker) {
      this.questMarker.destroy();
    }
    super.destroy(fromScene);
  }
}
