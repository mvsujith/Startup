/**
 * CamphorScene.js
 *
 * Builds the static 3D lab setup for the camphor sublimation experiment:
 *   • Tripod stand + wire gauze
 *   • China dish (placed on gauze)
 *   • Crushed camphor pieces in the dish
 *   • Inverted glass funnel over the dish
 *   • Cotton plug on the funnel stem
 *   • Spirit burner beneath the stand
 *
 * All geometry is built from Three.js primitives — no external models needed.
 */

import * as THREE from 'three';

// ─────────────────────────── helpers ─────────────────────────────────────────

function mat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.08, ...opts });
}

function phong(color, opts = {}) {
  return new THREE.MeshPhongMaterial({ color, ...opts });
}

function addShadow(mesh) {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

// ─────────────────────────── China Dish ──────────────────────────────────────

/**
 * Creates a shallow china dish (white porcelain look) using a lathe geometry.
 * Returns a Group positioned at origin.
 */
function createChinaDish() {
  const group = new THREE.Group();
  group.name = 'ChinaDish';

  // Dish body via lathe
  const points = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24; // 0 → 1
    const radius = 0.72 * Math.sin(t * Math.PI * 0.5 + 0.08) + 0.08;
    const y      = t * 0.38;
    points.push(new THREE.Vector2(radius, y));
  }
  const latheGeo  = new THREE.LatheGeometry(points, 48);
  const dishMat   = new THREE.MeshStandardMaterial({
    color: 0xf5f0eb,
    roughness: 0.3,
    metalness: 0.0,
    side: THREE.DoubleSide,
  });
  const dishMesh  = new THREE.Mesh(latheGeo, dishMat);
  addShadow(dishMesh);
  group.add(dishMesh);

  // Thin base ring
  const baseGeo  = new THREE.TorusGeometry(0.09, 0.018, 12, 36);
  const baseMesh = new THREE.Mesh(baseGeo, dishMat);
  baseMesh.rotation.x = Math.PI / 2;
  baseMesh.position.y = 0.018;
  addShadow(baseMesh);
  group.add(baseMesh);

  return group;
}

// ─────────────────────────── Camphor Pieces ───────────────────────────────────

/**
 * Creates several crushed camphor chunks as irregular white/translucent crystals
 * scattered inside the dish.
 */
function createCamphorPieces() {
  const group = new THREE.Group();
  group.name = 'Camphor';

  const camphorMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.45,
    metalness: 0.0,
    transparent: true,
    opacity: 0.88,
  });

  const configs = [
    { px: 0.0,   pz:  0.0,  sx: 0.14, sy: 0.08, sz: 0.10, ry: 0.3  },
    { px: 0.22,  pz:  0.1,  sx: 0.09, sy: 0.06, sz: 0.07, ry: 1.1  },
    { px: -0.20, pz:  0.05, sx: 0.11, sy: 0.05, sz: 0.09, ry: -0.5 },
    { px: 0.10,  pz: -0.22, sx: 0.08, sy: 0.07, sz: 0.06, ry: 0.8  },
    { px: -0.12, pz: -0.18, sx: 0.10, sy: 0.06, sz: 0.08, ry: -1.2 },
    { px: 0.30,  pz: -0.08, sx: 0.07, sy: 0.05, sz: 0.06, ry: 0.2  },
    { px: -0.28, pz:  0.18, sx: 0.08, sy: 0.04, sz: 0.07, ry: 2.1  },
  ];

  configs.forEach(c => {
    // Use a dodecahedron for chunk-like camphor crystals
    const geo  = new THREE.DodecahedronGeometry(1, 0);
    const mesh = new THREE.Mesh(geo, camphorMat);
    mesh.scale.set(c.sx, c.sy, c.sz);
    mesh.position.set(c.px, c.sy * 0.5 + 0.04, c.pz);
    mesh.rotation.y = c.ry;
    mesh.rotation.x = Math.random() * 0.4 - 0.2;
    addShadow(mesh);
    group.add(mesh);
  });

  return group;
}

