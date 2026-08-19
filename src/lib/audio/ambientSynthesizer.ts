/**
 * 🎧 PPS Ambient Soundscape Synthesizer
 * Uses native Web Audio API to generate procedural study soundscapes (zero assets/downloads required).
 */

export type AmbienceType = "none" | "rain" | "lofi" | "coffee" | "library";

class AmbientSynthesizer {
  private ctx: AudioContext | null = null;
  private currentType: AmbienceType = "none";
  private gainNode: GainNode | null = null;
  private nodes: (AudioNode | number)[] = [];
  private volume: number = 0.4;

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  public setVolume(val: number) {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.gainNode && this.ctx) {
      this.gainNode.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
  }

  public play(type: AmbienceType) {
    this.stop();
    if (type === "none") return;

    this.initContext();
    if (!this.ctx) return;

    this.currentType = type;
    this.gainNode = this.ctx.createGain();
    this.gainNode.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    this.gainNode.connect(this.ctx.destination);

    switch (type) {
      case "rain":
        this.createRainSound();
        break;
      case "lofi":
        this.createLoFiDrone();
        break;
      case "coffee":
        this.createCoffeeShopSound();
        break;
      case "library":
        this.createLibrarySound();
        break;
    }
  }

  public stop() {
    this.nodes.forEach((node) => {
      if (typeof node === "number") {
        clearInterval(node);
      } else if (node && "stop" in node && typeof (node as any).stop === "function") {
        try {
          (node as any).stop();
        } catch {}
      }
      try {
        if (node && "disconnect" in node && typeof (node as any).disconnect === "function") {
          (node as any).disconnect();
        }
      } catch {}
    });

    this.nodes = [];
    if (this.gainNode) {
      try {
        this.gainNode.disconnect();
      } catch {}
      this.gainNode = null;
    }
    this.currentType = "none";
  }

  public getCurrentType(): AmbienceType {
    return this.currentType;
  }

  // --- Procedural Generators ---

  private createRainSound() {
    if (!this.ctx || !this.gainNode) return;
    const bufferSize = 2 * this.ctx.sampleRate;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    // Pink noise formula for rain
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
      output[i] *= 0.08;
      b6 = white * 0.115926;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    // Filter to simulate soft raindrops
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(1000, this.ctx.currentTime);

    whiteNoise.connect(filter);
    filter.connect(this.gainNode);
    whiteNoise.start();

    this.nodes.push(whiteNoise, filter);
  }

  private createLoFiDrone() {
    if (!this.ctx || !this.gainNode) return;
    // Soothing 432Hz resonant harmonic chord (432Hz, 216Hz, 648Hz)
    const freqs = [216, 432, 648];

    freqs.forEach((freq, idx) => {
      if (!this.ctx || !this.gainNode) return;
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();

      osc.type = idx === 0 ? "sine" : "triangle";
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      oscGain.gain.setValueAtTime(0.08 / (idx + 1), this.ctx.currentTime);

      osc.connect(oscGain);
      oscGain.connect(this.gainNode);
      osc.start();

      this.nodes.push(osc, oscGain);
    });
  }

  private createCoffeeShopSound() {
    if (!this.ctx || !this.gainNode) return;
    // Low frequency Brownian murmur + soft resonance
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = output[i];
      output[i] *= 0.5;
    }

    const brownNoise = this.ctx.createBufferSource();
    brownNoise.buffer = noiseBuffer;
    brownNoise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(500, this.ctx.currentTime);
    filter.Q.setValueAtTime(1.5, this.ctx.currentTime);

    brownNoise.connect(filter);
    filter.connect(this.gainNode);
    brownNoise.start();

    this.nodes.push(brownNoise, filter);
  }

  private createLibrarySound() {
    if (!this.ctx || !this.gainNode) return;
    // Ultra soft lowpass room tone
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * 0.015;
    }

    const source = this.ctx.createBufferSource();
    source.buffer = noiseBuffer;
    source.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(350, this.ctx.currentTime);

    source.connect(filter);
    filter.connect(this.gainNode);
    source.start();

    this.nodes.push(source, filter);
  }
}

export const ambientAudio = new AmbientSynthesizer();
