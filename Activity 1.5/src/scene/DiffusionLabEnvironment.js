/**
 * DiffusionLabEnvironment.js — Phase 1: Diffusion Experiment
 *
 * School lab scene tailored for the hot/cold water diffusion experiment:
 *   • Lab bench / table with polished dark surface
 *   • Back wall with experiment title panel
 *   • Side walls, ceiling, fluorescent tube
 *   • Floor with tile texture
 *   • Lab props: thermometers, notebook, pencil, extra glassware
 *   • Steam particles cloud above hot beaker (purely visual, no physics)
 */

import * as THREE from 'three';

// ── Public ─────────────────────────────────────────────────────────────────────

export function createDiffusionLabEnvironment(scene) {
  _addFloor(scene);
  _addTable(scene);
  _addBackWall(scene);
  _addSideWalls(scene);
  _addCeiling(scene);
  _addLabProps(scene);
}

// ── Floor ─────────────────────────────────────────────────────────────────────

function _addFloor(scene) {
  const tex = _makeTileTexture(512, 512, '#161a26', '#1b2035', 10);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 8);

  const geo = new THREE.PlaneGeometry(70, 70);
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85, metalness: 0.05 });
  const floor = new THREE.Mesh(geo, mat);
  floor.rotation.x   = -Math.PI / 2;
  floor.position.y   = -4.8;
  floor.receiveShadow = true;
  scene.add(floor);
}

// ── Table ──────────────────────────────────────────────────────────────────────

function _addTable(scene) {
  // Dark slate lab bench top
  const topMat = new THREE.MeshStandardMaterial({
    color:     0x12161e,
    roughness: 0.55,
    metalness: 0.18,
  });
  const top = new THREE.Mesh(new THREE.BoxGeometry(18, 0.24, 10), topMat);
  top.position.set(0, -0.12, 0.5);
  top.castShadow    = true;
  top.receiveShadow = true;
  scene.add(top);

  // Edge highlight
  const edgeMat = new THREE.MeshStandardMaterial({ color: 0x222840, roughness: 0.35, metalness: 0.30 });
  const edgeFront = new THREE.Mesh(new THREE.BoxGeometry(18, 0.24, 0.07), edgeMat);
  edgeFront.position.set(0, -0.12, 5.54);
  scene.add(edgeFront);

  // Front panel
  const panel = new THREE.Mesh(new THREE.BoxGeometry(18, 4.3, 0.08),
    new THREE.MeshStandardMaterial({ color: 0x0e1218, roughness: 0.80 }));
  panel.position.set(0, -2.41, 5.58);
  panel.receiveShadow = true;
  scene.add(panel);

  // 4 metal legs
  const legMat = new THREE.MeshStandardMaterial({ color: 0x0d1018, roughness: 0.7, metalness: 0.2 });
  [[-8, -3.5], [8, -3.5], [-8, 3.5], [8, 3.5]].forEach(([x, z]) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.26, 4.46, 0.26), legMat);
    leg.position.set(x, -2.47, z + 0.5);
    leg.castShadow = true;
    scene.add(leg);
  });

  // Stretcher rail
  const rail = new THREE.Mesh(new THREE.BoxGeometry(16.5, 0.09, 0.09),
    new THREE.MeshStandardMaterial({ color: 0x0d1018, roughness: 0.8 }));
  rail.position.set(0, -4.3, 3.5 + 0.5);
  scene.add(rail);
  const railBack  = rail.clone();
  railBack.position.z = -3.5 + 0.5;
  scene.add(railBack);
}

// ── Back wall ──────────────────────────────────────────────────────────────────

