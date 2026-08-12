# Kleeblock Adventure — Revised Consolidated Development Plan

The mobile and cross-platform input implementation should be added **immediately after the Phaser scaling foundation**, before fonts, UI scenes, player movement, collision, and quests.

This is earlier than placing it only after `UIScene`, because input affects:

- Player movement architecture
- Keyboard, mouse, touch, and joystick support
- Tap-to-move behavior
- World-coordinate conversion
- UI button placement
- Interaction with NPCs and objects
- Collision and walkability checks
- Questbook and interaction commands
- Desktop/mobile and portrait/landscape layouts

The recommended dependency order is therefore:

1. Phaser foundation and resolution
2. Shared input architecture
3. Fonts and text rendering
4. Dedicated `UIScene`
5. Container-based UI and responsive layout
6. Static island and Tiled map architecture
7. Player, NPC, and scenery collision
8. Dynamic quest item spawning
9. Quest state and progression
10. Tap-to-move refinement and optional joystick
11. Debugging and validation
12. Production and deployment checks

---

# Block 1 — Phaser Foundation, Logical Resolution, and Canvas Scaling

## Goal

Create one stable logical coordinate system for the entire game and allow Phaser to handle browser scaling.

Use:

- Logical resolution: **1280 × 720**
- Scale mode: `Phaser.Scale.FIT`
- Centering: `Phaser.Scale.CENTER_BOTH`
- No CSS scaling hacks
- No per-frame UI scaling

---

## Milestone 1.1 — Define the base resolution

### TODOs

- [ ] Create one source of truth for the game resolution.
- [ ] Add `BASE_WIDTH = 1280`.
- [ ] Add `BASE_HEIGHT = 720`.
- [ ] Export the constants for other systems.
- [ ] Stop using `window.innerWidth` and `window.innerHeight` as gameplay coordinates.
- [ ] Use Phaser's logical game size for UI and world positioning.

### Implementation

```ts
// src/config/GameConfig.ts

export const BASE_WIDTH = 1280;
export const BASE_HEIGHT = 720;
```

---

## Milestone 1.2 — Configure the Phaser Scale Manager

### TODOs

- [ ] Set Phaser width to `BASE_WIDTH`.
- [ ] Set Phaser height to `BASE_HEIGHT`.
- [ ] Use `Phaser.Scale.FIT`.
- [ ] Use `Phaser.Scale.CENTER_BOTH`.
- [ ] Allow Phaser to expand inside the parent container.
- [ ] Avoid `zoom`.
- [ ] Avoid `transform: scale(...)`.
- [ ] Avoid manually changing the canvas dimensions.
- [ ] Keep `roundPixels: true` for sharper pixel-art rendering.
- [ ] Test multiple aspect ratios.

### Implementation

```ts
// src/main.ts

import Phaser from 'phaser';
import { BASE_WIDTH, BASE_HEIGHT } from './config/GameConfig';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,

  width: BASE_WIDTH,
  height: BASE_HEIGHT,

  parent: 'game-container',
  backgroundColor: '#000000',

  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    expandParent: true,
  },

  render: {
    antialias: true,
    roundPixels: true,
  },

  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },

  scene: [BootScene, PreloaderScene, MainMenuScene, IslandScene, UIScene],
};

new Phaser.Game(config);
```

---

## Milestone 1.3 — Simplify the HTML and CSS wrapper

### TODOs

- [ ] Make `html` and `body` fill the browser.
- [ ] Make `#game-container` fill the browser.
- [ ] Center the canvas.
- [ ] Remove canvas transforms.
- [ ] Remove CSS zoom rules.
- [ ] Verify that no parent element stretches the canvas unexpectedly.

### Implementation

```css
/* src/style.css */

html,
body {
  margin: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #000;
}

#game-container {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

canvas {
  display: block;
}
```

---

## Milestone 1.4 — Verify Phaser dimensions

### TODOs

- [ ] Log `this.scale.gameSize`.
- [ ] Log `this.scale.displaySize`.
- [ ] Inspect the actual canvas dimensions in DevTools.
- [ ] Check parent elements for transforms.
- [ ] Verify that the logical size remains `1280 × 720`.
- [ ] Confirm that the display size changes with the browser.

### Implementation

```ts
console.log('Logical game size:', this.scale.gameSize);
console.log('Display size:', this.scale.displaySize);
console.log('Canvas:', this.game.canvas);
```

`gameSize` should normally remain `1280 × 720`. `displaySize` may be different and represents the physical display size.

---

# Block 2 — Shared Input Architecture and Platform-Independent Controls

## Goal

Create one input abstraction for keyboard, mouse, touch, and future joystick support.

The player should not care whether the command came from:

- W/A/S/D
- Arrow keys
- Mouse
- Touch
- A virtual joystick
- A UI button

Every input source should produce the same commands.

---

## Recommended architecture

```text
Keyboard ───────┐
Mouse ──────────┤
Touch ──────────┼──> PlayerInputController ───> PlayerMovementController
UI buttons ─────┤
Joystick ───────┘
```

The input layer detects intentions. The player movement system handles movement, collision, speed, and destination arrival.

---

## Milestone 2.1 — Define the shared command contract

### TODOs

