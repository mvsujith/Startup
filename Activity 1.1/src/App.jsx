import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment";
import { PMREMGenerator } from "three";
import Sidebar from "./components/Sidebar.jsx";
import ExperimentPanel from "./components/ExperimentPanel.jsx";
import { WaterSystem } from "./systems/WaterSystem.js";
import { MaterialSystem } from "./systems/MaterialSystem.js";
import { ParticleSystem } from "./systems/ParticleSystem.js";
import { MolecularViewSystem } from "./systems/MolecularViewSystem.js";
import "./components/Sidebar.css";
import "./App.css";

const GRID_SIZE = 20;
const GRID_DIVISIONS = 20;
const CAMERA_POSITION = new THREE.Vector3(0, 10, 15);
const SHADOW_MAP_SIZE = 2048;
const BEAKER_SCALE = 0.6;
const PLANE_HALF_EXTENT = GRID_SIZE / 2;

function App() {
  const mountRef = useRef(null);
  const pointerHitRef = useRef(null);
  const sceneRef = useRef(null);
  const updatePointerHitRef = useRef(null);
  const envMapRef = useRef(null);
  const placedObjectsRef = useRef([]);
  const selectedRef = useRef(null);
  const isDraggingRef = useRef(false);
  const controlsRef = useRef(null);
  const handleDragOverRef = useRef(null);
  const handleDropRef = useRef(null);

  // System refs
  const waterSystemRef = useRef(null);
  const materialSystemRef = useRef(null);
  const particleSystemRef = useRef(null);
  const molecularViewSystemRef = useRef(null);
  const beakerObjectRef = useRef(null);

  // Experiment state
  const [currentStep, setCurrentStep] = useState(0);
  const [waterLevel, setWaterLevel] = useState(0);
  const [markedLevel, setMarkedLevel] = useState(null);
  const [observations, setObservations] = useState([]);
  const [isInMolecularView, setIsInMolecularView] = useState(false);
  const [currentMaterial, setCurrentMaterial] = useState(null);
  const [hasBeaker, setHasBeaker] = useState(false);

  // Helper to add observations
  const addObservation = (text) => {
    const time = new Date().toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    setObservations(prev => [...prev, { time, text }]);
  };

  useEffect(() => {
    if (!mountRef.current) return;

    // Clean any previous canvas (helps during HMR/StrictMode re-renders)
    while (mountRef.current.firstChild) {
      mountRef.current.removeChild(mountRef.current.firstChild);
    }

    // Scene + renderer (match WorkspaceCanvas defaults)
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f162e);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      logarithmicDepthBuffer: true,
    });
    sceneRef.current = scene;
    const initialWidth = mountRef.current.clientWidth || window.innerWidth;
    const initialHeight = mountRef.current.clientHeight || window.innerHeight;
    renderer.setSize(initialWidth, initialHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    mountRef.current.appendChild(renderer.domElement);

    const handleCanvasDragOver = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
      handleDragOverRef.current?.(e);
    };
    const handleCanvasDrop = (e) => {
      e.preventDefault();
      e.stopPropagation();
      handleDropRef.current?.(e);
    };
    renderer.domElement.addEventListener("dragover", handleCanvasDragOver);
    renderer.domElement.addEventListener("drop", handleCanvasDrop);

    const pmremGenerator = new PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    const envTex = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    envMapRef.current = envTex;
    scene.environment = envTex;

    // Camera and orbit controls
    const camera = new THREE.PerspectiveCamera(
      75,
      initialWidth / initialHeight,
      0.1,
      1000
    );
    camera.position.copy(CAMERA_POSITION);
    camera.lookAt(0, 0, 0);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = true;
    // Disable right-click panning (prevents plane movement on RMB drag)
    controls.enablePan = false;
    controls.minDistance = 5;
    controls.maxDistance = 50;
    controls.maxPolarAngle = Math.PI / 2;
    controls.target.set(0, 0, 0);
    controls.update();
    controlsRef.current = controls;

    // Grid helper acts as the interaction plane
    const grid = new THREE.GridHelper(
      GRID_SIZE,
      GRID_DIVISIONS,
      0x888888,
      0x444444
    );
    grid.material.opacity = 0.5;
    grid.material.transparent = true;
    scene.add(grid);

    // Invisible drop plane for consistent raycast hits
    const dropPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(400, 400),
      new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide })
    );
    dropPlane.rotation.x = -Math.PI / 2;
    scene.add(dropPlane);

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 5, 5);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = SHADOW_MAP_SIZE;
    dirLight.shadow.mapSize.height = SHADOW_MAP_SIZE;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 50;
    scene.add(dirLight);

    // Initialize experiment systems
    waterSystemRef.current = new WaterSystem(scene);
    materialSystemRef.current = new MaterialSystem();
    particleSystemRef.current = new ParticleSystem(scene);
    molecularViewSystemRef.current = new MolecularViewSystem(scene, camera, controls);

    // Raycaster kept for interactions and drop positioning
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const findDraggableRoot = (object) => {
      let current = object;
      while (current && !current.userData?.isDraggable && current.parent) {
        current = current.parent;
      }
      const result = current && current.userData?.isDraggable ? current : null;
      if (!result) {
        console.debug("findDraggableRoot: no draggable ancestor", object?.name);
      }
      return result;
    };

    const clampToPlane = (value) =>
      THREE.MathUtils.clamp(value, -PLANE_HALF_EXTENT, PLANE_HALF_EXTENT);

    const updatePointerHit = (event) => {
      if (isDraggingRef.current && event) {
        event.stopImmediatePropagation?.();
        event.preventDefault();
      }
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const hit = raycaster.intersectObject(dropPlane, true)[0];
      if (hit) {
        pointerHitRef.current = hit.point.clone();
        if (isDraggingRef.current && selectedRef.current) {
          const target = selectedRef.current;
          target.position.x = clampToPlane(hit.point.x);
          target.position.z = clampToPlane(hit.point.z);
          target.position.y = Math.max(target.position.y, 0.01);
        }
      }
    };

    updatePointerHitRef.current = updatePointerHit;

    renderer.domElement.addEventListener("pointermove", updatePointerHit);

    const handleContextMenu = (e) => {
      e.preventDefault();
    };
    renderer.domElement.addEventListener("contextmenu", handleContextMenu);

    const handlePointerDown = (event) => {
      updatePointerHit(event);
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(placedObjectsRef.current, true);
      console.debug("pointerdown intersects", intersects.length);
      if (intersects.length > 0) {
        const draggable = findDraggableRoot(intersects[0].object);
        if (draggable) {
          // Left click: select only. Right click: drag.
          if (event.button === 0) {
            console.debug("selected (left click)", draggable.name || "beaker", draggable.uuid);
            selectedRef.current = draggable;
            isDraggingRef.current = false;
          } else if (event.button === 2) {
            console.debug("drag start (right click)", draggable.name || "beaker", draggable.uuid);
            selectedRef.current = draggable;
            isDraggingRef.current = true;
            event.stopImmediatePropagation?.();
            event.preventDefault();
            if (controlsRef.current) controlsRef.current.enabled = false;
            renderer.domElement.setPointerCapture(event.pointerId);
          }
        }
      } else {
        console.debug("pointerdown: nothing hit");
      }
    };

    const handlePointerUp = (event) => {
      // Always end drag on pointer up, but keep selection if it was a left-click select.
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        if (renderer.domElement.hasPointerCapture(event.pointerId)) {
          renderer.domElement.releasePointerCapture(event.pointerId);
        }
        if (controlsRef.current) controlsRef.current.enabled = true;
      }
    };

    renderer.domElement.addEventListener("pointerdown", handlePointerDown);
    renderer.domElement.addEventListener("pointerup", handlePointerUp);

    const handleResize = () => {
      const width = mountRef.current?.clientWidth || window.innerWidth;
      const height = mountRef.current?.clientHeight || window.innerHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      controls.update();
    };

    window.addEventListener("resize", handleResize);

    let frameId;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      controls.update();

      // Update particle system
      if (particleSystemRef.current) {
        particleSystemRef.current.update();
      }

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", handleResize);
      renderer.domElement.removeEventListener("pointermove", updatePointerHit);
      renderer.domElement.removeEventListener("contextmenu", handleContextMenu);
      renderer.domElement.removeEventListener("dragover", handleCanvasDragOver);
      renderer.domElement.removeEventListener("drop", handleCanvasDrop);
      renderer.domElement.removeEventListener("pointerdown", handlePointerDown);
      renderer.domElement.removeEventListener("pointerup", handlePointerUp);
      updatePointerHitRef.current = null;
      sceneRef.current = null;
      if (envMapRef.current) {
        envMapRef.current.dispose?.();
        envMapRef.current = null;
      }
      controls.dispose();
      renderer.dispose();

      // Cleanup systems
      if (waterSystemRef.current) {
        waterSystemRef.current.dispose();
        waterSystemRef.current = null;
      }
      if (particleSystemRef.current) {
        particleSystemRef.current.dispose();
        particleSystemRef.current = null;
      }
      if (molecularViewSystemRef.current) {
        molecularViewSystemRef.current.dispose();
        molecularViewSystemRef.current = null;
      }

      if (mountRef.current?.contains(renderer.domElement)) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  // GLTF loader shared for beaker placement
  const gltfLoaderRef = useRef(null);

  useEffect(() => {
    gltfLoaderRef.current = new GLTFLoader();
    return () => {
      gltfLoaderRef.current = null;
    };
  }, []);

  const handleDragStart = (e, componentData) => {
    console.log("🚀 Drag started with component:", componentData);
    const payload = JSON.stringify(componentData);
    e.dataTransfer.setData("component", payload);
    // Some browsers (e.g. Firefox) are happier when a standard mime type is set.
    e.dataTransfer.setData("text/plain", payload);
    e.dataTransfer.effectAllowed = "copy";
    console.log("✅ DataTransfer set:", payload);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    if (updatePointerHitRef.current) {
      updatePointerHitRef.current(e);
    }
  };

  const placeBeaker = (point) => {
    console.log("🧪 placeBeaker called with point:", point);
    if (!gltfLoaderRef.current || !point || !mountRef.current) {
      console.warn("❌ placeBeaker: Missing required references", {
        hasLoader: !!gltfLoaderRef.current,
        hasPoint: !!point,
        hasMount: !!mountRef.current,
      });
      return;
    }
    const scene = sceneRef.current;
    if (!scene) {
      console.warn("❌ placeBeaker: No scene available");
      return;
    }
    console.log("📦 Loading beaker.glb...");
    gltfLoaderRef.current.load(
      "/beaker.glb",  // Fixed: lowercase 'beaker.glb' is the correct file with actual 3D model
      (gltf) => {
        console.log("✅ beaker.glb loaded successfully!", gltf);
        const model = gltf.scene;
        model.userData.isDraggable = true;
        model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            if (child.material) {
              const mat = child.material;
              if (Array.isArray(mat)) {
                mat.forEach((m) => {
                  if (!m) return;
                  m.envMap = envMapRef.current;
                  m.envMapIntensity = 1.25;
                  if (m.transparent && m.opacity < 0.35) {
                    m.opacity = 0.35;
                  }
                  m.roughness = Math.max(0.02, m.roughness ?? 0.02);
                  m.metalness = m.metalness ?? 0.05;
                  m.needsUpdate = true;
                });
              } else {
                mat.envMap = envMapRef.current;
                mat.envMapIntensity = 1.25;
                if (mat.transparent && mat.opacity < 0.35) {
                  mat.opacity = 0.35;
                }
                mat.roughness = Math.max(0.02, mat.roughness ?? 0.02);
                mat.metalness = mat.metalness ?? 0.05;
                mat.needsUpdate = true;
              }
            }
          }
        });
        model.position.copy(point);
        model.position.x = THREE.MathUtils.clamp(
          model.position.x,
          -PLANE_HALF_EXTENT,
          PLANE_HALF_EXTENT
        );
        model.position.z = THREE.MathUtils.clamp(
          model.position.z,
          -PLANE_HALF_EXTENT,
          PLANE_HALF_EXTENT
        );
        // Slight lift to avoid z-fighting with grid
        model.position.y = Math.max(model.position.y, 0.01);
        model.scale.set(BEAKER_SCALE, BEAKER_SCALE, BEAKER_SCALE);
        scene.add(model);
        placedObjectsRef.current.push(model);
        beakerObjectRef.current = model; // Store beaker reference
        setHasBeaker(true);
        setCurrentStep(1);
        addObservation("Beaker placed on workspace");
        console.log("✅ Beaker added to scene at position:", model.position);
      },
      undefined,
      (error) => {
        console.error("❌ Failed to load beaker.glb", error);
      }
    );
  };

  const handleDrop = (e) => {
    console.log("📦 Drop event triggered!", e);
    e.preventDefault();
    if (updatePointerHitRef.current) {
      updatePointerHitRef.current(e);
    }
    const dropPoint = pointerHitRef.current;
    console.log("📍 Drop point:", dropPoint);
    if (!dropPoint) {
      console.warn("❌ No drop point available");
      return;
    }
    try {
      const rawData = e.dataTransfer.getData("component");
      console.log("📄 Raw data from dataTransfer:", rawData);
      const data = JSON.parse(rawData);
      console.log("✨ Parsed data:", data);

      if (data?.type === "beaker") {
        console.log("🧪 Placing beaker at:", dropPoint);
        placeBeaker(dropPoint);
      } else if (data?.type === "water") {
        // Fill water in beaker
        if (!hasBeaker || !waterSystemRef.current || !beakerObjectRef.current) {
          addObservation("⚠️ Please place a beaker first!");
          return;
        }
        // Set beaker reference in water system
        waterSystemRef.current.setBeakerObject(beakerObjectRef.current);
        waterSystemRef.current.fillWater(100); // Fill to 100mL (updated from 50)
        setWaterLevel(100);
        setMarkedLevel(100);
        setCurrentStep(2);
        addObservation("Water filled to 100 mL");
        addObservation("Red marker line placed at water level");
      } else if (data?.type === "salt" || data?.type === "sugar" || data?.type === "sand") {
        // Add material to water
        if (!hasBeaker || !waterSystemRef.current || !beakerObjectRef.current) {
          addObservation("⚠️ Please place a beaker first!");
          return;
        }
        if (waterSystemRef.current.getCurrentLevel() === 0) {
          addObservation("⚠️ Please add water to the beaker first!");
          return;
        }

        const material = materialSystemRef.current.getMaterial(data.type);
        if (!material) return;

        const beakerPos = beakerObjectRef.current.position;
        const currentWaterLevel = waterSystemRef.current.getCurrentLevel();

        if (material.dissolves) {
          // DISSOLVING material (salt or sugar)
          addObservation(`Adding ${material.name}...`);
          particleSystemRef.current.createDissolvingParticles(material, beakerObjectRef.current, currentWaterLevel);
          waterSystemRef.current.addCloudiness(material.cloudiness);

          setTimeout(() => {
            addObservation(` ${material.name} dissolved completely`);
            addObservation(`💡 Water level remains at ${waterLevel.toFixed(1)} mL (no change)`);
            setCurrentMaterial(data.type);
            setCurrentStep(Math.max(currentStep, 4));
          }, material.dissolutionTime);

        } else {
          // NON-DISSOLVING material (sand)
          addObservation(`Adding ${material.name}...`);
          particleSystemRef.current.createSettlingParticles(material, beakerObjectRef.current, currentWaterLevel);
          waterSystemRef.current.addCloudiness(material.cloudiness);

          setTimeout(() => {
            const newLevel = currentWaterLevel + material.volumeDisplacement;
            waterSystemRef.current.adjustLevel(material.volumeDisplacement, 500);
            setWaterLevel(newLevel);
            addObservation(`${material.name} settled at bottom`);
            addObservation(`⚠️ Water level ROSE to ${newLevel.toFixed(1)} mL (+${material.volumeDisplacement.toFixed(1)} mL)`);
            setCurrentMaterial(data.type);
            setCurrentStep(Math.max(currentStep, 4));
          }, material.settlingTime);
        }

        setCurrentStep(Math.max(currentStep, 3));
      } else {
        console.log("⚠️ Unknown data type:", data?.type);
      }
    } catch (err) {
      console.error("❌ Drop parse error", err);
    }
  };

  // Ensure drag/drop works even when the cursor is over the WebGL canvas
  handleDragOverRef.current = handleDragOver;
  handleDropRef.current = handleDrop;

  // Molecular zoom toggle handler
  const handleToggleZoom = () => {
    if (!molecularViewSystemRef.current || !currentMaterial || !beakerObjectRef.current) return;

    if (isInMolecularView) {
      molecularViewSystemRef.current.exitMolecularView();
      setIsInMolecularView(false);
      addObservation("Returned to normal view");
    } else {
      const beakerPos = beakerObjectRef.current.position;
      const currentWaterLevel = waterSystemRef.current?.getCurrentLevel() || 50;
      molecularViewSystemRef.current.enterMolecularView(currentMaterial, beakerPos, currentWaterLevel);
      setIsInMolecularView(true);
      setCurrentStep(Math.max(currentStep, 6));
      addObservation(`Zoomed to molecular level to see ${currentMaterial} interaction`);
    }
  };

  // Reset experiment handler
  const handleReset = () => {
    // Reset water system
    if (waterSystemRef.current) {
      waterSystemRef.current.reset();
    }

    // Clear particles
    if (particleSystemRef.current) {
      particleSystemRef.current.clear();
    }

    // Exit molecular view if active
    if (isInMolecularView && molecularViewSystemRef.current) {
      molecularViewSystemRef.current.exitMolecularView();
    }

    // Reset state
    setWaterLevel(0);
    setMarkedLevel(null);
    setCurrentStep(hasBeaker ? 1 : 0);
    setObservations([]);
    setIsInMolecularView(false);
    setCurrentMaterial(null);

    addObservation("Experiment reset");
  };

  return (
    <div className="app-shell">
      <Sidebar title="Lab Equipment" position="left">
        <div className="component-list">
          <div
            className="component-item"
            data-type="beaker"
            draggable
            onDragStart={(e) =>
              handleDragStart(e, { type: "beaker", file: "beaker.glb" })
            }
          >
            <span className="component-name">
              <span className="component-icon">🧪</span>
              Beaker
            </span>
            <span className="component-meta">150 mL</span>
          </div>
          <div
            className="component-item"
            data-type="water"
            draggable
            onDragStart={(e) => handleDragStart(e, { type: "water" })}
          >
            <span className="component-name">
              <span className="component-icon">💧</span>
              Water
            </span>
            <span className="component-meta">Liquid</span>
          </div>
          <div
            className="component-item"
            data-type="salt"
            draggable
            onDragStart={(e) => handleDragStart(e, { type: "salt" })}
          >
            <span className="component-name">
              <span className="component-icon">🧂</span>
              Salt
            </span>
            <span className="component-meta">Soluble</span>
          </div>
          <div
            className="component-item"
            data-type="sugar"
            draggable
            onDragStart={(e) => handleDragStart(e, { type: "sugar" })}
          >
            <span className="component-name">
              <span className="component-icon">🍬</span>
              Sugar
            </span>
            <span className="component-meta">Soluble</span>
          </div>
          <div
            className="component-item"
            data-type="sand"
            draggable
            onDragStart={(e) => handleDragStart(e, { type: "sand" })}
          >
            <span className="component-name">
              <span className="component-icon">⏳</span>
              Sand
            </span>
            <span className="component-meta">Insoluble</span>
          </div>
        </div>
      </Sidebar>

      <ExperimentPanel
        currentStep={currentStep}
        waterLevel={waterLevel}
        markedLevel={markedLevel}
        observations={observations}
        onReset={handleReset}
        onToggleZoom={handleToggleZoom}
        isInMolecularView={isInMolecularView}
        canZoom={currentMaterial}
      />

      <div
        ref={mountRef}
        className="canvas-shell"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      />
    </div>
  );
}

export default App;
