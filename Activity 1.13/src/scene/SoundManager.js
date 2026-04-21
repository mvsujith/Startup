/**
 * SoundManager.js
 *
 * Synthesised sound effects using the Web Audio API.
 * No audio files are needed — all sounds are generated mathematically.
 * Gracefully no-ops if Web Audio is unavailable.
 */

export class SoundManager {
  constructor() {
    this._ctx = null;
    this.enabled = true;
    this._init();
  }

  _init() {
    try {
      this._ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch {
      console.warn('[SoundManager] Web Audio API not available — sounds disabled.');
    }
  }

  /** Resume context after a user gesture (required by browsers). */
  resume() {
    this._ctx?.resume();
  }

  // ── Low-level helpers ───────────────────────────────────────────────────────

  _osc(freq, type, start, duration, gain = 0.25, rampDown = true) {
    if (!this._ctx || !this.enabled) return;
    const ctx = this._ctx;
    const g   = ctx.createGain();
    const osc = ctx.createOscillator();
    osc.type      = type;
    osc.frequency.setValueAtTime(freq, start);
    g.gain.setValueAtTime(gain, start);
    if (rampDown) g.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + duration + 0.01);
  }

  _now() { return this._ctx?.currentTime ?? 0; }

  // ── Public sounds ───────────────────────────────────────────────────────────

  /** Soft water-drop plop */
  playDrop() {
    const t = this._now();
    this._osc(180, 'sine', t,       0.08, 0.30);
    this._osc(90,  'sine', t + 0.05, 0.15, 0.15);
  }

  /** Rising chime for a correct answer */
  playCorrect() {
    const t = this._now();
    [523, 659, 784].forEach((f, i) => this._osc(f, 'sine', t + i * 0.12, 0.25, 0.22));
  }

  /** Thud for a wrong answer */
  playWrong() {
    const t = this._now();
    this._osc(200, 'sawtooth', t,        0.12, 0.15);
    this._osc(150, 'sawtooth', t + 0.06, 0.18, 0.12);
  }

  /** Triumphant 5-note fanfare for experiment completion */
  playComplete() {
    const t = this._now();
    [523, 659, 784, 1047, 1319].forEach((f, i) =>
      this._osc(f, 'sine', t + i * 0.14, 0.30, 0.20),
    );
  }

  /** Sparkle badge sound */
  playBadge() {
    const t = this._now();
    [1047, 1319, 1568, 2093].forEach((f, i) =>
      this._osc(f, 'sine', t + i * 0.08, 0.18, 0.18),
    );
  }

  /** Subtle tick for step advance */
  playTick() {
    const t = this._now();
    this._osc(880, 'sine', t, 0.06, 0.08);
  }

  /** Soft star-unlock shimmer */
  playStar() {
    const t = this._now();
    [1047, 1245, 1568].forEach((f, i) =>
      this._osc(f, 'triangle', t + i * 0.10, 0.22, 0.16),
    );
  }
}
