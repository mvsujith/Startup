import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment';
import { PMREMGenerator } from 'three';
import WindingControl from './components/WindingControl.jsx';
import EnergyPanel from './components/EnergyPanel.jsx';
import DataTable from './components/DataTable.jsx';
import Calculations from './components/Calculations.jsx';
import { playWindSound, startCarRunSound, playFinishSound, playResetSound } from './audio.js';
import './App.css';

// ── Physics / game constants ─────────────────────────
const CM_PER_WINDING   = 14;     // cm of travel per winding
const WORLD_SCALE      = 0.1;    // three.js units per cm (larger = more travel distance)
const MAX_WINDINGS     = 20;
const ANIM_DURATION_MS = 4000;   // milliseconds for the full run animation

// Removed Achievements logic

// ── Build scene helpers ──────────────────────────────
function updateWall(results, cnv, ctx, tex) {
  ctx.clearRect(0, 0, cnv.width, cnv.height);

  if (results.length === 0) {
    tex.needsUpdate = true;
    return;
  }

  // Draw Graph ONLY - Brighter and Centered
  ctx.textAlign = 'center';
  ctx.font = 'bold 64px Inter, sans-serif'; // Bigger title
  ctx.fillStyle = '#ffffff';
  ctx.fillText('Avg Distance vs Windings', 1024, 150); // Centered horizontally

  // Compute averages
  const groups = {};
  results.forEach(r => {
    if (!groups[r.windings]) groups[r.windings] = [];
    groups[r.windings].push(r);
  });
  const bins = Object.keys(groups).map(Number).sort((a,b) => a - b);
  const avgs = {};
  bins.forEach(w => {
    avgs[w] = groups[w].reduce((s, r) => s + r.distance, 0) / groups[w].length;
  });
  const maxAvg = Math.max(1, ...Object.values(avgs));

  // Center Graph
  const chartW = 1200;
  const chartH = 650;
  const chartX = 1024 - (chartW / 2); // 424
  const chartY = 220;

  ctx.strokeStyle = '#94a3b8'; // Brighter axes
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(chartX, chartY);
  ctx.lineTo(chartX, chartY + chartH);
  ctx.lineTo(chartX + chartW, chartY + chartH);
  ctx.stroke();

  if (bins.length > 0) {
    const barSpacing = chartW / bins.length;
    const barW = Math.min(120, barSpacing * 0.7);

    bins.forEach((w, i) => {
      const avg = avgs[w];
      const h = (avg / maxAvg) * (chartH - 80);
      const bx = chartX + i * barSpacing + (barSpacing - barW) / 2;
      const by = chartY + chartH - h;

      // Draw shiny glowing bar
      ctx.shadowBlur = 30;
      ctx.shadowColor = '#22d3ee';
      ctx.fillStyle = '#22d3ee'; // very bright cyan
      ctx.fillRect(bx, by, barW, h);
      
      ctx.shadowBlur = 0; // reset shadow off so text is crisp

      // Value text
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 44px Inter, sans-serif';
      ctx.fillText(avg.toFixed(0), bx + barW / 2, by - 20);

      // Label text
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 44px Inter, sans-serif';
      ctx.fillText(w + '×', bx + barW / 2, chartY + chartH + 60);
    });
  }

  tex.needsUpdate = true;
}

