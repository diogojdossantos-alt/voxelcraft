import * as THREE from 'three';
import { BlockType, BLOCK_METAS } from './constants';
import { World } from './world';
import { sound } from './audio';

export type MobType = 'zombie' | 'skeleton';

export interface MobDrop {
  type: BlockType;
  count: number;
  position: THREE.Vector3;
}

export class Mob {
  public id: string;
  public type: MobType;
  public group: THREE.Group;
  public position: THREE.Vector3;
  public velocity: THREE.Vector3 = new THREE.Vector3();
  public isGrounded: boolean = false;

  // Collision Box (0.6 x 1.8 x 0.6)
  public width: number = 0.6;
  public height: number = 1.8;

  // Combat Stats
  public health: number;
  public maxHealth: number;
  public speed: number;
  public attackDamage: number;
  public attackCooldown: number = 0;
  public hitFlashTimer: number = 0;
  public groanTimer: number = 0;
  public isBurning: boolean = false;
  public burnTimer: number = 0;

  // Mesh Parts
  public headGroup: THREE.Group;
  public torsoMesh: THREE.Mesh;
  public leftArm: THREE.Mesh;
  public rightArm: THREE.Mesh;
  public leftLeg: THREE.Mesh;
  public rightLeg: THREE.Mesh;
  public bowMesh?: THREE.Group;
  public healthSprite: THREE.Sprite;
  public healthCanvas: HTMLCanvasElement;
  public healthCtx: CanvasRenderingContext2D;
  public materials: THREE.MeshLambertMaterial[] = [];

  // Animation
  private animTime: number = 0;

