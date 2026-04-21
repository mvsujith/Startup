/**
 * DiffusionSceneSetup.js — Phase 1: Diffusion Experiment
 *
 * Sets up:
 *   • WebGLRenderer   (ACESFilmic, PCFSoft shadows)
 *   • Scene           (dark-lab background + fog)
 *   • Lighting        (overhead fluorescent + warm/cold accent lights)
 *   • Camera          (perspective, framed on the two glasses)
 *   • OrbitControls   (damped, constrained)
 *   • PMREMGenerator  (environment map for glass reflections)
 */

import * as THREE from 'three';
import { OrbitControls }   from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment }  from 'three/addons/environments/RoomEnvironment.js';

// ── Renderer ──────────────────────────────────────────────────────────────────

export function createRenderer(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.shadowMap.enabled  = true;
  renderer.shadowMap.type     = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace   = THREE.SRGBColorSpace;
  renderer.toneMapping        = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.92;
  container.appendChild(renderer.domElement);
  return renderer;
}

// ── Scene ─────────────────────────────────────────────────────────────────────

export function createScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x080d18);
  scene.fog = new THREE.FogExp2(0x080d18, 0.016);
  return scene;
}

// ── Environment map (for glass + water reflections) ───────────────────────────

export function createEnvMap(renderer) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();

  // Synthetic room-scale environment: warm top, cool bottom
  const rt = pmrem.fromScene(new RoomEnvironment(), 0.04);
  pmrem.dispose();
  return rt.texture;
}

// ── Lighting ──────────────────────────────────────────────────────────────────

export function createLighting(scene) {
  // ── Ambient (soft cool-blue lab ambient)
  scene.add(new THREE.AmbientLight(0xc8d8f0, 0.48));

  // ── Main overhead directional (fluorescent cool-white)
  const main = new THREE.DirectionalLight(0xfff4e8, 3.2);
  main.position.set(4, 18, 8);
  main.castShadow = true;
  main.shadow.mapSize.setScalar(2048);
  main.shadow.camera.near   =  0.5;
  main.shadow.camera.far    = 60;
  main.shadow.camera.left   = -12;
  main.shadow.camera.right  =  12;
  main.shadow.camera.top    =  12;
  main.shadow.camera.bottom = -12;
  main.shadow.bias = -0.0004;
  scene.add(main);

  // ── Cool fill from opposite side
  const fill = new THREE.DirectionalLight(0xa0c4ff, 1.1);
  fill.position.set(-10, 8, 4);
  scene.add(fill);

  // ── Warm rim behind the scene
  const rim = new THREE.DirectionalLight(0xffd0a0, 0.65);
  rim.position.set(0, 4, -16);
  scene.add(rim);

  // ── Hot-glass accent: warm orange point light (reduced intensity for subtlety)
  const hotLight = new THREE.PointLight(0xff7a30, 1.4, 3.5);
  hotLight.position.set(-2.4, 3.8, 0.8);
  hotLight.castShadow = false;
  scene.add(hotLight);

  // ── Cold-glass accent: cool blue point light (reduced intensity for subtlety)
  const coldLight = new THREE.PointLight(0x3ab4f2, 1.2, 3.5);
  coldLight.position.set(2.4, 3.8, 0.8);
  coldLight.castShadow = false;
  scene.add(coldLight);

  // ── Overhead spot for dramatic glass sparkle
  const spot = new THREE.SpotLight(0xfff8f0, 5.0, 20, Math.PI * 0.18, 0.3, 1.2);
  spot.position.set(0, 14, 2);
  spot.target.position.set(0, 0, 0);
  spot.castShadow = true;
  spot.shadow.mapSize.setScalar(1024);
  scene.add(spot);
  scene.add(spot.target);

  return { hotLight, coldLight, spot };
}

// ── Camera ────────────────────────────────────────────────────────────────────

export function createCamera(width, height) {
  const camera = new THREE.PerspectiveCamera(44, width / height, 0.1, 200);
  camera.position.set(0, 7.5, 16);
  camera.lookAt(0, 2.0, 0);
  return camera;
}

// ── OrbitControls ─────────────────────────────────────────────────────────────

export function createControls(camera, domElement) {
  const controls = new OrbitControls(camera, domElement);
  controls.target.set(0, 2.0, 0);
  controls.enableDamping  = true;
  controls.dampingFactor  = 0.07;
  controls.minDistance    = 5;
  controls.maxDistance    = 30;
  controls.maxPolarAngle  = Math.PI * 0.82;
  controls.update();
  return controls;
}
