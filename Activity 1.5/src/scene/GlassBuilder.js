/**
 * GlassBuilder.js — Phase 1 & 2: Diffusion Experiment
 *
 * Loads real GLB models:
 *   /beaker.glb  — realistic glass beaker
 *   /Water.glb   — water exported at EXACT same scale/origin as beaker
 *
 * Both models are scaled by the same factor (derived from beaker height)
 * so water fits beaker perfectly.  No separate water scaling.
 *
 * Removed: shimmer disc, aura ring.
 * Crystal: hidden by default — DiffusionVisuals shows it on "Drop Crystal".
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// ── Exported geometry constants (shared with DiffusionVisuals.js) ─────────────

export const BEAKER_H        = 2.80;            // target beaker height
export const WATER_FILL      = BEAKER_H * 0.78; // ≈ 2.184
export const WATER_BOT_Y     = 0.08;
export const WATER_SURF_Y    = WATER_BOT_Y + WATER_FILL; // ≈ 2.264
export const BEAKER_R_TOP    = 0.82;
export const BEAKER_R_BOT    = 0.74;
export const GLASS_THICKNESS = 0.055;
export const SEGMENTS        = 48;

export const HOT_WATER_COLOR  = new THREE.Color(0xfff5ec);
export const COLD_WATER_COLOR = new THREE.Color(0xedf7ff);

// ── GLB loader ──────────────────────────────────────────────────────────────

const _loader = new GLTFLoader();

export async function loadGlassModels() {
  const [beakerGLTF, waterGLTF] = await Promise.all([
    _loader.loadAsync('/beaker.glb'),
    _loader.loadAsync('/Water.glb'),
  ]);
  return { beakerGLTF, waterGLTF };
}

// ── Public API ────────────────────────────────────────────────────────────────

export function createGlassPair({ scene, envMap = null, beakerGLTF, waterGLTF }) {

  // ── Compute scale from beaker bounding box ────────────────────────────────
  beakerGLTF.scene.updateWorldMatrix(true, true);
  const refBBox = new THREE.Box3().setFromObject(beakerGLTF.scene);
  const refH    = refBBox.max.y - refBBox.min.y;
  const GLB_SCALE = refH > 0.0001 ? BEAKER_H / refH : 1.0;

  // X/Z centre offset for the beaker
  const refCenter = new THREE.Vector3();
  refBBox.getCenter(refCenter);

  // Water: use SAME scale and SAME min-Y offset as beaker — user exported both
  // at identical scale and origin so they fit perfectly.
  // We still need the water's X/Z centre in its own model space though.
  waterGLTF.scene.updateWorldMatrix(true, true);
  const waterBBox   = new THREE.Box3().setFromObject(waterGLTF.scene);
  const waterCenter = new THREE.Vector3();
  waterBBox.getCenter(waterCenter);

  const params = { GLB_SCALE, refBBox, refCenter, waterBBox, waterCenter };

  const hotGlass  = _buildGlass({ scene, envMap, position: new THREE.Vector3(-2.4, 0, 0), type: 'hot',  beakerGLTF, waterGLTF, ...params });
  const coldGlass = _buildGlass({ scene, envMap, position: new THREE.Vector3( 2.4, 0, 0), type: 'cold', beakerGLTF, waterGLTF, ...params });

  return { hotGlass, coldGlass };
}

// ── Private: build one glass ──────────────────────────────────────────────────

function _buildGlass({ scene, envMap, position, type,
                       beakerGLTF, waterGLTF,
                       GLB_SCALE, refBBox, refCenter,
                       waterBBox, waterCenter }) {

  const isHot      = type === 'hot';
  const waterColor = isHot ? HOT_WATER_COLOR  : COLD_WATER_COLOR;
  const accentHex  = isHot ? 0xff6a1a         : 0x1a9fff;
  const labelText  = isHot ? 'Hot Water'      : 'Cold Water';

  const group = new THREE.Group();
  group.name  = `Glass_${type}`;
  group.position.copy(position);
  scene.add(group);

  // ── 1. Glass material (MeshPhysical — transmission glass) ─────────────────
  const glassMat = new THREE.MeshPhysicalMaterial({
    color           : new THREE.Color(0xd8eeff),
    transparent     : true,
    opacity         : 0.18,
    roughness       : 0.02,
    metalness       : 0.0,
    transmission    : 0.88,
    thickness       : 0.15,
    ior             : 1.52,
    envMap,
    envMapIntensity  : 2.4,
    side            : THREE.DoubleSide,
    depthWrite      : false,
  });

  // ── 2. Clone & position beaker GLB ───────────────────────────────────────
  const beakerScene = beakerGLTF.scene.clone(true);
  beakerScene.scale.setScalar(GLB_SCALE);
  // Bottom lands at y = 0; centred on X/Z
  beakerScene.position.set(
    -refCenter.x * GLB_SCALE,
    -refBBox.min.y * GLB_SCALE,
    -refCenter.z * GLB_SCALE,
  );
  beakerScene.traverse(node => {
    if (node.isMesh) {
      node.material      = glassMat.clone();
      node.castShadow    = true;
      node.receiveShadow = false;
      node.renderOrder   = 0;
    }
  });
  group.add(beakerScene);

  // ── 3. Water material ───────────────────────────────────────────────────────
  const waterMat = new THREE.MeshPhysicalMaterial({
    color           : waterColor.clone(),
    transparent     : true,
    opacity         : 0.22,
    roughness       : 0.02,
    metalness       : 0.0,
    transmission    : 0.92,
    thickness       : 2.5,
    ior             : 1.33,
    envMap,
    envMapIntensity  : 2.0,
    side            : THREE.FrontSide,
    depthWrite      : false,
  });

  // ── 4. Clone Water.glb — same GLB_SCALE as beaker (exact fit) ───────────
  // Both models were exported at the same origin, so share the beaker's
  // centre offset for X/Z — this eliminates any leftward drift from the
  // water model having its own slightly different bounding-box centre.
  const waterScene = waterGLTF.scene.clone(true);
  waterScene.scale.setScalar(GLB_SCALE);
  waterScene.position.set(
    -refCenter.x * GLB_SCALE,     // ← use BEAKER centre, not water centre
    -refBBox.min.y * GLB_SCALE,   // same base Y as beaker
    -refCenter.z * GLB_SCALE,     // ← use BEAKER centre, not water centre
  );

  let waterMesh = null;
  waterScene.traverse(node => {
    if (node.isMesh) {
      node.material      = waterMat;   // shared instance — diffusion colours it
      node.renderOrder   = 1;
      node.receiveShadow = true;
      node.depthWrite    = false;
      if (!waterMesh) waterMesh = node;
    }
  });
  group.add(waterScene);

  // Fallback: procedural cylinder if Water.glb has no meshes
  if (!waterMesh) {
    const fbGeo  = new THREE.CylinderGeometry(BEAKER_R_TOP - 0.02, BEAKER_R_BOT - 0.02, WATER_FILL, SEGMENTS);
    const fbMesh = new THREE.Mesh(fbGeo, waterMat);
    fbMesh.position.y  = WATER_BOT_Y + WATER_FILL / 2;
    fbMesh.renderOrder = 1;
    fbMesh.depthWrite  = false;
    group.add(fbMesh);
    waterMesh = fbMesh;
    console.warn(`GlassBuilder [${type}]: Water.glb had no meshes — using fallback cylinder.`);
  }

  // ── 5. Crystal cluster — hidden until "Drop Crystal" is clicked ───────────
  const crystal = _buildCrystal({ type });
  crystal.scale.setScalar(3.0);
  crystal.position.set(0, WATER_SURF_Y + 0.30, 0);  // above water surface
  crystal.visible = false;   // ← hidden initially
  group.add(crystal);

  // ── 6. Floating label sprite ─────────────────────────────────────────────
  const labelSprite = _buildLabelSprite(labelText, accentHex, isHot);
  labelSprite.position.set(0, BEAKER_H + 0.80, 0);
  labelSprite.scale.set(2.6, 0.72, 1);
  group.add(labelSprite);

  // ── 7. Temperature badge ─────────────────────────────────────────────────
  const tempSprite = _buildTempSprite(isHot);
  tempSprite.position.set(0, BEAKER_H + 1.42, 0);
  tempSprite.scale.set(1.4, 0.50, 1);
  group.add(tempSprite);

  return {
    group,
    waterMesh,
    waterMat,
    crystal,
    type,
    crystalDropStartY : WATER_SURF_Y + 0.30,
    crystalDropEndY   : WATER_BOT_Y  + 0.10,
  };
}

// ── Crystal geometry ──────────────────────────────────────────────────────────

function _buildCrystal({ type }) {
  const group = new THREE.Group();
  group.name  = `Crystal_${type}`;

  const crystalMat = new THREE.MeshPhysicalMaterial({
    color            : new THREE.Color(0x1264ff),
    emissive         : new THREE.Color(0x0040ff),
    emissiveIntensity: 0.6,
    roughness        : 0.08,
    metalness        : 0.15,
    transparent      : true,
    opacity          : 0.88,
    transmission     : 0.20,
    ior              : 1.75,
    envMapIntensity  : 1.6,
  });

  const mainMesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.10, 0), crystalMat);
  mainMesh.scale.set(1.0, 1.5, 0.8);
  mainMesh.castShadow = true;
  group.add(mainMesh);

  [
    { pos: [ 0.08,  0.04,  0.04], s: 0.60, ry: 0.4 },
    { pos: [-0.07,  0.02, -0.05], s: 0.50, ry: 1.1 },
    { pos: [ 0.04,  0.01, -0.09], s: 0.55, ry: -0.7 },
    { pos: [-0.04,  0.05,  0.08], s: 0.45, ry: 2.0 },
  ].forEach(({ pos, s, ry }) => {
    const shard = new THREE.Mesh(new THREE.OctahedronGeometry(0.07, 0), crystalMat.clone());
    shard.position.set(...pos);
    shard.scale.set(s, s * 1.4, s * 0.7);
    shard.rotation.y = ry;
    shard.castShadow = true;
    group.add(shard);
  });

  const crystalLight = new THREE.PointLight(0x2266ff, 1.8, 1.8);
  crystalLight.position.set(0, 0.15, 0);
  group.add(crystalLight);

  return group;
}

// ── Label sprites ─────────────────────────────────────────────────────────────

function _buildLabelSprite(text, accentColor, isHot) {
  const W = 512, H = 128;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx2d = canvas.getContext('2d');
  const hex   = '#' + accentColor.toString(16).padStart(6, '0');
  const r     = H / 2 - 4;

  const grad = ctx2d.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, 'rgba(12,25,50,0.95)');
  grad.addColorStop(1, 'rgba(8,16,36,0.95)');
  _roundRect(ctx2d, 4, 4, W - 8, H - 8, r);
  ctx2d.fillStyle = grad; ctx2d.fill();

  ctx2d.strokeStyle = hex; ctx2d.lineWidth = 2.5;
  _roundRect(ctx2d, 4, 4, W - 8, H - 8, r); ctx2d.stroke();

  ctx2d.fillStyle = hex;
  _roundRect(ctx2d, 4, 4, 10, H - 8, r); ctx2d.fill();

  ctx2d.font = `bold 48px "Segoe UI Emoji", sans-serif`;
  ctx2d.textAlign = 'left'; ctx2d.textBaseline = 'middle';
  ctx2d.fillText(isHot ? '🔥' : '❄️', 30, H / 2);

  ctx2d.fillStyle = '#ffffff';
  ctx2d.font = `bold 44px "Inter", "Segoe UI", sans-serif`;
  ctx2d.textAlign = 'center'; ctx2d.textBaseline = 'middle';
  ctx2d.shadowColor = hex; ctx2d.shadowBlur = 16;
  ctx2d.fillText(text, W / 2 + 22, H / 2);

  const tex    = new THREE.CanvasTexture(canvas);
  const mat    = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  sprite.renderOrder = 10;
  return sprite;
}

function _buildTempSprite(isHot) {
  const W = 280, H = 90;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx2d  = canvas.getContext('2d');
  const temp   = isHot ? '≈ 80 °C' : '≈ 10 °C';
  const color  = isHot ? '#ff6a1a' : '#3ab4f2';

  ctx2d.fillStyle = 'rgba(12,20,40,0.88)';
  _roundRect(ctx2d, 4, 4, W - 8, H - 8, 18); ctx2d.fill();
  ctx2d.strokeStyle = color; ctx2d.lineWidth = 2;
  _roundRect(ctx2d, 4, 4, W - 8, H - 8, 18); ctx2d.stroke();

  ctx2d.fillStyle  = color;
  ctx2d.font       = `bold 40px "Inter", "Segoe UI", sans-serif`;
  ctx2d.textAlign  = 'center'; ctx2d.textBaseline = 'middle';
  ctx2d.shadowColor = color; ctx2d.shadowBlur = 12;
  ctx2d.fillText(temp, W / 2, H / 2);

  const tex    = new THREE.CanvasTexture(canvas);
  const mat    = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  sprite.renderOrder = 10;
  return sprite;
}

// ── Canvas helper ─────────────────────────────────────────────────────────────

function _roundRect(ctx, x, y, w, h, r) {
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
