import * as THREE from "three";

/**
 * Environment.js
 * Creates the ground plane, sky gradient background, and subtle
 * school-lab-style environment details (tiles, walls).
 */

export function createGround(scene) {
  // Tiled floor — slightly glossy stone tiles
  const tileTexture = generateTileTexture();

  const groundGeo = new THREE.PlaneGeometry(30, 30);
  const groundMat = new THREE.MeshStandardMaterial({
    map: tileTexture,
    roughness: 0.75,
    metalness: 0.05,
    color: 0xeff2f7,
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Subtle grid overlay
  const grid = new THREE.GridHelper(30, 30, 0xaaaacc, 0xccccdd);
  grid.material.opacity = 0.25;
  grid.material.transparent = true;
  scene.add(grid);

  return ground;
}

function generateTileTexture() {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#e8ecf4";
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = "#c5cad9";
  ctx.lineWidth = 3;
  ctx.strokeRect(4, 4, size - 8, size - 8);

  const grad = ctx.createRadialGradient(size * 0.3, size * 0.3, 0, size / 2, size / 2, size * 0.7);
  grad.addColorStop(0, "rgba(255,255,255,0.18)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 8);
  return tex;
}

export function createBackground(scene) {
  const skyGeo = new THREE.SphereGeometry(200, 32, 32);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: {
      topColor:    { value: new THREE.Color(0x1a3a6e) },
      bottomColor: { value: new THREE.Color(0x6aa6e0) },
      offset:      { value: 30 },
      exponent:    { value: 0.5 },
    },
    vertexShader: `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPos.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      uniform float offset;
      uniform float exponent;
      varying vec3 vWorldPosition;
      void main() {
        float h = normalize(vWorldPosition + offset).y;
        gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
      }
    `,
  });
  const sky = new THREE.Mesh(skyGeo, skyMat);
  scene.add(sky);
}

export function createWalls(scene) {
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0xf5f2e8,
    roughness: 0.9,
    metalness: 0.0,
  });

  const backWall = new THREE.Mesh(new THREE.PlaneGeometry(22, 14), wallMat);
  backWall.position.set(0, 7, -6);
  backWall.receiveShadow = true;
  scene.add(backWall);

  // Blackboard: centre y=8.5, height=4.5 → bottom edge at y=6.25
  const boardMat = new THREE.MeshStandardMaterial({
    color: 0x2d5a27,
    roughness: 0.95,
    metalness: 0.0,
  });
  const board = new THREE.Mesh(new THREE.PlaneGeometry(8, 4.5), boardMat);
  board.position.set(0, 8.5, -5.9);
  scene.add(board);

  const frameMat = new THREE.MeshStandardMaterial({ color: 0x8c6239, roughness: 0.8 });
  addBoardFrame(scene, board.position, 8, 4.5, frameMat);

  addChalkText(scene, board.position);

  return { backWall, board };
}

function addBoardFrame(scene, pos, w, h, mat) {
  const thickness = 0.1;
  const depth = 0.05;
  const borders = [
    { x: 0,               y: h / 2 + thickness / 2,  z: 0, sx: w + thickness * 2, sy: thickness, sz: depth },
    { x: 0,               y: -h / 2 - thickness / 2, z: 0, sx: w + thickness * 2, sy: thickness, sz: depth },
    { x: -w / 2 - thickness / 2, y: 0,               z: 0, sx: thickness, sy: h, sz: depth },
    { x:  w / 2 + thickness / 2, y: 0,               z: 0, sx: thickness, sy: h, sz: depth },
  ];
  borders.forEach(({ x, y, z, sx, sy, sz }) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat);
    mesh.position.set(pos.x + x, pos.y + y, pos.z + z + 0.03);
    scene.add(mesh);
  });
}

function addChalkText(scene, boardPos) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 320;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.font = "bold 80px 'Courier New', monospace";
  ctx.fillStyle = "rgba(240,240,220,0.95)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("W = m \u00d7 g \u00d7 h", canvas.width / 2, canvas.height / 2 - 45);

  ctx.font = "38px 'Courier New', monospace";
  ctx.fillStyle = "rgba(190,240,190,0.88)";
  ctx.fillText("Work = Force \u00d7 Height", canvas.width / 2, canvas.height / 2 + 55);

  const texture = new THREE.CanvasTexture(canvas);
  const geo = new THREE.PlaneGeometry(7.6, 4.0);
  const mat = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(boardPos.x, boardPos.y, boardPos.z + 0.01);
  scene.add(mesh);
}

