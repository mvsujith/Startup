/**
 * LabEnvironment.js — Phase 1
 * Builds the school-lab environment: floor, bench, back wall, and props.
 */

import * as THREE from 'three';

export function createLabEnvironment(scene) {
  _addFloor(scene);
  _addTable(scene);
  _addBackWall(scene);
  _addSideWall(scene);
  _addCeiling(scene);
  _addLabProps(scene);
}

// ── Floor ─────────────────────────────────────────────────────────────────────

function _addFloor(scene) {
  // Procedural tile pattern via canvas texture
  const tex = _makeTileTexture(512, 512, '#1a1e28', '#1e2232', 8);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 6);

  const geo = new THREE.PlaneGeometry(60, 60);
  const mat = new THREE.MeshStandardMaterial({
    map:       tex,
    roughness: 0.88,
    metalness: 0.04,
  });
  const floor = new THREE.Mesh(geo, mat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -4.6;
  floor.receiveShadow = true;
  scene.add(floor);
}

// ── Lab bench / table ─────────────────────────────────────────────────────────

function _addTable(scene) {
  // ─ Table surface
  const topGeo = new THREE.BoxGeometry(26, 0.22, 11);
  const topMat = new THREE.MeshStandardMaterial({
    color:     0x1e2228,
    roughness: 0.60,
    metalness: 0.12,
  });
  const top = new THREE.Mesh(topGeo, topMat);
  top.position.set(0, -0.11, 0); // top face sits at y = 0
  top.receiveShadow = true;
  top.castShadow   = true;
  scene.add(top);

  // ─ Front-edge highlight strip (lighter thin strip for depth)
  const edgeMat = new THREE.MeshStandardMaterial({
    color:     0x2c3242,
    roughness: 0.4,
    metalness: 0.25,
  });
  const edgeGeo = new THREE.BoxGeometry(26, 0.22, 0.06);
  const edge = new THREE.Mesh(edgeGeo, edgeMat);
  edge.position.set(0, -0.11, 5.53);
  scene.add(edge);

  // ─ Table support panel (front face)
  const panelGeo = new THREE.BoxGeometry(26, 4.2, 0.1);
  const panelMat = new THREE.MeshStandardMaterial({
    color:     0x181c22,
    roughness: 0.80,
    metalness: 0.05,
  });
  const panel = new THREE.Mesh(panelGeo, panelMat);
  panel.position.set(0, -2.32, 5.6);
  panel.receiveShadow = true;
  scene.add(panel);

  // ─ Table legs (4 metal legs)
  const legGeo = new THREE.BoxGeometry(0.28, 4.4, 0.28);
  const legMat = new THREE.MeshStandardMaterial({
    color:     0x14171e,
    roughness: 0.75,
    metalness: 0.15,
  });
  const legPositions = [
    [-11, -2.42, -4.5],
    [ 11, -2.42, -4.5],
    [-11, -2.42,  4.5],
    [ 11, -2.42,  4.5],
  ];
  legPositions.forEach(([x, y, z]) => {
    const leg = new THREE.Mesh(legGeo, legMat);
    leg.position.set(x, y, z);
    leg.castShadow = true;
    scene.add(leg);
  });

  // ─ Horizontal stretcher rail between legs
  const railGeo = new THREE.BoxGeometry(22, 0.1, 0.1);
  const railMat = new THREE.MeshStandardMaterial({ color: 0x14171e, roughness: 0.8 });
  const railF = new THREE.Mesh(railGeo, railMat);
  railF.position.set(0, -4.2, 4.5);
  scene.add(railF);
  const railB = railF.clone();
  railB.position.z = -4.5;
  scene.add(railB);
}

// ── Back wall ─────────────────────────────────────────────────────────────────

