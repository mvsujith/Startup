import * as THREE from "three";

/**
 * PhysicsEngine.js
 * Handles fall animation, impact flash and squish for the liftable object.
 */

const G = 9.8; // gravitational acceleration m/s²

/**
 * startFall({ objectGroup, initialHeight, onUpdate, onLand })
 *
 * Runs a rAF-based fall simulation.
 * - objectGroup : the THREE.Group being animated
 * - initialHeight: metres above ground the block bottom starts from
 * - onUpdate(currentHeight, fallDistance): called every frame
 * - onLand(): called when the block reaches the ground
 *
 * Returns: { cancel } to stop mid-fall.
 */
export function startFall({ objectGroup, initialHeight, onUpdate, onLand }) {
  const OBJECT_HALF_H = objectGroup.userData.halfHeight ?? 0.75;
  let startTime = null;
  let rafId = null;
  let cancelled = false;

  function tick(timestamp) {
    if (cancelled) return;
    if (startTime === null) startTime = timestamp;

    const dt = (timestamp - startTime) / 1000; // seconds

    // Kinematic equation: h = h0 - ½gt²
    let h = initialHeight - 0.5 * G * dt * dt;
    const fallDistance = initialHeight - Math.max(h, 0);

    if (h <= 0) {
      h = 0;
      // Land: snap to ground, trigger squish
      objectGroup.position.y = OBJECT_HALF_H;
      objectGroup.scale.set(1, 1, 1);
      onUpdate(0, fallDistance);
      playImpactSquish(objectGroup);
      onLand(fallDistance);
      return; // stop loop
    }

    objectGroup.position.y = OBJECT_HALF_H + h;
    onUpdate(h, fallDistance);
    rafId = requestAnimationFrame(tick);
  }

  rafId = requestAnimationFrame(tick);

  return {
    cancel: () => {
      cancelled = true;
      if (rafId !== null) cancelAnimationFrame(rafId);
    },
  };
}

/**
 * Squish effect: compress Y briefly then spring back.
 */
function playImpactSquish(objectGroup) {
  const duration = 380; // ms
  const startTime = performance.now();

  function squishTick() {
    const t = Math.min((performance.now() - startTime) / duration, 1);
    // Phase 1 (0 → 0.4): squash down; Phase 2 (0.4 → 1): spring back
    let sy;
    if (t < 0.4) {
      sy = 1 - 0.35 * (t / 0.4);
    } else {
      const t2 = (t - 0.4) / 0.6;
      // Overshoot spring
      sy = 0.65 + 0.35 * (1 + Math.sin(t2 * Math.PI) * 0.25);
    }
    const sx = 1 + (1 - sy) * 0.6; // widen as it squashes
    objectGroup.scale.set(sx, sy, sx);

    if (t < 1) requestAnimationFrame(squishTick);
    else objectGroup.scale.set(1, 1, 1);
  }

  requestAnimationFrame(squishTick);
}

/**
 * Creates a ghost (semi-transparent) copy of the block for Compare mode.
 * Returns { ghostGroup, setHeight, show, hide }
 */
export function createGhostBlock(scene, color = 0x42a5f5) {
  const group = new THREE.Group();
  group.name = "ghostBlock";
  group.visible = false;

  const BOX = 1.5;
  const geo = new THREE.BoxGeometry(BOX, BOX, BOX);
  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.5,
    transparent: true,
    opacity: 0.38,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = 3;
  group.add(mesh);

  // Dashed outline
  const edgesGeo = new THREE.EdgesGeometry(geo);
  const edgesMat = new THREE.LineBasicMaterial({ color: 0x90caf9, linewidth: 1 });
  const edges = new THREE.LineSegments(edgesGeo, edgesMat);
  group.add(edges);

  // Label above ghost
  const label = makeGhostLabel();
  label.position.set(0, BOX / 2 + 0.55, 0);
  label.scale.set(1.2, 0.55, 1);
  group.add(label);

  // Position X offset so ghost doesn't overlap the real block
  group.position.set(2.5, BOX / 2, 0);
  scene.add(group);

  function setHeight(h, labelText) {
    group.position.y = h; // ghost block bottom = h (its local centre is already at BOX/2)
    updateGhostLabel(label, labelText);
  }

  return {
    ghostGroup: group,
    setHeight,
    show: () => { group.visible = true; },
    hide: () => { group.visible = false; },
  };
}

function makeGhostLabel(text = "") {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 96;
  const ctx = canvas.getContext("2d");
  drawGhostLabel(ctx, canvas, text);
  const texture = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
  const sprite = new THREE.Sprite(mat);
  sprite.userData.canvas = canvas;
  sprite.userData.ctx = ctx;
  sprite.userData.texture = texture;
  return sprite;
}

function updateGhostLabel(sprite, text) {
  const { canvas, ctx, texture } = sprite.userData;
  drawGhostLabel(ctx, canvas, text);
  texture.needsUpdate = true;
}

function drawGhostLabel(ctx, canvas, text) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "rgba(30,80,180,0.65)";
  roundRect(ctx, 6, 10, 244, 76, 18);
  ctx.fill();
  ctx.strokeStyle = "rgba(100,180,255,0.9)";
  ctx.lineWidth = 2;
  roundRect(ctx, 6, 10, 244, 76, 18);
  ctx.stroke();
  ctx.font = "bold 38px Arial, sans-serif";
  ctx.fillStyle = "#90caf9";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text || "Compare", 128, 52);
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
