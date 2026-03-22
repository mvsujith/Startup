/**
 * sounds.js — Web Audio API sound effects (no external files needed)
 * All sounds pass through a master gain + dynamics compressor to avoid clipping.
 */

let _ctx = null;
let _master = null;

function getOutput() {
  if (!_ctx) {
    _ctx = new (window.AudioContext || window.webkitAudioContext)();
    // Dynamics compressor prevents clipping when boosting volume
    const comp = _ctx.createDynamicsCompressor();
    comp.threshold.value = -6;
    comp.knee.value      = 8;
    comp.ratio.value     = 4;
    comp.attack.value    = 0.003;
    comp.release.value   = 0.25;
    _master = _ctx.createGain();
    _master.gain.value   = 2.8;   // ← master volume boost
    _master.connect(comp);
    comp.connect(_ctx.destination);
  }
  return _master;
}

function tone(freq, dur, type = "sine", vol = 0.55, delay = 0) {
  try {
    const ctx  = _ctx || (getOutput(), _ctx);
    const out  = getOutput();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(out);
    osc.frequency.value = freq;
    osc.type = type;
    const t = ctx.currentTime + delay;
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.start(t);
    osc.stop(t + dur + 0.01);
  } catch (_) {}
}

/**
 * Realistic heavy impact thud — four layered components.
 * intensity: 0.5 (soft drop) → 1.0 (full fall from 8 m)
 */
function impactThud(intensity = 1.0) {
  try {
    const ctx = _ctx || (getOutput(), _ctx);
    const out = getOutput();
    const now = ctx.currentTime;

    // ── 1. Sub-bass punch (80 → 30 Hz pitch drop) ────────────────────
    const subOsc  = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.connect(subGain); subGain.connect(out);
    subOsc.type = "sine";
    subOsc.frequency.setValueAtTime(90 * intensity, now);
    subOsc.frequency.exponentialRampToValueAtTime(28, now + 0.14);
    subGain.gain.setValueAtTime(0, now);
    subGain.gain.linearRampToValueAtTime(1.4 * intensity, now + 0.003);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.75);
    subOsc.start(now); subOsc.stop(now + 0.8);

    // ── 2. Low-pass filtered noise burst (thud crack) ────────────────
    const bufLen = Math.floor(ctx.sampleRate * 0.5);
    const buf    = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data   = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;
    const nSrc   = ctx.createBufferSource();
    nSrc.buffer  = buf;
    const lpf    = ctx.createBiquadFilter();
    lpf.type = "lowpass";
    lpf.frequency.setValueAtTime(500, now);
    lpf.frequency.exponentialRampToValueAtTime(80, now + 0.2);
    const nGain  = ctx.createGain();
    nGain.gain.setValueAtTime(0, now);
    nGain.gain.linearRampToValueAtTime(1.2 * intensity, now + 0.002);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    nSrc.connect(lpf); lpf.connect(nGain); nGain.connect(out);
    nSrc.start(now); nSrc.stop(now + 0.55);

    // ── 3. Mid-body thud (160 → 55 Hz) ───────────────────────────────
    const midOsc  = ctx.createOscillator();
    const midGain = ctx.createGain();
    midOsc.connect(midGain); midGain.connect(out);
    midOsc.type = "sine";
    midOsc.frequency.setValueAtTime(180, now);
    midOsc.frequency.exponentialRampToValueAtTime(52, now + 0.1);
    midGain.gain.setValueAtTime(0, now);
    midGain.gain.linearRampToValueAtTime(0.9 * intensity, now + 0.004);
    midGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    midOsc.start(now); midOsc.stop(now + 0.45);

    // ── 4. Sharp click transient ──────────────────────────────────────
    const cBuf   = ctx.createBuffer(1, 512, ctx.sampleRate);
    const cData  = cBuf.getChannelData(0);
    for (let i = 0; i < 512; i++) cData[i] = (Math.random()*2-1) * Math.exp(-i/18);
    const cSrc   = ctx.createBufferSource();
    cSrc.buffer  = cBuf;
    const cGain  = ctx.createGain();
    cGain.gain.value = 0.75 * intensity;
    cSrc.connect(cGain); cGain.connect(out);
    cSrc.start(now);

  } catch (_) {}
}

export const SFX = {
  lift:    () => { tone(880, 0.15, "sine", 0.5); tone(1047, 0.15, "sine", 0.4, 0.12); },
  land:    () => impactThud(1.0),
  click:   () =>   tone(660, 0.07, "sine", 0.35),
  wrong:   () => { tone(200, 0.25, "sawtooth", 0.7); tone(160, 0.35, "sine", 0.55, 0.15); },
  star1:   () =>   tone(523, 0.22, "sine", 0.65),
  star2:   () => { tone(523, 0.14, "sine", 0.65); tone(659, 0.2, "sine", 0.65, 0.15); },
  star3:   () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.2, "sine", 0.65, i * 0.12)); },
  badge:   () => { [784, 880, 1047, 1319].forEach((f, i) => tone(f, 0.22, "triangle", 0.6, i * 0.1)); },
  success: () => { [659, 784, 1047].forEach((f, i) => tone(f, 0.22, "sine", 0.65, i * 0.14)); },
  tick:    () =>   tone(1200, 0.05, "square", 0.25),
};
