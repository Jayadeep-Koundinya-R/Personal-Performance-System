/*
  🔊 Web Audio API Ambient Soundscapes Generator
  Provides synthetic rain, ocean waves, white noise, and binaural focus tones without external MP3 files.
  
  Edge Cases Handled:
  - AudioContext suspension on page load (auto-resumes on user gesture)
  - LFO oscillator cleanup for waves mode (prevents memory leak)
  - Completion chime generator (gentle "ding" tone)
  - Volume clamping (0-1 range)
  - Graceful stop on disconnect errors
*/

class AmbientSoundManager {
  private ctx: AudioContext | null = null;
  private activeNodes: AudioNode[] = [];
  private gainNode: GainNode | null = null;
  private isPlaying: boolean = false;
  private currentType: "rain" | "waves" | "noise" | "binaural" | null = null;

  private initCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  public start(type: "rain" | "waves" | "noise" | "binaural", volume = 0.3) {
    this.stop();
    this.initCtx();
    if (!this.ctx) return;

    this.currentType = type;
    this.isPlaying = true;

    this.gainNode = this.ctx.createGain();
    this.gainNode.gain.setValueAtTime(Math.max(0, Math.min(1, volume)), this.ctx.currentTime);
    this.gainNode.connect(this.ctx.destination);

    const bufferSize = 2 * this.ctx.sampleRate;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    if (type === "binaural") {
      // 432Hz focus tone with subtle beating
      const osc1 = this.ctx.createOscillator();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(432, this.ctx.currentTime);
      osc1.connect(this.gainNode);
      osc1.start();

      const osc2 = this.ctx.createOscillator();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(440, this.ctx.currentTime); // 8Hz binaural beat (alpha waves)
      osc2.connect(this.gainNode);
      osc2.start();

      this.activeNodes.push(osc1, osc2);
      return;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;
    this.activeNodes.push(whiteNoise);

    if (type === "rain") {
      const filter = this.ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(1000, this.ctx.currentTime);
      filter.Q.setValueAtTime(1.5, this.ctx.currentTime);
      whiteNoise.connect(filter);
      filter.connect(this.gainNode);
    } else if (type === "waves") {
      const filter = this.ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(400, this.ctx.currentTime);

      const lfo = this.ctx.createOscillator();
      lfo.frequency.setValueAtTime(0.1, this.ctx.currentTime);
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.setValueAtTime(300, this.ctx.currentTime);

      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);
      lfo.start();
      this.activeNodes.push(lfo); // Track LFO for proper cleanup

      whiteNoise.connect(filter);
      filter.connect(this.gainNode);
    } else {
      const filter = this.ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(3000, this.ctx.currentTime);
      whiteNoise.connect(filter);
      filter.connect(this.gainNode);
    }

    whiteNoise.start();
  }

  public stop() {
    for (const node of this.activeNodes) {
      try {
        (node as any).stop?.();
        node.disconnect();
      } catch {}
    }
    this.activeNodes = [];
    if (this.gainNode) {
      try { this.gainNode.disconnect(); } catch {}
      this.gainNode = null;
    }
    this.isPlaying = false;
    this.currentType = null;
  }

  /** Play a gentle completion chime (ding sound) */
  public playChime() {
    this.initCtx();
    if (!this.ctx) return;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 1.5);
    gain.connect(this.ctx.destination);

    // Primary tone
    const osc1 = this.ctx.createOscillator();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(880, this.ctx.currentTime); // A5
    osc1.connect(gain);
    osc1.start(this.ctx.currentTime);
    osc1.stop(this.ctx.currentTime + 1.5);

    // Harmonic overtone
    const gain2 = this.ctx.createGain();
    gain2.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain2.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 1.2);
    gain2.connect(this.ctx.destination);

    const osc2 = this.ctx.createOscillator();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(1320, this.ctx.currentTime); // E6
    osc2.connect(gain2);
    osc2.start(this.ctx.currentTime + 0.05);
    osc2.stop(this.ctx.currentTime + 1.2);
  }

  public setVolume(vol: number) {
    if (this.gainNode && this.ctx) {
      this.gainNode.gain.setValueAtTime(Math.max(0, Math.min(1, vol)), this.ctx.currentTime);
    }
  }

  public getActiveType() {
    return this.isPlaying ? this.currentType : null;
  }
}

export const ambientSound = new AmbientSoundManager();