// ─────────────────────────── Inverted Funnel ─────────────────────────────────

/**
 * Creates an inverted glass funnel (wide end down, stem pointing up).
 * The funnel narrows from a wide bell to a thin cylindrical stem.
 */
function createFunnel() {
  const group = new THREE.Group();
  group.name = 'Funnel';

  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xaedff7,
    roughness: 0.05,
    metalness: 0.0,
    transmission: 0.82,
    transparent: true,
    opacity: 0.55,
    side: THREE.DoubleSide,
    depthWrite: false,
    ior: 1.46,
  });

  // Bell — ConeGeometry default: apex at +Y, wide base at -Y.
  // We position it so the wide base sits at group y=0 (over the dish)
  // and the apex is at group y=BELL_H (top, where the stem connects).
  // NO rotation needed — the default orientation IS the inverted funnel.
  const BELL_H  = 1.2;
  const bellGeo = new THREE.ConeGeometry(0.90, BELL_H, 40, 1, true);
  const bellMesh = new THREE.Mesh(bellGeo, glassMat);
  // offset so wide base is at local y=0 and apex at local y=BELL_H
  bellMesh.position.y = BELL_H / 2;
  group.add(bellMesh);

  // Rim ring at the wide (bottom) opening
  const rimGeo  = new THREE.TorusGeometry(0.90, 0.018, 10, 48);
  const rimMesh = new THREE.Mesh(rimGeo, glassMat);
  rimMesh.rotation.x = Math.PI / 2;
  rimMesh.position.y = 0.01;
  group.add(rimMesh);

  // Stem (cylinder pointing upward from top of bell)
  const STEM_H  = 0.85;
  const stemGeo  = new THREE.CylinderGeometry(0.065, 0.075, STEM_H, 20, 1, true);
  const stemMesh = new THREE.Mesh(stemGeo, glassMat);
  stemMesh.position.y = BELL_H + STEM_H / 2;
  group.add(stemMesh);

  // Junction ring between bell and stem
  const junctGeo  = new THREE.TorusGeometry(0.08, 0.015, 10, 32);
  const junctMesh = new THREE.Mesh(junctGeo, glassMat);
  junctMesh.rotation.x = Math.PI / 2;
  junctMesh.position.y = BELL_H;
  group.add(junctMesh);

  return group;
}

// ─────────────────────────── Cotton Plug ─────────────────────────────────────

/**
 * Creates a fluffy-looking cotton plug sitting on the funnel stem.
 * Built from overlapping ellipsoid-scaled spheres for a cottony look.
 */
function createCottonPlug() {
  const group = new THREE.Group();
  group.name = 'CottonPlug';

  const cottonMat = new THREE.MeshStandardMaterial({
    color: 0xf8f5f0,
    roughness: 0.95,
    metalness: 0.0,
  });

  // Main body — reduced horizontal (landscape) scale to fit the stem
  const bodyGeo  = new THREE.SphereGeometry(0.14, 16, 12);
  const bodyMesh = new THREE.Mesh(bodyGeo, cottonMat);
  bodyMesh.scale.set(0.60, 0.65, 0.60);  // narrower X/Z, same Y
  addShadow(bodyMesh);
  group.add(bodyMesh);

  // Fluffy bumps — also scaled narrower to match
  const bumpConfigs = [
    { px:  0.05, py:  0.02, pz:  0.04, r: 0.065 },
    { px: -0.05, py:  0.03, pz:  0.05, r: 0.060 },
    { px:  0.03, py:  0.02, pz: -0.05, r: 0.060 },
    { px: -0.04, py: -0.01, pz: -0.05, r: 0.055 },
    { px:  0.06, py: -0.01, pz: -0.02, r: 0.050 },
    { px: -0.06, py:  0.00, pz:  0.02, r: 0.055 },
  ];

  bumpConfigs.forEach(c => {
    const geo  = new THREE.SphereGeometry(c.r, 14, 10);
    const mesh = new THREE.Mesh(geo, cottonMat);
    mesh.position.set(c.px, c.py, c.pz);
    mesh.scale.set(0.65, 0.70, 0.65);  // narrower bumps too
    addShadow(mesh);
    group.add(mesh);
  });

  return group;
}

