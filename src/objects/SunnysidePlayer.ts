import Phaser from 'phaser';
import { applyCharacterBodyWhenReady } from './characterBody';

/**
 * Player sprite + animations.
 * Movement velocity is applied by PlayerMovementController via InputManager.
 * Call applyMovementResult() each frame with the movement controller output.
 */
export class SunnysidePlayer extends Phaser.Physics.Arcade.Sprite {
  private lastDir: 'down' | 'side' | 'up' = 'down';

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'ss_idle', 1);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCollideWorldBounds(true);
    this.setScale(0.6);
    this.setOrigin(0.5, 0.5);

    applyCharacterBodyWhenReady(scene, this);
    this.createAnimations(scene);
  }

  private createAnimations(scene: Phaser.Scene): void {
    // Strip layout: frames alternate directions L→D→R→D→L...
    const idleDown = [1, 3, 5, 7];
    const idleSide = [0, 4, 8];
    const idleUp = [2, 6];
    const walkDown = [1, 3, 5, 7];
    const walkSide = [0, 4];
    const walkUp = [2, 6];

    scene.anims.create({
      key: 'ss_idle_down',
      frames: idleDown.map((f) => ({ key: 'ss_idle', frame: f })),
      frameRate: 6,
      repeat: -1,
    });
    scene.anims.create({
      key: 'ss_idle_side',
      frames: idleSide.map((f) => ({ key: 'ss_idle', frame: f })),
      frameRate: 6,
      repeat: -1,
    });
    scene.anims.create({
      key: 'ss_idle_up',
      frames: idleUp.map((f) => ({ key: 'ss_idle', frame: f })),
      frameRate: 6,
      repeat: -1,
    });

    scene.anims.create({
      key: 'ss_walk_down',
      frames: walkDown.map((f) => ({ key: 'ss_walk', frame: f })),
      frameRate: 10,
      repeat: -1,
    });
    scene.anims.create({
      key: 'ss_walk_side',
      frames: walkSide.map((f) => ({ key: 'ss_walk', frame: f })),
      frameRate: 10,
      repeat: -1,
    });
    scene.anims.create({
      key: 'ss_walk_up',
      frames: walkUp.map((f) => ({ key: 'ss_walk', frame: f })),
      frameRate: 10,
      repeat: -1,
    });

    scene.anims.create({
      key: 'ss_run_down',
      frames: walkDown.map((f) => ({ key: 'ss_run', frame: f })),
      frameRate: 14,
      repeat: -1,
    });
    scene.anims.create({
      key: 'ss_run_side',
      frames: walkSide.map((f) => ({ key: 'ss_run', frame: f })),
      frameRate: 14,
      repeat: -1,
    });
    scene.anims.create({
      key: 'ss_run_up',
      frames: walkUp.map((f) => ({ key: 'ss_run', frame: f })),
      frameRate: 14,
      repeat: -1,
    });
  }

  /**
   * Apply animation from movement controller result.
   * Velocity is already set by PlayerMovementController.
   */
  applyMovementResult(result: { vx: number; vy: number; isMoving: boolean }): void {
    const { vx, vy, isMoving } = result;

    if (vy > 0.3) this.lastDir = 'down';
    else if (vy < -0.3) this.lastDir = 'up';
    else if (vx !== 0) this.lastDir = 'side';

    if (vx < -0.05) this.setFlipX(true);
    if (vx > 0.05) this.setFlipX(false);

    if (isMoving) {
      const anim = `ss_walk_${this.lastDir}`;
      if (this.anims.currentAnim?.key !== anim) this.anims.play(anim);
    } else {
      const anim = `ss_idle_${this.lastDir}`;
      if (this.anims.currentAnim?.key !== anim) this.anims.play(anim);
    }
  }

  /** @deprecated Use applyMovementResult via InputManager */
  update(): void {
    // no-op: movement driven by InputManager
  }
}
