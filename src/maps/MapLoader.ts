import Phaser from 'phaser';
import { AssetKeys, TilesetKey } from '../config/AssetKeys';

/** Depth convention for island tile layers (world only). */
export const MAP_DEPTH = {
  SEA: 0,
  WATER: 0,
  GROUND: 1,
  PATHS: 2,
  DECOR: 3,
  OBJECTS_VISUAL: 4,
  ENTITIES: 10,
} as const;

export type LoadedIslandMap = {
  map: Phaser.Tilemaps.Tilemap;
  tileset: Phaser.Tilemaps.Tileset;
  layers: {
    sea?: Phaser.Tilemaps.TilemapLayer | Phaser.Tilemaps.TilemapGPULayer;
    ground?: Phaser.Tilemaps.TilemapLayer | Phaser.Tilemaps.TilemapGPULayer;
    paths?: Phaser.Tilemaps.TilemapLayer | Phaser.Tilemaps.TilemapGPULayer;
    decor?: Phaser.Tilemaps.TilemapLayer | Phaser.Tilemaps.TilemapGPULayer;
    collision: Phaser.Tilemaps.TilemapLayer;
  };
};

export type MapObjectPoint = {
  name: string;
  type: string;
  x: number;
  y: number;
  properties: Record<string, string | number | boolean>;
};

const REQUIRED_TILE_LAYERS = ['sea', 'ground', 'collision'] as const;

/**
 * Load and validate the static island tilemap.
 * Supports single and multi-tileset maps.
 * Visual layers stay separate from collision (Milestone 6.2).
 */
export function loadIslandMap(
  scene: Phaser.Scene,
  mapKey = AssetKeys.Tilemaps.ISLAND,
  tilesetName?: TilesetKey,
  tilesetImageKey?: string,
): LoadedIslandMap | null {
  const map = scene.make.tilemap({ key: mapKey });

  // Support multi-tileset maps — try each tileset in the map until one loads
  const tilesets = tilesetName ? [tilesetName] : map.tilesets.map((t) => t.name);
  const loadedTilesets: Phaser.Tilemaps.Tileset[] = [];

  for (const tsName of tilesets) {
    const tsImageKey = tilesetImageKey || tsName;
    const tileset = map.addTilesetImage(tsName, tsImageKey);
    if (!tileset) {
      console.warn(
        `[MapLoader] Tileset "${tsName}" failed to load (image key "${tsImageKey}")`,
      );
      continue;
    }
    loadedTilesets.push(tileset);
  }

  if (loadedTilesets.length === 0) {
    console.error(
      `[MapLoader] No tilesets loaded for map "${mapKey}"`,
    );
    return null;
  }

  // Validate required tile layers
  for (const name of REQUIRED_TILE_LAYERS) {
    if (!map.getLayer(name)) {
      console.error(`[MapLoader] Required tile layer missing: "${name}"`);
      return null;
    }
  }

  // Force CPU layers — Phaser 4 GPU tilemap path is incompatible with this tileset
  // and crashes with "Cannot read properties of undefined (reading '0')"
  const useGPU = false;

  const sea = map.createLayer('sea', loadedTilesets, 0, 0, useGPU) ?? undefined;
  sea?.setDepth(MAP_DEPTH.SEA);

  const ground = map.createLayer('ground', loadedTilesets, 0, 0, useGPU) ?? undefined;
  ground?.setDepth(MAP_DEPTH.GROUND);

  // Optional visual layers (plan names or current map names)
  // Only create if layer exists in map to avoid errors
  const paths =
    map.getLayer('paths')
      ? map.createLayer('paths', loadedTilesets, 0, 0, useGPU) ?? undefined
      : undefined;
  paths?.setDepth(MAP_DEPTH.PATHS);

  const decor =
    map.getLayer('ground_decoration')
      ? map.createLayer('ground_decoration', loadedTilesets, 0, 0, useGPU) ?? undefined
      : map.getLayer('Objects')
        ? map.createLayer('Objects', loadedTilesets, 0, 0, useGPU) ?? undefined
        : undefined;
  decor?.setDepth(MAP_DEPTH.DECOR);

  const collisionLayer = map.createLayer(
    'collision',
    loadedTilesets,
    0,
    0,
    false,
  ) as Phaser.Tilemaps.TilemapLayer | null;
  if (!collisionLayer) {
    console.error('[MapLoader] Collision layer not found');
    return null;
  }

  // Hidden outside debug (Milestone 6.3)
  collisionLayer.setVisible(false).setDepth(-1);

  // Prefer Tiled collides property; also treat any non-empty tile as solid
  // so simple 0/1 collision maps work without full tileset metadata.
  collisionLayer.setCollisionByProperty({ collides: true });
  collisionLayer.setCollisionByExclusion([-1], true);

  if (import.meta.env.DEV) {
    console.log(
      `[MapLoader] Map ${map.width}×${map.height} tiles (${map.widthInPixels}×${map.heightInPixels}px)`,
    );
    logObjectLayerSummary(map);
  }

  return {
    map,
    tileset: loadedTilesets[0],
    layers: {
      sea,
      ground,
      paths,
      decor,
      collision: collisionLayer,
    },
  };
}

function logObjectLayerSummary(map: Phaser.Tilemaps.Tilemap): void {
  const names = ['NPCSpawns', 'ItemSpawns', 'Triggers', 'objects'];
  for (const name of names) {
    const layer = map.getObjectLayer(name);
    if (layer) {
      console.log(`[MapLoader] Object layer "${name}": ${layer.objects.length} object(s)`);
    }
  }
}

/** Read typed points from an object layer. */
export function getMapObjects(map: Phaser.Tilemaps.Tilemap, layerName: string): MapObjectPoint[] {
  const layer = map.getObjectLayer(layerName);
  if (!layer) return [];

  return layer.objects.map((obj) => {
    const properties: Record<string, string | number | boolean> = {};
    const props = obj.properties as Array<{ name: string; value: unknown }> | undefined;
    if (props) {
      for (const p of props) {
        properties[p.name] = p.value as string | number | boolean;
      }
    }
    return {
      name: obj.name ?? '',
      type: obj.type ?? '',
      x: obj.x ?? 0,
      y: obj.y ?? 0,
      properties,
    };
  });
}

/**
 * NPC spawn points: prefer NPCSpawns layer, fall back to objects typed as npc.
 */
export function getNpcSpawns(map: Phaser.Tilemaps.Tilemap): MapObjectPoint[] {
  const fromDedicated = getMapObjects(map, 'NPCSpawns');
  if (fromDedicated.length > 0) return fromDedicated;

  return getMapObjects(map, 'objects').filter(
    (o) => o.type === 'npc' || typeof o.properties.dialogueId === 'string',
  );
}

export function getPlayerSpawn(map: Phaser.Tilemaps.Tilemap): { x: number; y: number } | null {
  const fromObjects = getMapObjects(map, 'objects').find(
    (o) => o.type === 'spawn' || o.name === 'player_spawn',
  );
  if (fromObjects) return { x: fromObjects.x, y: fromObjects.y };

  const fromTriggers = getMapObjects(map, 'Triggers').find(
    (o) => o.type === 'spawn' || o.properties.role === 'player',
  );
  if (fromTriggers) return { x: fromTriggers.x, y: fromTriggers.y };

  return null;
}

export function getItemSpawns(map: Phaser.Tilemaps.Tilemap): MapObjectPoint[] {
  return getMapObjects(map, 'ItemSpawns');
}

export function getTriggers(map: Phaser.Tilemaps.Tilemap): MapObjectPoint[] {
  return getMapObjects(map, 'Triggers');
}