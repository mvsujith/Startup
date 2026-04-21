/**
 * BeakerBuilder.js
 *
 * Builds a complete beaker assembly:
 *   1. Water fill  — loaded from /Water.glb with a physical glass-water material
 *   2. Shimmer disc — thin circle that sits on the water surface and animates
 *   3. Glass shell  — loaded from /beaker.glb with transparent glass material
 *   4. Label sprite — canvas-drawn floating pill label above the beaker
 *
 * Water colour is driven externally by DiffusionSystem via the `water` reference
 * returned from this function.  The returned object conforms to the duck-typed
 * interface  { material: { color: THREE.Color } }  so DiffusionSystem can call
 * `water.material.color.lerpColors(...)` and it updates every Water.glb mesh
 * and the shimmer disc simultaneously.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

// Shared loader instance — avoids creating a new parser per call
const loader = new GLTFLoader();

/**
 * Creates one beaker assembly and adds it to the scene.
 *
 * @param {object}          opts
 * @param {THREE.Scene}     opts.scene
 * @param {THREE.Texture}   opts.envMap
 * @param {THREE.Vector3}   opts.position    - World-space root position
 * @param {string}          opts.label       - Floating label text
 * @param {number}          opts.labelColor  - Accent hex int (e.g. 0x3b82f6)
 * @param {number}          opts.waterColor  - Initial water hex tint
 * @param {number}          [opts.waterAlpha=0.55]
 * @param {Function}        [opts.onReady]   - Called after both GLBs have loaded
 *
 * @returns {{ group: THREE.Group, water: object, surface: THREE.Mesh }}
 *   `water` is a proxy whose `.material.color` updates all Water.glb meshes
 *   and the shimmer disc — DiffusionSystem depends on this interface.
 */
