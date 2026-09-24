import * as THREE from 'three';
import { BlockType } from './constants';

export class RemotePlayerAvatar {
  public id: string;
  public name: string;
  public group: THREE.Group;
  public head: THREE.Group;
  public leftArm: THREE.Mesh;
  public rightArm: THREE.Mesh;
  public leftLeg: THREE.Mesh;
  public rightLeg: THREE.Mesh;
  public heldItem: THREE.Mesh;
  public nameSprite: THREE.Sprite;

  // Target values for smooth interpolation
  public targetPos: THREE.Vector3;
  public targetYaw: number = 0;
  public targetPitch: number = 0;
  public isSneaking: boolean = false;
  public isPunching: boolean = false;
  public animTime: number = 0;

  constructor(scene: THREE.Scene, id: string, name: string, colorHex: string) {
    this.id = id;
    this.name = name;
    this.group = new THREE.Group();
    this.targetPos = new THREE.Vector3();

    const skinMat = new THREE.MeshLambertMaterial({ color: 0xf59e0b });
    const shirtMat = new THREE.MeshLambertMaterial({ color: colorHex || 0x3b82f6 });
    const pantsMat = new THREE.MeshLambertMaterial({ color: 0x1e3a8a });

    // Head group
    this.head = new THREE.Group();
    const headGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const headMesh = new THREE.Mesh(headGeo, skinMat);
    this.head.position.y = 1.5;
    this.head.add(headMesh);
    this.group.add(this.head);

    // Torso
    const bodyGeo = new THREE.BoxGeometry(0.5, 0.65, 0.3);
    const bodyMesh = new THREE.Mesh(bodyGeo, shirtMat);
    bodyMesh.position.y = 0.92;
    this.group.add(bodyMesh);

    // Arms
    const armGeo = new THREE.BoxGeometry(0.2, 0.6, 0.22);
    // Left Arm
    this.leftArm = new THREE.Mesh(armGeo, shirtMat);
    this.leftArm.position.set(-0.36, 0.95, 0);
    this.group.add(this.leftArm);

    // Right Arm
    this.rightArm = new THREE.Mesh(armGeo, shirtMat);
    this.rightArm.position.set(0.36, 0.95, 0);
    this.group.add(this.rightArm);

    // Held item in hand
    const itemGeo = new THREE.BoxGeometry(0.2, 0.2, 0.2);
    const itemMat = new THREE.MeshLambertMaterial({ color: 0x519e34 });
    this.heldItem = new THREE.Mesh(itemGeo, itemMat);
    this.heldItem.position.set(0, -0.3, 0.15);
    this.rightArm.add(this.heldItem);

    // Legs
    const legGeo = new THREE.BoxGeometry(0.22, 0.6, 0.25);
    this.leftLeg = new THREE.Mesh(legGeo, pantsMat);
    this.leftLeg.position.set(-0.13, 0.3, 0);
    this.rightLeg = new THREE.Mesh(legGeo, pantsMat);
    this.rightLeg.position.set(0.13, 0.3, 0);
    this.group.add(this.leftLeg);
    this.group.add(this.rightLeg);

    // Floating Nametag
    this.nameSprite = this.createNametag(name);
    this.nameSprite.position.set(0, 2.0, 0);
    this.group.add(this.nameSprite);

    scene.add(this.group);
  }

  private createNametag(text: string): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.roundRect(10, 10, 236, 44, 10);
    ctx.fill();

    ctx.font = 'bold 24px VT323, Inter, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, 128, 32);

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.LinearFilter;
    const mat = new THREE.SpriteMaterial({ map: texture, depthTest: false });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(1.5, 0.4, 1);
    return sprite;
  }

  public setHeldBlock(blockType: BlockType) {
    // Quick color preview of held block
    const colors: Partial<Record<BlockType, number>> = {
      [BlockType.GRASS]: 0x519e34,
      [BlockType.DIRT]: 0x865432,
      [BlockType.STONE]: 0x828282,
      [BlockType.WOOD_PLANKS]: 0xbe8c53,
      [BlockType.GLASS]: 0xd7f0ff,
      [BlockType.BRICKS]: 0xab4939,
      [BlockType.SAND]: 0xf4e5a9,
      [BlockType.TNT]: 0xdb3223,
      [BlockType.TORCH]: 0xffaa00,
      [BlockType.DIAMOND_ORE]: 0x5ef0f0,
    };

    if (this.heldItem.material instanceof THREE.MeshLambertMaterial) {
      this.heldItem.material.color.setHex(colors[blockType] || 0xcccccc);
    }
  }

  public update(delta: number) {
    // Smooth lerp to target position and rotation
    this.group.position.lerp(this.targetPos, Math.min(1, 15 * delta));
    this.group.rotation.y = THREE.MathUtils.lerp(this.group.rotation.y, this.targetYaw, Math.min(1, 15 * delta));
    this.head.rotation.x = THREE.MathUtils.lerp(this.head.rotation.x, this.targetPitch, Math.min(1, 15 * delta));

    // Stride animation if moving
    const speed = this.group.position.distanceTo(this.targetPos) / Math.max(0.01, delta);
    const isMoving = speed > 0.4;

    if (isMoving) {
      this.animTime += delta * 8;
      const swing = Math.sin(this.animTime) * 0.6;
      this.leftLeg.rotation.x = swing;
      this.rightLeg.rotation.x = -swing;
      this.leftArm.rotation.x = -swing;
      if (!this.isPunching) {
        this.rightArm.rotation.x = swing;
      }
    } else {
      // Idle pose
      this.leftLeg.rotation.x = 0;
      this.rightLeg.rotation.x = 0;
      this.leftArm.rotation.x = 0;
      if (!this.isPunching) {
        this.rightArm.rotation.x = 0;
      }
    }

    // Punch animation
    if (this.isPunching) {
      this.rightArm.rotation.x = -Math.PI / 3 + Math.sin(Date.now() * 0.02) * 0.4;
    }
  }

  public dispose(scene: THREE.Scene) {
    scene.remove(this.group);
  }
}