// ─────────────────────────── Tripod Stand ────────────────────────────────────

/**
 * Iron tripod stand with 3 splayed legs + a central ring.
 * Returns a Group at origin; the ring sits at a specific y height.
 */
function createTripodStand(ringY = 3.2) {
  const group = new THREE.Group();
  group.name = 'TripodStand';

  const ironMat = new THREE.MeshStandardMaterial({
    color: 0x2c2c2c,
    roughness: 0.7,
    metalness: 0.55,
  });

  // Vertical central pole
  const poleGeo  = new THREE.CylinderGeometry(0.038, 0.038, ringY, 12);
  const poleMesh = new THREE.Mesh(poleGeo, ironMat);
  poleMesh.position.y = ringY / 2;
  addShadow(poleMesh);
  group.add(poleMesh);

  // Ring at top
  const ringGeo  = new THREE.TorusGeometry(0.72, 0.035, 10, 48);
  const ringMesh = new THREE.Mesh(ringGeo, ironMat);
  ringMesh.rotation.x = Math.PI / 2;
  ringMesh.position.y = ringY;
  addShadow(ringMesh);
  group.add(ringMesh);

  // 3 legs
  const LEG_COUNT  = 3;
  const LEG_LENGTH = 1.45;
  const LEG_RADIUS = 0.035;
  for (let i = 0; i < LEG_COUNT; i++) {
    const angle    = (i / LEG_COUNT) * Math.PI * 2 - Math.PI / 6;
    const legGeo   = new THREE.CylinderGeometry(LEG_RADIUS, LEG_RADIUS * 0.85, LEG_LENGTH, 10);
    const legMesh  = new THREE.Mesh(legGeo, ironMat);
    const offsetX  = Math.cos(angle) * 0.78;
    const offsetZ  = Math.sin(angle) * 0.78;
    legMesh.position.set(offsetX * 0.5, LEG_LENGTH * 0.28, offsetZ * 0.5);
    // Tilt outward
    legMesh.rotation.z = Math.cos(angle) * 0.32;
    legMesh.rotation.x = Math.sin(angle) * 0.32;
    addShadow(legMesh);
    group.add(legMesh);

    // Foot disc
    const footGeo  = new THREE.CylinderGeometry(0.06, 0.07, 0.04, 12);
    const footMesh = new THREE.Mesh(footGeo, ironMat);
    footMesh.position.set(offsetX * 0.92, 0.04, offsetZ * 0.92);
    addShadow(footMesh);
    group.add(footMesh);
  }

  // Wire gauze on the ring (flat grid mesh)
  const gauzeGroup = createWireGauze(ringY);
  group.add(gauzeGroup);

  return group;
}

// ─────────────────────────── Wire Gauze ──────────────────────────────────────

function createWireGauze(y) {
  const group = new THREE.Group();
  group.name  = 'WireGauze';

  const wireMat = new THREE.MeshStandardMaterial({
    color: 0x888888,
    roughness: 0.5,
    metalness: 0.6,
    side: THREE.DoubleSide,
  });

  // Asbestos ceramic centre (white circle)
  const centreGeo  = new THREE.CircleGeometry(0.28, 30);
  const centreMat  = new THREE.MeshStandardMaterial({
    color: 0xd6d0c8,
    roughness: 0.8,
    metalness: 0.0,
    side: THREE.DoubleSide,
  });
  const centreMesh = new THREE.Mesh(centreGeo, centreMat);
  centreMesh.rotation.x = -Math.PI / 2;
  centreMesh.position.y = y + 0.004;
  group.add(centreMesh);

  // Grid wires — rows and columns
  const GRID    = 10;
  const SIZE    = 0.72;
  const WIRE_R  = 0.008;
  const WIRE_H  = 0.012;

  for (let i = -GRID / 2; i <= GRID / 2; i++) {
    const t = i / (GRID / 2);
    if (Math.abs(t) > 1) continue;

    // row (along X)
    const rowGeo  = new THREE.CylinderGeometry(WIRE_R, WIRE_R, SIZE * 2, 6);
    const rowMesh = new THREE.Mesh(rowGeo, wireMat);
    rowMesh.rotation.z = Math.PI / 2;
    rowMesh.position.set(0, y + WIRE_H, t * SIZE);
    group.add(rowMesh);

    // column (along Z)
    const colGeo  = new THREE.CylinderGeometry(WIRE_R, WIRE_R, SIZE * 2, 6);
    const colMesh = new THREE.Mesh(colGeo, wireMat);
    colMesh.rotation.x = Math.PI / 2;
    colMesh.position.set(t * SIZE, y + WIRE_H, 0);
    group.add(colMesh);
  }

  return group;
}

