# Smoke test checklist (Milestone 12.3)

Run after `npm run build && npm run preview` (or deployed build).

## Boot & layout

- [ ] Game loads without console errors
- [ ] Logical canvas is **1280×720** (FIT, letterboxed as needed)
- [ ] Resize window → UI stays anchored (HUD, dialog, buttons)
- [ ] Mobile portrait works; landscape shows rotate gate (if mobile UA)

## Input

- [ ] **WASD / arrows** move player
- [ ] **Click / tap** ground → green destination marker → walk
- [ ] Click **NPC** → walk near, then **E** / mobile interact talks
- [ ] Dialog open → world taps do not move player
- [ ] **Q / book** opens quest log; Esc / Q closes
- [ ] Optional: `?joystick=1` shows stick; drag moves player

## World

- [ ] Collision tiles block movement (sea / walls)
- [ ] Player does not fall through map; camera follows
- [ ] NPCs are immovable; player collides with them
- [ ] Scenery trunks (debug cyan when `?debug=1`) block

## Quests

- [ ] **Island Explorer** starts; markers on pending NPCs
- [ ] Talk both NPCs → quest completes → notification
- [ ] **Find Supplies** starts → crates spawn
- [ ] Collect crates → HUD shows `(n/3)` → completes at 3

## UI / production

- [ ] Production build has **no** debug panel without `?debug=1` (debug is DEV-only)
- [ ] Production bundle has minimal/no `console.log` noise (esbuild drop)
- [ ] Missing asset shows preloader warning then continues (if tested)

## Debug (DEV only)

- [ ] `?debug=1` → F1 panel, F2 collision toggle, F3 reset quests

---

**Sign-off:** Date ________  Build ________  Tester ________