- [ ] Create `src/input/PlayerInputController.ts`.
- [ ] Define `PlayerCommand`.
- [ ] Support direct movement vectors.
- [ ] Support destination-based movement.
- [ ] Support interaction.
- [ ] Support opening the Questbook.
- [ ] Support cancelling movement.
- [ ] Keep the controller independent from the player object.
- [ ] Ensure direct movement cancels tap-to-move.

### Implementation

```ts
// src/input/PlayerInputController.ts

import Phaser from 'phaser';

export type PlayerCommand =
  | {
      type: 'moveVector';
      x: number;
      y: number;
    }
  | {
      type: 'moveToPoint';
      x: number;
      y: number;
    }
  | {
      type: 'interact';
    }
  | {
      type: 'interactTarget';
      targetId: string;
    }
  | {
      type: 'openQuestbook';
    }
  | {
      type: 'cancelMovement';
    };

export class PlayerInputController {
  private moveVector = new Phaser.Math.Vector2(0, 0);
  private destination: Phaser.Math.Vector2 | null = null;

  setMoveVector(x: number, y: number): void {
    this.moveVector.set(x, y);

    // Keyboard or joystick input interrupts tap-to-move.
    if (x !== 0 || y !== 0) {
      this.destination = null;
    }
  }

  moveToPoint(x: number, y: number): void {
    this.destination = new Phaser.Math.Vector2(x, y);
    this.moveVector.set(0, 0);
  }

  clearDestination(): void {
    this.destination = null;
  }

  getMoveVector(): Phaser.Math.Vector2 {
    return this.moveVector.clone();
  }

  getDestination(): Phaser.Math.Vector2 | null {
    return this.destination?.clone() ?? null;
  }
}
```

---

## Milestone 2.2 — Create the player movement controller

### TODOs

- [ ] Read movement data from `PlayerInputController`.
- [ ] Move the player with Arcade Physics velocity.
- [ ] Normalize diagonal movement.
- [ ] Stop when the destination is reached.
- [ ] Stop when the player is close enough to an interactive target.
- [ ] Cancel destination movement when keyboard or joystick movement begins.
- [ ] Keep player movement separate from raw input detection.
- [ ] Use the collision system rather than teleporting the player.

### Example movement logic

```ts
const direction = inputController.getMoveVector();
const destination = inputController.getDestination();

if (direction.lengthSq() > 0) {
  direction.normalize();

  player.setVelocity(direction.x * PLAYER_SPEED, direction.y * PLAYER_SPEED);
} else if (destination) {
  const distance = Phaser.Math.Distance.Between(player.x, player.y, destination.x, destination.y);

  if (distance <= 8) {
    player.setVelocity(0, 0);
    inputController.clearDestination();
  } else {
    const angle = Phaser.Math.Angle.Between(player.x, player.y, destination.x, destination.y);

    player.setVelocity(Math.cos(angle) * PLAYER_SPEED, Math.sin(angle) * PLAYER_SPEED);
  }
} else {
  player.setVelocity(0, 0);
}
```

---

## Milestone 2.3 — Implement desktop keyboard controls

### TODOs

- [ ] Keep W/A/S/D movement.
- [ ] Keep arrow-key movement.
- [ ] Normalize diagonal movement.
- [ ] Bind `E` to interaction.
- [ ] Bind `I` to opening the Questbook.
- [ ] Bind `Escape` to cancelling movement or closing a UI panel.
- [ ] Emit action keys once per press rather than repeatedly every frame.
- [ ] Clean up keyboard listeners during scene shutdown.

### Recommended controls

| Input           | Action                        |
| --------------- | ----------------------------- |
| W / Arrow Up    | Move up                       |
| A / Arrow Left  | Move left                     |
| S / Arrow Down  | Move down                     |
| D / Arrow Right | Move right                    |
| E               | Interact                      |
| I               | Open Questbook                |
| Escape          | Cancel movement / close panel |

---

## Milestone 2.4 — Implement desktop mouse click-to-move

### TODOs

- [ ] Listen for `pointerdown`.
- [ ] Ignore pointer events originating from UI.
- [ ] Convert pointer coordinates to world coordinates.
- [ ] Check for NPCs, items, doors, and other interactive targets.
- [ ] Prioritize interaction over movement.
- [ ] Check whether ground destinations are walkable.
- [ ] Set a destination through `PlayerInputController`.

### Implementation

```ts
this.input.on(
  'pointerdown',
  (pointer: Phaser.Input.Pointer) => {
    if (this.isPointerOnUI(pointer)) {
      return;
    }

    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);

    const target = this.findInteractiveTarget(worldPoint.x, worldPoint.y);

    if (target) {
      this.events.emit('input:interactTarget', {
        target,
      });

      return;
    }

    if (this.isWalkable(worldPoint.x, worldPoint.y)) {
      this.playerInput.moveToPoint(worldPoint.x, worldPoint.y);
    }
  },
  this,
);
```

Use `camera.getWorldPoint()` so camera scrolling and `Phaser.Scale.FIT` are handled correctly.

---

## Milestone 2.5 — Add mobile tap-to-move

### TODOs

- [ ] Use tap-to-move as the initial mobile movement method.
- [ ] Reuse the same pointer-to-world conversion used by mouse input.
- [ ] Ignore taps on UI controls.
- [ ] Check for interactive objects first.
- [ ] Check walkability before assigning a destination.
- [ ] Display a destination marker if useful.
- [ ] Cancel movement when the player taps a new destination.
- [ ] Test single tap, drag, and accidental taps.

