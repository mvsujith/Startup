/**
 * SoundManager.js — Phase 3
 * Synthesized game sounds via Web Audio API.
 * Master gain boosted for clear audibility at all volumes.
 */

class SoundManager {
  constructor() { this.__ctx = null; this.__master = null; }

  // Returns AudioContext + wires up master gain + compressor once
  _ctx() {
    if (!this.__ctx) {
      this.__ctx = new (window.AudioContext || window.webkitAudioContext)();

      // Dynamics compressor prevents clipping on loud stacked tones
      const comp = this.__ctx.createDynamicsCompressor();
      comp.threshold.value = -12;
      comp.knee.value      =  6;
      comp.ratio.value     =  4;
      comp.attack.value    =  0.003;
      comp.release.value   =  0.15;

      // Master gain — set high so every tone is clearly audible
      this.__master = this.__ctx.createGain();
      this.__master.gain.value = 3.5;

      this.__master.connect(comp);
      comp.connect(this.__ctx.destination);
    }
    return this.__ctx;
  }

  _master() { this._ctx(); return this.__master; }

  // ── Core tone primitive ────────────────────────────────────────────────
  _tone(freq, dur, type = 'sine', vol = 0.55, delay = 0) {
    try {
      const ctx = this._ctx();
      const osc = ctx.createOscillator();
      const g   = ctx.createGain();
      osc.connect(g);
      g.connect(this._master());

      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
      g.gain.setValueAtTime(vol, ctx.currentTime + delay);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + dur);

      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + dur + 0.05);
    } catch (_) { /* autoplay policy — silent fail */ }
  }

  // ── Named sounds ──────────────────────────────────────────────────────

  /** Generic UI button click */
  playClick() { this._tone(520, 0.08, 'sine', 0.50); }

  /** Soft tick for selecting a prediction option */
  playSelect() { this._tone(660, 0.07, 'sine', 0.55); }

  /** Soft pop when a modal / overlay appears */
  playPop() {
    this._tone(580, 0.10, 'sine', 0.55);
    this._tone(860, 0.08, 'sine', 0.40, 0.07);
  }

  /** Energetic launch sound for "Start Experiment" */
  playStart() {
    this._tone(440, 0.13, 'sine', 0.60);
    this._tone(660, 0.14, 'sine', 0.60, 0.11);
    this._tone(880, 0.20, 'sine', 0.70, 0.23);
  }

  /** Short mechanical click at push start */
  playPush() { this._tone(200, 0.10, 'sawtooth', 0.45); }

  /**
   * Realistic air-release sound for the push animation.
   * Layered white-noise hiss + descending pressure-drop sine.
   * Duration matches the air-syringe compression animation (~3 s).
   */
  playAirRelease(duration = 3.0) {
    try {
      const ctx = this._ctx();

      // ── White-noise source ──────────────────────────────────────────
      const rate   = ctx.sampleRate;
      const buf    = ctx.createBuffer(1, rate, rate);
      const data   = buf.getChannelData(0);
      for (let i = 0; i < rate; i++) data[i] = Math.random() * 2 - 1;

      const noise  = ctx.createBufferSource();
      noise.buffer = buf;
      noise.loop   = true;

      // Bandpass centred on the "hiss" frequency range
      const bp = ctx.createBiquadFilter();
      bp.type            = 'bandpass';
      bp.frequency.value = 1200;
      bp.Q.value         = 0.30;   // lower Q = wider band = more energy passes through

      // Highpass: remove low rumble
      const hp = ctx.createBiquadFilter();
      hp.type            = 'highpass';
      hp.frequency.value = 200;

      // Gain envelope: fast attack → sustain → slow fade
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(0, ctx.currentTime);
      ng.gain.linearRampToValueAtTime(2.8, ctx.currentTime + 0.12);   // much louder
      ng.gain.setValueAtTime(2.5, ctx.currentTime + duration * 0.55);
      ng.gain.linearRampToValueAtTime(0,   ctx.currentTime + duration);

      noise.connect(bp); bp.connect(hp); hp.connect(ng); ng.connect(this._master());
      noise.start(ctx.currentTime);
      noise.stop(ctx.currentTime + duration + 0.1);

      // ── Pressure-drop tone ─────────────────────────────────────────
      // Low descending sine gives the "compressed gas escaping" feel
      const osc = ctx.createOscillator();
      const og  = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(180, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(45, ctx.currentTime + duration);
      og.gain.setValueAtTime(0.95, ctx.currentTime);
      og.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(og); og.connect(this._master());
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration + 0.1);

    } catch (_) {}
  }

  /** Cheerful ascending arpeggio — correct answer */
  playCorrect() {
    [523, 659, 784, 1047].forEach((f, i) => this._tone(f, 0.26, 'sine', 0.60, i * 0.10));
  }

  /** Descending buzzer — wrong answer */
  playWrong() {
    this._tone(280, 0.24, 'sawtooth', 0.55);
    this._tone(190, 0.24, 'sawtooth', 0.50, 0.15);
  }

  /** Sparkle arpeggio — badge earned */
  playBadge() {
    [784, 988, 1175, 1319].forEach((f, i) => this._tone(f, 0.20, 'sine', 0.55, i * 0.08));
  }

  /** Victory fanfare — score screen */
  playSuccess() {
    [523, 659, 784].forEach((f, i) => this._tone(f, 0.32, 'sine', 0.60, i * 0.12));
    this._tone(1047, 0.55, 'sine', 0.70, 0.42);
  }

  /** Soft double-tone — step advance */
  playStep() {
    this._tone(700, 0.10, 'sine', 0.50);
    this._tone(930, 0.10, 'sine', 0.45, 0.09);
  }

  /** Descending pair — reset / replay */
  playReset() {
    this._tone(440, 0.13, 'sine', 0.50);
    this._tone(330, 0.13, 'sine', 0.45, 0.12);
  }
}

export const soundManager = new SoundManager();
