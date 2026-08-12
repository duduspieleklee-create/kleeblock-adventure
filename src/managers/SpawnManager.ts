import Phaser from 'phaser';
import { CollectibleItem } from '../objects/CollectibleItem';
import { getItemSpawns, MapObjectPoint } from '../maps/MapLoader';
import { isFootprintWalkable } from '../maps/Walkability';

export type SpawnOptions = {
  /** Minimum distance from player */
  minPlayerDistance?: number;
  /** Minimum distance between spawned items */
  minItemDistance?: number;
};

const DEFAULTS: Required<SpawnOptions> = {
  minPlayerDistance: 80,
  minItemDistance: 48,
};

/**
 * Spawns quest items at Tiled ItemSpawns points.
 * Does not own quest progression — only placement and active item list.
 */
export class SpawnManager {
  private readonly scene: Phaser.Scene;
  private readonly map: Phaser.Tilemaps.Tilemap;
  private readonly collisionLayer: Phaser.Tilemaps.TilemapLayer;
  private readonly itemGroup: Phaser.Physics.Arcade.Group;
  private activeItems: CollectibleItem[] = [];

  constructor(
    scene: Phaser.Scene,
    map: Phaser.Tilemaps.Tilemap,
    collisionLayer: Phaser.Tilemaps.TilemapLayer,
  ) {
    this.scene = scene;
    this.map = map;
    this.collisionLayer = collisionLayer;
    this.itemGroup = scene.physics.add.group();
  }

  getGroup(): Phaser.Physics.Arcade.Group {
    return this.itemGroup;
  }

  getActiveItems(): readonly CollectibleItem[] {
    return this.activeItems;
  }

  /**
   * Spawn up to `count` items for a quest at validated ItemSpawns points.
   */
  spawnForQuest(
    questId: string,
    itemKey: string,
    count: number,
    playerPos: { x: number; y: number },
    options: SpawnOptions = {},
  ): CollectibleItem[] {
    const opts = { ...DEFAULTS, ...options };
    const candidates = this.shuffle([...getItemSpawns(this.map)]);
    const spawned: CollectibleItem[] = [];

    if (candidates.length === 0) {
      console.warn('[SpawnManager] No ItemSpawns points on map');
      return spawned;
    }

    for (const point of candidates) {
      if (spawned.length >= count) break;

      if (!this.isValidSpawn(point, playerPos, opts)) {
        continue;
      }

      const item = new CollectibleItem(this.scene, point.x, point.y, itemKey, questId);
      this.itemGroup.add(item);
      this.activeItems.push(item);
      spawned.push(item);
    }

    if (spawned.length < count) {
      console.warn(
        `[SpawnManager] Only spawned ${spawned.length}/${count} for quest ${questId} (${candidates.length} candidates)`,
      );
    } else if (import.meta.env.DEV) {
      console.log(`[SpawnManager] Spawned ${spawned.length}× ${itemKey} for ${questId}`);
    }

    return spawned;
  }

  private isValidSpawn(
    point: MapObjectPoint,
    playerPos: { x: number; y: number },
    opts: Required<SpawnOptions>,
  ): boolean {
    if (!isFootprintWalkable(this.map, this.collisionLayer, point.x, point.y)) {
      return false;
    }

    const distPlayer = Phaser.Math.Distance.Between(point.x, point.y, playerPos.x, playerPos.y);
    if (distPlayer < opts.minPlayerDistance) {
      return false;
    }

    for (const existing of this.activeItems) {
      if (!existing.active) continue;
      const d = Phaser.Math.Distance.Between(point.x, point.y, existing.x, existing.y);
      if (d < opts.minItemDistance) return false;
    }

    return true;
  }

  removeItem(item: CollectibleItem): void {
    this.activeItems = this.activeItems.filter((i) => i !== item);
  }

  clearAll(): void {
    for (const item of this.activeItems) {
      item.destroy();
    }
    this.activeItems = [];
    this.itemGroup.clear(true, true);
  }

  private shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  shutdown(): void {
    this.clearAll();
  }
}