function buildScene(scene) {
  // Floor plane
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(30, 80), // Made much longer to accommodate 280cm scale
    new THREE.MeshStandardMaterial({ color: 0x141e36, roughness: 0.9, metalness: 0.0 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.z = -15; // Shift floor deeper into screen
  floor.receiveShadow = true;
  scene.add(floor);

  // Grid overlay
  const grid = new THREE.GridHelper(50, 50, 0x1e3a5f, 0x162840);
  grid.material.opacity = 0.45;
  grid.material.transparent = true;
  scene.add(grid);

  // Starting line (red tape)
  const startLine = new THREE.Mesh(
    new THREE.BoxGeometry(7, 0.025, 0.14),
    new THREE.MeshStandardMaterial({ color: 0xff3344, emissive: 0xff1122, emissiveIntensity: 0.7 })
  );
  startLine.position.set(0, 0.01, 0);
  scene.add(startLine);

  // Start label
  const makeLabel = (text, color, fontSize = 48) => {
    const c = document.createElement('canvas');
    c.width = 512; c.height = 128;
    const ctx = c.getContext('2d');
    ctx.fillStyle = color;
    ctx.font = `bold ${fontSize}px Inter, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(text, 256, 80);
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true })
    );
    return sprite;
  };

  const startLabel = makeLabel('START 0cm', '#ff3344', 64);
  startLabel.position.set(-4.5, 0.45, 0);
  startLabel.scale.set(4.0, 1.0, 1);
  scene.add(startLabel);

  // Distance markers
  [20, 40, 60, 80, 100, 140, 200, 280].forEach(cm => {
    const wz = -(cm * WORLD_SCALE);
    const tick = new THREE.Mesh(
      new THREE.BoxGeometry(6, 0.02, 0.07),
      new THREE.MeshStandardMaterial({ color: 0x2a4a7f, emissive: 0x1a3a6f, emissiveIntensity: 0.3 })
    );
    tick.position.set(0, 0.01, wz);
    scene.add(tick);

    const label = makeLabel(`${cm} cm`, cm <= 100 ? '#22d3ee' : '#4ade80', 56);
    label.position.set(4.0, 0.4, wz);
    label.scale.set(3.5, 0.875, 1); // Make labels much larger
    scene.add(label);
  });

  // Ruler strip along left edge
  const ruler = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.015, 32),
    new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xd97706, emissiveIntensity: 0.25 })
  );
  ruler.position.set(-2.3, 0.012, -14);
  scene.add(ruler);

  // Back wall (placed correctly AFTER the max distance of 280cm)
  const wall = new THREE.Mesh(
    new THREE.PlaneGeometry(30, 15),
    new THREE.MeshStandardMaterial({ color: 0x0d1828, roughness: 1.0 })
  );
  wall.position.set(0, 7.5, -35); // 280cm is z = -28, so -35 gives plenty of room
  scene.add(wall);

  // Wall text overlay
  const wallCnv = document.createElement('canvas');
  wallCnv.width = 2048;
  wallCnv.height = 1024;
  const wCtx = wallCnv.getContext('2d');
  const wallTex = new THREE.CanvasTexture(wallCnv);

  const wallTextPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(30, 15),
    new THREE.MeshBasicMaterial({ map: wallTex, transparent: true })
  );
  wallTextPlane.position.set(0, 7.5, -34.9);
  scene.add(wallTextPlane);

  return { cnv: wallCnv, ctx: wCtx, tex: wallTex };
}

function buildLights(scene) {
  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  const dir = new THREE.DirectionalLight(0xffffff, 1.3);
  dir.position.set(6, 12, 6);
  dir.castShadow = true;
  dir.shadow.mapSize.set(2048, 2048);
  dir.shadow.camera.near = 0.5;
  dir.shadow.camera.far = 60;
  dir.shadow.camera.left = -16; dir.shadow.camera.right = 16;
  dir.shadow.camera.top = 16;   dir.shadow.camera.bottom = -16;
  scene.add(dir);
  const fill = new THREE.DirectionalLight(0x4488ff, 0.35);
  fill.position.set(-5, 4, -5);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xa78bfa, 0.25);
  rim.position.set(0, 6, -10);
  scene.add(rim);
}

function buildSpringGlow() {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, 12, 12),
    new THREE.MeshStandardMaterial({
      color: 0xa78bfa, emissive: 0xa78bfa,
      emissiveIntensity: 0, transparent: true, opacity: 0.0,
    })
  );
  return mesh;
}

// ── Particle burst ────────────────────────────────────
function spawnParticles(scene, pos, color = 0x22d3ee) {
  const group = new THREE.Group();
  group.position.copy(pos);
  const particles = [];
  for (let i = 0; i < 18; i++) {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 6, 6),
      new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.5, transparent: true })
    );
    const theta = Math.random() * Math.PI * 2;
    const phi   = Math.random() * Math.PI;
    const spd   = 0.03 + Math.random() * 0.07;
    m.userData.vel = new THREE.Vector3(
      Math.sin(phi) * Math.cos(theta) * spd,
      Math.abs(Math.sin(phi) * Math.sin(theta)) * spd + 0.025,
      Math.cos(phi) * spd
    );
    group.add(m);
    particles.push(m);
  }
  scene.add(group);
  let life = 0;
  return {
    tick() {
      life++;
      particles.forEach(p => {
        p.position.addScaledVector(p.userData.vel, 1);
        p.userData.vel.y -= 0.002;
        if (p.material) p.material.opacity = 1 - life / 60;
      });
      if (life >= 60) { scene.remove(group); return true; }
      return false;
    }
  };
}

// ── App ───────────────────────────────────────────────
export default function App() {
  const mountRef      = useRef(null);
  const rendererRef   = useRef(null);
  const sceneRef      = useRef(null);
  const cameraRef     = useRef(null);
  const controlsRef   = useRef(null);
  const envMapRef     = useRef(null);
  const carRef        = useRef(null);
  const springGlowRef = useRef(null);
  const frameIdRef    = useRef(null);
  const particlesRef  = useRef([]);

  // Mutable animation state – lives entirely outside React
  const animRef = useRef({ running: false, progress: 0, totalDist: 0, maxSpeed: 0, speed: 0 });
  const soundRef = useRef(null);
  const wallRefs = useRef({ cnv: null, ctx: null, tex: null });

  // React UI state
  const [windingCount,  setWindingCount]  = useState(0);
  const [phase,         setPhase]         = useState('idle');
  const [springPct,     setSpringPct]     = useState(0);
  const [kineticPct,    setKineticPct]    = useState(0);
  const [results,       setResults]       = useState([]);
  const [phaseLabel,    setPhaseLabel]    = useState('🙌 Wind the key to begin');

  // Keep latest winding count accessible inside rAF
  const windingRef      = useRef(0);
  windingRef.current      = windingCount;

  // ── Three.js scene setup ────────────────────────────
  useEffect(() => {
    if (!mountRef.current) return;
    while (mountRef.current.firstChild) mountRef.current.removeChild(mountRef.current.firstChild);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x080d1a);
    scene.fog = new THREE.FogExp2(0x080d1a, 0.014);
    sceneRef.current = scene;

    const w = mountRef.current.clientWidth  || window.innerWidth;
    const h = mountRef.current.clientHeight || window.innerHeight;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const pmrem  = new PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    envMapRef.current = envTex;
    scene.environment = envTex;

    const camera = new THREE.PerspectiveCamera(58, w / h, 0.1, 500);
    camera.position.set(8, 7, 10);
    camera.lookAt(0, 0.5, -4);
    cameraRef.current = camera;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping   = true;
    controls.dampingFactor   = 0.06;
    controls.minDistance     = 3;
    controls.maxDistance     = 50;
    controls.maxPolarAngle   = Math.PI / 2 - 0.04;
    controls.target.set(0, 0.5, -4); // Look slightly ahead initially
    controls.update();
    controlsRef.current = controls;

    buildLights(scene);
    const wRefs = buildScene(scene);
    wallRefs.current = wRefs;

    // Spring glow placeholder
    springGlowRef.current = buildSpringGlow();

    let isActive = true; // Prevents strict-mode race conditions

    // Load toy car GLB
    const loader = new GLTFLoader();
    loader.load(
      '/toy car.glb',
      (gltf) => {
        if (!isActive) return; // Ignore orphaned callback from unmounted scene

        const model = gltf.scene;
        const box   = new THREE.Box3().setFromObject(model);
        const size  = new THREE.Vector3();
        const ctr   = new THREE.Vector3();
        box.getSize(size);
        box.getCenter(ctr);

        // 1. Shift model so its bounding box center is exactly at its local origin (0,0,0)
        model.position.set(-ctr.x, -ctr.y, -ctr.z);

        // 2. Put it in an inner wrapper for scaling
        const modelWrapper = new THREE.Group();
        modelWrapper.add(model);

        // 3. Scale the inner wrapper so the car is highly visible but not too large (e.g. 2.0 units max dimension)
        const maxDim = Math.max(size.x, size.y, size.z);
        const sf = 2.0 / maxDim;
        modelWrapper.scale.set(sf, sf, sf);

        // 4. Ensure it faces down the negative Z axis
        modelWrapper.rotation.y = Math.PI;

        // 5. Lift it so the wheels rest on the floor (Y = 0)
        // Since it's centered, the bottom is exactly at half its scaled height
        modelWrapper.position.y = (size.y * sf) / 2;

        const wheels = [];
        model.traverse(child => {
          if (!child.isMesh) return;
          child.castShadow = true;
          child.receiveShadow = true;
          
          const name = child.name.toLowerCase();
          if (name.includes('wheel') || name.includes('tire')) {
            wheels.push(child);
          }

          // Ensure materials are visible and lit
          const mats = Array.isArray(child.material) ? child.material : [child.material];
          mats.forEach(m => {
            m.envMap = envTex;
            m.envMapIntensity = 1.6; // Brighten the materials
            m.needsUpdate = true;
          });
        });

        const wrapper = new THREE.Group();
        wrapper.add(modelWrapper); // Add the perfectly centered and scaled car
        // Position glow slightly behind+above on the car
        springGlowRef.current.position.set(0, 1.0, 1.0);
        wrapper.add(springGlowRef.current);
        
        // Sit exactly on the floor (Y=0)
        wrapper.position.set(0, 0, 0);
        
        // Save wheels for animation
        wrapper.userData = { wheels };

        // Add dynamic text sprite onto the car wrapper to show distance clearly
        const carLabelCnv = document.createElement('canvas');
        carLabelCnv.width = 512; carLabelCnv.height = 128;
        const clCtx = carLabelCnv.getContext('2d');
        clCtx.fillStyle = '#ffffff';
        clCtx.font = 'bold 64px Inter';
        clCtx.textAlign = 'center';
        clCtx.fillText('0 cm', 256, 80);
        const carLabelTex = new THREE.CanvasTexture(carLabelCnv);
        const carLabelSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: carLabelTex, transparent: true }));
        carLabelSprite.position.set(0, 2.5, 0); // Above the car
        carLabelSprite.scale.set(4.0, 1.0, 1.0);
        wrapper.add(carLabelSprite);
        wrapper.userData.labelCtx = clCtx;
        wrapper.userData.labelTex = carLabelTex;

        scene.add(wrapper);
        carRef.current = wrapper;
        console.log('🚗 Toy car loaded. Original Size:', size.toArray(), 'Scale Factor:', sf, 'Wheels found:', wheels.length);
      },
      undefined,
      (err) => {
        if (!isActive) return; // Ignore if unmounted
        console.error('GLB load error:', err);
        // Fallback car shape
        const body = new THREE.Mesh(
          new THREE.BoxGeometry(0.9, 0.42, 1.8),
          new THREE.MeshStandardMaterial({ color: 0xf43f5e, metalness: 0.4, roughness: 0.35 })
        );
        body.castShadow = true;
        body.position.y = 0.21;
        // Wheels
        const wGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.14, 16);
        const wMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
        [[-0.52, 0, 0.55], [0.52, 0, 0.55], [-0.52, 0, -0.55], [0.52, 0, -0.55]].forEach(([x, y, z]) => {
          const w = new THREE.Mesh(wGeo, wMat);
          w.rotation.z = Math.PI / 2;
          w.position.set(x, 0.22, z);
          w.castShadow = true;
          body.add(w);
        });
        const wrapper = new THREE.Group();
        wrapper.add(body);
        springGlowRef.current.position.set(0, 0.7, 0.6);
        wrapper.add(springGlowRef.current);
        scene.add(wrapper);
        carRef.current = wrapper;
      }
    );

    // Render loop – runs particles, controls, render
    const animate = () => {
      frameIdRef.current = requestAnimationFrame(animate);
      controls.update();
      particlesRef.current = particlesRef.current.filter(p => !p.tick());
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      const nw = mountRef.current?.clientWidth  || window.innerWidth;
      const nh = mountRef.current?.clientHeight || window.innerHeight;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    window.addEventListener('resize', onResize);

    return () => {
      isActive = false; // Prevent async callbacks from firing after unmount
      cancelAnimationFrame(frameIdRef.current);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      if (mountRef.current?.contains(renderer.domElement)) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  // ── Sync wall chart ─────────────────────────────────
  useEffect(() => {
    if (wallRefs.current && wallRefs.current.cnv) {
      updateWall(results, wallRefs.current.cnv, wallRefs.current.ctx, wallRefs.current.tex);
    }
  }, [results]);

  // ── Sync spring glow with winding count ─────────────
  useEffect(() => {
    const g = springGlowRef.current;
    if (!g) return;
    const pct = windingCount / MAX_WINDINGS;
    g.material.emissiveIntensity = pct * 3.0;
    g.material.opacity = pct * 0.9;
    const s = 0.5 + pct * 1.8;
    g.scale.set(s, s, s);
  }, [windingCount]);

  // ── Set windings ─────────────────────────────────────
  const handleSetWindings = useCallback((n) => {
    if (animRef.current.running) return;
    if (n > 0 && n > windingRef.current) playWindSound(n); // click up
    setWindingCount(n);
    setSpringPct(Math.round((n / MAX_WINDINGS) * 100));
    setKineticPct(0);
    setPhase(n > 0 ? 'winding' : 'idle');
    setPhaseLabel(n > 0 ? `🌀 ${n} windings – spring loaded!` : '🙌 Wind the key to begin');
  }, []);

  // ── Release car – core animation loop ────────────────
  const handleRelease = useCallback(() => {
    const winding = windingRef.current;
    if (!carRef.current || winding === 0 || animRef.current.running) return;

    // Reset car to start
    const car = carRef.current;
    car.position.set(0, 0, 0);
    car.rotation.z = 0;

    // Snap camera back to start
    if (cameraRef.current && controlsRef.current) {
      cameraRef.current.position.set(8, 7, 10);
      controlsRef.current.target.set(0, 0.5, -4);
      controlsRef.current.update();
    }

    const distCm    = winding * CM_PER_WINDING;
    const distWorld = distCm * WORLD_SCALE;
    const speedCmS  = 8 + winding * 2.6;
    const duration  = ANIM_DURATION_MS + winding * 150; // more windings = slightly longer anim

    animRef.current = { running: true, startTime: performance.now(), duration, totalDist: distWorld, lastZ: 0 };

    setPhase('running');
    setPhaseLabel('🚗 Car is racing!');
    if (soundRef.current) soundRef.current.stop();
    soundRef.current = startCarRunSound();

    // Time-based animation – guaranteed to complete
    const drive = () => {
      const anim = animRef.current;
      if (!anim.running) return;

      const elapsed  = performance.now() - anim.startTime;
      const rawT     = Math.min(elapsed / anim.duration, 1); // 0..1 linear time

      // Ease in-out curve: smooth acceleration & deceleration
      const eased = rawT < 0.5
        ? 2 * rawT * rawT
        : 1 - Math.pow(-2 * rawT + 2, 2) / 2;

      const car = carRef.current;
      if (car) {
        car.position.z  = -anim.totalDist * eased;
        car.rotation.z  = Math.sin(elapsed * 0.04) * 0.006 * (1 - rawT); // slight wobble
      }

      // Rotate wheels to simulate actual movement
      if (carRef.current && carRef.current.userData) {
        if (carRef.current.userData.wheels) {
          const wheelCircumference = 0.5; // Approximate
          const distMoved = anim.totalDist * eased;
          const rotAngle = (distMoved / wheelCircumference) * Math.PI * 2;
          carRef.current.userData.wheels.forEach(wheel => {
            wheel.rotation.x = -rotAngle; 
          });
        }
        
        // Update floating distance label on the car
        if (carRef.current.userData.labelCtx && carRef.current.userData.labelTex) {
          const currentCm = (anim.totalDist * eased) / WORLD_SCALE;
          const ctx = carRef.current.userData.labelCtx;
          ctx.clearRect(0, 0, 512, 128);
          ctx.fillText(`${currentCm.toFixed(1)} cm`, 256, 80);
          carRef.current.userData.labelTex.needsUpdate = true;
        }
      }

      // Make camera follow the car
      if (controlsRef.current && cameraRef.current) {
         const currentZ = -anim.totalDist * eased;
         // Calculate how much we moved this frame
         const lastZ = anim.lastZ ?? 0;
         const deltaZ = currentZ - lastZ;
         anim.lastZ = currentZ;

         // Move both target and camera position by the same delta
         controlsRef.current.target.z += deltaZ;
         cameraRef.current.position.z += deltaZ;
         controlsRef.current.update();
      }

      // Live energy bars (spring drains, kinetic peaks in middle)
      const sp = Math.max(0, Math.round((1 - eased) * (windingRef.current / MAX_WINDINGS) * 100));
      const kp = Math.max(0, Math.round(Math.sin(eased * Math.PI) * 100 * (windingRef.current / MAX_WINDINGS)));
      setSpringPct(sp);
      setKineticPct(kp);

      if (soundRef.current) {
        soundRef.current.setSpeed(Math.sin(eased * Math.PI));
      }

      if (rawT >= 1) {
        anim.running = false;
        if (car) { 
          car.position.z = -anim.totalDist; 
          car.rotation.z = 0;
          if (car.userData.labelCtx) {
            car.userData.labelCtx.clearRect(0, 0, 512, 128);
            car.userData.labelCtx.fillText(`${distCm.toFixed(1)} cm`, 256, 80);
            car.userData.labelTex.needsUpdate = true;
          }
        }
        setSpringPct(0);
        setKineticPct(0);
        setPhase('done');
        setPhaseLabel(`🏁 Travelled ${distCm.toFixed(0)} cm!`);

        const newResult = { windings: windingRef.current, distance: distCm, speed: speedCmS };
        
        if (soundRef.current) { soundRef.current.stop(); soundRef.current = null; }
        playFinishSound();

        setResults(prev => {
          const updated = [...prev, newResult];
          return updated;
        });

        const carPos = carRef.current?.position.clone() ?? new THREE.Vector3(0, 0.5, -anim.totalDist);
        carPos.y = 0.5;
        if (sceneRef.current) particlesRef.current.push(spawnParticles(sceneRef.current, carPos, 0x22d3ee));
        return;
      }

      requestAnimationFrame(drive);
    };

    requestAnimationFrame(drive);
  }, [windingCount]); // Dependency on windingCount ensures the closure refreshes

  // ── Reset ─────────────────────────────────────────────
  const handleReset = useCallback(() => {
    if (soundRef.current) { soundRef.current.stop(); soundRef.current = null; }
    playResetSound();
    animRef.current.running = false;
    animRef.current.lastZ = 0;
    
    // Snap camera back to start
    if (cameraRef.current && controlsRef.current) {
      cameraRef.current.position.set(8, 7, 10);
      controlsRef.current.target.set(0, 0.5, -4);
      controlsRef.current.update();
    }

    const car = carRef.current;
    if (car) { 
        car.position.set(0, 0, 0); 
        car.rotation.z = 0;
        if (car.userData?.labelCtx) {
            car.userData.labelCtx.clearRect(0, 0, 512, 128);
            car.userData.labelCtx.fillText(`0.0 cm`, 256, 80);
            car.userData.labelTex.needsUpdate = true;
        }
    }
    setWindingCount(0);
    setPhase('idle');
    setSpringPct(0);
    setKineticPct(0);
    setPhaseLabel('🙌 Wind the key to begin');
  }, []);

  const phaseClass = { idle: 'phase-idle', winding: 'phase-winding', running: 'phase-running', done: 'phase-done' }[phase] ?? 'phase-idle';

  return (
    <div className="app-shell">
      {/* ── Left panel ── */}
      <div className="left-panel">
        <div className="panel-header">
          <span className="panel-header-icon">🔑</span>
          Wind &amp; Release
        </div>
        <WindingControl
          windingCount={windingCount}
          phase={phase}
          onSetWindings={handleSetWindings}
          onRelease={handleRelease}
          onReset={handleReset}
          trialsDone={results.length}
        />
        <div style={{ padding: '8px 10px 2px', fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.07em', textTransform: 'uppercase', flexShrink: 0 }}>
          Energy Transform
        </div>
        <EnergyPanel windingCount={windingCount} springPct={springPct} kineticPct={kineticPct} phase={phase} />
      </div>

      {/* ── 3D Canvas ── */}
      <div className="canvas-shell" ref={mountRef}>
        <div className={`phase-overlay ${phaseClass}`}>{phaseLabel}</div>
      </div>

      {/* ── Right panel ── */}
      <div className="right-panel">
        <div className="panel-header">
          Results
        </div>
        <DataTable results={results} />
        <div className="panel-header" style={{ borderTop: '1px solid var(--border)', flexShrink: 0 }}>
          <span className="panel-header-icon">🧮</span>
          Calculations
        </div>
        <Calculations windingCount={windingCount} results={results} />
      </div>
    </div>
  );
}
