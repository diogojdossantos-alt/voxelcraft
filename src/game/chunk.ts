import * as THREE from 'three';
import { BlockType, BLOCK_METAS, CHUNK_SIZE_X, CHUNK_SIZE_Z, CHUNK_HEIGHT } from './constants';
import { getBlockFaceTiles, getTileUVs } from './textures';

export interface ChunkKey {
  cx: number;
  cz: number;
}

export class Chunk {
  public cx: number;
  public cz: number;
  public data: Uint8Array;
  public mesh: THREE.Mesh | null = null;
  public transparentMesh: THREE.Mesh | null = null;
  public isDirty: boolean = true;

  constructor(cx: number, cz: number, data: Uint8Array) {
    this.cx = cx;
    this.cz = cz;
    this.data = data;
  }

  public getIndex(lx: number, y: number, lz: number): number {
    return (y * CHUNK_SIZE_Z + lz) * CHUNK_SIZE_X + lx;
  }

  public getBlock(lx: number, y: number, lz: number): BlockType {
    if (lx < 0 || lx >= CHUNK_SIZE_X || lz < 0 || lz >= CHUNK_SIZE_Z || y < 0 || y >= CHUNK_HEIGHT) {
      return BlockType.AIR;
    }
    return this.data[this.getIndex(lx, y, lz)];
  }

  public setBlock(lx: number, y: number, lz: number, type: BlockType) {
    if (lx < 0 || lx >= CHUNK_SIZE_X || lz < 0 || lz >= CHUNK_SIZE_Z || y < 0 || y >= CHUNK_HEIGHT) {
      return;
    }
    this.data[this.getIndex(lx, y, lz)] = type;
    this.isDirty = true;
  }