  constructor(scene: THREE.Scene, type: MobType, startX: number, startY: number, startZ: number) {
    this.id = `mob_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    this.type = type;
    this.position = new THREE.Vector3(startX, startY, startZ);
    this.group = new THREE.Group();
    this.group.position.copy(this.position);

    if (type === 'zombie') {
      this.maxHealth = 20;
      this.health = 20;
      this.speed = 2.6;
      this.attackDamage = 4; // 2 full hearts
      this.groanTimer = 3 + Math.random() * 5;
    } else {
      this.maxHealth = 16;
      this.health = 16;
      this.speed = 2.8;
      this.attackDamage = 3; // 1.5 hearts
      this.groanTimer = 4 + Math.random() * 6;
    }

    // Build Model Parts
    const { head, torso, leftArm, rightArm, leftLeg, rightLeg, bow } = this.buildModel(type);
    this.headGroup = head;
    this.torsoMesh = torso;
    this.leftArm = leftArm;
    this.rightArm = rightArm;
    this.leftLeg = leftLeg;
    this.rightLeg = rightLeg;
    this.bowMesh = bow;

    this.group.add(this.headGroup);
    this.group.add(this.torsoMesh);
    this.group.add(this.leftArm);
    this.group.add(this.rightArm);
    this.group.add(this.leftLeg);
    this.group.add(this.rightLeg);

    // Dynamic Floating Health Bar Canvas
    this.healthCanvas = document.createElement('canvas');
    this.healthCanvas.width = 160;
    this.healthCanvas.height = 48;
    this.healthCtx = this.healthCanvas.getContext('2d')!;
    this.updateHealthBarTexture();

    const spriteMap = new THREE.CanvasTexture(this.healthCanvas);
    spriteMap.minFilter = THREE.LinearFilter;
    const spriteMat = new THREE.SpriteMaterial({ map: spriteMap, transparent: true });
    this.healthSprite = new THREE.Sprite(spriteMat);
    this.healthSprite.scale.set(1.4, 0.42, 1);
    this.healthSprite.position.set(0, 2.2, 0);
    this.group.add(this.healthSprite);

    scene.add(this.group);
  }

  private buildModel(type: MobType) {
    if (type === 'zombie') {
      // Zombie Colors: Green skin, Blue shirt, Dark blue pants
      const skinMat = new THREE.MeshLambertMaterial({ color: 0x43a047 });
      const shirtMat = new THREE.MeshLambertMaterial({ color: 0x0284c7 });
      const pantsMat = new THREE.MeshLambertMaterial({ color: 0x1e3a8a });
      this.materials.push(skinMat, shirtMat, pantsMat);

      // Head
      const headGroup = new THREE.Group();
      const headGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
      const headMesh = new THREE.Mesh(headGeo, skinMat);
      headGroup.position.y = 1.5;
      headGroup.add(headMesh);

      // Zombie Eyes (Dark red/black hollow sockets)
      const eyeGeo = new THREE.BoxGeometry(0.09, 0.09, 0.05);
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0x1c1917 });
      const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
      leftEye.position.set(-0.12, 0.05, 0.26);
      const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
      rightEye.position.set(0.12, 0.05, 0.26);
      headGroup.add(leftEye, rightEye);

      // Torso
      const torsoGeo = new THREE.BoxGeometry(0.5, 0.65, 0.3);
      const torsoMesh = new THREE.Mesh(torsoGeo, shirtMat);
      torsoMesh.position.y = 0.92;

      // Arms (Classic Zombie Outstretched Arms pointing forward)
      const armGeo = new THREE.BoxGeometry(0.2, 0.6, 0.22);
      const leftArm = new THREE.Mesh(armGeo, skinMat);
      leftArm.position.set(-0.36, 1.1, 0.28);
      leftArm.rotation.x = -Math.PI / 2 + 0.1; // Forward outstretched

      const rightArm = new THREE.Mesh(armGeo, skinMat);
      rightArm.position.set(0.36, 1.1, 0.28);
      rightArm.rotation.x = -Math.PI / 2 + 0.1; // Forward outstretched

      // Legs
      const legGeo = new THREE.BoxGeometry(0.22, 0.6, 0.25);
      const leftLeg = new THREE.Mesh(legGeo, pantsMat);
      leftLeg.position.set(-0.13, 0.3, 0);

      const rightLeg = new THREE.Mesh(legGeo, pantsMat);
      rightLeg.position.set(0.13, 0.3, 0);

      return { head: headGroup, torso: torsoMesh, leftArm, rightArm, leftLeg, rightLeg };
    } else {
      // Skeleton: Bone white, hollow dark eyes, ribs
      const boneMat = new THREE.MeshLambertMaterial({ color: 0xe2e8f0 });
      const darkBoneMat = new THREE.MeshLambertMaterial({ color: 0x94a3b8 });
      this.materials.push(boneMat, darkBoneMat);

      // Head
      const headGroup = new THREE.Group();
      const headGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
      const headMesh = new THREE.Mesh(headGeo, boneMat);
      headGroup.position.y = 1.5;
      headGroup.add(headMesh);

      // Deep Dark Sockets
      const socketGeo = new THREE.BoxGeometry(0.11, 0.11, 0.06);
      const socketMat = new THREE.MeshBasicMaterial({ color: 0x09090b });
      const leftSocket = new THREE.Mesh(socketGeo, socketMat);
      leftSocket.position.set(-0.12, 0.05, 0.26);
      const rightSocket = new THREE.Mesh(socketGeo, socketMat);
      rightSocket.position.set(0.12, 0.05, 0.26);
      headGroup.add(leftSocket, rightSocket);

      // Torso (Ribcage aesthetic)
      const torsoGeo = new THREE.BoxGeometry(0.44, 0.65, 0.25);
      const torsoMesh = new THREE.Mesh(torsoGeo, darkBoneMat);
      torsoMesh.position.y = 0.92;

      // Slender Bone Arms
      const armGeo = new THREE.BoxGeometry(0.16, 0.6, 0.16);
      const leftArm = new THREE.Mesh(armGeo, boneMat);
      leftArm.position.set(-0.32, 0.95, 0);

      const rightArm = new THREE.Mesh(armGeo, boneMat);
      rightArm.position.set(0.32, 0.95, 0);
      rightArm.rotation.x = -0.5; // Aiming angle

      // 3D Voxel Bow held in hand
      const bowGroup = new THREE.Group();
      const bowWoodMat = new THREE.MeshLambertMaterial({ color: 0x78350f });
      const bowStringMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

      const bowShaftGeo = new THREE.BoxGeometry(0.06, 0.55, 0.06);
      const bowShaft = new THREE.Mesh(bowShaftGeo, bowWoodMat);
      const bowStringGeo = new THREE.BoxGeometry(0.02, 0.5, 0.02);
      const bowString = new THREE.Mesh(bowStringGeo, bowStringMat);
      bowString.position.x = -0.06;
      bowGroup.add(bowShaft, bowString);
      bowGroup.position.set(0, -0.25, 0.2);
      bowGroup.rotation.y = Math.PI / 4;
      rightArm.add(bowGroup);

      // Slender Bone Legs
      const legGeo = new THREE.BoxGeometry(0.18, 0.6, 0.2);
      const leftLeg = new THREE.Mesh(legGeo, boneMat);
      leftLeg.position.set(-0.12, 0.3, 0);

      const rightLeg = new THREE.Mesh(legGeo, boneMat);
      rightLeg.position.set(0.12, 0.3, 0);

      return { head: headGroup, torso: torsoMesh, leftArm, rightArm, leftLeg, rightLeg, bow: bowGroup };
    }
  }

  public updateHealthBarTexture() {
    const ctx = this.healthCtx;
    ctx.clearRect(0, 0, 160, 48);

    // Background pill
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.beginPath();
    ctx.roundRect(4, 4, 152, 40, 8);
    ctx.fill();

    // Name Label
    ctx.font = 'bold 13px Inter, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = this.type === 'zombie' ? '#4ade80' : '#e2e8f0';
    const label = this.type === 'zombie' ? `🧟 Zumbi (${this.health}/${this.maxHealth})` : `💀 Esqueleto (${this.health}/${this.maxHealth})`;
    ctx.fillText(label, 80, 8);

    // Health Bar Gauge
    const barWidth = 136;
    const barHeight = 8;
    const barX = 12;
    const barY = 26;

    // Background bar
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.beginPath();
    ctx.roundRect(barX, barY, barWidth, barHeight, 4);
    ctx.fill();

    // Fill bar
    const ratio = Math.max(0, Math.min(1, this.health / this.maxHealth));
    if (ratio > 0) {
      ctx.fillStyle = ratio > 0.5 ? '#22c55e' : ratio > 0.25 ? '#eab308' : '#ef4444';
      ctx.beginPath();
      ctx.roundRect(barX, barY, barWidth * ratio, barHeight, 4);
      ctx.fill();
    }

    if (this.healthSprite?.material?.map) {
      this.healthSprite.material.map.needsUpdate = true;
    }
  }

  public takeDamage(amount: number, knockbackDir: THREE.Vector3, force: number = 5.5): boolean {
    this.health = Math.max(0, this.health - amount);
    this.hitFlashTimer = 0.18;

    // Apply knockback velocity
    this.velocity.x += knockbackDir.x * force;
    this.velocity.z += knockbackDir.z * force;
    this.velocity.y = 3.6;
    this.isGrounded = false;

    this.updateHealthBarTexture();
    sound.playMobHurt();

    return this.health <= 0;
  }

  public update(
    delta: number,
    world: World,
    playerPos: THREE.Vector3,
    onAttackPlayer: (mob: Mob, damage: number) => void,
    onShootArrow?: (from: THREE.Vector3, target: THREE.Vector3) => void
  ) {
    this.animTime += delta * 6;

    // Hit Flash feedback (turns reddish for brief duration)
    if (this.hitFlashTimer > 0) {
      this.hitFlashTimer -= delta;
      const flashColor = this.hitFlashTimer > 0 ? 0xff3333 : (this.type === 'zombie' ? 0x43a047 : 0xe2e8f0);
      this.materials.forEach((mat) => {
        mat.color.setHex(flashColor);
      });
    }

    // Ambient Groan / Rattle Sound
    this.groanTimer -= delta;
    if (this.groanTimer <= 0) {
      const distToPlayer = this.position.distanceTo(playerPos);
      if (distToPlayer < 24) {
        if (this.type === 'zombie') {
          sound.playZombieGroan();
        } else {
          sound.playSkeletonRattle();
        }
      }
      this.groanTimer = 5 + Math.random() * 7;
    }

    // AI Decision & Movement
    const toPlayer = new THREE.Vector3().subVectors(playerPos, this.position);
    toPlayer.y = 0; // Horizontal distance
    const distToPlayer = toPlayer.length();

    // Rotate body to face player if nearby
    if (distToPlayer < 26) {
      const targetYaw = Math.atan2(toPlayer.x, toPlayer.z);
      this.group.rotation.y = targetYaw;
    }

    // AI Behaviors
    let wishDir = new THREE.Vector3();
    const isAggro = distToPlayer < 22;

    if (isAggro) {
      if (this.type === 'zombie') {
        // Zombie charges directly towards player
        if (distToPlayer > 1.3) {
          wishDir.copy(toPlayer).normalize();
        } else {
          // Melee attack
          this.attackCooldown -= delta;
          if (this.attackCooldown <= 0) {
            this.attackCooldown = 1.2;
            onAttackPlayer(this, this.attackDamage);
            // Arm attack lunge animation
            this.rightArm.rotation.x = -Math.PI / 1.6;
          }
        }
      } else {
        // Skeleton: Keep tactical range (10 - 16 blocks), strafe and shoot arrows
        if (distToPlayer > 14) {
          wishDir.copy(toPlayer).normalize();
        } else if (distToPlayer < 7) {
          // Back up away from player
          wishDir.copy(toPlayer).normalize().negate();
        }

        // Shoot Arrow
        this.attackCooldown -= delta;
        if (this.attackCooldown <= 0 && distToPlayer < 18) {
          this.attackCooldown = 2.4;
          if (onShootArrow) {
            const arrowOrigin = this.position.clone().add(new THREE.Vector3(0, 1.4, 0));
            const targetAim = playerPos.clone().add(new THREE.Vector3(0, 0.9, 0));
            onShootArrow(arrowOrigin, targetAim);
          }
        }
      }
    }

    // Apply movement physics
    const currentSpeed = this.speed;
    const accel = this.isGrounded ? 30 : 8;

    const targetVx = wishDir.x * currentSpeed;
    const targetVz = wishDir.z * currentSpeed;

    this.velocity.x += (targetVx - this.velocity.x) * Math.min(1, accel * delta);
    this.velocity.z += (targetVz - this.velocity.z) * Math.min(1, accel * delta);

    // Gravity
    this.velocity.y -= 22.0 * delta;

    // Voxel collision & movement resolution
    this.moveWithCollision(delta, world);

    // Update group position
    this.group.position.copy(this.position);

    // Limb Walking Animation
    const horizSpeed = Math.hypot(this.velocity.x, this.velocity.z);
    if (horizSpeed > 0.4 && this.isGrounded) {
      const legAngle = Math.sin(this.animTime) * 0.55;
      this.leftLeg.rotation.x = legAngle;
      this.rightLeg.rotation.x = -legAngle;

      if (this.type === 'skeleton') {
        this.leftArm.rotation.x = -legAngle * 0.8;
      } else {
        // Zombie subtle bobbing of forward-stretched arms
        this.leftArm.rotation.x = -Math.PI / 2 + Math.sin(this.animTime) * 0.15;
        this.rightArm.rotation.x = -Math.PI / 2 - Math.sin(this.animTime) * 0.15;
      }
    } else {
      this.leftLeg.rotation.x = 0;
      this.rightLeg.rotation.x = 0;
      if (this.type === 'zombie') {
        this.leftArm.rotation.x = -Math.PI / 2 + 0.1;
        this.rightArm.rotation.x = -Math.PI / 2 + 0.1;
      }
    }
  }

  private moveWithCollision(delta: number, world: World) {
    // Movement X
    const dx = this.velocity.x * delta;
    if (dx !== 0) {
      const newX = this.position.x + dx;
      if (!this.checkAABBCollision(newX, this.position.y, this.position.z, world)) {
        this.position.x = newX;
      } else {
        // Try Step-up / Jump (1 block high)
        if (this.isGrounded && !this.checkAABBCollision(newX, this.position.y + 1.1, this.position.z, world)) {
          this.position.x = newX;
          this.position.y += 1.05;
        } else {
          this.velocity.x = 0;
        }
      }
    }

    // Movement Z
    const dz = this.velocity.z * delta;
    if (dz !== 0) {
      const newZ = this.position.z + dz;
      if (!this.checkAABBCollision(this.position.x, this.position.y, newZ, world)) {
        this.position.z = newZ;
      } else {
        // Try Step-up / Jump (1 block high)
        if (this.isGrounded && !this.checkAABBCollision(this.position.x, this.position.y + 1.1, newZ, world)) {
          this.position.z = newZ;
          this.position.y += 1.05;
        } else {
          this.velocity.z = 0;
        }
      }
    }

    // Movement Y
    const dy = this.velocity.y * delta;
    const newY = this.position.y + dy;
    if (dy !== 0) {
      if (!this.checkAABBCollision(this.position.x, newY, this.position.z, world)) {
        this.position.y = newY;
        this.isGrounded = false;
      } else {
        if (dy < 0) {
          this.isGrounded = true;
          this.position.y = Math.ceil(newY);
        }
        this.velocity.y = 0;
      }
    }
  }

  private checkAABBCollision(px: number, py: number, pz: number, world: World): boolean {
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
          const block = world.getBlock(x, y, z);
          const meta = BLOCK_METAS[block];
          if (meta && meta.isSolid) {
            return true;
          }
        }
      }
    }
    return false;
  }

  public dispose(scene: THREE.Scene) {
    scene.remove(this.group);
    this.healthSprite.geometry.dispose();
    if (this.healthSprite.material.map) {
      this.healthSprite.material.map.dispose();
    }
    this.healthSprite.material.dispose();
  }
}

// Projectile Arrow Entity for Skeleton
export class ProjectileArrow {
  public mesh: THREE.Group;
  public position: THREE.Vector3;
  public velocity: THREE.Vector3;
  public life: number = 5.0; // Despawns after 5 seconds
  public isStuck: boolean = false;

  constructor(scene: THREE.Scene, start: THREE.Vector3, target: THREE.Vector3) {
    this.position = start.clone();
    this.mesh = new THREE.Group();

    // Calculate initial trajectory velocity
    const dir = new THREE.Vector3().subVectors(target, start);
    const dist = dir.length();
    dir.normalize();

    // Speed 18 blocks/sec with slight arc
    const speed = 18.0;
    this.velocity = dir.multiplyScalar(speed);
    this.velocity.y += Math.min(2.5, dist * 0.12); // Arching trajectory

    // 3D Arrow Model: Shaft + Stone Tip + Fletching
    const shaftGeo = new THREE.BoxGeometry(0.05, 0.05, 0.6);
    const shaftMat = new THREE.MeshLambertMaterial({ color: 0x92400e });
    const shaft = new THREE.Mesh(shaftGeo, shaftMat);

    const tipGeo = new THREE.ConeGeometry(0.08, 0.16, 4);
    const tipMat = new THREE.MeshLambertMaterial({ color: 0x64748b });
    const tip = new THREE.Mesh(tipGeo, tipMat);
    tip.rotation.x = Math.PI / 2;
    tip.position.z = 0.35;

    const featherGeo = new THREE.BoxGeometry(0.14, 0.02, 0.15);
    const featherMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const feather = new THREE.Mesh(featherGeo, featherMat);
    feather.position.z = -0.22;

    this.mesh.add(shaft, tip, feather);
    this.mesh.position.copy(this.position);
    scene.add(this.mesh);

    sound.playBowShoot();
  }

  public update(delta: number, world: World, playerPos: THREE.Vector3, onHitPlayer: (damage: number) => void): boolean {
    if (this.isStuck) {
      this.life -= delta;
      return this.life <= 0;
    }

    this.life -= delta;
    if (this.life <= 0) return true;

    // Gravity
    this.velocity.y -= 14.0 * delta;

    // Move
    this.position.addScaledVector(this.velocity, delta);
    this.mesh.position.copy(this.position);

    // Rotate arrow towards its trajectory
    const dir = this.velocity.clone().normalize();
    this.mesh.lookAt(this.position.clone().add(dir));

    // Check hit player (within 0.8 blocks radius around player center)
    const playerCenter = playerPos.clone().add(new THREE.Vector3(0, 0.9, 0));
    if (this.position.distanceTo(playerCenter) < 0.9) {
      onHitPlayer(3); // 1.5 hearts
      return true; // Destroy arrow on player impact
    }

    // Check hit world blocks
    const bx = Math.floor(this.position.x);
    const by = Math.floor(this.position.y);
    const bz = Math.floor(this.position.z);
    const block = world.getBlock(bx, by, bz);
    const meta = BLOCK_METAS[block];

    if (meta && meta.isSolid) {
      this.isStuck = true;
      this.life = 1.5; // Stays stuck briefly
      sound.playHit('wood');
    }

    return false;
  }

  public dispose(scene: THREE.Scene) {
    scene.remove(this.mesh);
  }
}

// Mob Manager: handles AI updates, dark area detection, spawning, and combat queries
export class MobManager {
  public scene: THREE.Scene;
  public world: World;
  public mobs: Mob[] = [];
  public arrows: ProjectileArrow[] = [];
  public maxMobs: number = 10;
  private spawnTimer: number = 2.0;

  constructor(scene: THREE.Scene, world: World) {
    this.scene = scene;
    this.world = world;
  }

  public spawnMob(type: MobType, x: number, y: number, z: number): Mob {
    const mob = new Mob(this.scene, type, x, y, z);
    this.mobs.push(mob);
    return mob;
  }

  /**
   * timeOfDay: 0 = meia-noite, 0.25 = nascer do sol, 0.5 = meio-dia, 0.75 = por do sol.
   */
  public ehNoite(timeOfDay: number): boolean {
    return timeOfDay < 0.22 || timeOfDay > 0.78;
  }

  // Determines if candidate (x, y, z) is in a dark area (caves, underground, or surface at night)
  public isDarkArea(x: number, y: number, z: number, timeOfDay: number): boolean {
    const bx = Math.floor(x);
    const by = Math.floor(y);
    const bz = Math.floor(z);

    // 1. Proximity to Torches: torches emit bright light and suppress mob spawning
    for (let dx = -6; dx <= 6; dx++) {
      for (let dy = -3; dy <= 4; dy++) {
        for (let dz = -6; dz <= 6; dz++) {
          if (this.world.getBlock(bx + dx, by + dy, bz + dz) === BlockType.TORCH) {
            return false;
          }
        }
      }
    }

    // 2. Cave / Underground check: look for a roof above
    let roofCount = 0;
    for (let checkY = by + 2; checkY <= Math.min(by + 16, 46); checkY++) {
      const block = this.world.getBlock(bx, checkY, bz);
      const meta = BLOCK_METAS[block];
      if (meta && meta.isSolid) {
        roofCount++;
      }
    }

    // If there is a roof overhead, it is sheltered from the sun (dark cave!)
    if (roofCount >= 2) {
      return true;
    }

    // 3. Superficie: so e escuro se for noite
    return this.ehNoite(timeOfDay);
  }

  // Attempt periodic mob spawning around player in dark spots
  private trySpawnMobs(playerPos: THREE.Vector3, timeOfDay: number) {
    // Hostis so nascem de noite. Antes bastava o lugar ser escuro, entao
    // caverna gerava monstro ao meio-dia; agora a hora do dia manda.
    if (!this.ehNoite(timeOfDay)) return;
    if (this.mobs.length >= this.maxMobs) return;

    // Pick a candidate location between 16 and 32 blocks away from player
    const angle = Math.random() * Math.PI * 2;
    const dist = 16 + Math.random() * 16;
    const cx = playerPos.x + Math.cos(angle) * dist;
    const cz = playerPos.z + Math.sin(angle) * dist;

    // Search vertical column for a solid ground with 2 air blocks above
    const startY = Math.min(42, Math.max(8, Math.floor(playerPos.y + (Math.random() * 12 - 6))));

    for (let cy = startY; cy >= 4; cy--) {
      const ground = this.world.getBlock(Math.floor(cx), cy, Math.floor(cz));
      const groundMeta = BLOCK_METAS[ground];

      if (groundMeta && groundMeta.isSolid && ground !== BlockType.CACTUS) {
        const air1 = this.world.getBlock(Math.floor(cx), cy + 1, Math.floor(cz));
        const air2 = this.world.getBlock(Math.floor(cx), cy + 2, Math.floor(cz));

        if (air1 === BlockType.AIR && air2 === BlockType.AIR) {
          const spawnY = cy + 1;
          if (this.isDarkArea(cx, spawnY, cz, timeOfDay)) {
            // Determine mob type: 55% zombie, 45% skeleton
            const type: MobType = Math.random() < 0.55 ? 'zombie' : 'skeleton';
            this.spawnMob(type, cx + 0.5, spawnY + 0.1, cz + 0.5);
            break;
          }
        }
      }
    }
  }

  public update(
    delta: number,
    playerPos: THREE.Vector3,
    timeOfDay: number,
    onPlayerDamage: (damage: number, sourceName: string) => void,
    onMobDrop: (drop: MobDrop) => void
  ) {
    // Spawning ticks
    this.spawnTimer -= delta;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = 4.0;
      this.trySpawnMobs(playerPos, timeOfDay);
    }

    const isDaylight = timeOfDay >= 0.25 && timeOfDay <= 0.75;

    // Update active mobs
    for (let i = this.mobs.length - 1; i >= 0; i--) {
      const mob = this.mobs[i];

      // Despawn mobs that wander too far away (> 48 blocks)
      if (mob.position.distanceTo(playerPos) > 48) {
        mob.dispose(this.scene);
        this.mobs.splice(i, 1);
        continue;
      }

      // Daylight burning: if in sunlight without a roof during daytime
      if (isDaylight) {
        let hasRoof = false;
        const bx = Math.floor(mob.position.x);
        const by = Math.floor(mob.position.y);
        const bz = Math.floor(mob.position.z);

        for (let checkY = by + 2; checkY <= 46; checkY++) {
          const block = this.world.getBlock(bx, checkY, bz);
          const meta = BLOCK_METAS[block];
          if (meta && meta.isSolid) {
            hasRoof = true;
            break;
          }
        }

        if (!hasRoof) {
          // Burn!
          mob.burnTimer += delta;
          if (mob.burnTimer >= 1.0) {
            mob.burnTimer = 0;
            const killed = mob.takeDamage(2, new THREE.Vector3(0, 0, 0), 0);
            if (killed) {
              this.handleMobDeath(mob, onMobDrop);
              this.mobs.splice(i, 1);
              continue;
            }
          }
        }
      }

      // Update Mob AI & Physics
      mob.update(
        delta,
        this.world,
        playerPos,
        (attacker, dmg) => {
          onPlayerDamage(dmg, attacker.type === 'zombie' ? 'Zumbi' : 'Esqueleto');
          sound.playPlayerHurt();
        },
        (from, target) => {
          // Skeleton shoots projectile arrow
          const arrow = new ProjectileArrow(this.scene, from, target);
          this.arrows.push(arrow);
        }
      );
    }

    // Update Projectile Arrows
    for (let j = this.arrows.length - 1; j >= 0; j--) {
      const arrow = this.arrows[j];
      const finished = arrow.update(delta, this.world, playerPos, (dmg) => {
        onPlayerDamage(dmg, 'Flecha de Esqueleto');
        sound.playPlayerHurt();
      });

      if (finished) {
        arrow.dispose(this.scene);
        this.arrows.splice(j, 1);
      }
    }
  }

  // Handle Player attack raycast against mobs
  public hitMobAtRay(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    maxDistance: number,
    damage: number,
    onMobDrop: (drop: MobDrop) => void
  ): Mob | null {
    let closestMob: Mob | null = null;
    let closestDist = maxDistance;

    const ray = new THREE.Ray(origin, direction.clone().normalize());

    for (const mob of this.mobs) {
      // Cylinder / Sphere collision check for mob body (center at y + 0.9)
      const center = mob.position.clone().add(new THREE.Vector3(0, 0.9, 0));
      const sphere = new THREE.Sphere(center, 0.65);

      const hitPoint = new THREE.Vector3();
      if (ray.intersectSphere(sphere, hitPoint)) {
        const dist = origin.distanceTo(hitPoint);
        if (dist < closestDist) {
          closestDist = dist;
          closestMob = mob;
        }
      }
    }

    if (closestMob) {
      const knockbackDir = direction.clone().setY(0.2).normalize();
      const isDead = closestMob.takeDamage(damage, knockbackDir, 5.0);

      if (isDead) {
        this.handleMobDeath(closestMob, onMobDrop);
        const idx = this.mobs.indexOf(closestMob);
        if (idx !== -1) {
          this.mobs.splice(idx, 1);
        }
      }
      return closestMob;
    }

    return null;
  }

  private handleMobDeath(mob: Mob, onMobDrop: (drop: MobDrop) => void) {
    sound.playMobDeath();

    // Item drops
    if (mob.type === 'zombie') {
      // Rotten flesh (1-2) + chance of Iron Ore or Coal
      const fleshCount = 1 + Math.floor(Math.random() * 2);
      onMobDrop({
        type: BlockType.ROTTEN_FLESH,
        count: fleshCount,
        position: mob.position.clone(),
      });

      if (Math.random() < 0.35) {
        onMobDrop({
          type: BlockType.IRON_ORE,
          count: 1,
          position: mob.position.clone(),
        });
      }
    } else {
      // Skeleton: Bones (1-2) + Arrows (2-4)
      const boneCount = 1 + Math.floor(Math.random() * 2);
      onMobDrop({
        type: BlockType.BONE,
        count: boneCount,
        position: mob.position.clone(),
      });

      const arrowCount = 2 + Math.floor(Math.random() * 3);
      onMobDrop({
        type: BlockType.ARROW,
        count: arrowCount,
        position: mob.position.clone(),
      });
    }

    mob.dispose(this.scene);
  }

  public clearAll() {
    for (const mob of this.mobs) {
      mob.dispose(this.scene);
    }
    this.mobs = [];

    for (const arrow of this.arrows) {
      arrow.dispose(this.scene);
    }
    this.arrows = [];
  }

  public dispose() {
    this.clearAll();
  }
}
