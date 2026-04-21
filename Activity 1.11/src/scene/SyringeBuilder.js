/**
 * SyringeBuilder.js — Phase 2
 *
 * Builds a complete 100 mL glass syringe.
 * Returns refs used by CompressionSystem to animate compression live.
 *
 * Coordinate system (group-local):
 *   y = 0  →  cork bottom (sits at world table surface)
 *   y+     →  up  (nozzle → shoulder → barrel → plunger handle)
 */
import * as THREE from 'three';

// ── Geometry constants ────────────────────────────────────────────────────
const B_R  = 0.42;   // barrel outer radius
const B_H  = 4.50;   // barrel height
const B_IR = 0.388;  // barrel inner radius

const C_H  = 0.22;   // cork height
const C_R  = 0.086;  // cork radius
const N_H  = 0.52;   // nozzle height
const N_RT = 0.13;   // nozzle radius (top)
const N_RB = 0.074;  // nozzle radius (bottom)
const SH_H = 0.24;   // shoulder height
const FL_H = 0.14;   // flange height

// ── Derived Y positions ───────────────────────────────────────────────────
const CORK_CEN_Y = C_H / 2;
const NOZ_CEN_Y  = C_H + N_H / 2;
const SH_CEN_Y   = C_H + N_H + SH_H / 2;
const BAR_BOT_Y  = C_H + N_H + SH_H;        // 0.98
const BAR_MID_Y  = BAR_BOT_Y + B_H / 2;     // 3.23
const BAR_TOP_Y  = BAR_BOT_Y + B_H;         // 5.48
const FL_CEN_Y   = BAR_TOP_Y - FL_H / 2;    // 5.41
const FILL_FRAC  = 0.74;
const PLUNGER_Y  = BAR_BOT_Y + B_H * FILL_FRAC; // 4.31

// ── Public API ────────────────────────────────────────────────────────────
/**
 * @returns {{ group, plungerGroup, airHaze, waterMesh, waterSurf, glowMesh,
 *             fillBot, fillH, PLUNGER_Y }}
 */
export function createSyringe({ scene, position, contents, label, index = 0 }) {
  const group = new THREE.Group();
  group.userData.baseX = position.x; // for shake-effect restoration

  _addCork(group);
  _addNozzle(group);
  _addShoulder(group);
  _addBarrel(group);
  _addFlange(group);
  _addGraduationMarks(group);

  // Contents — returns live-animation mesh refs
  const { airHaze, waterMesh, waterSurf } = _addContents(group, contents, index);

  // Plunger sub-group — CompressionSystem moves its .position.y
  const plungerGroup = _addPlunger(group);

  // Glow ring — driven by CompressionSystem
  const glowMesh = _addGlowRing(group);

  _addBarrelLabel(group, contents);

  group.position.set(position.x, 0, position.z);
  scene.add(group);

  // Placard lives in world space (not in floating group)
  _addTablePlacard(scene, position.x, label, contents);

  return {
    group, plungerGroup,
    airHaze, waterMesh, waterSurf, glowMesh,
    fillBot:   BAR_BOT_Y + 0.06,
    fillH:    (PLUNGER_Y - 0.20) - (BAR_BOT_Y + 0.06),
    PLUNGER_Y,
  };
}

// ── Cork ──────────────────────────────────────────────────────────────────
function _addCork(group) {
  const mat = new THREE.MeshStandardMaterial({ color: 0x7a1a14, roughness: 0.94 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(C_R + 0.006, C_R, C_H, 20), mat);
  body.position.y = CORK_CEN_Y;
  body.castShadow = true;
  group.add(body);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(C_R + 0.012, 0.009, 6, 20),
    new THREE.MeshStandardMaterial({ color: 0x5a100a, roughness: 0.92 })
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = C_H * 0.72;
  group.add(ring);
}

// ── Nozzle ────────────────────────────────────────────────────────────────
function _addNozzle(group) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(N_RT, N_RB, N_H, 24),
    new THREE.MeshPhysicalMaterial({ color: 0xd8eefa, transparent: true, opacity: 0.70, roughness: 0.03, depthWrite: false })
  );
  mesh.position.y = NOZ_CEN_Y;
  group.add(mesh);
}

