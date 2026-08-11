import Phaser from 'phaser';

export class SunnysidePlayer extends Phaser.Physics.Arcade.Sprite {
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd: {
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
  };
  private speed = 80;
  private lastDir: 'down' | 'side' | 'up' = 'down';

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'ss_idle', 1);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCollideWorldBounds(true);
    this.setScale(0.6);
    this.setOrigin(0.5, 0.5);
    this.setDepth(10);

    // Compact 16x16 hitbox centered on sprite
    this.body.setSize(16, 16);
    this.body.setOffset(40, 48);

    this.createAnimations(scene);

    this.cursors = scene.input.keyboard!.createCursorKeys();
    const keyboard = scene.input.keyboard!;
    this.wasd = {
      up: keyboard.addKey('W'),
      down: keyboard.addKey('S'),
      left: keyboard.addKey('A'),
      right: keyboard.addKey('D'),
    };
  }

  private createAnimations(scene: Phaser.Scene): void {
    // Idle strip9: 96px frames × 9 = 864px
    scene.anims.create({
      key: 'ss_idle_down',
      frames: scene.anims.generateFrameNumbers('ss_idle', { start: 1, end: 7, increment: 2 }),
      frameRate: 6, repeat: -1,
    });
    scene.anims.create({
      key: 'ss_idle_side',
      frames: scene.anims.generateFrameNumbers('ss_idle', { start: 0, end: 8, increment: 4 }),
      frameRate: 6, repeat: -1,
    });
    scene.anims.create({
      key: 'ss_idle_up',
      frames: scene.anims.generateFrameNumbers('ss_idle', { start: 2, end: 6, increment: 2 }),
      frameRate: 6, repeat: -1,
    });

    // Walk strip8: 96px frames × 8 = 768px
    scene.anims.create({
      key: 'ss_walk_down',
      frames: scene.anims.generateFrameNumbers('ss_walk', { start: 1, end: 7, increment: 2 }),
      frameRate: 10, repeat: -1,
    });
    scene.anims.create({
      key: 'ss_walk_side',
      frames: scene.anims.generateFrameNumbers('ss_walk', { start: 0, end: 4, increment: 4 }),
      frameRate: 10, repeat: -1,
    });
    scene.anims.create({
      key: 'ss_walk_up',
      frames: scene.anims.generateFrameNumbers('ss_walk', { start: 2, end: 6, increment: 2 }),
      frameRate: 10, repeat: -1,
    });

    // Run strip8
    scene.anims.create({
      key: 'ss_run_down',
      frames: scene.anims.generateFrameNumbers('ss_run', { start: 1, end: 7, increment: 2 }),
      frameRate: 14, repeat: -1,
    });
    scene.anims.create({
      key: 'ss_run_side',
      frames: scene.anims.generateFrameNumbers('ss_run', { start: 0, end: 4, increment: 4 }),
      frameRate: 14, repeat: -1,
    });
    scene.anims.create({
      key: 'ss_run_up',
      frames: scene.anims.generateFrameNumbers('ss_run', { start: 2, end: 6, increment: 2 }),
      frameRate: 14, repeat: -1,
    });
  }

  update(): void {
    const movingLeft  = this.cursors.left.isDown  || this.wasd.left.isDown;
    const movingRight = this.cursors.right.isDown || this.wasd.right.isDown;
    const movingUp    = this.cursors.up.isDown    || this.wasd.up.isDown;
    const movingDown  = this.cursors.down.isDown  || this.wasd.down.isDown;

    let vx = (movingLeft ? -1 : 0) + (movingRight ? 1 : 0);
    let vy = (movingUp ? -1 : 0)   + (movingDown ? 1 : 0);

    if (vx !== 0 && vy !== 0) {
      this.setVelocity(vx * this.speed * 0.707, vy * this.speed * 0.707);
    } else {
      this.setVelocity(vx * this.speed, vy * this.speed);
    }

    const isMoving = vx !== 0 || vy !== 0;

    if (vy > 0) this.lastDir = 'down';
    else if (vy < 0) this.lastDir = 'up';
    else if (vx !== 0) this.lastDir = 'side';

    if (vx < 0) this.setFlipX(false);
    if (vx > 0) this.setFlipX(true);

    if (isMoving) {
      const anim = `ss_walk_${this.lastDir}`;
      if (this.anims.currentAnim?.key !== anim) this.anims.play(anim);
    } else {
      const anim = `ss_idle_${this.lastDir}`;
      if (this.anims.currentAnim?.key !== anim) this.anims.play(anim);
    }
  }
}