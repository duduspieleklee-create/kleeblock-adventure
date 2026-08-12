import Phaser from 'phaser';

export type ScenerySpec = {
  x: number;
  y: number;
  width: number;
  height: number;
  /** Optional label for debug */
  name?: string;
};

/**
 * Invisible static body for scenery (tree trunks, walls, rocks).
 * Visual art stays on tile/object layers; only this narrow body blocks.
 */
export function createSceneryCollider(
  scene: Phaser.Scene,
  group: Phaser.Physics.Arcade.StaticGroup,
  spec: ScenerySpec,
): Phaser.GameObjects.Rectangle {
  const rect = scene.add.rectangle(
    Math.round(spec.x),
    Math.round(spec.y),
    Math.max(2, Math.round(spec.width)),
    Math.max(2, Math.round(spec.height)),
    0x000000,
    0,
  );
  rect.setVisible(false);
  scene.physics.add.existing(rect, true);
  group.add(rect);
  return rect;
}

/**
 * Build scenery group from Tiled object layer "Scenery" (rectangles),
 * plus optional hardcoded trunk specs for maps without that layer yet.
 */
export function buildSceneryColliders(
  scene: Phaser.Scene,
  map: Phaser.Tilemaps.Tilemap,
  defaults: ScenerySpec[] = [],
): Phaser.Physics.Arcade.StaticGroup {
  const group = scene.physics.add.staticGroup();

  const layer = map.getObjectLayer('Scenery');
  if (layer) {
    for (const obj of layer.objects) {
      const w = obj.width && obj.width > 0 ? obj.width : 12;
      const h = obj.height && obj.height > 0 ? obj.height : 10;
      // Tiled rectangle origin is top-left; Arcade rectangle is center
      const cx = (obj.x ?? 0) + w / 2;
      const cy = (obj.y ?? 0) + h / 2;
      createSceneryCollider(scene, group, {
        x: cx,
        y: cy,
        width: w,
        height: h,
        name: obj.name,
      });
    }
  }

  for (const spec of defaults) {
    createSceneryCollider(scene, group, spec);
  }

  if (import.meta.env.DEV) {
    console.log(`[Scenery] ${group.getLength()} collider(s)`);
  }

  return group;
}
