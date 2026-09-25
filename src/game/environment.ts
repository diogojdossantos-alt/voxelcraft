import * as THREE from 'three';

export class Environment {
  public scene: THREE.Scene;
  public dirLight: THREE.DirectionalLight;
  public hemiLight: THREE.HemisphereLight;
  public sunMesh: THREE.Mesh;
  public moonMesh: THREE.Mesh;
  public cloudsMesh: THREE.Mesh;
  public timeOfDay: number = 0.25; // 0 = midnight, 0.25 = sunrise, 0.5 = noon, 0.75 = sunset
  public cycleSpeed: number = 0.005; // cycle speed
  public isPaused: boolean = false;

  private daySky = new THREE.Color('#78bbf5');
  private dayFog = new THREE.Color('#9fd4ff');
  private sunsetSky = new THREE.Color('#fca374');
  private sunsetFog = new THREE.Color('#ff8c69');
  private nightSky = new THREE.Color('#070b19');
  private nightFog = new THREE.Color('#0a1024');

  // Weather Sky & Fog Overlays
  private rainDaySky = new THREE.Color('#334155');
  private rainDayFog = new THREE.Color('#475569');
  private rainNightSky = new THREE.Color('#0f172a');
  private rainNightFog = new THREE.Color('#1e293b');

  private snowDaySky = new THREE.Color('#cbd5e1');
  private snowDayFog = new THREE.Color('#e2e8f0');
  private snowNightSky = new THREE.Color('#1e293b');
  private snowNightFog = new THREE.Color('#334155');

  private baseFogDensity: number = 0.018;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    // Fog
    scene.fog = new THREE.FogExp2(this.dayFog.getHex(), this.baseFogDensity);

    // Hemispheric ambient light
    this.hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
    this.scene.add(this.hemiLight);

    // Sun / Moon Directional Light
    this.dirLight = new THREE.DirectionalLight(0xfffaed, 1.2);
    this.dirLight.position.set(50, 100, 50);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 1024;
    this.dirLight.shadow.mapSize.height = 1024;
    this.dirLight.shadow.camera.near = 0.5;
    this.dirLight.shadow.camera.far = 180;
    const d = 40;
    this.dirLight.shadow.camera.left = -d;
    this.dirLight.shadow.camera.right = d;
    this.dirLight.shadow.camera.top = d;
    this.dirLight.shadow.camera.bottom = -d;
    // Sem bias as faces iluminadas dos blocos se sombreiam sozinhas (acne)
    this.dirLight.shadow.normalBias = 0.05;
    this.scene.add(this.dirLight);
    // O alvo precisa estar na cena para acompanhar o jogador em update()
    this.scene.add(this.dirLight.target);

