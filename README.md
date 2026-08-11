# KleeBlock Adventure

A small top-down adventure prototype built with **Phaser 4** (Vite + TypeScript).

```bash
npm install
npm run dev
```

**AI / agent handoff:** see **[AI_CONTEXT.md](./AI_CONTEXT.md)** for architecture, required skills, map contracts, and suggested next steps.

---

## Tiled map checklist

Maps are authored in **[Tiled](https://www.mapeditor.org/)** (free, open source) and loaded as JSON by Phaser.

| In repo | Role |
|---------|------|
| `public/assets/tilemaps/island.json` | Map loaded by the game |
| `public/assets/tilemaps/` (tileset image via pack) | SunnySide World tileset |

Prefer keeping a **`.tmx` source** next to the JSON (edit TMX, export JSON for the game).

### Layer order (required)

| Layer name | Purpose | In game |
|------------|---------|---------|
| `sea` | Water / background | Visible, GPU layer when WebGL |
| `ground` | Walkable terrain | Visible, GPU layer when WebGL |
| `ground_decoration` | Props on top of ground | Visible, GPU layer when WebGL |
| `collision` | Solid tiles only | Hidden; regular `TilemapLayer` for Arcade Physics |

Tileset name in Tiled must match code: **`sunnyside`**.

### Set collision on specific tiles

1. Open the map in Tiled.
2. Select the **sunnyside** tileset.
3. Click a tile that should be solid.
4. In **Properties**, add:
   - **Name:** `collides`
   - **Type:** `bool`
   - **Value:** `true`
5. Select the **collision** layer.
6. Paint that tile where the player must not walk; erase (empty) where they can.
7. Export / save JSON into `public/assets/tilemaps/island.json`.

Phaser uses:

```ts
this.collisionLayer.setCollisionByProperty({ collides: true });
```

Marking more solid tiles in Tiled does **not** require code changes.

### Resize / expand the map

1. In Tiled: **Map → Resize Map…**
2. Choose new width/height (tiles). Anchor existing content (e.g. center or top-left).
3. Paint new `sea` / `ground` / `ground_decoration` / `collision`.
4. Re-export JSON.
5. Playtest; camera bounds follow `map.widthInPixels` / `heightInPixels` automatically.

**Sizing guidance**

| Size (tiles) | Notes |
|--------------|--------|
| 20×20 | Current prototype |
| 64×64 – 128×128 | Comfortable single-map step up |
| Larger | Prefer multiple maps (zones) or chunking; keep collision sparse |

Visual layers use Phaser 4 **TilemapGPULayer** when WebGL is available (cost is mostly on-screen pixels). Collision stays on the CPU — paint only the solid cells you need.

### Export checklist

- [ ] Orientation: **Orthogonal**
- [ ] Tile size: **16×16** (matches SunnySide)
- [ ] Layer names exactly: `sea`, `ground`, `ground_decoration`, `collision`
- [ ] Tileset name: `sunnyside`
- [ ] Solid tiles have custom property `collides` = `true`
- [ ] Collision layer may be invisible in Tiled; it is forced hidden in game
- [ ] Export as **JSON** to `public/assets/tilemaps/island.json`
- [ ] Asset pack still points at the map key `island` (`public/assets/pack.json`)

### Multiple maps / bigger world (later)

1. Add `forest.json`, `village.json`, etc. with the same layer conventions.
2. Register each map in the asset pack.
3. Switch scenes or reload the tilemap on zone transitions.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Local dev server |
| `npm run build` | Typecheck + production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |
