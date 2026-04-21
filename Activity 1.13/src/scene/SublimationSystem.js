/**
 * SublimationSystem.js — Camphor Vapour & Crystal Deposition
 *
 * Simulates the sublimation process in three stages:
 *
 *   Stage 1 — Vapour Rising  (heat applied)
 *     White translucent particles drift upward from camphor pieces,
 *     entering the inverted funnel.
 *
 *   Stage 2 — Inside Funnel  (particles travel through stem)
 *     Particles slow, swirl, and accumulate as vapour.
 *
 *   Stage 3 — Crystal Deposition  (on funnel walls)
 *     Small white crystal meshes appear on the inner wall of the funnel,
 *     growing over time to show re-solidification (deposition).
 *
 * All positions match the CamphorScene layout:
 *   camphor  y ≈ 3.30
 *   funnel   y ≈ 3.64 (wide rim at bottom)
 *   stem tip y ≈ 5.65
 */

import * as THREE from 'three';

// ─────────────────────────── Constants ───────────────────────────────────────

const CAMPHOR_Y     = 3.30;
const FUNNEL_RIM_Y  = 3.64;      // wide opening (bottom of inverted funnel)
const FUNNEL_APEX_Y = 3.64 + 1.2; // apex of bell = junction with stem
const STEM_TIP_Y    = 5.65;

const VAPOUR_MAT = new THREE.MeshBasicMaterial({
  color:       0xddeeff,
  transparent: true,
  opacity:     0.72,
  blending:    THREE.NormalBlending,
  depthWrite:  false,
});

const CRYSTAL_MAT = new THREE.MeshStandardMaterial({
  color:       0xffffff,
  roughness:   0.3,
  metalness:   0.0,
  transparent: true,
  opacity:     0.88,
});

// ─────────────────────────── Vapour Particle ─────────────────────────────────

function createVapourParticle(origin) {
  const geo  = new THREE.SphereGeometry(0.04 + Math.random() * 0.04, 6, 6);
  const mat  = VAPOUR_MAT.clone();
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.copy(origin);
  // Small horizontal scatter around camphor piece
  mesh.position.x += (Math.random() - 0.5) * 0.45;
  mesh.position.z += (Math.random() - 0.5) * 0.45;

  mesh.userData = {
    vel:      new THREE.Vector3(
                (Math.random() - 0.5) * 0.12,
                0.70 + Math.random() * 0.50,  // faster rise
                (Math.random() - 0.5) * 0.12,
              ),
    life:     0,
    maxLife:  4.5 + Math.random() * 2.0,      // longer lifetime so they reach apex
    phase:    'rising',   // 'rising' | 'inside' | 'done'
    wobble:   Math.random() * Math.PI * 2,
    wobbleSpd: 2.5 + Math.random() * 2,
  };

  return mesh;
}

// ─────────────────────────── Crystal Deposit ─────────────────────────────────

/**
 * Places a tiny crystal cluster on the inner wall of the funnel.
 * The funnel is a cone (wide at bottom, narrow at top) so crystals
 * appear at random heights with the correct inward-facing offset.
 */
function createCrystal(funnelBase) {
  const geo  = new THREE.DodecahedronGeometry(0.025 + Math.random() * 0.035, 0);
  const mat  = CRYSTAL_MAT.clone();
  const mesh = new THREE.Mesh(geo, mat);

  // Random height inside the funnel bell (0 = rim, 1 = apex)
  const t      = Math.random();
  const y      = funnelBase + t * 1.2;

  // Funnel inner radius narrows from 0.88 at rim → 0 at apex
  const radius = 0.88 * (1 - t) - 0.06; // minus wall thickness
  const angle  = Math.random() * Math.PI * 2;

  mesh.position.set(
    Math.cos(angle) * radius,
    y,
    Math.sin(angle) * radius,
  );

  // Random orientation for a crystal look
  mesh.rotation.set(
    Math.random() * Math.PI,
    Math.random() * Math.PI,
    Math.random() * Math.PI,
  );

  mesh.userData.growTime = 0;
  mesh.userData.growDur  = 0.6 + Math.random() * 0.8;
  mesh.scale.setScalar(0.01); // start tiny, grow in

  return mesh;
}

// ─────────────────────────── SublimationSystem ───────────────────────────────

export class SublimationSystem {
  /**
   * @param {THREE.Scene} scene
   * @param {number} funnelBaseY  — world-space y of the funnel wide opening
   * @param {number} camphorY     — world-space y of the camphor pieces
   */
  constructor(scene, funnelBaseY = FUNNEL_RIM_Y, camphorY = CAMPHOR_Y) {
    this._scene       = scene;
    this._funnelBase  = funnelBaseY;
    this._camphorY    = camphorY;    // world-space spawn origin
    this._active      = false;
    this._particles   = [];
    this._crystals    = [];
    this._spawnTimer  = 0;
    this._crystalCount = 0;
    this._elapsed     = 0;

    // Progress 0→1 (used by UI)
    this.progress = 0;
  }

  /** Start the sublimation when heat is applied */
  start() {
    this._active      = true;
    this._elapsed     = 0;
    this._spawnTimer  = 0;   // reset so first particle spawns immediately
  }

