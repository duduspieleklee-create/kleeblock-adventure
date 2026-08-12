import Phaser from 'phaser';
import { PlayerInputController } from './PlayerInputController';
import { InputEvents, InteractTargetPayload } from './InputEvents';

export type InteractiveTarget = {
  id: string;
  x: number;
  y: number;
  /** World-space hit radius for pointer prioritization. */
  radius: number;
};

export type PointerControllerOptions = {
  /** Return true if the pointer is over screen-space UI (blocks world input). */
  isPointerOnUI?: (pointer: Phaser.Input.Pointer) => boolean;
  /** Return true if the world point is walkable. */
  isWalkable?: (worldX: number, worldY: number) => boolean;
  /** Interactive world targets (NPCs, items, etc.). */
  findTargets?: () => InteractiveTarget[];
  /** Max distance from pointer to count as targeting an interactive. */
  interactPickRadius?: number;
};

/**
 * Shared mouse + touch path:
 * pointerdown → UI filter → interact target → walkable destination.
 * Uses camera.getWorldPoint so Scale.FIT is handled correctly.
 */
export class PointerController {
  private readonly scene: Phaser.Scene;
  private readonly inputController: PlayerInputController;
  private readonly eventTarget: Phaser.Events.EventEmitter;
  private readonly options: PointerControllerOptions;
  private readonly interactPickRadius: number;
  private enabled = true;

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

    this.scene.input.on('pointerdown', this.onPointerDown, this);
  }

  setEnabled(value: boolean): void {
    this.enabled = value;
  }

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    if (!this.enabled) return;

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

      // Move toward target if far; InteractionManager still handles E/proximity.
      const dist = Phaser.Math.Distance.Between(
        // approximate: use camera follow target via world; scene will refine later
        worldPoint.x,
        worldPoint.y,
        target.x,
        target.y,
      );
      // Always set a destination near the target so the player can walk there.
      if (this.options.isWalkable?.(target.x, target.y) !== false) {
        this.inputController.moveToPoint(target.x, target.y);
      }
      void dist;
      return;
    }

    if (this.options.isWalkable && !this.options.isWalkable(worldPoint.x, worldPoint.y)) {
      return;
    }

    this.inputController.moveToPoint(worldPoint.x, worldPoint.y);
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
  }
}
