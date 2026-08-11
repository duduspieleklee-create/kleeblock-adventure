# AI Context — KleeBlock Adventure

> **Purpose:** Single source of truth for any AI agent continuing work on this project.
> Read this fully before making changes. Prefer small, reviewable commits on feature branches.

---

## 1. Project Snapshot

| Item | Value |
|------|--------|
| Name | KleeBlock Adventure |
| Genre | Top-down 2D pixel adventure / RPG prototype |
| Engine | **Phaser 4** (`phaser@^4.2.1`) |
| Language | TypeScript (strict) |
| Bundler | Vite 8 |
| Map editor | Tiled (JSON export) |
| Art style | SunnySide World 16×16 pixel tiles + character strips |
| Default branch | `master` |

```bash
npm install
npm run dev          # local server
npm run typecheck
npm run lint
```

Optional physics debug (if implemented on the branch you are on): `?debug=1` or `?debug=true`.

---

## 2. Skills an AI Needs

| Skill | Why |
|-------|-----|
| **Phaser 4 API** | Scenes, GameObjects, Arcade Physics, Tilemaps, Containers, Tweens, Input, Events |
| **Phaser Tilemaps** | `make.tilemap`, `createLayer(..., gpu?)`, `TilemapGPULayer` vs `TilemapLayer`, `setCollisionByProperty` |
| **Tiled editor conventions** | Layer names, embedded tilesets, custom tile properties, object layers |
| **TypeScript** | Classes, interfaces, strict null checks, Phaser type imports |
| **Vite + ES modules** | `import.meta.env`, asset pack loading |
| **GitHub workflow** | Feature branches, PRs; do not force-push `master` without explicit request |
| **Pixel-art UI design** | High contrast, limited palette, edge-anchored HUD, readable text at small sizes |
| **Quest / dialogue systems** | Event emitters, objective tracking, dialogue sequences |

### Phaser 4 specifics (do not assume Phaser 3 only)

- Unified `TilemapLayer` API (old Static/Dynamic split is gone).
- Optional 5th arg to `createLayer(layerID, tileset, x, y, **gpu**)` → `TilemapGPULayer`.
- **Collision layers must use `gpu: false`** — Arcade Physics needs CPU tile data.
- Prefer `setScrollFactor(0)` + high depth for HUD.

---

## 3. Architecture

```
src/
  main.ts                 # Game config, scene registration
  managers/
    GameState.ts          # Singleton flags / progress
    InteractionManager.ts # Proximity + dialogue flow with NPCs
    QuestManager.ts       # Quest start / objectives / complete + events
  objects/
    SunnysidePlayer.ts    # Player movement + anims
    NPC.ts                # NPC + spatial quest marker (!)
    DialogBox.ts          # Typewriter dialogue box (screen-space)
    characterBody.ts      # Shared feet hitbox helper (if present)
  scenes/
    BootScene.ts
    PreloaderScene.ts     # Loads pack.json
    MainMenuScene.ts
    IslandScene.ts        # Main playable scene
  ui/
    QuestHUD.ts           # Left tracker + book icon + full Questbook modal
public/assets/
  pack.json               # Phaser asset pack
  data/dialogues.json
  data/quests.json
  tilemaps/island.json    # Tiled map
  tilesets/...
  characters/sunnyside/...
```

### Key runtime flows

1. **Boot → Preloader → MainMenu → IslandScene**
2. **IslandScene** loads map, spawns player/NPCs, starts `island_explorer` quest.
3. **InteractionManager** detects nearby NPC → DialogBox → emits `dialogueSequenceCompleted`.
4. **IslandScene** → `QuestManager.completeObjective` for matching dialogue targets.
5. **QuestHUD** listens to QuestManager events → refreshes tracker (+ spatial `!` markers when wired).

### Depth convention (IslandScene)

```ts
SEA: 0 | GROUND: 1 | DECOR: 2 | ENTITIES: 10 | HUD: 9999
```

Entities use `DEPTH.ENTITIES + y * 0.01` for Y-sorting.

---

## 4. Map & Assets Contract

### Required tile layers (names must match exactly)

| Layer | Visible | GPU? | Role |
|-------|---------|------|------|
| `sea` | yes | yes if WebGL | Water background |
| `ground` | yes | yes if WebGL | Terrain |
| `ground_decoration` | yes | yes if WebGL | Props |
| `collision` | no | **always false** | Solid mask for Arcade Physics |

Tileset name in Tiled + code: **`sunnyside`**.  
Solid tiles need custom property **`collides: true`** (bool) on the **tileset tile** (not only the layer).

