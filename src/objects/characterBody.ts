import Phaser from 'phaser';

/**
 * SunnySide character sheets are 96×64; sprites use scale 0.6.
 * Arcade scales the body with the GameObject, so source size 18×12
 * → ~10.8×7.2 world units (narrower than a 16px tile).
 *
 * Offset places the box on the feet so the torso can overlap props
 * while only the feet block against tile collision.
 */
export const CHARACTER_BODY = {
  width: 18,
  height: 12,
  // Centered horizontally; near bottom of 96×64 frame
  offsetX: 39,
  offsetY: 46,
} as const;

/** Apply the standard feet hitbox to a physics sprite. Safe to call more than once. */
export function applyCharacterBody(
  sprite: Phaser.Physics.Arcade.Sprite,
): void {
  const body = sprite.body;
  if (!body || !(body instanceof Phaser.Physics.Arcade.Body)) return;

  body.updateBounds();
  body.setSize(CHARACTER_BODY.width, CHARACTER_BODY.height);
  body.setOffset(CHARACTER_BODY.offsetX, CHARACTER_BODY.offsetY);
}

/**
 * Apply body now and once on the next UPDATE (covers cases where the
 * body is not fully ready in the constructor).
 */
export function applyCharacterBodyWhenReady(
  scene: Phaser.Scene,
  sprite: Phaser.Physics.Arcade.Sprite,
): void {
  applyCharacterBody(sprite);
  scene.events.once(Phaser.Scenes.Events.UPDATE, () => {
    applyCharacterBody(sprite);
  });
}