function _addBackWall(scene) {
  const mat = new THREE.MeshStandardMaterial({ color: 0x0f1420, roughness: 0.92 });
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(60, 26), mat);
  wall.position.set(0, 8, -6.5);
  wall.receiveShadow = true;
  scene.add(wall);

  // Baseboard
  const board = new THREE.Mesh(new THREE.BoxGeometry(18, 0.15, 0.07),
    new THREE.MeshStandardMaterial({ color: 0x1a2030, roughness: 0.7 }));
  board.position.set(0, -0.07, -6.44);
  scene.add(board);

  // Wall experiment title panel
  const titleTex = _makeTitleTexture();
  const titleMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(7.5, 1.8),
    new THREE.MeshStandardMaterial({ map: titleTex, transparent: true, roughness: 0.5, depthWrite: false })
  );
  titleMesh.position.set(0, 9.5, -6.44);
  scene.add(titleMesh);

  // Window (simulated natural light)
  const winMat = new THREE.MeshStandardMaterial({
    color:             0x79aec8,
    emissive:          new THREE.Color(0x3a70b0),
    emissiveIntensity: 0.55,
    roughness:         0.0,
  });
  const win = new THREE.Mesh(new THREE.PlaneGeometry(6.5, 4.2), winMat);
  win.position.set(-7.5, 8.5, -6.42);
  scene.add(win);

  // Window frame bars (horizontal + vertical)
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x243040, roughness: 0.6 });
  const hBar = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.10, 0.10), frameMat);
  hBar.position.set(-7.5, 8.5, -6.40);
  scene.add(hBar);
  const vBar = new THREE.Mesh(new THREE.BoxGeometry(0.10, 4.5, 0.10), frameMat);
  vBar.position.set(-7.5, 8.5, -6.40);
  scene.add(vBar);
  // outer frame
  const hTop = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.10, 0.10), frameMat);
  hTop.position.set(-7.5, 10.65, -6.40);
  scene.add(hTop);
  const hBot = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.10, 0.10), frameMat);
  hBot.position.set(-7.5, 6.35, -6.40);
  scene.add(hBot);
  const vLeft = new THREE.Mesh(new THREE.BoxGeometry(0.10, 4.5, 0.10), frameMat);
  vLeft.position.set(-10.9, 8.5, -6.40);
  scene.add(vLeft);
  const vRight = vLeft.clone();
  vRight.position.x = -4.1;
  scene.add(vRight);

  // Educational poster — observation questions
  const posterTex = _makeObservationPosterTexture();
  const poster = new THREE.Mesh(
    new THREE.PlaneGeometry(4.2, 3.8),
    new THREE.MeshStandardMaterial({ map: posterTex, transparent: true, roughness: 0.6, depthWrite: false })
  );
  poster.position.set(7.5, 8.0, -6.42);
  scene.add(poster);
}

// ── Side walls ─────────────────────────────────────────────────────────────────

function _addSideWalls(scene) {
  const mat = new THREE.MeshStandardMaterial({ color: 0x0d1118, roughness: 0.92 });

  const left = new THREE.Mesh(new THREE.PlaneGeometry(18, 26), mat);
  left.rotation.y  = Math.PI / 2;
  left.position.set(-12, 8, 0.5);
  scene.add(left);

  const right = left.clone();
  right.rotation.y = -Math.PI / 2;
  right.position.x = 12;
  scene.add(right);
}

// ── Ceiling ────────────────────────────────────────────────────────────────────

function _addCeiling(scene) {
  // Fluorescent tube
  const panelGeo = new THREE.PlaneGeometry(7, 1.0);
  const panelMat = new THREE.MeshStandardMaterial({
    color:             0xc8e0ff,
    emissive:          new THREE.Color(0x80b8d8),
    emissiveIntensity: 1.1,
    roughness:         0.0,
  });
  const panel = new THREE.Mesh(panelGeo, panelMat);
  panel.rotation.x  = Math.PI / 2;
  panel.position.set(0, 14.5, 0.5);
  scene.add(panel);

  // Housing
  const housing = new THREE.Mesh(
    new THREE.BoxGeometry(7.4, 0.12, 1.4),
    new THREE.MeshStandardMaterial({ color: 0x1e2438, roughness: 0.5, metalness: 0.3 })
  );
  housing.position.set(0, 14.56, 0.5);
  scene.add(housing);
}

// ── Lab props ──────────────────────────────────────────────────────────────────

function _addLabProps(scene) {
  _addThermometer(scene, -4.8, 0, 1.2);   // near hot glass
  _addThermometer(scene,  4.8, 0, 1.2);   // near cold glass
  _addNotebook(scene, 6.5, 0, 3.0);
  _addPencil(scene, 7.6, 0, 3.2);
  _addPropBeaker(scene, -7.5, 0, -1.5);
  _addGraduatedCylinder(scene, 8.0, 0, -2.0);
  _addSpatula(scene, 0, 0, 4.0);
}

