import * as THREE from 'three';
import { BlockType, BLOCK_METAS, WATER_LEVEL } from './constants';
import { World } from './world';
import { sound } from './audio';

export interface TargetBlock {
  x: number;
  y: number;
  z: number;
  faceNormal: THREE.Vector3;
  type: BlockType;
}

export class Player {
  public position: THREE.Vector3;
  public velocity: THREE.Vector3 = new THREE.Vector3();
  public camera: THREE.PerspectiveCamera;
  public world: World;

  // Rotation
  public yaw: number = 0;
  public pitch: number = 0;

  // Collision box: 0.6 x 1.8 x 0.6
  public width: number = 0.6;
  public height: number = 1.8;
  public eyeHeight: number = 1.62;

  // State flags
  public isGrounded: boolean = false;
  public isInWater: boolean = false;
  public isFlying: boolean = false;
  public isSprinting: boolean = false;
  public isSneaking: boolean = false;
  public isThirdPerson: boolean = false;

  // Input states
  public keys: Record<string, boolean> = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    jump: false,
    sneak: false,
    sprint: false,
    up: false,
    down: false,
  };

  // Targeting & Mining
  public targetBlock: TargetBlock | null = null;
  public highlightBox: THREE.LineSegments;
  public breakProgress: number = 0; // 0 to 1
  public isMining: boolean = false;
  public heldItemType: BlockType = BlockType.GRASS;
  private miningTimer: number = 0;
  private stepTimer: number = 0;

  // Third person avatar representation
  public thirdPersonMesh: THREE.Group;

  constructor(world: World, camera: THREE.PerspectiveCamera) {
    this.world = world;
    this.camera = camera;
    this.position = new THREE.Vector3(8.5, 24, 8.5);

    // Target block wireframe highlight
    const boxGeo = new THREE.BoxGeometry(1.005, 1.005, 1.005);
    const edges = new THREE.EdgesGeometry(boxGeo);
    this.highlightBox = new THREE.LineSegments(
      edges,
      new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 })
    );
    this.highlightBox.visible = false;
    this.world.scene.add(this.highlightBox);

    // Third person avatar group
    this.thirdPersonMesh = new THREE.Group();
    this.setupAvatarMesh();
    this.world.scene.add(this.thirdPersonMesh);

    // Spawn safely at surface
    this.spawnSafely(8.5, 8.5);
  }

  public spawnSafely(x: number = 8.5, z: number = 8.5) {
    const surfaceY = this.world.generator.getSurfaceHeight(Math.floor(x), Math.floor(z));
    let sy = Math.max(surfaceY + 1, 16);
    // Find free air height
    while (sy < 44 && this.checkAABBCollision(x, sy, z)) {
      sy++;
    }
    this.position.set(x, sy + 0.1, z);
    this.velocity.set(0, 0, 0);
    this.isGrounded = false;
  }

  private setupAvatarMesh() {
    const skinMat = new THREE.MeshLambertMaterial({ color: 0x3b82f6 });
    const headMat = new THREE.MeshLambertMaterial({ color: 0xf59e0b });

    // Head
    const headGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const headMesh = new THREE.Mesh(headGeo, headMat);
    headMesh.position.y = 1.5;
    this.thirdPersonMesh.add(headMesh);

    // Body
    const bodyGeo = new THREE.BoxGeometry(0.5, 0.7, 0.3);
    const bodyMesh = new THREE.Mesh(bodyGeo, skinMat);
    bodyMesh.position.y = 0.9;
    this.thirdPersonMesh.add(bodyMesh);

    // Legs
    const legGeo = new THREE.BoxGeometry(0.2, 0.6, 0.25);
    const leftLeg = new THREE.Mesh(legGeo, skinMat);
    leftLeg.position.set(-0.13, 0.3, 0);
    const rightLeg = new THREE.Mesh(legGeo, skinMat);
    rightLeg.position.set(0.13, 0.3, 0);
    this.thirdPersonMesh.add(leftLeg);
    this.thirdPersonMesh.add(rightLeg);

    this.thirdPersonMesh.visible = false;
  }

  public handleMouseMove(movementX: number, movementY: number) {
    const sensitivity = 0.0022;
    this.yaw -= movementX * sensitivity;
    this.pitch -= movementY * sensitivity;

    // Clamp pitch between -89 and +89 deg
    const maxPitch = (Math.PI / 2) - 0.02;
    this.pitch = Math.max(-maxPitch, Math.min(maxPitch, this.pitch));
  }

  public update(delta: number, onBlockMined?: (mined: TargetBlock) => void) {
    // Check water
    const blockAtFeet = this.world.getBlock(this.position.x, this.position.y + 0.2, this.position.z);
    this.isInWater = blockAtFeet === BlockType.WATER || this.position.y < WATER_LEVEL;

    // Movement speeds
    const baseSpeed = this.isFlying ? 12 : this.isSprinting ? 6.5 : this.isSneaking ? 2.0 : 4.3;
    const accel = this.isFlying ? 35 : this.isGrounded ? 45 : 12;

    // Direction vectors
    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)).normalize();
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw)).normalize();

    const wishDir = new THREE.Vector3();
    if (this.keys.forward) wishDir.add(forward);
    if (this.keys.backward) wishDir.sub(forward);
    if (this.keys.right) wishDir.add(right);
    if (this.keys.left) wishDir.sub(right);

    if (wishDir.lengthSq() > 0) {
      wishDir.normalize();
    }

    if (this.isFlying) {
      // Flight physics
      const targetVx = wishDir.x * baseSpeed;
      const targetVz = wishDir.z * baseSpeed;
      let targetVy = 0;
      if (this.keys.jump || this.keys.up) targetVy = baseSpeed * 0.8;
      if (this.keys.sneak || this.keys.down) targetVy = -baseSpeed * 0.8;

      this.velocity.x += (targetVx - this.velocity.x) * Math.min(1, accel * delta);
      this.velocity.z += (targetVz - this.velocity.z) * Math.min(1, accel * delta);
      this.velocity.y += (targetVy - this.velocity.y) * Math.min(1, accel * delta);

      this.position.addScaledVector(this.velocity, delta);
    } else {
      // Normal / Water physics
      const targetVx = wishDir.x * baseSpeed;
      const targetVz = wishDir.z * baseSpeed;

      const friction = this.isGrounded ? 15 : this.isInWater ? 8 : 2;
      this.velocity.x += (targetVx - this.velocity.x) * Math.min(1, accel * delta);
      this.velocity.z += (targetVz - this.velocity.z) * Math.min(1, accel * delta);

      // Water buoyancy & drag
      if (this.isInWater) {
        this.velocity.y -= 8.0 * delta; // Reduced gravity
        this.velocity.y *= Math.max(0, 1 - 4.0 * delta); // Drag

        if (this.keys.jump) {
          this.velocity.y = 3.5;
        }
      } else {
        // Normal Gravity
        this.velocity.y -= 25.0 * delta;

        // Jump
        if (this.keys.jump && this.isGrounded) {
          this.velocity.y = 8.5;
          this.isGrounded = false;
          sound.playJump();
        }
      }

      // Voxel AABB collision & resolution
      this.moveWithCollision(delta);
    }

    // Footstep sounds
    const horizSpeed = Math.hypot(this.velocity.x, this.velocity.z);
    if (this.isGrounded && horizSpeed > 1.0) {
      this.stepTimer += delta * (this.isSprinting ? 1.4 : 1.0);
      if (this.stepTimer > 0.38) {
        this.stepTimer = 0;
        const groundBlock = this.world.getBlock(this.position.x, this.position.y - 0.2, this.position.z);
        const meta = BLOCK_METAS[groundBlock];
        sound.playStep(meta?.sound || 'grass');
      }
    }

    // Update Camera
    if (this.isThirdPerson) {
      this.thirdPersonMesh.visible = true;
      this.thirdPersonMesh.position.copy(this.position);
      this.thirdPersonMesh.rotation.y = this.yaw;

      // Position camera behind player
      const camOffset = new THREE.Vector3(0, 1.8, 3.5);
      camOffset.applyEuler(new THREE.Euler(this.pitch * 0.5, this.yaw, 0, 'YXZ'));
      this.camera.position.copy(this.position).add(camOffset);
      this.camera.lookAt(this.position.x, this.position.y + this.eyeHeight * 0.8, this.position.z);
    } else {
      this.thirdPersonMesh.visible = false;
      this.camera.position.set(this.position.x, this.position.y + this.eyeHeight, this.position.z);
      this.camera.rotation.order = 'YXZ';
      this.camera.rotation.y = this.yaw;
      this.camera.rotation.x = this.pitch;
    }

    // Update raycast block target
    this.updateTargetBlock();

    // Handle block mining
    if (this.isMining && this.targetBlock) {
      const meta = BLOCK_METAS[this.targetBlock.type];
      const hardness = meta ? meta.hardness : 1.0;

      if (hardness === 0) {
        // Instant break
        if (onBlockMined) onBlockMined(this.targetBlock);
        this.breakProgress = 0;
        this.isMining = false;
      } else {
        // Compute tool speed multiplier
        const heldMeta = BLOCK_METAS[this.heldItemType];
        let speedMult = 1.0;

        if (heldMeta && heldMeta.isTool && heldMeta.toolType) {
          const targetType = this.targetBlock.type;
          if (heldMeta.toolType === 'pickaxe') {
            if (
              targetType === BlockType.STONE ||
              targetType === BlockType.COBBLESTONE ||
              targetType === BlockType.COAL_ORE ||
              targetType === BlockType.IRON_ORE ||
              targetType === BlockType.GOLD_ORE ||
              targetType === BlockType.DIAMOND_ORE ||
              targetType === BlockType.BRICKS ||
              targetType === BlockType.FURNACE ||
              targetType === BlockType.OBSIDIAN
            ) {
              speedMult = heldMeta.speedMultiplier || 2.0;
            }
          } else if (heldMeta.toolType === 'axe') {
            if (
              targetType === BlockType.WOOD_LOG ||
              targetType === BlockType.WOOD_PLANKS ||
              targetType === BlockType.BOOKSHELF ||
              targetType === BlockType.CRAFTING_TABLE
            ) {
              speedMult = heldMeta.speedMultiplier || 2.5;
            }
          } else if (heldMeta.toolType === 'shovel') {
            if (
              targetType === BlockType.DIRT ||
              targetType === BlockType.GRASS ||
              targetType === BlockType.SAND ||
              targetType === BlockType.SNOW
            ) {
              speedMult = heldMeta.speedMultiplier || 2.5;
            }
          }
        }

        this.breakProgress += (delta * speedMult) / hardness;
        this.miningTimer += delta;

        if (this.miningTimer > 0.18) {
          this.miningTimer = 0;
          sound.playHit(meta?.sound || 'stone');
        }

        if (this.breakProgress >= 1.0) {
          if (onBlockMined) onBlockMined(this.targetBlock);
          this.breakProgress = 0;
        }
      }
    } else {
      this.breakProgress = 0;
      this.miningTimer = 0;
    }
  }

  private moveWithCollision(delta: number) {
    const halfW = this.width / 2;

    // Movement X
    const dx = this.velocity.x * delta;
    if (dx !== 0) {
      const newX = this.position.x + dx;
      if (!this.checkAABBCollision(newX, this.position.y, this.position.z)) {
        this.position.x = newX;
      } else {
        // Step-up attempt (0.5 block)
        if (this.isGrounded && !this.checkAABBCollision(newX, this.position.y + 0.55, this.position.z)) {
          this.position.x = newX;
          this.position.y += 0.55;
        } else {
          this.velocity.x = 0;
        }
      }
    }

    // Movement Z
    const dz = this.velocity.z * delta;
    if (dz !== 0) {
      const newZ = this.position.z + dz;
      if (!this.checkAABBCollision(this.position.x, this.position.y, newZ)) {
        this.position.z = newZ;
      } else {
        // Step-up attempt (0.5 block)
        if (this.isGrounded && !this.checkAABBCollision(this.position.x, this.position.y + 0.55, newZ)) {
          this.position.z = newZ;
          this.position.y += 0.55;
        } else {
          this.velocity.z = 0;
        }
      }
    }

    // Movement Y
    const dy = this.velocity.y * delta;
    const newY = this.position.y + dy;
    if (dy !== 0) {
      if (!this.checkAABBCollision(this.position.x, newY, this.position.z)) {
        this.position.y = newY;
        this.isGrounded = false;
      } else {
        if (dy < 0) {
          // Landed on ground
          this.isGrounded = true;
          this.position.y = Math.ceil(newY);
        }
        this.velocity.y = 0;
      }
    }
  }

  private checkAABBCollision(px: number, py: number, pz: number): boolean {
    const halfW = this.width / 2;
    const minX = Math.floor(px - halfW);
    const maxX = Math.floor(px + halfW);
    const minY = Math.floor(py);
    const maxY = Math.floor(py + this.height);
    const minZ = Math.floor(pz - halfW);
    const maxZ = Math.floor(pz + halfW);

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        for (let z = minZ; z <= maxZ; z++) {
          const block = this.world.getBlock(x, y, z);
          const meta = BLOCK_METAS[block];
          if (meta && meta.isSolid) {
            return true;
          }
        }
      }
    }

    return false;
  }

  private updateTargetBlock() {
    const origin = new THREE.Vector3(this.position.x, this.position.y + this.eyeHeight, this.position.z);
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);

    // DDA / Raymarching through voxels (range 5 blocks)
    const maxDist = 5.5;
    const stepSize = 0.08;
    const current = origin.clone();
    let hit: TargetBlock | null = null;

    let lastBlockPos: THREE.Vector3 | null = null;

    for (let dist = 0; dist < maxDist; dist += stepSize) {
      current.addScaledVector(dir, stepSize);
      const bx = Math.floor(current.x);
      const by = Math.floor(current.y);
      const bz = Math.floor(current.z);

      const block = this.world.getBlock(bx, by, bz);
      const meta = BLOCK_METAS[block];

      if (block !== BlockType.AIR && block !== BlockType.WATER && meta && meta.isSolid) {
        // Found solid block
        const normal = new THREE.Vector3();
        if (lastBlockPos) {
          normal.subVectors(lastBlockPos, new THREE.Vector3(bx, by, bz));
        } else {
          normal.set(0, 1, 0);
        }

        hit = {
          x: bx,
          y: by,
          z: bz,
          faceNormal: normal,
          type: block,
        };
        break;
      }

      lastBlockPos = new THREE.Vector3(bx, by, bz);
    }

    this.targetBlock = hit;

    if (hit) {
      this.highlightBox.visible = true;
      this.highlightBox.position.set(hit.x + 0.5, hit.y + 0.5, hit.z + 0.5);
    } else {
      this.highlightBox.visible = false;
    }
  }

  public dispose() {
    this.world.scene.remove(this.highlightBox);
    this.world.scene.remove(this.thirdPersonMesh);
    this.highlightBox.geometry.dispose();
  }
}
