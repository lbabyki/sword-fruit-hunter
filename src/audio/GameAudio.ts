/** Lightweight synthesized game SFX. No network assets, decoding, or timers are required. */
export type SoundEffect = 'fruit' | 'bomb' | 'button' | 'dash' | 'shield';

export class GameAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private unlocked = false;
  private enabled: boolean;
  private volume = 100;
  private disposed = false;

  constructor(enabled = true) { this.enabled = enabled; }

  setEnabled(value: boolean): void { this.enabled = value; }
  setVolume(percent:number):void { this.volume=Math.max(0,Math.min(100,Number.isFinite(percent)?percent:100));if(this.master)this.master.gain.value=.27*this.volume/100; }
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
        master.gain.value = .27*this.volume/100;
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
        case 'dash':
          this.noiseBurst(ctx, now, 0.12, 0.14, 'highpass', 1250);
          this.tone(ctx, now, 580, 1260, 0.20, 0.22, 'triangle');
          break;
        case 'shield':
          this.tone(ctx, now, 800, 400, 0.18, 0.20, 'sine');
          break;
        case 'bomb':
          this.noiseBurst(ctx, now, 0.42, 0.42, 'lowpass', 540);
          this.tone(ctx, now, 160, 43, 0.40, 0.48, 'sawtooth');
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
