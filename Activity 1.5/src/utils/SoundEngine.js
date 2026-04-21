/**
 * SoundEngine.js — Phase 3: Synthesized Audio Feedback
 * Optimized for clear audibility and browser compatibility.
 */

export class SoundEngine {
  constructor() {
    this._ac = null;
    this._master = null;
  }

  _ctx() {
    if (!this._ac) {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        this._ac = new AudioCtx();
        // Master gain for volume control
        this._master = this._ac.createGain();
        this._master.gain.value = 1.0; 
        this._master.connect(this._ac.destination);
      } catch (e) {
        console.warn('SoundEngine: Failed to create AudioContext', e);
        return null;
      }
    }
    if (this._ac.state === 'suspended') {
      this._ac.resume();
    }
    return this._ac;
  }

  /** Explicitly unlock audio on user gesture */
  unlock() {
    this._ctx();
  }

  /** Short click for every button press */
  tick() { this._tone(900, 'sine', 0.15, 0.055); }

  /** Crystal hitting water surface */
  plop() {
    const ac = this._ctx(); if (!ac) return;
    const o = ac.createOscillator(), g = ac.createGain();
    o.connect(g); g.connect(this._master);
    o.type = 'sine';
    o.frequency.setValueAtTime(320, ac.currentTime);
    o.frequency.exponentialRampToValueAtTime(65, ac.currentTime + 0.38);
    g.gain.setValueAtTime(0.60, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.42);
    o.start(ac.currentTime); o.stop(ac.currentTime + 0.45);
  }

  /** Correct answer — ascending musical arpeggio */
  correct() {
    [523, 659, 784, 1047].forEach((f, i) => this._tone(f, 'sine', 0.25, 0.20, i * 0.085));
  }

  /** Wrong answer — low buzz */
  wrong() { this._tone(110, 'square', 0.18, 0.30); }

  /** Screen transition whoosh */
  whoosh() {
    const ac = this._ctx(); if (!ac) return;
    const buf = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.28), ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = ac.createBufferSource(); src.buffer = buf;
    const flt = ac.createBiquadFilter(); flt.type = 'bandpass';
    flt.frequency.setValueAtTime(280, ac.currentTime);
    flt.frequency.exponentialRampToValueAtTime(3200, ac.currentTime + 0.28);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.30, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.28);
    src.connect(flt); flt.connect(g); g.connect(this._master);
    src.start(); src.stop(ac.currentTime + 0.32);
  }

  /** Experiment complete — triumphant fanfare */
  success() {
    [[523,0],[659,0.10],[784,0.20],[1047,0.32],[880,0.46],[1047,0.58]]
      .forEach(([f,t]) => this._tone(f, 'triangle', 0.35, 0.30, t));
  }

  /** Badge awarded — short chime */
  badge() {
    [784, 1047, 1319].forEach((f, i) => this._tone(f, 'sine', 0.20, 0.22, i * 0.11));
  }

  _tone(freq, type, amp, dur, delay = 0) {
    const ac = this._ctx(); if (!ac) return;
    const o = ac.createOscillator(), g = ac.createGain();
    o.connect(g); g.connect(this._master);
    o.type = type; o.frequency.setValueAtTime(freq, ac.currentTime + delay);
    const t = ac.currentTime + delay;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(amp, t + 0.014);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.start(t); o.stop(t + dur + 0.02);
  }

  dispose() { if (this._ac) { this._ac.close(); this._ac = null; } }
}
