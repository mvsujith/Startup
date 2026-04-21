/**
 * DiffusionVisuals.js — Phase 2 v2: Visual Diffusion Effects
 *
 * Changes from v1:
 *  ✦ Crystal hidden until "Drop Crystal" clicked — shown at start of drop
 *  ✦ Removed 3 gradient cylinder layers — water color change now follows
 *    Water.glb shape directly (only waterMat is animated)
 *  ✦ Removed shimmer disc / aura ring animation (removed from GlassBuilder too)
 *  ✦ Added STEAM effect — wispy vapor puffs rising above HOT beaker
 *  ✦ Added CONDENSATION — water droplets sliding down COLD beaker exterior
 *  ✦ Haze sphere still shows concentrated blue cloud above crystal on settling
 */

import * as THREE from 'three';

// ── Shared geometry constants (must match GlassBuilder.js) ────────────────────
export const WATER_BOT_Y  = 0.08;
export const WATER_FILL   = 2.80 * 0.78;           // ≈ 2.184
export const WATER_SURF_Y = WATER_BOT_Y + WATER_FILL; // ≈ 2.264
export const BEAKER_R     = 0.78;                  // inner radius (for effects)
const OUTER_BEAD_R        = 0.96;                  // outside beaker wall for condensation

// Crystal drop positions
const CRYSTAL_START_Y = WATER_SURF_Y + 0.30;
const CRYSTAL_END_Y   = WATER_BOT_Y  + 0.10;

// Diffusion colours
const HOT_FINAL_COLOR  = new THREE.Color(0x1255dd);
const COLD_FINAL_COLOR = new THREE.Color(0x1255dd);
const WATER_CLEAR_HOT  = new THREE.Color(0xfff5ec);
const WATER_CLEAR_COLD = new THREE.Color(0xedf7ff);

// Particle counts
const HOT_PARTICLE_COUNT  = 70;
const COLD_PARTICLE_COUNT = 28;

const SEG = 32;

// ── DiffusionVisuals ──────────────────────────────────────────────────────────

export class DiffusionVisuals {
  constructor({ scene, hotGlass, coldGlass }) {
    this._scene   = scene;
    this._elapsed = 0;

    // Build steam texture once (shared)
    this._steamTex = _makeSteamTex();

    this._hot  = this._initContext(hotGlass,  'hot',  HOT_PARTICLE_COUNT,  WATER_CLEAR_HOT,  HOT_FINAL_COLOR);
    this._cold = this._initContext(coldGlass, 'cold', COLD_PARTICLE_COUNT, WATER_CLEAR_COLD, COLD_FINAL_COLOR);

    // Speed annotation sprites
    this._hotSpeedSprite  = this._buildSpeedSprite('Diffusing faster', 0xff7a30);
    this._coldSpeedSprite = this._buildSpeedSprite('Diffusing slower', 0x3ab4f2);
    this._hotSpeedSprite.position.set( -2.4, WATER_SURF_Y + 2.15, 0);
    this._coldSpeedSprite.position.set(  2.4, WATER_SURF_Y + 2.15, 0);
    this._hotSpeedSprite.scale.set(2.2, 0.55, 1);
    this._coldSpeedSprite.scale.set(2.2, 0.55, 1);
    this._hotSpeedSprite.visible  = false;
    this._coldSpeedSprite.visible = false;
    scene.add(this._hotSpeedSprite);
    scene.add(this._coldSpeedSprite);
  }

  // ── Per-frame update ──────────────────────────────────────────────────────

