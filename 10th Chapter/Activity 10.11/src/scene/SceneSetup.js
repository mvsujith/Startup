import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

/**
 * SceneSetup.js
 * Initialises the core Three.js renderer, camera, orbit controls, and lighting.
 */
export function createRenderer(container) {
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;

  container.appendChild(renderer.domElement);
  return renderer;
}

export function createCamera(width, height) {
  const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 500);
  camera.position.set(6, 8, 14);
  camera.lookAt(0, 3, 0);
  return camera;
}

export function createControls(camera, domElement) {
  const controls = new OrbitControls(camera, domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.target.set(0, 3, 0);
  controls.minDistance = 4;
  controls.maxDistance = 30;
  controls.maxPolarAngle = Math.PI / 2 - 0.02; // prevent going underground
  controls.update();
  return controls;
}

export function createLights(scene) {
  // Warm ambient
  const ambient = new THREE.HemisphereLight(0xddeeff, 0x886644, 0.9);
  scene.add(ambient);

  // Key directional light — sun
  const sun = new THREE.DirectionalLight(0xfff5e0, 1.8);
  sun.position.set(8, 16, 10);
  sun.castShadow = true;
  sun.shadow.mapSize.width = 2048;
  sun.shadow.mapSize.height = 2048;
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 60;
  sun.shadow.camera.left = -12;
  sun.shadow.camera.right = 12;
  sun.shadow.camera.top = 20;
  sun.shadow.camera.bottom = -5;
  sun.shadow.bias = -0.001;
  scene.add(sun);

  // Soft fill from the opposite side
  const fill = new THREE.DirectionalLight(0xc8e8ff, 0.5);
  fill.position.set(-6, 8, -6);
  scene.add(fill);

  // Subtle blue-toned back rim light
  const rim = new THREE.DirectionalLight(0x88aaff, 0.3);
  rim.position.set(0, 5, -10);
  scene.add(rim);
}