Tap-to-move should be implemented before a virtual joystick. It provides a simpler first mobile control scheme and avoids unnecessary UI complexity.

---

## Milestone 2.6 — Detect device capabilities

### TODOs

- [ ] Detect touch support through Phaser.
- [ ] Detect mouse support.
- [ ] Support hybrid devices such as touchscreen laptops.
- [ ] Do not rely only on user-agent detection.
- [ ] Allow an optional manual control preference in Settings.
- [ ] Recalculate mobile UI layout after orientation changes.

### Example

```ts
export class DeviceDetector {
  static isTouchCapable(game: Phaser.Game): boolean {
    return game.device.input.touch;
  }

  static supportsMouse(game: Phaser.Game): boolean {
    return game.device.input.mouse;
  }

  static isHybrid(game: Phaser.Game): boolean {
    return this.isTouchCapable(game) && this.supportsMouse(game);
  }
}
```

---

## Milestone 2.7 — Define input events

### TODOs

- [ ] Define stable event names.
- [ ] Keep event payloads small.
- [ ] Avoid passing complete game objects through UI events.
- [ ] Make world-to-UI and UI-to-world communication explicit.

### Recommended events

```text
input:interact
input:interactTarget
input:openQuestbook
input:cancel
quest:update
quest:progressChanged
quest:completed
item:collected
```

---

# Block 3 — Font Loading and Text Rendering Foundation

## Goal

Make text layout reliable before UI components are created.

Late-loading fonts can change text width and cause panels, labels, and dialogue to shift.

---

## Milestone 3.1 — Preload the game font

### TODOs

- [ ] Add the font to `public/fonts/`.
- [ ] Preload the font in `index.html`.
- [ ] Define `@font-face`.
- [ ] Use `font-display: block` when layout stability is more important than immediate fallback text.
- [ ] Confirm the font works in development and production.
- [ ] Consider `BitmapText` for extremely crisp pixel-art text.

### Implementation

```html
<link rel="preload" href="/fonts/GameFont.woff2" as="font" type="font/woff2" crossorigin />
```

```css
@font-face {
  font-family: 'GameFont';
  src: url('/fonts/GameFont.woff2') format('woff2');
  font-display: block;
}
```

---

## Milestone 3.2 — Wait for fonts before creating important UI

### TODOs

- [ ] Wait for `document.fonts.ready` during boot if necessary.
- [ ] Create important text only after the font is available.
- [ ] Test text wrapping and alignment on a production build.

### Example

```ts
await document.fonts.ready;
```

---

## Milestone 3.3 — Centralize UI styles

### TODOs

- [ ] Create `src/ui/UIConstants.ts`.
- [ ] Define margins and spacing.
- [ ] Define font family.
- [ ] Define title, body, and small text styles.
- [ ] Define panel colors and transparency.
- [ ] Use the constants in every UI component.

### Implementation

```ts
export const UI_CONFIG = {
  MARGIN: 32,
  SPACING: 16,
  FONT_FAMILY: 'GameFont',
  TEXT_COLOR: '#ffffff',
  PANEL_COLOR: 0x1a1a2e,
  PANEL_ALPHA: 0.95,
};

export const TEXT_STYLES = {
  title: {
    fontFamily: UI_CONFIG.FONT_FAMILY,
    fontSize: '24px',
    color: UI_CONFIG.TEXT_COLOR,
    padding: {
      left: 4,
      right: 4,
      top: 4,
      bottom: 4,
    },
  },

  body: {
    fontFamily: UI_CONFIG.FONT_FAMILY,
    fontSize: '20px',
    color: UI_CONFIG.TEXT_COLOR,
    lineSpacing: 5,
  },

  small: {
    fontFamily: UI_CONFIG.FONT_FAMILY,
    fontSize: '16px',
    color: UI_CONFIG.TEXT_COLOR,
  },
};
```

---

# Block 4 — Dedicated `UIScene`

## Goal

Separate screen-space interface logic from world and player logic.

The world scene should manage the map, player, NPCs, collision, and quest systems. `UIScene` should manage HUD, dialogue, Questbook, mobile controls, and interface layout.

---

## Milestone 4.1 — Create `UIScene`

### TODOs

- [ ] Create `src/scenes/UIScene.ts`.
- [ ] Add `UIScene` to the Phaser scene list.
- [ ] Launch it alongside `IslandScene`.
- [ ] Move HUD and dialogue into `UIScene`.
- [ ] Listen for quest events.
- [ ] Listen for input events.
- [ ] Listen for resize events.
- [ ] Keep the UI fixed while the world camera scrolls.

### Implementation

```ts
export class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: 'UIScene' });
  }

  create() {
    this.scale.on(Phaser.Scale.Events.RESIZE, this.relayout, this);

    this.relayout();
  }

  private relayout() {
    const { width, height } = this.scale.gameSize;

    // Position screen-space UI here.
  }
}
```

Launch it from `IslandScene`:

```ts
if (!this.scene.isActive('UIScene')) {
  this.scene.launch('UIScene');
}
```

---

## Milestone 4.2 — Establish scene communication

### TODOs

- [ ] Let `IslandScene` emit quest updates.
- [ ] Let `UIScene` display quest updates.
- [ ] Let UI buttons emit input commands.
- [ ] Avoid direct UI access to the player or map.
- [ ] Avoid positioning UI elements from `IslandScene`.
- [ ] Unregister listeners during `shutdown()`.

### Example world-to-UI events

