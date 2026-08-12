````md
# AI_CONTEXT.md — Kleeblock Adventure

> **Purpose:** Stable navigation and governance document for AI contributors and developers.
>
> Read this file before making changes. For milestones, implementation details, TODOs, code examples, feature scope, and execution order, consult the **Revised Consolidated Development Plan**.
>
> This file should contain stable project rules and contracts. It must not duplicate the full development roadmap.

---

## Source of Truth & Precedence

When resolving conflicts or deciding how to implement a feature, use this order:

1. **Revised Consolidated Development Plan**  
   Primary source for milestones, implementation order, feature scope, TODOs, runtime flows, and code examples.
2. **AI_CONTEXT.md**  
   Stable architecture rules, naming contracts, project constraints, and validation guidance.
3. **Official documentation**  
   Phaser, Tiled, TypeScript, browser, pointer, touch, and font-loading documentation.
4. **Existing project code, configuration, and Tiled assets**
5. **Personal assumptions**  
   Use only as a last resort, and verify them before implementation.

If a change affects a stable rule or project contract, update both this file and the development plan when appropriate.

---

## Project Snapshot

| Item               | Value                                                  |
| ------------------ | ------------------------------------------------------ |
| Project            | Kleeblock Adventure                                    |
| Genre              | Top-down 2D pixel adventure / RPG prototype            |
| Engine             | Phaser 4                                               |
| Phaser version     | `phaser@^4.2.1`                                        |
| Language           | TypeScript with strict mode                            |
| Bundler            | Vite 8                                                 |
| Map editor         | Tiled with JSON export                                 |
| Art style          | SunnySide World 16×16 pixel tiles and character strips |
| Logical resolution | `1280 × 720`                                           |

---

## Non-Negotiable Project Rules

### 1. Game Resolution and Scaling

- The logical game resolution is **`1280 × 720`**.
- Configure Phaser's Scale Manager with:
  - `Phaser.Scale.FIT`
  - `Phaser.Scale.CENTER_BOTH`
- Configure the scale system in `src/main.ts`.
- Use `this.scale.gameSize` for gameplay and UI layout calculations.
- Do not use `window.innerWidth` or `window.innerHeight` as the primary gameplay coordinate system.
- Do not use CSS `zoom`, CSS transforms, or manual canvas scaling to solve layout problems.
- UI layout must be recalculated in response to Phaser resize events, not every frame.
- Use integer coordinates where practical:
  - round UI positions,
  - round text positions,
  - use `roundPixels` where appropriate.
- Do not introduce per-frame manual UI scaling.

### 2. Scene Architecture

#### `IslandScene`

`IslandScene` owns world-space systems:

- Tiled map loading and rendering
- Tilemap layers
- World camera
- Player movement
- NPCs
- World interactions
- Collision and physics
- Quest-related world events
- Dynamic quest-item spawning
- Spatial markers and triggers

#### `UIScene`

`UIScene` owns screen-space systems:

- HUD
- Quest tracker
- Questbook
- Dialogue
- Menus
- Buttons
- Interaction prompts
- Mobile controls
- Tooltips
- Other screen-fixed interface elements

Rules:

- UI must remain fixed to the logical viewport.
- UI must not follow the world camera.
- Do not render HUD or dialogue inside `IslandScene`.
- `IslandScene` and `UIScene` communicate through events.
- Avoid direct object coupling between scenes.
- Prefer event-driven communication such as quest update events.

### 3. Input Architecture

All input sources must pass through one platform-independent input layer, such as:

```ts
PlayerInputController;
```
````

or:

```ts
InputManager;
```

The input layer must normalize keyboard, mouse, touch, and optional joystick input into shared commands.

Recommended commands:

- `moveVector`
- `moveToPoint`
- `interact`
- `openQuestbook`
- `cancelMovement`

Do not create separate movement implementations for desktop and mobile. All platforms must ultimately use the same gameplay contracts.

#### Desktop Input

Support:

- `WASD` movement
- Arrow-key movement
- Mouse click-to-move
- `E` to interact
- `I` to open the questbook
- `Escape` to cancel movement or close the active interface

For pointer movement, convert screen coordinates to world coordinates using the active camera, for example:

```ts
camera.getWorldPoint(pointer.x, pointer.y);
```

#### Mobile Input

Use the following defaults:

- Tap-to-move as the primary movement method
- Large touch targets
- Contextual Interact buttons
- Questbook/menu buttons
- No hover-only interactions
- Support portrait and landscape layouts
- Support hybrid devices according to the input method actually being used

Touch targets should be at least **44–48 logical pixels** where practical. Maintain approximately **8–12 logical pixels** of spacing between adjacent controls.

