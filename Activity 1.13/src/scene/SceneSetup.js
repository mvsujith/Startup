/**
 * SceneSetup.js — Camphor Sublimation Experiment
 *
 * Handles renderer, scene + environment, lighting, camera, and controls.
 * Lighting is tuned for a warm lab-burner atmosphere.
 */

import * as THREE from 'three';
import { OrbitControls }  from 'three/examples/jsm/controls/OrbitControls';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment';
import { PMREMGenerator }  from 'three';

// ─────────────────────────── Renderer ────────────────────────────────────────

/**
 * Creates and returns the WebGLRenderer attached to the given container element.
 */
export function createRenderer(container) {
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    logarithmicDepthBuffer: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace  = THREE.SRGBColorSpace;
  renderer.toneMapping       = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  container.appendChild(renderer.domElement);
  return renderer;
}

// ─────────────────────────── Scene ───────────────────────────────────────────

/**
 * Creates the Three.js Scene with a warm dark background.
 * Returns { scene, envMap }.
 */
export function createScene(renderer) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b1520);
  scene.fog = new THREE.FogExp2(0x0b1520, 0.022);

  const pmrem  = new PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envMap;
  pmrem.dispose();

  return { scene, envMap };
}

// ─────────────────────────── Lighting ────────────────────────────────────────

/**
 * Warm lab lighting:
 *   – Soft ambient (cool blue-white)
 *   – Key directional from upper-right (warm white)
 *   – Rim light from left-back (cool blue)
 *   – Orange point light simulating burner glow near the burner
 *   – Subtle overhead fill
 */
export function createLighting(scene) {
  // Ambient fill
  const ambient = new THREE.AmbientLight(0xc8deff, 0.40);
  scene.add(ambient);

  // Key directional (slightly warm, casts shadows)
  const keyLight = new THREE.DirectionalLight(0xfff4dd, 1.3);
  keyLight.position.set(6, 16, 8);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.width  = 2048;
  keyLight.shadow.mapSize.height = 2048;
  keyLight.shadow.camera.near   = 0.5;
  keyLight.shadow.camera.far    = 60;
  keyLight.shadow.camera.left   = -12;
  keyLight.shadow.camera.right  =  12;
  keyLight.shadow.camera.top    =  14;
  keyLight.shadow.camera.bottom = -14;
  keyLight.shadow.bias          = -0.0004;
  keyLight.shadow.normalBias    = 0.02;
  scene.add(keyLight);

  // Rim / back fill
  const rimLight = new THREE.DirectionalLight(0x9fc8ff, 0.35);
  rimLight.position.set(-7, 10, -6);
  scene.add(rimLight);

  // Burner glow — warm orange point light near wick
  const burnerGlowLight = new THREE.PointLight(0xff7700, 2.8, 7, 2);
  burnerGlowLight.position.set(0, 1.55, 0);
  scene.add(burnerGlowLight);

  // Secondary warm fill above the setup
  const topFill = new THREE.PointLight(0xffd580, 0.6, 14, 2);
  topFill.position.set(0, 8, 0);
  scene.add(topFill);

  return { keyLight, rimLight, ambient, burnerGlow: burnerGlowLight, topFill };
}

// ─────────────────────────── Convenience init ────────────────────────────────

/**
 * One-call setup: creates renderer, scene, and lighting.
 * Returns { renderer, scene, burnerGlow } so App.jsx only
 * needs one import to bootstrap the whole environment.
 */
export function initScene(container) {
  const renderer = createRenderer(container);
  const { scene } = createScene(renderer);
  const { burnerGlow } = createLighting(scene);
  return { renderer, scene, burnerGlow };
}

// Named re-export so App.jsx can: import { burnerGlow } from './scene/SceneSetup.js'
// Actually burnerGlow is instance-level not module-level, so App.jsx must use initScene().
// The export above is the correct pattern.

// ─────────────────────────── Camera ──────────────────────────────────────────

/**
 * Perspective camera positioned to see the full tall setup
 * (burner at y≈1.45 up to cotton plug at y≈5.75).
 */
export function createCamera(width, height) {
  const camera = new THREE.PerspectiveCamera(50, width / height, 0.05, 500);
  camera.position.set(0, 10, 14);
  camera.lookAt(0, 5, 0);
  return camera;
}

// ─────────────────────────── Controls ────────────────────────────────────────

/**
 * OrbitControls tuned for the camphor setup.
 */
export function createControls(camera, domElement) {
  const controls = new OrbitControls(camera, domElement);
  controls.enableDamping     = true;
  controls.dampingFactor     = 0.06;
  controls.screenSpacePanning = false;
  controls.enablePan         = true;
  controls.panSpeed          = 0.6;
  controls.minDistance       = 3;
  controls.maxDistance       = 30;
  controls.maxPolarAngle     = Math.PI / 2.05;
  controls.target.set(0, 5, 0);
  controls.update();
  return controls;
}