  update(snap, dt) {
    this._elapsed += dt;

    // Crystal visibility + drop animation
    this._updateCrystalDrop(this._hot,  snap.dropProg, snap.settleProg, snap.hasDrop);
    this._updateCrystalDrop(this._cold, snap.dropProg, snap.settleProg, snap.hasDrop);

    // Crystal gradually dissolves as it diffuses into the water
    this._updateCrystalDissolve(this._hot,  snap.hotProg,  dt);
    this._updateCrystalDissolve(this._cold, snap.coldProg, dt);

    // Ripple ring
    this._updateRipple(this._hot,  dt);
    this._updateRipple(this._cold, dt);

    // Diffusion: haze sphere + water material (follows Water.glb shape)
    const hotSettled  = this._hot.dropped  || snap.hotProg  > 0;
    const coldSettled = this._cold.dropped || snap.coldProg > 0;
    this._updateDiffusion(this._hot,  snap.hotProg,  hotSettled,  dt);
    this._updateDiffusion(this._cold, snap.coldProg, coldSettled, dt);

    // Diffusion particles (ion migration)
    const particlesOn = snap.isObserving || snap.isPaused || snap.isComplete;
    this._updateParticles(this._hot,  snap.hotProg,  particlesOn, 3.0, dt);
    this._updateParticles(this._cold, snap.coldProg, particlesOn, 1.0, dt);

    // Steam (hot beaker — always active regardless of experiment state)
    this._updateSteam(this._hot, dt);

    // Condensation droplets (cold beaker — always active)
    _updateCondensation(this._cold, dt);

    // Speed labels
    const showLabels = snap.isObserving || snap.isPaused || snap.isComplete;
    this._hotSpeedSprite.visible  = showLabels;
    this._coldSpeedSprite.visible = showLabels;
  }

  // ── Dispose ───────────────────────────────────────────────────────────────

  dispose() {
    [this._hot, this._cold].forEach(ctx => {
      ctx.hazeMesh.geometry.dispose(); ctx.hazeMesh.material.dispose();
      ctx.glass.group.remove(ctx.hazeMesh);

      ctx.rippleMesh.geometry.dispose(); ctx.rippleMesh.material.dispose();
      ctx.glass.group.remove(ctx.rippleMesh);

      ctx.particles.geometry.dispose(); ctx.particles.material.dispose();
      ctx.glass.group.remove(ctx.particles);

      // Steam
      if (ctx.steam) {
        ctx.steam.puffs.forEach(p => {
          p.mat.dispose();
          ctx.glass.group.remove(p.sprite);
        });
      }

      // Condensation
      if (ctx.condensation) {
        ctx.condensation.mat.dispose();
        ctx.condensation.drops.forEach(d => {
          d.mesh.geometry.dispose();
          ctx.glass.group.remove(d.mesh);
        });
      }
    });

    this._steamTex.dispose();
    this._scene.remove(this._hotSpeedSprite);
    this._scene.remove(this._coldSpeedSprite);
    this._hotSpeedSprite.material.dispose();
    this._coldSpeedSprite.material.dispose();
  }

  // ── Private: initialise one glass visual context ──────────────────────────

