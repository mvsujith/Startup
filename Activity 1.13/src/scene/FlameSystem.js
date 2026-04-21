/**
 * FlameSystem.js — Spirit Burner Flame Animation
 *
 * Creates a realistic animated flame above the burner wick:
 *   • 3-layer billboard sprites (inner core, mid flame, outer glow)
 *   • Per-frame flicker via scale, opacity, and Y-offset noise
 *   • Heat shimmer point light pulse synced to flicker
 *   • Embers: tiny orange sparks that drift upward and fade
 */

import * as THREE from 'three';

// ─────────────────────────── Flame Sprite ────────────────────────────────────

function makeFlameCanvas(innerColor, outerColor, size = 128) {
  const c   = document.createElement('canvas');
  c.width   = size;
  c.height  = size;
  const ctx = c.getContext('2d');

  // Radial gradient — inner bright → outer transparent
  const cx  = size / 2;
  const cy  = size * 0.55; // slightly below centre so it looks like a teardrop
  const r   = size * 0.46;

  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  grad.addColorStop(0.0,  innerColor);
  grad.addColorStop(0.45, outerColor);
  grad.addColorStop(1.0,  'rgba(0,0,0,0)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  // Teardrop shape: taller than wide, pointed at top
  ctx.save();
  ctx.scale(0.72, 1.0);
  ctx.arc(cx / 0.72, cy, r, 0, Math.PI * 2);
  ctx.restore();
  ctx.fill();

  return c;
}

function makeFlameSprite(innerColor, outerColor, scaleX, scaleY) {
  const canvas  = makeFlameCanvas(innerColor, outerColor);
  const tex     = new THREE.CanvasTexture(canvas);
  const mat     = new THREE.SpriteMaterial({
    map:         tex,
    transparent: true,
    blending:    THREE.AdditiveBlending,
    depthWrite:  false,
  });
  const sprite  = new THREE.Sprite(mat);
  sprite.scale.set(scaleX, scaleY, 1);
  return sprite;
}

// ─────────────────────────── Ember Particle ──────────────────────────────────

const EMBER_MAT = new THREE.MeshBasicMaterial({
  color:       0xff8844,
  transparent: true,
  blending:    THREE.AdditiveBlending,
  depthWrite:  false,
});

function spawnEmber(position) {
  const geo  = new THREE.SphereGeometry(0.018, 4, 4);
  const mesh = new THREE.Mesh(geo, EMBER_MAT.clone());
  mesh.position.copy(position);
  // Random upward-drift velocity
  mesh.userData.vel = new THREE.Vector3(
    (Math.random() - 0.5) * 0.4,
    0.8 + Math.random() * 0.6,
    (Math.random() - 0.5) * 0.4,
  );
  mesh.userData.life    = 0;
  mesh.userData.maxLife = 0.5 + Math.random() * 0.5;
  return mesh;
}

// ─────────────────────────── FlameSystem ─────────────────────────────────────

export class FlameSystem {
  /**
   * @param {THREE.Scene} scene
   * @param {THREE.Vector3} wickPosition  — world position of the wick tip
   * @param {THREE.PointLight} burnerLight — the point light to pulse
   */
  constructor(scene, wickPosition, burnerLight) {
    this._scene       = scene;
    this._wickPos     = wickPosition.clone();
    this._burnerLight = burnerLight;
    this._active      = false;
    this._embers      = [];

    this._group = new THREE.Group();
    this._group.position.copy(this._wickPos);
    this._group.visible = false;
    scene.add(this._group);

    // ── Flame layers ───────────────────────────────────────────────────────
    // Inner core — bright white-yellow
    this._core = makeFlameSprite(
      'rgba(255,255,220,1)',
      'rgba(255,180,20,0.85)',
      0.18, 0.30,
    );
    this._core.position.y = 0.12;
    this._group.add(this._core);

    // Mid flame — orange
    this._mid = makeFlameSprite(
      'rgba(255,160,10,0.9)',
      'rgba(255,70,0,0.70)',
      0.30, 0.50,
    );
    this._mid.position.y = 0.18;
    this._group.add(this._mid);

    // Outer glow — deep red / transparent
    this._outer = makeFlameSprite(
      'rgba(255,80,0,0.55)',
      'rgba(180,20,0,0.0)',
      0.52, 0.75,
    );
    this._outer.position.y = 0.22;
    this._group.add(this._outer);

    // Cached base scales for flicker
    this._baseScales = {
      core:  { x: 0.18, y: 0.30 },
      mid:   { x: 0.30, y: 0.50 },
      outer: { x: 0.52, y: 0.75 },
    };

    this._time = 0;
  }

  // ── Noise helper (simple sinusoidal pseudo-noise) ───────────────────────
  _noise(t, freq, phase = 0) {
    return Math.sin(t * freq + phase) * 0.5 + 0.5;
  }

  start() {
    this._active        = true;
    this._group.visible = true;
  }

  stop() {
    this._active        = false;
    this._group.visible = false;
    // Fade out existing embers naturally — they'll finish their lifecycle
  }

  /**
   * @param {number} dt  — delta time in seconds
   */
  update(dt) {
    if (!this._active) return;

    this._time += dt;
    const t = this._time;

    // ── Flicker: combine multiple sine waves for organic movement ─────────
    const flicker =
      this._noise(t, 8.3, 0.0)  * 0.50 +
      this._noise(t, 4.7, 1.2)  * 0.30 +
      this._noise(t, 13.1, 2.5) * 0.20;

    const sX = 0.85 + flicker * 0.30;
    const sY = 0.80 + flicker * 0.40;

    // Core
    this._core.scale.set(
      this._baseScales.core.x * sX,
      this._baseScales.core.y * sY,
      1,
    );
    this._core.position.y = 0.10 + flicker * 0.06;
    this._core.material.opacity = 0.80 + flicker * 0.20;

    // Mid
    this._mid.scale.set(
      this._baseScales.mid.x * (sX * 0.92),
      this._baseScales.mid.y * (sY * 0.95),
      1,
    );
    this._mid.position.y = 0.16 + flicker * 0.05;
    this._mid.material.opacity = 0.65 + flicker * 0.25;

    // Outer
    this._outer.scale.set(
      this._baseScales.outer.x * (sX * 0.88),
      this._baseScales.outer.y * (sY * 0.90),
      1,
    );
    this._outer.position.y = 0.20 + flicker * 0.04;
    this._outer.material.opacity = 0.40 + flicker * 0.35;

    // ── Pulse the burner point light ─────────────────────────────────────
    if (this._burnerLight) {
      this._burnerLight.intensity = 2.0 + flicker * 1.6;
    }

    // ── Embers ────────────────────────────────────────────────────────────
    // Spawn occasionally
    if (Math.random() < dt * 8) {
      const ember = spawnEmber(this._wickPos.clone().add(new THREE.Vector3(0, 0.30, 0)));
      this._scene.add(ember);
      this._embers.push(ember);
    }

    // Update existing embers
    for (let i = this._embers.length - 1; i >= 0; i--) {
      const e  = this._embers[i];
      e.userData.life += dt;
      const progress = e.userData.life / e.userData.maxLife;

      if (progress >= 1) {
        this._scene.remove(e);
        e.geometry.dispose();
        e.material.dispose();
        this._embers.splice(i, 1);
        continue;
      }

      e.position.addScaledVector(e.userData.vel, dt);
      e.userData.vel.y  -= dt * 0.3; // slight drag
      e.material.opacity = 1 - progress;
    }
  }

  dispose() {
    this._group.parent?.remove(this._group);
    this._embers.forEach(e => {
      this._scene.remove(e);
      e.geometry.dispose();
      e.material.dispose();
    });
    this._embers = [];
  }
}
