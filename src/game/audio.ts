// Web Audio API procedural sound synthesizer for 8-bit / voxel sounds
import { SoundCategory } from './constants';

class SoundEngine {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;
  public volume: number = 0.4;

  private initCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public playHit(soundType: SoundCategory = 'stone') {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    if (soundType === 'grass' || soundType === 'sand' || soundType === 'wool') {
      // Noise burst
      this.playNoiseBurst(0.04, 300, 100);
      return;
    }

    const baseFreq = soundType === 'wood' ? 140 : soundType === 'glass' ? 600 : 180;
    osc.type = soundType === 'glass' ? 'sine' : 'triangle';
    osc.frequency.setValueAtTime(baseFreq + Math.random() * 40, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.08);

    gain.gain.setValueAtTime(this.volume * 0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.08);
  }

  public playBreak(soundType: SoundCategory = 'stone') {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    if (soundType === 'glass') {
      // Glass shatter chime
      [800, 1200, 1600, 2400].forEach((freq, i) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq + Math.random() * 200, t + i * 0.02);
        gain.gain.setValueAtTime(this.volume * 0.4, t + i * 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(t + i * 0.02);
        osc.stop(t + 0.15);
      });
      return;
    }

    // Crunchy noise burst
    this.playNoiseBurst(0.12, soundType === 'stone' ? 500 : 350, 60);
  }

  public playPlace(soundType: SoundCategory = 'stone') {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    const freq = soundType === 'wood' ? 180 : soundType === 'stone' ? 220 : 150;
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.09);

    gain.gain.setValueAtTime(this.volume * 0.6, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.09);
  }

  public playStep(soundType: SoundCategory = 'grass') {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    const base = soundType === 'wood' ? 120 : soundType === 'stone' ? 160 : 100;
    osc.frequency.setValueAtTime(base + Math.random() * 20, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.05);

    gain.gain.setValueAtTime(this.volume * 0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.05);
  }

  public playJump() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(280, t + 0.12);

    gain.gain.setValueAtTime(this.volume * 0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.12);
  }

  public playSplash() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;
    this.playNoiseBurst(0.2, 400, 150);
  }

  public playExplosion() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    // Low frequency rumble + noise
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(20, t + 0.8);

    gain.gain.setValueAtTime(this.volume * 0.9, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.8);

    this.playNoiseBurst(0.7, 800, 40);
  }

  public playCraftSuccess() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const notes = [440, 554.37, 659.25]; // A major chord
    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + idx * 0.06);

      gain.gain.setValueAtTime(this.volume * 0.3, t + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3 + idx * 0.06);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(t + idx * 0.06);
      osc.stop(t + 0.3 + idx * 0.06);
    });
  }

  private playNoiseBurst(duration: number, highCut: number, lowCut: number) {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = (highCut + lowCut) / 2;
    filter.Q.value = 1.0;

    const gain = this.ctx.createGain();
    const t = this.ctx.currentTime;
    gain.gain.setValueAtTime(this.volume * 0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(t);
  }

  // Weather Ambient Sound System
  private rainNoiseNode: AudioBufferSourceNode | null = null;
  private rainGain: GainNode | null = null;
  private snowNoiseNode: AudioBufferSourceNode | null = null;
  private snowGain: GainNode | null = null;
  private windLfo: OscillatorNode | null = null;
  private weatherInitialized: boolean = false;

  private initWeatherAudio() {
    if (!this.ctx || this.weatherInitialized) return;
    this.weatherInitialized = true;

    try {
      // 5-second looped noise buffer for ambient weather
      const sampleRate = this.ctx.sampleRate;
      const bufferSize = sampleRate * 4;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, sampleRate);
      const data = noiseBuffer.getChannelData(0);
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        // Pink-noise approximation
        data[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = data[i];
        data[i] *= 3.5;
      }

      // Rain sound chain
      this.rainNoiseNode = this.ctx.createBufferSource();
      this.rainNoiseNode.buffer = noiseBuffer;
      this.rainNoiseNode.loop = true;

      const rainFilter = this.ctx.createBiquadFilter();
      rainFilter.type = 'lowpass';
      rainFilter.frequency.value = 1800;

      this.rainGain = this.ctx.createGain();
      this.rainGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);

      this.rainNoiseNode.connect(rainFilter);
      rainFilter.connect(this.rainGain);
      this.rainGain.connect(this.ctx.destination);
      this.rainNoiseNode.start();

      // Snow/Winter wind sound chain
      this.snowNoiseNode = this.ctx.createBufferSource();
      this.snowNoiseNode.buffer = noiseBuffer;
      this.snowNoiseNode.loop = true;

      const snowFilter = this.ctx.createBiquadFilter();
      snowFilter.type = 'bandpass';
      snowFilter.frequency.value = 450;
      snowFilter.Q.value = 2.5;

      // LFO for fluctuating gusty wind
      this.windLfo = this.ctx.createOscillator();
      this.windLfo.frequency.value = 0.18; // Slow wind gusts
      const windLfoGain = this.ctx.createGain();
      windLfoGain.gain.value = 180;
      this.windLfo.connect(windLfoGain);
      windLfoGain.connect(snowFilter.frequency);
      this.windLfo.start();

      this.snowGain = this.ctx.createGain();
      this.snowGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);

      this.snowNoiseNode.connect(snowFilter);
      snowFilter.connect(this.snowGain);
      this.snowGain.connect(this.ctx.destination);
      this.snowNoiseNode.start();
    } catch (e) {
      console.warn('Weather audio init error:', e);
    }
  }

  public updateWeatherSound(weatherType: 'clear' | 'rain' | 'snow', intensity: number) {
    if (!this.enabled) {
      if (this.rainGain) this.rainGain.gain.setValueAtTime(0.0001, this.ctx?.currentTime || 0);
      if (this.snowGain) this.snowGain.gain.setValueAtTime(0.0001, this.ctx?.currentTime || 0);
      return;
    }
    this.initCtx();
    this.initWeatherAudio();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const targetRain = weatherType === 'rain' ? Math.max(0.0001, this.volume * intensity * 0.35) : 0.0001;
    const targetSnow = weatherType === 'snow' ? Math.max(0.0001, this.volume * intensity * 0.28) : 0.0001;

    if (this.rainGain) {
      this.rainGain.gain.setTargetAtTime(targetRain, t, 1.2);
    }
    if (this.snowGain) {
      this.snowGain.gain.setTargetAtTime(targetSnow, t, 1.2);
    }
  }

  public playThunder() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    // Initial sharp strike
    this.playNoiseBurst(0.25, 1200, 150);

    // Deep reverberating low-end thunder rumble
    const rumbleOsc = this.ctx.createOscillator();
    const rumbleGain = this.ctx.createGain();

    rumbleOsc.type = 'sawtooth';
    rumbleOsc.frequency.setValueAtTime(80, t + 0.05);
    rumbleOsc.frequency.exponentialRampToValueAtTime(25, t + 2.8);

    rumbleGain.gain.setValueAtTime(0.001, t);
    rumbleGain.gain.linearRampToValueAtTime(this.volume * 0.7, t + 0.15);
    rumbleGain.gain.exponentialRampToValueAtTime(0.001, t + 3.2);

    const rumbleFilter = this.ctx.createBiquadFilter();
    rumbleFilter.type = 'lowpass';
    rumbleFilter.frequency.setValueAtTime(200, t);
    rumbleFilter.frequency.exponentialRampToValueAtTime(60, t + 3.0);

    rumbleOsc.connect(rumbleFilter);
    rumbleFilter.connect(rumbleGain);
    rumbleGain.connect(this.ctx.destination);

    rumbleOsc.start(t);
    rumbleOsc.stop(t + 3.2);
  }

  // Hostile Entities & Combat Audio Effects
  public playZombieGroan() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const vibrato = this.ctx.createOscillator();
    const vibratoGain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    const baseFreq = 85 + Math.random() * 25;
    osc.frequency.setValueAtTime(baseFreq, t);
    osc.frequency.linearRampToValueAtTime(baseFreq * 0.75, t + 0.9);

    // Guttural vibrato
    vibrato.frequency.value = 6;
    vibratoGain.gain.value = 14;
    vibrato.connect(vibratoGain);
    vibratoGain.connect(osc.frequency);
    vibrato.start(t);
    vibrato.stop(t + 0.9);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, t);
    filter.frequency.linearRampToValueAtTime(250, t + 0.9);

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(this.volume * 0.45, t + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.9);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.9);
  }

  public playSkeletonRattle() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    // Series of snappy bone clicks
    const clicks = 3;
    for (let i = 0; i < clicks; i++) {
      const clickTime = t + i * 0.08 + Math.random() * 0.02;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600 + Math.random() * 300, clickTime);
      osc.frequency.exponentialRampToValueAtTime(150, clickTime + 0.04);

      gain.gain.setValueAtTime(this.volume * 0.35, clickTime);
      gain.gain.exponentialRampToValueAtTime(0.001, clickTime + 0.04);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(clickTime);
      osc.stop(clickTime + 0.04);
    }
  }

  public playBowShoot() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(550, t);
    osc.frequency.exponentialRampToValueAtTime(180, t + 0.14);

    gain.gain.setValueAtTime(this.volume * 0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.14);
    this.playNoiseBurst(0.06, 800, 300);
  }

  public playMobHurt() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(70, t + 0.12);

    gain.gain.setValueAtTime(this.volume * 0.6, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.12);
  }

  public playMobDeath() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.35);

    gain.gain.setValueAtTime(this.volume * 0.6, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.35);
    this.playNoiseBurst(0.2, 500, 80);
  }

  public playPlayerHurt() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    // Classic punch / "Oof!" grunt
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.exponentialRampToValueAtTime(65, t + 0.16);

    gain.gain.setValueAtTime(this.volume * 0.75, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.16);
  }

  public playPlayerDeath() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    [180, 140, 110, 80].forEach((f, idx) => {
      const noteTime = t + idx * 0.12;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f, noteTime);
      gain.gain.setValueAtTime(this.volume * 0.5, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.2);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(noteTime);
      osc.stop(noteTime + 0.2);
    });
  }
}

export const sound = new SoundEngine();
