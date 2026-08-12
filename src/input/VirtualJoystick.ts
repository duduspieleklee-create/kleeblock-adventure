import Phaser from 'phaser';
import { PlayerInputController } from './PlayerInputController';
import { getUIAnchors, TOUCH_TARGET_MIN } from '../ui/UIScale';

/**
 * Optional bottom-left virtual joystick.
 * Feeds the same path as keyboard: setMoveVector → cancel tap-to-move.
 * Feature-flagged; hidden when disabled.
 */
export class VirtualJoystick {
  private readonly scene: Phaser.Scene;
  private readonly inputController: PlayerInputController;
  private readonly base: Phaser.GameObjects.Graphics;
  private readonly knob: Phaser.GameObjects.Graphics;
  private readonly radius: number;
  private active = false;
  private pointerId: number | null = null;
  private originX = 0;
  private originY = 0;
  private enabled = false;

  constructor(scene: Phaser.Scene, inputController: PlayerInputController, radius = 56) {
    this.scene = scene;
    this.inputController = inputController;
    this.radius = radius;

    this.base = scene.add.graphics().setScrollFactor(0).setDepth(10015).setVisible(false);
    this.knob = scene.add.graphics().setScrollFactor(0).setDepth(10016).setVisible(false);

    scene.input.on('pointerdown', this.onDown, this);
    scene.input.on('pointermove', this.onMove, this);
    scene.input.on('pointerup', this.onUp, this);
    scene.scale.on(Phaser.Scale.Events.RESIZE, this.relayout, this);
    this.relayout();
  }

  setEnabled(value: boolean): void {
    this.enabled = value;
    this.base.setVisible(value);
    this.knob.setVisible(value);
    if (!value) {
      this.reset();
    } else {
      this.drawIdle();
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  private relayout = (): void => {
    const { width, height } = this.scene.scale.gameSize;
    const anchors = getUIAnchors(width, height);
    this.originX = Math.round(anchors.bottomLeft.x + this.radius);
    this.originY = Math.round(anchors.bottomLeft.y - this.radius - 8);
    if (this.enabled && !this.active) this.drawIdle();
  };

  private drawIdle(): void {
    this.base.clear();
    this.base.fillStyle(0x1a1a2e, 0.45);
    this.base.fillCircle(this.originX, this.originY, this.radius);
    this.base.lineStyle(2, 0x5a8ab0, 0.8);
    this.base.strokeCircle(this.originX, this.originY, this.radius);

    this.knob.clear();
    this.knob.fillStyle(0x88ccff, 0.85);
    this.knob.fillCircle(this.originX, this.originY, Math.max(TOUCH_TARGET_MIN / 2, 18));
  }

  private onDown(pointer: Phaser.Input.Pointer): void {
    if (!this.enabled || this.pointerId !== null) return;

    const dx = pointer.x - this.originX;
    const dy = pointer.y - this.originY;
    // Only capture if near the joystick base (avoid stealing world taps)
    if (Math.hypot(dx, dy) > this.radius * 1.35) return;

    this.pointerId = pointer.id;
    this.active = true;
    this.updateKnob(pointer.x, pointer.y);
  }

  private onMove(pointer: Phaser.Input.Pointer): void {
    if (!this.enabled || !this.active || pointer.id !== this.pointerId) return;
    this.updateKnob(pointer.x, pointer.y);
  }

  private onUp(pointer: Phaser.Input.Pointer): void {
    if (pointer.id !== this.pointerId) return;
    this.reset();
  }

  private updateKnob(px: number, py: number): void {
    let dx = px - this.originX;
    let dy = py - this.originY;
    const len = Math.hypot(dx, dy) || 1;
    const max = this.radius - 12;
    if (len > max) {
      dx = (dx / len) * max;
      dy = (dy / len) * max;
    }

    this.knob.clear();
    this.knob.fillStyle(0x88ccff, 0.95);
    this.knob.fillCircle(this.originX + dx, this.originY + dy, 18);

    const nx = dx / max;
    const ny = dy / max;
    this.inputController.setMoveVector(nx, ny);
  }

  private reset(): void {
    this.active = false;
    this.pointerId = null;
    this.inputController.setMoveVector(0, 0);
    if (this.enabled) this.drawIdle();
  }

  shutdown(): void {
    this.scene.input.off('pointerdown', this.onDown, this);
    this.scene.input.off('pointermove', this.onMove, this);
    this.scene.input.off('pointerup', this.onUp, this);
    this.scene.scale.off(Phaser.Scale.Events.RESIZE, this.relayout, this);
    this.base.destroy();
    this.knob.destroy();
  }
}