// ── Shoulder ──────────────────────────────────────────────────────────────
function _addShoulder(group) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(B_R, N_RT, SH_H, 32),
    new THREE.MeshPhysicalMaterial({ color: 0xd8eefa, transparent: true, opacity: 0.68, roughness: 0.04, depthWrite: false })
  );
  mesh.position.y = SH_CEN_Y;
  group.add(mesh);
}

// ── Glass barrel ──────────────────────────────────────────────────────────
function _addBarrel(group) {
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xd8eefa, transparent: true, opacity: 0.32,
    roughness: 0.04, metalness: 0.05,
    transmission: 0.70, thickness: 0.06, ior: 1.50,
    side: THREE.DoubleSide, depthWrite: false, envMapIntensity: 1.5,
  });
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(B_R, B_R, B_H, 48, 1, true), glassMat);
  barrel.position.y  = BAR_MID_Y;
  barrel.renderOrder = 3;
  group.add(barrel);

  const ringMat = new THREE.MeshPhysicalMaterial({ color: 0xd8eefa, transparent: true, opacity: 0.75, roughness: 0.03 });
  const br = new THREE.Mesh(new THREE.CylinderGeometry(B_R, B_R, 0.08, 48), ringMat);
  br.position.y = BAR_BOT_Y + 0.04; br.renderOrder = 3; group.add(br);

  const tr = new THREE.Mesh(new THREE.CylinderGeometry(B_R, B_R, 0.06, 48), ringMat.clone());
  tr.position.y = BAR_TOP_Y - 0.03; tr.renderOrder = 3; group.add(tr);
}

// ── Flange / finger grips ─────────────────────────────────────────────────
function _addFlange(group) {
  const mat = new THREE.MeshStandardMaterial({ color: 0xb4c8d8, roughness: 0.55, metalness: 0.10 });
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(B_R + 0.03, B_R + 0.03, FL_H, 48), mat.clone());
  collar.position.y = FL_CEN_Y; group.add(collar);
  const wing1 = new THREE.Mesh(new THREE.BoxGeometry(0.38, FL_H, 0.22), mat.clone());
  wing1.position.set(-(B_R + 0.19), FL_CEN_Y, 0); group.add(wing1);
  const wing2 = wing1.clone(); wing2.position.x = B_R + 0.19; group.add(wing2);
}

// ── Graduation marks ──────────────────────────────────────────────────────
function _addGraduationMarks(group) {
  const mat = new THREE.MeshStandardMaterial({ color: 0x1a2840, roughness: 0.8 });
  for (let i = 1; i <= 9; i++) {
    const y   = BAR_BOT_Y + B_H * (i / 10);
    const len = i === 5 ? 0.26 : i % 2 === 0 ? 0.18 : 0.11;
    const m   = new THREE.Mesh(new THREE.BoxGeometry(len, 0.016, 0.016), mat);
    m.position.set(B_R + 0.006, y, 0);
    group.add(m);
  }
}

// ── Plunger — sub-group for compression ───────────────────────────────────
function _addPlunger(group) {
  // All plunger parts live here.
  // CompressionSystem moves plungerGroup.position.y = -travel to compress.
  const pg = new THREE.Group();
  group.add(pg);

  const sealMat  = new THREE.MeshStandardMaterial({ color: 0x0e0e0e, roughness: 0.96 });
  const metalMat = new THREE.MeshStandardMaterial({ color: 0xa8b4c0, roughness: 0.22, metalness: 0.84 });

  const SEAL_H = 0.28;
  const seal   = new THREE.Mesh(new THREE.CylinderGeometry(B_IR - 0.008, B_IR - 0.008, SEAL_H, 48), sealMat.clone());
  seal.position.y = PLUNGER_Y; seal.castShadow = true; pg.add(seal);

  const rib = new THREE.Mesh(new THREE.CylinderGeometry(B_IR - 0.008, B_IR - 0.008, 0.07, 48), sealMat.clone());
  rib.position.y = PLUNGER_Y + SEAL_H * 0.65; pg.add(rib);

  const adapter = new THREE.Mesh(
    new THREE.CylinderGeometry(0.11, 0.11, 0.30, 16),
    new THREE.MeshStandardMaterial({ color: 0xe0eaf4, roughness: 0.55 })
  );
  adapter.position.y = PLUNGER_Y + SEAL_H * 0.5 + 0.15; pg.add(adapter);

  const ROD_BOT = PLUNGER_Y + SEAL_H * 0.5 + 0.30;
  const ROD_TOP = BAR_TOP_Y + 1.75;
  const ROD_H   = ROD_TOP - ROD_BOT;
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, ROD_H, 16), metalMat.clone());
  rod.position.y = ROD_BOT + ROD_H / 2; rod.castShadow = true; pg.add(rod);

  const tBarMat = new THREE.MeshStandardMaterial({ color: 0x8a96a6, roughness: 0.28, metalness: 0.82 });
  const tBar = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.13, 0.15), tBarMat.clone());
  tBar.position.y = ROD_TOP; tBar.castShadow = true; pg.add(tBar);

  const tStem = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.30, 0.15), tBarMat.clone());
  tStem.position.y = ROD_TOP - 0.15; pg.add(tStem);

  const endMat = new THREE.MeshStandardMaterial({ color: 0x788090, roughness: 0.30, metalness: 0.78 });
  [-0.56, 0.56].forEach(x => {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), endMat);
    cap.position.set(x, ROD_TOP, 0); pg.add(cap);
  });

  return pg;
}