A virtual joystick is optional. Add one only if testing demonstrates that tap-to-move is insufficient. If added, it must emit the same `moveVector` command used by keyboard input.

#### UI Input Protection

- UI taps must not accidentally trigger world movement.
- Pointer and touch events must identify whether the interaction occurred over UI or the world.
- Handle pointer cancellation and multi-touch safely.
- Do not bypass the shared input layer when adding new controls.

---

## Map, Tiled, and Collision Contract

### Static World

- The starting island is static and authored in Tiled.
- Do not procedurally generate the starting island unless explicitly approved later.
- Keep map data in Tiled rather than hardcoding map structure in TypeScript.

### Tile Layers

Use separate visual and physics data. The project should preserve the established Tiled layer names and contracts.

Recommended layer structure:

- `Ground` — visual ground layer
- `Water` — visual water layer
- `Paths` — visual path layer
- `Collision` — hidden collision layer

The exact names already established in the project take precedence. Do not rename layers casually.

### Collision

- Collision must be explicit and maintainable.
- Use a dedicated collision layer, collision objects, or intentional blocking shapes.
- The collision layer must be CPU-readable by Arcade Physics.
- For a tile-based collision layer, use `gpu: false`.
- Use collision properties such as:

```text
collides: true
```

- Do not infer collision from visible artwork.
- Grass, paths, and decorative elements must not become collidable unless intentionally marked as blockers.
- Trees should collide at the trunk or base, not across the entire canopy.
- Buildings should collide at their walls or base, not across the complete sprite.
- Cliffs, rocks, and other obstacles should use narrow, intentional collision shapes.
- Use Tiled object-layer rectangles or polygons for irregular obstacles where appropriate.
- Do not attach Arcade Physics colliders to GPU-only tilemap layers.

### Object Layers

Use Tiled object layers for world metadata and data-driven placement. Preserve the names already used by the project.

Expected object-layer contracts may include:

- `NPCSpawns` — NPC placement and configuration
- `ItemSpawns` — dynamic quest-item spawn points
- `Objects` — world objects and collision shapes
- `Triggers` — interaction zones, teleports, and other trigger areas

Do not hardcode coordinates that belong in Tiled object layers.

---

## World Data and Quest Spawning

- Dynamic quest items and supplies must be spawned through the approved spawn system.
- Use `SpawnManager` to read approved spawn data from the Tiled `ItemSpawns` object layer.
- Do not hardcode dynamic quest-item coordinates in scene code.
- Validate spawn points against collision and walkability data.
- Enforce any project-defined minimum distance from:
  - the player,
  - other quest items,
  - blocked areas,
  - or other relevant world objects.
- NPCs and quest data should be data-driven from Tiled objects or JSON files rather than hardcoded where the project already provides data files.
- Quest state should be managed by `QuestManager`.
- Prefer this flow:

```text
World/gameplay emits an event
        ↓
QuestManager updates quest state
        ↓
UIScene renders the updated state
```

---

## Text, Fonts, and UI Layout

- Load custom fonts before creating important text objects.
- Use `@font-face` with:

```css
font-display: block;
```

- Preload important `.woff2` fonts in `index.html` when appropriate:

```html
<link rel="preload" href="/assets/fonts/your-font.woff2" as="font" type="font/woff2" crossorigin />
```

- Wait for font availability before creating dependent text where necessary, for example in a boot or preload scene.
- Use explicit text properties:
  - `fontFamily`
  - `fontSize`
  - `padding`
  - `wordWrap.width`
  - `lineSpacing`
  - `align`
  - `origin`
- Update word-wrap widths when panel dimensions change.
- Recalculate UI layout on Phaser resize events.
- Round text and UI coordinates to integers to reduce blur and jitter.
- Prefer `Phaser.GameObjects.Container` for composite UI components.
- Centralize reusable text styles, colors, spacing, and dimensions in:

```text
src/ui/UIConstants.ts
```

---

## Recommended Architecture Boundaries

### World Scene

`IslandScene` should handle:

- Tilemap loading
- Collision setup
- Player and NPC physics
- World movement
- NPC placement
- Item spawning
- World interactions
- World triggers
- Quest-related world events

### UI Scene

`UIScene` should handle:

- Quest HUD
- Questbook
- Dialogue box
- Mobile controls
- Interaction prompts
- Menus
- Screen-fixed layout
- Resize behavior

### Input Layer

The input layer should:

- Receive keyboard, mouse, touch, and optional joystick input
- Convert pointer positions to world positions when needed
- Prevent UI interactions from becoming world interactions
- Emit normalized commands
- Remain independent of UI layout and player implementation