function _addBackWall(scene) {
  const wallGeo = new THREE.PlaneGeometry(60, 24);
  const wallMat = new THREE.MeshStandardMaterial({
    color:     0x131720,
    roughness: 0.95,
    metalness: 0.0,
  });
  const wall = new THREE.Mesh(wallGeo, wallMat);
  wall.position.set(0, 7, -7);
  wall.receiveShadow = true;
  scene.add(wall);

  // Subtle horizontal baseboard trim along wall
  const boardGeo = new THREE.BoxGeometry(26, 0.18, 0.08);
  const boardMat = new THREE.MeshStandardMaterial({ color: 0x1c2130, roughness: 0.7 });
  const board = new THREE.Mesh(boardGeo, boardMat);
  board.position.set(0, -0.09, -6.96);
  scene.add(board);

  // "Window" — glowing rectangular panel on wall suggesting natural light
  const winGeo = new THREE.PlaneGeometry(7, 4.5);
  const winMat = new THREE.MeshStandardMaterial({
    color:     0x8ab8d8,
    roughness: 0.0,
    metalness: 0.0,
    emissive:  new THREE.Color(0x4a80c0),
    emissiveIntensity: 0.55,
  });
  const win = new THREE.Mesh(winGeo, winMat);
  win.position.set(-8, 8, -6.9);
  scene.add(win);

  // Window frame
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x2a3040, roughness: 0.6 });
  [[7.4, 0.15, 0.1, 0, 0], [0.15, 4.7, 0.1, 0, 0]].forEach(([w, h]) => {
    const f1 = new THREE.Mesh(new THREE.BoxGeometry(w, 0.12, 0.12), frameMat);
    f1.position.set(-8, 10.35, -6.88);
    scene.add(f1);
    const f2 = new THREE.Mesh(new THREE.BoxGeometry(w, 0.12, 0.12), frameMat);
    f2.position.set(-8, 5.65, -6.88);
    scene.add(f2);
  });

  // Experiment title on wall (canvas texture plane)
  const titleTex = _makeTitleTexture();
  const titleGeo = new THREE.PlaneGeometry(6.5, 1.4);
  const titleMat = new THREE.MeshStandardMaterial({
    map:         titleTex,
    transparent: true,
    roughness:   0.6,
    depthWrite:  false,
  });
  const titleMesh = new THREE.Mesh(titleGeo, titleMat);
  titleMesh.position.set(4, 8.4, -6.88);
  scene.add(titleMesh);
}

// ── Side walls ────────────────────────────────────────────────────────────────

function _addSideWall(scene) {
  const geo = new THREE.PlaneGeometry(20, 24);
  const mat = new THREE.MeshStandardMaterial({ color: 0x111520, roughness: 0.95 });

  const left = new THREE.Mesh(geo, mat);
  left.rotation.y = Math.PI / 2;
  left.position.set(-13, 7, 0);
  scene.add(left);

  const right = left.clone();
  right.rotation.y = -Math.PI / 2;
  right.position.x = 13;
  scene.add(right);
}

// ── Ceiling ───────────────────────────────────────────────────────────────────

function _addCeiling(scene) {
  // Fluorescent panel light fixture (glowing rectangle)
  const lightPanelGeo = new THREE.PlaneGeometry(8, 1.2);
  const lightPanelMat = new THREE.MeshStandardMaterial({
    color:             0xd0e8ff,
    emissive:          new THREE.Color(0x90bbdd),
    emissiveIntensity: 1.0,
    roughness:         0.0,
  });
  const lightPanel = new THREE.Mesh(lightPanelGeo, lightPanelMat);
  lightPanel.rotation.x = Math.PI / 2;
  lightPanel.position.set(0, 14, 0);
  scene.add(lightPanel);

  // Housing frame
  const frameGeo = new THREE.BoxGeometry(8.4, 0.1, 1.6);
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x22283a, roughness: 0.5, metalness: 0.3 });
  const frame = new THREE.Mesh(frameGeo, frameMat);
  frame.position.set(0, 14.05, 0);
  scene.add(frame);
}

// ── Lab props ─────────────────────────────────────────────────────────────────

function _addLabProps(scene) {
  _addRuler(scene);
  _addBeaker(scene, -9.5, 0, -2);
  _addGraduatedCylinder(scene, 9, 0, -2.5);
  _addNotebook(scene);
}

function _addRuler(scene) {
  // A flat wooden ruler on the table
  const geo = new THREE.BoxGeometry(5.5, 0.05, 0.4);
  const mat = new THREE.MeshStandardMaterial({ color: 0xc8a850, roughness: 0.75, metalness: 0.0 });
  const ruler = new THREE.Mesh(geo, mat);
  ruler.position.set(-7, 0.025, 3.5);
  ruler.rotation.y = 0.1;
  ruler.castShadow    = true;
  ruler.receiveShadow = true;
  scene.add(ruler);

  // Ruler tick marks (tiny boxes)
  for (let i = 0; i <= 10; i++) {
    const tick = new THREE.Mesh(
      new THREE.BoxGeometry(0.015, 0.06, 0.3 * (i % 5 === 0 ? 1 : 0.5)),
      new THREE.MeshStandardMaterial({ color: 0x333322, roughness: 0.9 })
    );
    tick.position.set(-7 - 2.5 + i * 0.5, 0.054, 3.5);
    scene.add(tick);
  }
}

