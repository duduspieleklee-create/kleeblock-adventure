import Phaser from 'phaser';
import { PlayerInputController } from './PlayerInputController';
import { InputEvents, InteractTargetPayload } from './InputEvents';
import { DestinationMarker } from './DestinationMarker';

export type InteractiveTarget = {
  id: string;
  x: number;
  y: number;
  radius: number;
};

export type PointerControllerOptions = {
  isPointerOnUI?: (pointer: Phaser.Input.Pointer) => boolean;
  isWalkable?: (worldX: number, worldY: number) => boolean;
  findTargets?: () => InteractiveTarget[];
  interactPickRadius?: number;
  /** Block world movement while dialogue/modal is open. */
  isWorldInputBlocked?: () => boolean;
  /** Show/hide destination marker. */
  destinationMarker?: DestinationMarker;
  /** Stop this far from interact targets (move-then-interact). */
  interactStopDistance?: number;
};

/**
 * Shared mouse + touch path:
 * pointerdown → UI filter → interact target → walkable destination.
 */
export class PointerController {
  private readonly scene: Phaser.Scene;
  private readonly inputController: PlayerInputController;
  private readonly eventTarget: Phaser.Events.EventEmitter;
  private readonly options: PointerControllerOptions;
  private readonly interactPickRadius: number;
  private readonly interactStopDistance: number;
  private enabled = true;
  private downPos: { x: number; y: number } | null = null;

  constructor(
    scene: Phaser.Scene,
    inputController: PlayerInputController,
    options: PointerControllerOptions = {},
    eventTarget: Phaser.Events.EventEmitter = scene.events,
  ) {
    this.scene = scene;
    this.inputController = inputController;
    this.eventTarget = eventTarget;
    this.options = options;
    this.interactPickRadius = options.interactPickRadius ?? 40;
    this.interactStopDistance = options.interactStopDistance ?? 28;

    this.scene.input.on('pointerdown', this.onPointerDown, this);
    this.scene.input.on('pointerup', this.onPointerUp, this);
  }

  setEnabled(value: boolean): void {
    this.enabled = value;
  }

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    if (!this.enabled) return;
    this.downPos = { x: pointer.x, y: pointer.y };
  }

  private onPointerUp(pointer: Phaser.Input.Pointer): void {
    if (!this.enabled) return;

    // Ignore drags (joystick / accidental swipes)
    if (this.downPos) {
      const drag = Math.hypot(pointer.x - this.downPos.x, pointer.y - this.downPos.y);
      this.downPos = null;
      if (drag > 18) return;
    }

    if (this.options.isWorldInputBlocked?.()) {
      return;
    }

    if (this.options.isPointerOnUI?.(pointer)) {
      return;
    }

    const worldPoint = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);

    const target = this.findNearestTarget(worldPoint.x, worldPoint.y);
    if (target) {
      const payload: InteractTargetPayload = {
        targetId: target.id,
        x: target.x,
        y: target.y,
      };
      this.eventTarget.emit(InputEvents.INTERACT_TARGET, payload);

      // Approach point short of the NPC so we don't stand on top of them
      const angle = Phaser.Math.Angle.Between(worldPoint.x, worldPoint.y, target.x, target.y);
      // Use player-less approach: stop short along vector from click toward target
      const stopX = target.x - Math.cos(angle) * this.interactStopDistance;
      const stopY = target.y - Math.sin(angle) * this.interactStopDistance;

      if (this.options.isWalkable?.(stopX, stopY) !== false) {
        this.inputController.moveToPoint(stopX, stopY);
        this.options.destinationMarker?.show(stopX, stopY);
      } else if (this.options.isWalkable?.(target.x, target.y) !== false) {
        this.inputController.moveToPoint(target.x, target.y);
        this.options.destinationMarker?.show(target.x, target.y);
      }
      return;
    }

    if (this.options.isWalkable && !this.options.isWalkable(worldPoint.x, worldPoint.y)) {
      this.options.destinationMarker?.hide();
      return;
    }

    this.inputController.moveToPoint(worldPoint.x, worldPoint.y);
    this.options.destinationMarker?.show(worldPoint.x, worldPoint.y);
  }

  private findNearestTarget(worldX: number, worldY: number): InteractiveTarget | null {
    const targets = this.options.findTargets?.() ?? [];
    let best: InteractiveTarget | null = null;
    let bestDist = Infinity;

    for (const t of targets) {
      const d = Phaser.Math.Distance.Between(worldX, worldY, t.x, t.y);
      const limit = Math.max(t.radius, this.interactPickRadius);
      if (d <= limit && d < bestDist) {
        bestDist = d;
        best = t;
      }
    }

    return best;
  }

  shutdown(): void {
    this.scene.input.off('pointerdown', this.onPointerDown, this);
    this.scene.input.off('pointerup', this.onPointerUp, this);
  }
}