```ts
this.events.emit('quest:update', {
  title: 'Find the Ancient Key',
  description: 'Search the island ruins.',
});

this.events.emit('quest:progressChanged', {
  questId: 'find_supplies',
  current: 2,
  required: 3,
});

this.events.emit('quest:completed', {
  questId: 'find_supplies',
});
```

---

# Block 5 — Container-Based UI and Responsive Layout

## Goal

Make every UI component behave as one unit and remain stable at different sizes.

---

## Milestone 5.1 — Convert the Quest HUD into a container

### TODOs

- [ ] Create `src/ui/QuestHUD.ts`.
- [ ] Extend `Phaser.GameObjects.Container`.
- [ ] Place panel, title, description, icon, and progress text inside the container.
- [ ] Use local child coordinates.
- [ ] Position the complete HUD through the container only.
- [ ] Use top-left origins for top-left panels.

### Example

```ts
export class QuestHUD extends Phaser.GameObjects.Container {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    const background = scene.add.rectangle(0, 0, 360, 140, 0x1a1a2e, 0.95);

    background.setOrigin(0, 0);

    const title = scene.add.text(16, 12, 'Quest', TEXT_STYLES.title);

    const body = scene.add.text(16, 48, '', TEXT_STYLES.body);

    this.add([background, title, body]);
    scene.add.existing(this);
  }
}
```

---

## Milestone 5.2 — Create a responsive dialogue box

### TODOs

- [ ] Create `src/ui/DialogBox.ts`.
- [ ] Group background and text in a container.
- [ ] Set explicit panel dimensions.
- [ ] Keep text padding at least 20 logical pixels.
- [ ] Update word-wrap width whenever panel width changes.
- [ ] Add `show()`, `hide()`, and `setText()` methods.
- [ ] Round final positions with `Math.round()`.

### Example

```ts
dialogText.setWordWrapWidth(panelWidth - 40);
dialogBox.setPosition(Math.round(x), Math.round(y));
```

---

## Milestone 5.3 — Add anchor-based layout helpers

### TODOs

- [ ] Add top-left anchor.
- [ ] Add top-right anchor.
- [ ] Add bottom-left anchor.
- [ ] Add bottom-right anchor.
- [ ] Add center anchor.
- [ ] Recalculate positions on resize.
- [ ] Use `this.scale.gameSize`, not browser dimensions.

### Example

```ts
export function getUIAnchors(width: number, height: number) {
  return {
    topLeft: {
      x: UI_CONFIG.MARGIN,
      y: UI_CONFIG.MARGIN,
    },

    topRight: {
      x: width - UI_CONFIG.MARGIN,
      y: UI_CONFIG.MARGIN,
    },

    bottomLeft: {
      x: UI_CONFIG.MARGIN,
      y: height - UI_CONFIG.MARGIN,
    },

    bottomRight: {
      x: width - UI_CONFIG.MARGIN,
      y: height - UI_CONFIG.MARGIN,
    },

    center: {
      x: width / 2,
      y: height / 2,
    },
  };
}
```

---

## Milestone 5.4 — Remove per-frame UI scaling

### TODOs

- [ ] Remove repeated scale multiplication from `update()`.
- [ ] Stop scaling UI every frame.
- [ ] Recalculate layout only in response to `RESIZE`.
- [ ] Verify that layout is deterministic.
- [ ] Clean up resize listeners when scenes shut down.

---

## Milestone 5.5 — Add mobile UI controls

### TODOs

- [ ] Add a large Questbook button.
- [ ] Add a contextual Interact button.
- [ ] Add touch-friendly hit areas.
- [ ] Place movement controls bottom-left if a joystick is enabled.
- [ ] Place action controls bottom-right.
- [ ] Keep adequate spacing between buttons.
- [ ] Reflow controls in portrait and landscape.
- [ ] Hide controls that are not currently useful.
- [ ] Do not rely on hover-only behavior.

### Touch target size

Use a minimum touch target of **44–48 logical pixels**.

### Example

```ts
const button = this.add
  .image(0, 0, 'questbook-icon')
  .setDisplaySize(32, 32)
  .setInteractive(new Phaser.Geom.Rectangle(-8, -8, 48, 48), Phaser.Geom.Rectangle.Contains);

button.on('pointerdown', () => {
  this.events.emit('input:openQuestbook');
});
```

---

## Milestone 5.6 — Prevent UI and world input conflicts

### TODOs

- [ ] Prevent UI clicks from triggering world movement.
- [ ] Track whether a pointer is currently interacting with UI.
- [ ] Distinguish tap, drag, and button press.
- [ ] Test multiple simultaneous touches.
- [ ] Support touch-and-mouse hybrid devices.
- [ ] Avoid interpreting joystick movement as world taps.
- [ ] Verify that buttons remain reachable by the thumb.

---

# Block 6 — Static Island and Tiled Map Architecture

## Goal

Keep the island authored and fixed in Tiled while allowing runtime content such as quest items to be added dynamically.

The island should not be procedurally regenerated if the objective is a designed, explorable world.

---

## Milestone 6.1 — Build the static island in Tiled

### TODOs

- [ ] Create the island in Tiled.
- [ ] Use one consistent tile size.
- [ ] Define visible and data layers.
- [ ] Add an `ItemSpawns` object layer.
- [ ] Add an `NPCSpawns` object layer if needed.
- [ ] Add a `Triggers` object layer for interaction zones and transitions.

