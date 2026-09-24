import * as THREE from 'three';
import { sound } from './audio';

export type WeatherType = 'clear' | 'rain' | 'snow';

export class WeatherSystem {
  public scene: THREE.Scene;
  public currentWeather: WeatherType = 'clear';
  public targetWeather: WeatherType = 'clear';
  public transitionProgress: number = 1.0; // 0 = start of transition, 1 = fully transitioned
  public transitionDuration: number = 4.0; // seconds

  public isAuto: boolean = true;
  private weatherTimer: number = 0;
  private nextWeatherDuration: number = 90; // random change every 60-150s

  // Thunder / Lightning
  private thunderTimer: number = 0;
  private nextThunderTime: number = 15;
  public lightningFlash: number = 0; // 0 to 1 intensity spike

  // Rain Particles
  private rainCount = 2800;
  private rainGeometry!: THREE.BufferGeometry;
  private rainPoints!: THREE.Points;
  private rainPositions!: Float32Array;
  private rainVelocities!: Float32Array;
  private rainMaterial!: THREE.PointsMaterial;

  // Snow Particles
  private snowCount = 2200;
  private snowGeometry!: THREE.BufferGeometry;
  private snowPoints!: THREE.Points;
  private snowPositions!: Float32Array;
  private snowVelocities!: Float32Array;
  private snowPhases!: Float32Array;
  private snowMaterial!: THREE.PointsMaterial;

  // Area bounds around player
  private readonly boxRadius = 32;
  private readonly boxHeight = 36;

