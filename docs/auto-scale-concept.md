# Responsive UI/HUD Auto-Scaling Concept

## Goal
Make every UI/HUD/text element scale automatically between the minimum game window size (**320×320**) and the maximum game window size, with **no fixed pixel sizes** and **crisp integer-pixel rendering** at all scales.

## Current State
- `roundPixels: true` is enabled in `src/main.ts`
- `QuestHUD`, `DialogBox`, and `IslandScene` HUD use viewport-derived sizing
- Book icon hover no longer uses container `setScale()`
- Main menu play button hover no longer uses container `setScale()`

## Proposed Unified Scaling Strategy

### Option A — Central `uiScale()` Helper (Recommended)

**Concept:** One shared `uiScale(v)` helper that every UI file imports. It computes a scale factor from the smaller viewport axis, clamps it, rounds it, and returns an integer pixel value.

```ts
// src/ui/UIScale.ts
export function uiScale(v: number): number {
  const cam = cameras.main;
  const minAxis = Math.min(cam.width, cam.height);
  const ref = 480; // logical game size reference
  const raw = Math.max(0.5, Math.min(1.4, minAxis / ref)) * v;
  return Math.round(raw);
}
```

**Usage:**
- Font sizes: `fontSize: uiScale(10) + 'px'`
- Padding/margins: `uiScale(6)`
- Container sizes: `uiScale(120)`
- Border radii: `uiScale(4)`
- Icon sizes: `uiScale(16)`

**Pros:**
- Single source of truth for all sizing
- Easy to adjust global scale behavior in one place
- Every UI element automatically respects min/max bounds
- Consistent look across all scenes

**Cons:**
- Requires importing the helper in every UI file
- Each element still needs manual sizing decisions

---

### Option B — Scene-Level `resize()` Rebuild (Complementary)

**Concept:** Each UI component exposes a `resize()` method that destroys and rebuilds all elements at the new viewport size. IslandScene hooks `scale.once('resize', ...)` to call `questHUD.resize()`.

This is already partially implemented. Expand it to cover:
- `DialogBox` — already has resize-ready structure
- `MainMenuScene` — add `resize()` to reposition title/button
- Any future HUD overlays

**Pros:**
- Guarantees no stale fractional positions
- Text containers never get scaled — they get rebuilt
- Works with Option A helper naturally

**Cons:**
- More object creation/destruction on resize
- Need to track and clean up all dynamic children

---

### Option C — Minimum Viewport Enforcement (Already Implemented)

**Concept:** `BootScene` enforces 320×320 minimum and mobile portrait orientation before allowing the game to proceed. This means `uiScale()` never needs to go below `0.5x` (320/480 ≈ 0.67, clamped to 0.5 for safety).

**Pros:**
- Prevents unusable tiny UI
- Gives `uiScale()` a known floor

**Cons:**
- Only works on mobile user agents; desktop browsers can still resize smaller
- The 320px minimum gate uses `window.innerWidth/innerHeight`, which is outside the game canvas

---

### Option D — Breakpoint-Based Layout Switching (Future Enhancement)

**Concept:** Add named breakpoints that change layout structure, not just sizes.

| Breakpoint | Width | Behavior |
|---|---|---|
| `tiny` | < 360px | Single-column questbook, hidden tracker |
| `compact` | 360–480px | Compact top-bar tracker, narrow dialog |
| `default` | 480–800px | Standard layout |
| `wide` | > 800px | Slightly expanded panels |

Each UI component checks the breakpoint and picks a layout variant, then sizes elements with `uiScale()`.

**Pros:**
- Better UX on extreme viewports
- Prevents cramped layouts on very small windows
- Keeps all text readable

**Cons:**
- More conditional logic in UI code
- Need to define and test all breakpoints

---

### Option E — Global Config Object (Alternative to Option A)

**Concept:** A shared config object that defines all UI measurements as ratios of the viewport, rather than scaling a reference size.

```ts
// src/ui/UIConfig.ts
export const UIConfig = {
  trackerWidth: (w: number, h: number) => Math.min(w * 0.35, 150),
  trackerHeight: (w: number, h: number) => (w < h ? h * 0.12 : h * 0.2),
  fontSize: (base: number, w: number, h: number) => Math.round(base * Math.min(w, h) / 480),
  // ...
};
```

**Pros:**
- More explicit control per-element
- Easy to tune individual elements without affecting others

**Cons:**
- More verbose
- Harder to maintain consistency across many elements

---

## Recommendation

**Combine Option A + Option B + Option D:**

1. **Create `src/ui/UIScale.ts`** — single `uiScale(v)` helper, imported everywhere
2. **Standardize `resize()` patterns** — every modal/overlay/HUD rebuilds on viewport change
3. **Add breakpoint checks** — switch layout at 360px and 480px widths
4. **Keep `roundPixels: true`** in game config
5. **Never `setScale()` on text-bearing containers** — redraw or rebuild instead

This gives automatic scaling, crisp text, and good UX across all viewport sizes.