### Recommended layers

```text
Ground       — grass, dirt, sand, terrain
Water        — water and optional blocking water
Paths        — walkable paths and decorative details
Collision    — hidden blocking tiles
Objects      — trees, buildings, rocks, decorations
NPCSpawns    — NPC spawn points
ItemSpawns   — collectible spawn points
Triggers     — interaction and transition zones
```

### Map-size recommendations

For 16-pixel tiles:

- `160 × 120` tiles = `2560 × 1920` pixels
- `200 × 150` tiles = `3200 × 2400` pixels

For 32-pixel tiles:

- `120 × 80` tiles = `3840 × 2560` pixels
- `160 × 100` tiles = `5120 × 3200` pixels

Start with a manageable map and expand after testing exploration, camera behavior, and collision density.

---

## Milestone 6.2 — Separate visuals from collision

### TODOs

- [ ] Keep visual artwork separate from collision data.
- [ ] Mark only genuinely blocking tiles with `collides = true`.
- [ ] Keep ordinary grass and paths walkable.
- [ ] Use object-layer rectangles or polygons for irregular obstacles.
- [ ] Use narrow collision shapes for trees and buildings.
- [ ] Avoid giant invisible blockers.

Recommended collision behavior:

- Tree: trunk/base only
- Building: walls only
- Rock: narrow base shape
- Fence: thin line or rectangle
- Cliffs: intentional boundary shape
- Canopy: visual only

A tree collision body could be approximately **12 × 10 pixels** near the base, depending on the artwork.

---

## Milestone 6.3 — Load the map in Phaser

### TODOs

- [ ] Preload the Tiled JSON map.
- [ ] Preload the tileset image.
- [ ] Validate that the tileset exists.
- [ ] Create all required layers.
- [ ] Validate that the `Collision` layer exists.
- [ ] Hide the collision layer outside debug mode.
- [ ] Set collision by tile property.
- [ ] Set camera bounds to the map bounds.

### Preload

```ts
this.load.tilemapTiledJSON('island', 'assets/maps/island.json');

this.load.image('island_tileset', 'assets/tilesets/island_tileset.png');
```

### Map creation

```ts
const map = this.make.tilemap({
  key: 'island',
});

const tileset = map.addTilesetImage('island_tileset', 'island_tileset');

if (!tileset) {
  throw new Error('Tileset load failed');
}

map.createLayer('Ground', tileset, 0, 0);
map.createLayer('Water', tileset, 0, 0);
map.createLayer('Paths', tileset, 0, 0);

const collisionLayer = map.createLayer('Collision', tileset, 0, 0);

if (!collisionLayer) {
  throw new Error('Collision layer not found');
}

collisionLayer.setVisible(false);

collisionLayer.setCollisionByProperty({
  collides: true,
});

this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
```

---

# Block 7 — Player, NPC, and Scenery Collision

## Goal

Make movement physically consistent and ensure that walkability checks use the same collision data as actual physics.

---

## Milestone 7.1 — Add player collision

### TODOs

- [ ] Add an Arcade Physics body to the player.
- [ ] Set the body width and height appropriately.
- [ ] Position the body near the player's feet.
- [ ] Add a collider with the collision layer.
- [ ] Test that the player cannot walk through blocking tiles.
- [ ] Test that the player can walk on grass and paths.

### Implementation

```ts
this.physics.add.collider(this.player, this.collisionLayer);
```

---

## Milestone 7.2 — Add NPC physics

### TODOs

- [ ] Add Arcade Physics to each collidable NPC.
- [ ] Add NPC-to-collision-layer colliders.
- [ ] Optionally add NPC-to-NPC collision.
- [ ] Use velocity-based movement.
- [ ] Do not directly assign `x` and `y` every frame for physics-driven NPCs.
- [ ] Test NPC behavior around buildings and obstacles.

### Implementation

```ts
this.physics.add.existing(npc);

this.physics.add.collider(npc, this.collisionLayer);
```

---

## Milestone 7.3 — Add scenery collision shapes

### TODOs

- [ ] Create a static physics group for scenery.
- [ ] Add narrow trunk colliders for trees.
- [ ] Add wall colliders for buildings.
- [ ] Add collision shapes for rocks, fences, and cliffs.
- [ ] Add player-to-scenery collision.
- [ ] Add NPC-to-scenery collision.
- [ ] Keep decorative visuals separate from physical bodies.

### Example

```ts
const sceneryColliders = this.physics.add.staticGroup();

const trunkBody = this.add.rectangle(tree.x, tree.y + 12, 12, 10);

this.physics.add.existing(trunkBody, true);

sceneryColliders.add(trunkBody);

this.physics.add.collider(this.player, sceneryColliders);
```

---

## Milestone 7.4 — Connect input to walkability

### TODOs

- [ ] Use the collision layer when validating tap/click destinations.
- [ ] Reject destinations inside blocking tiles.
- [ ] Reject destinations outside map bounds.
- [ ] Consider checking the player body's full footprint, not only its center.
- [ ] Stop or reroute when an obstacle blocks a straight-line destination.
- [ ] Keep simple direct movement initially.
- [ ] Add pathfinding only if obstacles make direct movement unreliable.

A first implementation may use direct movement toward a valid destination. If the island contains many obstacles, add grid-based pathfinding later rather than prematurely building a complex navigation system.

---

