import Phaser from 'phaser';
import { PlayerInputController } from './PlayerInputController';
import { DestinationMarker } from './DestinationMarker';

const ARRIVAL_THRESHOLD = 8;

/**
 * Applies PlayerInputController state to an Arcade Physics sprite.
 */
export class PlayerMovementController {
  private readonly input: PlayerInputController;
  private readonly player: Phaser.Physics.Arcade.Sprite;
  private readonly speed: number;
  private destinationMarker?: DestinationMarker;

  constructor(
    input: PlayerInputController,
    player: Phaser.Physics.Arcade.Sprite,
    speed = 80,
  ) {
    this.input = input;
    this.player = player;
    this.speed = speed;
  }

  setDestinationMarker(marker: DestinationMarker | undefined): void {
    this.destinationMarker = marker;
  }

  update(): { vx: number; vy: number; isMoving: boolean } {
    const direction = this.input.getMoveVector();
    const destination = this.input.getDestination();

    if (direction.lengthSq() > 0) {
      direction.normalize();
      this.player.setVelocity(direction.x * this.speed, direction.y * this.speed);
      // Keyboard / joystick cancels destination marker
      this.destinationMarker?.hide();
      return { vx: direction.x, vy: direction.y, isMoving: true };
    }

    if (destination) {
      const distance = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        destination.x,
        destination.y,
      );

      if (distance <= ARRIVAL_THRESHOLD) {
        this.player.setVelocity(0, 0);
        this.input.clearDestination();
        this.destinationMarker?.hide();
        return { vx: 0, vy: 0, isMoving: false };
      }

      const angle = Phaser.Math.Angle.Between(
        this.player.x,
        this.player.y,
        destination.x,
        destination.y,
      );

      const vx = Math.cos(angle);
      const vy = Math.sin(angle);
      this.player.setVelocity(vx * this.speed, vy * this.speed);
      return { vx, vy, isMoving: true };
    }

    this.player.setVelocity(0, 0);
    return { vx: 0, vy: 0, isMoving: false };
  }
}
