import Phaser from 'phaser';

/**
 * Shared command contract — every input device produces these intents.
 * The player movement system consumes them; it never reads raw devices.
 */
export type PlayerCommand =
  | { type: 'moveVector'; x: number; y: number }
  | { type: 'moveToPoint'; x: number; y: number }
  | { type: 'interact' }
  | { type: 'interactTarget'; targetId: string }
  | { type: 'openQuestbook' }
  | { type: 'cancelMovement' };

/**
 * Platform-independent input state.
 * Keyboard / joystick → continuous vector.
 * Mouse / touch → destination point.
 * Direct movement cancels tap-to-move.
 */
export class PlayerInputController {
  private moveVector = new Phaser.Math.Vector2(0, 0);
  private destination: Phaser.Math.Vector2 | null = null;

  /** Continuous movement (WASD, arrows, joystick). Cancels destination. */
  setMoveVector(x: number, y: number): void {
    this.moveVector.set(x, y);
    if (x !== 0 || y !== 0) {
      this.destination = null;
    }
  }

  /** Point-and-click / tap-to-move. Clears continuous vector. */
  moveToPoint(x: number, y: number): void {
    this.destination = new Phaser.Math.Vector2(x, y);
    this.moveVector.set(0, 0);
  }

  clearDestination(): void {
    this.destination = null;
  }

  cancelMovement(): void {
    this.moveVector.set(0, 0);
    this.destination = null;
  }

  getMoveVector(): Phaser.Math.Vector2 {
    return this.moveVector.clone();
  }

  getDestination(): Phaser.Math.Vector2 | null {
    return this.destination?.clone() ?? null;
  }

  hasDestination(): boolean {
    return this.destination !== null;
  }

  isMovingIntent(): boolean {
    return this.moveVector.lengthSq() > 0 || this.destination !== null;
  }
}
