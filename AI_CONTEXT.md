# AI Context — KleeBlock Adventure

> **Purpose:** This file is the single source of truth for any AI agent continuing work on this project.
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
| Active feature branch | `feature/improved-quest-ui` |
| Open PR | https://github.com/duduspieleklee-create/kleeblock-adventure/pull/9 |

```bash
npm install
npm run dev          # local server
npm run typecheck
npm run lint
```

Debug physics overlay: open the game with `?debug=1` or `?debug=true`.

---

## 2. Skills an AI Needs

| Skill | Why |
|-------|-----|
| **Phaser 4 API** | Scenes, GameObjects, Arcade Physics, Tilemaps, Containers, Tweens, Input, Events |
| **Phaser Tilemaps** | `make.tilemap`, `createLayer(..., gpu?)`, `TilemapGPULayer` vs `TilemapLayer`, `setCollisionByProperty` |
| **Tiled editor conventions** | Layer names, embedded tilesets, custom tile properties, object layers |
| **TypeScript** | Classes, interfaces, strict null checks, Phaser type imports |
| **Vite + ES modules** | `import.meta.env`, asset pack loading |
| **GitHub workflow** | Feature branches, PRs, do not force-push `master` without explicit request |
| **Pixel-art UI design** | High contrast, limited palette, edge-anchored HUD, readable text at small sizes |
| **Quest / dialogue systems** | State machines, event emitters, objective tracking |

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
  tilemaps/island.json    # Tiled map (layers + objects)
  tilesets/...
  characters/sunnyside/...
```

### Key runtime flows

1. **Boot → Preloader → MainMenu → IslandScene**
2. **IslandScene** loads map, spawns player/NPCs from Tiled `objects` layer, starts `island_explorer` quest.
3. **InteractionManager** detects nearby NPC → shows DialogBox → on sequence end emits `dialogueSequenceCompleted`.
4. **IslandScene** listens → `QuestManager.completeObjective` for matching dialogue targets.
5. **QuestHUD** listens to QuestManager events → refreshes left tracker + spatial `!` markers.

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
Solid tiles need custom property **`collides: true`** (bool) on the tileset tile.

### Objects layer (`objects`)

| Object | `type` | Properties | Used for |
|--------|--------|------------|----------|
| `player_spawn` | `spawn` | `role: player` | Player start |
| `welcome_npc` | `npc` | `dialogueId: welcome_npc` | NPC spawn |
| `vibes_npc` | `npc` | `dialogueId: vibes_npc` | NPC spawn |

Add more NPCs only in Tiled (type `npc` + `dialogueId` property). Code already iterates the layer.

### Data JSON

- `quests.json` — quest definitions (`objectives[].type`: `dialogue` | `location` | `item` | `custom`).
- `dialogues.json` — keyed by `dialogueId`, each has `sequence: string[]`.

Keep `dialogueId` / `targetId` strings in sync across map objects, dialogues, and quests.

---

## 5. UI System (current state)

### QuestHUD (`src/ui/QuestHUD.ts`)

- **Left tracker:** parchment-style “Active” panel (Graphics + Text).
- **Book icon:** right side, clickable; toggles full log.
- **Key `Q`:** same toggle.
- **Full Questbook:** centered two-page modal (Active / Completed left, details right).
- **No external UI sprites** — everything is procedural Graphics/Text. No extra assets required.

### Spatial markers (`NPC.setQuestMarker`)

- Golden `!` above NPCs that are targets of incomplete `dialogue` objectives.
- Updated on `questStarted` / `objectiveCompleted` / `questCompleted`.

### DialogBox

- Screen-space, clamped to camera; typewriter effect.
- Still used by InteractionManager (not yet a fixed bottom dialogue panel).

---

## 6. Design Decisions Already Made

1. Hybrid UI: non-diegetic tracker + spatial `!` markers + modal Questbook.
2. GPU layers for visuals; dedicated CPU collision layer.
3. NPCs and player spawn driven by Tiled objects (not hard-coded coordinates).
4. Quest progress persisted via `GameState` (JSON-serialized under key `quests` — note type handling if extending).
5. Pixel-art readability: high contrast, edge-anchored HUD, zoom 2 on camera.

---

## 7. Suggested Next Steps (priority order)

### High value / natural follow-ups

1. **Bottom persistent dialogue panel**  
   Replace or augment floating DialogBox so NPC text is always readable (original user request). Keep typewriter; anchor bottom center; pause player input while open.

2. **Location objectives**  
   `quests.json` already has `ocean_watch` with `type: "location"`. Implement zone checks (overlap rectangles from Tiled objects or tile regions) and call `completeObjective`.

3. **Quest selection in Questbook**  
   Click Active quest on left page → show its details on the right (currently only first active is shown).

4. **Multiple simultaneous trackers**  
   Left panel currently shows one active quest; extend to a short stack or scrollable list.

5. **Merge PR #9** after playtest, then branch for the next feature.

### Medium

6. **Player spawn / NPC polish** — facing direction, idle variety, interaction prompt (`E` / face button) above NPC when in range.
7. **Save/load** — expand GameState to localStorage; restore quest HUD on load.
8. **Second map / zone transition** — second Tiled JSON + scene switch or same scene map swap.
9. **Audio** — SFX for quest complete, dialogue advance, UI open/close.
10. **Custom pixel font** — optional bitmap font for sharper UI at zoom 2.

### Lower / polish

11. Questbook open/close tween; book icon open/closed art.
12. Marker variants (`?` for available quest, `!` for in-progress).
13. CI: typecheck + lint on PR.
14. Align with PR #8 (tighter feet hitboxes) if still open — test collision after merge.

---

## 8. Do / Don’t for Agents

**Do**
- Keep collision on a non-GPU layer.
- Match Tiled layer and tileset names exactly.
- Use QuestManager events instead of polling where possible.
- Prefer feature branches + PR descriptions that list test steps.
- Run `npm run typecheck` mentally (or actually) after TS edits.

**Don’t**
- Put Arcade colliders on `TilemapGPULayer`.
- Hard-code NPC positions if the objects layer can express them.
- Add large binary assets without need (UI is Graphics-based by design).
- Break the `dialogueId` / quest `targetId` naming contract.
- Rewrite working systems wholesale when a small extension suffices.

---

## 9. Quick File Index for Common Tasks

| Task | Primary files |
|------|----------------|
| Change HUD layout / Questbook | `src/ui/QuestHUD.ts` |
| Quest rules / progress | `src/managers/QuestManager.ts`, `public/assets/data/quests.json` |
| Dialogue text | `public/assets/data/dialogues.json`, `src/objects/DialogBox.ts` |
| NPC interaction | `src/managers/InteractionManager.ts`, `src/objects/NPC.ts` |
| Map / collision / spawns | `public/assets/tilemaps/island.json`, `src/scenes/IslandScene.ts` |
| Player movement | `src/objects/SunnysidePlayer.ts` |
| Asset loading | `public/assets/pack.json`, `src/scenes/PreloaderScene.ts` |

---

## 10. Testing Checklist (before claiming done)

- [ ] Game boots to IslandScene without console errors
- [ ] Player moves; blocked by collision tiles
- [ ] `?debug=1` shows orange colliding tiles + body outlines
- [ ] NPCs appear at Tiled object positions
- [ ] Talk to NPCs → dialogue runs → objectives complete
- [ ] Left tracker updates; `!` markers appear/disappear correctly
- [ ] `Q` and book icon open/close Questbook
- [ ] Quest complete notification shows

---

*Last updated: 2026-08-11 — feature branch `feature/improved-quest-ui` (Quest UI, spatial markers, Tiled objects, physics debug).*
