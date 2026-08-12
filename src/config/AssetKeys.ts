/**
 * Central asset key registry.
 *
 * All asset keys used in this.load.*() calls must be defined here.
 * This prevents typos, enables autocomplete, and makes refactoring safe.
 *
 * See: phaser-asset-advisor skill - "Keep load keys stable and document
 * them in shared constants when the project already uses key registries."
 */

export const AssetKeys = {
  // Tilesets
  Tilesets: {
    SUNNYSIDE: 'sunnyside',
    RPG_TERRAIN: 'rpg_terrain',
    RPG_BUILDINGS: 'rpg_buildings',
    RPG_ROOFS: 'rpg_roofs',
    RPG_INDOORS: 'rpg_indoors',
    RPG_PLANTS: 'rpg_plants',
    RPG_BEACH: 'rpg_beach',
  },

  // Tilemaps
  Tilemaps: {
    ISLAND: 'island',
    ISLAND_EXPANDED: 'island_expanded',
  },

  // Data
  Data: {
    DIALOGUES: 'dialogues',
    QUESTS: 'quests',
  },

  // Character Spritesheets
  Characters: {
    IDLE: 'ss_idle',
    WALK: 'ss_walk',
    RUN: 'ss_run',
  },

  // NPCs (placeholder keys - will be populated when assets arrive)
  NPCs: {
    WELCOME: 'npc_welcome',
    SHOPKEEPER: 'npc_shopkeeper',
    VILLAGER: 'npc_villager',
  },

  // Items/Collectibles (placeholder keys)
  Items: {
    CRATE: 'item_crate',
    BARREL: 'item_barrel',
    SUPPLY: 'item_supply',
  },
} as const;

// Type-safe key extraction
export type TilesetKey =
  | (typeof AssetKeys.Tilesets)[keyof typeof AssetKeys.Tilesets];
export type TilemapKey =
  | (typeof AssetKeys.Tilemaps)[keyof typeof AssetKeys.Tilemaps];
export type DataKey = (typeof AssetKeys.Data)[keyof typeof AssetKeys.Data];
export type CharacterKey =
  | (typeof AssetKeys.Characters)[keyof typeof AssetKeys.Characters];
export type NpcKey = (typeof AssetKeys.NPCs)[keyof typeof AssetKeys.NPCs];
export type ItemKey = (typeof AssetKeys.Items)[keyof typeof AssetKeys.Items];
