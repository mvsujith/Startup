import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment";
import { PMREMGenerator } from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass";

/* ─── World layout constants ─────────────────────────────────── */
const REST_HALF_W    = 1.8;   // slinky half-width (world X) at rest
const MAX_HALF_W     = 5.2;   // slinky half-width at full stretch
const REST_HEIGHT    = REST_HALF_W * 2;
const SLINKY_Y       = 1.20;
const FIG_PAD        = 0.92;
const SHOULDER_X_OFF = 0.05;
const SHOULDER_Y     = 1.20;
const ARM_TIP        = 0.65;

/* ─── Realistic humanoid figure builder ─────────────────────── */
function makeFigure(shirtHex, pantsHex, skinHex, facing) {
  const g = new THREE.Group();

  const mkMat = (hex, rough = 0.65, metal = 0) =>
    new THREE.MeshStandardMaterial({ color: hex, roughness: rough, metalness: metal });

  const shirtMat = mkMat(shirtHex, 0.65);
  const pantsMat = mkMat(pantsHex, 0.80);
  const skinMat  = mkMat(skinHex,  0.68);
  const hairMat  = mkMat(0x1a0800, 0.90);
  const shoeMatTop  = mkMat(shirtHex, 0.55, 0.15);
  const shoeMatSole = mkMat(0xffffff, 0.9, 0.0);
  const eyeMat   = mkMat(0x060612, 0.25, 0.1);
  const whiteMat = mkMat(0xffffff, 0.5);

  const vec = (x,y,z) => new THREE.Vector3(x,y,z);

  const mk = (geo, mat, p) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.copy(p);
    m.castShadow = true;
    m.receiveShadow = true;
    g.add(m);
    return m;
  };

  const mkLimb = (r, p1, p2, mat) => {
    const d = p1.distanceTo(p2);
    const l = Math.max(0, d - 2 * r);
    const geo = new THREE.CapsuleGeometry(r, l, 6, 12);
    const m = new THREE.Mesh(geo, mat);
    m.position.copy(p1).add(p2).multiplyScalar(0.5);
    const ax = new THREE.Vector3().subVectors(p2, p1).normalize();
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), ax);
    m.castShadow = true;
    m.receiveShadow = true;
    g.add(m);
    return m;
  };

  // Squat stance points
  const zOffset = 0.16; 
  const hipX = -facing * 0.25;
  const neckX = facing * 0.05;
  
  // Front leg (closer to camera, +z)
  const frontHip = vec(hipX, 0.62, zOffset);
  const frontKnee = vec(0, 0.38, zOffset);
  const frontAnkle = vec(facing * 0.06, 0.05, zOffset);
  
  // Back leg (-z)
  const backHip = vec(hipX, 0.62, -zOffset);
  const backKnee = vec(-facing * 0.15, 0.30, -zOffset);
  const backAnkle = vec(-facing * 0.25, 0.05, -zOffset);

  // Modern Sneakers
  const shoeG = new THREE.BoxGeometry(0.20, 0.08, 0.14);
  const soleG = new THREE.BoxGeometry(0.22, 0.03, 0.15);
  const addShoe = (p) => {
    mk(shoeG, shoeMatTop, p);
    mk(soleG, shoeMatSole, p.clone().add(vec(0, -0.04, 0)));
  };
  addShoe(frontAnkle.clone().add(vec(facing * 0.05, 0.02, 0)));
  addShoe(backAnkle.clone().add(vec(facing * 0.05, 0.02, 0)));

  // Knees
  const sph = (r, ws = 16, hs = 12) => new THREE.SphereGeometry(r, ws, hs);
  mk(sph(0.082), pantsMat, frontKnee);
  mk(sph(0.082), pantsMat, backKnee);

  // Legs
  mkLimb(0.070, frontAnkle, frontKnee, pantsMat);
  mkLimb(0.092, frontKnee, frontHip, pantsMat);
  mkLimb(0.070, backAnkle, backKnee, pantsMat);
  mkLimb(0.092, backKnee, backHip, pantsMat);

  // Hips
  mkLimb(0.14, backHip, frontHip, pantsMat);

  // Torso
  const neckBase = vec(neckX, 1.25, 0); 
  const hipCenter = vec(hipX, 0.62, 0);
  mkLimb(0.18, hipCenter, neckBase, shirtMat);

  // Neck
  const headPos = vec(facing * 0.14, 1.54, 0);
  mkLimb(0.062, neckBase, headPos, skinMat);

  // Head
  mk(sph(0.185, 24, 24), skinMat, headPos);

  // Modern Hair Styling
  const hairP = headPos.clone().add(vec(-facing * 0.02, 0.08, 0));
  const hairM = mk(sph(0.196, 20, 14), hairMat, hairP);
  hairM.scale.set(0.95, 0.85, 0.95);
  const bangs = mk(new THREE.BoxGeometry(0.18, 0.1, 0.20), hairMat, headPos.clone().add(vec(facing * 0.14, 0.10, 0)));
  bangs.rotation.z = facing * 0.3;

  // Eyes
  const eyeZ = 0.065;
  const eyeP = headPos.clone().add(vec(facing * 0.16, 0.03, 0));
  mk(sph(0.025, 10, 10), eyeMat, eyeP.clone().add(vec(0, 0, eyeZ)));
  mk(sph(0.025, 10, 10), eyeMat, eyeP.clone().add(vec(0, 0, -eyeZ)));
  mk(sph(0.010, 6, 6), whiteMat, eyeP.clone().add(vec(facing*0.01, 0.005,  eyeZ + 0.01)));
  mk(sph(0.010, 6, 6), whiteMat, eyeP.clone().add(vec(facing*0.01, 0.005, -eyeZ + 0.01)));

  // Arms dynamically aimed at slinky end each frame
  const armPivot = new THREE.Group();
  armPivot.position.set(neckX, 1.20, 0);

  const addToGroup = (group, geo, mat, y, z) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(0, y, z);
    m.castShadow = true;
    group.add(m);
  };
  
  const cap = (r, l) => new THREE.CapsuleGeometry(r, l, 6, 10);
  
  // Left arm (z = 0.18)
  addToGroup(armPivot, cap(0.068, 0.20), shirtMat, 0.17, 0.18);
  addToGroup(armPivot, sph(0.068),       shirtMat, 0.34, 0.18);
  addToGroup(armPivot, cap(0.058, 0.16), skinMat,  0.48, 0.18);
  addToGroup(armPivot, sph(0.070),       skinMat,  0.62, 0.18);

  // Right arm (z = -0.18)
  addToGroup(armPivot, cap(0.068, 0.20), shirtMat, 0.17, -0.18);
  addToGroup(armPivot, sph(0.068),       shirtMat, 0.34, -0.18);
  addToGroup(armPivot, cap(0.058, 0.16), skinMat,  0.48, -0.18);
  addToGroup(armPivot, sph(0.070),       skinMat,  0.62, -0.18);

  g.add(armPivot);

  // Return myArm/friendArm as armPivot since both point together now
  return { group: g, armPivot };
}