  public buildMeshes(
    getBlockAtWorld: (wx: number, wy: number, wz: number) => BlockType,
    solidMaterial: THREE.Material,
    transMaterial: THREE.Material
  ): { solid: THREE.Mesh | null; transparent: THREE.Mesh | null } {
    const startX = this.cx * CHUNK_SIZE_X;
    const startZ = this.cz * CHUNK_SIZE_Z;

    // Solid arrays
    const solidPositions: number[] = [];
    const solidNormals: number[] = [];
    const solidUVs: number[] = [];
    const solidColors: number[] = [];

    // Transparent arrays (water, glass, leaves, flowers)
    const transPositions: number[] = [];
    const transNormals: number[] = [];
    const transUVs: number[] = [];
    const transColors: number[] = [];

    // Direction vectors & brightness multipliers for directional block shading
    // Top (+Y), Bottom (-Y), North (+Z), South (-Z), East (+X), West (-X)
    const faces = [
      { dir: [0, 1, 0], norm: [0, 1, 0], shade: 1.0, faceKey: 'top' as const },
      { dir: [0, -1, 0], norm: [0, -1, 0], shade: 0.5, faceKey: 'bottom' as const },
      { dir: [0, 0, 1], norm: [0, 0, 1], shade: 0.75, faceKey: 'south' as const },
      { dir: [0, 0, -1], norm: [0, 0, -1], shade: 0.75, faceKey: 'north' as const },
      { dir: [1, 0, 0], norm: [1, 0, 0], shade: 0.85, faceKey: 'east' as const },
      { dir: [-1, 0, 0], norm: [-1, 0, 0], shade: 0.85, faceKey: 'west' as const },
    ];

    for (let lx = 0; lx < CHUNK_SIZE_X; lx++) {
      for (let lz = 0; lz < CHUNK_SIZE_Z; lz++) {
        for (let y = 0; y < CHUNK_HEIGHT; y++) {
          const blockType = this.getBlock(lx, y, lz);
          if (blockType === BlockType.AIR) continue;

          const meta = BLOCK_METAS[blockType] || BLOCK_METAS[BlockType.STONE];
          const isTrans = meta.isTransparent || meta.isLiquid;
          const posArr = isTrans ? transPositions : solidPositions;
          const normArr = isTrans ? transNormals : solidNormals;
          const uvArr = isTrans ? transUVs : solidUVs;
          const colArr = isTrans ? transColors : solidColors;

          const wx = startX + lx;
          const wy = y;
          const wz = startZ + lz;

          // Special plant cross-mesh for flowers & torches
          if (blockType === BlockType.FLOWER_RED || blockType === BlockType.FLOWER_YELLOW || blockType === BlockType.TORCH) {
            const tileIdx = blockType === BlockType.TORCH ? 23 : blockType === BlockType.FLOWER_RED ? 21 : 22;
            const [u0, v0, u1, v1] = getTileUVs(tileIdx);
            const c = 0.95;

            // Diagonal quad 1
            posArr.push(
              wx, wy, wz,
              wx + 1, wy, wz + 1,
              wx + 1, wy + 1, wz + 1,
              wx, wy, wz,
              wx + 1, wy + 1, wz + 1,
              wx, wy + 1, wz
            );
            normArr.push(0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0);
            uvArr.push(u0, v0, u1, v0, u1, v1, u0, v0, u1, v1, u0, v1);
            for (let i = 0; i < 6; i++) colArr.push(c, c, c);

            // Diagonal quad 2
            posArr.push(
              wx + 1, wy, wz,
              wx, wy, wz + 1,
              wx, wy + 1, wz + 1,
              wx + 1, wy, wz,
              wx, wy + 1, wz + 1,
              wx + 1, wy + 1, wz
            );
            normArr.push(0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0);
            uvArr.push(u0, v0, u1, v0, u1, v1, u0, v0, u1, v1, u0, v1);
            for (let i = 0; i < 6; i++) colArr.push(c, c, c);

            continue;
          }

          const faceTiles = getBlockFaceTiles(blockType);

          for (const face of faces) {
            const nwx = wx + face.dir[0];
            const nwy = wy + face.dir[1];
            const nwz = wz + face.dir[2];

            const neighbor = getBlockAtWorld(nwx, nwy, nwz);
            const neighborMeta = BLOCK_METAS[neighbor] || BLOCK_METAS[BlockType.AIR];

            // Culling condition: show face if neighbor is AIR or transparent (and not the same liquid)
            const shouldRenderFace =
              neighbor === BlockType.AIR ||
              (neighborMeta.isTransparent && neighbor !== blockType) ||
              (!isTrans && neighborMeta.isTransparent);

            if (!shouldRenderFace) continue;

            const tileIdx = faceTiles[face.faceKey];
            const [u0, v0, u1, v1] = getTileUVs(tileIdx);
            const shade = face.shade;

            // Construct Quad vertices
            const [dx, dy, dz] = face.dir;
            const nx = face.norm[0];
            const ny = face.norm[1];
            const nz = face.norm[2];

            let v1x = wx, v1y = wy, v1z = wz;
            let v2x = wx, v2y = wy, v2z = wz;
            let v3x = wx, v3y = wy, v3z = wz;
            let v4x = wx, v4y = wy, v4z = wz;

            if (dy === 1) {
              // Top face (+Y)
              v1x = wx; v1y = wy + 1; v1z = wz + 1;
              v2x = wx + 1; v2y = wy + 1; v2z = wz + 1;
              v3x = wx + 1; v3y = wy + 1; v3z = wz;
              v4x = wx; v4y = wy + 1; v4z = wz;
            } else if (dy === -1) {
              // Bottom face (-Y)
              v1x = wx; v1y = wy; v1z = wz;
              v2x = wx + 1; v2y = wy; v2z = wz;
              v3x = wx + 1; v3y = wy; v3z = wz + 1;
              v4x = wx; v4y = wy; v4z = wz + 1;
            } else if (dz === 1) {
              // South face (+Z)
              v1x = wx; v1y = wy; v1z = wz + 1;
              v2x = wx + 1; v2y = wy; v2z = wz + 1;
              v3x = wx + 1; v3y = wy + 1; v3z = wz + 1;
              v4x = wx; v4y = wy + 1; v4z = wz + 1;
            } else if (dz === -1) {
              // North face (-Z)
              v1x = wx + 1; v1y = wy; v1z = wz;
              v2x = wx; v2y = wy; v2z = wz;
              v3x = wx; v3y = wy + 1; v3z = wz;
              v4x = wx + 1; v4y = wy + 1; v4z = wz;
            } else if (dx === 1) {
              // East face (+X)
              v1x = wx + 1; v1y = wy; v1z = wz + 1;
              v2x = wx + 1; v2y = wy; v2z = wz;
              v3x = wx + 1; v3y = wy + 1; v3z = wz;
              v4x = wx + 1; v4y = wy + 1; v4z = wz + 1;
            } else if (dx === -1) {
              // West face (-X)
              v1x = wx; v1y = wy; v1z = wz;
              v2x = wx; v2y = wy; v2z = wz + 1;
              v3x = wx; v3y = wy + 1; v3z = wz + 1;
              v4x = wx; v4y = wy + 1; v4z = wz;
            }

            // Two triangles per face (v1, v2, v3) and (v1, v3, v4)
            posArr.push(
              v1x, v1y, v1z,
              v2x, v2y, v2z,
              v3x, v3y, v3z,
              v1x, v1y, v1z,
              v3x, v3y, v3z,
              v4x, v4y, v4z
            );

            for (let i = 0; i < 6; i++) {
              normArr.push(nx, ny, nz);
              colArr.push(shade, shade, shade);
            }

            uvArr.push(
              u0, v0,
              u1, v0,
              u1, v1,
              u0, v0,
              u1, v1,
              u0, v1
            );
          }
        }
      }
    }

    // Clean up old meshes
    if (this.mesh) {
      this.mesh.geometry.dispose();
      this.mesh = null;
    }
    if (this.transparentMesh) {
      this.transparentMesh.geometry.dispose();
      this.transparentMesh = null;
    }

    // Build solid mesh
    if (solidPositions.length > 0) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(solidPositions, 3));
      geo.setAttribute('normal', new THREE.Float32BufferAttribute(solidNormals, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(solidUVs, 2));
      geo.setAttribute('color', new THREE.Float32BufferAttribute(solidColors, 3));

      this.mesh = new THREE.Mesh(geo, solidMaterial);
      this.mesh.castShadow = true;
      this.mesh.receiveShadow = true;
    }

    // Build transparent mesh
    if (transPositions.length > 0) {
      const transGeo = new THREE.BufferGeometry();
      transGeo.setAttribute('position', new THREE.Float32BufferAttribute(transPositions, 3));
      transGeo.setAttribute('normal', new THREE.Float32BufferAttribute(transNormals, 3));
      transGeo.setAttribute('uv', new THREE.Float32BufferAttribute(transUVs, 2));
      transGeo.setAttribute('color', new THREE.Float32BufferAttribute(transColors, 3));

      this.transparentMesh = new THREE.Mesh(transGeo, transMaterial);
    }

    this.isDirty = false;
    return { solid: this.mesh, transparent: this.transparentMesh };
  }

  public dispose() {
    if (this.mesh) {
      this.mesh.geometry.dispose();
      this.mesh = null;
    }
    if (this.transparentMesh) {
      this.transparentMesh.geometry.dispose();
      this.transparentMesh = null;
    }
  }
}
