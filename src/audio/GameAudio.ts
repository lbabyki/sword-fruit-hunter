/** Lightweight synthesized game SFX. No network assets, decoding, or timers are required. */
export type SoundEffect = 'fruit' | 'bomb' | 'button';

export class GameAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private unlocked = false;
  private enabled: boolean;
  private disposed = false;

  constructor(enabled = true) { this.enabled = enabled; }

  setEnabled(value: boolean): void { this.enabled = value; }
  get isEnabled(): boolean { return this.enabled; }

  /** Invoke synchronously from a real button click / pointer interaction. */
  unlock(): void {
    if (!this.enabled || this.disposed) return;
    this.unlocked = true;
    if (!this.context) {
      try {
        const AudioCtor = globalThis.AudioContext;
        if (!AudioCtor) return;
        const ctx = new AudioCtor();
        const master = ctx.createGain();
        master.gain.value = 0.27;
        master.connect(ctx.destination);
        this.context = ctx;
        this.master = master;
      } catch { return; }
    }
    if (this.context?.state === 'suspended') void this.context.resume().catch(() => {});
  }

  /** Audio is generated in-place with native Web Audio and never waits for a fetch. */
  play(effect: SoundEffect): void {
    if (!this.enabled || !this.unlocked || this.disposed || !this.context || !this.master) return;
    try {
      const ctx = this.context;
      const now = ctx.currentTime;
      switch (effect) {
        case 'button':
          this.tone(ctx, now, 620, 400, 0.064, 0.17, 'sine');
          break;
        case 'fruit':
          this.noiseBurst(ctx, now, 0.16, 0.22, 'highpass', 980);
          this.tone(ctx, now, 770, 1120, 0.12, 0.14, 'triangle');
          break;
        case 'bomb':
          // Two bright, inharmonic clangs give the bomb hit a "keng-keng" character.
          this.noiseBurst(ctx, now, 0.075, 0.19, 'highpass', 1450);
          this.tone(ctx, now, 1320, 860, 0.25, 0.23, 'sine');
          this.tone(ctx, now, 1940, 1280, 0.20, 0.15, 'triangle');
          this.tone(ctx, now, 2680, 1720, 0.15, 0.08, 'sine');
          this.noiseBurst(ctx, now + 0.105, 0.07, 0.12, 'highpass', 1650);
          this.tone(ctx, now + 0.105, 1120, 720, 0.22, 0.16, 'sine');
          this.tone(ctx, now + 0.105, 1680, 1080, 0.17, 0.10, 'triangle');
          this.tone(ctx, now + 0.105, 2320, 1480, 0.13, 0.055, 'sine');
          break;
      }
    } catch { /* Browsers may refuse audio while switching devices/tabs. Never block gameplay. */ }
  }

  private tone(ctx: AudioContext, when: number, startHz: number, endHz: number, seconds: number, amplitude: number, type: OscillatorType): void {
    if (!this.master) return;
    const oscillator = ctx.createOscillator();
    const envelope = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(startHz, when);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endHz), when + seconds);
    envelope.gain.setValueAtTime(0.0001, when);
    envelope.gain.linearRampToValueAtTime(amplitude, when + 0.008);
    envelope.gain.exponentialRampToValueAtTime(0.0001, when + seconds);
    oscillator.connect(envelope);
    envelope.connect(this.master);
    oscillator.start(when);
    oscillator.stop(when + seconds + 0.01);
  }

  private noiseBurst(ctx: AudioContext, when: number, seconds: number, amplitude: number, filterType: BiquadFilterType, cutoff: number): void {
    if (!this.master) return;
    // Allocate this small noise buffer once and reuse it for every hit.
    if (!this.noise) {
      const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * 0.5), ctx.sampleRate);
      const samples = buffer.getChannelData(0);
      // Deterministic pseudo-noise, avoiding dependency on Math.random in the game loop.
      let seed = 1976;
      for (let i = 0; i < samples.length; i++) {
        seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
        samples[i] = (seed / 2147483648);
      }
      this.noise = buffer;
    }
    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const envelope = ctx.createGain();
    source.buffer = this.noise;
    filter.type = filterType;
    filter.frequency.value = cutoff;
    envelope.gain.setValueAtTime(0.0001, when);
    envelope.gain.linearRampToValueAtTime(amplitude, when + 0.008);
    envelope.gain.exponentialRampToValueAtTime(0.0001, when + seconds);
    source.connect(filter);
    filter.connect(envelope);
    envelope.connect(this.master);
    source.start(when);
    source.stop(when + seconds);
  }

  dispose(): void {
    this.disposed = true;
    if (this.context) void this.context.close().catch(() => {});
    this.context = null;
    this.noise = null;
    this.master = null;
  }
}