  // Callback when weather changes for chat notifications
  public onWeatherChanged?: (type: WeatherType) => void;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.initRain();
    this.initSnow();
  }

  // Create procedural textures for rain streaks and soft snowflakes
  private createRainDropTexture(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;

    const grad = ctx.createLinearGradient(8, 0, 8, 64);
    grad.addColorStop(0, 'rgba(180, 220, 255, 0.0)');
    grad.addColorStop(0.3, 'rgba(195, 230, 255, 0.4)');
    grad.addColorStop(0.9, 'rgba(230, 245, 255, 0.95)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 1.0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(8, 32, 3, 30, 0, 0, Math.PI * 2);
    ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    return texture;
  }

  private createSnowFlakeTexture(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d')!;

    const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 15);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
    grad.addColorStop(0.4, 'rgba(240, 248, 255, 0.85)');
    grad.addColorStop(0.8, 'rgba(220, 238, 255, 0.3)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0.0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(16, 16, 14, 0, Math.PI * 2);
    ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    return texture;
  }

  private initRain() {
    this.rainGeometry = new THREE.BufferGeometry();
    this.rainPositions = new Float32Array(this.rainCount * 3);
    this.rainVelocities = new Float32Array(this.rainCount);

    for (let i = 0; i < this.rainCount; i++) {
      const idx = i * 3;
      this.rainPositions[idx] = (Math.random() - 0.5) * this.boxRadius * 2;
      this.rainPositions[idx + 1] = Math.random() * this.boxHeight;
      this.rainPositions[idx + 2] = (Math.random() - 0.5) * this.boxRadius * 2;
      this.rainVelocities[i] = 30 + Math.random() * 12; // fast fall speed
    }

    this.rainGeometry.setAttribute('position', new THREE.BufferAttribute(this.rainPositions, 3));

    this.rainMaterial = new THREE.PointsMaterial({
      size: 0.9,
      map: this.createRainDropTexture(),
      transparent: true,
      opacity: 0,
      blending: THREE.NormalBlending,
      depthWrite: false,
      color: 0xcde8ff,
    });

    this.rainPoints = new THREE.Points(this.rainGeometry, this.rainMaterial);
    this.rainPoints.frustumCulled = false;
    this.scene.add(this.rainPoints);
  }

  private initSnow() {
    this.snowGeometry = new THREE.BufferGeometry();
    this.snowPositions = new Float32Array(this.snowCount * 3);
    this.snowVelocities = new Float32Array(this.snowCount);
    this.snowPhases = new Float32Array(this.snowCount);

    for (let i = 0; i < this.snowCount; i++) {
      const idx = i * 3;
      this.snowPositions[idx] = (Math.random() - 0.5) * this.boxRadius * 2;
      this.snowPositions[idx + 1] = Math.random() * this.boxHeight;
      this.snowPositions[idx + 2] = (Math.random() - 0.5) * this.boxRadius * 2;
      this.snowVelocities[i] = 2.8 + Math.random() * 2.2; // gentle flutter speed
      this.snowPhases[i] = Math.random() * Math.PI * 2;
    }

    this.snowGeometry.setAttribute('position', new THREE.BufferAttribute(this.snowPositions, 3));

    this.snowMaterial = new THREE.PointsMaterial({
      size: 0.7,
      map: this.createSnowFlakeTexture(),
      transparent: true,
      opacity: 0,
      blending: THREE.NormalBlending,
      depthWrite: false,
      color: 0xffffff,
    });

    this.snowPoints = new THREE.Points(this.snowGeometry, this.snowMaterial);
    this.snowPoints.frustumCulled = false;
    this.scene.add(this.snowPoints);
  }

  // Set or switch weather
  public setWeather(type: WeatherType, immediate: boolean = false) {
    if (this.targetWeather === type && !immediate) return;

    this.targetWeather = type;
    if (immediate) {
      this.currentWeather = type;
      this.transitionProgress = 1.0;
    } else {
      this.transitionProgress = 0.0;
    }

    if (this.onWeatherChanged) {
      this.onWeatherChanged(type);
    }
  }

  // Random automatic weather changes
  private updateWeatherCycle(delta: number, playerBiome?: number) {
    if (!this.isAuto) return;

    this.weatherTimer += delta;
    if (this.weatherTimer >= this.nextWeatherDuration) {
      this.weatherTimer = 0;
      this.nextWeatherDuration = 70 + Math.random() * 90; // 70 to 160 seconds per cycle

      // Determine next weather state
      const rand = Math.random();
      let nextType: WeatherType = 'clear';

      if (playerBiome !== undefined && playerBiome > 0.25) {
        // High mountain / cold region favors snow
        if (rand < 0.45) nextType = 'snow';
        else if (rand < 0.7) nextType = 'rain';
        else nextType = 'clear';
      } else if (playerBiome !== undefined && playerBiome < -0.25) {
        // Desert region has rare rain, no snow
        if (rand < 0.2) nextType = 'rain';
        else nextType = 'clear';
      } else {
        // Temperate plains & forests
        if (rand < 0.45) nextType = 'clear';
        else if (rand < 0.8) nextType = 'rain';
        else nextType = 'snow';
      }

      this.setWeather(nextType);
    }
  }

  // Update weather particles, sky, fog, sounds
  public update(delta: number, playerPos: THREE.Vector3, playerBiome?: number) {
    this.updateWeatherCycle(delta, playerBiome);

    // Weather transition interpolation
    if (this.transitionProgress < 1.0) {
      this.transitionProgress = Math.min(1.0, this.transitionProgress + delta / this.transitionDuration);
      if (this.transitionProgress >= 1.0) {
        this.currentWeather = this.targetWeather;
      }
    }

    // Compute current intensity (0.0 to 1.0) for each weather type
    let rainIntensity = 0;
    let snowIntensity = 0;

    const fromRain = this.currentWeather === 'rain' ? 1 : 0;
    const toRain = this.targetWeather === 'rain' ? 1 : 0;
    rainIntensity = THREE.MathUtils.lerp(fromRain, toRain, this.transitionProgress);

    const fromSnow = this.currentWeather === 'snow' ? 1 : 0;
    const toSnow = this.targetWeather === 'snow' ? 1 : 0;
    snowIntensity = THREE.MathUtils.lerp(fromSnow, toSnow, this.transitionProgress);

    // Update particle opacity
    this.rainMaterial.opacity = rainIntensity * 0.85;
    this.snowMaterial.opacity = snowIntensity * 0.95;

    // Update sound effects
    if (rainIntensity > 0.01) {
      sound.updateWeatherSound('rain', rainIntensity);
    } else if (snowIntensity > 0.01) {
      sound.updateWeatherSound('snow', snowIntensity);
    } else {
      sound.updateWeatherSound('clear', 0);
    }

    // Thunder & Lightning simulation during rain storms
    if (rainIntensity > 0.4) {
      this.thunderTimer += delta;
      if (this.thunderTimer >= this.nextThunderTime) {
        this.thunderTimer = 0;
        this.nextThunderTime = 16 + Math.random() * 22; // 16-38s between thunderclaps
        this.triggerThunder();
      }
    }

    // Fade lightning flash spike
    if (this.lightningFlash > 0) {
      this.lightningFlash = Math.max(0, this.lightningFlash - delta * 4.5);
    }

    const time = performance.now() * 0.001;

    // Update Rain Particles around player
    if (rainIntensity > 0.01) {
      const posAttr = this.rainGeometry.attributes.position as THREE.BufferAttribute;
      const positions = posAttr.array as Float32Array;

      // Wind sway
      const windX = 1.8;
      const windZ = 0.8;

      for (let i = 0; i < this.rainCount; i++) {
        const idx = i * 3;
        const v = this.rainVelocities[i];

        positions[idx] += windX * delta;
        positions[idx + 1] -= v * delta;
        positions[idx + 2] += windZ * delta;

        // Wrap around player cylinder
        const relX = positions[idx] - playerPos.x;
        const relY = positions[idx + 1] - playerPos.y;
        const relZ = positions[idx + 2] - playerPos.z;

        if (relY < -6) {
          positions[idx + 1] = playerPos.y + this.boxHeight - 4;
          positions[idx] = playerPos.x + (Math.random() - 0.5) * this.boxRadius * 2;
          positions[idx + 2] = playerPos.z + (Math.random() - 0.5) * this.boxRadius * 2;
        } else {
          if (relX > this.boxRadius) positions[idx] -= this.boxRadius * 2;
          if (relX < -this.boxRadius) positions[idx] += this.boxRadius * 2;
          if (relZ > this.boxRadius) positions[idx + 2] -= this.boxRadius * 2;
          if (relZ < -this.boxRadius) positions[idx + 2] += this.boxRadius * 2;
        }
      }
      posAttr.needsUpdate = true;
    }

    // Update Snow Particles around player
    if (snowIntensity > 0.01) {
      const posAttr = this.snowGeometry.attributes.position as THREE.BufferAttribute;
      const positions = posAttr.array as Float32Array;

      for (let i = 0; i < this.snowCount; i++) {
        const idx = i * 3;
        const v = this.snowVelocities[i];
        const phase = this.snowPhases[i];

        // Soft sinusoidal fluttering drift
        const flutterX = Math.sin(time * 1.6 + phase) * 0.9;
        const flutterZ = Math.cos(time * 1.3 + phase) * 0.9;

        positions[idx] += (flutterX + 0.5) * delta;
        positions[idx + 1] -= v * delta;
        positions[idx + 2] += (flutterZ + 0.3) * delta;

        const relX = positions[idx] - playerPos.x;
        const relY = positions[idx + 1] - playerPos.y;
        const relZ = positions[idx + 2] - playerPos.z;

        if (relY < -6) {
          positions[idx + 1] = playerPos.y + this.boxHeight - 4;
          positions[idx] = playerPos.x + (Math.random() - 0.5) * this.boxRadius * 2;
          positions[idx + 2] = playerPos.z + (Math.random() - 0.5) * this.boxRadius * 2;
        } else {
          if (relX > this.boxRadius) positions[idx] -= this.boxRadius * 2;
          if (relX < -this.boxRadius) positions[idx] += this.boxRadius * 2;
          if (relZ > this.boxRadius) positions[idx + 2] -= this.boxRadius * 2;
          if (relZ < -this.boxRadius) positions[idx + 2] += this.boxRadius * 2;
        }
      }
      posAttr.needsUpdate = true;
    }
  }

  public triggerThunder() {
    this.lightningFlash = 1.0;
    // Delayed rumble (0.2s after flash for natural thunder delay)
    setTimeout(() => {
      sound.playThunder();
    }, 200);
  }

  // Get current weather blend factors for environment sky/fog adjustments
  public getWeatherFactors(): {
    rainWeight: number;
    snowWeight: number;
    lightDimFactor: number;
    lightningIntensity: number;
  } {
    const fromRain = this.currentWeather === 'rain' ? 1 : 0;
    const toRain = this.targetWeather === 'rain' ? 1 : 0;
    const rainWeight = THREE.MathUtils.lerp(fromRain, toRain, this.transitionProgress);

    const fromSnow = this.currentWeather === 'snow' ? 1 : 0;
    const toSnow = this.targetWeather === 'snow' ? 1 : 0;
    const snowWeight = THREE.MathUtils.lerp(fromSnow, toSnow, this.transitionProgress);

    // Dim ambient & sun light during storms
    const overcast = Math.max(rainWeight * 0.65, snowWeight * 0.35);
    const lightDimFactor = 1.0 - overcast;

    return {
      rainWeight,
      snowWeight,
      lightDimFactor,
      lightningIntensity: this.lightningFlash,
    };
  }

  public dispose() {
    this.scene.remove(this.rainPoints);
    this.scene.remove(this.snowPoints);
    this.rainGeometry.dispose();
    this.snowGeometry.dispose();
    this.rainMaterial.dispose();
    this.snowMaterial.dispose();
  }
}
