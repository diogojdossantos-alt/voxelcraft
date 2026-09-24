// Seedable Fast Simplex / Perlin Noise Generator

export class SeededNoise {
  private perm: Uint8Array;
  private grad3: Float32Array;

  constructor(seed: number = 1337) {
    this.perm = new Uint8Array(512);
    this.grad3 = new Float32Array([
      1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0,
      1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, -1,
      0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1,
    ]);

    // Mulberry32 PRNG to initialize permutation table
    let s = Math.floor(Math.abs(seed)) || 1337;
    const rng = () => {
      s |= 0;
      s = (s + 0x6d2b79f5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };

    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;

    // Shuffle
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const tmp = p[i];
      p[i] = p[j];
      p[j] = tmp;
    }

    for (let i = 0; i < 512; i++) {
      this.perm[i] = p[i & 255];
    }
  }

  private fade(t: number) {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private lerp(a: number, b: number, t: number) {
    return a + t * (b - a);
  }

  private grad2D(hash: number, x: number, y: number): number {
    const h = hash & 7;
    const u = h < 4 ? x : y;
    const v = h < 4 ? y : x;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  private grad3D(hash: number, x: number, y: number, z: number): number {
    const h = hash % 12;
    const gi = h * 3;
    return this.grad3[gi] * x + this.grad3[gi + 1] * y + this.grad3[gi + 2] * z;
  }

  public noise2D(x: number, y: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;

    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);

    const u = this.fade(xf);
    const v = this.fade(yf);

    const A = this.perm[X] + Y;
    const B = this.perm[X + 1] + Y;

    const g00 = this.grad2D(this.perm[A], xf, yf);
    const g10 = this.grad2D(this.perm[B], xf - 1, yf);
    const g01 = this.grad2D(this.perm[A + 1], xf, yf - 1);
    const g11 = this.grad2D(this.perm[B + 1], xf - 1, yf - 1);

    const x1 = this.lerp(g00, g10, u);
    const x2 = this.lerp(g01, g11, u);

    return this.lerp(x1, x2, v); // returns approx [-1, 1]
  }

  public noise3D(x: number, y: number, z: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const Z = Math.floor(z) & 255;

    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    const zf = z - Math.floor(z);

    const u = this.fade(xf);
    const v = this.fade(yf);
    const w = this.fade(zf);

    const A = this.perm[X] + Y;
    const AA = this.perm[A] + Z;
    const AB = this.perm[A + 1] + Z;
    const B = this.perm[X + 1] + Y;
    const BA = this.perm[B] + Z;
    const BB = this.perm[B + 1] + Z;

    const g000 = this.grad3D(this.perm[AA], xf, yf, zf);
    const g100 = this.grad3D(this.perm[BA], xf - 1, yf, zf);
    const g010 = this.grad3D(this.perm[AB], xf, yf - 1, zf);
    const g110 = this.grad3D(this.perm[BB], xf - 1, yf - 1, zf);
    const g001 = this.grad3D(this.perm[AA + 1], xf, yf, zf - 1);
    const g101 = this.grad3D(this.perm[BA + 1], xf - 1, yf, zf - 1);
    const g011 = this.grad3D(this.perm[AB + 1], xf, yf - 1, zf - 1);
    const g111 = this.grad3D(this.perm[BB + 1], xf - 1, yf - 1, zf - 1);

    const x1 = this.lerp(g000, g100, u);
    const x2 = this.lerp(g010, g110, u);
    const y1 = this.lerp(x1, x2, v);

    const x3 = this.lerp(g001, g101, u);
    const x4 = this.lerp(g011, g111, u);
    const y2 = this.lerp(x3, x4, v);

    return this.lerp(y1, y2, w);
  }

  // Fractal Brownian Motion 2D (multi-octave noise)
  public fbm2D(x: number, y: number, octaves: number = 4, persistence: number = 0.5, lacunarity: number = 2.0): number {
    let total = 0;
    let freq = 1;
    let amp = 1;
    let maxAmp = 0;

    for (let i = 0; i < octaves; i++) {
      total += this.noise2D(x * freq, y * freq) * amp;
      maxAmp += amp;
      amp *= persistence;
      freq *= lacunarity;
    }

    return total / maxAmp;
  }

  // Fractal Brownian Motion 3D (for caves and 3D overhangs)
  public fbm3D(x: number, y: number, z: number, octaves: number = 3, persistence: number = 0.5): number {
    let total = 0;
    let freq = 1;
    let amp = 1;
    let maxAmp = 0;

    for (let i = 0; i < octaves; i++) {
      total += this.noise3D(x * freq, y * freq, z * freq) * amp;
      maxAmp += amp;
      amp *= persistence;
      freq *= 2.0;
    }

    return total / maxAmp;
  }
}
