import * as THREE from 'three';

/**
 * Builds and returns the complete lab table environment:
 *   - Tiled floor
 *   - Back wall with subtle panelling
 *   - Lab table (surface + legs)
 *   - Subtle reflective table top
 *   - Ambient decoration (pencil holder, notepad, ruler)
 */
export function createLabEnvironment(scene) {
  const group = new THREE.Group();
  group.name = 'LabEnvironment';

  // ── Tiled floor ──────────────────────────────────────────────────────────
  const floorGeo = new THREE.PlaneGeometry(60, 60, 1, 1);
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x1a2a3a,
    roughness: 0.75,
    metalness: 0.08,
  });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.02;
  floor.receiveShadow = true;
  group.add(floor);

  // Floor grid overlay for tile effect
  const gridHelper = new THREE.GridHelper(60, 30, 0x2a4060, 0x1e3050);
  gridHelper.material.opacity = 0.35;
  gridHelper.material.transparent = true;
  gridHelper.position.y = 0.001;
  group.add(gridHelper);

  // ── Back wall ────────────────────────────────────────────────────────────
  const wallGeo = new THREE.PlaneGeometry(40, 20, 1, 1);
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x1e2f45,
    roughness: 0.9,
    metalness: 0.0,
  });
  const wall = new THREE.Mesh(wallGeo, wallMat);
  wall.position.set(0, 10, -12);
  wall.receiveShadow = true;
  group.add(wall);

  // Horizontal wall panel strips
  for (let i = 0; i < 4; i++) {
    const stripGeo = new THREE.BoxGeometry(40, 0.06, 0.04);
    const stripMat = new THREE.MeshStandardMaterial({
      color: 0x2a4060,
      roughness: 0.6,
      metalness: 0.15,
    });
    const strip = new THREE.Mesh(stripGeo, stripMat);
    strip.position.set(0, 2 + i * 3.5, -11.97);
    group.add(strip);
  }

  // ── Lab table surface ────────────────────────────────────────────────────
  const tableW = 18;
  const tableD = 7;
  const tableH = 0.22;
  const tableTopY = 3.5;

  const tableGeo = new THREE.BoxGeometry(tableW, tableH, tableD);
  const tableMat = new THREE.MeshStandardMaterial({
    color: 0x2c4a6e,
    roughness: 0.25,
    metalness: 0.18,
    envMapIntensity: 1.0,
  });
  const tableTop = new THREE.Mesh(tableGeo, tableMat);
  tableTop.position.set(0, tableTopY, 0);
  tableTop.receiveShadow = true;
  tableTop.castShadow = true;
  group.add(tableTop);

  // Subtle reflective gloss layer on table top (thin offset quad)
  const glossGeo = new THREE.PlaneGeometry(tableW - 0.02, tableD - 0.02);
  const glossMat = new THREE.MeshStandardMaterial({
    color: 0x5b8dd9,
    roughness: 0.08,
    metalness: 0.0,
    transparent: true,
    opacity: 0.06,
    envMapIntensity: 2.0,
  });
  const gloss = new THREE.Mesh(glossGeo, glossMat);
  gloss.rotation.x = -Math.PI / 2;
  gloss.position.set(0, tableTopY + tableH / 2 + 0.001, 0);
  group.add(gloss);

  // Table edge trim (front)
  const trimGeo = new THREE.BoxGeometry(tableW, 0.08, 0.06);
  const trimMat = new THREE.MeshStandardMaterial({
    color: 0x1a3a5c,
    roughness: 0.3,
    metalness: 0.4,
  });
  const frontTrim = new THREE.Mesh(trimGeo, trimMat);
  frontTrim.position.set(0, tableTopY, tableD / 2);
  group.add(frontTrim);

  // Table legs
  const legGeo = new THREE.BoxGeometry(0.28, tableTopY, 0.28);
  const legMat = new THREE.MeshStandardMaterial({
    color: 0x1a3050,
    roughness: 0.4,
    metalness: 0.35,
  });
  const legPositions = [
    [-tableW / 2 + 0.3, tableTopY / 2, -tableD / 2 + 0.3],
    [tableW / 2 - 0.3, tableTopY / 2, -tableD / 2 + 0.3],
    [-tableW / 2 + 0.3, tableTopY / 2, tableD / 2 - 0.3],
    [tableW / 2 - 0.3, tableTopY / 2, tableD / 2 - 0.3],
  ];
  legPositions.forEach(([x, y, z]) => {
    const leg = new THREE.Mesh(legGeo, legMat);
    leg.position.set(x, y, z);
    leg.castShadow = true;
    leg.receiveShadow = true;
    group.add(leg);
  });

  // ── Decorative items ─────────────────────────────────────────────────────

  // Pencil holder (cylinder) — right side
  const holderGeo = new THREE.CylinderGeometry(0.22, 0.2, 0.7, 16);
  const holderMat = new THREE.MeshStandardMaterial({
    color: 0x3a6ea8,
    roughness: 0.4,
    metalness: 0.5,
  });
  const holder = new THREE.Mesh(holderGeo, holderMat);
  holder.position.set(7.5, tableTopY + tableH / 2 + 0.35, -1.8);
  holder.castShadow = true;
  group.add(holder);

  // Pencils inside holder
  const pencilColors = [0xffd700, 0xff6b6b, 0x90ee90];
  pencilColors.forEach((col, i) => {
    const pGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.1, 8);
    const pMat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.5 });
    const pencil = new THREE.Mesh(pGeo, pMat);
    pencil.position.set(
      7.5 + (i - 1) * 0.12,
      tableTopY + tableH / 2 + 0.9,
      -1.8 + (i % 2 === 0 ? 0.05 : -0.05)
    );
    pencil.rotation.z = (i - 1) * 0.12;
    pencil.castShadow = true;
    group.add(pencil);
  });

  // Notepad — left side
  const padGeo = new THREE.BoxGeometry(1.1, 0.06, 1.4);
  const padMat = new THREE.MeshStandardMaterial({
    color: 0xf5f0e8,
    roughness: 0.85,
    metalness: 0.0,
  });
  const pad = new THREE.Mesh(padGeo, padMat);
  pad.position.set(-7.2, tableTopY + tableH / 2 + 0.03, -1.6);
  pad.rotation.y = 0.15;
  pad.castShadow = true;
  pad.receiveShadow = true;
  group.add(pad);

  // Notepad lines
  for (let i = 0; i < 5; i++) {
    const lineGeo = new THREE.BoxGeometry(0.85, 0.007, 0.03);
    const lineMat = new THREE.MeshStandardMaterial({ color: 0xaacce0, roughness: 0.9 });
    const line = new THREE.Mesh(lineGeo, lineMat);
    line.position.set(-7.2, tableTopY + tableH / 2 + 0.065, -1.35 + i * 0.18);
    line.rotation.y = 0.15;
    group.add(line);
  }

  // Ruler
  const rulerGeo = new THREE.BoxGeometry(3.5, 0.04, 0.3);
  const rulerMat = new THREE.MeshStandardMaterial({
    color: 0xd4a843,
    roughness: 0.5,
    metalness: 0.15,
  });
  const ruler = new THREE.Mesh(rulerGeo, rulerMat);
  ruler.position.set(-5.5, tableTopY + tableH / 2 + 0.02, 1.5);
  ruler.rotation.y = -0.3;
  ruler.castShadow = true;
  group.add(ruler);

  scene.add(group);
  return { group, tableTopY, tableH };
}
