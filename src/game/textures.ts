import * as THREE from 'three';
import { BlockType } from './constants';

export const ATLAS_COLS = 8;
export const ATLAS_ROWS = 8;
export const TILE_PX = 16;
export const ATLAS_SIZE = ATLAS_COLS * TILE_PX; // 128x128 canvas

export interface FaceTiles {
  top: number;
  bottom: number;
  north: number;
  south: number;
  east: number;
  west: number;
}

export const TILE_INDEX = {
  GRASS_TOP: 0,
  GRASS_SIDE: 1,
  DIRT: 2,
  STONE: 3,
  COBBLESTONE: 4,
  LOG_SIDE: 5,
  LOG_TOP: 6,
  PLANKS: 7,
  LEAVES: 8,
  GLASS: 9,
  BRICKS: 10,
  SAND: 11,
  WATER: 12,
  COAL_ORE: 13,
  IRON_ORE: 14,
  GOLD_ORE: 15,
  DIAMOND_ORE: 16,
  SNOW_TOP: 17,
  SNOW_SIDE: 18,
  CACTUS_TOP: 19,
  CACTUS_SIDE: 20,
  FLOWER_RED: 21,
  FLOWER_YELLOW: 22,
  TORCH: 23,
  TNT_SIDE: 24,
  TNT_TOP: 25,
  BEDROCK: 26,
  OBSIDIAN: 27,
  BOOKSHELF: 28,
  CRAFT_TOP: 29,
  CRAFT_SIDE: 30,
};

