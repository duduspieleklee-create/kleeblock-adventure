# Island Tiled map — layer conventions

File: `public/assets/tilemaps/island.json`  
Tileset: Sunnyside World 16px (`sunnyside`)

## Tile layers (visual vs collision)

| Layer               | Role                                          |
| ------------------- | --------------------------------------------- |
| `sea`               | Water / ocean (visual)                        |
| `ground`            | Walkable terrain (visual)                     |
| `ground_decoration` | Props, plants (visual only)                   |
| `collision`         | **Hidden** blocking tiles — not drawn in play |

Collision is separate from art (Milestone 6.2). Mark solid cells on `collision` only. Ordinary grass/paths stay empty on that layer.

## Object layers

| Layer        | Purpose                                                       |
| ------------ | ------------------------------------------------------------- |
| `NPCSpawns`  | NPC points (`type: npc`, property `dialogueId`)               |
| `ItemSpawns` | Quest item candidates (`type: item_spawn`, optional `region`) |
| `Triggers`   | Spawns / zones (`type: spawn` or `trigger`)                   |
| `objects`    | Legacy combined layer (still supported as fallback)           |

## Current size

- 20 × 20 tiles @ 16px → **320 × 320** world pixels
- Expand later (e.g. 160×120) after camera/collision feel solid.

## Loader

Runtime entry: `src/maps/MapLoader.ts`  
Validates required layers, hides collision unless `?debug=1`.
