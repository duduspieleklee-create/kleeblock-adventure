# Asset Inventory

## Downloaded Assets (Following Phaser4-Gamedev Guidelines)

### Building Tileset - 16x16 RPG Tileset by hilau (CC-BY)
**Source:** https://opengameart.org/content/16x16-rpg-tileset

| File | Key | Size | Contents |
|------|-----|------|----------|
| `1_terrain.png` | `rpg_terrain` | 480×768 | Grass, dirt, rocks, cliffs, paths |
| `2_indoors.png` | `rpg_indoors` | 320×352 | Interior walls, floors, furniture, doors |
| `3_plants.png` | `rpg_plants` | 480×128 | Trees, bushes, flowers, vegetation |
| `4_buildings.png` | `rpg_buildings` | 384×384 | Building exteriors, walls, windows, doors |
| `9_beach.png` | `rpg_beach` | 288×256 | Sand, water, beach tiles |
| `11_roofs.png` | `rpg_roofs` | 512×512 | Various roof styles (thatched, tile, wooden) |

### NPC Sprites - Kenney Roguelike Characters (CC0)
**Source:** https://kenney.nl/assets/roguelike-characters
**License:** Creative Commons CC0 (Public Domain - no attribution required)

| File | Key | Size | Format |
|------|-----|------|--------|
| `roguelikeChar_transparent.png` | `npc_welcome` | 918×203 | 16×16 tiles + 1px margin |

**Frame Configuration:**
```typescript
frameWidth: 16,
frameHeight: 16,
spacing: 1,
margin: 1
```

**Contents:** Multiple character sprites including:
- Human characters (various outfits)
- Monsters (slimes, skeletons, etc.)
- Animals

### Item/Collectible Sprites - Kenney Roguelike RPG Pack (CC0)
**Source:** https://kenney.nl/assets/roguelike-rpg-pack
**License:** Creative Commons CC0 (Public Domain - no attribution required)

| File | Key | Size | Format |
|------|-----|------|--------|
| `roguelikeSheet_transparent.png` | `item_crate` | 968×526 | 16×16 tiles + 1px margin |

**Frame Configuration:**
```typescript
frameWidth: 16,
frameHeight: 16,
spacing: 1,
margin: 1
```

**Contents:** 1700+ tiles including:
- Crates, barrels, chests
- Weapons, armor, potions
- Furniture, doors, signs
- Terrain, walls, floors
- UI elements

## Asset Organization

```
public/assets/
├── tilesets/
│   ├── spr_tileset_sunnysideworld_16px.png  (existing base tileset)
│   └── buildings/                            (hilau CC-BY tileset)
│       ├── 1_terrain.png
│       ├── 2_indoors.png
│       ├── 3_plants.png
│       ├── 4_buildings.png
│       ├── 9_beach.png
│       └── 11_roofs.png
├── tilemaps/
│   └── island.json                           (needs expansion to 160×120)
├── characters/
│   └── sunnyside/                            (existing player sprites)
│       ├── base_idle_strip9.png
│       ├── base_walk_strip8.png
│       └── base_run_strip8.png
├── npcs/
│   └── roguelikeChar_transparent.png         (Kenney CC0 - NPCs)
├── items/
│   └── roguelikeSheet_transparent.png        (Kenney CC0 - items)
├── data/
│   ├── dialogues.json
│   └── quests.json
└── pack.json                                 (deprecated - now using explicit loading)
```

## Loading Strategy (Following Phaser4-Gamedev Guidelines)

**PreloaderScene** uses explicit `this.load.*()` calls:
- Better error handling per file
- Easier debugging
- Type-safe keys via AssetKeys registry

```typescript
// Tilesets
this.load.image(AssetKeys.Tilesets.SUNNYSIDE, 'assets/tilesets/...');
this.load.image(AssetKeys.Tilesets.RPG_BUILDINGS, 'assets/tilesets/buildings/...');

// Spritesheets (with margin/spacing for Kenney assets)
this.load.spritesheet(AssetKeys.NPCs.WELCOME, 'assets/npcs/...', {
  frameWidth: 16,
  frameHeight: 16,
  spacing: 1,
  margin: 1,
});
```

## Future Optimizations (Per Guidelines)

1. **Texture Atlases** - Pack NPC/item frames into atlases using free-tex-packer
2. **Power-of-Two** - Resize non-power-of-two textures (e.g., 384×384 → 512×512)
3. **Lazy Loading** - Load per-scene assets only when needed

## License Summary

| Asset | License | Attribution Required |
|-------|---------|---------------------|
| hilau RPG Tileset | CC-BY | Yes (in ATTRIBUTION.md) |
| Kenney Roguelike Characters | CC0 | No |
| Kenney Roguelike RPG Pack | CC0 | No |
| Sunnyside (base tileset) | Unknown | TBD |

## Next Steps

1. ✅ Building tileset (hilau CC-BY)
2. ✅ NPC sprites (Kenney CC0)
3. ✅ Item sprites (Kenney CC0)
4. ⬜ Create expanded Tiled map (160×120)
5. ⬜ Place buildings using rpg_buildings + rpg_roofs
6. ⬜ Add NPCs with proper frame indices
7. ⬜ Add items/collectibles with proper frame indices
