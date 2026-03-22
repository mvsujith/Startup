import * as THREE from "three";

/**
 * HeightMarkers.js
 * Vertical ruler pole with tick marks, large readable labels,
 * and a glowing segment that tracks the lifted object's height.
 */

export const MAX_HEIGHT = 8; // metres (scene units)
export const MARKER_X = -2.2;
export const MARKER_Z = 0;

// ─── Pole ───────────────────────────────────────────────────────────────────
export function createHeightMarkers(scene) {
  const group = new THREE.Group();
  group.name = "heightMarkers";

  const POLE_HEIGHT = MAX_HEIGHT + 1;
  const poleBaseY = 0.01;
  const POLE_R = 0.045;
  const TICK_LEN = 0.32; // how far ticks stick out left from pole edge

  // Base pole — dark grey
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.5, metalness: 0.3 });
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(POLE_R, POLE_R, POLE_HEIGHT, 16),
    poleMat
  );
  pole.position.set(MARKER_X, poleBaseY + POLE_HEIGHT / 2, MARKER_Z);
  pole.castShadow = true;
  group.add(pole);

  // Arrow tip
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.38, 12), poleMat);
  tip.position.set(MARKER_X, poleBaseY + POLE_HEIGHT + 0.19, MARKER_Z);
  group.add(tip);

  // Tick marks extend LEFT from the pole surface
  const tickMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.5,
    emissive: new THREE.Color(0xffffff),
    emissiveIntensity: 0.2,
  });

  for (let h = 0; h <= MAX_HEIGHT; h++) {
    const thick = 0.03;
    // Tick centre is halfway along its length, starting at pole left edge
    const tickCenterX = MARKER_X - POLE_R - TICK_LEN / 2;
    const tick = new THREE.Mesh(new THREE.BoxGeometry(TICK_LEN, thick, thick), tickMat);
    tick.position.set(tickCenterX, poleBaseY + h, MARKER_Z);
    group.add(tick);
  }

  scene.add(group);
  return group;
}

// ─── Glow segment (rises with the object) ────────────────────────────────────
export function createGlowPole(scene) {
  // This is a separate glowing cylinder that we scale/move each frame
  const glowMat = new THREE.MeshStandardMaterial({
    color: 0x00e5ff,
    emissive: new THREE.Color(0x00e5ff),
    emissiveIntensity: 2.2,
    roughness: 0.0,
    metalness: 0.0,
    transparent: true,
    opacity: 0.88,
  });

  // We use a unit-height cylinder and scale its Y each frame
  const glowGeo = new THREE.CylinderGeometry(0.07, 0.07, 1, 16);
  const glowPole = new THREE.Mesh(glowGeo, glowMat);
  glowPole.position.set(MARKER_X, 0, MARKER_Z);
  glowPole.visible = false;
  glowPole.renderOrder = 2;
  scene.add(glowPole);

  // Point light that travels up with the glow top
  const glowLight = new THREE.PointLight(0x00e5ff, 1.2, 3.5);
  glowLight.position.set(MARKER_X, 0, MARKER_Z);
  scene.add(glowLight);

  function updateGlowHeight(objectHeight) {
    // objectHeight = how many metres the block has been lifted
    if (objectHeight < 0.05) {
      glowPole.visible = false;
      glowLight.intensity = 0;
      return;
    }
    glowPole.visible = true;
    // Scale cylinder to span from 0 → objectHeight
    glowPole.scale.y = objectHeight;
    glowPole.position.y = objectHeight / 2;

    // Light sits at the top of the glow
    glowLight.position.y = objectHeight;
    glowLight.intensity = 1.2;
  }

  return { glowPole, glowLight, updateGlowHeight };
}

// ─── Large readable labels ────────────────────────────────────────────────────
// Labels sit to the LEFT of the ticks, directly adjacent
const POLE_R = 0.045;
const TICK_LEN = 0.32;
// Tick left edge = MARKER_X - POLE_R - TICK_LEN
const TICK_LEFT_EDGE = MARKER_X - POLE_R - TICK_LEN; // ~MARKER_X - 0.365

export function createHeightLabelSprites(scene) {
  const sprites = [];
  const poleBaseY = 0.01;
  // Sprite width in world units
  const spriteW = 1.1;
  // Label centre is one half-width to the left of the tick's left edge
  const labelCenterX = TICK_LEFT_EDGE - spriteW / 2 - 0.05;

  for (let h = 0; h <= MAX_HEIGHT; h++) {
    const isEven = h % 2 === 0;
    const sprite = makeTextSprite(
      `${h} m`,
      h === 0 ? "#ff7043" : isEven ? "#ffffff" : "#dddddd",
      isEven ? 52 : 40
    );
    const yPos = poleBaseY + (h === 0 ? 0.26 : h);
    sprite.position.set(labelCenterX, yPos, MARKER_Z);
    sprite.scale.set(spriteW, isEven ? 0.48 : 0.38, 1);
    scene.add(sprite);
    sprites.push({ sprite, height: h });
  }

  return sprites;
}

function makeTextSprite(text, color, fontSize) {
  const cw = 256;
  const ch = 80;
  const canvas = document.createElement("canvas");
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, cw, ch);

  // Subtle dark pill background for contrast
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.beginPath();
  ctx.roundRect(4, 8, cw - 8, ch - 16, 14);
  ctx.fill();

  ctx.font = `bold ${fontSize}px Arial, sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, cw / 2, ch / 2);

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
  const sprite = new THREE.Sprite(material);
  return sprite;
}

// ─── Dashed height-indicator line ────────────────────────────────────────────
export function createHeightLine(scene) {
  const dashCount = 12;
  const group = new THREE.Group();
  group.name = "heightLine";

  const mat = new THREE.MeshStandardMaterial({
    color: 0xffeb3b,
    emissive: new THREE.Color(0xffeb3b),
    emissiveIntensity: 1.0,
    roughness: 1,
    metalness: 0,
  });
  for (let i = 0; i < dashCount; i++) {
    const dash = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.035, 0.035), mat);
    dash.position.set(MARKER_X + 0.3 + i * 0.22, 0, MARKER_Z);
    group.add(dash);
  }

  scene.add(group);

  function updateHeightLine(height) {
    group.position.y = height;
    group.visible = height > 0.05;
  }

  return { group, updateHeightLine };
}
