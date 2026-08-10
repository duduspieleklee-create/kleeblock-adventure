// generate_tilemap.mjs — Procedurally builds a 30×22 forest tilemap
import { writeFileSync } from 'fs';

const MAP_W = 30;  // 480px / 16
const MAP_H = 22;  // 360px / 16

// CORRECTED Tile indices from floors.png (400×416 = 25 cols × 26 rows at 16px)
// Row 0 (0-24): Grass and vegetation
// Row 1 (25-49): Dirt, paths, and ground
// Row 2 (50-74): Rocks, stones, and decorations
// Row 3+ (75+): Water features

const T = {
  // Grass and vegetation - FIRST ROW of floors.png
  GRASS:       0,   // Row 0, Col 0 — basic green grass (ground cover)
  GRASS_DARK:  1,   // Row 0, Col 1 — darker grass patches
  GRASS_LIGHT: 2,   // Row 0, Col 2 — lighter grass areas  
  GRASS_FLOWER:3,   // Row 0, Col 3 — grass with small flowers
  GRASS_VARIANT:4,  // Row 0, Col 4 — alternative grass texture
  
  // Ground and paths - SECOND ROW of floors.png  
  DIRT:        5,   // Row 1, Col 0 — basic dirt/soil
  DIRT_PATH:   6,   // Row 1, Col 1 — dirt path texture
  DIRT_ROUGH:  7,   // Row 1, Col 2 — rough dirt areas
  
  // Rocks and decorations - THIRD ROW of floors.png
  ROCK_SMALL:  10,  // Row 2, Col 0-9 — small rocks
  ROCK_LARGE:  20,  // Row 2, Col 10-19 — large rocks
  STONE:       25,  // Row 2, Col 20 — stone decoration
  DECO:        30,  // Row 2, Col 21-24 — decorative elements
  
  // Water features - FOURTH ROW of floors.png
  WATER_PUDDLE:50,  // Row 3, Col 0-9 — small puddles
  WATER_POOL:  60,  // Row 3, Col 10-19 — larger water areas
  WATER_SHORE: 70,  // Row 3, Col 20-24 — water edges
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
    else if (r < 0.18) data[y][x] = T.GRASS_FLOWER;
    else if (r < 0.22) data[y][x] = T.GRASS_VARIANT;
  }
}

// Carve a winding dirt path from left to right
const pathY = 11;
for (let x = 0; x < MAP_W; x++) {
  const offset = Math.round(Math.sin(x * 0.4) * 2);
  const py = pathY + offset;
  if (py >= 0 && py < MAP_H) {
    data[py][x] = T.DIRT_PATH;
    if (py + 1 < MAP_H) data[py + 1][x] = T.DIRT;
  }
}

// Secondary vertical path
for (let y = 0; y < MAP_H; y++) {
  const offset = Math.round(Math.cos(y * 0.3) * 1);
  const px = 18 + offset;
  if (px >= 0 && px < MAP_W) {
    data[y][px] = T.DIRT_PATH;
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
      if (dist <= 1.5) data[py][px] = T.WATER_PUDDLE;
      else if (dist <= 2.2) data[py][px] = T.WATER_SHORE;
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
        data[y][x] === T.GRASS_LIGHT || data[y][x] === T.GRASS_FLOWER ||
        data[y][x] === T.GRASS_VARIANT) {
      data[y][x] = T.GRASS;  // Flatten to uniform grass
    }
  }
}

// Build tilemap JSON (corrected for forest environment)
const tilemap = {
  type: 'tilemap',
  version: '1.10',
  orientation: 'orthogonal',
  renderorder: 'right-down',
  width: MAP_W,
  height: MAP_H,
  tilewidth: 16,
  tileheight: 16,
  nextobjectid: 1,
  tilesets: [
    {
      firstgid: 1,
      name: 'floors',
      tilewidth: 16,
      tileheight: 16,
      tilecount: 400,
      columns: 25,
      rows: 26,
      margin: 0,
      spacing: 0,
      image: '../tilesets/floors.png',
      imagewidth: 400,
      imageheight: 416,
    },
  ],
  layers: [
    {
      type: 'tilelayer',
      name: 'ground',
      width: MAP_W,
      height: MAP_H,
      x: 0,
      y: 0,
      visible: true,
      opacity: 1,
      encoding: 'csv',
      data: data.flat().join(','),
    },
  ],
};

writeFileSync(
  'public/assets/tilemaps/forest_beginner.json',
  JSON.stringify(tilemap, null, 2)
);

console.log('Generated forest_beginner.json — 30×22 tiles');
console.log('Map: 480×360px (30 cols × 22 rows at 16px)');
console.log('Features: dirt path, pond, clearing, stone scatter, grass variation');