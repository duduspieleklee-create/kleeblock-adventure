import Phaser from 'phaser';

export class Player extends Phaser.Physics.Arcade.Sprite {
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd: {
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
  };
  private speed = 120;
  private lastDir: 'down' | 'side' | 'up' = 'down';

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'player_idle_down');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCollideWorldBounds(true);
    this.setFrame(0);

    // Create animations for each direction
    this.createAnimations(scene);

    // Input
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
    // Down
    scene.anims.create({ key: 'idle_down',  frames: scene.anims.generateFrameNumbers('player_idle_down', { start: 0, end: 15 }), frameRate: 8, repeat: -1 });
    scene.anims.create({ key: 'walk_down',  frames: scene.anims.generateFrameNumbers('player_walk_down', { start: 0, end: 23 }), frameRate: 12, repeat: -1 });
    scene.anims.create({ key: 'run_down',   frames: scene.anims.generateFrameNumbers('player_run_down', { start: 0, end: 23 }), frameRate: 16, repeat: -1 });

    // Up
    scene.anims.create({ key: 'idle_up',    frames: scene.anims.generateFrameNumbers('player_idle_up', { start: 0, end: 15 }), frameRate: 8, repeat: -1 });
    scene.anims.create({ key: 'walk_up',    frames: scene.anims.generateFrameNumbers('player_walk_up', { start: 0, end: 23 }), frameRate: 12, repeat: -1 });
    scene.anims.create({ key: 'run_up',     frames: scene.anims.generateFrameNumbers('player_run_up', { start: 0, end: 23 }), frameRate: 16, repeat: -1 });

    // Side
    scene.anims.create({ key: 'idle_side',  frames: scene.anims.generateFrameNumbers('player_idle_side', { start: 0, end: 15 }), frameRate: 8, repeat: -1 });
    scene.anims.create({ key: 'walk_side',  frames: scene.anims.generateFrameNumbers('player_walk_side', { start: 0, end: 23 }), frameRate: 12, repeat: -1 });
    scene.anims.create({ key: 'run_side',   frames: scene.anims.generateFrameNumbers('player_run_side', { start: 0, end: 23 }), frameRate: 16, repeat: -1 });
  }

  update(): void {
    const movingLeft  = this.cursors.left.isDown  || this.wasd.left.isDown;
    const movingRight = this.cursors.right.isDown || this.wasd.right.isDown;
    const movingUp    = this.cursors.up.isDown    || this.wasd.up.isDown;
    const movingDown  = this.cursors.down.isDown  || this.wasd.down.isDown;

    let velocityX = (movingLeft ? -1 : 0) + (movingRight ? 1 : 0);
    let velocityY = (movingUp ? -1 : 0)   + (movingDown ? 1 : 0);

    // Diagonal normalization
    if (velocityX !== 0 && velocityY !== 0) {
      this.setVelocity(velocityX * this.speed * 0.707, velocityY * this.speed * 0.707);
    } else {
      this.setVelocity(velocityX * this.speed, velocityY * this.speed);
    }

    // Direction & animation
    const isMoving = velocityX !== 0 || velocityY !== 0;

    if (velocityY > 0) this.lastDir = 'down';
    else if (velocityY < 0) this.lastDir = 'up';
    else if (velocityX !== 0) this.lastDir = 'side';

    // Flip sprite for left movement
    if (velocityX < 0) this.setFlipX(true);
    if (velocityX > 0) this.setFlipX(false);

    // Set animation
    if (isMoving) {
      const anim = `walk_${this.lastDir}`;
      if (this.anims.currentAnim?.key !== anim) this.anims.play(anim);
    } else {
      const anim = `idle_${this.lastDir}`;
      if (this.anims.currentAnim?.key !== anim) this.anims.play(anim);
    }
  }
}