  _initContext(glass, type, particleCount, clearColor, finalColor) {
    const group = glass.group;
    const isHot = type === 'hot';

    // Crystal: ensure hidden + reset position
    glass.crystal.visible = false;
    glass.crystal.position.set(0, CRYSTAL_START_Y, 0);
    glass.crystal.scale.setScalar(3.0);

    // ── Haze sphere — concentrated blue cloud above crystal on settling ────────
    const hazeGeo = new THREE.SphereGeometry(BEAKER_R * 0.50, SEG, SEG / 2);
    const hazeMat = new THREE.MeshStandardMaterial({
      color      : new THREE.Color(0x1040ee),
      transparent: true,
      opacity    : 0,
      roughness  : 0.0,
      depthWrite : false,
    });
    const hazeMesh = new THREE.Mesh(hazeGeo, hazeMat);
    hazeMesh.position.set(0, CRYSTAL_END_Y + 0.30, 0);
    hazeMesh.renderOrder = 5;
    hazeMesh.scale.setScalar(0.001);
    group.add(hazeMesh);

    // ── Ripple ring — water surface on crystal impact ─────────────────────────
    const rippleGeo = new THREE.TorusGeometry(0.05, 0.012, 6, SEG);
    const rippleMat = new THREE.MeshStandardMaterial({
      color            : new THREE.Color(isHot ? 0xff8030 : 0x30aaff),
      emissive         : new THREE.Color(isHot ? 0xff6020 : 0x2090ff),
      emissiveIntensity: 1.2,
      transparent      : true,
      opacity          : 0,
      depthWrite       : false,
    });
    const rippleMesh = new THREE.Mesh(rippleGeo, rippleMat);
    rippleMesh.rotation.x = Math.PI / 2;
    rippleMesh.position.set(0, WATER_SURF_Y - 0.05, 0);
    rippleMesh.renderOrder = 6;
    group.add(rippleMesh);

    // ── Diffusion particles (ion migration: blue specks rising) ───────────────
    const pGeo = new THREE.SphereGeometry(0.022, 5, 5);
    const pMat = new THREE.MeshStandardMaterial({
      color            : new THREE.Color(0x2266ff),
      emissive         : new THREE.Color(0x1144cc),
      emissiveIntensity: 0.8,
      transparent      : true,
      opacity          : 0.75,
      depthWrite       : false,
    });
    const particles = new THREE.InstancedMesh(pGeo, pMat, particleCount);
    particles.renderOrder = 7;
    particles.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    particles.count = 0;
    group.add(particles);

    const dummy  = new THREE.Object3D();
    const pState = Array.from({ length: particleCount }, () => ({
      x   : (Math.random() - 0.5) * BEAKER_R * 1.1,
      y   : CRYSTAL_END_Y + Math.random() * 0.3,
      z   : (Math.random() - 0.5) * BEAKER_R * 1.1,
      vy  : 0.04 + Math.random() * 0.06,
      vx  : (Math.random() - 0.5) * 0.015,
      vz  : (Math.random() - 0.5) * 0.015,
      life: Math.random(),
    }));

    // ── STEAM: rising vapor puffs (HOT beaker only) ───────────────────────────
    let steam = null;
    if (isHot) {
      steam = this._buildSteam(group);
    }

    // ── CONDENSATION: sliding water droplets (COLD beaker only) ──────────────
    let condensation = null;
    if (!isHot) {
      condensation = _buildCondensation(group);
    }

    return {
      glass, type, isHot,
      hazeMesh, hazeMat,
      rippleMesh, rippleMat,
      ripple: { active: false, t: 0 },
      particles, pMat, pState, dummy, particleCount,
      clearColor, finalColor,
      dropped: false,
      rippleTriggered: false,
      steam,
      condensation,
    };
  }

  // ── Crystal drop & visibility ─────────────────────────────────────────────

  _updateCrystalDrop(ctx, dropProg, settleProg, hasDrop) {
    const crystal = ctx.glass.crystal;

    if (!hasDrop) {
      crystal.visible = false;
      crystal.position.set(0, CRYSTAL_START_Y, 0);
      // Reset for replay — restore full opacity
      crystal.traverse(node => {
        if (node.isMesh && node.material) {
          node.material.opacity          = 0.88;
          node.material.emissiveIntensity = 0.60;
        }
        if (node.isLight) node.intensity = 1.8;
      });
      ctx.dropped         = false;
      ctx.rippleTriggered = false;
      return;
    }

    // Make crystal visible from the moment drop starts
    crystal.visible = true;

    if (dropProg < 1.0) {
      // Falling with gravity ease
      const t = _easeInQuad(dropProg);
      crystal.position.y = _lerp(CRYSTAL_START_Y, CRYSTAL_END_Y, t);

      // Trigger surface ripple when crossing water surface
      if (!ctx.rippleTriggered && crystal.position.y <= WATER_SURF_Y + 0.05) {
        ctx.rippleTriggered = true;
        ctx.ripple.active   = true;
        ctx.ripple.t        = 0;
      }
    } else {
      // Settling bounce (damped oscillation)
      const bounce = Math.sin(settleProg * Math.PI * 2.5) * (1 - settleProg) * 0.18;
      crystal.position.y = CRYSTAL_END_Y + bounce;

      if (settleProg >= 1.0) {
        crystal.position.y = CRYSTAL_END_Y;
        ctx.dropped = true;
      }
    }

    // Slow spin while falling / settling
    crystal.rotation.y += 0.022;
  }

  // ── Ripple ring ───────────────────────────────────────────────────────────