export function createBeakerAssembly(opts) {
  const {
    scene,
    envMap,
    position,
    label,
    labelColor,
    waterColor,
    waterAlpha = 0.55,
    onReady,
  } = opts;

  // ── Root group ────────────────────────────────────────────────────────────
  const group = new THREE.Group();
  group.name  = `Beaker_${label}`;
  group.position.copy(position);
  scene.add(group);

  // ── Shared water material ─────────────────────────────────────────────────
  // Applied to every mesh inside Water.glb.
  // DiffusionSystem updates this material's .color to show diffusion progress.
  const waterMat = new THREE.MeshPhysicalMaterial({
    color          : new THREE.Color(waterColor),
    transparent    : true,
    opacity        : waterAlpha,
    roughness      : 0.02,
    metalness      : 0.0,
    transmission   : 0.65,   // makes water look translucent
    thickness      : 0.5,
    ior            : 1.33,   // water refractive index
    envMap,
    envMapIntensity: 1.8,
    side           : THREE.FrontSide,
    depthWrite     : false,
  });

  // ── Duck-typed water proxy ────────────────────────────────────────────────
  // DiffusionSystem calls waterProxy.material.color.lerpColors(...) to tint
  // the water as diffusion progresses. Updating waterMat.color here updates
  // every mesh in Water.glb simultaneously (they all share this material).
  // NOTE: The old CircleGeometry shimmer disc has been removed — it appeared
  // as a solid plate inside the beaker that blocked drops.
  const waterProxy = {
    material: {
      color: {
        lerpColors(a, b, t) {
          waterMat.color.lerpColors(a, b, t);
        },
      },
    },
  };

  // ── Floating label ────────────────────────────────────────────────────────
  const labelSprite = buildLabelSprite(label, labelColor);
  labelSprite.position.set(0, 3.1, 0);
  labelSprite.scale.set(2.4, 0.7, 1);
  group.add(labelSprite);

  // ── Load Water.glb ────────────────────────────────────────────────────────
  // Loaded first so water appears before (or at same time as) the glass shell.
  let waterLoaded  = false;
  let beakerLoaded = false;
  const tryOnReady = () => {
    if (waterLoaded && beakerLoaded) {
      onReady?.({ group, water: waterProxy, labelSprite });
    }
  };

  loader.load(
    '/Water.glb',
    (gltf) => {
      const waterModel = gltf.scene;
      waterModel.name  = 'WaterModel';

      // Water.glb was authored to exactly match the beaker interior.
      // Use the same fixed scale and origin as beaker.glb — no auto-fit needed.
      waterModel.scale.set(0.6, 0.6, 0.6);
      waterModel.position.set(0, 0, 0);

      // Replace all materials with our shared waterMat so DiffusionSystem
      // can drive the colour via waterProxy (see above).
      waterModel.traverse((child) => {
        if (!child.isMesh) return;
        child.castShadow    = false;
        child.receiveShadow = true;
        child.renderOrder   = 1;

        // Dispose any embedded material to avoid a memory leak
        const disposeMat = (m) => m?.dispose?.();
        if (Array.isArray(child.material)) {
          child.material.forEach(disposeMat);
        } else {
          disposeMat(child.material);
        }

        child.material = waterMat; // hook into colour proxy
      });

      group.add(waterModel);
      waterLoaded = true;
      tryOnReady();
    },
    undefined,
    (err) => {
      console.warn('[BeakerBuilder] Water.glb failed to load — falling back to cylinder', err);
      // Fallback: restore the original cylinder if Water.glb is missing
      _addFallbackWater(group, waterMat);
      waterLoaded = true;
      tryOnReady();
    },
  );

  // ── Load beaker.glb glass shell ───────────────────────────────────────────
  loader.load(
    '/beaker.glb',
    (gltf) => {
      const model  = gltf.scene;
      model.name   = 'BeakerModel';

      model.traverse((child) => {
        if (!child.isMesh) return;
        child.castShadow    = true;
        child.receiveShadow = true;

        const applyGlass = (mat) => {
          if (!mat) return;
          mat.transparent     = true;
          mat.opacity         = 0.18;
          mat.roughness       = 0.04;
          mat.metalness       = 0.0;
          mat.envMap          = envMap;
          mat.envMapIntensity = 2.0;
          mat.color           = new THREE.Color(0xd0eeff);
          mat.side            = THREE.DoubleSide;
          mat.depthWrite      = false;
          mat.needsUpdate     = true;
        };

        if (Array.isArray(child.material)) {
          child.material.forEach(applyGlass);
        } else {
          applyGlass(child.material);
        }
      });

      model.scale.set(0.6, 0.6, 0.6);
      model.position.set(0, 0, 0);
      group.add(model);

      beakerLoaded = true;
      tryOnReady();
    },
    undefined,
    (err) => console.error('[BeakerBuilder] beaker.glb failed to load', err),
  );

  return { group, water: waterProxy, surface: null };
}

// ── Private helpers ───────────────────────────────────────────────────────────

/**
 * Fallback procedural water cylinder — used if Water.glb cannot be loaded.
 */
function _addFallbackWater(group, waterMat) {
  const geo  = new THREE.CylinderGeometry(0.50, 0.47, 1.55, 64, 1, false);
  const mesh = new THREE.Mesh(geo, waterMat);
  mesh.name        = 'WaterFallback';
  mesh.position.set(0, 0.82, 0);
  mesh.receiveShadow = true;
  mesh.renderOrder   = 1;
  group.add(mesh);
}

/**
 * Builds a canvas-based Sprite with a pill-shaped background and bold text.
 */
function buildLabelSprite(text, accentColor) {
  const W = 512, H = 128;
  const canvas = document.createElement('canvas');
  canvas.width  = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  const hex = '#' + accentColor.toString(16).padStart(6, '0');
  const r   = H / 2 - 4;

  // Background pill
  roundRect(ctx, 4, 4, W - 8, H - 8, r, 'rgba(12,25,50,0.88)');
  // Accent left bar
  roundRect(ctx, 4, 4, 10, H - 8, r, hex);

  // Text
  ctx.fillStyle    = '#ffffff';
  ctx.font         = `bold 44px "Inter", "Segoe UI", sans-serif`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor  = hex;
  ctx.shadowBlur   = 18;
  ctx.fillText(text, W / 2 + 8, H / 2);

  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  sprite.renderOrder = 10;
  return sprite;
}

function roundRect(ctx, x, y, w, h, r, fill) {
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
  ctx.fillStyle = fill;
  ctx.fill();
}
