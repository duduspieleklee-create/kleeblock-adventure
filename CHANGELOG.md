# Changelog

All notable changes to **KleeBlock Adventure** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),  
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Planned
- Further content expansion (new maps / zones)
- Additional quests and narrative polish
- Optional pathfinding for complex obstacles
- Production deployment refinements

---

## [0.1.0] – 2026-08-12

First complete vertical slice of the development plan (Blocks 1–12.3).

### Added

#### Block 1 — Phaser Foundation
- Logical resolution `1280 × 720` with `Phaser.Scale.FIT` + `CENTER_BOTH`
- Clean HTML/CSS wrapper without CSS scaling hacks
- `GameConfig` constants as single source of truth

#### Block 2 — Shared Input Architecture
- `PlayerInputController` with normalized commands (`moveVector`, `moveToPoint`, `interact`, `openQuestbook`, `cancelMovement`)
- Desktop keyboard (WASD / arrows + E / I / Escape)
- Mouse click-to-move with world-point conversion
- Mobile tap-to-move
- Device capability detection (touch / mouse / hybrid)

#### Block 3 — Fonts & UI Constants
- `GameFont` (Press Start 2P) with proper `@font-face` + preload
- Font readiness wait in BootScene
- Centralized `UIConstants.ts` / `TEXT_STYLES`

#### Block 4 — UIScene
- Dedicated screen-space `UIScene`
- QuestHUD, menu button, version badge live in UIScene
- Event-driven communication between IslandScene ↔ UIScene
- I key / Escape for questbook

#### Block 5 — Container UI & Mobile Controls
- `DialogBox` as Phaser Container (bottom-anchored, word-wrap)
- `UIScale` helpers + anchors
- Resize-only layout (no per-frame scaling)
- Touch buttons (Talk / Quests) ≥48 px when touch-capable

#### Block 6 — Tiled Map Architecture
- `MapLoader` with layer validation
- Object layers: `NPCSpawns`, `ItemSpawns`, `Triggers`
- Collision via `collides: true` property + `setCollisionByProperty`
- Documentation: `docs/maps/tiled_layers.md`

#### Block 7 — Collision
- Player feet body + collider vs collision layer
- NPC ↔ tile + player ↔ NPC colliders
- `SceneryCollider` for narrow trunk / wall shapes
- Footprint-aware walkability checks

#### Block 8 — Dynamic Quest Item Spawning
- `CollectibleItem` (bob animation, procedural crate)
- `SpawnManager` (shuffle, walkability, distance rules)
- `find_supplies` quest (collect 3 crates)
- Overlap → `item:collected` → quest progress

#### Block 9 — Quest Progression
- Quest chain: `island_explorer` → auto-start `find_supplies`
- HUD shows live progress `(current/required)`
- Dialogue hints after meeting locals

#### Block 10 — Tap-to-Move Polish + Optional Joystick
- Destination marker (green ring)
- Move-then-interact (stop short of NPCs)
- Blocked destinations rejected
- No movement during dialogue
- Optional virtual joystick via `?joystick=1`

#### Block 11 — Debug Tools
- `?debug=1` overlay (F1 panel, F2 collision/physics, F3 reset)
- Debug tools never constructed in production builds

#### Block 12 — Production Hardening
- Logger that silences `debug` in production
- `esbuild.drop: ['console','debugger']` on production builds
- Improved preloader (title, parchment bar, % status)
- `docs/SMOKE_CHECKLIST.md`

### Changed
- IslandScene no longer owns HUD / dialogue (moved to UIScene)
- Quest start logic now chains properly instead of auto-starting supplies
- Input filtering prevents UI taps from moving the player

### Fixed
- Various collision / walkability edge cases
- Font loading race conditions
- Pointer vs UI hit-testing

---

## Notes

- Development plan through **§12.3** is complete on `master`.
- See `AI_CONTEXT.md` for architecture rules and `docs/development_game/development_plan.md` for the full roadmap.