function _addThermometer(scene, x, y, z) {
  // Tube
  const tube = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.035, 1.8, 12),
    new THREE.MeshPhysicalMaterial({
      color: 0xd8eeff, transparent: true, opacity: 0.50,
      roughness: 0.02, transmission: 0.80, thickness: 0.02,
      side: THREE.DoubleSide, depthWrite: false,
    })
  );
  tube.position.set(x, y + 0.9, z);
  scene.add(tube);

  // Bulb
  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.065, 14, 14),
    new THREE.MeshStandardMaterial({
      color: x < 0 ? 0xff3c00 : 0x00aaff,
      emissive: new THREE.Color(x < 0 ? 0xff2000 : 0x0088cc),
      emissiveIntensity: 0.6,
      roughness: 0.1,
    })
  );
  bulb.position.set(x, y + 0.065, z);
  scene.add(bulb);

  // Mercury column
  const mercury = new THREE.Mesh(
    new THREE.CylinderGeometry(0.020, 0.020, x < 0 ? 1.4 : 0.7, 8),
    new THREE.MeshStandardMaterial({
      color:  x < 0 ? 0xff4400 : 0x44aaff,
      emissive: new THREE.Color(x < 0 ? 0xff2200 : 0x2288ff),
      emissiveIntensity: 0.5,
    })
  );
  mercury.position.set(x, y + (x < 0 ? 0.83 : 0.48), z);
  scene.add(mercury);
}

function _addNotebook(scene, x, y, z) {
  const cover = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 0.07, 3.0),
    new THREE.MeshStandardMaterial({ color: 0x0c1f42, roughness: 0.7 })
  );
  cover.position.set(x, y + 0.035, z);
  cover.rotation.y = -0.12;
  cover.castShadow = true;
  scene.add(cover);

  const pages = new THREE.Mesh(
    new THREE.BoxGeometry(2.28, 0.042, 2.88),
    new THREE.MeshStandardMaterial({ color: 0xe8e8dc, roughness: 0.90 })
  );
  pages.position.set(x, y + 0.09, z);
  pages.rotation.y = -0.12;
  scene.add(pages);

  // Lines on the page
  for (let i = 0; i < 5; i++) {
    const line = new THREE.Mesh(
      new THREE.BoxGeometry(1.9, 0.006, 0.015),
      new THREE.MeshStandardMaterial({ color: 0xaaaaaa })
    );
    line.position.set(x, y + 0.114, z - 1.0 + i * 0.44);
    line.rotation.y = -0.12;
    scene.add(line);
  }
}

function _addPencil(scene, x, y, z) {
  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.036, 0.036, 1.8, 6),
    new THREE.MeshStandardMaterial({ color: 0xf0c040, roughness: 0.6 })
  );
  barrel.position.set(x, y + 0.036, z);
  barrel.rotation.z = Math.PI / 2;
  barrel.rotation.x = 0.15;
  scene.add(barrel);
}

function _addPropBeaker(scene, x, y, z) {
  const outerGeo = new THREE.CylinderGeometry(0.48, 0.42, 1.5, 22, 1, true);
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xd8eefa, transparent: true, opacity: 0.20,
    roughness: 0.02, transmission: 0.88, thickness: 0.04,
    side: THREE.DoubleSide, depthWrite: false,
  });
  const outer = new THREE.Mesh(outerGeo, glassMat);
  outer.position.set(x, y + 0.76, z);
  scene.add(outer);

  const water = new THREE.Mesh(
    new THREE.CylinderGeometry(0.37, 0.33, 0.65, 22),
    new THREE.MeshPhysicalMaterial({ color: 0x2880c0, transparent: true, opacity: 0.42, roughness: 0, depthWrite: false })
  );
  water.position.set(x, y + 0.35, z);
  scene.add(water);

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.42, 0.07, 22),
    new THREE.MeshPhysicalMaterial({ color: 0xd8eefa, transparent: true, opacity: 0.5, roughness: 0.02 })
  );
  base.position.set(x, y + 0.035, z);
  scene.add(base);
}

function _addGraduatedCylinder(scene, x, y, z) {
  const cyl = new THREE.Mesh(
    new THREE.CylinderGeometry(0.20, 0.18, 2.2, 18, 1, true),
    new THREE.MeshPhysicalMaterial({
      color: 0xd0eef8, transparent: true, opacity: 0.18,
      roughness: 0.02, transmission: 0.9, thickness: 0.03,
      side: THREE.DoubleSide, depthWrite: false,
    })
  );
  cyl.position.set(x, y + 1.1, z);
  scene.add(cyl);

  const w = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.14, 0.45, 18),
    new THREE.MeshPhysicalMaterial({ color: 0x2060a0, transparent: true, opacity: 0.45, roughness: 0, depthWrite: false })
  );
  w.position.set(x, y + 0.24, z);
  scene.add(w);

  const b = new THREE.Mesh(
    new THREE.CylinderGeometry(0.23, 0.23, 0.09, 18),
    new THREE.MeshPhysicalMaterial({ color: 0xd0eef8, transparent: true, opacity: 0.5, roughness: 0.03 })
  );
  b.position.set(x, y + 0.045, z);
  scene.add(b);
}