    // Sun Mesh (blocky billboard/cube)
    const sunGeo = new THREE.BoxGeometry(10, 10, 1);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xfff3a1, depthWrite: false });
    this.sunMesh = new THREE.Mesh(sunGeo, sunMat);
    this.scene.add(this.sunMesh);

    // Moon Mesh
    const moonGeo = new THREE.BoxGeometry(8, 8, 1);
    const moonMat = new THREE.MeshBasicMaterial({ color: 0xe2e8f0, depthWrite: false });
    this.moonMesh = new THREE.Mesh(moonGeo, moonMat);
    this.scene.add(this.moonMesh);

    // Voxel Clouds layer
    const cloudGeo = new THREE.PlaneGeometry(500, 500, 16, 16);
    const cloudMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.65,
      side: THREE.DoubleSide,
    });
    this.cloudsMesh = new THREE.Mesh(cloudGeo, cloudMat);
    this.cloudsMesh.rotation.x = Math.PI / 2;
    this.cloudsMesh.position.y = 44;
    this.scene.add(this.cloudsMesh);
  }

  public update(
    delta: number,
    playerPos: THREE.Vector3,
    weatherFactors?: {
      rainWeight: number;
      snowWeight: number;
      lightDimFactor: number;
      lightningIntensity: number;
    }
  ) {
    if (!this.isPaused) {
      this.timeOfDay = (this.timeOfDay + delta * this.cycleSpeed) % 1.0;
    }

    const rainWeight = weatherFactors?.rainWeight || 0;
    const snowWeight = weatherFactors?.snowWeight || 0;
    const lightDim = weatherFactors?.lightDimFactor !== undefined ? weatherFactors.lightDimFactor : 1.0;
    const lightning = weatherFactors?.lightningIntensity || 0;

    // Follow player for sun/clouds
    this.cloudsMesh.position.x = playerPos.x;
    this.cloudsMesh.position.z = playerPos.z;

    // Adjust clouds appearance during storms
    const cloudMat = this.cloudsMesh.material as THREE.MeshBasicMaterial;
    if (rainWeight > 0.05) {
      cloudMat.color.setRGB(
        1.0 - rainWeight * 0.55,
        1.0 - rainWeight * 0.55,
        1.0 - rainWeight * 0.5
      );
      cloudMat.opacity = 0.65 + rainWeight * 0.3;
    } else if (snowWeight > 0.05) {
      cloudMat.color.setRGB(0.95, 0.95, 1.0);
      cloudMat.opacity = 0.65 + snowWeight * 0.25;
    } else {
      cloudMat.color.setRGB(1, 1, 1);
      cloudMat.opacity = 0.65;
    }

    // Angle of sun in radians (0 to 2*PI)
    // O -0.5 poe o sol a pino em timeOfDay 0.5, que e o meio-dia segundo a
    // convencao usada no resto do jogo (0 = meia-noite). Sem ele o ciclo
    // ficava meio periodo fora de fase: escurecia ao meio-dia e clareava a
    // meia-noite, e todas as regras que dependem da hora liam o contrario.
    const angle = (this.timeOfDay - 0.5) * Math.PI * 2;
    const sunDistance = 140;

    const sunX = playerPos.x + Math.sin(angle) * sunDistance;
    const sunY = playerPos.y + Math.cos(angle) * sunDistance;
    const sunZ = playerPos.z + 20;

    this.sunMesh.position.set(sunX, sunY, sunZ);
    this.sunMesh.lookAt(playerPos);

    // Moon is opposite to Sun
    const moonX = playerPos.x - Math.sin(angle) * sunDistance;
    const moonY = playerPos.y - Math.cos(angle) * sunDistance;
    const moonZ = playerPos.z - 20;

    this.moonMesh.position.set(moonX, moonY, moonZ);
    this.moonMesh.lookAt(playerPos);

    // A sombra mira o jogador: parada na origem, ela sumia ao andar para longe do spawn
    this.dirLight.target.position.copy(playerPos);
    this.dirLight.target.updateMatrixWorld();

    // Position main light at active celestial body
    const isDay = Math.cos(angle) > 0;
    if (isDay) {
      this.dirLight.position.set(sunX, sunY, sunZ);
      this.dirLight.color.set(0xfffaed);
      this.dirLight.intensity = Math.max(0.15, Math.cos(angle) * 1.3) * lightDim;
    } else {
      this.dirLight.position.set(moonX, moonY, moonZ);
      this.dirLight.color.set(0x93c5fd);
      this.dirLight.intensity = Math.max(0.08, -Math.cos(angle) * 0.35) * lightDim;
    }

    // Lightning Flash Spike
    if (lightning > 0.05) {
      this.dirLight.intensity += lightning * 2.8;
      this.dirLight.color.set(0xe0f2fe);
      this.hemiLight.intensity += lightning * 2.5;
    }

    // Sky & Fog color transitions
    const currentSky = new THREE.Color();
    const currentFog = new THREE.Color();

    const sunElevation = Math.cos(angle); // 1 = noon, 0 = horizon, -1 = midnight

    if (sunElevation > 0.2) {
      // Full Day
      currentSky.copy(this.daySky);
      currentFog.copy(this.dayFog);
      this.hemiLight.intensity = 0.65 * lightDim;

      // Blend with rain or snow
      if (rainWeight > 0.01) {
        currentSky.lerp(this.rainDaySky, rainWeight * 0.85);
        currentFog.lerp(this.rainDayFog, rainWeight * 0.85);
      } else if (snowWeight > 0.01) {
        currentSky.lerp(this.snowDaySky, snowWeight * 0.8);
        currentFog.lerp(this.snowDayFog, snowWeight * 0.8);
      }
    } else if (sunElevation > -0.15) {
      // Sunrise / Sunset transition
      const t = (sunElevation + 0.15) / 0.35;
      currentSky.lerpColors(this.sunsetSky, this.daySky, t);
      currentFog.lerpColors(this.sunsetFog, this.dayFog, t);
      this.hemiLight.intensity = 0.45 * lightDim;

      if (rainWeight > 0.01) {
        currentSky.lerp(this.rainDaySky, rainWeight * 0.75);
        currentFog.lerp(this.rainDayFog, rainWeight * 0.75);
      } else if (snowWeight > 0.01) {
        currentSky.lerp(this.snowDaySky, snowWeight * 0.7);
        currentFog.lerp(this.snowDayFog, snowWeight * 0.7);
      }
    } else {
      // Night
      const t = Math.max(0, (sunElevation + 0.5) / 0.35);
      currentSky.lerpColors(this.nightSky, this.sunsetSky, t);
      currentFog.lerpColors(this.nightFog, this.sunsetFog, t);
      this.hemiLight.intensity = 0.2 * lightDim;

      if (rainWeight > 0.01) {
        currentSky.lerp(this.rainNightSky, rainWeight * 0.85);
        currentFog.lerp(this.rainNightFog, rainWeight * 0.85);
      } else if (snowWeight > 0.01) {
        currentSky.lerp(this.snowNightSky, snowWeight * 0.8);
        currentFog.lerp(this.snowNightFog, snowWeight * 0.8);
      }
    }

    // Apply lightning flash to skybox
    if (lightning > 0.05) {
      currentSky.lerp(new THREE.Color('#dbeafe'), lightning * 0.9);
      currentFog.lerp(new THREE.Color('#bfdbfe'), lightning * 0.9);
    }

    this.scene.background = currentSky;

    if (this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.color.copy(currentFog);
      // Increase fog density during rain and snow (visibility drops in storms)
      const fogMultiplier = 1.0 + rainWeight * 0.65 + snowWeight * 0.45;
      this.scene.fog.density = this.baseFogDensity * fogMultiplier;
    }
  }

  public setFogDistance(chunkRadius: number) {
    this.baseFogDensity = 1 / (chunkRadius * 16 * 1.5);
    if (this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.density = this.baseFogDensity;
    }
  }
}
