import Phaser from 'phaser';

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
 * Visual layers stay separate from collision (Milestone 6.2).
 */
export function loadIslandMap(
  scene: Phaser.Scene,
  mapKey = 'island',
  tilesetName = 'sunnyside',
  tilesetImageKey = 'sunnyside',
): LoadedIslandMap | null {
  const map = scene.make.tilemap({ key: mapKey });

  const tileset = map.addTilesetImage(tilesetName, tilesetImageKey);
  if (!tileset) {
    console.error(
      `[MapLoader] Tileset "${tilesetName}" failed to load (image key "${tilesetImageKey}")`,
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

  const useGPU = scene.game.renderer.type === Phaser.WEBGL;

  const sea = map.createLayer('sea', tileset, 0, 0, useGPU) ?? undefined;
  sea?.setDepth(MAP_DEPTH.SEA);

  const ground = map.createLayer('ground', tileset, 0, 0, useGPU) ?? undefined;
  ground?.setDepth(MAP_DEPTH.GROUND);

  // Optional visual layers (plan names or current map names)
  const paths =
    map.createLayer('paths', tileset, 0, 0, useGPU) ??
    map.createLayer('Paths', tileset, 0, 0, useGPU) ??
    undefined;
  paths?.setDepth(MAP_DEPTH.PATHS);

  const decor =
    map.createLayer('ground_decoration', tileset, 0, 0, useGPU) ??
    map.createLayer('Objects', tileset, 0, 0, useGPU) ??
    undefined;
  decor?.setDepth(MAP_DEPTH.DECOR);

  const collisionLayer = map.createLayer(
    'collision',
    tileset,
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
    tileset,
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
