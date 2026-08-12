import Phaser from 'phaser';

const TEXTURE_KEY = 'collectible_supply';

/** Ensure a simple pixel supply crate texture exists (no external asset required). */
export function ensureCollectibleTexture(scene: Phaser.Scene): void {
  if (scene.textures.exists(TEXTURE_KEY)) return;

  const g = scene.make.graphics({ x: 0, y: 0 });
  // 16×16 crate
  g.fillStyle(0xc4a35a, 1);
  g.fillRect(1, 1, 14, 14);
  g.lineStyle(1, 0x5c4033, 1);
  g.strokeRect(1, 1, 14, 14);
  g.lineStyle(1, 0x8b6914, 1);
  g.lineBetween(1, 8, 15, 8);
  g.lineBetween(8, 1, 8, 15);
  g.fillStyle(0xe8d5a3, 1);
  g.fillRect(5, 5, 6, 6);
  g.generateTexture(TEXTURE_KEY, 16, 16);
  g.destroy();
}

/**
 * Quest collectible. Immovable, no gravity; collected via overlap.
 */
export class CollectibleItem extends Phaser.Physics.Arcade.Sprite {
  public readonly itemId: string;
  public readonly questId: string;
  private collected = false;
  private bobTween?: Phaser.Tweens.Tween;

  constructor(scene: Phaser.Scene, x: number, y: number, itemKey: string, questId: string) {
    ensureCollectibleTexture(scene);
    super(scene, Math.round(x), Math.round(y), TEXTURE_KEY);

    this.itemId = itemKey;
    this.questId = questId;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setImmovable(true);
    this.setDepth(12);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setSize(12, 12);
    body.setOffset(2, 2);

    this.bobTween = scene.tweens.add({
      targets: this,
      y: this.y - 3,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  isCollected(): boolean {
    return this.collected;
  }

  /** Play feedback and remove from world. Safe to call once. */
  collect(): boolean {
    if (this.collected) return false;
    this.collected = true;

    this.bobTween?.stop();
    this.bobTween = undefined;

    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scale: 1.4,
      duration: 180,
      onComplete: () => {
        this.destroy();
      },
    });

    return true;
  }

  destroy(fromScene?: boolean): void {
    this.bobTween?.stop();
    super.destroy(fromScene);
  }
}