export function getBlockFaceTiles(blockType: BlockType): FaceTiles {
  const TI = TILE_INDEX;
  switch (blockType) {
    case BlockType.GRASS:
      return {
        top: TI.GRASS_TOP,
        bottom: TI.DIRT,
        north: TI.GRASS_SIDE,
        south: TI.GRASS_SIDE,
        east: TI.GRASS_SIDE,
        west: TI.GRASS_SIDE,
      };
    case BlockType.DIRT:
      return { top: TI.DIRT, bottom: TI.DIRT, north: TI.DIRT, south: TI.DIRT, east: TI.DIRT, west: TI.DIRT };
    case BlockType.STONE:
      return { top: TI.STONE, bottom: TI.STONE, north: TI.STONE, south: TI.STONE, east: TI.STONE, west: TI.STONE };
    case BlockType.COBBLESTONE:
      return { top: TI.COBBLESTONE, bottom: TI.COBBLESTONE, north: TI.COBBLESTONE, south: TI.COBBLESTONE, east: TI.COBBLESTONE, west: TI.COBBLESTONE };
    case BlockType.WOOD_LOG:
      return { top: TI.LOG_TOP, bottom: TI.LOG_TOP, north: TI.LOG_SIDE, south: TI.LOG_SIDE, east: TI.LOG_SIDE, west: TI.LOG_SIDE };
    case BlockType.WOOD_PLANKS:
      return { top: TI.PLANKS, bottom: TI.PLANKS, north: TI.PLANKS, south: TI.PLANKS, east: TI.PLANKS, west: TI.PLANKS };
    case BlockType.LEAVES:
      return { top: TI.LEAVES, bottom: TI.LEAVES, north: TI.LEAVES, south: TI.LEAVES, east: TI.LEAVES, west: TI.LEAVES };
    case BlockType.GLASS:
      return { top: TI.GLASS, bottom: TI.GLASS, north: TI.GLASS, south: TI.GLASS, east: TI.GLASS, west: TI.GLASS };
    case BlockType.BRICKS:
      return { top: TI.BRICKS, bottom: TI.BRICKS, north: TI.BRICKS, south: TI.BRICKS, east: TI.BRICKS, west: TI.BRICKS };
    case BlockType.SAND:
      return { top: TI.SAND, bottom: TI.SAND, north: TI.SAND, south: TI.SAND, east: TI.SAND, west: TI.SAND };
    case BlockType.WATER:
      return { top: TI.WATER, bottom: TI.WATER, north: TI.WATER, south: TI.WATER, east: TI.WATER, west: TI.WATER };
    case BlockType.COAL_ORE:
      return { top: TI.COAL_ORE, bottom: TI.COAL_ORE, north: TI.COAL_ORE, south: TI.COAL_ORE, east: TI.COAL_ORE, west: TI.COAL_ORE };
    case BlockType.IRON_ORE:
      return { top: TI.IRON_ORE, bottom: TI.IRON_ORE, north: TI.IRON_ORE, south: TI.IRON_ORE, east: TI.IRON_ORE, west: TI.IRON_ORE };
    case BlockType.GOLD_ORE:
      return { top: TI.GOLD_ORE, bottom: TI.GOLD_ORE, north: TI.GOLD_ORE, south: TI.GOLD_ORE, east: TI.GOLD_ORE, west: TI.GOLD_ORE };
    case BlockType.DIAMOND_ORE:
      return { top: TI.DIAMOND_ORE, bottom: TI.DIAMOND_ORE, north: TI.DIAMOND_ORE, south: TI.DIAMOND_ORE, east: TI.DIAMOND_ORE, west: TI.DIAMOND_ORE };
    case BlockType.SNOW:
      return { top: TI.SNOW_TOP, bottom: TI.DIRT, north: TI.SNOW_SIDE, south: TI.SNOW_SIDE, east: TI.SNOW_SIDE, west: TI.SNOW_SIDE };
    case BlockType.CACTUS:
      return { top: TI.CACTUS_TOP, bottom: TI.CACTUS_TOP, north: TI.CACTUS_SIDE, south: TI.CACTUS_SIDE, east: TI.CACTUS_SIDE, west: TI.CACTUS_SIDE };
    case BlockType.FLOWER_RED:
      return { top: TI.FLOWER_RED, bottom: TI.FLOWER_RED, north: TI.FLOWER_RED, south: TI.FLOWER_RED, east: TI.FLOWER_RED, west: TI.FLOWER_RED };
    case BlockType.FLOWER_YELLOW:
      return { top: TI.FLOWER_YELLOW, bottom: TI.FLOWER_YELLOW, north: TI.FLOWER_YELLOW, south: TI.FLOWER_YELLOW, east: TI.FLOWER_YELLOW, west: TI.FLOWER_YELLOW };
    case BlockType.TORCH:
      return { top: TI.TORCH, bottom: TI.TORCH, north: TI.TORCH, south: TI.TORCH, east: TI.TORCH, west: TI.TORCH };
    case BlockType.TNT:
      return { top: TI.TNT_TOP, bottom: TI.TNT_TOP, north: TI.TNT_SIDE, south: TI.TNT_SIDE, east: TI.TNT_SIDE, west: TI.TNT_SIDE };
    case BlockType.BEDROCK:
      return { top: TI.BEDROCK, bottom: TI.BEDROCK, north: TI.BEDROCK, south: TI.BEDROCK, east: TI.BEDROCK, west: TI.BEDROCK };
    case BlockType.OBSIDIAN:
      return { top: TI.OBSIDIAN, bottom: TI.OBSIDIAN, north: TI.OBSIDIAN, south: TI.OBSIDIAN, east: TI.OBSIDIAN, west: TI.OBSIDIAN };
    case BlockType.BOOKSHELF:
      return { top: TI.PLANKS, bottom: TI.PLANKS, north: TI.BOOKSHELF, south: TI.BOOKSHELF, east: TI.BOOKSHELF, west: TI.BOOKSHELF };
    case BlockType.CRAFTING_TABLE:
      return { top: TI.CRAFT_TOP, bottom: TI.PLANKS, north: TI.CRAFT_SIDE, south: TI.CRAFT_SIDE, east: TI.CRAFT_SIDE, west: TI.CRAFT_SIDE };
    default:
      return { top: TI.STONE, bottom: TI.STONE, north: TI.STONE, south: TI.STONE, east: TI.STONE, west: TI.STONE };
  }
}

