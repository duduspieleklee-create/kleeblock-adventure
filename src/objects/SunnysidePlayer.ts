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

    // Defer body sizing until the body is fully ready (next tick)
    scene.events.once(Phaser.Scenes.Events.UPDATE, () => {
      if (this.body && this.body instanceof Phaser.Physics.Arcade.Body) {
        // 16x16 hitbox centered on the scaled sprite (96×64 @ 0.6 = 57.6×38.4)
        this.body.updateBounds();
        this.body.setSize(16, 16);
        this.body.setOffset(28, 22);
      }
    });

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
    // Strip layout: frames alternate directions L→D→R→D→L...
    // Idle strip9 (frames 0-8): L(0) D(1) R(2) D(3) L(4) D(5) R(6) D(7) L(8)
    // Walk strip8 (frames 0-7): L(0) D(1) R(2) D(3) L(4) D(5) R(6) D(7)
    // Run strip8  (frames 0-7): same layout as walk

    const idleDown  = [1, 3, 5, 7];
    const idleSide  = [0, 4, 8];
    const idleUp    = [2, 6];
    const walkDown  = [1, 3, 5, 7];
    const walkSide  = [0, 4];
    const walkUp    = [2, 6];

    // Idle
    scene.anims.create({ key: 'ss_idle_down', frames: idleDown.map(f => ({ key: 'ss_idle', frame: f })), frameRate: 6, repeat: -1 });
    scene.anims.create({ key: 'ss_idle_side', frames: idleSide.map(f => ({ key: 'ss_idle', frame: f })), frameRate: 6, repeat: -1 });
    scene.anims.create({ key: 'ss_idle_up',   frames: idleUp.map(f => ({ key: 'ss_idle', frame: f })),   frameRate: 6, repeat: -1 });

    // Walk
    scene.anims.create({ key: 'ss_walk_down', frames: walkDown.map(f => ({ key: 'ss_walk', frame: f })), frameRate: 10, repeat: -1 });
    scene.anims.create({ key: 'ss_walk_side', frames: walkSide.map(f => ({ key: 'ss_walk', frame: f })), frameRate: 10, repeat: -1 });
    scene.anims.create({ key: 'ss_walk_up',   frames: walkUp.map(f => ({ key: 'ss_walk', frame: f })),   frameRate: 10, repeat: -1 });

    // Run
    scene.anims.create({ key: 'ss_run_down', frames: walkDown.map(f => ({ key: 'ss_run', frame: f })), frameRate: 14, repeat: -1 });
    scene.anims.create({ key: 'ss_run_side', frames: walkSide.map(f => ({ key: 'ss_run', frame: f })), frameRate: 14, repeat: -1 });
    scene.anims.create({ key: 'ss_run_up',   frames: walkUp.map(f => ({ key: 'ss_run', frame: f })),   frameRate: 14, repeat: -1 });
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

    // Flip: sprite faces right by default, so flip when moving left
    if (vx < 0) this.setFlipX(true);
    if (vx > 0) this.setFlipX(false);

    if (isMoving) {
      const anim = `ss_walk_${this.lastDir}`;
      if (this.anims.currentAnim?.key !== anim) this.anims.play(anim);
    } else {
      const anim = `ss_idle_${this.lastDir}`;
      if (this.anims.currentAnim?.key !== anim) this.anims.play(anim);
    }
  }
}