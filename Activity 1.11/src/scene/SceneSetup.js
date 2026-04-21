/**
 * SceneSetup.js — Phase 1
 * Renderer, scene, lighting, camera, and OrbitControls for the
 * syringe compressibility experiment.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ── Renderer ─────────────────────────────────────────────────────────────────

export function createRenderer(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace  = THREE.SRGBColorSpace;
  renderer.toneMapping       = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;
  container.appendChild(renderer.domElement);
  return renderer;
}

// ── Scene ─────────────────────────────────────────────────────────────────────

export function createScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b0f18);
  scene.fog = new THREE.FogExp2(0x0b0f18, 0.018);
  return scene;
}

// ── Lighting ─────────────────────────────────────────────────────────────────

export function createLighting(scene) {
  // ── Ambient base
  scene.add(new THREE.AmbientLight(0xd4e8ff, 0.55));

  // ── Main overhead directional (cool-white lab fluorescent)
  const main = new THREE.DirectionalLight(0xfff8f0, 3.0);
  main.position.set(5, 16, 7);
  main.castShadow = true;
  main.shadow.mapSize.setScalar(2048);
  main.shadow.camera.near   =  0.5;
  main.shadow.camera.far    = 60;
  main.shadow.camera.left   = -14;
  main.shadow.camera.right  =  14;
  main.shadow.camera.top    =  14;
  main.shadow.camera.bottom = -14;
  main.shadow.bias = -0.0003;
  scene.add(main);

  // ── Cool fill from the left
  const fill = new THREE.DirectionalLight(0xb0c8ff, 1.2);
  fill.position.set(-10, 8, 4);
  scene.add(fill);

  // ── Warm rim from behind the scene
  const rim = new THREE.DirectionalLight(0xffd8a8, 0.75);
  rim.position.set(0, 5, -14);
  scene.add(rim);

  // ── Point light directly overhead the syringes (strong specular pop)
  const overhead = new THREE.PointLight(0xfff4e0, 4.0, 22);
  overhead.position.set(0, 13, 2);
  overhead.castShadow = true;
  overhead.shadow.mapSize.setScalar(1024);
  scene.add(overhead);

  // ── Subtle secondary point for inter-syringe fill
  const secondary = new THREE.PointLight(0xc8e0ff, 1.8, 14);
  secondary.position.set(0, 7, 8);
  scene.add(secondary);
}

// ── Camera ────────────────────────────────────────────────────────────────────

export function createCamera(width, height) {
  const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 200);
  camera.position.set(0, 9, 19);
  camera.lookAt(0, 3.5, 0);
  return camera;
}

// ── OrbitControls ─────────────────────────────────────────────────────────────

export function createControls(camera, domElement) {
  const controls = new OrbitControls(camera, domElement);
  controls.target.set(0, 3.5, 0);
  controls.enableDamping  = true;
  controls.dampingFactor  = 0.07;
  controls.minDistance    = 5;
  controls.maxDistance    = 36;
  controls.maxPolarAngle  = Math.PI * 0.80;
  controls.update();
  return controls;
}