# Block 8 — Dynamic Quest Item Spawning

## Goal

Keep the island static while spawning quest-specific items dynamically at controlled Tiled spawn points.

---

## Milestone 8.1 — Add item spawn points in Tiled

### TODOs

- [ ] Create the `ItemSpawns` object layer.
- [ ] Place spawn points only on walkable terrain.
- [ ] Keep spawn points away from trees, buildings, and NPCs.
- [ ] Add region or quest properties if useful.
- [ ] Export the map with the object layer included.

Recommended constraints:

- Minimum distance from the player: **200 pixels**
- Minimum distance between item spawn points: **100+ pixels**
- Avoid direct overlap with NPCs and scenery.
- Distribute points across multiple island regions.

Example:

```text
ItemSpawns
  beach_supply_01:  x=300, y=400
  beach_supply_02:  x=450, y=400
  ruins_supply_01:  x=900, y=250
  forest_supply_01: x=600, y=600
```

---

## Milestone 8.2 — Create `CollectibleItem`

### TODOs

- [ ] Create `src/objects/CollectibleItem.ts`.
- [ ] Extend `Phaser.Physics.Arcade.Sprite`.
- [ ] Store `itemId`.
- [ ] Store `questId`.
- [ ] Disable gravity.
- [ ] Make the item immovable.
- [ ] Add a collection effect.
- [ ] Optionally add a bobbing animation.
- [ ] Destroy or deactivate the item after collection.

### Implementation

```ts
export class CollectibleItem extends Phaser.Physics.Arcade.Sprite {
  public readonly itemId: string;
  public readonly questId: string;

  constructor(scene: Phaser.Scene, x: number, y: number, itemKey: string, questId: string) {
    super(scene, x, y, itemKey);

    this.itemId = itemKey;
    this.questId = questId;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setImmovable(true);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);

    this.setDepth(10);
  }
}
```

---

## Milestone 8.3 — Implement `SpawnManager`

### TODOs

- [ ] Create `src/managers/SpawnManager.ts`.
- [ ] Read points from the `ItemSpawns` object layer.
- [ ] Shuffle candidate points.
- [ ] Check map walkability.
- [ ] Check distance from the player.
- [ ] Check distance from existing items.
- [ ] Check scenery and NPC overlap.
- [ ] Spawn the requested number of items.
- [ ] Track active items.
- [ ] Emit collection events.
- [ ] Remove collected items from the active list.
- [ ] Handle insufficient valid spawn points gracefully.

### Recommended structure

```ts
class SpawnManager {
  private activeItems: CollectibleItem[] = [];

  spawnForQuest(questId: string, itemKey: string, count: number): CollectibleItem[] {
    // Read ItemSpawns.
    // Shuffle candidates.
    // Validate candidates.
    // Create CollectibleItem instances.
    // Return successfully spawned items.
  }
}
```

Keep spawning separate from quest progression. The `SpawnManager` decides where items appear; the `QuestManager` decides whether collecting them advances the quest.

---

## Milestone 8.4 — Add item collection

### TODOs

- [ ] Add player-to-item overlap detection.
- [ ] Verify that the item belongs to the active quest.
- [ ] Emit `item:collected`.
- [ ] Pass the `questId` and `itemId`.
- [ ] Play feedback such as sound, particles, or animation.
- [ ] Remove the item from the world.
- [ ] Prevent duplicate collection events.

### Example event

```ts
this.events.emit('item:collected', {
  itemId: item.itemId,
  questId: item.questId,
});
```

---

# Block 9 — Quest State and Progression

## Goal

Keep quest logic independent from UI, player input, and item spawning.

---

## Milestone 9.1 — Create `QuestManager`

### TODOs

- [ ] Create `src/managers/QuestManager.ts`.
- [ ] Define quest data.
- [ ] Track the active quest.
- [ ] Track required item count.
- [ ] Track current progress.
- [ ] Listen for `item:collected`.
- [ ] Ignore items belonging to unrelated quests.
- [ ] Emit progress updates.
- [ ] Emit completion events.
- [ ] Support starting and ending quests.

### Example quest data

```ts
export interface QuestDefinition {
  id: string;
  title: string;
  description: string;
  itemKey: string;
  requiredCount: number;
}
```

---

## Milestone 9.2 — Connect quest start to spawning

### TODOs

- [ ] Start the quest from an NPC or trigger.
- [ ] Register the active quest.
- [ ] Ask `SpawnManager` to spawn the required items.
- [ ] Update the HUD.
- [ ] Display the required count.
- [ ] Handle insufficient spawn points.
- [ ] Prevent starting the same quest twice unless intended.

### Flow

```text
NPC interaction
    ↓
QuestManager.startQuest()
    ↓
SpawnManager.spawnForQuest()
    ↓
QuestHUD displays objective
    ↓
Player collects items
    ↓
QuestManager receives item:collected
    ↓
QuestHUD displays progress
    ↓
QuestManager emits quest:completed
```

---

## Milestone 9.3 — Connect quest progress to `UIScene`

### TODOs

- [ ] Listen for `quest:update`.
- [ ] Listen for `quest:progressChanged`.
- [ ] Listen for `quest:completed`.
- [ ] Update title, description, and progress.
- [ ] Show completion feedback.
- [ ] Keep quest state out of the HUD.
- [ ] Ensure the HUD only presents state supplied by the quest system.

### Example