// ─── Wall info cards below the blackboard ─────────────────────────────────────
const CARD_DATA = [
  {
    icon:  "🏋️",
    title: "Lifting Stores Energy",
    body:  "Lifting an object does work\nagainst gravity. Stored as GPE.",
    color: "#ffa726",
  },
  {
    icon:  "📐",
    title: "Formula: W = m \u00d7 g \u00d7 h",
    body:  "Mass(kg) \u00d7 9.8 m/s\u00b2 \u00d7 Height(m)\n= Joules of work done",
    color: "#42a5f5",
  },
  {
    icon:  "⬇️",
    title: "Falling Converts Energy",
    body:  "GPE \u2192 Kinetic Energy as it falls.\nAt ground: KE = \u00bdmv\u00b2",
    color: "#66bb6a",
  },
  {
    icon:  "📊",
    title: "More Height = More Energy",
    body:  "Double height \u2192 double energy.\nCompare heights side by side!",
    color: "#ce93d8",
  },
];

/**
 * Renders 4 canvas-textured info cards on the wall directly below the blackboard.
 * Call this after createWalls().
 */
export function createWallInfoCards(scene) {
  // Board bottom edge: y = 8.5 - 4.5/2 = 6.25
  // Make cards large enough to be clearly readable
  const CARD_W = 3.85;  // each card, ~half of board width
  const CARD_H = 2.4;   // tall enough for icon + title + body
  const GAP_X  = 0.18;
  const GAP_Y  = 0.18;
  const WALL_Z  = -5.87;

  // Two rows, two columns
  const rowY = [
    6.25 - GAP_Y - CARD_H / 2,
    6.25 - GAP_Y * 2 - CARD_H * 1.5,
  ];
  const colX = [-(CARD_W / 2 + GAP_X / 2), CARD_W / 2 + GAP_X / 2];

  CARD_DATA.forEach((data, i) => {
    const texture = makeCardTexture(data);
    const geo = new THREE.PlaneGeometry(CARD_W, CARD_H);
    const mat = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(colX[i % 2], rowY[Math.floor(i / 2)], WALL_Z);
    scene.add(mesh);
  });
}

function makeCardTexture({ icon, title, body, color }) {
  // Very high-res canvas — prevents blurry text in 3D
  const W = 2048, H = 768;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");

  // Dark card background
  ctx.fillStyle = "rgba(8,14,48,0.96)";
  rrPath(ctx, 4, 4, W - 8, H - 8, 48);
  ctx.fill();

  // Thick colored border
  ctx.strokeStyle = color;
  ctx.lineWidth = 10;
  rrPath(ctx, 4, 4, W - 8, H - 8, 48);
  ctx.stroke();

  // Left accent bar
  ctx.fillStyle = color;
  rrPath(ctx, 4, 4, 18, H - 8, 10);
  ctx.fill();

  // Icon (large)
  ctx.font = "110px serif";
  ctx.fillStyle = "#ffffff";
  ctx.textBaseline = "top";
  ctx.fillText(icon, 38, 36);

  // Title (large bold — crisp)
  ctx.font = "bold 90px 'Arial Black', Arial, sans-serif";
  ctx.fillStyle = color;
  ctx.fillText(title, 180, 40);

  // Divider line
  ctx.strokeStyle = color + "66";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(28, 200);
  ctx.lineTo(W - 28, 200);
  ctx.stroke();

  // Body text — two lines
  ctx.font = "72px Arial, sans-serif";
  ctx.fillStyle = "rgba(215,228,255,0.96)";
  body.split("\n").forEach((line, li) => {
    ctx.fillText(line, 36, 228 + li * 100);
  });

  const texture = new THREE.CanvasTexture(canvas);
  // Disable mipmap generation — this is the main cause of blurry text
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

function rrPath(ctx, x, y, w, h, r) {
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