// Generates procedural 16x16 pixel sprites on canvas
export function createTextureAtlas(): { texture: THREE.CanvasTexture; canvas: HTMLCanvasElement } {
  const canvas = document.createElement('canvas');
  canvas.width = ATLAS_SIZE;
  canvas.height = ATLAS_SIZE;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

  ctx.imageSmoothingEnabled = false;

  const setPixel = (tx: number, ty: number, x: number, y: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(tx * TILE_PX + x, ty * TILE_PX + y, 1, 1);
  };

  const fillTile = (tileIndex: number, fn: (x: number, y: number) => string) => {
    const tx = tileIndex % ATLAS_COLS;
    const ty = Math.floor(tileIndex / ATLAS_COLS);
    for (let y = 0; y < TILE_PX; y++) {
      for (let x = 0; x < TILE_PX; x++) {
        setPixel(tx, ty, x, y, fn(x, y));
      }
    }
  };

  // Noise generator for textures
  const pRand = (x: number, y: number, seed: number) => {
    const n = Math.sin(x * 12.9898 + y * 78.233 + seed * 37.719) * 43758.5453;
    return n - Math.floor(n);
  };

  // Grass Top (Lush vibrant green with pixel variations)
  fillTile(TILE_INDEX.GRASS_TOP, (x, y) => {
    const n = pRand(x, y, 1);
    if (n > 0.8) return '#5db43e';
    if (n > 0.4) return '#519e34';
    if (n > 0.2) return '#458b2c';
    return '#3c7926';
  });

  // Grass Side (Green top layer over brown soil)
  fillTile(TILE_INDEX.GRASS_SIDE, (x, y) => {
    const hang = Math.floor(pRand(x, 0, 2) * 3) + 2;
    if (y < hang) {
      const n = pRand(x, y, 3);
      return n > 0.5 ? '#519e34' : '#458b2c';
    }
    const n = pRand(x, y, 4);
    if (n > 0.7) return '#99633e';
    if (n > 0.3) return '#865432';
    return '#6f4325';
  });

  // Dirt
  fillTile(TILE_INDEX.DIRT, (x, y) => {
    const n = pRand(x, y, 5);
    if (n > 0.8) return '#99633e';
    if (n > 0.4) return '#865432';
    if (n > 0.15) return '#6f4325';
    return '#59341b';
  });

  // Stone
  fillTile(TILE_INDEX.STONE, (x, y) => {
    const n = pRand(x, y, 6);
    if (n > 0.85) return '#9c9c9c';
    if (n > 0.5) return '#828282';
    if (n > 0.2) return '#6e6e6e';
    return '#595959';
  });

  // Cobblestone (Mortar cracks and rounded stones)
  fillTile(TILE_INDEX.COBBLESTONE, (x, y) => {
    const isMortar = (x % 5 === 0 && y % 3 === 0) || (x % 4 === 1 && y % 5 === 2) || (y === 0 || y === 8 || x === 0 || x === 8);
    if (isMortar) return '#3b3b3b';
    const n = pRand(x, y, 7);
    return n > 0.6 ? '#8c8c8c' : n > 0.3 ? '#6e6e6e' : '#575757';
  });

  // Wood Log Side (Bark streaks)
  fillTile(TILE_INDEX.LOG_SIDE, (x, y) => {
    const isGroove = x % 4 === 0 || (x % 4 === 2 && y % 5 === 0);
    if (isGroove) return '#47311c';
    const n = pRand(x, y, 8);
    return n > 0.5 ? '#735130' : '#5e4024';
  });

  // Wood Log Top (Tree rings)
  fillTile(TILE_INDEX.LOG_TOP, (x, y) => {
    const dx = x - 7.5;
    const dy = y - 7.5;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 6.5) return '#47311c'; // bark ring
    if (dist > 4.5 && dist < 5.5) return '#8d6840';
    if (dist > 2.0 && dist < 3.0) return '#8d6840';
    if (dist <= 1.5) return '#9e764a';
    return '#b38855';
  });

  // Wood Planks
  fillTile(TILE_INDEX.PLANKS, (x, y) => {
    const isDivider = y % 4 === 0 || (y < 4 && x === 8) || (y >= 4 && y < 8 && x === 3) || (y >= 8 && y < 12 && x === 11) || (y >= 12 && x === 6);
    if (isDivider) return '#6b4f2c';
    const n = pRand(x, y, 9);
    return n > 0.6 ? '#be8c53' : n > 0.3 ? '#ad7f48' : '#9b713e';
  });

  // Leaves (Lush foliage with dark pixels)
  fillTile(TILE_INDEX.LEAVES, (x, y) => {
    const n = pRand(x, y, 10);
    if (n > 0.8) return '#479427';
    if (n > 0.5) return '#3b8020';
    if (n > 0.25) return '#2e6b18';
    return '#215210';
  });

  // Glass (Transparent cyan with pixel highlights)
  fillTile(TILE_INDEX.GLASS, (x, y) => {
    const isBorder = x === 0 || x === 15 || y === 0 || y === 15;
    if (isBorder) return 'rgba(215, 240, 255, 0.7)';
    const isGlint = (x === 2 && y === 2) || (x === 3 && y === 2) || (x === 2 && y === 3) || (x === 12 && y === 12);
    if (isGlint) return 'rgba(255, 255, 255, 0.85)';
    return 'rgba(180, 225, 245, 0.2)';
  });

  // Bricks
  fillTile(TILE_INDEX.BRICKS, (x, y) => {
    const row = Math.floor(y / 4);
    const isMortarY = y % 4 === 0;
    const isMortarX = (row % 2 === 0 ? x % 8 === 0 : (x + 4) % 8 === 0);
    if (isMortarY || isMortarX) return '#cfb8a6';
    const n = pRand(x, y, 11);
    return n > 0.5 ? '#ab4939' : '#943829';
  });

  // Sand
  fillTile(TILE_INDEX.SAND, (x, y) => {
    const n = pRand(x, y, 12);
    if (n > 0.8) return '#f4e5a9';
    if (n > 0.4) return '#ebd58e';
    if (n > 0.15) return '#dbc47d';
    return '#cbb26d';
  });

  // Water (Animated blue shade)
  fillTile(TILE_INDEX.WATER, (x, y) => {
    const n = pRand(x, y, 13);
    return n > 0.5 ? 'rgba(38, 107, 219, 0.7)' : 'rgba(30, 92, 194, 0.75)';
  });

  // Helper for ore spots on stone
  const fillOre = (tileIdx: number, gemColors: string[], seed: number) => {
    fillTile(tileIdx, (x, y) => {
      const isGem = (x > 3 && x < 7 && y > 3 && y < 7) || (x > 9 && x < 13 && y > 8 && y < 12) || (x > 6 && x < 10 && y > 11 && y < 15);
      if (isGem) {
        const n = pRand(x, y, seed);
        return gemColors[Math.floor(n * gemColors.length)];
      }
      const n = pRand(x, y, seed + 10);
      return n > 0.7 ? '#919191' : n > 0.3 ? '#787878' : '#616161';
    });
  };

  // Coal Ore
  fillOre(TILE_INDEX.COAL_ORE, ['#1c1c1c', '#2c2c2c', '#111111'], 14);
  // Iron Ore
  fillOre(TILE_INDEX.IRON_ORE, ['#d9b897', '#c49e78', '#a87e56'], 15);
  // Gold Ore
  fillOre(TILE_INDEX.GOLD_ORE, ['#ffea47', '#ffd624', '#e0b810'], 16);
  // Diamond Ore
  fillOre(TILE_INDEX.DIAMOND_ORE, ['#5ef0f0', '#34d4d4', '#99ffff'], 17);

  // Snow top & side
  fillTile(TILE_INDEX.SNOW_TOP, (x, y) => {
    const n = pRand(x, y, 18);
    return n > 0.6 ? '#ffffff' : '#f0f6ff';
  });
  fillTile(TILE_INDEX.SNOW_SIDE, (x, y) => {
    if (y < 4) return '#ffffff';
    const n = pRand(x, y, 19);
    return n > 0.5 ? '#865432' : '#6f4325';
  });

  // Cactus
  fillTile(TILE_INDEX.CACTUS_SIDE, (x, y) => {
    const isRib = x % 3 === 0;
    const isSpine = (x % 3 === 1 && y % 4 === 1) || (x % 3 === 2 && y % 4 === 3);
    if (isSpine) return '#173610';
    return isRib ? '#3b782b' : '#4d9438';
  });
  fillTile(TILE_INDEX.CACTUS_TOP, (x, y) => {
    const n = pRand(x, y, 20);
    return n > 0.5 ? '#438231' : '#336625';
  });

  // Flowers (drawn with transparent background)
  fillTile(TILE_INDEX.FLOWER_RED, (x, y) => {
    if (x === 7 && y >= 8 && y <= 15) return '#2e6b18'; // stem
    if (x >= 5 && x <= 9 && y >= 3 && y <= 7) {
      if (x === 7 && y === 5) return '#222222'; // center
      return '#e62424'; // petals
    }
    return 'rgba(0,0,0,0)';
  });

  fillTile(TILE_INDEX.FLOWER_YELLOW, (x, y) => {
    if (x === 7 && y >= 8 && y <= 15) return '#2e6b18'; // stem
    if (x >= 5 && x <= 9 && y >= 4 && y <= 8) {
      if (x === 7 && y === 6) return '#ffaa00'; // center
      return '#ffe600'; // petals
    }
    return 'rgba(0,0,0,0)';
  });

  // Torch
  fillTile(TILE_INDEX.TORCH, (x, y) => {
    if (x >= 7 && x <= 8 && y >= 5 && y <= 15) return '#7a5229'; // stick
    if (x >= 6 && x <= 9 && y >= 2 && y <= 4) return '#ffaa00'; // flame
    if (x >= 7 && x <= 8 && y === 3) return '#ffff88'; // inner core
    return 'rgba(0,0,0,0)';
  });

  // TNT Side
  fillTile(TILE_INDEX.TNT_SIDE, (x, y) => {
    if (y >= 6 && y <= 9) {
      // White banner in middle
      if (x >= 4 && x <= 11) {
        // Pixel letters "TNT"
        if (x === 4 && y >= 6 && y <= 8) return '#111111'; // T
        if (x >= 4 && x <= 6 && y === 6) return '#111111'; // T top
        if (x === 8 && y >= 6 && y <= 9) return '#111111'; // N
        if (x === 11 && y >= 6 && y <= 8) return '#111111'; // T
      }
      return '#f5f5f5';
    }
    const n = pRand(x, y, 22);
    return n > 0.4 ? '#db3223' : '#b82316';
  });

  fillTile(TILE_INDEX.TNT_TOP, (x, y) => {
    if (x >= 6 && x <= 9 && y >= 6 && y <= 9) return '#222222'; // fuse center
    const n = pRand(x, y, 23);
    return n > 0.5 ? '#b82316' : '#9c1c11';
  });

  // Bedrock
  fillTile(TILE_INDEX.BEDROCK, (x, y) => {
    const n = pRand(x, y, 24);
    if (n > 0.8) return '#545454';
    if (n > 0.5) return '#2e2e2e';
    if (n > 0.25) return '#1c1c1c';
    return '#0d0d0d';
  });

  // Obsidian
  fillTile(TILE_INDEX.OBSIDIAN, (x, y) => {
    const n = pRand(x, y, 25);
    if (n > 0.75) return '#3b2559';
    if (n > 0.45) return '#261838';
    if (n > 0.2) return '#170f24';
    return '#10081c';
  });

  // Bookshelf
  fillTile(TILE_INDEX.BOOKSHELF, (x, y) => {
    const isFrame = x === 0 || x === 15 || y === 0 || y === 7 || y === 8 || y === 15;
    if (isFrame) return '#ad7f48';
    const bookColors = ['#c43729', '#2a6ec2', '#338f3a', '#b59218', '#7b2da1'];
    const col = Math.floor(x / 2);
    return bookColors[col % bookColors.length];
  });

  // Crafting Table Top
  fillTile(TILE_INDEX.CRAFT_TOP, (x, y) => {
    const isBorder = x === 0 || x === 15 || y === 0 || y === 15;
    if (isBorder) return '#5e4024';
    const isGrid = x === 5 || x === 10 || y === 5 || y === 10;
    if (isGrid) return '#3d2612';
    return '#ad7f48';
  });

  // Crafting Table Side
  fillTile(TILE_INDEX.CRAFT_SIDE, (x, y) => {
    const isBorder = x === 0 || x === 15 || y === 0 || y === 15;
    if (isBorder) return '#5e4024';
    const isTool = (x >= 5 && x <= 10 && y >= 5 && y <= 10);
    if (isTool) return '#6b7280';
    return '#ad7f48';
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;

  return { texture, canvas };
}

// Compute UV coordinates [uMin, vMin, uMax, vMax] for a tile index
export function getTileUVs(tileIndex: number): [number, number, number, number] {
  const col = tileIndex % ATLAS_COLS;
  const row = Math.floor(tileIndex / ATLAS_COLS);

  const uMin = col / ATLAS_COLS;
  const uMax = (col + 1) / ATLAS_COLS;
  // Three.js texture coordinate: (0,0) is bottom-left, canvas (0,0) is top-left
  const vMax = 1 - row / ATLAS_ROWS;
  const vMin = 1 - (row + 1) / ATLAS_ROWS;

  return [uMin, vMin, uMax, vMax];
}
