import * as THREE from "three";

/**
 * LiftableObject.js
 * The main object to be lifted in the physics experiment.
 */

const BOX_SIZE = 1.5; // increased from 0.8
export const OBJECT_INITIAL_Y = BOX_SIZE / 2; // sits flush on ground

export function createLiftableObject(scene) {
  const group = new THREE.Group();
  group.name = "liftableObject";

  // Main body
  const bodyGeo = new THREE.BoxGeometry(BOX_SIZE, BOX_SIZE, BOX_SIZE);
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0xff4d2e,
    roughness: 0.4,
    metalness: 0.1,
    emissive: new THREE.Color(0xff2200),
    emissiveIntensity: 0.1,
  });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // Edge highlights
  const edgesGeo = new THREE.EdgesGeometry(bodyGeo);
  const edgesMat = new THREE.LineBasicMaterial({ color: 0xff9060, linewidth: 1 });
  const edges = new THREE.LineSegments(edgesGeo, edgesMat);
  group.add(edges);

  // "1 kg" label — floats ABOVE the block so it's always readable at any camera angle
  const labelSprite = makeObjectLabel("1 kg");
  // Position above the top face, centered, no Z offset — sprite always faces camera
  labelSprite.position.set(0, BOX_SIZE / 2 + 0.55, 0);
  labelSprite.scale.set(1.2, 0.55, 1);
  group.add(labelSprite);

  // Subtle glow light
  const glow = new THREE.PointLight(0xff6644, 0.5, 3.5);
  glow.position.set(0, 0, 0);
  group.add(glow);

  group.position.set(0, OBJECT_INITIAL_Y, 0);
  scene.add(group);

  return group;
}

function makeObjectLabel(text) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 96;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Pill background
  ctx.fillStyle = "rgba(0,0,0,0.65)";
  roundRect(ctx, 6, 10, 244, 76, 18);
  ctx.fill();

  // Border
  ctx.strokeStyle = "rgba(255,140,100,0.85)";
  ctx.lineWidth = 3;
  roundRect(ctx, 6, 10, 244, 76, 18);
  ctx.stroke();

  ctx.font = "bold 48px Arial, sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 128, 52);

  const texture = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
  return new THREE.Sprite(mat);
}

function roundRect(ctx, x, y, w, h, r) {
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

export function createGroundShadowCircle(scene) {
  const geo = new THREE.CircleGeometry(0.85, 32);
  const mat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.2, depthWrite: false });
  const circle = new THREE.Mesh(geo, mat);
  circle.rotation.x = -Math.PI / 2;
  circle.position.set(0, 0.01, 0);
  circle.renderOrder = 1;
  scene.add(circle);
  return circle;
}

export function updateShadowCircle(circle, objectHeight) {
  const t = THREE.MathUtils.clamp(objectHeight / 8, 0, 1);
  circle.material.opacity = 0.2 * (1 - t * 0.7);
  const scale = 1 + t * 0.6;
  circle.scale.set(scale, scale, scale);
}
