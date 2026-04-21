/**
 * DiffusionSystem.js
 *
 * Simulates diffusion of ink and honey in water using Brownian-motion
 * particle random walks.  The two substances have very different diffusion
 * coefficients, making the contrast immediately visible to students.
 *
 * Physics shorthand
 * ─────────────────
 *   Δx ≈ √(2·D·Δt) · N(0,1)   (1-D projection of 3-D random walk)
 *
 *   Ink   D ≈ 0.022  →  fully spread in ~40 simulated seconds
 *   Honey D ≈ 0.0016 →  fully spread in ~1 200 simulated seconds
 *
 * Beaker-local coordinate system (matches BeakerBuilder.js)
 *   Cylinder radius : 0.50
 *   Water y range   : [0.045, 1.595]   (centre at y = 0.82, height = 1.55)
 */

import * as THREE from 'three';

// ── Geometry constants (must match BeakerBuilder) ────────────────────────────
const BEAKER_R   = 0.49;  // inner radius (slightly less than 0.50 to avoid z-fighting)
const WATER_YMIN = 0.045;
const WATER_YMAX = 1.595;
const DROP_X     = 0.34;  // horizontal offset where the drop enters the wall

// ── Substance configurations ──────────────────────────────────────────────────
const CONFIGS = {
  ink: {
    particleColor    : new THREE.Color(0x1d4ed8),
    particleCount    : 900,
    particleSize     : 0.030,
    diffusionCoeff   : 0.022,    // spread speed (arbitrary vis units)
    sinkRate         : 0.003,    // initial downward drift (gentle)
    sinkDecay        : 1.2,      // how quickly sinking slows (1/s)
    progressRate     : 1 / 42,   // progress units / second → full at 42 s
    waterColorStart  : new THREE.Color(0xc8e8f5),   // clear water — colour appears only after drop
    waterColorFull   : new THREE.Color(0x1a3586),   // deep blue at 100 %
    label            : 'Ink',
  },
  honey: {
    particleColor    : new THREE.Color(0xd97706),
    particleCount    : 450,
    particleSize     : 0.065,
    diffusionCoeff   : 0.0016,   // ~14× slower than ink
    sinkRate         : 0.030,    // honey is denser — sinks faster
    sinkDecay        : 0.12,     // sinking persists much longer
    progressRate     : 1 / 1200, // full spread in 1 200 s (~20 min real time)
    waterColorStart  : new THREE.Color(0xc8e8f5),   // clear water — colour appears only after drop
    waterColorFull   : new THREE.Color(0x78350f),   // dark amber at 100 %
    label            : 'Honey',
  },
};

/** Approximate standard-normal sample via sum of three uniforms (fast). */
function gauss() {
  return (Math.random() + Math.random() + Math.random() - 1.5) * 0.8165;
}

// ── DiffusionSystem class ─────────────────────────────────────────────────────
export class DiffusionSystem {
  /**
   * @param {Function} onProgress  - Callback fired ~10 × / s with
   *   { ink: 0-1, honey: 0-1, elapsed: seconds }
   */
  constructor(onProgress) {
    this._onProgress = onProgress;
    this._states     = {};          // keyed by 'ink' | 'honey'
    this._tickTimer  = 0;
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  /**
   * Add a drop to a beaker.  Safe to call multiple times — ignored if the
   * substance was already dropped.
   *
   * @param {'ink'|'honey'} type
   * @param {THREE.Group}   beakerGroup  - The beaker's root Group
   * @param {object}        waterProxy   - { material:{color} } proxy from BeakerBuilder
   * @param {{ x:number, y:number }} [startPos] - Final resting position of the drop
   *   sphere from DropAnimation.  Particles spawn here — no teleport jump.
   *   Defaults to (DROP_X, WATER_YMAX-0.08) if omitted.
   */
  addDrop(type, beakerGroup, waterProxy, startPos = {}) {
    if (this._states[type]?.active) return;

    const cfg    = CONFIGS[type];
    const N      = cfg.particleCount;
    const spawnX = startPos.x ?? DROP_X;
    const spawnY = startPos.y ?? (WATER_YMAX - 0.08);

    // ── Build particle geometry ─────────────────────────────────────────
    const positions = new Float32Array(N * 3);

    // Cluster tightly around where the drop actually dissolved
    for (let i = 0; i < N; i++) {
      const i3 = i * 3;
      positions[i3]     = spawnX + (Math.random() - 0.5) * 0.07;
      positions[i3 + 1] = spawnY + (Math.random() - 0.5) * 0.07;
      positions[i3 + 2] = (Math.random() - 0.5) * 0.07;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      color        : cfg.particleColor,
      size         : cfg.particleSize,
      transparent  : true,
      opacity      : 0.92,
      sizeAttenuation: true,
      depthWrite   : false,
    });

    const points = new THREE.Points(geo, mat);
    points.renderOrder = 5;
    beakerGroup.add(points);

    // ── Store state ─────────────────────────────────────────────────────
    this._states[type] = {
      active     : true,
      elapsed    : 0,
      progress   : 0,
      points,
      waterProxy,          // duck-typed proxy from BeakerBuilder
      waterColorStart: cfg.waterColorStart.clone(),
    };
  }

