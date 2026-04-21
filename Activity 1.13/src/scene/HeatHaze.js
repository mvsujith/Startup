/**
 * HeatHaze.js — Heat Shimmer / Haze Effect
 *
 * Creates expanding ring sprites above the china dish that simulate
 * the heat shimmer / convection currents rising from the burner.
 *
 * Each ring:
 *   – Starts small at dish level
 *   – Expands outward and drifts upward
 *   – Fades from orange-warm → transparent
 */

import * as THREE from 'three';

// ─────────────────────────── Ring canvas ─────────────────────────────────────

function makeRingCanvas(size = 128) {
  const c   = document.createElement('canvas');
  c.width   = size;
  c.height  = size;
  const ctx = c.getContext('2d');
  const cx  = size / 2;
  const cy  = size / 2;

  const grad = ctx.createRadialGradient(cx, cy, size * 0.28, cx, cy, size * 0.48);
  grad.addColorStop(0.0, 'rgba(255,160,30,0.0)');
  grad.addColorStop(0.3, 'rgba(255,200,80,0.60)');
  grad.addColorStop(0.6, 'rgba(255,140,20,0.30)');
  grad.addColorStop(1.0, 'rgba(255,100,10,0.0)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.48, 0, Math.PI * 2);
  ctx.fill();
  return c;
}

// ─────────────────────────── HeatHaze ────────────────────────────────────────

export class HeatHaze {
  /**
   * @param {THREE.Scene} scene
   * @param {number} originY  — world-space Y of the china dish surface
   */
  constructor(scene, originY) {
    this._scene    = scene;
    this._originY  = originY;
    this._rings    = [];
    this._timer    = 0;
    this._active   = false;

    const canvas = makeRingCanvas(128);
    const tex    = new THREE.CanvasTexture(canvas);
    this._mat = new THREE.SpriteMaterial({
      map:         tex,
      transparent: true,
      blending:    THREE.AdditiveBlending,
      depthWrite:  false,
    });
  }

  _spawnRing() {
    const sprite = new THREE.Sprite(this._mat.clone());
    const size   = 0.4 + Math.random() * 0.5;
    sprite.scale.set(size, size * 0.35, 1);
    sprite.position.set(
      (Math.random() - 0.5) * 0.3,
      this._originY,
      (Math.random() - 0.5) * 0.3,
    );
    sprite.material.opacity = 0.0;
    sprite.userData = {
      life:    0,
      maxLife: 1.6 + Math.random() * 1.0,
      velY:    0.30 + Math.random() * 0.25,
      sX:      size,
      sY:      size * 0.35,
    };
    this._scene.add(sprite);
    this._rings.push(sprite);
  }

  start() { this._active = true; }
  stop()  { this._active = false; }

  update(dt) {
    if (!this._active && this._rings.length === 0) return;

    // Spawn
    if (this._active) {
      this._timer += dt;
      if (this._timer > 0.22) {
        this._timer = 0;
        this._spawnRing();
      }
    }

    // Update rings
    for (let i = this._rings.length - 1; i >= 0; i--) {
      const r  = this._rings[i];
      const ud = r.userData;
      ud.life += dt;
      const t  = ud.life / ud.maxLife;

      if (t >= 1) {
        this._scene.remove(r);
        r.material.dispose();
        this._rings.splice(i, 1);
        continue;
      }

      // Rise + expand
      r.position.y += ud.velY * dt;
      const expand = 1 + t * 2.5;
      r.scale.set(ud.sX * expand, ud.sY * (1 + t * 0.8), 1);

      // Fade: in → peak → out
      r.material.opacity = t < 0.3
        ? t / 0.3 * 0.55
        : 0.55 * (1 - (t - 0.3) / 0.7);
    }
  }

  dispose() {
    this._rings.forEach(r => {
      this._scene.remove(r);
      r.material.dispose();
    });
    this._rings = [];
    this._mat.dispose();
  }
}