  _updateRipple(ctx, dt) {
    const r = ctx.ripple;
    if (!r.active) return;

    r.t += dt * 2.8;
    const p = Math.min(r.t, 1.0);

    const scaleR = _easeOutQuad(p) * (BEAKER_R / 0.05);
    ctx.rippleMesh.scale.set(scaleR, scaleR, 1);
    ctx.rippleMat.opacity = (1 - p) * 0.85;

    if (p >= 1.0) { r.active = false; ctx.rippleMat.opacity = 0; }
  }

  // ── Diffusion: haze + water colour (follows Water.glb shape) ─────────────
  // No cylinder layers — only the Water.glb mesh is coloured so the shape
  // of the tint exactly matches the user's custom water geometry.

  _updateDiffusion(ctx, prog, settled, dt) {
    if (!settled) {
      // Reset haze and water colour
      ctx.hazeMesh.scale.setScalar(0.001);
      ctx.hazeMat.opacity = 0;
      ctx.glass.waterMat.color.copy(ctx.clearColor);
      ctx.glass.waterMat.opacity = 0.22;
      return;
    }

    // ── Two-phase transition ─────────────────────────────────────────────────
    // Phase A (0 → 0.40): dense haze ball grows near crystal
    // Phase B (0.40 → 1.0): haze fades, entire water body tints blue
    // This gives a "point → whole volume" diffusion feel without cylinders.

    if (prog <= 0.40) {
      const p = prog / 0.40;                         // 0 → 1 within phase A
      const targetScale = 0.001 + _easeOutQuad(p) * 0.96;
      ctx.hazeMesh.scale.setScalar(_damp(ctx.hazeMesh.scale.x, targetScale, 5.0, dt));
      ctx.hazeMat.opacity = _damp(ctx.hazeMat.opacity, p * 0.72, 4.5, dt);

      // Water very lightly tints (shows the crystal is dissolving)
      ctx.glass.waterMat.color.lerpColors(ctx.clearColor, ctx.finalColor, p * 0.18);
      ctx.glass.waterMat.opacity = 0.22 + p * 0.06;

    } else {
      const p = (prog - 0.40) / 0.60;               // 0 → 1 within phase B
      // Haze fades out as water takes over
      ctx.hazeMat.opacity = _damp(ctx.hazeMat.opacity, (1 - p) * 0.55, 3.5, dt);

      // Water tints rapidly towards final blue
      ctx.glass.waterMat.color.lerpColors(ctx.clearColor, ctx.finalColor, 0.18 + p * 0.82);
      ctx.glass.waterMat.opacity = 0.28 + p * 0.18;    // less transparent as dissolved
    }
  }

  // ── Diffusion particles (rising ion dots) ─────────────────────────────────

  _updateParticles(ctx, prog, visible, speedScale, dt) {
    if (!visible || prog <= 0) { ctx.particles.count = 0; return; }

    const activeCount = Math.min(
      Math.ceil(ctx.particleCount * Math.min(prog * 2, 1)),
      ctx.particleCount,
    );
    ctx.particles.count = activeCount;

    const mat4 = new THREE.Matrix4();
    const col  = new THREE.Color();

    ctx.pState.slice(0, activeCount).forEach((p, i) => {
      const speed = speedScale * dt;
      p.y   += p.vy * speed;
      p.x   += p.vx * speed * 0.5;
      p.z   += p.vz * speed * 0.5;
      p.life = (p.life + speed * 0.35) % 1.0;

      if (p.y > WATER_SURF_Y - 0.05) {
        const r = Math.random() * BEAKER_R * 0.66;
        const θ = Math.random() * Math.PI * 2;
        p.x = Math.cos(θ) * r; p.z = Math.sin(θ) * r;
        p.y = CRYSTAL_END_Y + Math.random() * 0.25;
        p.life = Math.random() * 0.3;
        p.vy = 0.04 + Math.random() * 0.04;
        p.vx = (Math.random() - 0.5) * 0.012;
        p.vz = (Math.random() - 0.5) * 0.012;
      }

      const hr    = (p.y - CRYSTAL_END_Y) / (WATER_SURF_Y - CRYSTAL_END_Y);
      const scale = 0.024 * (1 - hr * 0.5);
      mat4.makeScale(scale, scale, scale);
      mat4.setPosition(p.x, p.y, p.z);
      ctx.particles.setMatrixAt(i, mat4);
      col.setRGB(0.2 + hr * 0.3, 0.4 + hr * 0.3, 1.0);
      ctx.particles.setColorAt(i, col);
    });

    ctx.particles.instanceMatrix.needsUpdate = true;
    if (ctx.particles.instanceColor) ctx.particles.instanceColor.needsUpdate = true;
  }