function _addSpatula(scene, x, y, z) {
  const handle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.025, 1.4, 8),
    new THREE.MeshStandardMaterial({ color: 0xd4b060, roughness: 0.6 })
  );
  handle.position.set(x, y + 0.025, z);
  handle.rotation.z = Math.PI / 2;
  handle.rotation.x = 0.1;
  scene.add(handle);

  const blade = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.025, 0.09),
    new THREE.MeshStandardMaterial({ color: 0xc0c8d8, roughness: 0.3, metalness: 0.6 })
  );
  blade.position.set(x + 0.97, y + 0.025, z + 0.1);
  blade.rotation.x = 0.1;
  scene.add(blade);
}

// ── Texture helpers ────────────────────────────────────────────────────────────

function _makeTileTexture(w, h, colorA, colorB, tiles) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  const tw = w / tiles, th = h / tiles;
  for (let r = 0; r < tiles; r++) {
    for (let c = 0; c < tiles; c++) {
      ctx.fillStyle = (r + c) % 2 === 0 ? colorA : colorB;
      ctx.fillRect(c * tw, r * th, tw, th);
    }
  }
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth   = 1.5;
  for (let i = 0; i <= tiles; i++) {
    ctx.beginPath(); ctx.moveTo(i * tw, 0); ctx.lineTo(i * tw, h); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i * th); ctx.lineTo(w, i * th); ctx.stroke();
  }
  return new THREE.CanvasTexture(canvas);
}

function _makeTitleTexture() {
  const W = 1024, H = 256;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  const grad = ctx.createLinearGradient(0, 0, W, 0);
  grad.addColorStop(0,   'rgba(20,10,50,0.94)');
  grad.addColorStop(0.5, 'rgba(10,22,55,0.96)');
  grad.addColorStop(1,   'rgba(20,10,50,0.94)');
  _roundRect(ctx, 0, 0, W, H, 24);
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.strokeStyle = 'rgba(80,160,255,0.55)';
  ctx.lineWidth   = 3;
  _roundRect(ctx, 3, 3, W - 6, H - 6, 22);
  ctx.stroke();

  // Accent bar
  const barGrad = ctx.createLinearGradient(0, 0, W, 0);
  barGrad.addColorStop(0, '#ff6a1a');
  barGrad.addColorStop(1, '#3ab4f2');
  ctx.fillStyle = barGrad;
  ctx.fillRect(40, H - 36, W - 80, 4);

  ctx.fillStyle    = '#e4f0ff';
  ctx.font         = 'bold 68px Inter, Arial, sans-serif';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor  = 'rgba(80,160,255,0.5)';
  ctx.shadowBlur   = 16;
  ctx.fillText('Diffusion in Liquids', W / 2, H / 2 - 22);

  ctx.fillStyle    = 'rgba(180,210,255,0.75)';
  ctx.font         = '34px Inter, Arial, sans-serif';
  ctx.shadowBlur   = 0;
  ctx.fillText('Hot Water vs Cold Water — Copper Sulphate', W / 2, H / 2 + 38);

  return new THREE.CanvasTexture(canvas);
}

function _makeObservationPosterTexture() {
  const W = 420, H = 380;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = 'rgba(8,18,42,0.95)';
  _roundRect(ctx, 0, 0, W, H, 18);
  ctx.fill();

  ctx.strokeStyle = 'rgba(100,180,255,0.4)';
  ctx.lineWidth   = 2;
  _roundRect(ctx, 3, 3, W - 6, H - 6, 16);
  ctx.stroke();

  const questions = [
    '🔬 Observation Questions',
    '',
    '1. What do you see just above',
    '   the crystal?',
    '2. What happens as time passes?',
    '3. What does this suggest about',
    '   particles of solid & liquid?',
    '4. Does mixing rate change',
    '   with temperature? Why?',
  ];

  questions.forEach((q, i) => {
    ctx.fillStyle    = i === 0 ? '#5cc8ff' : '#d0e8ff';
    ctx.font         = i === 0 ? 'bold 26px Inter, Arial, sans-serif' : '20px Inter, Arial, sans-serif';
    ctx.textAlign    = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(q, 20, 22 + i * 38);
  });

  return new THREE.CanvasTexture(canvas);
}

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
