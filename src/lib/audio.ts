/**
 * 🎵 Procedural Web Audio Engine for PPS & Agni 2.0
 * 
 * Generates pure synthesizer harmonic chimes directly via the Web Audio API:
 * - C-Major Harmonic Chime: Rich focus completion chord for deep work tasks.
 * - Pentatonic Sparkle: Uplifting arpeggio shimmer for vitality and health habits.
 * - Muted Wooden Click: Subtle transient click for 2-minute micro-habits.
 * - Resonant Rest Chime: Warm, calming frequency chord for logging rest days.
 * 
 * Works 100% offline with zero external audio assets or network requests.
 */

class WebAudioEngine {
  private ctx: AudioContext | null = null;

  private getAudioContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!this.ctx && AudioCtx) {
        this.ctx = new AudioCtx();
      }
      if (this.ctx && this.ctx.state === "suspended") {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  /**
   * C-Major Harmonic Chime (C4, E4, G4, C5)
   * Deep work and anchor habit completion.
   */
  public playDeepWorkChime(): void {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const frequencies = [261.63, 329.63, 392.0, 523.25]; // C4, E4, G4, C5

      frequencies.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + idx * 0.04);

        // Warm harmonics envelope
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.12 / (idx + 1), now + idx * 0.04 + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.04);
        osc.stop(now + 1.85);
      });
    } catch {}
  }

  /**
   * Pentatonic Sparkle Arpeggio (C5, D5, E5, G5, A5, C6)
   * Vitality, fitness, and health habit completion.
   */
  public playHealthSparkle(): void {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const notes = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5]; // C5 to C6 pentatonic

      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + i * 0.06);

        gain.gain.setValueAtTime(0.0001, now + i * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.15, now + i * 0.06 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.06 + 0.55);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + i * 0.06);
        osc.stop(now + i * 0.06 + 0.6);
      });
    } catch {}
  }

  /**
   * Muted Wooden Click
   * Minimal tactile feedback for 2-minute micro-habits.
   */
  public playMicroClick(): void {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.04);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.05);
    } catch {}
  }

  /**
   * Resonant Rest & Recovery Chime (F4, A4)
   * Warm, peaceful tone for logging intentional rest days.
   */
  public playRestRecoveryChime(): void {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const notes = [349.23, 440.0]; // F4, A4

      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.1, now + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 1.45);
      });
    } catch {}
  }
}

export const audioEngine = new WebAudioEngine();

/**
 * Universal habit audio dispatcher
 */
export function playHabitCompletionSound(
  type: "full" | "micro" | "rest" = "full",
  category?: string
): void {
  if (type === "rest") {
    audioEngine.playRestRecoveryChime();
    return;
  }
  if (type === "micro") {
    audioEngine.playMicroClick();
    return;
  }

  const cat = (category || "").toLowerCase();
  if (cat.includes("health") || cat.includes("fit") || cat.includes("walk") || cat.includes("gym")) {
    audioEngine.playHealthSparkle();
  } else {
    audioEngine.playDeepWorkChime();
  }
}