  // ── Steam: wispy vapor rising above hot beaker ────────────────────────────

  _buildSteam(group) {
    const COUNT = 20;
    const puffs = [];

    for (let i = 0; i < COUNT; i++) {
      const mat = new THREE.SpriteMaterial({
        map      : this._steamTex,
        transparent: true,
        opacity  : 0,
        depthWrite: false,
        blending : THREE.AdditiveBlending,
        color    : new THREE.Color(0xd8eeff),
      });
      const sprite = new THREE.Sprite(mat);
      sprite.renderOrder = 9;

      const θ = Math.random() * Math.PI * 2;
      const r = Math.random() * BEAKER_R * 0.55;

      puffs.push({
        sprite, mat,
        phase : Math.random(),                  // stagger across cycle
        speed : 0.16 + Math.random() * 0.20,   // cycle speed (phase/sec)
        baseX : Math.cos(θ) * r,
        baseZ : Math.sin(θ) * r,
        θ,
      });
      group.add(sprite);
    }

    return { puffs };
  }

  _updateSteam(ctx, dt) {
    if (!ctx.steam) return;

    ctx.steam.puffs.forEach(p => {
      p.phase = (p.phase + p.speed * dt) % 1.0;
      const t = p.phase;

      // Y: rises from water surface up ~2.5 units
      const y = WATER_SURF_Y + 0.05 + t * 2.4;

      // Gentle horizontal sway
      const sway = Math.sin(t * Math.PI * 3.5 + p.θ * 2) * 0.10;

      p.sprite.position.set(p.baseX + sway, y, p.baseZ);

      // Scale grows as puff rises (thermal expansion)
      p.sprite.scale.setScalar(0.05 + t * 0.60);

      // Opacity: fade in and out over cycle — mostly opaque near mid-rise
      p.mat.opacity = Math.sin(t * Math.PI) * 0.40;
    });
  }

  // ── Crystal dissolve: fades crystal as diffusion progress rises ─────────────

  _updateCrystalDissolve(ctx, prog, dt) {
    if (!ctx.dropped) return;

    // Dissolve window: fully visible at prog≤0.15, fully invisible by prog=0.65
    // Both hot and cold use the same window; cold just reaches it later.
    const DISSOLVE_START = 0.15;
    const DISSOLVE_END   = 0.65;
    const t = Math.max(0, Math.min(
      (prog - DISSOLVE_START) / (DISSOLVE_END - DISSOLVE_START),
      1.0,
    ));
    const visibility = 1.0 - t;   // 1.0 (opaque) → 0.0 (gone)

    // Make crystal visible again if it was hidden but prog is low
    if (visibility > 0.05 && !ctx.glass.crystal.visible) {
      ctx.glass.crystal.visible = true;
    }

    ctx.glass.crystal.traverse(node => {
      if (node.isMesh && node.material) {
        node.material.opacity           = visibility * 0.88;
        node.material.emissiveIntensity = visibility * 0.60;
      }
      if (node.isLight) node.intensity  = visibility * 1.8;
    });

    // Fully hide once essentially invisible (avoid sub-pixel flickering)
    if (visibility <= 0.02) ctx.glass.crystal.visible = false;
  }

  // ── Condensation: free function — see below ────────────────────────────────
  // (called via _updateCondensation free function)

  // ── Speed annotation sprites ──────────────────────────────────────────────

