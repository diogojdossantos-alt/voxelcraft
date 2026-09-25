import * as THREE from 'three';
import { BlockType, CHUNK_SIZE_X, CHUNK_SIZE_Z, CHUNK_HEIGHT, BLOCK_METAS } from './constants';
import { Chunk } from './chunk';
import { createWorldGenerator, WorldGenerator } from './worldGen';
import { createTextureAtlas } from './textures';
import { sound } from './audio';

export interface VoxelParticle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: THREE.Color;
  size: number;
  life: number;
  maxLife: number;
}

export class World {
  public scene: THREE.Scene;
  public chunks: Map<string, Chunk> = new Map();
  public generator: WorldGenerator;
  public solidMaterial: THREE.MeshLambertMaterial;
  public transparentMaterial: THREE.MeshLambertMaterial;
  public liquidMaterial: THREE.MeshLambertMaterial;
  /** Relogio da ondulacao, avancado a cada quadro. */
  private ondaUniform = { value: 0 };
  public modifiedBlocks: Map<string, BlockType> = new Map(); // "x,y,z" -> BlockType
  public renderRadius: number = 3; // 3 chunks radius (7x7 = 49 chunks loaded)
  public particles: VoxelParticle[] = [];
  public particlePoints: THREE.Points | null = null;
  public particleGeometry: THREE.BufferGeometry | null = null;