/* ─── Ring pulse helper ──────────────────────────────────────── */
function makeRingPulse(scene) {
  const rings = [];
  for (let i = 0; i < 5; i++) {
    const geo = new THREE.RingGeometry(0.1, 0.18, 32);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xff7722, transparent: true, opacity: 0,
      side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = Math.PI / 2;
    mesh.visible = false;
    scene.add(mesh);
    rings.push({ mesh, mat, active: false, t: 0, delay: i * 0.18 });
  }
  return rings;
}

/* ─── Classroom Environment ──────────────────────────────────── */
function makeClassroom(scene, envTex) {
  const g = new THREE.Group();

  // Polished wood floor
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x4a3219, roughness: 0.65, metalness: 0.1,
    envMap: envTex, envMapIntensity: 0.4,
  });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  g.add(floor);

  // Classroom walls (warm off-white/cream)
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0xe6e0d3, roughness: 0.95, metalness: 0.05
  });

  // Back wall
  const backWall = new THREE.Mesh(new THREE.PlaneGeometry(60, 30), wallMat);
  backWall.position.set(0, 15, -18);
  backWall.receiveShadow = true;
  g.add(backWall);

  // Left wall
  const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(60, 30), wallMat);
  leftWall.rotation.y = Math.PI / 2;
  leftWall.position.set(-25, 15, 0);
  leftWall.receiveShadow = true;
  g.add(leftWall);
  
  // Right wall
  const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(60, 30), wallMat);
  rightWall.rotation.y = -Math.PI / 2;
  rightWall.position.set(25, 15, 0);
  rightWall.receiveShadow = true;
  g.add(rightWall);

  // Ceiling
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), wallMat);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0, 30, 0);
  ceiling.receiveShadow = true;
  g.add(ceiling);

  // Chalkboard on the back wall
  const boardGeo = new THREE.BoxGeometry(16, 6, 0.2);
  const boardMat = new THREE.MeshStandardMaterial({
    color: 0x1f3b28, roughness: 0.85, metalness: 0.05
  });
  const board = new THREE.Mesh(boardGeo, boardMat);
  board.position.set(0, 6, -17.8);
  board.receiveShadow = true;
  g.add(board);
  
  // Chalkboard Wood Frame
  const frameGeo = new THREE.BoxGeometry(16.5, 6.5, 0.1);
  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x3d271d, roughness: 0.9
  });
  const frame = new THREE.Mesh(frameGeo, frameMat);
  frame.position.set(0, 6, -17.9);
  g.add(frame);

  // Chalkboard text
  const chalkCanvas = document.createElement("canvas");
  chalkCanvas.width = 1200;
  chalkCanvas.height = 450;
  const ctx = chalkCanvas.getContext("2d");
  
  ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
  ctx.shadowColor = "rgba(255, 255, 255, 0.4)";
  ctx.shadowBlur = 4;
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = 1;

  // Header
  ctx.font = "bold 52px 'Comic Sans MS', 'Chalkboard SE', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Experiment: Elastic Potential Energy", 600, 70);

  // Line separator
  ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
  ctx.fillRect(100, 100, 1000, 4);

  // Sections
  ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
  ctx.font = "bold 40px 'Comic Sans MS', 'Chalkboard SE', sans-serif";
  ctx.textAlign = "left";
  
  // Left column: Required
  ctx.fillText("Required Components:", 90, 170);
  ctx.font = "36px 'Comic Sans MS', 'Chalkboard SE', sans-serif";
  ctx.fillText("• A long Slinky", 120, 230);
  ctx.fillText("• Varun and Kiran", 120, 290);
  ctx.fillText("• A clear floor space", 120, 350);

  // Right column: Steps
  ctx.font = "bold 40px 'Comic Sans MS', 'Chalkboard SE', sans-serif";
  ctx.fillText("Steps:", 540, 170);
  ctx.font = "36px 'Comic Sans MS', 'Chalkboard SE', sans-serif";
  ctx.fillText("1. Hold the ends firmly.", 570, 230);
  ctx.fillText("2. Slowly stretch the slinky apart.", 570, 290);
  ctx.fillText("3. Release on the teacher's signal.", 570, 350);
  ctx.fillText("   (Faster snap = more stored energy!)", 570, 410);

  const chalkTex = new THREE.CanvasTexture(chalkCanvas);
  chalkTex.anisotropy = 4;
  
  const chalkPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(15, 5.625),
    new THREE.MeshBasicMaterial({ map: chalkTex, transparent: true, opacity: 0.9 })
  );
  chalkPlane.position.set(0, 6, -17.65); // Just in front of the chalkboard
  g.add(chalkPlane);

  // A couple of educational posters 
  const buildPoster = (color, x, y, z, w, h) => {
    const pm = new THREE.MeshStandardMaterial({ color: color, roughness: 0.9 });
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), pm);
    p.position.set(x, y, z);
    p.receiveShadow = true;
    g.add(p);
  };
  buildPoster(0xffb74d, -12, 6, -17.79, 3, 4); // Orange poster
  buildPoster(0x4fc3f7,  12, 6.5, -17.79, 4, 3); // Blue poster

  scene.add(g);
  return g;
}