  _buildSpeedSprite(text, accentColor) {
    const W = 380, H = 72;
    const canvas = document.createElement('canvas');
    canvas.width  = W; canvas.height = H;
    const c2d = canvas.getContext('2d');
    const hex = '#' + accentColor.toString(16).padStart(6, '0');

    c2d.fillStyle = 'rgba(8,18,42,0.90)';
    _roundRect2d(c2d, 2, 2, W - 4, H - 4, 16); c2d.fill();
    c2d.strokeStyle = hex; c2d.lineWidth = 2;
    _roundRect2d(c2d, 2, 2, W - 4, H - 4, 16); c2d.stroke();

    c2d.fillStyle = hex;
    c2d.font = 'bold 28px Inter, Arial, sans-serif';
    c2d.textAlign = 'center'; c2d.textBaseline = 'middle';
    c2d.shadowColor = hex; c2d.shadowBlur = 10;
    c2d.fillText(text, W / 2, H / 2);

    const tex    = new THREE.CanvasTexture(canvas);
    const mat    = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(mat);
    sprite.renderOrder = 15;
    return sprite;
  }
}

// ── Condensation (cold beaker exterior water droplets) ────────────────────────

function _buildCondensation(group) {
  const COUNT = 30;
  const drops = [];

  // Shared droplet material — water-like (blue, glossy, slightly transparent)
  const mat = new THREE.MeshPhysicalMaterial({
    color      : new THREE.Color(0xb8d8f8),
    transparent: true,
    opacity    : 0.78,
    roughness  : 0.04,
    metalness  : 0.0,
    transmission: 0.35,
    ior        : 1.33,
    depthWrite : false,
    side       : THREE.FrontSide,
  });

  for (let i = 0; i < COUNT; i++) {
    const radius = 0.009 + Math.random() * 0.020;  // droplet radius variation
    const geo    = new THREE.SphereGeometry(radius, 6, 5);
    const mesh   = new THREE.Mesh(geo, mat);
    mesh.renderOrder = 5;

    const θ  = Math.random() * Math.PI * 2;
    const y0 = WATER_BOT_Y + Math.random() * WATER_FILL * 0.85;

    // Flatten slightly so it looks like a droplet clinging to a flat surface
    mesh.scale.set(1, 0.55 + Math.random() * 0.25, 1);

    mesh.position.set(
      Math.cos(θ) * OUTER_BEAD_R,
      y0,
      Math.sin(θ) * OUTER_BEAD_R,
    );

    group.add(mesh);

    drops.push({
      mesh,
      θ,
      y    : y0,
      speed: 0.006 + Math.random() * 0.018,   // fall speed (units/sec)
    });
  }

  return { drops, mat };
}

function _updateCondensation(ctx, dt) {
  if (!ctx.condensation) return;

  ctx.condensation.drops.forEach(d => {
    d.y -= d.speed * dt;

    // Respawn near top of water column when reaching bottom
    if (d.y < WATER_BOT_Y + 0.08) {
      d.y = WATER_BOT_Y + WATER_FILL * (0.65 + Math.random() * 0.35);
      d.θ = Math.random() * Math.PI * 2;
    }

    d.mesh.position.set(
      Math.cos(d.θ) * OUTER_BEAD_R,
      d.y,
      Math.sin(d.θ) * OUTER_BEAD_R,
    );
  });
}

// ── Steam texture (soft Gaussian blob) ───────────────────────────────────────

function _makeSteamTex() {
  const S = 64;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d');
  const g   = ctx.createRadialGradient(S/2, S/2, 0, S/2, S/2, S/2);
  g.addColorStop(0,    'rgba(220,235,255,0.95)');
  g.addColorStop(0.30, 'rgba(220,235,255,0.65)');
  g.addColorStop(0.65, 'rgba(220,235,255,0.22)');
  g.addColorStop(1,    'rgba(220,235,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  return new THREE.CanvasTexture(c);
}

// ── Math helpers ──────────────────────────────────────────────────────────────

function _lerp(a, b, t)    { return a + (b - a) * t; }
function _easeInQuad(t)    { return t * t; }
function _easeOutQuad(t)   { return t * (2 - t); }
function _damp(cur, tgt, λ, dt) { return _lerp(cur, tgt, 1 - Math.exp(-λ * dt)); }

function _roundRect2d(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
