import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment';
import { PMREMGenerator } from 'three';

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
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  container.appendChild(renderer.domElement);
  return renderer;
}

/**
 * Creates the Three.js Scene and bakes an environment map into it via PMREMGenerator.
 * Returns { scene, envMap }.
 */
export function createScene(renderer) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0d1b2e);
  scene.fog = new THREE.FogExp2(0x0d1b2e, 0.018);

  const pmrem = new PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envMap;
  pmrem.dispose();

  return { scene, envMap };
}

/**
 * Adds a full lighting rig to the scene:
 *   - Ambient fill
 *   - Key directional (with shadows)
 *   - Rim / back directional
 *   - Point lights for warm highlights
 */
export function createLighting(scene) {
  // Ambient fill — soft cool-white
  const ambient = new THREE.AmbientLight(0xd0e8ff, 0.55);
  scene.add(ambient);

  // Key light — warm, right-top
  const keyLight = new THREE.DirectionalLight(0xfff5e0, 1.4);
  keyLight.position.set(8, 14, 6);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.width = 2048;
  keyLight.shadow.mapSize.height = 2048;
  keyLight.shadow.camera.near = 0.5;
  keyLight.shadow.camera.far = 60;
  keyLight.shadow.camera.left = -15;
  keyLight.shadow.camera.right = 15;
  keyLight.shadow.camera.top = 15;
  keyLight.shadow.camera.bottom = -15;
  keyLight.shadow.bias = -0.0003;
  keyLight.shadow.normalBias = 0.02;
  scene.add(keyLight);

  // Rim / fill light — left-back, cooler
  const rimLight = new THREE.DirectionalLight(0xaadeff, 0.45);
  rimLight.position.set(-6, 10, -5);
  scene.add(rimLight);

  // Warm point light above left beaker (tungsten warmth)
  const ptLeft = new THREE.PointLight(0xfff3cc, 0.8, 18, 2);
  ptLeft.position.set(-3.2, 7, 0);
  scene.add(ptLeft);

  // Warm point light above right beaker
  const ptRight = new THREE.PointLight(0xfff3cc, 0.8, 18, 2);
  ptRight.position.set(3.2, 7, 0);
  scene.add(ptRight);

  return { keyLight, rimLight, ambient, ptLeft, ptRight };
}

/**
 * Creates and returns a perspective camera positioned for a good lab view.
 */
export function createCamera(width, height) {
  const camera = new THREE.PerspectiveCamera(52, width / height, 0.05, 500);
  camera.position.set(0, 9, 16);
  camera.lookAt(0, 2, 0);
  return camera;
}

/**
 * Creates OrbitControls configured for viewing a lab table experiment.
 */
export function createControls(camera, domElement) {
  const controls = new OrbitControls(camera, domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.screenSpacePanning = false;
  controls.enablePan = true;
  controls.panSpeed = 0.6;
  controls.minDistance = 5;
  controls.maxDistance = 35;
  controls.maxPolarAngle = Math.PI / 2.05; // prevent going below the table
  controls.target.set(0, 2, 0);
  controls.update();
  return controls;
}