// ─────────────────────────── Spirit Burner ───────────────────────────────────

/**
 * Spirit / alcohol lamp burner:
 *   • Cylindrical glass bottle body
 *   • Metal cap ring
 *   • Wick tube coming out of the cap
 *   • Small wick tip
 * Placed below the tripod stand ring.
 */
function createSpiritBurner() {
  const group = new THREE.Group();
  group.name = 'SpiritBurner';

  // Bottle body
  const bottleMat = new THREE.MeshPhysicalMaterial({
    color: 0x88c4e0,
    roughness: 0.1,
    metalness: 0.0,
    transmission: 0.70,
    transparent: true,
    opacity: 0.65,
    depthWrite: false,
  });

  const BOTTLE_H = 1.05;
  const bottleGeo  = new THREE.CylinderGeometry(0.28, 0.26, BOTTLE_H, 32);
  const bottleMesh = new THREE.Mesh(bottleGeo, bottleMat);
  bottleMesh.position.y = BOTTLE_H / 2;
  addShadow(bottleMesh);
  group.add(bottleMesh);

  // Bottle base disc
  const baseGeo  = new THREE.CylinderGeometry(0.26, 0.26, 0.04, 32);
  const baseMat  = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.5, metalness: 0.3 });
  const baseMesh = new THREE.Mesh(baseGeo, baseMat);
  baseMesh.position.y = 0.02;
  addShadow(baseMesh);
  group.add(baseMesh);

  // Metal cap ring
  const capMat  = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.4, metalness: 0.7 });
  const capGeo  = new THREE.CylinderGeometry(0.285, 0.285, 0.1, 32);
  const capMesh = new THREE.Mesh(capGeo, capMat);
  capMesh.position.y = BOTTLE_H + 0.05;
  addShadow(capMesh);
  group.add(capMesh);

  // Cap disc (top surface)
  const capTopGeo  = new THREE.CircleGeometry(0.285, 32);
  const capTopMesh = new THREE.Mesh(capTopGeo, capMat);
  capTopMesh.rotation.x = -Math.PI / 2;
  capTopMesh.position.y = BOTTLE_H + 0.10;
  group.add(capTopMesh);

  // Wick tube
  const wickTubeMat  = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.6, metalness: 0.5 });
  const wickTubeGeo  = new THREE.CylinderGeometry(0.038, 0.038, 0.22, 12);
  const wickTubeMesh = new THREE.Mesh(wickTubeGeo, wickTubeMat);
  wickTubeMesh.position.y = BOTTLE_H + 0.21;
  group.add(wickTubeMesh);

  // Wick tip (small white cylinder)
  const wickMat  = new THREE.MeshStandardMaterial({ color: 0xddd0bb, roughness: 0.9 });
  const wickGeo  = new THREE.CylinderGeometry(0.020, 0.020, 0.08, 10);
  const wickMesh = new THREE.Mesh(wickGeo, wickMat);
  wickMesh.position.y = BOTTLE_H + 0.36;
  group.add(wickMesh);

  return group;
}

// ─────────────────────────── Lab Table ───────────────────────────────────────

/**
 * Creates a simple lab bench surface with legs.
 */