function _addBeaker(scene, x, y, z) {
  // Simplified glass beaker
  const outerGeo = new THREE.CylinderGeometry(0.52, 0.45, 1.6, 24, 1, true);
  const glassMat = new THREE.MeshPhysicalMaterial({
    color:        0xddeefa,
    transparent:  true,
    opacity:      0.22,
    roughness:    0.02,
    metalness:    0,
    transmission: 0.88,
    thickness:    0.04,
    side:         THREE.DoubleSide,
    depthWrite:   false,
  });
  const outer = new THREE.Mesh(outerGeo, glassMat);
  outer.position.set(x, y + 0.8, z);
  scene.add(outer);

  // Water inside
  const waterGeo = new THREE.CylinderGeometry(0.40, 0.36, 0.7, 24);
  const waterMat = new THREE.MeshPhysicalMaterial({
    color: 0x3080c0, transparent: true, opacity: 0.4,
    roughness: 0.0, depthWrite: false,
  });
  const water = new THREE.Mesh(waterGeo, waterMat);
  water.position.set(x, y + 0.37, z);
  scene.add(water);

  // Base disc
  const baseGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.08, 24);
  const baseMat = new THREE.MeshPhysicalMaterial({ color: 0xddeefa, transparent: true, opacity: 0.5, roughness: 0.02 });
  const base = new THREE.Mesh(baseGeo, baseMat);
  base.position.set(x, y + 0.04, z);
  scene.add(base);
}

function _addGraduatedCylinder(scene, x, y, z) {
  const cylGeo = new THREE.CylinderGeometry(0.22, 0.2, 2.4, 20, 1, true);
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xd8eef8, transparent: true, opacity: 0.20,
    roughness: 0.02, transmission: 0.9, thickness: 0.03,
    side: THREE.DoubleSide, depthWrite: false,
  });
  const cyl = new THREE.Mesh(cylGeo, glassMat);
  cyl.position.set(x, y + 1.2, z);
  scene.add(cyl);

  // Water inside (low fill)
  const wGeo = new THREE.CylinderGeometry(0.17, 0.16, 0.5, 20);
  const wMat = new THREE.MeshPhysicalMaterial({ color: 0x2070b0, transparent: true, opacity: 0.45, roughness: 0, depthWrite: false });
  const w = new THREE.Mesh(wGeo, wMat);
  w.position.set(x, y + 0.26, z);
  scene.add(w);

  // Base
  const bGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.1, 20);
  const bMat = new THREE.MeshPhysicalMaterial({ color: 0xd8eef8, transparent: true, opacity: 0.5, roughness: 0.03 });
  const b = new THREE.Mesh(bGeo, bMat);
  b.position.set(x, y + 0.05, z);
  scene.add(b);
}

function _addNotebook(scene) {
  // Spiral notebook lying on table
  const coverGeo = new THREE.BoxGeometry(2.2, 0.07, 2.8);
  const coverMat = new THREE.MeshStandardMaterial({ color: 0x0d2244, roughness: 0.7 });
  const cover = new THREE.Mesh(coverGeo, coverMat);
  cover.position.set(7.5, 0.035, 3.2);
  cover.rotation.y = -0.15;
  cover.castShadow = true;
  scene.add(cover);

  // Pages (white stack)
  const pagesGeo = new THREE.BoxGeometry(2.1, 0.04, 2.65);
  const pagesMat = new THREE.MeshStandardMaterial({ color: 0xe8e8dc, roughness: 0.9 });
  const pages = new THREE.Mesh(pagesGeo, pagesMat);
  pages.position.set(7.5, 0.09, 3.2);
  pages.rotation.y = -0.15;
  scene.add(pages);
}

// ── Texture helpers ───────────────────────────────────────────────────────────

function _makeTileTexture(w, h, colorA, colorB, tiles) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  const tileW = w / tiles;
  const tileH = h / tiles;
  for (let row = 0; row < tiles; row++) {
    for (let col = 0; col < tiles; col++) {
      ctx.fillStyle = (row + col) % 2 === 0 ? colorA : colorB;
      ctx.fillRect(col * tileW, row * tileH, tileW, tileH);
    }
  }
  // Grout lines
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i <= tiles; i++) {
    ctx.beginPath(); ctx.moveTo(i * tileW, 0); ctx.lineTo(i * tileW, h); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i * tileH); ctx.lineTo(w, i * tileH); ctx.stroke();
  }
  return new THREE.CanvasTexture(canvas);
}

function _makeTitleTexture() {
  const W = 1024, H = 224;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Semi-transparent background
  ctx.fillStyle = 'rgba(15, 22, 40, 0.90)';
  _roundRect(ctx, 0, 0, W, H, 20);
  ctx.fill();

  ctx.strokeStyle = 'rgba(80, 140, 220, 0.5)';
  ctx.lineWidth = 3;
  _roundRect(ctx, 3, 3, W - 6, H - 6, 18);
  ctx.stroke();

  // Title text
  ctx.fillStyle = '#e0eeff';
  ctx.font       = 'bold 68px Inter, Arial, sans-serif';
  ctx.textAlign  = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Compressibility of Matter', W / 2, H / 2 - 20);

  ctx.fillStyle = 'rgba(140, 180, 255, 0.7)';
  ctx.font      = '34px Inter, Arial, sans-serif';
  ctx.fillText('Syringe Compression Experiment', W / 2, H / 2 + 40);

  return new THREE.CanvasTexture(canvas);
}

function _roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
