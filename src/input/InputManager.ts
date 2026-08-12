import Phaser from 'phaser';
import { PlayerInputController } from './PlayerInputController';
import { PlayerMovementController } from './PlayerMovementController';
import { DesktopKeyboardController } from './DesktopKeyboardController';
import {
  PointerController,
  InteractiveTarget,
  PointerControllerOptions,
} from './PointerController';
import { DestinationMarker } from './DestinationMarker';
import { VirtualJoystick } from './VirtualJoystick';
import { DeviceDetector } from './DeviceDetector';

export type InputManagerConfig = {
  player: Phaser.Physics.Arcade.Sprite;
  speed?: number;
  pointer?: PointerControllerOptions;
  /** Enable virtual joystick (default: false). */
  enableJoystick?: boolean;
};

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
  private readonly destinationMarker: DestinationMarker;
  private readonly joystick?: VirtualJoystick;

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

    this.destinationMarker = new DestinationMarker(scene);
    this.movement.setDestinationMarker(this.destinationMarker);

    this.keyboard = new DesktopKeyboardController(scene, this.inputController);

    const pointerOpts: PointerControllerOptions = {
      ...(config.pointer ?? {}),
      destinationMarker: this.destinationMarker,
    };
    this.pointer = new PointerController(scene, this.inputController, pointerOpts);

    const wantJoystick = config.enableJoystick === true;
    if (wantJoystick) {
      this.joystick = new VirtualJoystick(scene, this.inputController);
      this.joystick.setEnabled(true);
    }

    if (import.meta.env.DEV) {
      console.log('[InputManager] device:', this.device, 'joystick:', wantJoystick);
    }
  }

  update(): { vx: number; vy: number; isMoving: boolean } {
    this.keyboard.update();
    return this.movement.update();
  }

  setPointerEnabled(enabled: boolean): void {
    this.pointer.setEnabled(enabled);
  }

  setJoystickEnabled(enabled: boolean): void {
    this.joystick?.setEnabled(enabled);
  }

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
    this.joystick?.shutdown();
    this.destinationMarker.destroy();
    this.inputController.cancelMovement();
  }
}