function createLabTable(scene) {
  // Smaller table so the scaled apparatus fills the view better
  const topGeo  = new THREE.BoxGeometry(9, 0.28, 6);
  const topMat  = new THREE.MeshStandardMaterial({ color: 0x8B6F47, roughness: 0.7, metalness: 0.05 });
  const topMesh = new THREE.Mesh(topGeo, topMat);
  topMesh.position.set(0, -0.14, 0);
  topMesh.receiveShadow = true;
  topMesh.castShadow    = true;
  scene.add(topMesh);

  // Table legs
  const legMat = new THREE.MeshStandardMaterial({ color: 0x6b5230, roughness: 0.8 });
  const legPositions = [
    [-4.1, -2.14, 2.6],
    [ 4.1, -2.14, 2.6],
    [-4.1, -2.14,-2.6],
    [ 4.1, -2.14,-2.6],
  ];
  legPositions.forEach(([x, y, z]) => {
    const legGeo  = new THREE.BoxGeometry(0.28, 4.0, 0.28);
    const legMesh = new THREE.Mesh(legGeo, legMat);
    legMesh.position.set(x, y, z);
    legMesh.castShadow    = true;
    legMesh.receiveShadow = true;
    scene.add(legMesh);
  });

  // Floor
  const floorGeo  = new THREE.PlaneGeometry(50, 50);
  const floorMat  = new THREE.MeshStandardMaterial({ color: 0x1a2535, roughness: 0.9 });
  const floorMesh = new THREE.Mesh(floorGeo, floorMat);
  floorMesh.rotation.x = -Math.PI / 2;
  floorMesh.position.y = -4.28;
  floorMesh.receiveShadow = true;
  scene.add(floorMesh);

  // Back wall
  const wallGeo  = new THREE.PlaneGeometry(50, 24);
  const wallMat  = new THREE.MeshStandardMaterial({ color: 0x0f1c30, roughness: 1.0 });
  const wallMesh = new THREE.Mesh(wallGeo, wallMat);
  wallMesh.position.set(0, 6, -6);
  wallMesh.receiveShadow = true;
  scene.add(wallMesh);
}

// ─────────────────────────── Label Sprites ───────────────────────────────────

/**
 * Creates a simple text label as a canvas-based sprite.
 */
function createLabel(text, color = '#ffe4b5') {
  const canvas  = document.createElement('canvas');
  canvas.width  = 512;
  canvas.height = 128;
  const ctx     = canvas.getContext('2d');

  // Background pill
  ctx.fillStyle = 'rgba(10,20,40,0.72)';
  ctx.beginPath();
  ctx.roundRect(8, 24, 496, 80, 16);
  ctx.fill();

  // Border
  ctx.strokeStyle = color;
  ctx.lineWidth   = 3;
  ctx.stroke();

  // Text
  ctx.fillStyle    = color;
  ctx.font         = 'bold 42px "Inter", sans-serif';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 64);

  const tex     = new THREE.CanvasTexture(canvas);
  const spriteMat = new THREE.SpriteMaterial({ map: tex, depthWrite: false, transparent: true });
  const sprite  = new THREE.Sprite(spriteMat);
  sprite.scale.set(2.8, 0.7, 1);
  return sprite;
}

// ─────────────────────────── Export builder ──────────────────────────────────

/**
 * Assembles the complete camphor sublimation setup into the scene.
 *
 * All apparatus is placed inside a scaled Group (APPARATUS_SCALE) so the
 * objects appear large and clear in the viewport.
 * Labels are added directly to the scene at pre-scaled world positions.
 *
 * Returns world-space positions (already multiplied by APPARATUS_SCALE)
 * so FlameSystem and SublimationSystem attach to the correct points.
 */