```ts
this.events.emit('quest:progressChanged', {
  questId,
  current,
  required,
});
```

---

# Block 10 — Tap-to-Move Refinement and Optional Virtual Joystick

## Goal

Polish mobile movement after the shared input system, collision, and basic map movement are working.

Tap-to-move should be implemented first. A joystick should remain optional until testing demonstrates that it is necessary.

---

## Milestone 10.1 — Improve tap-to-move behavior

### TODOs

- [ ] Add a visual destination marker.
- [ ] Cancel the marker when the player arrives.
- [ ] Cancel the destination when keyboard or joystick input begins.
- [ ] Stop at a safe distance from NPCs and objects.
- [ ] Support move-then-interact for distant targets.
- [ ] Reject blocked destinations.
- [ ] Prevent movement when dialogue or a modal UI is open.
- [ ] Distinguish a tap from a drag.
- [ ] Test taps near screen edges and UI controls.

---

## Milestone 10.2 — Add optional virtual joystick

### TODOs

- [ ] Implement the joystick only after tap-to-move is validated.
- [ ] Add a feature flag or settings option.
- [ ] Place the joystick bottom-left.
- [ ] Use a sufficiently large touch area.
- [ ] Convert joystick output to a normalized movement vector.
- [ ] Feed it into `PlayerInputController.setMoveVector()`.
- [ ] Cancel tap-to-move while the joystick is active.
- [ ] Support multitouch with the joystick and action buttons.
- [ ] Hide or disable the joystick when not selected.

The joystick must use the same command path as keyboard movement:

```text
Joystick vector
    ↓
PlayerInputController.setMoveVector()
    ↓
PlayerMovementController
```

---

# Block 11 — Debugging and Validation Tools

## Goal

Make map, collision, scaling, input, and asset problems visible as early as possible.

---

## Milestone 11.1 — Enable physics debugging

### TODOs

- [ ] Enable Arcade Physics debug mode during development.
- [ ] Display player body bounds.
- [ ] Display NPC bodies.
- [ ] Display scenery colliders.
- [ ] Display collectible bodies.
- [ ] Disable debug rendering for production.
- [ ] Add a keyboard toggle, such as `F`, if useful.

Physics debug is especially important for:

- “Why can’t I walk here?”
- Incorrect player body offsets
- Full-sprite tree blockers
- NPCs passing through walls
- Items spawning inside obstacles

---

## Milestone 11.2 — Add map and layer validation

### TODOs

- [ ] Validate that the `Ground` layer exists.
- [ ] Validate that the `Collision` layer exists.
- [ ] Validate that the `ItemSpawns` layer exists when quests require it.
- [ ] Validate the tileset.
- [ ] Log missing layers clearly.
- [ ] Add a debug toggle for the collision layer.
- [ ] Check that collision properties are correctly exported from Tiled.

---

## Milestone 11.3 — Add input debugging

### TODOs

- [ ] Display the current input source.
- [ ] Display the current move vector.
- [ ] Display the active destination.
- [ ] Display the pointer's world coordinates.
- [ ] Display whether the pointer was blocked by UI.
- [ ] Test keyboard, mouse, touch, and hybrid input.
- [ ] Test multitouch.
- [ ] Test portrait and landscape orientation.
- [ ] Test input after scene restart or reload.

---

## Milestone 11.4 — Validate fonts and assets

### TODOs

- [ ] Check that `GameFont.woff2` loads.
- [ ] Check font paths in production.
- [ ] Check tileset paths.
- [ ] Check map JSON paths.
- [ ] Check item texture paths.
- [ ] Use browser DevTools to inspect 404 errors.
- [ ] Confirm that Vite is not rewriting asset paths incorrectly.

Many apparent Vite or Phaser problems are actually incorrect font, map, or texture paths.

---

# Block 12 — Production, Vite, and Deployment Checks

## Goal

Ensure the game works after building and deploying, not only in local development.

---

## Milestone 12.1 — Verify Vite base paths

### TODOs

- [ ] Determine whether the game is deployed at the domain root or a subfolder.
- [ ] Set the correct Vite `base` value.
- [ ] Test map, font, tileset, and item paths in a production build.
- [ ] Run the built game locally before deploying.
- [ ] Check browser console errors after deployment.

Example for a subfolder deployment:

```ts
// vite.config.ts

import { defineConfig } from 'vite';

export default defineConfig({
  base: '/kleeblock-adventure/',
});
```

Use the correct deployment path for the actual hosting environment.

---

## Milestone 12.2 — Build and test the production version

### TODOs

- [ ] Run the TypeScript build.
- [ ] Run the Vite production build.
- [ ] Serve the `dist` directory locally.
- [ ] Test all asset paths.
- [ ] Test scaling.
- [ ] Test fonts.
- [ ] Test mobile input.
- [ ] Test quest spawning and collection.
- [ ] Check loading performance.

---

## Milestone 12.3 — Test real devices

### TODOs

- [ ] Test desktop Chrome or Firefox.
- [ ] Test desktop Safari if supported.
- [ ] Test Android Chrome.
- [ ] Test iOS Safari.
- [ ] Test a touchscreen laptop.
- [ ] Test portrait orientation.
- [ ] Test landscape orientation.
- [ ] Test narrow phones.
- [ ] Test tablets.
- [ ] Test fullscreen.
- [ ] Test browser resizing while the game is running.
- [ ] Test touch-and-mouse hybrid behavior.
- [ ] Test after refreshing and returning to the game.