  constructor(scene: THREE.Scene, seed: number) {
    this.scene = scene;
    this.generator = createWorldGenerator(seed);

    const { texture } = createTextureAtlas();

    // Materials with vertex colors for directional face shading
    this.solidMaterial = new THREE.MeshLambertMaterial({
      map: texture,
      vertexColors: true,
      alphaTest: 0.1,
    });

    this.transparentMaterial = new THREE.MeshLambertMaterial({
      map: texture,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
    });

    // Agua: mais transparente que vidro e folhas, com tom azulado proprio e
    // superficie que ondula. A onda e feita no vertice, via injecao no shader
    // do Lambert, entao nao custa nada de CPU e a iluminacao continua valendo.
    this.liquidMaterial = new THREE.MeshLambertMaterial({
      map: texture,
      vertexColors: true,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
      color: new THREE.Color(0x9fd8ff),
      side: THREE.DoubleSide, // para enxergar a superficie de baixo d'agua
    });

    this.liquidMaterial.onBeforeCompile = (shader) => {
      shader.uniforms.tempoOnda = this.ondaUniform;
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nuniform float tempoOnda;')
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
           // So o topo do bloco ondula: as laterais ficam presas no lugar,
           // senao apareceriam frestas entre um bloco de agua e o vizinho.
           if (normal.y > 0.5) {
             transformed.y += sin(position.x * 0.9 + tempoOnda) * 0.055
                            + sin(position.z * 1.3 + tempoOnda * 1.4) * 0.045
                            - 0.08;
           }`
        );
    };

    this.initParticleSystem();
  }

  private initParticleSystem() {
    this.particleGeometry = new THREE.BufferGeometry();
    const maxParticles = 300;
    const positions = new Float32Array(maxParticles * 3);
    const colors = new Float32Array(maxParticles * 3);

    this.particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const pMaterial = new THREE.PointsMaterial({
      size: 0.25,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
    });

    this.particlePoints = new THREE.Points(this.particleGeometry, pMaterial);
    this.scene.add(this.particlePoints);
  }

  public getChunkKey(cx: number, cz: number): string {
    return `${cx},${cz}`;
  }

  public getBlockKey(x: number, y: number, z: number): string {
    return `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`;
  }

  public getBlock(wx: number, wy: number, wz: number): BlockType {
    if (wy < 0 || wy >= CHUNK_HEIGHT) return BlockType.AIR;

    const key = this.getBlockKey(wx, wy, wz);
    if (this.modifiedBlocks.has(key)) {
      return this.modifiedBlocks.get(key)!;
    }

    const cx = Math.floor(wx / CHUNK_SIZE_X);
    const cz = Math.floor(wz / CHUNK_SIZE_Z);
    const chunk = this.chunks.get(this.getChunkKey(cx, cz));

    if (chunk) {
      const lx = ((wx % CHUNK_SIZE_X) + CHUNK_SIZE_X) % CHUNK_SIZE_X;
      const lz = ((wz % CHUNK_SIZE_Z) + CHUNK_SIZE_Z) % CHUNK_SIZE_Z;
      return chunk.getBlock(lx, wy, lz);
    }

    return BlockType.AIR;
  }

  public setBlock(wx: number, wy: number, wz: number, type: BlockType, spawnEffects: boolean = true) {
    if (wy < 0 || wy >= CHUNK_HEIGHT) return;

    const prevBlock = this.getBlock(wx, wy, wz);
    const key = this.getBlockKey(wx, wy, wz);
    this.modifiedBlocks.set(key, type);

    const cx = Math.floor(wx / CHUNK_SIZE_X);
    const cz = Math.floor(wz / CHUNK_SIZE_Z);
    const lx = ((wx % CHUNK_SIZE_X) + CHUNK_SIZE_X) % CHUNK_SIZE_X;
    const lz = ((wz % CHUNK_SIZE_Z) + CHUNK_SIZE_Z) % CHUNK_SIZE_Z;

    const chunk = this.chunks.get(this.getChunkKey(cx, cz));
    if (chunk) {
      chunk.setBlock(lx, wy, lz, type);
      this.rebuildChunk(chunk);

      // If on chunk border, rebuild neighboring chunk too so culling updates
      if (lx === 0) this.rebuildChunkByKey(cx - 1, cz);
      if (lx === CHUNK_SIZE_X - 1) this.rebuildChunkByKey(cx + 1, cz);
      if (lz === 0) this.rebuildChunkByKey(cx, cz - 1);
      if (lz === CHUNK_SIZE_Z - 1) this.rebuildChunkByKey(cx, cz + 1);
    }

    if (spawnEffects) {
      if (type === BlockType.AIR && prevBlock !== BlockType.AIR) {
        this.spawnBlockBreakParticles(wx, wy, wz, prevBlock);
        const meta = BLOCK_METAS[prevBlock];
        sound.playBreak(meta?.sound || 'stone');
      } else if (type !== BlockType.AIR) {
        const meta = BLOCK_METAS[type];
        sound.playPlace(meta?.sound || 'stone');
      }
    }
  }

  public explodeTNT(x: number, y: number, z: number, onBlockDestroyed?: (bx: number, by: number, bz: number) => void) {
    const radius = 3.5;
    sound.playExplosion();

    // Remove TNT block itself
    this.setBlock(x, y, z, BlockType.AIR, true);
    if (onBlockDestroyed) onBlockDestroyed(x, y, z);

    for (let dx = -Math.ceil(radius); dx <= Math.ceil(radius); dx++) {
      for (let dy = -Math.ceil(radius); dy <= Math.ceil(radius); dy++) {
        for (let dz = -Math.ceil(radius); dz <= Math.ceil(radius); dz++) {
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
          if (dist <= radius + (Math.random() - 0.5) * 1.2) {
            const bx = x + dx;
            const by = y + dy;
            const bz = z + dz;
            if (by <= 0) continue; // Keep bedrock intact

            const bType = this.getBlock(bx, by, bz);
            if (bType !== BlockType.AIR && bType !== BlockType.BEDROCK && bType !== BlockType.OBSIDIAN) {
              this.setBlock(bx, by, bz, BlockType.AIR, false);
              if (onBlockDestroyed) onBlockDestroyed(bx, by, bz);

              if (Math.random() < 0.25) {
                this.spawnBlockBreakParticles(bx, by, bz, bType);
              }
            }
          }
        }
      }
    }
  }

  public spawnBlockBreakParticles(x: number, y: number, z: number, blockType: BlockType) {
    const count = 12;
    const colors: Partial<Record<BlockType, string>> = {
      [BlockType.AIR]: '#ffffff',
      [BlockType.GRASS]: '#458b2c',
      [BlockType.DIRT]: '#6f4325',
      [BlockType.STONE]: '#787878',
      [BlockType.COBBLESTONE]: '#575757',
      [BlockType.WOOD_LOG]: '#735130',
      [BlockType.WOOD_PLANKS]: '#ad7f48',
      [BlockType.LEAVES]: '#2e6b18',
      [BlockType.GLASS]: '#bfe3f7',
      [BlockType.BRICKS]: '#943829',
      [BlockType.SAND]: '#ebd58e',
      [BlockType.WATER]: '#266bdb',
      [BlockType.COAL_ORE]: '#1c1c1c',
      [BlockType.IRON_ORE]: '#c49e78',
      [BlockType.GOLD_ORE]: '#ffd624',
      [BlockType.DIAMOND_ORE]: '#34d4d4',
      [BlockType.SNOW]: '#ffffff',
      [BlockType.CACTUS]: '#4d9438',
      [BlockType.FLOWER_RED]: '#e62424',
      [BlockType.FLOWER_YELLOW]: '#ffe600',
      [BlockType.TORCH]: '#ffaa00',
      [BlockType.TNT]: '#db3223',
      [BlockType.BEDROCK]: '#1c1c1c',
      [BlockType.OBSIDIAN]: '#261838',
      [BlockType.BOOKSHELF]: '#ad7f48',
      [BlockType.CRAFTING_TABLE]: '#ad7f48',
    };

    const hex = colors[blockType] || '#888888';
    const c = new THREE.Color(hex);

    for (let i = 0; i < count; i++) {
      this.particles.push({
        position: new THREE.Vector3(x + 0.5 + (Math.random() - 0.5) * 0.6, y + 0.5 + (Math.random() - 0.5) * 0.6, z + 0.5 + (Math.random() - 0.5) * 0.6),
        velocity: new THREE.Vector3((Math.random() - 0.5) * 4, Math.random() * 3 + 1.5, (Math.random() - 0.5) * 4),
        color: c.clone().offsetHSL(0, 0, (Math.random() - 0.5) * 0.2),
        size: 0.15 + Math.random() * 0.15,
        life: 0.8 + Math.random() * 0.5,
        maxLife: 1.0,
      });
    }
  }

  public updateParticles(delta: number) {
    if (!this.particleGeometry || !this.particlePoints) return;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= delta;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.velocity.y -= 9.8 * delta; // Gravity
      p.position.addScaledVector(p.velocity, delta);
    }

    const posAttr = this.particleGeometry.getAttribute('position') as THREE.BufferAttribute;
    const colAttr = this.particleGeometry.getAttribute('color') as THREE.BufferAttribute;

    const count = Math.min(this.particles.length, 300);
    for (let i = 0; i < count; i++) {
      const p = this.particles[i];
      posAttr.setXYZ(i, p.position.x, p.position.y, p.position.z);
      colAttr.setXYZ(i, p.color.r, p.color.g, p.color.b);
    }

    // Hide remainder
    for (let i = count; i < 300; i++) {
      posAttr.setXYZ(i, 0, -9999, 0);
    }

    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
  }

  private rebuildChunkByKey(cx: number, cz: number) {
    const chunk = this.chunks.get(this.getChunkKey(cx, cz));
    if (chunk) this.rebuildChunk(chunk);
  }

  public rebuildChunk(chunk: Chunk) {
    if (chunk.mesh) this.scene.remove(chunk.mesh);
    if (chunk.transparentMesh) this.scene.remove(chunk.transparentMesh);
    if (chunk.liquidMesh) this.scene.remove(chunk.liquidMesh);

    const { solid, transparent, liquid } = chunk.buildMeshes(
      (wx, wy, wz) => this.getBlock(wx, wy, wz),
      this.solidMaterial,
      this.transparentMaterial,
      this.liquidMaterial
    );

    if (solid) this.scene.add(solid);
    if (transparent) this.scene.add(transparent);
    if (liquid) this.scene.add(liquid);
  }

  /** Avanca a ondulacao da agua. Chamado uma vez por quadro. */
  public updateWater(delta: number) {
    this.ondaUniform.value += delta * 1.6;
  }

  public loadChunksAround(playerX: number, playerZ: number) {
    const centerChunkX = Math.floor(playerX / CHUNK_SIZE_X);
    const centerChunkZ = Math.floor(playerZ / CHUNK_SIZE_Z);

    const neededKeys = new Set<string>();

    for (let dx = -this.renderRadius; dx <= this.renderRadius; dx++) {
      for (let dz = -this.renderRadius; dz <= this.renderRadius; dz++) {
        const cx = centerChunkX + dx;
        const cz = centerChunkZ + dz;
        const key = this.getChunkKey(cx, cz);
        neededKeys.add(key);

        if (!this.chunks.has(key)) {
          const rawData = this.generator.generateChunkData(cx, cz);
          const chunk = new Chunk(cx, cz, rawData);

          // Apply any stored modifications that fall inside this chunk
          const startX = cx * CHUNK_SIZE_X;
          const startZ = cz * CHUNK_SIZE_Z;
          for (const [posKey, blockType] of this.modifiedBlocks.entries()) {
            const [bx, by, bz] = posKey.split(',').map(Number);
            if (bx >= startX && bx < startX + CHUNK_SIZE_X && bz >= startZ && bz < startZ + CHUNK_SIZE_Z) {
              const lx = bx - startX;
              const lz = bz - startZ;
              chunk.setBlock(lx, by, lz, blockType);
            }
          }

          this.chunks.set(key, chunk);
        }
      }
    }

    // Build meshes for newly added or dirty chunks
    for (const key of neededKeys) {
      const chunk = this.chunks.get(key);
      if (chunk && chunk.isDirty) {
        this.rebuildChunk(chunk);
      }
    }

    // Unload distant chunks to preserve memory
    for (const [key, chunk] of this.chunks.entries()) {
      if (!neededKeys.has(key)) {
        // Remover ANTES de dispose(): ele zera as referencias, entao fazer
        // na ordem inversa deixava as malhas presas na cena para sempre.
        if (chunk.mesh) this.scene.remove(chunk.mesh);
        if (chunk.transparentMesh) this.scene.remove(chunk.transparentMesh);
        if (chunk.liquidMesh) this.scene.remove(chunk.liquidMesh);
        chunk.dispose();
        this.chunks.delete(key);
      }
    }
  }

  public applyRemoteModifications(modifications: Record<string, number>) {
    let affectedChunks = new Set<string>();

    for (const [posKey, blockType] of Object.entries(modifications)) {
      this.modifiedBlocks.set(posKey, blockType as BlockType);
      const [bx, by, bz] = posKey.split(',').map(Number);
      const cx = Math.floor(bx / CHUNK_SIZE_X);
      const cz = Math.floor(bz / CHUNK_SIZE_Z);
      const chunk = this.chunks.get(this.getChunkKey(cx, cz));
      if (chunk) {
        const lx = ((bx % CHUNK_SIZE_X) + CHUNK_SIZE_X) % CHUNK_SIZE_X;
        const lz = ((bz % CHUNK_SIZE_Z) + CHUNK_SIZE_Z) % CHUNK_SIZE_Z;
        chunk.setBlock(lx, by, lz, blockType as BlockType);
        affectedChunks.add(this.getChunkKey(cx, cz));
      }
    }

    for (const chunkKey of affectedChunks) {
      const chunk = this.chunks.get(chunkKey);
      if (chunk) this.rebuildChunk(chunk);
    }
  }

  public dispose() {
    for (const chunk of this.chunks.values()) {
      if (chunk.mesh) this.scene.remove(chunk.mesh);
      if (chunk.transparentMesh) this.scene.remove(chunk.transparentMesh);
      if (chunk.liquidMesh) this.scene.remove(chunk.liquidMesh);
      chunk.dispose();
    }
    this.chunks.clear();
    if (this.particlePoints) this.scene.remove(this.particlePoints);
  }
}
