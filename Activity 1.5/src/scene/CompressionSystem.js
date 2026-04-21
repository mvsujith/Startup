/**
 * CompressionSystem.js — Phase 2
 * Manages plunger compression physics + 3-D visual feedback for all three syringes.
 *
 * Science model
 *   air   → easily compressible  (plunger travels far, low force)
 *   water → nearly incompressible (barely moves, force spikes immediately)
 *   chalk → mostly incompressible (tiny movement between piece gaps)
 */
import * as THREE from 'three';

// ── Per-content parameters ─────────────────────────────────────────────────
export const CONTENT_PARAMS = {
  air: {
    maxTravel:  2.10,
    pushLerp:   0.018,
    resetLerp:  0.045,
    glowColor:  new THREE.Color(0x00e676),
    forceCurve: t => 0.04 + t * 0.24,   // 4 %→28 % (easy)
    label: 'Easily compressed',
    science: 'Gas molecules have large spaces — they can be pushed closer together.',
    emoji: '🟢',
  },
  water: {
    maxTravel:  0.08,
    pushLerp:   0.050,
    resetLerp:  0.065,
    glowColor:  new THREE.Color(0xff1744),
    forceCurve: t => 0.10 + t * 0.87,   // 10 %→97 % (very hard)
    label: 'Strongly resists',
    science: 'Liquid molecules are already tightly packed — no space to compress.',
    emoji: '🔴',
  },
  chalk: {
    maxTravel:  0.20,
    pushLerp:   0.042,
    resetLerp:  0.058,
    glowColor:  new THREE.Color(0xff6d00),
    forceCurve: t => 0.10 + t * 0.74,   // 10 %→84 % (hard)
    label: 'Resists compression',
    science: 'Solid particles are rigid and locked — they resist compression strongly.',
    emoji: '🟠',
  },
};

// ── Class ──────────────────────────────────────────────────────────────────
export class CompressionSystem {
  constructor() {
    this._entries  = [];
    this._phase    = 'idle'; // 'idle' | 'pushing' | 'resetting'
    this._onUpdate = null;
  }

  /**
   * Register a syringe.
   * data: { id, contents, plungerGroup, airHaze, glowMesh, waterSurf,
   *         groupRef, fillBot, fillH }
   */
  register(data) {
    this._entries.push({
      ...data,
      params:    CONTENT_PARAMS[data.contents],
      travel:    0,
      forceFrac: 0,
      shakeT:    0,
    });
  }

  push()  { this._phase = 'pushing';   this._entries.forEach(e => { e.shakeT = 0; }); }
  reset() { this._phase = 'resetting'; }

  replay(delay = 900) {
    this.reset();
    setTimeout(() => { if (this._phase !== 'pushing') this.push(); }, delay);
  }

  onUpdate(fn) { this._onUpdate = fn; }
  getPhase()   { return this._phase; }

  // ── Per-frame ──────────────────────────────────────────────────────────
  update(dt) {
    const isPushing = this._phase === 'pushing';
    const progress  = [];
    let   settled   = true;

    this._entries.forEach(e => {
      const target = isPushing ? e.params.maxTravel : 0;
      const tick   = Math.min(0.999, (isPushing ? e.params.pushLerp : e.params.resetLerp) * dt * 60);

      e.travel = THREE.MathUtils.lerp(e.travel, target, tick);
      if (Math.abs(e.travel - target) > 0.002) settled = false;

      // Move plunger sub-group
      e.plungerGroup.position.y = -e.travel;

      // Shake for resistant syringes at max
      const comprFrac   = e.travel / e.params.maxTravel;
      const isResistant = e.params.maxTravel < 0.5;
      if (isPushing && isResistant && comprFrac > 0.75) {
        e.shakeT += dt * 28;
        const mag = 0.012;
        e.plungerGroup.position.x = Math.sin(e.shakeT) * mag;
        if (e.groupRef) e.groupRef.position.x = e.groupRef.userData.baseX + Math.sin(e.shakeT * 1.3) * mag * 0.45;
      } else {
        e.plungerGroup.position.x = THREE.MathUtils.lerp(e.plungerGroup.position.x, 0, 0.25);
        if (e.groupRef) e.groupRef.position.x = THREE.MathUtils.lerp(e.groupRef.position.x, e.groupRef.userData.baseX, 0.20);
      }

      // Air haze: squish vertically
      if (e.airHaze) {
        const h = Math.max(0.04, e.fillH - e.travel);
        e.airHaze.scale.y    = h / e.fillH;
        e.airHaze.position.y = e.fillBot + h / 2;
      }

      // Water surface shimmer when compressed
      if (e.waterSurf) {
        const base = 0.75 + comprFrac * 0.15;
        const op   = isPushing && comprFrac > 0.5 ? base + Math.sin(Date.now() * 0.012) * 0.10 : base;
        e.waterSurf.material.opacity = THREE.MathUtils.clamp(op, 0, 1);
        e.waterSurf.material.needsUpdate = true;
      }

      // Glow ring
      if (e.glowMesh) {
        const m = e.glowMesh.material;
        const intensity = isPushing ? comprFrac * 2.2 : comprFrac * 0.8;
        m.color.copy(e.params.glowColor);
        m.emissive.copy(e.params.glowColor);
        m.emissiveIntensity = intensity;
        m.opacity           = Math.min(0.42, intensity * 0.22);
        m.needsUpdate       = true;
      }

      // UI force bar
      const rawF = isPushing ? e.params.forceCurve(comprFrac) : 0;
      e.forceFrac = THREE.MathUtils.lerp(e.forceFrac, rawF, isPushing ? 0.10 : 0.07);

      progress.push({
        id: e.id, contents: e.contents,
        travel: e.travel, maxTravel: e.params.maxTravel,
        comprFrac, forceFrac: THREE.MathUtils.clamp(e.forceFrac, 0, 1),
        label: e.params.label, science: e.params.science,
        glowHex: '#' + e.params.glowColor.getHexString(), emoji: e.params.emoji,
      });
    });

    if (settled && this._phase !== 'idle') this._phase = 'idle';
    if (this._onUpdate) this._onUpdate(progress);
    return progress;
  }

  dispose() { this._entries = []; this._onUpdate = null; }
}
