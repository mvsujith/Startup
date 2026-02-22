import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment";
import ControlPanel from "./components/ControlPanel.jsx";
import "./App.css";

/* ──────── Physics Constants ──────── */
const GRAVITY = 9.81;
const PAPER_MASS = 0.005;
const STONE_MASS = 0.2;
const PAPER_CD_A = 0.08; // drag coeff × area for paper
const STONE_CD_A = 0.002;
const AIR_DENSITY = 1.225;
const PAPER_GROUND_Y = 0.5;
const STONE_GROUND_Y = -0.3;

/* ──────── Scene Constants ──────── */
const CAM_POS = new THREE.Vector3(6, 8, 14);
const SHADOW_SIZE = 2048;

function App() {
  /* ── React state ── */
  const [environment, setEnvironment] = useState("air");
  const [dropHeight, setDropHeight] = useState(8);
  const [isDropping, setIsDropping] = useState(false);
  const [hasDropped, setHasDropped] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [paperTime, setPaperTime] = useState(0);
  const [stoneTime, setStoneTime] = useState(0);
  const [paperLanded, setPaperLanded] = useState(false);
  const [stoneLanded, setStoneLanded] = useState(false);
  const [paperSpeed, setPaperSpeed] = useState(0);
  const [stoneSpeed, setStoneSpeed] = useState(0);
  const [isSlowMo, setIsSlowMo] = useState(false);
  const [experimentStep, setExperimentStep] = useState(0);
  const [dropCount, setDropCount] = useState(0);

  /* ── Refs ── */
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const clockRef = useRef(new THREE.Clock(false));

  // 3D object refs
  const paperModelRef = useRef(null);
  const stoneModelRef = useRef(null);
  const glassJarRef = useRef(null);
  const airParticlesRef = useRef([]);
  const groundRef = useRef(null);
  const dropColumnRef = useRef(null);
  const paperLabelRef = useRef(null);
  const stoneLabelRef = useRef(null);

  const paperOffsetRef = useRef(0);
  const stoneOffsetRef = useRef(0);
  const baseCamDistRef = useRef(null); // stores camera distance at height ≤ 8

  // Physics state (not React state – updated every frame)
  const physicsRef = useRef({
    paperVel: 0,
    stoneVel: 0,
    paperY: 8,
    stoneY: 8,
    paperLanded: false,
    stoneLanded: false,
    paperTime: 0,
    stoneTime: 0,
    running: false,
    slowMo: false,
  });

  // Animation frame
  const frameRef = useRef(null);
  const envRef = useRef(environment);
  envRef.current = environment;

  /* ══════════════════════════════════════
     Scene Initialization
  ══════════════════════════════════════ */
  useEffect(() => {
    if (!mountRef.current) return;
    while (mountRef.current.firstChild) mountRef.current.removeChild(mountRef.current.firstChild);

    /* ── Renderer ── */
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    const w = mountRef.current.clientWidth || window.innerWidth;
    const h = mountRef.current.clientHeight || window.innerHeight;
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    /* ── Scene ── */
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b1224);
    scene.fog = new THREE.FogExp2(0x0b1224, 0.012);
    sceneRef.current = scene;

    // Environment map
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;

    /* ── Camera ── */
    const camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 500);
    camera.position.copy(CAM_POS);
    camera.lookAt(0, 4, 0);
    cameraRef.current = camera;

    /* ── Controls ── */
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.target.set(0, 4, 0);
    controls.minDistance = 6;
    controls.maxDistance = 30;
    controls.maxPolarAngle = Math.PI / 2.05;
    controls.update();
    controlsRef.current = controls;

    /* ── Lights ── */
    const ambient = new THREE.AmbientLight(0xffffff, 0.55);
    scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
    dirLight.position.set(8, 15, 10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(SHADOW_SIZE, SHADOW_SIZE);
    dirLight.shadow.camera.left = -15;
    dirLight.shadow.camera.right = 15;
    dirLight.shadow.camera.top = 15;
    dirLight.shadow.camera.bottom = -15;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 50;
    scene.add(dirLight);

    const rimLight = new THREE.DirectionalLight(0x3b82f6, 0.3);
    rimLight.position.set(-5, 8, -5);
    scene.add(rimLight);

    /* ── Ground Plane ── */
    const groundGeo = new THREE.PlaneGeometry(40, 40);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.95,
      metalness: 0.05,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    groundRef.current = ground;

    // Grid overlay
    const grid = new THREE.GridHelper(40, 40, 0x1e293b, 0x0f172a);
    grid.material.opacity = 0.25;
    grid.material.transparent = true;
    grid.position.y = 0.01;
    scene.add(grid);

    /* ── Height ruler lines (gamified glow) ── */
    for (let h = 1; h <= 12; h++) {
      const lineWidth = 1.5;
      const points = [
        new THREE.Vector3(-lineWidth, h, 0),
        new THREE.Vector3(lineWidth, h, 0),
      ];
      const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
      const lineMat = new THREE.LineBasicMaterial({
        color: 0x5eead4,
        transparent: true,
        opacity: 0.6,
      });
      const line = new THREE.Line(lineGeo, lineMat);
      scene.add(line);

      // Height number labels
      const numCanvas = document.createElement("canvas");
      numCanvas.width = 64;
      numCanvas.height = 32;
      const numCtx = numCanvas.getContext("2d");
      numCtx.font = "bold 14px Inter, sans-serif";
      numCtx.fillStyle = "#5eead4";
      numCtx.textAlign = "center";
      numCtx.textBaseline = "middle";
      numCtx.fillText(`${h}m`, 32, 16);
      const numTex = new THREE.CanvasTexture(numCanvas);
      const numSprite = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: numTex, transparent: true, depthWrite: false })
      );
      numSprite.scale.set(0.8, 0.4, 1);
      numSprite.position.set(lineWidth + 0.8, h, 0);
      scene.add(numSprite);
    }

    /* ── Drop Column (transparent) ── */
    const colGeo = new THREE.CylinderGeometry(7, 7, 20, 32, 1, true);
    const colMat = new THREE.MeshPhysicalMaterial({
      color: 0x5eead4,
      transparent: true,
      opacity: 0.04,
      roughness: 0.1,
      metalness: 0.0,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const column = new THREE.Mesh(colGeo, colMat);
    column.position.y = 10;
    scene.add(column);
    dropColumnRef.current = column;

    /* ── Load 3D Models ── */
    const loader = new GLTFLoader();

    // Paper
    loader.load("/paper.glb", (gltf) => {
      const model = gltf.scene;
      const box = new THREE.Box3().setFromObject(model);
      const size = new THREE.Vector3();
      box.getSize(size);
      const s = 3.5 / Math.max(size.x, size.y, size.z);
      model.scale.set(s, s, s);
      model.traverse((c) => {
        if (c.isMesh) {
          c.castShadow = true;
          c.receiveShadow = true;
          if (c.material) {
            c.material.side = THREE.DoubleSide;
            c.material.envMap = envTex;
            c.material.needsUpdate = true;
          }
        }
      });
      // Wrapper group: model is offset inside so group origin = center-bottom
      const wrapper = new THREE.Group();
      model.position.set(0, 0, 0);
      const sBox = new THREE.Box3().setFromObject(model);
      const center = new THREE.Vector3();
      sBox.getCenter(center);
      model.position.set(-center.x, -sBox.min.y, -center.z);
      wrapper.add(model);
      paperOffsetRef.current = 0;
      wrapper.position.set(-3.5, 8, 0);
      scene.add(wrapper);
      paperModelRef.current = wrapper;
    });

    // Stone
    loader.load("/stone.glb", (gltf) => {
      const model = gltf.scene;
      const box = new THREE.Box3().setFromObject(model);
      const size = new THREE.Vector3();
      box.getSize(size);
      const s = 3.0 / Math.max(size.x, size.y, size.z);
      model.scale.set(s, s, s);
      model.traverse((c) => {
        if (c.isMesh) {
          c.castShadow = true;
          c.receiveShadow = true;
          if (c.material) {
            c.material.envMap = envTex;
            c.material.needsUpdate = true;
          }
        }
      });
      // Wrapper group: model is offset inside so group origin = center-bottom
      const wrapper = new THREE.Group();
      model.position.set(0, 0, 0);
      const sBox = new THREE.Box3().setFromObject(model);
      const center = new THREE.Vector3();
      sBox.getCenter(center);
      model.position.set(-center.x, -sBox.min.y, -center.z);
      wrapper.add(model);
      stoneOffsetRef.current = 0;
      wrapper.position.set(3.5, 7.5, 0);
      scene.add(wrapper);
      stoneModelRef.current = wrapper;
    });

    // Glass Jar (vacuum jar)
    loader.load("/glass_jar.glb", (gltf) => {
      const model = gltf.scene;
      const box = new THREE.Box3().setFromObject(model);
      const size = new THREE.Vector3();
      box.getSize(size);
      const s = 19.0 / Math.max(size.x, size.y, size.z);
      model.scale.set(s, s, s);
      model.traverse((c) => {
        if (c.isMesh) {
          c.castShadow = true;
          c.receiveShadow = true;
          if (c.material) {
            c.material.transparent = true;
            c.material.opacity = 0.18;
            c.material.roughness = 0.05;
            c.material.metalness = 0.1;
            c.material.envMap = envTex;
            c.material.envMapIntensity = 2.0;
            c.material.side = THREE.DoubleSide;
            c.material.depthWrite = false;
            c.material.needsUpdate = true;
          }
        }
      });
      const sBox = new THREE.Box3().setFromObject(model);
      model.position.set(0, -sBox.min.y, 0);
      model.visible = false; // hidden by default (air mode)
      scene.add(model);
      glassJarRef.current = model;
    });

    /* ── Air Particles ── */
    const particleGroup = new THREE.Group();
    const particleGeo = new THREE.SphereGeometry(0.06, 6, 6);
    const particleMat = new THREE.MeshBasicMaterial({
      color: 0x60a5fa,
      transparent: true,
      opacity: 0.35,
    });
    const particles = [];
    for (let i = 0; i < 300; i++) {
      const mesh = new THREE.Mesh(particleGeo, particleMat.clone());
      mesh.position.set(
        (Math.random() - 0.5) * 10,
        Math.random() * 15,
        (Math.random() - 0.5) * 10
      );
      mesh.userData.baseY = mesh.position.y;
      mesh.userData.speed = 0.3 + Math.random() * 0.5;
      mesh.userData.phase = Math.random() * Math.PI * 2;
      particleGroup.add(mesh);
      particles.push(mesh);
    }
    scene.add(particleGroup);
    airParticlesRef.current = particles;

    /* ── Labels (3D text sprites) ── */
    const makeLabel = (text, color) => {
      const canvas = document.createElement("canvas");
      canvas.width = 256;
      canvas.height = 64;
      const ctx = canvas.getContext("2d");
      ctx.font = "bold 40px Inter, sans-serif";
      ctx.fillStyle = color;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, 128, 32);
      const tex = new THREE.CanvasTexture(canvas);
      const spriteMat = new THREE.SpriteMaterial({
        map: tex,
        transparent: true,
        depthWrite: false,
      });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.scale.set(4.0, 1.0, 1);
      return sprite;
    };

    const paperLabel = makeLabel("📄 Paper", "#e2e8f0");
    paperLabel.position.set(-3.5, 11, 0);
    scene.add(paperLabel);
    paperLabelRef.current = paperLabel;

    const stoneLabel = makeLabel("🪨 Stone", "#d6d3d1");
    stoneLabel.position.set(3.5, 11, 0);
    scene.add(stoneLabel);
    stoneLabelRef.current = stoneLabel;

    /* ── Animate ── */
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      controls.update();

      // Animate air particles
      const t = performance.now() * 0.001;
      particles.forEach((p) => {
        if (envRef.current === "air") {
          p.visible = true;
          p.position.y = p.userData.baseY + Math.sin(t * p.userData.speed + p.userData.phase) * 0.6;
          p.position.x += Math.sin(t * 0.3 + p.userData.phase) * 0.003;
          p.material.opacity = 0.2 + Math.sin(t + p.userData.phase) * 0.15;
        } else {
          p.visible = false;
        }
      });

      // Physics
      const phys = physicsRef.current;
      if (phys.running) {
        const rawDt = 1 / 60;
        const dt = rawDt * (phys.slowMo ? 0.2 : 1.0);
        const rho = envRef.current === "air" ? AIR_DENSITY : 0;

        // Paper
        if (!phys.paperLanded) {
          const dragPaper =
            0.5 * rho * phys.paperVel * phys.paperVel * PAPER_CD_A;
          const netF = PAPER_MASS * GRAVITY - dragPaper;
          const acc = netF / PAPER_MASS;
          phys.paperVel += acc * dt;
          phys.paperY -= phys.paperVel * dt;
          phys.paperTime += dt;

          if (phys.paperY <= PAPER_GROUND_Y) {
            phys.paperY = PAPER_GROUND_Y;
            phys.paperLanded = true;
            phys.paperVel = 0;
          }
        }

        // Stone
        if (!phys.stoneLanded) {
          const dragStone =
            0.5 * rho * phys.stoneVel * phys.stoneVel * STONE_CD_A;
          const netF = STONE_MASS * GRAVITY - dragStone;
          const acc = netF / STONE_MASS;
          phys.stoneVel += acc * dt;
          phys.stoneY -= phys.stoneVel * dt;
          phys.stoneTime += dt;

          if (phys.stoneY <= STONE_GROUND_Y) {
            phys.stoneY = STONE_GROUND_Y;
            phys.stoneLanded = true;
            phys.stoneVel = 0;
          }
        }

        // Update model positions using cached offsets
        if (paperModelRef.current) {
          paperModelRef.current.position.y = phys.paperY - paperOffsetRef.current;

          // Flutter effect for paper in air
          if (envRef.current === "air" && !phys.paperLanded) {
            paperModelRef.current.rotation.z = Math.sin(t * 3) * 0.3;
            paperModelRef.current.rotation.x = Math.sin(t * 2.5) * 0.15;
            paperModelRef.current.position.x =
              -3.5 + Math.sin(t * 2) * 0.3;
          }
          // When paper lands, lay it flat on the ground
          if (phys.paperLanded) {
            paperModelRef.current.rotation.set(0, 0, 0);
            paperModelRef.current.position.x = -3.5;
          }
        }

        if (stoneModelRef.current) {
          stoneModelRef.current.position.y = phys.stoneY - stoneOffsetRef.current;
        }

        // Sync React state (throttled)
        if (Math.random() < 0.3) {
          setPaperTime(phys.paperTime);
          setStoneTime(phys.stoneTime);
          setPaperSpeed(Math.abs(phys.paperVel));
          setStoneSpeed(Math.abs(phys.stoneVel));
          setPaperLanded(phys.paperLanded);
          setStoneLanded(phys.stoneLanded);
        }

        // Both landed → stop
        if (phys.paperLanded && phys.stoneLanded) {
          phys.running = false;
          // Final sync
          setPaperTime(phys.paperTime);
          setStoneTime(phys.stoneTime);
          setPaperSpeed(0);
          setStoneSpeed(0);
          setPaperLanded(true);
          setStoneLanded(true);
          setIsDropping(false);
          setHasDropped(true);
          setExperimentStep(4);
        }
      }

      renderer.render(scene, camera);
    };
    animate();

    /* ── Resize ── */
    const onResize = () => {
      const w = mountRef.current?.clientWidth || window.innerWidth;
      const h = mountRef.current?.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener("resize", onResize);
      envTex.dispose();
      renderer.dispose();
      controls.dispose();
      if (mountRef.current?.contains(renderer.domElement)) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  /* ══════════════════════════════════════
     React → Three sync for environment / height
  ══════════════════════════════════════ */
  useEffect(() => {
    // Toggle glass jar visibility
    if (glassJarRef.current) {
      glassJarRef.current.visible = environment === "vacuum";
    }
    // Toggle air particles
    airParticlesRef.current.forEach((p) => {
      p.visible = environment === "air";
    });
    // Toggle column
    if (dropColumnRef.current) {
      dropColumnRef.current.material.color.set(
        environment === "air" ? 0x5eead4 : 0xa855f7
      );
    }
    if (experimentStep < 1) setExperimentStep(1);
  }, [environment]);

  useEffect(() => {
    // If height changes after a drop, auto-reset
    if (hasDropped || isDropping) {
      physicsRef.current.running = false;
      setIsDropping(false);
      setHasDropped(false);
      setPaperTime(0);
      setStoneTime(0);
      setPaperLanded(false);
      setStoneLanded(false);
      setPaperSpeed(0);
      setStoneSpeed(0);
      setIsSlowMo(false);
    }
    // Reposition models at new height
    if (paperModelRef.current) {
      paperModelRef.current.position.y = dropHeight - paperOffsetRef.current;
      paperModelRef.current.position.x = -3.5;
      paperModelRef.current.rotation.set(0, 0, 0);
    }
    if (stoneModelRef.current) {
      stoneModelRef.current.position.y = dropHeight - 0.5 - stoneOffsetRef.current;
      stoneModelRef.current.position.x = 3.5;
    }
    if (experimentStep < 2) setExperimentStep(2);
    // Move labels with models
    if (paperLabelRef.current) {
      paperLabelRef.current.position.y = dropHeight + 3;
    }
    if (stoneLabelRef.current) {
      stoneLabelRef.current.position.y = dropHeight + 3;
    }

    // Zoom camera out/in based on height, preserving user's orbit angle
    if (cameraRef.current && controlsRef.current) {
      const cam = cameraRef.current;
      const ctrl = controlsRef.current;
      const dir = new THREE.Vector3().subVectors(cam.position, ctrl.target);
      const currentDist = dir.length();

      if (dropHeight > 8) {
        // Save base distance when first going above 8
        if (baseCamDistRef.current === null) {
          baseCamDistRef.current = currentDist;
        }
        const scale = 1 + (dropHeight - 8) * 0.15;
        const newDist = baseCamDistRef.current * scale;
        dir.normalize().multiplyScalar(newDist);
        // Shift target up to keep scene centered
        ctrl.target.y = dropHeight / 2;
        cam.position.copy(ctrl.target).add(dir);
      } else {
        // When back at ≤ 8m, clear the saved distance
        if (baseCamDistRef.current !== null) {
          const scale = baseCamDistRef.current / currentDist;
          dir.multiplyScalar(scale);
          ctrl.target.y = 4;
          cam.position.copy(ctrl.target).add(dir);
          baseCamDistRef.current = null;
        }
      }
      ctrl.update();
    }
  }, [dropHeight]);

  /* ══════════════════════════════════════
     Actions
  ══════════════════════════════════════ */
  const handleDrop = useCallback(() => {
    if (isDropping || countdown !== null) return;

    setExperimentStep(3);
    // 3-2-1 countdown
    let c = 3;
    setCountdown(c);
    const interval = setInterval(() => {
      c--;
      if (c > 0) {
        setCountdown(c);
      } else if (c === 0) {
        setCountdown(0); // "DROP!"
      } else {
        clearInterval(interval);
        setCountdown(null);
        startDrop();
      }
    }, 700);
  }, [isDropping, countdown, dropHeight, environment]);

  const startDrop = useCallback(() => {
    // Reset physics
    physicsRef.current = {
      paperVel: 0,
      stoneVel: 0,
      paperY: dropHeight,
      stoneY: dropHeight,
      paperLanded: false,
      stoneLanded: false,
      paperTime: 0,
      stoneTime: 0,
      running: true,
      slowMo: isSlowMo,
    };

    setPaperTime(0);
    setStoneTime(0);
    setPaperLanded(false);
    setStoneLanded(false);
    setPaperSpeed(0);
    setStoneSpeed(0);
    setIsDropping(true);
    setHasDropped(false);
    setDropCount((d) => d + 1);
    setExperimentStep(3);
  }, [dropHeight, isSlowMo]);

  const handleReset = useCallback(() => {
    physicsRef.current.running = false;
    setIsDropping(false);
    setHasDropped(false);
    setPaperTime(0);
    setStoneTime(0);
    setPaperLanded(false);
    setStoneLanded(false);
    setPaperSpeed(0);
    setStoneSpeed(0);
    setCountdown(null);
    setIsSlowMo(false);

    // Reset model positions
    if (paperModelRef.current) {
      paperModelRef.current.position.y = dropHeight - paperOffsetRef.current;
      paperModelRef.current.position.x = -3.5;
      paperModelRef.current.rotation.set(0, 0, 0);
    }
    if (stoneModelRef.current) {
      stoneModelRef.current.position.y = dropHeight - 0.5 - stoneOffsetRef.current;
      stoneModelRef.current.position.x = 3.5;
    }
    setExperimentStep(2);
    // Reset labels
    if (paperLabelRef.current) {
      paperLabelRef.current.position.y = dropHeight + 3;
    }
    if (stoneLabelRef.current) {
      stoneLabelRef.current.position.y = dropHeight + 3;
    }
  }, [dropHeight]);

  const handleSlowMo = useCallback(() => {
    setIsSlowMo((v) => {
      const next = !v;
      physicsRef.current.slowMo = next;
      return next;
    });
  }, []);

  const handleEnvironmentChange = useCallback(
    (env) => {
      if (isDropping) return;
      setEnvironment(env);
      handleReset();
    },
    [isDropping, handleReset]
  );

  /* ══════════════════════════════════════
     Render
  ══════════════════════════════════════ */
  return (
    <div className="app-shell">
      {/* Left info sidebar */}
      <div className="info-sidebar">
        <div className="info-sidebar-header">
          <span className="info-icon">🧪</span>
          <h2>Air Resistance Experiment</h2>
        </div>
        <div className="info-sidebar-body">
          <div className="info-card">
            <h3>🎯 Objective</h3>
            <p>To observe the effect of <strong>air resistance</strong> on falling objects by comparing the fall of a paper and stone in air vs. vacuum.</p>
          </div>
          <div className="info-card">
            <h3>📚 Theory</h3>
            <p>All objects experience the same gravitational acceleration (<strong>g = 9.8 m/s²</strong>). However, <strong>air resistance</strong> (drag force) opposes motion and depends on:</p>
            <ul>
              <li><strong>Surface Area</strong> — larger area = more drag</li>
              <li><strong>Speed</strong> — faster = more drag</li>
              <li><strong>Shape</strong> — flat shapes catch more air</li>
            </ul>
            <p>Paper has a large surface area relative to its mass, so air slows it much more than the stone.</p>
          </div>
          <div className="info-card formula-card">
            <h3>📐 Drag Force Formula</h3>
            <div className="formula">F<sub>drag</sub> = ½ · ρ · v² · C<sub>d</sub> · A</div>
            <div className="formula-legend">
              <span>ρ = air density</span>
              <span>v = velocity</span>
              <span>C<sub>d</sub> = drag coeff</span>
              <span>A = surface area</span>
            </div>
          </div>
          <div className="info-card">
            <h3>💡 Key Insight</h3>
            <p>In a <strong>vacuum</strong> (no air), ρ = 0, so drag force = 0. Both objects experience <strong>only gravity</strong> and fall at the <strong>same rate</strong> — proving that mass doesn't affect free-fall acceleration!</p>
          </div>
        </div>
      </div>

      {/* 3D Canvas */}
      <div ref={mountRef} className="canvas-shell" />

      {/* HUD Badge */}
      <div className="hud-overlay">
        <div className={`hud-badge ${environment}`}>
          {environment === "air" ? "🌬️ WITH AIR" : "🔬 VACUUM"}
        </div>
        {isDropping && (
          <div className="hud-badge" style={{
            background: "rgba(239, 68, 68, 0.2)",
            borderColor: "rgba(239, 68, 68, 0.5)",
            color: "#fca5a5",
            animation: "pulse-drop 0.6s ease infinite"
          }}>
            ⏬ DROPPING
          </div>
        )}
        {isSlowMo && isDropping && (
          <div className="hud-badge" style={{
            background: "rgba(251, 191, 36, 0.2)",
            borderColor: "rgba(251, 191, 36, 0.5)",
            color: "#fbbf24",
          }}>
            🐌 SLOW-MO
          </div>
        )}
      </div>

      {/* Control Panel */}
      <ControlPanel
        environment={environment}
        onEnvironmentChange={handleEnvironmentChange}
        dropHeight={dropHeight}
        onDropHeightChange={setDropHeight}
        isDropping={isDropping}
        hasDropped={hasDropped}
        countdown={countdown}
        onDrop={handleDrop}
        onReset={handleReset}
        onSlowMo={handleSlowMo}
        isSlowMo={isSlowMo}
        paperTime={paperTime}
        stoneTime={stoneTime}
        paperLanded={paperLanded}
        stoneLanded={stoneLanded}
        paperSpeed={paperSpeed}
        stoneSpeed={stoneSpeed}
        experimentStep={experimentStep}
        dropCount={dropCount}
      />

      {/* Full-screen Countdown Overlay */}
      {countdown !== null && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0, 0, 0, 0.6)',
          zIndex: 9999,
          pointerEvents: 'none',
        }}>
          <div key={countdown} style={{
            fontSize: countdown === 0 ? '8rem' : '12rem',
            fontWeight: 900,
            color: countdown === 0 ? '#22d3ee' : '#f8fafc',
            textShadow: countdown === 0
              ? '0 0 40px #22d3ee, 0 0 80px #22d3ee, 0 0 120px #0891b2'
              : '0 0 30px rgba(255,255,255,0.5), 0 0 60px rgba(94,234,212,0.3)',
            animation: 'countdownPop 0.6s ease-out',
            fontFamily: 'Inter, sans-serif',
            letterSpacing: countdown === 0 ? '0.1em' : '0',
          }}>
            {countdown === 0 ? 'DROP!' : countdown}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