// ── Contents ─────────────────────────────────────────────────────────────
function _addContents(group, contents, index) {
  const fillBot = BAR_BOT_Y + 0.06;
  const fillTop = PLUNGER_Y - 0.20;
  const fillH   = fillTop - fillBot;

  let airHaze = null, waterMesh = null, waterSurf = null;

  if (contents === 'air') {
    airHaze = new THREE.Mesh(
      new THREE.CylinderGeometry(B_IR - 0.02, B_IR - 0.02, fillH, 32),
      new THREE.MeshStandardMaterial({ color: 0xb8ccdc, transparent: true, opacity: 0.055, depthWrite: false })
    );
    airHaze.position.y = fillBot + fillH / 2;
    group.add(airHaze);
  }

  if (contents === 'water') {
    waterMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(B_IR - 0.015, B_IR - 0.015, fillH, 48),
      new THREE.MeshPhysicalMaterial({
        color: 0x1460c8, transparent: true, opacity: 0.65,
        roughness: 0.0, transmission: 0.30, thickness: 0.9, depthWrite: false,
      })
    );
    waterMesh.position.y  = fillBot + fillH / 2;
    waterMesh.renderOrder = 1;
    group.add(waterMesh);

    waterSurf = new THREE.Mesh(
      new THREE.CircleGeometry(B_IR - 0.02, 48),
      new THREE.MeshStandardMaterial({ color: 0x50aaff, transparent: true, opacity: 0.85, roughness: 0.0, metalness: 0.25, side: THREE.DoubleSide, depthWrite: false })
    );
    waterSurf.rotation.x  = -Math.PI / 2;
    waterSurf.position.y  = fillTop + 0.01;
    waterSurf.renderOrder = 2;
    group.add(waterSurf);

    const bMat = new THREE.MeshPhysicalMaterial({ color: 0xd0eeff, transparent: true, opacity: 0.55, roughness: 0, depthWrite: false });
    const rng  = seededRandom(index * 77 + 13);
    for (let i = 0; i < 8; i++) {
      const r = 0.008 + rng() * 0.018;
      const b = new THREE.Mesh(new THREE.SphereGeometry(r, 7, 5), bMat);
      const a = rng() * Math.PI * 2, rd = rng() * (B_IR - 0.06);
      b.position.set(rd * Math.cos(a), fillBot + rng() * fillH * 0.6, rd * Math.sin(a));
      b.renderOrder = 1; group.add(b);
    }
  }

  if (contents === 'chalk') {
    const rng     = seededRandom(index * 100 + 42);
    const cMat    = new THREE.MeshStandardMaterial({ color: 0xf2f0e0, roughness: 0.98 });
    const dustMat = new THREE.MeshStandardMaterial({ color: 0xfafaf4, roughness: 1.0, transparent: true, opacity: 0.68 });

    for (let i = 0; i < 32; i++) {
      const t = rng(); let geo;
      if      (t > 0.55) { const r = 0.04 + rng() * 0.058; geo = new THREE.CylinderGeometry(r, r * 0.90, 0.08 + rng() * 0.26, 7); }
      else if (t > 0.25) { geo = new THREE.BoxGeometry(0.05 + rng() * 0.14, 0.04 + rng() * 0.20, 0.05 + rng() * 0.10); }
      else               { geo = new THREE.SphereGeometry(0.04 + rng() * 0.075, 7, 5); }
      const p = new THREE.Mesh(geo, cMat);
      const a = rng() * Math.PI * 2, r = rng() * (B_IR - 0.10);
      p.position.set(r * Math.cos(a), fillBot + rng() * fillH * 0.94, r * Math.sin(a));
      p.rotation.set(rng() * Math.PI, rng() * Math.PI, rng() * Math.PI);
      p.castShadow = true; group.add(p);
    }
    for (let i = 0; i < 22; i++) {
      const d = new THREE.Mesh(new THREE.SphereGeometry(0.007 + rng() * 0.022, 5, 4), dustMat);
      const a = rng() * Math.PI * 2, r = rng() * (B_IR - 0.05);
      d.position.set(r * Math.cos(a), fillBot + rng() * fillH * 0.35, r * Math.sin(a));
      group.add(d);
    }
  }

  return { airHaze, waterMesh, waterSurf };
}