  /** Public read-only access to crystal count for UI */
  get crystalCount() { return this._crystalCount; }

  /** Pause / stop */
  stop() {
    this._active = false;
  }

  /** Full reset — remove all particles and crystals */
  reset() {
    this._active       = false;
    this._elapsed      = 0;
    this._crystalCount = 0;
    this.progress      = 0;
    this._spawnTimer   = 0;

    this._particles.forEach(p => {
      this._scene.remove(p);
      p.geometry.dispose();
      p.material.dispose();
    });
    this._particles = [];

    this._crystals.forEach(c => {
      this._scene.remove(c);
      c.geometry.dispose();
      c.material.dispose();
    });
    this._crystals = [];
  }

  /**
   * @param {number} dt — delta time (seconds)
   */
  update(dt) {
    if (!this._active && this._particles.length === 0) return;

    this._elapsed += dt;

    // ── Spawn new vapour particles ────────────────────────────────────────
    if (this._active) {
      this._spawnTimer += dt;
      // Ramp up spawn rate over first 8 seconds
      const spawnRate   = Math.min(8 + this._elapsed * 1.5, 18); // particles/sec
      const spawnPeriod = 1 / spawnRate;

      while (this._spawnTimer >= spawnPeriod) {
        this._spawnTimer -= spawnPeriod;
        const origin = new THREE.Vector3(0, this._camphorY, 0);
        const p      = createVapourParticle(origin);
        this._scene.add(p);
        this._particles.push(p);
      }

      // Progress based on crystals deposited (max 40)
      this.progress = Math.min(this._crystalCount / 40, 1);
    }

    // ── Update existing particles ─────────────────────────────────────────
    for (let i = this._particles.length - 1; i >= 0; i--) {
      const p  = this._particles[i];
      const ud = p.userData;

      ud.life += dt;
      const norm = ud.life / ud.maxLife;

      // Wobble
      ud.wobble += ud.wobbleSpd * dt;
      const wobbleX = Math.sin(ud.wobble) * 0.04;
      const wobbleZ = Math.cos(ud.wobble * 1.3) * 0.04;

      if (ud.phase === 'rising') {
        // Rise upward with deceleration as it approaches the funnel
        const distToFunnel = Math.max(this._funnelBase - p.position.y, 0);
        const speedMod     = 0.5 + Math.min(distToFunnel * 0.6, 1.0);
        p.position.addScaledVector(ud.vel, dt * speedMod);
        p.position.x += wobbleX * dt;
        p.position.z += wobbleZ * dt;

        // Funnel intake: pull toward centre as it enters the rim
        if (p.position.y > this._funnelBase - 0.3) {
          const toCentre = new THREE.Vector3(-p.position.x, 0, -p.position.z);
          p.position.addScaledVector(toCentre, dt * 1.2);
        }

        // Transition to 'inside' when above the rim
        if (p.position.y > this._funnelBase + 0.15) {
          ud.phase  = 'inside';
          ud.vel.y *= 0.55; // slow down inside funnel
        }

        // Fade in from 0
        p.material.opacity = Math.min(norm * 4, 0.55);

      } else if (ud.phase === 'inside') {
        // Spiral upward through the funnel at full speed
        p.position.addScaledVector(ud.vel, dt * 0.80);
        p.position.x += wobbleX * dt * 0.5;
        p.position.z += wobbleZ * dt * 0.5;

        // Gentle pull to axis (funnel narrows toward apex)
        const toCentre = new THREE.Vector3(-p.position.x, 0, -p.position.z);
        p.position.addScaledVector(toCentre, dt * 2.5);

        // Fade out toward the end of life
        const fadeStart = 0.65;
        p.material.opacity = norm < fadeStart
          ? 0.55
          : 0.55 * (1 - (norm - fadeStart) / (1 - fadeStart));

        // Crystal deposition — trigger anywhere above the lower third of the funnel
        // Uses this._funnelBase (not hardcoded constant) so it matches the actual scene
        const depositionThreshold = this._funnelBase + 0.40; // lower third of bell
        if (p.position.y > depositionThreshold && Math.random() < dt * 3.5) {
          this._depositCrystal();
        }
      }

      // Remove dead particles
      if (ud.life >= ud.maxLife) {
        this._scene.remove(p);
        p.geometry.dispose();
        p.material.dispose();
        this._particles.splice(i, 1);
      }
    }

    // ── Grow crystals ─────────────────────────────────────────────────────
    for (const c of this._crystals) {
      if (c.scale.x < 1) {
        c.userData.growTime += dt;
        const t = Math.min(c.userData.growTime / c.userData.growDur, 1);
        const s = this._easeOut(t);
        c.scale.setScalar(s);
      }
    }
  }

  _depositCrystal() {
    if (this._crystalCount >= 60) return; // cap
    const crystal = createCrystal(this._funnelBase);
    this._scene.add(crystal);
    this._crystals.push(crystal);
    this._crystalCount++;
  }

  _easeOut(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  dispose() {
    this.reset();
  }
}
