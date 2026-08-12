import Phaser from 'phaser';
import { PlayerInputController } from './PlayerInputController';
import { PlayerMovementController } from './PlayerMovementController';
import { DesktopKeyboardController } from './DesktopKeyboardController';
import { PointerController, InteractiveTarget, PointerControllerOptions } from './PointerController';
import { DeviceDetector } from './DeviceDetector';

export type InputManagerConfig = {
  player: Phaser.Physics.Arcade.Sprite;
  speed?: number;
  pointer?: PointerControllerOptions;
};

/**
 * Single entry point for scene input wiring.
 * Keyboard, mouse, and touch all feed PlayerInputController.
 */
export class InputManager {
  readonly inputController: PlayerInputController;
  readonly movement: PlayerMovementController;
  readonly device: {
    touch: boolean;
    mouse: boolean;
    hybrid: boolean;
  };

  private readonly keyboard: DesktopKeyboardController;
  private readonly pointer: PointerController;

  constructor(scene: Phaser.Scene, config: InputManagerConfig) {
    this.inputController = new PlayerInputController();
    this.movement = new PlayerMovementController(
      this.inputController,
      config.player,
      config.speed ?? 80,
    );

    this.device = {
      touch: DeviceDetector.isTouchCapable(scene.game),
      mouse: DeviceDetector.supportsMouse(scene.game),
      hybrid: DeviceDetector.isHybrid(scene.game),
    };

    this.keyboard = new DesktopKeyboardController(scene, this.inputController);
    this.pointer = new PointerController(scene, this.inputController, config.pointer ?? {});

    if (import.meta.env.DEV) {
      console.log('[InputManager] device:', this.device);
    }
  }

  /** Refresh continuous keyboard vector then apply movement. */
  update(): { vx: number; vy: number; isMoving: boolean } {
    this.keyboard.update();
    return this.movement.update();
  }

  setPointerEnabled(enabled: boolean): void {
    this.pointer.setEnabled(enabled);
  }

  /** Helper for scenes that expose NPC lists as InteractiveTarget[]. */
  static targetsFromSprites(
    sprites: Array<{ dialogueId?: string; x: number; y: number }>,
    idKey: 'dialogueId' = 'dialogueId',
    radius = 32,
  ): InteractiveTarget[] {
    return sprites.map((s, i) => ({
      id: String((s as Record<string, unknown>)[idKey] ?? `target_${i}`),
      x: s.x,
      y: s.y,
      radius,
    }));
  }

  shutdown(): void {
    this.keyboard.shutdown();
    this.pointer.shutdown();
    this.inputController.cancelMovement();
  }
}