### Quest Flow

Prefer event-driven communication:

- Gameplay emits quest-related events.
- `QuestManager` updates the authoritative quest state.
- `UIScene` listens for state changes and updates the interface.

---

## Official Documentation

Consult official documentation before guessing about API behavior. Match the documentation to the installed versions in `package.json`.

### Phaser

- [Scale Manager](https://docs.phaser.io/phaser/concepts/scale-manager)
- [Scenes](https://docs.phaser.io/phaser/concepts/scenes)
- [Input](https://docs.phaser.io/phaser/concepts/input)
- [Text GameObjects](https://docs.phaser.io/api-documentation/class/gameobjects-text)
- [Containers](https://docs.phaser.io/api-documentation/class/gameobjects-container)
- [Tilemaps](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap)
- [Arcade Physics](https://docs.phaser.io/phaser/physics/arcade-physics)

### Tiled

- [Layers](https://doc.mapeditor.org/en/stable/manual/layers/)
- [Object Layers](https://doc.mapeditor.org/en/stable/manual/objects/)
- [Custom Properties](https://doc.mapeditor.org/en/stable/manual/custom-properties/)

### Browser and Input APIs

- [MDN Pointer Events](https://developer.mozilla.org/en-US/docs/Web/API/PointerEvent)
- [MDN Touch Events](https://developer.mozilla.org/en-US/docs/Web/API/Touch_events)
- [MDN Font Loading API](https://developer.mozilla.org/en-US/docs/Web/API/CSS_Font_LoadING_API)

---

## Preferred Practices

- Read the Revised Consolidated Development Plan before beginning feature work.
- Consult official documentation when Phaser or Tiled behavior is unclear.
- Keep world logic and UI logic separated.
- Use event emitters for communication between scenes.
- Keep UI layout resize-driven.
- Use `this.scale.gameSize` for layout calculations.
- Keep map data in Tiled.
- Use explicit, narrow collision shapes.
- Validate walkability before spawning or moving entities.
- Use debug overlays while authoring maps and collision.
- Test on real mobile hardware, not only desktop emulation.
- Test desktop, mobile, hybrid, portrait, and landscape cases where relevant.
- Keep changes small, focused, reversible, and reviewable.
- Follow existing project naming and file conventions.
- Verify fonts, canvas size, and asset loading before assuming layout code is incorrect.
- Keep optional tools optional until a real need is demonstrated.

---

## Optional Tools and Plugins

Add optional tools only when testing demonstrates a specific need. They must not become permanent dependencies without justification.

### Virtual Joystick

Consider a virtual joystick only if tap-to-move is insufficient for mobile usability.

Possible option:

- [rexVirtualJoystick](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/virtualjoystick/)

Any joystick must emit the shared `moveVector` command.

### Pathfinding

Consider pathfinding only if click-to-move or tap-to-move frequently fails around complex obstacles.

Possible options:

- [EasyStar.js](https://easystarjs.com/)
- A project-approved A* implementation
- [Yuka](https://mugen87.github.io/yuka/)

Pathfinding must use the project's collision and walkability data. Do not maintain a separate, conflicting map representation.

### Debug Tools

Useful development-only tools include:

- Phaser Arcade Physics debug graphics
- Collision-layer visibility toggle
- Camera-bounds visualization
- Input and pointer-coordinate overlays
- Font-loading inspection in browser DevTools
- Asset-loading and network inspection

Debug tools should be disabled or gated behind a development flag in production.

---

## Do / Don't

### Do

- Read the Revised Consolidated Development Plan before implementation.
- Consult official Phaser and Tiled documentation when API behavior is uncertain.
- Preserve established Tiled layer names, object names, tileset names, properties, and quest IDs.
- Route every input device through the shared input abstraction.
- Keep the island static and authored in Tiled.
- Spawn dynamic quest items only through the approved spawn system.
- Use `this.scale.gameSize` for layout.
- Recalculate UI only in response to resize events.
- Keep `UIScene` separate from `IslandScene`.
- Keep UI screen-fixed.
- Use events for scene communication.
- Load fonts before creating dependent text objects.
- Use explicit and narrow collision shapes.
- Use a CPU-readable collision layer for Arcade Physics.
- Test changes on relevant real devices.
- Keep changes minimal and easy to review.

### Don't

- Duplicate milestones, TODOs, or detailed implementation steps in this file.
- Use browser dimensions as the primary gameplay coordinate system.
- Reintroduce per-frame UI scaling.
- Use CSS `zoom`, CSS transforms, or manual canvas scaling to fix layout issues.
- Mix world-camera logic into UI layout.
- Attach the HUD or dialogue to the world camera.
- Bypass the shared input abstraction.
- Create separate desktop and mobile movement systems.
- Allow UI taps to trigger world movement.
- Procedurally generate the static starting island.
- Hardcode spawn positions that belong in Tiled.
- Infer collision solely from visible artwork.
- Make grass, paths, or decoration collidable unintentionally.
- Attach Arcade Physics colliders to GPU-only tilemap layers.
- Add optional plugins speculatively.
- Break established naming contracts.
- Turn temporary work plans into permanent rules.

---

## Testing and Review Checklist

Before marking a change as complete, verify:

- [ ] The game boots without console errors.
- [ ] Logical resolution remains `1280 × 720`.
- [ ] Phaser uses `FIT` and `CENTER_BOTH`.
- [ ] Multiple aspect ratios display correctly.
- [ ] `UIScene` remains screen-fixed.
- [ ] UI layout updates correctly after resize.
- [ ] No per-frame manual UI scaling was introduced.
- [ ] Fonts load before dependent text objects are created.
- [ ] Text origins, padding, wrapping, and spacing are explicit.
- [ ] Keyboard movement works.
- [ ] Arrow-key movement works.
- [ ] Mouse click-to-move works.
- [ ] Mobile tap-to-move works.
- [ ] UI taps do not move the player.
- [ ] Hybrid input behavior works where relevant.
- [ ] Touch targets are at least 44–48 logical pixels where practical.
- [ ] Tiled layer and object names match the project contract.
- [ ] The collision layer is explicit and CPU-readable.
- [ ] Collision shapes are narrow and intentional.
- [ ] Trees, buildings, cliffs, rocks, and other blockers collide correctly.
- [ ] Grass, paths, and decoration do not collide unintentionally.
- [ ] NPCs respect collision and physics rules.
- [ ] Dynamic quest items spawn only through approved spawn logic.
- [ ] Spawn points are validated against walkability.
- [ ] Quest progress is updated through the quest system.
- [ ] Quest UI responds to quest events.
- [ ] Debug overlays work when enabled.
- [ ] Debug overlays are hidden or disabled for production.
- [ ] Relevant desktop, mobile, portrait, landscape, and hybrid cases were tested.
- [ ] TypeScript typecheck and lint were run after relevant changes when available.
- [ ] Official documentation was checked for changed or uncertain APIs.

---

## Quick File Index

Use these as the first places to look when making changes:

| Task                    | Primary files                                                |
| ----------------------- | ------------------------------------------------------------ |
| Phaser config and scale | `src/main.ts`                                                |
| World scene             | `src/scenes/IslandScene.ts`                                  |
| UI scene                | `src/scenes/UIScene.ts`                                      |
| UI constants and styles | `src/ui/UIConstants.ts`                                      |
| UI scaling helpers      | `src/ui/UIScale.ts`                                          |
| Quest HUD and questbook | `src/ui/QuestHUD.ts`                                         |
| Dialogue UI             | `src/ui/DialogBox.ts`                                        |
| Input layer             | `src/input/PlayerInputController.ts`                         |
| Player movement         | `src/objects/SunnysidePlayer.ts` or the current player class |
| NPC interaction         | `src/managers/InteractionManager.ts`, `src/objects/NPC.ts`   |
| Spawn logic             | `src/managers/SpawnManager.ts`                               |
| Quest state             | `src/managers/QuestManager.ts`                               |
| Quest data              | `public/assets/data/quests.json`                             |
| Static island map       | `public/assets/tilemaps/island.json`                         |
| Map and world metadata  | Tiled project files and object layers                        |
| Asset loading           | `public/assets/pack.json`, `src/scenes/PreloaderScene.ts`    |
| Fonts and assets        | `public/assets/`, `index.html`, `src/style.css`              |

If a listed file does not exist, locate the project's current equivalent before creating a new abstraction.

---

## Document Maintenance

Update **this file** only when:

- A stable architecture rule changes.
- A non-negotiable project constraint changes.
- An official dependency or version changes materially.
- A Tiled layer, object, tileset, property, or naming contract changes.
- A new tool or plugin becomes officially approved.
- A recurring bug requires a permanent guardrail.

Update the **Revised Consolidated Development Plan** for:

- Milestones
- Implementation order
- Feature specifications
- Acceptance criteria
- Detailed tasks
- Code examples
- Temporary work plans
- Sprint content
- Deprecated or completed implementation steps

Keep this file stable, concise, and reviewable. Do not allow it to become a second copy of the development roadmap.

```

```
