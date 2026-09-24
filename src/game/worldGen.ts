import { BlockType, CHUNK_SIZE_X, CHUNK_SIZE_Z, CHUNK_HEIGHT, WATER_LEVEL } from './constants';
import { SeededNoise } from './noise';

export interface WorldGenerator {
  seed: number;
  noise: SeededNoise;
  biomeNoise: SeededNoise;
  generateChunkData: (chunkX: number, chunkZ: number) => Uint8Array;
  getSurfaceHeight: (worldX: number, worldZ: number) => number;
}

export function createWorldGenerator(seed: number): WorldGenerator {
  const noise = new SeededNoise(seed);
  const biomeNoise = new SeededNoise(seed + 9999);
  const caveNoise = new SeededNoise(seed + 4444);

  const getSurfaceHeight = (worldX: number, worldZ: number): number => {
    // Biome selector: -1 = Desert, 0 = Plains/Forest, +1 = Mountains
    const biomeVal = biomeNoise.fbm2D(worldX * 0.005, worldZ * 0.005, 2);

    let baseHeight = 16;
    let hillHeight = 0;

    if (biomeVal > 0.25) {
      // Mountains biome
      hillHeight = noise.fbm2D(worldX * 0.02, worldZ * 0.02, 4) * 20 + 8;
    } else if (biomeVal < -0.25) {
      // Desert / Dunes
      hillHeight = noise.fbm2D(worldX * 0.015, worldZ * 0.015, 3) * 6 + 2;
    } else {
      // Plains / Forest
      hillHeight = noise.fbm2D(worldX * 0.02, worldZ * 0.02, 3) * 8 + 4;
    }

    const h = Math.floor(baseHeight + hillHeight);
    return Math.max(3, Math.min(CHUNK_HEIGHT - 6, h));
  };

  const generateChunkData = (chunkX: number, chunkZ: number): Uint8Array => {
    const data = new Uint8Array(CHUNK_SIZE_X * CHUNK_HEIGHT * CHUNK_SIZE_Z);
    const startX = chunkX * CHUNK_SIZE_X;
    const startZ = chunkZ * CHUNK_SIZE_Z;

    const getIndex = (x: number, y: number, z: number) => {
      return (y * CHUNK_SIZE_Z + z) * CHUNK_SIZE_X + x;
    };

    const treeLocations: { x: number; y: number; z: number }[] = [];
    const cactusLocations: { x: number; y: number; z: number }[] = [];

    for (let lx = 0; lx < CHUNK_SIZE_X; lx++) {
      for (let lz = 0; lz < CHUNK_SIZE_Z; lz++) {
        const wx = startX + lx;
        const wz = startZ + lz;

        const surfaceY = getSurfaceHeight(wx, wz);
        const biomeVal = biomeNoise.fbm2D(wx * 0.005, wz * 0.005, 2);
        const isDesert = biomeVal < -0.25;
        const isMountain = biomeVal > 0.25 && surfaceY > 26;

        for (let y = 0; y < CHUNK_HEIGHT; y++) {
          const idx = getIndex(lx, y, lz);

          if (y === 0) {
            // Bedrock layer
            data[idx] = BlockType.BEDROCK;
            continue;
          }

          if (y > surfaceY) {
            // Above ground: check if below water level
            if (y <= WATER_LEVEL) {
              data[idx] = BlockType.WATER;
            } else {
              data[idx] = BlockType.AIR;
            }
            continue;
          }

          // Check 3D cave carving (only below surface and above bedrock)
          if (y > 1 && y < surfaceY - 2) {
            const caveVal = caveNoise.fbm3D(wx * 0.05, y * 0.08, wz * 0.05, 3);
            if (caveVal > 0.44) {
              data[idx] = y <= WATER_LEVEL ? BlockType.WATER : BlockType.AIR;
              continue;
            }
          }

          // Top block
          if (y === surfaceY) {
            if (y < WATER_LEVEL) {
              data[idx] = BlockType.SAND; // underwater floor
            } else if (isDesert) {
              data[idx] = BlockType.SAND;
              // Chance of cactus
              const plantNoise = noise.noise2D(wx * 0.4, wz * 0.4);
              if (plantNoise > 0.72 && lx > 1 && lx < 14 && lz > 1 && lz < 14) {
                cactusLocations.push({ x: lx, y: y + 1, z: lz });
              }
            } else if (isMountain && surfaceY > 28) {
              data[idx] = BlockType.SNOW;
            } else {
              data[idx] = BlockType.GRASS;

              // Vegetation chance
              const vegNoise = noise.noise2D(wx * 0.3, wz * 0.3);
              if (vegNoise > 0.65 && lx > 2 && lx < 13 && lz > 2 && lz < 13) {
                treeLocations.push({ x: lx, y: y + 1, z: lz });
              } else if (vegNoise > 0.45 && vegNoise <= 0.55 && y + 1 < CHUNK_HEIGHT) {
                // Poppy or dandelion
                const flowerIdx = getIndex(lx, y + 1, lz);
                data[flowerIdx] = vegNoise > 0.5 ? BlockType.FLOWER_RED : BlockType.FLOWER_YELLOW;
              }
            }
            continue;
          }

          // Layer beneath top surface
          if (y >= surfaceY - 3) {
            if (isDesert) {
              data[idx] = BlockType.SAND;
            } else {
              data[idx] = BlockType.DIRT;
            }
            continue;
          }

          // Deep underground: Stone with Ore Veins
          const oreHash = noise.noise3D(wx * 0.2, y * 0.2, wz * 0.2);

          if (y < 10 && oreHash > 0.68) {
            data[idx] = BlockType.DIAMOND_ORE;
          } else if (y < 16 && oreHash > 0.62) {
            data[idx] = BlockType.GOLD_ORE;
          } else if (y < 24 && oreHash > 0.55) {
            data[idx] = BlockType.IRON_ORE;
          } else if (y < 35 && oreHash > 0.45) {
            data[idx] = BlockType.COAL_ORE;
          } else {
            data[idx] = BlockType.STONE;
          }
        }
      }
    }

    // Place trees
    for (const pos of treeLocations) {
      const treeHeight = 4 + Math.floor(noise.noise2D(pos.x, pos.z) * 2);
      if (pos.y + treeHeight + 2 >= CHUNK_HEIGHT) continue;

      // Wood trunk
      for (let ty = 0; ty < treeHeight; ty++) {
        const trunkY = pos.y + ty;
        const idx = getIndex(pos.x, trunkY, pos.z);
        data[idx] = BlockType.WOOD_LOG;
      }

      // Leaves canopy
      const leafBase = pos.y + treeHeight - 2;
      for (let ly = leafBase; ly <= pos.y + treeHeight + 1; ly++) {
        if (ly >= CHUNK_HEIGHT) continue;
        const radius = ly >= pos.y + treeHeight ? 1 : 2;
        for (let dx = -radius; dx <= radius; dx++) {
          for (let dz = -radius; dz <= radius; dz++) {
            const lx = pos.x + dx;
            const lz = pos.z + dz;
            if (lx < 0 || lx >= CHUNK_SIZE_X || lz < 0 || lz >= CHUNK_SIZE_Z) continue;
            // Cut corners slightly for rounded crown
            if (Math.abs(dx) === 2 && Math.abs(dz) === 2 && (ly === leafBase || ly === pos.y + treeHeight)) {
              continue;
            }
            const leafIdx = getIndex(lx, ly, lz);
            if (data[leafIdx] === BlockType.AIR) {
              data[leafIdx] = BlockType.LEAVES;
            }
          }
        }
      }
    }

    // Place cacti
    for (const pos of cactusLocations) {
      const cHeight = 2 + Math.floor(Math.abs(noise.noise2D(pos.x, pos.z)) * 2);
      for (let cy = 0; cy < cHeight; cy++) {
        const y = pos.y + cy;
        if (y < CHUNK_HEIGHT) {
          const idx = getIndex(pos.x, y, pos.z);
          data[idx] = BlockType.CACTUS;
        }
      }
    }

    return data;
  };

  return {
    seed,
    noise,
    biomeNoise,
    generateChunkData,
    getSurfaceHeight,
  };
}