export function buildCamphorSetup(scene) {
  const ROOT_Y          = 0;    // table surface
  const APPARATUS_SCALE = 1.8;  // make all lab objects clearly visible

  // ── Lab table stays in scene at real scale ──
  createLabTable(scene);

  // ── Scaled group for all apparatus ──────────────────────────────────────
  const setupRoot = new THREE.Group();
  setupRoot.scale.setScalar(APPARATUS_SCALE);
  scene.add(setupRoot);

  // ── Tripod stand ──
  const RING_Y  = 3.2;
  const stand   = createTripodStand(RING_Y);
  stand.position.set(0, ROOT_Y, 0);
  setupRoot.add(stand);

  // ── Spirit burner ──
  const burner  = createSpiritBurner();
  burner.position.set(0, ROOT_Y, 0);
  setupRoot.add(burner);

  // ── China dish (on the gauze) ──
  const DISH_Y  = ROOT_Y + RING_Y + 0.02;
  const dish    = createChinaDish();
  dish.position.set(0, DISH_Y, 0);
  setupRoot.add(dish);

  // ── Camphor pieces ──
  const CAMPHOR_Y_LOCAL = DISH_Y + 0.04;
  const camphor         = createCamphorPieces();
  camphor.position.set(0, CAMPHOR_Y_LOCAL, 0);
  setupRoot.add(camphor);

  // ── Inverted funnel (wide base sits over dish, stem pointing up) ──
  // Lowered slightly so the rim properly overlaps the dish edge
  const FUNNEL_Y_LOCAL = DISH_Y + 0.22;
  const funnel         = createFunnel();
  funnel.position.set(0, FUNNEL_Y_LOCAL, 0);
  setupRoot.add(funnel);

  // ── Cotton plug (on stem tip) ──
  const BELL_H         = 1.2;
  const STEM_H         = 0.85;
  const COTTON_Y_LOCAL = FUNNEL_Y_LOCAL + BELL_H + STEM_H * 0.85;
  const cotton         = createCottonPlug();
  cotton.position.set(0, COTTON_Y_LOCAL, 0);
  setupRoot.add(cotton);

  // ── Labels added to scene at WORLD positions (local × APPARATUS_SCALE) ──
  // Label sprite scale stays at natural world size (2.8 × 0.7)
  const AS = APPARATUS_SCALE;

  const dishLabel = createLabel('China Dish', '#fcd34d');
  dishLabel.position.set(-3.2, (DISH_Y + 0.55) * AS, 0);
  scene.add(dishLabel);

  const camphorLabel = createLabel('Camphor', '#a5f3fc');
  camphorLabel.position.set(3.2, (CAMPHOR_Y_LOCAL + 0.4) * AS, 0);
  scene.add(camphorLabel);

  const funnelLabel = createLabel('Inverted Funnel', '#86efac');
  funnelLabel.position.set(-3.5, (FUNNEL_Y_LOCAL + BELL_H * 0.5) * AS, 0);
  scene.add(funnelLabel);

  const cottonLabel = createLabel('Cotton Plug', '#fda4af');
  cottonLabel.position.set(3.2, (COTTON_Y_LOCAL + 0.35) * AS, 0);
  scene.add(cottonLabel);

  const burnerLabel = createLabel('Spirit Burner', '#fb923c');
  burnerLabel.position.set(-3.2, 0.9 * AS, 0);
  scene.add(burnerLabel);

  const standLabel = createLabel('Tripod Stand', '#c4b5fd');
  standLabel.position.set(3.2, RING_Y * 0.45 * AS, 0);
  scene.add(standLabel);

  // ── World-space positions for Phase 2 systems ────────────────────────────
  // Wick tip: burner wick tip is at local y≈1.41, world y = local × AS
  const WICK_TIP_LOCAL = ROOT_Y + 1.41;
  const wickPosition   = new THREE.Vector3(0, WICK_TIP_LOCAL * AS, 0);

  return {
    stand,
    burner,
    dish,
    camphor,          // group ref — used for shrink animation in App.jsx
    funnel,
    cotton,
    wickPosition,
    dishY:     DISH_Y * AS,             // world-space dish surface Y (for HeatHaze)
    funnelRimY: FUNNEL_Y_LOCAL * AS,   // world-space funnel rim Y
    camphorY:   CAMPHOR_Y_LOCAL * AS,  // world-space camphor Y
  };
}