### Objects layer (recommended)

Prefer a Tiled `objects` layer for spawns:

| Object | `type` | Properties | Used for |
|--------|--------|------------|----------|
| `player_spawn` | `spawn` | `role: player` | Player start |
| `*_npc` | `npc` | `dialogueId: ...` | NPC spawn |

If the layer is not on `master` yet, NPC positions may still be hard-coded in `IslandScene.setupNPCs()`.

### Data JSON

- `quests.json` — quest definitions (`objectives[].type`: `dialogue` | `location` | `item` | `custom`).
- `dialogues.json` — keyed by `dialogueId`, each has `sequence: string[]`.

Keep `dialogueId` / `targetId` strings in sync across map objects, dialogues, and quests.

---

## 5. UI System (current state on master)

### QuestHUD (`src/ui/QuestHUD.ts`)

- **Left tracker:** parchment-style “Active” panel (Graphics + Text).
- **Book icon:** right side, clickable; toggles full log.
- **Key `Q`:** same toggle.
- **Full Questbook:** centered two-page modal (Active / Completed left, details right).
- **No external UI sprites** — procedural Graphics/Text only.

### Spatial markers (`NPC.setQuestMarker`)

- Golden `!` above NPCs targeting incomplete `dialogue` objectives (when IslandScene wires `updateQuestMarkers`).

### DialogBox

- Screen-space, clamped to camera; typewriter effect.
- Not yet a fixed bottom dialogue panel (see next steps).

---

## 6. Design Decisions Already Made

1. Hybrid UI: non-diegetic tracker + spatial `!` + modal Questbook.
2. GPU layers for visuals; dedicated CPU collision layer.
3. Pixel-art readability: high contrast, edge-anchored HUD, camera zoom 2.
4. Quest progress via `QuestManager` + `GameState`.
5. Shared character feet hitbox helper where present (`characterBody.ts`).

---

## 7. Suggested Next Steps (priority order)

### High value

1. **Bottom persistent dialogue panel** — always-readable NPC text; pause movement while open.
2. **Location objectives** — implement `type: "location"` (e.g. `ocean_watch` in quests.json).
3. **Tiled objects layer for spawns** — if not merged yet: player + NPCs from map JSON.
4. **Physics debug** — `?debug=1` collision tile + body overlay.
5. **Questbook click-to-select** — pick Active quest on left → details on right.
6. **Multi-quest tracker** — show more than one active quest in the left panel.

### Medium

7. Interaction prompt when near NPC (`E` / face button).
8. Save/load via localStorage on GameState.
9. Second map / zone transition.
10. Audio (quest complete, dialogue advance, UI).
11. Optional bitmap/pixel font for UI.

### Polish

12. Questbook open/close tween; marker variants (`?` vs `!`).
13. CI: typecheck + lint on PR.

---

## 8. Do / Don’t for Agents

**Do**
- Keep collision on a non-GPU layer.
- Match Tiled layer and tileset names exactly.
- Use QuestManager events instead of polling where possible.
- Prefer feature branches + PRs with a short test checklist.
- Run `npm run typecheck` after TypeScript edits when possible.

**Don’t**
- Put Arcade colliders on `TilemapGPULayer`.
- Break the `dialogueId` / quest `targetId` naming contract.
- Add large binary UI assets unless requested (UI is Graphics-based).
- Rewrite working systems wholesale when a small extension suffices.

---

## 9. Quick File Index

| Task | Primary files |
|------|----------------|
| HUD / Questbook | `src/ui/QuestHUD.ts` |
| Quest rules | `src/managers/QuestManager.ts`, `public/assets/data/quests.json` |
| Dialogue text | `public/assets/data/dialogues.json`, `src/objects/DialogBox.ts` |
| NPC interaction | `src/managers/InteractionManager.ts`, `src/objects/NPC.ts` |
| Map / collision / spawns | `public/assets/tilemaps/island.json`, `src/scenes/IslandScene.ts` |
| Player movement | `src/objects/SunnysidePlayer.ts` |
| Asset loading | `public/assets/pack.json`, `src/scenes/PreloaderScene.ts` |

---

## 10. Testing Checklist

- [ ] Game boots to IslandScene without console errors
- [ ] Player moves; blocked by collision tiles
- [ ] NPCs present; dialogue completes objectives
- [ ] Left tracker updates; book icon / `Q` opens Questbook
- [ ] Spatial `!` markers behave correctly when enabled
- [ ] Quest complete notification shows

---

*Maintained for AI handoff. Update this file when architecture or contracts change.*