  /**
   * Call every frame from the animation loop.
   *
   * @param {number}  dt         - Delta time in seconds
   * @param {boolean} isRunning  - Whether the simulation is playing
   */
  update(dt, isRunning) {
    for (const type of ['ink', 'honey']) {
      const state = this._states[type];
      if (!state?.active) continue;

      if (isRunning) {
        const cfg = CONFIGS[type];
        state.elapsed  += dt;
        state.progress  = Math.min(state.elapsed * cfg.progressRate, 1.0);

        this._stepParticles(type, dt, state);
        this._blendWaterColor(type, state);
      }
    }

    // Fire progress callback at ~10 fps to avoid flooding React
    this._tickTimer += dt;
    if (this._tickTimer >= 0.1) {
      this._tickTimer = 0;
      this._onProgress?.({
        ink    : this._states.ink?.progress   ?? 0,
        honey  : this._states.honey?.progress ?? 0,
        elapsed: Math.max(
          this._states.ink?.elapsed   ?? 0,
          this._states.honey?.elapsed ?? 0,
        ),
      });
    }
  }

  /** Pause/resume just stops the elapsed counter — no separate call needed. */

  /** Remove all particles and reset water colours. */
  reset() {
    for (const type of ['ink', 'honey']) {
      const state = this._states[type];
      if (!state) continue;

      // Remove Points from parent group
      state.points.parent?.remove(state.points);
      state.points.geometry.dispose();
      state.points.material.dispose();

      // Reset water colour back to clear water
      if (state.waterProxy?.material?.color) {
        state.waterProxy.material.color.lerpColors(
          cfg.waterColorStart,
          cfg.waterColorStart,
          1,   // jump straight to start (clear water)
        );
      }
    }
    this._states   = {};
    this._tickTimer = 0;
    this._onProgress?.({ ink: 0, honey: 0, elapsed: 0 });
  }

  dispose() {
    this.reset();
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  /** Advance particle positions one random-walk step, constrained to the beaker. */
  _stepParticles(type, dt, state) {
    const cfg    = CONFIGS[type];
    const posAttr = state.points.geometry.attributes.position;
    const arr    = posAttr.array;
    const N      = arr.length / 3;

    // Scale factor for 3-D Brownian step projected onto each axis
    const sigma = Math.sqrt(2 * cfg.diffusionCoeff * dt);

    // Sinking term: decays exponentially over time for honey; quick for ink
    const sinkDy = -cfg.sinkRate * Math.exp(-state.elapsed * cfg.sinkDecay) * dt;

    for (let i = 0; i < N; i++) {
      const i3 = i * 3;

      // Random walk
      arr[i3]     += gauss() * sigma;
      arr[i3 + 1] += gauss() * sigma * 0.6 + sinkDy;
      arr[i3 + 2] += gauss() * sigma;

      // ── Constrain to cylinder (clamp radial, reflect vertical) ─────
      const r = Math.sqrt(arr[i3] * arr[i3] + arr[i3 + 2] * arr[i3 + 2]);
      if (r > BEAKER_R) {
        const scale = (BEAKER_R / r) * 0.97;
        arr[i3]     *= scale;
        arr[i3 + 2] *= scale;
      }

      // Vertical bounds — soft reflection
      if (arr[i3 + 1] < WATER_YMIN) {
        arr[i3 + 1] = WATER_YMIN + Math.abs(arr[i3 + 1] - WATER_YMIN) * 0.4;
      }
      if (arr[i3 + 1] > WATER_YMAX) {
        arr[i3 + 1] = WATER_YMAX - Math.abs(arr[i3 + 1] - WATER_YMAX) * 0.4;
      }
    }

    posAttr.needsUpdate = true;

    // Fade particles as they spread (fully diluted → nearly invisible)
    const mat = state.points.material;
    const targetOpacity = 0.85 * (1 - state.progress * 0.75) + 0.08;
    mat.opacity = THREE.MathUtils.lerp(mat.opacity, targetOpacity, 0.04);

    // Particles grow slightly to represent dilution / spreading volume
    mat.size = THREE.MathUtils.lerp(
      mat.size,
      cfg.particleSize * (1 + state.progress * 0.7),
      0.02,
    );
  }

  /** Lerp water material colour from clear→full tint as diffusion progresses. */
  _blendWaterColor(type, state) {
    if (!state.waterProxy?.material?.color) return;
    const cfg = CONFIGS[type];
    state.waterProxy.material.color.lerpColors(
      cfg.waterColorStart,
      cfg.waterColorFull,
      state.progress,
    );
  }
}
