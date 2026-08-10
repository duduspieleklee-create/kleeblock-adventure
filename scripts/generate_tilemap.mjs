// generate_tilemap.mjs — Procedurally builds a 30×22 forest tilemap
import { writeFileSync } from 'fs';

const MAP_W = 30;  // 480px / 16
const MAP_H = 22;  // 360px / 16

// Tile indices from floors.png (400×416 = 25 cols × 26 rows at 16px)
// Row 0: 0-24, Row 1: 25-49, etc.
const T = {
  GRASS:       0,   // Row 0, Col 0 — basic green grass
  GRASS_DARK:  1,   // Row 0, Col 1 — slightly darker grass
  GRASS_LIGHT: 2,   // Row 0, Col 2 — lighter grass
  DIRT:        25,  // Row 1, Col 0 — dirt path
  DIRT_PATH:   26,  // Row 1, Col 1 — dirt path variant
  WATER:       50,  // Row 2, Col 0 — water
  WATER_EDGE:  51,  // Row 2, Col 1 — water edge
  STONE:       75,  // Row 3, Col 0 — stone/decoration
  FLUSH:       3,   // Row 0, Col 3 — small flower/grass detail
  GRASS_ALT:   4,   // Row 0, Col 4
};

// Start with all grass
let data = Array.from({ length: MAP_H }, () =>
  Array.from({ length: MAP_W }, () => T.GRASS)
);

// Add grass variation (random darker/lighter patches)
for (let y = 0; y < MAP_H; y++) {
  for (let x = 0; x < MAP_W; x++) {
    const r = Math.random();
    if (r < 0.08) data[y][x] = T.GRASS_DARK;
    else if (r < 0.14) data[y][x] = T.GRASS_LIGHT;
    else if (r < 0.18) data[y][x] = T.FLUSH;
    else if (r < 0.22) data[y][x] = T.GRASS_ALT;
  }
}

// Carve a winding dirt path from left to right
const pathY = 11;
for (let x = 0; x < MAP_W; x++) {
  const offset = Math.round(Math.sin(x * 0.4) * 2);
  const py = pathY + offset;
  if (py >= 0 && py < MAP_H) {
    data[py][x] = T.DIRT;
    if (py + 1 < MAP_H) data[py + 1][x] = T.DIRT_PATH;
  }
}

// Secondary vertical path
for (let y = 0; y < MAP_H; y++) {
  const offset = Math.round(Math.cos(y * 0.3) * 1);
  const px = 18 + offset;
  if (px >= 0 && px < MAP_W) {
    data[y][px] = T.DIRT;
  }
}

// Small pond in upper-right area
const pondCenter = { x: 24, y: 6 };
const pondRadius = 2;
for (let y = -pondRadius; y <= pondRadius; y++) {
  for (let x = -pondRadius; x <= pondRadius; x++) {
    const dist = Math.sqrt(x * x + y * y);
    const px = pondCenter.x + x;
    const py = pondCenter.y + y;
    if (px >= 0 && px < MAP_W && py >= 0 && py < MAP_H) {
      if (dist <= 1.5) data[py][px] = T.WATER;
      else if (dist <= 2.2) data[py][px] = T.WATER_EDGE;
    }
  }
}

// Scatter stones around path edges
for (let i = 0; i < 8; i++) {
  const sx = 3 + Math.floor(Math.random() * 24);
  const sy = pathY + 2 + Math.floor(Math.random() * 2) - 1;
  if (sy >= 0 && sy < MAP_H) data[sy][sx] = T.STONE;
}

// Small clearing in center
for (let y = 8; y <= 14; y++) {
  for (let x = 12; x <= 16; x++) {
    if (data[y][x] === T.GRASS || data[y][x] === T.GRASS_DARK ||
        data[y][x] === T.GRASS_LIGHT || data[y][x] === T.FLUSH ||
        data[y][x] === T.GRASS_ALT) {
      data[y][x] = T.GRASS;  // Flatten to uniform grass
    }
  }
}

// Build tilemap JSON
const tilemap = {
  height: MAP_H,
  layers: [
    {
      data: data,
      height: MAP_H,
      name: 'ground',
      opacity: 1,
      visible: true,
      width: MAP_W,
      x: 0,
      y: 0,
    },
  ],
  nextlayerid: 2,
  nextobjectid: 1,
  orientation: 'orthogonal',
  renderorder: 'right-down',
  tileheight: 16,
  tilesets: [
    {
      firstgid: 1,
      image: '../tilesets/floors.png',
      imagewidth: 400,
      imageheight: 416,
      name: 'floors',
      tileheight: 16,
      tilewidth: 16,
    },
  ],
  tilewidth: 16,
  type: 'tilemap',
  version: '1.10',
  width: MAP_W,
};

writeFileSync(
  'public/assets/tilemaps/forest_beginner.json',
  JSON.stringify(tilemap, null, 2)
);

console.log('Generated forest_beginner.json — 30×22 tiles');
console.log('Map: 480×360px (30 cols × 22 rows at 16px)');
console.log('Features: dirt path, pond, clearing, stone scatter, grass variation');