// ── Glow ring (driven by CompressionSystem) ────────────────────────────────
function _addGlowRing(group) {
  const mat = new THREE.MeshStandardMaterial({
    color: 0x00ff88, emissive: new THREE.Color(0x00ff88), emissiveIntensity: 0,
    transparent: true, opacity: 0, side: THREE.BackSide, depthWrite: false,
  });
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(B_R + 0.10, B_R + 0.10, B_H, 32, 1, true), mat);
  mesh.position.y  = BAR_MID_Y;
  mesh.renderOrder = 5;
  group.add(mesh);
  return mesh;
}

// ── Barrel label (Sprite — always faces camera) ────────────────────────────
function _addBarrelLabel(group, contents) {
  const W = 512, H = 160;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  const ACCENT = contents === 'water' ? '#1460c8' : contents === 'chalk' ? '#6d4c41' : '#2e7d32';
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(255,255,255,0.96)';
  _rr(ctx, 10, 10, W - 20, H - 20, 16); ctx.fill();
  ctx.strokeStyle = ACCENT; ctx.lineWidth = 5;
  _rr(ctx, 10, 10, W - 20, H - 20, 16); ctx.stroke();

  const name = contents === 'air' ? 'AIR' : contents === 'water' ? 'WATER' : 'CHALK';
  ctx.fillStyle = ACCENT; ctx.font = 'bold 68px Inter, Arial, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(name, W / 2, H / 2 - 12);
  ctx.fillStyle = '#777'; ctx.font = '28px Inter, Arial, sans-serif';
  ctx.fillText('100 mL Syringe', W / 2, H / 2 + 38);

  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true, depthWrite: false }));
  sprite.scale.set(1.40, 0.44, 1);
  sprite.position.set(0, BAR_BOT_Y + B_H * 0.28, 0);
  sprite.renderOrder = 4;
  group.add(sprite);
}

// ── Table placard (world space — never clips table) ────────────────────────
function _addTablePlacard(scene, posX, label, contents) {
  const W = 640, H = 96;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  const ACCENT = contents === 'water' ? '#1e88e5' : contents === 'chalk' ? '#bcaaa4' : '#66bb6a';
  const BG     = contents === 'water' ? 'rgba(8,24,60,0.95)' : contents === 'chalk' ? 'rgba(35,26,16,0.95)' : 'rgba(8,32,16,0.95)';

  ctx.fillStyle = BG; _rr(ctx, 0, 0, W, H, 14); ctx.fill();
  ctx.strokeStyle = ACCENT; ctx.lineWidth = 3; _rr(ctx, 2, 2, W - 4, H - 4, 12); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.font = 'bold 38px Inter, Arial, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(label, W / 2, H / 2);

  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(2.60, 0.39),
    new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true, roughness: 0.35, depthWrite: true })
  );
  plane.rotation.x = -Math.PI / 2;
  plane.position.set(posX, 0.012, 2.8);
  plane.renderOrder = 5;
  scene.add(plane);
}

// ── Helpers ───────────────────────────────────────────────────────────────
function seededRandom(seed) {
  let s = seed | 0;
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
}

function _rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