/* ─── Energy orb ─────────────────────────────────────────────── */
function makeEnergyOrb(scene) {
  const geo = new THREE.SphereGeometry(0.18, 16, 16);
  const mat = new THREE.MeshStandardMaterial({
    color: 0xff7722, emissive: 0xff4400, emissiveIntensity: 1.0,
    transparent: true, opacity: 0.0, roughness: 0.1, metalness: 0.2,
  });
  const orb = new THREE.Mesh(geo, mat);
  orb.position.set(0, SLINKY_Y, 0);
  orb.castShadow = false;
  scene.add(orb);

  // Outer glow ring
  const ringGeo = new THREE.RingGeometry(0.22, 0.38, 32);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xff9933, transparent: true, opacity: 0,
    side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = Math.PI / 2;
  ring.position.set(0, SLINKY_Y, 0);
  scene.add(ring);

  return { orb, mat, ring, ringMat };
}


/* ─── Main component ─────────────────────────────────────────── */
export default function SlinkyScene({ stretchAmount, isReleased, step, slowMotion }) {
  const mountRef = useRef(null);
  const stateRef = useRef({});

  useEffect(() => {
    if (!mountRef.current) return;
    while (mountRef.current.firstChild) mountRef.current.removeChild(mountRef.current.firstChild);

    // ── Renderer ──────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    const W = mountRef.current.clientWidth  || window.innerWidth;
    const H = mountRef.current.clientHeight || window.innerHeight;
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled    = true;
    renderer.shadowMap.type       = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace     = THREE.SRGBColorSpace;
    renderer.toneMapping          = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure  = 0.90;
    mountRef.current.appendChild(renderer.domElement);

    // ── Scene ─────────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a24);
    scene.fog = new THREE.FogExp2(0x1a1a24, 0.012);

    // ── Environment: soft neutral (NO RoomEnvironment — too bright inside coils) ──
    const pmrem  = new PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();
    // Use a very dark neutral color env so metallic reflections are subtle
    const neutralScene = new RoomEnvironment(0.001);
    const envTex = pmrem.fromScene(neutralScene, 0.001).texture;
    scene.environment    = envTex;
    scene.environmentIntensity = 0.08;  // nearly off — direct lights do the work

    // ── Camera ────────────────────────────────────────────────
    const camera = new THREE.PerspectiveCamera(46, W / H, 0.1, 500);
    camera.position.set(2, 2.4, 11.5);
    camera.lookAt(0, 2.8, 0);

    // ── Orbit controls ────────────────────────────────────────
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping  = true;
    controls.dampingFactor  = 0.055;
    controls.enablePan      = true;
    controls.enableRotate   = true;
    controls.minDistance    = 1;
    controls.maxDistance    = 100;
    // Allow rotating completely around and almost all the way down / up
    controls.maxPolarAngle  = Math.PI; 
    controls.minPolarAngle  = 0;
    controls.target.set(0, 2.8, 0);

    // ── Classroom Env ─────────────────────────────────────────
    makeClassroom(scene, envTex);

    // ── 3-Point Cinematic Lighting ─────────────────────────────
    // Key light: from the SIDE so it doesn't shine into open coil ends
    const keyLight = new THREE.DirectionalLight(0xfff2cc, 1.0);
    keyLight.position.set(-6, 10, 4);   // LEFT side + slightly front
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(2048, 2048);
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far  = 40;
    keyLight.shadow.camera.left   = -10;
    keyLight.shadow.camera.right  =  10;
    keyLight.shadow.camera.top    =  10;
    keyLight.shadow.camera.bottom = -10;
    keyLight.shadow.radius = 4;
    keyLight.shadow.bias   = -0.001;
    scene.add(keyLight);

    // Secondary warm fill from RIGHT (not directly into the coil mouth)
    const rightFill = new THREE.DirectionalLight(0xffddb0, 0.6);
    rightFill.position.set(8, 6, -3);   // right + slightly behind
    scene.add(rightFill);

    // Fill light: cool blue from front-left
    const fillLight = new THREE.DirectionalLight(0x9ab8ff, 0.40);
    fillLight.position.set(-3, 4, 8);
    scene.add(fillLight);

    // Rim light: bright white from behind
    const rimLight = new THREE.DirectionalLight(0xffeedd, 0.7);
    rimLight.position.set(0, 6, -12);
    scene.add(rimLight);

    scene.add(new THREE.AmbientLight(0xffeedd, 0.5));

    // Energy glow (orange point, intensifies with stretch)
    const glow = new THREE.PointLight(0xff7722, 0, 18);
    glow.position.set(0, SLINKY_Y, 0);
    scene.add(glow);

    // Bounce light
    const bounce = new THREE.PointLight(0x4466ff, 0.25, 12);
    bounce.position.set(0, 0.5, 2);
    scene.add(bounce);



    // ── Figures ───────────────────────────────────────────────
    const { group: friendGroup, armPivot: friendArm } = makeFigure(0x0ea5e9, 0x0f172a, 0xd1a3a4,  1); // Varun (Blue hoodie)
    const { group: myGroup,     armPivot: myArm }     = makeFigure(0xe11d48, 0x1e293b, 0x8d5524, -1); // Kiran (Rose red hoodie)
    scene.add(friendGroup);
    scene.add(myGroup);

    // ── Labels ────────────────────────────────────────────────
    const makeLabel = (text, clr) => {
      const cv = document.createElement("canvas");
      cv.width = 380; cv.height = 80;
      const ctx = cv.getContext("2d");
      ctx.clearRect(0, 0, 380, 80);
      ctx.fillStyle = "rgba(4,10,28,0.88)";
      ctx.fillRect(0, 0, 380, 80);
      ctx.font = "bold 28px sans-serif";
      ctx.fillStyle = clr;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, 190, 40);
      const tex = new THREE.CanvasTexture(cv);
      const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
      spr.scale.set(2.5, 0.58, 1);
      return spr;
    };
    const friendLabel = makeLabel("🟦 Varun — holds left end", "#38bdf8");
    const myLabel     = makeLabel("🟥 Kiran — holds right end",    "#fb7185");
    scene.add(friendLabel);
    scene.add(myLabel);

    // ── Tension cord lines ─────────────────────────────────────
    const cordMat = new THREE.LineBasicMaterial({ color: 0xdddddd, transparent: true, opacity: 0.5 });
    const mkLine = () => {
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(), new THREE.Vector3(1, 0, 0),
      ]);
      return new THREE.Line(geo, cordMat);
    };
    const topLine = mkLine();
    const botLine = mkLine();
    scene.add(topLine);
    scene.add(botLine);

    const setLine = (line, a, b) => {
      const arr = line.geometry.attributes.position.array;
      arr[0]=a.x; arr[1]=a.y; arr[2]=a.z;
      arr[3]=b.x; arr[4]=b.y; arr[5]=b.z;
      line.geometry.attributes.position.needsUpdate = true;
    };

    // ── Energy tension arc (glowing cable showing stored energy) ──
    const tensionMat = new THREE.LineBasicMaterial({
      color: 0xff6600, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const tensionPoints = [];
    for (let i = 0; i <= 40; i++) tensionPoints.push(new THREE.Vector3());
    const tensionGeo = new THREE.BufferGeometry().setFromPoints(tensionPoints);
    const tensionLine = new THREE.Line(tensionGeo, tensionMat);
    scene.add(tensionLine);

    const updateTensionArc = (leftX, rightX, t) => {
      const pts = tensionGeo.attributes.position;
      const sag = -0.35 * t;
      for (let i = 0; i <= 40; i++) {
        const frac = i / 40;
        const x = leftX + (rightX - leftX) * frac;
        const y = SLINKY_Y + sag * Math.sin(frac * Math.PI);
        pts.setXYZ(i, x, y, 0);
      }
      pts.needsUpdate = true;
      tensionMat.opacity = t * 0.65;
    };

    // ── Slinky group ──────────────────────────────────────────
    const slinkyGroup = new THREE.Group();
    slinkyGroup.rotation.z = -Math.PI / 2;
    slinkyGroup.position.y = SLINKY_Y;
    scene.add(slinkyGroup);

    const chromeMat = new THREE.MeshStandardMaterial({
      color:      0xc8c8d8,   // silver-white
      metalness:  0.70,
      roughness:  0.35,       // higher roughness = more diffuse, no mirror hotspot
      envMapIntensity: 0.0,   // disable env reflections entirely
    });

    const loader = new GLTFLoader();
    loader.load("/slinky.glb", (gltf) => {
      const model = gltf.scene;
      const b0 = new THREE.Box3().setFromObject(model);
      const s0 = new THREE.Vector3();
      b0.getSize(s0);

      const sf = REST_HEIGHT / s0.y;
      model.scale.set(sf, sf, sf);
      model.updateMatrixWorld(true);

      const b1 = new THREE.Box3().setFromObject(model);
      const c1 = new THREE.Vector3();
      b1.getCenter(c1);
      model.position.set(-c1.x, -c1.y, -c1.z);

      model.traverse(child => {
        if (child.isMesh) {
          child.material      = chromeMat;
          child.castShadow    = true;
          child.receiveShadow = true;
        }
      });

      slinkyGroup.add(model);
    });

    // ── Energy orb ────────────────────────────────────────────
    const energyOrb = makeEnergyOrb(scene);

    // ── Ring pulses ───────────────────────────────────────────
    const rings = makeRingPulse(scene);

    // ── Particles ─────────────────────────────────────────────
    const PC   = 80;
    const pArr = new Float32Array(PC * 3);
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute("position", new THREE.BufferAttribute(pArr, 3));
    const pMat = new THREE.PointsMaterial({
      color: 0xff9944, size: 0.14, transparent: true, opacity: 0,
      sizeAttenuation: true, blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const pMesh = new THREE.Points(pGeo, pMat);
    scene.add(pMesh);

    // Particle velocities — radial burst
    const pVels = Array.from({ length: PC }, (_, i) => {
      const angle = (i / PC) * Math.PI * 2;
      const speed = 0.05 + Math.random() * 0.09;
      const vy    = 0.08 + Math.random() * 0.12;
      return new THREE.Vector3(Math.cos(angle) * speed, vy, Math.sin(angle) * speed * 0.5);
    });
    const pOrigins = new Float32Array(PC * 3); // for reset

    // ── Post-processing: Bloom ─────────────────────────────────
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(
      new THREE.Vector2(W, H),
      0.10,   // strength — very subtle, only catches extreme specular highlights
      0.40,   // radius
      0.95    // threshold — only the absolute brightest points bloom
    );
    composer.addPass(bloom);

    // ── Animation state ───────────────────────────────────────
    const st = {
      stretch: 0, targetStretch: 0,
      released: false, releaseTime: -1,
      pActive: false, pT: 0,
      shakeActive: false, shakeT: 0,
      slowMo: false,
      ringActive: false, ringT: 0,
    };
    stateRef.current.setState = (s) => Object.assign(st, s);

    const aimArm = (pivot, px, py, tx, ty) => {
      const dx = tx - px, dy = ty - py;
      pivot.rotation.z = Math.atan2(-dx, dy);
    };

    let raf;
    const clock = new THREE.Clock();
    let totalTime = 0;

    const animate = () => {
      raf = requestAnimationFrame(animate);
      let dt = clock.getDelta();

      // Slow-motion modifier
      if (st.slowMo) dt *= 0.28;
      totalTime += dt;
      stateRef.current.appTime = totalTime;

      st.stretch += (st.targetStretch - st.stretch) * (st.slowMo ? 0.025 : 0.08);
      const t = Math.min(st.stretch, 1);

      // Current slinky half-width in world X
      const halfW   = REST_HALF_W + t * (MAX_HALF_W - REST_HALF_W);
      const figureX = halfW + FIG_PAD;

      // ── Slinky scale ──────────────────────────────────────
      if (!st.released) {
        slinkyGroup.scale.y = halfW / REST_HALF_W;
        slinkyGroup.scale.x = 1.0;
        slinkyGroup.scale.z = 1.0;
      } else {
        const el    = totalTime - st.releaseTime;
        const decay = Math.exp(-el * (st.slowMo ? 1.1 : 3.5));
        
        // Multi-mode oscillation: fundamental + harmonic
        const osc1  = decay * Math.sin(el * (st.slowMo ? 5 : 17)) * 0.22;
        const osc2  = decay * Math.sin(el * (st.slowMo ? 9 : 31)) * 0.08;
        const osc   = osc1 + osc2;
        
        // Return to normal unstretched scale
        slinkyGroup.scale.y += (1.0 + osc - slinkyGroup.scale.y) * (st.slowMo ? 0.08 : 0.25);
        
        // Slight vertical squeeze when compressed
        const compressFactor = Math.max(0, -osc * 0.35);
        slinkyGroup.scale.z = 1.0 + compressFactor;
        slinkyGroup.scale.x = 1.0 + compressFactor;
      }

      // ── Emissive glow driven by stretch ────────────────────
      const gOrange = t * 0.45, gMid = t * 0.10;
      slinkyGroup.traverse(child => {
        if (child.isMesh && child.material) {
          child.material.emissive.setRGB(gOrange, gMid, 0);
          child.material.emissiveIntensity = t * 0.55;
        }
      });
      glow.intensity  = t * 2.5 + (st.released ? Math.max(0, 1.5 * Math.exp(-(totalTime - st.releaseTime) * 2)) : 0);
      glow.position.set(0, SLINKY_Y, 0);

      // ── Energy orb ────────────────────────────────────────
      energyOrb.mat.opacity  = t * 0.55;
      energyOrb.mat.emissiveIntensity = 0.6 + t * 0.9;
      energyOrb.ringMat.opacity = t * 0.35;
      energyOrb.orb.scale.setScalar(0.6 + t * 1.4);
      energyOrb.ring.scale.setScalar(0.6 + t * 2.2);
      energyOrb.orb.rotation.y = totalTime * 2.1;

      // ── Tension arc ───────────────────────────────────────
      updateTensionArc(-halfW, halfW, t);

      // ── Figure positions ──────────────────────────────────
      friendGroup.position.x = -figureX;
      myGroup.position.x     = +figureX;

      // ── Optional Dynamic Camera Pan (Now Disabled for Free Control) ──
      // The cinematic zoom is removed here so you can move any direction and angle freely!

      // ── Camera shake at max stretch ────────────────────────
      if (st.shakeActive) {
        st.shakeT += dt;
        const shakeDecay = Math.exp(-st.shakeT * 6);
        if (shakeDecay > 0.01) {
          camera.position.x += (Math.random() - 0.5) * 0.022 * shakeDecay;
          camera.position.y += (Math.random() - 0.5) * 0.012 * shakeDecay;
        } else {
          st.shakeActive = false;
        }
      }

      // ── Arm aiming ────────────────────────────────────────
      const fSX = -figureX + SHOULDER_X_OFF;
      aimArm(friendArm, fSX, SHOULDER_Y, -halfW, SLINKY_Y);

      const mSX = +figureX - SHOULDER_X_OFF;
      aimArm(myArm, mSX, SHOULDER_Y, +halfW, SLINKY_Y);

      // Labels float above each figure
      friendLabel.position.set(-figureX, 2.42, 0);
      myLabel.position.set(    +figureX, 2.42, 0);

      // Tension cords
      const fDir  = new THREE.Vector2(-halfW - fSX, SLINKY_Y - SHOULDER_Y).normalize();
      const fHand = new THREE.Vector3(fSX + fDir.x * ARM_TIP, SHOULDER_Y + fDir.y * ARM_TIP, 0);
      const mDir  = new THREE.Vector2(+halfW - mSX, SLINKY_Y - SHOULDER_Y).normalize();
      const mHand = new THREE.Vector3(mSX + mDir.x * ARM_TIP, SHOULDER_Y + mDir.y * ARM_TIP, 0);

      setLine(topLine, fHand, new THREE.Vector3(-halfW, SLINKY_Y, 0));
      setLine(botLine, mHand, new THREE.Vector3(+halfW, SLINKY_Y, 0));
      cordMat.opacity = 0.2 + t * 0.6;

      // ── Ring pulses ────────────────────────────────────────
      if (st.ringActive) {
        st.ringT += dt;
        rings.forEach(r => {
          const localT = st.ringT - r.delay;
          if (localT < 0) { r.mesh.visible = false; return; }
          r.mesh.visible = true;
          const life = (localT % 1.2) / 1.2;
          const scale = 0.5 + life * 5.0;
          r.mesh.scale.setScalar(scale);
          r.mesh.position.set(0, SLINKY_Y, 0);
          r.mat.opacity = (1 - life) * 0.7;
          r.mat.color.setHSL(0.07 - life * 0.04, 1, 0.6);
        });
        if (st.ringT > 2.8) {
          st.ringActive = false;
          rings.forEach(r => { r.mesh.visible = false; r.mat.opacity = 0; });
        }
      }

      // ── Release particles ──────────────────────────────────
      if (st.pActive) {
        st.pT += dt;
        const life = Math.min(st.pT / (st.slowMo ? 6.0 : 2.2), 1);
        pMat.opacity = (1 - life) * 0.92;
        const pos = pGeo.attributes.position;
        for (let i = 0; i < PC; i++) {
          const ox = pOrigins[i * 3], oy = pOrigins[i * 3 + 1], oz = pOrigins[i * 3 + 2];
          pos.setXYZ(i,
            ox + pVels[i].x * st.pT * 60,
            oy + pVels[i].y * st.pT * 60 - 0.5 * 9.8 * st.pT * st.pT * 0.012,
            oz + pVels[i].z * st.pT * 60
          );
        }
        pos.needsUpdate = true;
        if (life >= 1) { st.pActive = false; pMat.opacity = 0; }
      }



      controls.update();
      composer.render();
    };
    animate();

    const onResize = () => {
      const w = mountRef.current?.clientWidth  || window.innerWidth;
      const h = mountRef.current?.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      composer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      controls.dispose();
      composer.dispose();
      renderer.dispose();
      envTex.dispose();
      if (mountRef.current?.contains(renderer.domElement)) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  // ── Stretch sync ──────────────────────────────────────────────
  useEffect(() => {
    const prev = stateRef.current.lastStretch || 0;
    stateRef.current.setState?.({ targetStretch: stretchAmount });
    // Trigger camera shake when reaching max stretch
    if (stretchAmount >= 0.95 && prev < 0.95) {
      stateRef.current.setState?.({ shakeActive: true, shakeT: 0 });
    }
    stateRef.current.lastStretch = stretchAmount;
  }, [stretchAmount]);

  // ── Release sync ──────────────────────────────────────────────
  useEffect(() => {
    if (isReleased) {
      const now = stateRef.current.appTime || 0;
      // Reset particle origins to slinky center
      stateRef.current.setState?.({
        released: true, releaseTime: now,
        pActive: true, pT: 0,
        ringActive: true, ringT: 0,
        targetStretch: 0,
      });
    } else {
      stateRef.current.setState?.({
        released: false, stretch: 0, targetStretch: 0, pActive: false, pT: 0,
      });
    }
  }, [isReleased]);

  // ── Slow motion sync ──────────────────────────────────────────
  useEffect(() => {
    stateRef.current.setState?.({ slowMo: !!slowMotion });
  }, [slowMotion]);

  return <div ref={mountRef} style={{ width: "100%", height: "100%" }} />;
}