Real-device testing is more valuable than desktop mobile emulation for validating touch targets, orientation changes, browser UI behavior, and multitouch.

---

# Recommended Project Structure

```text
src/
├── config/
│   └── GameConfig.ts
│
├── scenes/
│   ├── BootScene.ts
│   ├── PreloaderScene.ts
│   ├── MainMenuScene.ts
│   ├── IslandScene.ts
│   └── UIScene.ts
│
├── input/
│   ├── PlayerInputController.ts
│   ├── DesktopKeyboardController.ts
│   ├── DesktopMouseController.ts
│   ├── TouchController.ts
│   ├── VirtualJoystickController.ts
│   └── DeviceDetector.ts
│
├── player/
│   ├── Player.ts
│   └── PlayerMovementController.ts
│
├── ui/
│   ├── UIConstants.ts
│   ├── UIScale.ts
│   ├── QuestHUD.ts
│   ├── DialogBox.ts
│   ├── QuestbookPanel.ts
│   └── TouchButton.ts
│
├── objects/
│   ├── CollectibleItem.ts
│   ├── NPC.ts
│   └── SceneryCollider.ts
│
├── managers/
│   ├── QuestManager.ts
│   ├── SpawnManager.ts
│   ├── InteractionManager.ts
│   └── InputManager.ts
│
└── style.css
```

---

# Final Implementation Sequence

## Phase A — Technical foundation

- [ ] Define `BASE_WIDTH = 1280`.
- [ ] Define `BASE_HEIGHT = 720`.
- [ ] Configure `Phaser.Scale.FIT`.
- [ ] Configure `Phaser.Scale.CENTER_BOTH`.
- [ ] Simplify the HTML/CSS wrapper.
- [ ] Verify logical and display dimensions.

## Phase B — Input foundation

- [ ] Create `PlayerCommand`.
- [ ] Create `PlayerInputController`.
- [ ] Create a player movement controller.
- [ ] Add WSAD and arrow movement.
- [ ] Add keyboard shortcuts.
- [ ] Add mouse click-to-move.
- [ ] Add mobile tap-to-move.
- [ ] Add pointer-to-world conversion.
- [ ] Add UI input filtering.
- [ ] Add device capability detection.

## Phase C — Text and UI architecture

- [ ] Load `GameFont.woff2`.
- [ ] Wait for font readiness where needed.
- [ ] Centralize text styles.
- [ ] Create and launch `UIScene`.
- [ ] Create container-based `QuestHUD`.
- [ ] Create container-based `DialogBox`.
- [ ] Add resize-driven layout.
- [ ] Add mobile buttons.
- [ ] Add portrait and landscape reflow.

## Phase D — World foundation

- [ ] Create the static Tiled island.
- [ ] Add `Ground`, `Water`, `Paths`, and `Collision`.
- [ ] Add `Objects`, `NPCSpawns`, `ItemSpawns`, and `Triggers`.
- [ ] Load the map.
- [ ] Configure collision properties.
- [ ] Add player collision.
- [ ] Add NPC collision.
- [ ] Add precise scenery collision.
- [ ] Connect destination validation to walkability.

## Phase E — Dynamic quest content

- [ ] Create `CollectibleItem`.
- [ ] Create `SpawnManager`.
- [ ] Validate item spawn points.
- [ ] Add minimum distance rules.
- [ ] Add player-item collection.
- [ ] Create `QuestManager`.
- [ ] Start quests from NPCs or triggers.
- [ ] Spawn quest items.
- [ ] Track progress.
- [ ] Display progress in `UIScene`.
- [ ] Complete quests through events.

## Phase F — Mobile refinement

- [ ] Add destination markers.
- [ ] Improve move-then-interact.
- [ ] Improve blocked-destination behavior.
- [ ] Add optional virtual joystick.
- [ ] Support multitouch.
- [ ] Test hybrid devices.
- [ ] Test orientation changes.

## Phase G — Stabilization and release

- [ ] Enable physics debugging.
- [ ] Add collision-layer visualization.
- [ ] Add input debugging.
- [ ] Validate assets and map layers.
- [ ] Validate Vite base paths.
- [ ] Build the production version.
- [ ] Test the built version locally.
- [ ] Test on real desktop and mobile devices.
- [ ] Disable debugging for production.

---

# Core Architecture Rules

- **Phaser owns scaling.**
- The internal resolution is **1280 × 720**.
- Use `Phaser.Scale.FIT` and `Phaser.Scale.CENTER_BOTH`.
- Do not use CSS `zoom` or `transform: scale(...)`.
- `UIScene` owns all screen-space UI.
- World scenes should not position HUD or dialogue elements.
- UI components should use containers.
- UI layout should update on resize, not every frame.
- Load fonts before creating important text.
- Keyboard, mouse, touch, and joystick must use the same input abstraction.
- The player should consume commands, not inspect raw input devices.
- Tap-to-move should be implemented before the optional joystick.
- The island should remain static and authored in Tiled.
- Quest items should spawn dynamically at controlled spawn points.
- Collision should be explicit and separate from visual artwork.
- Tree trunks and building walls should use precise collision shapes.
- Quest state, spawning, UI, and movement should remain separate systems.
- Communication between systems should use stable, small events.
- Debug collision and input visually before trying to fix behavior by guesswork.
- Test on real mobile devices before considering the mobile implementation complete.
