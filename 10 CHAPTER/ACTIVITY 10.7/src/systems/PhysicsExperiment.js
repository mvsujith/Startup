import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { PMREMGenerator } from 'three';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';

export class PhysicsExperiment {
  constructor(container, onModelsReady, onStateChange) {
    this.container = container;
    this.components = {};
    this.onModelsReady = onModelsReady;
    this.onStateChange = onStateChange;
    
    // Physics Simulation State (True SI Units: kg, m, s)
    this.clock = new THREE.Clock();
    this.isSimulating = false;
    this.trolleyMass = 1.0; // 1kg
    this.blockMass = 0.40; // 400g
    this.massPan = 0; // kg
    this.gravity = 9.81;
    this.frictionCoeff = 0.35; // Lowered for more sliding distance
    
    this.velocity = 0;
    this.impactVelocity = 0;
    this.trolleyDisplacement = 0;
    this.blockDisplacement = 0;
    this.hasHitBlock = false;
    
    this.currentWeights = [];
    this.initialPlatePos = null;
    this.mode = 'free';
    this.accumulator = 0;
    this.fixedTimeStep = 1 / 60;
    
    this.init();
    this.loadModels();
    this.animate();
  }

  init() {
    this.width = this.container.clientWidth || window.innerWidth;
    this.height = this.container.clientHeight || window.innerHeight;

    // SCENE
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0f162e);

    // RENDERER
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(this.width, this.height);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.container.appendChild(this.renderer.domElement);

    // CSS2D RENDERER FOR LABELS
    this.labelRenderer = new CSS2DRenderer();
    this.labelRenderer.setSize(this.width, this.height);
    this.labelRenderer.domElement.style.position = 'absolute';
    this.labelRenderer.domElement.style.top = '0px';
    this.labelRenderer.domElement.style.pointerEvents = 'none';
    this.container.appendChild(this.labelRenderer.domElement);

    // ENVIRONMENT LIGHTING
    const pmremGenerator = new PMREMGenerator(this.renderer);
    pmremGenerator.compileEquirectangularShader();
    this.envMap = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environment = this.envMap;

    // CAMERA
    this.camera = new THREE.PerspectiveCamera(60, this.width / this.height, 0.1, 1000);
    this.camera.position.set(0, 15, 25);
    this.camera.lookAt(0, 0, 0);

    // CONTROLS
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.05;

    // LIGHTS
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
    dirLight.position.set(10, 15, 10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    this.scene.add(dirLight);

    // EVENT LISTENERS
    this.onResize = this.onResize.bind(this);
    window.addEventListener("resize", this.onResize);
  }

  loadModels() {
    this.loader = new GLTFLoader();

    // Models configuration: path, explicit scale, position, rotation
    const loadQueue = [
      { key: 'table', url: '/Table.glb', scale: 1.414, pos: [0, -5.83, 0], rot: [0, 0, 0], anchor: 'none' },
      { key: 'trolley', url: '/wooden trolly.glb', scale: 0.00206, pos: [-6.94, 0.69, 0], rot: [0, 1.378, -0.0016], anchor: 'none' },
      { key: 'pulley', url: '/pulley.glb', scale: 14.56, pos: [10.4, 0.8, 0], rot: [0, -1.57, 0], anchor: 'none' },
      { key: 'block', url: '/block.glb', scale: 30, pos: [-1.16, 0, 0], rot: [0, -0.031, 1.558], anchor: 'none' }
    ];

    let loadedCount = 0;
    
    loadQueue.forEach(item => {
      this.loader.load(item.url, (gltf) => {
        const model = gltf.scene;

        model.traverse(child => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            if (child.material) {
              if (item.key === 'table') {
                child.material.color.setHex(0xffffff);
                child.material.metalness = 0.1;
                child.material.roughness = 0.9;
                const texLoader = new THREE.TextureLoader();
                texLoader.load('/TABLE.png', (tex) => {
                    tex.colorSpace = THREE.SRGBColorSpace;
                    tex.wrapS = THREE.RepeatWrapping;
                    tex.wrapT = THREE.RepeatWrapping;
                    child.material.map = tex;
                    child.material.needsUpdate = true;
                });
              }
              child.material.envMap = this.envMap;
              child.material.needsUpdate = true;
            }
          }
        });

        const box = new THREE.Box3().setFromObject(model);
        const size = new THREE.Vector3();
        box.getSize(size);
        const center = new THREE.Vector3();
        box.getCenter(center);

        model.position.x -= center.x;
        model.position.y -= center.y;
        model.position.z -= center.z;

        const wrapper = new THREE.Group();
        wrapper.add(model);
        
        const scale = item.scale !== undefined ? item.scale : (item.size / Math.max(size.x, size.y, size.z));
        wrapper.scale.set(scale, scale, scale);

        wrapper.position.set(item.pos[0], item.pos[1], item.pos[2]);
        wrapper.rotation.set(item.rot[0], item.rot[1], item.rot[2]);

        this.scene.add(wrapper);
        this.components[item.key] = wrapper;
        
        loadedCount++;
        this.checkIfAllLoaded(loadedCount, loadQueue.length);

      }, undefined, (err) => {
        console.error(`Error loading ${item.url}:`, err);
        loadedCount++;
        this.checkIfAllLoaded(loadedCount, loadQueue.length);
      });
    });

    // Invisible weight template used for cloning when addWeight is called
    this.loader.load('/slotted weights.glb', (gltf) => {
        this.weightTemplate = gltf.scene;
        this.weightTemplate.traverse(child => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                if(this.envMap) child.material.envMap = this.envMap;
            }
        });
    });
  }

  checkIfAllLoaded(count, expected) {
      if (count === expected) {
          this.updateTautStrings();
          if (this.plateMesh) {
              this.initialPlatePos = this.plateMesh.position.clone();
          }
          this.initArrows();
          if (this.onModelsReady) this.onModelsReady();
          if (this.onStateChange) this.onStateChange(this.getPhysicsState());
      }
  }

  // ---- Interaction Methods ----
  
  addWeight() {
      if (!this.weightTemplate || this.isSimulating || this.velocity > 0) return;
      if (this.currentWeights.length >= 10) return; // limit 500g (10 * 50g)

      const newWeight = this.weightTemplate.clone();
      newWeight.scale.set(0.53, 0.53, 0.53); // specific scale for slots

      // Stack height (finer gaps for 10 weights)
      const stackHeight = 0.05 + (this.currentWeights.length * 0.25); 
      newWeight.position.set(0, stackHeight, 0); 

      this.plateMesh.add(newWeight);
      this.currentWeights.push(newWeight);
      
      this.massPan += 0.05; // 50g = 0.05kg
      if (this.onStateChange) this.onStateChange(this.getPhysicsState());
  }

  removeWeight() {
      if (this.isSimulating || this.velocity > 0) return;
      if (this.currentWeights.length === 0) return;
      
      const w = this.currentWeights.pop();
      this.plateMesh.remove(w);
      this.massPan -= 0.05;
      
      // Fix strict JavaScript decimal math issues (e.g. 0.1500000000001)
      this.massPan = Math.max(0, Math.round(this.massPan * 100) / 100);

      if (this.onStateChange) this.onStateChange(this.getPhysicsState());
  }

  startSimulation() {
      if (this.massPan === 0 || this.isSimulating || this.plateMesh.position.y <= -6) return;
      if (this.trolleyDisplacement > 0) return; // Prevent restarting a finished run without reset
      this.isSimulating = true;
      this.accumulator = 0;
      this.clock.start();
      if (this.onStateChange) this.onStateChange(this.getPhysicsState());
  }

  resetSimulation() {
      this.isSimulating = false;
      this.velocity = 0;
      this.impactVelocity = 0;
      this.trolleyDisplacement = 0;
      this.blockDisplacement = 0;
      this.hasHitBlock = false;
      
      // Reset absolute positions matched to original payload
      if (this.components['trolley']) this.components['trolley'].position.set(-6.94, 0.69, 0);
      if (this.components['block']) this.components['block'].position.set(-1.16, 0, 0);
      if (this.plateMesh && this.initialPlatePos) this.plateMesh.position.copy(this.initialPlatePos);
      if (this.components['pulley']) this.components['pulley'].rotation.set(0, -1.57, 0);
      
      this.updateTautStrings();
      if (this.onStateChange) this.onStateChange(this.getPhysicsState());
  }

  getPhysicsState() {
     // Mathematical derivations
     const mP = this.massPan;
     const mT = this.trolleyMass;
     const mB = this.blockMass;
     const fK = this.frictionCoeff;
     const g = this.gravity;

     const plateHitFloor = this.plateMesh ? this.plateMesh.position.y <= -5.7 : false;
     const pullingForce = plateHitFloor ? 0 : (mP * g);
     const accelMass = plateHitFloor ? 0 : mP;

     const a1 = pullingForce / (mT + accelMass);
     const netForce2 = pullingForce - (fK * mB * g);
     const a2 = netForce2 / (mT + mB + accelMass);

     return {
         massPan: this.massPan,
         velocity: this.velocity,
         impactVelocity: this.impactVelocity,
         trolleyDisplacement: this.trolleyDisplacement,
         blockDisplacement: this.blockDisplacement,
         isSimulating: this.isSimulating,
         hasHitBlock: this.hasHitBlock,
         plateHitFloor: plateHitFloor,
         pullingForce: pullingForce,
         mT, mB, fK, a1, a2, g
     };
  }

  setGravity(val) {
      this.gravity = val;
      if (this.onStateChange) this.onStateChange(this.getPhysicsState());
  }

  setMode(m) {
      this.mode = m;
      this.updateTooltips();
  }

  // ---- Physics Engine ----

  runPhysics(delta) {
      if (!this.isSimulating) return;

      const trolley = this.components['trolley'];
      const block = this.components['block'];
      const pulley = this.components['pulley'];

      if (!trolley || !block || !pulley) return;

      // Detect Impact: precise physical intersection matching models visually
      if (!this.hasHitBlock && (trolley.position.x >= block.position.x - 2.8)) {
          this.hasHitBlock = true;
          this.impactVelocity = this.velocity;
      }

      // Check if plate hit the floor. The table ground is around y = -5.8.
      const plateHitFloor = this.plateMesh ? this.plateMesh.position.y <= -5.7 : false;

      let a = 0;
      const g = this.gravity;
      const mP = this.massPan;
      const mT = this.trolleyMass;
      const mB = this.blockMass;
      const fK = this.frictionCoeff;

      // When the plate hits the floor, the string goes slack and the pulling force drops to Zero.
      const pullingForce = plateHitFloor ? 0 : (mP * g);
      // The pan mass also no longer accelerates with the system when it's on the floor.
      const accelMass = plateHitFloor ? 0 : mP;

      if (!this.hasHitBlock) {
          // Accelerated by pan mass pulling frictionless trolley
          a = pullingForce / (mT + accelMass);
      } else {
          // Both blocks moving. Block pushes back with kinetic friction.
          const netForce = pullingForce - (fK * mB * g);
          a = netForce / (mT + mB + accelMass);
      }

      this.velocity += a * delta;
      
      // Check if kinetic friction has decelerated it completely (or if it tried going backward)
      if (this.velocity <= 0) {
          this.velocity = 0;
          this.isSimulating = false;
      }

      // Natively unscaled mapping: 1 Unity = 1 Meter rigorously computed 
      // (Visual scalar no longer needed since physics are real)
      const dx = this.velocity * delta;
      
      this.trolleyDisplacement += dx;
      if (this.hasHitBlock) {
          this.blockDisplacement += dx;
      }

      // Positional Integrations
      trolley.position.x += dx;
      if (this.hasHitBlock) {
          block.position.x += dx;
      }
      
      // Stop the plate from dropping through the earth
      if (!plateHitFloor) {
          this.plateMesh.position.y -= dx;
          // Pulley spins based on thread traveled (dTheta = dx/r)
          pulley.rotation.z -= dx * 0.8; 
      }

      // Boundary Conditions (Table boundaries only)
      if (trolley.position.x >= 12) {
          this.isSimulating = false;
          this.velocity = 0;
      }

      this.updateTautStrings();
      
      // Update UI frequently to match computations natively
      if (this.onStateChange) {
         this.onStateChange(this.getPhysicsState());
      }
  }

  initArrows() {
      // Create CSS Labels
      const bDiv = document.createElement('div');
      bDiv.className = 'scene-label';
      bDiv.style.color = '#00FF00';
      bDiv.style.fontWeight = 'bold';
      bDiv.style.fontSize = '18px';
      bDiv.style.fontFamily = 'monospace';
      bDiv.style.textShadow = '0 0 5px #000, 0 0 10px #000, 0 0 15px #00AA00';
      bDiv.style.marginTop = '-30px';
      this.blockLabelObj = new CSS2DObject(bDiv);
      this.scene.add(this.blockLabelObj);

      const pDiv = document.createElement('div');
      pDiv.className = 'scene-label';
      pDiv.style.color = '#00FFFF';
      pDiv.style.fontWeight = 'bold';
      pDiv.style.fontSize = '18px';
      pDiv.style.fontFamily = 'monospace';
      pDiv.style.textShadow = '0 0 5px #000, 0 0 10px #000, 0 0 15px #00AAAA';
      pDiv.style.marginLeft = '40px';
      this.panLabelObj = new CSS2DObject(pDiv);
      this.scene.add(this.panLabelObj);

      // Create 3D Glowing Arrow Meshes
      this.blockArrow = this.createGlowingArrow(0x00FF00);
      this.panArrow = this.createGlowingArrow(0x00FFFF);
      
      this.initTooltips();
      
      this.timeOffset = 0;
  }

  initTooltips() {
      this.tooltips = [];
      const makeTip = (text, targetKey, offset) => {
          const div = document.createElement('div');
          div.className = 'scene-label tooltip';
          div.textContent = text;
          div.style.color = '#FFF';
          div.style.background = 'rgba(0,0,0,0.7)';
          div.style.padding = '4px 8px';
          div.style.borderRadius = '4px';
          div.style.border = '1px solid #4CAF50';
          div.style.fontSize = '12px';
          div.style.display = 'none'; // hidden default
          const obj = new CSS2DObject(div);
          this.scene.add(obj);
          this.tooltips.push({ obj, targetKey, offset });
      };
      
      makeTip('Trolley (Mass m_t)', 'trolley', new THREE.Vector3(0, 1.5, 0));
      makeTip('Wooden Block (Kinetic Friction)', 'block', new THREE.Vector3(0, 1.5, 0));
      makeTip('Frictionless Pulley', 'pulley', new THREE.Vector3(0, 1.5, 0));
  }

  updateTooltips() {
      if (!this.tooltips) return;
      const show = this.mode === 'guide' && !this.isSimulating && this.trolleyDisplacement === 0;
      this.tooltips.forEach(t => {
          t.obj.visible = show;
          if (show && this.components[t.targetKey]) {
              t.obj.position.copy(this.components[t.targetKey].position).add(t.offset);
          }
      });
      
      // Also pan tooltip
      if (!this.panTooltipObj) {
          const div = document.createElement('div');
          div.className = 'scene-label tooltip';
          div.textContent = 'Hanging Mass (m_p)';
          div.style.color = '#FFF';
          div.style.background = 'rgba(0,0,0,0.7)';
          div.style.padding = '4px 8px';
          div.style.borderRadius = '4px';
          div.style.border = '1px solid #4CAF50';
          div.style.fontSize = '12px';
          this.panTooltipObj = new CSS2DObject(div);
          this.scene.add(this.panTooltipObj);
      }
      this.panTooltipObj.visible = show;
  }

  createGlowingArrow(colorHex) {
      const group = new THREE.Group();
      
      const shaftGeo = new THREE.CylinderGeometry(0.08, 0.08, 1, 16);
      shaftGeo.translate(0, 0.5, 0); // Origin at bottom
      shaftGeo.rotateX(Math.PI/2); // Align Z axis forward
      
      const headGeo = new THREE.ConeGeometry(0.25, 0.6, 16);
      headGeo.translate(0, -0.3, 0); // Origin at base
      headGeo.rotateX(Math.PI/2); // Align Z axis forward

      const material = new THREE.MeshBasicMaterial({ 
          color: colorHex, 
          transparent: true, 
          opacity: 0.8,
          blending: THREE.AdditiveBlending,
          depthWrite: false
      });
      
      const shaft = new THREE.Mesh(shaftGeo, material);
      const head = new THREE.Mesh(headGeo, material);
      
      group.add(shaft);
      group.add(head);
      group.shaft = shaft;
      group.head = head;
      group.mat = material;
      group.visible = false;
      
      this.scene.add(group);
      return group;
  }

  updateArrows(delta) {
      if (!this.blockArrow || !this.panArrow) return;
      this.timeOffset += delta * 6; // Pulse speed
      const pulseOpacity = 0.3 + 0.7 * Math.abs(Math.sin(this.timeOffset)); // 0.3 to 1.0

      // Update Block Displacement Arrow
      if (this.blockDisplacement > 0.05) {
          this.blockArrow.visible = true;
          this.blockLabelObj.visible = true;
          this.blockArrow.mat.opacity = pulseOpacity;
          
          const start = new THREE.Vector3(-1.16, 1.0, 1.0); // Offset above/beside block
          this.blockArrow.position.copy(start);
          this.blockArrow.lookAt(start.x + 1, start.y, start.z); // Face +X direction
          
          const len = this.blockDisplacement;
          if (len > 0.6) {
              this.blockArrow.shaft.visible = true;
              this.blockArrow.shaft.scale.set(1, 1, len - 0.6);
              this.blockArrow.head.position.set(0, 0, len - 0.6); 
          } else {
              this.blockArrow.shaft.visible = false;
              this.blockArrow.head.position.set(0, 0, 0);
          }
          
          this.blockLabelObj.element.textContent = `Block Disp: ${len.toFixed(2)}m`;
          this.blockLabelObj.position.copy(start).add(new THREE.Vector3(len/2, 0, 0));
      } else {
          this.blockArrow.visible = false;
          this.blockLabelObj.visible = false;
      }

      // Update Pan Displacement Arrow
      if (this.plateMesh && this.initialPlatePos && (this.initialPlatePos.y - this.plateMesh.position.y) > 0.05) {
           this.panArrow.visible = true;
           this.panLabelObj.visible = true;
           this.panArrow.mat.opacity = pulseOpacity;
           
           const disp = this.initialPlatePos.y - this.plateMesh.position.y;
           const start = new THREE.Vector3(this.initialPlatePos.x + 0.8, this.initialPlatePos.y, 0); 
           this.panArrow.position.copy(start);
           this.panArrow.lookAt(start.x, start.y - 1, start.z); // Face down (-Y)
           
           if (disp > 0.6) {
              this.panArrow.shaft.visible = true;
              this.panArrow.shaft.scale.set(1, 1, disp - 0.6);
              this.panArrow.head.position.set(0, 0, disp - 0.6);
           } else {
              this.panArrow.shaft.visible = false;
              this.panArrow.head.position.set(0, 0, 0);
           }
           
           this.panLabelObj.element.textContent = `Mass Drop: ${disp.toFixed(2)}m`;
           this.panLabelObj.position.copy(start).add(new THREE.Vector3(0, -disp/2, 0));
      } else {
           this.panArrow.visible = false;
           this.panLabelObj.visible = false;
      }
  }

  updateTautStrings() {
    if (this.string1) {
        this.scene.remove(this.string1);
        this.string1.geometry.dispose();
        this.string1.material.dispose();
    }
    if (this.string2) {
        this.scene.remove(this.string2);
        this.string2.geometry.dispose();
        this.string2.material.dispose();
    }

    const tPos = this.components['trolley']?.position;
    const pPos = this.components['pulley']?.position;

    if (tPos && pPos) {
       const start = new THREE.Vector3(tPos.x + 1.5, tPos.y + 0.6, tPos.z);
       const mid = new THREE.Vector3(pPos.x + 0.2, pPos.y + 0.4, pPos.z);
       const end = new THREE.Vector3(mid.x, mid.y - 4, mid.z);
       
       this.string1 = this.createTautString(start, mid);

       if (!this.plateMesh) {
           const plateGeo = new THREE.CylinderGeometry(1.5, 1.5, 0.05, 32);
           const plateMat = new THREE.MeshStandardMaterial({ 
               color: 0x999999, 
               metalness: 0.6, 
               roughness: 0.4 
           });
           this.plateMesh = new THREE.Mesh(plateGeo, plateMat);
           this.plateMesh.castShadow = true;
           this.plateMesh.receiveShadow = true;
           if (this.envMap) this.plateMesh.material.envMap = this.envMap;
           this.plateMesh.position.copy(end);
           this.scene.add(this.plateMesh);
       }
       
       // String2 end ALWAYS goes exactly to the plate position
       const dynamicEnd = new THREE.Vector3(mid.x, this.plateMesh.position.y, mid.z);
       this.string2 = this.createTautString(mid, dynamicEnd);
    }
  }

  createTautString(start, end) {
    const distance = start.distanceTo(end);
    const geometry = new THREE.CylinderGeometry(0.02, 0.02, distance, 8);
    geometry.translate(0, distance / 2, 0);
    geometry.rotateX(Math.PI / 2);

    const material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
    const cylinder = new THREE.Mesh(geometry, material);
    
    cylinder.position.copy(start);
    cylinder.lookAt(end);
    cylinder.castShadow = true;

    this.scene.add(cylinder);
    return cylinder;
  }

  onResize() {
    this.width = this.container.clientWidth || window.innerWidth;
    this.height = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width, this.height);
    if (this.labelRenderer) this.labelRenderer.setSize(this.width, this.height);
  }

  animate = () => {
    this.frameId = requestAnimationFrame(this.animate);
    const delta = this.clock.getDelta();
    
    if (this.isSimulating) {
        this.accumulator += Math.min(delta, 0.1);
        while (this.accumulator >= this.fixedTimeStep) {
            this.runPhysics(this.fixedTimeStep);
            this.accumulator -= this.fixedTimeStep;
        }
    }

    if (this.updateArrows) this.updateArrows(Math.min(delta, 0.1));
      
      if (this.mode === 'guide' && this.plateMesh && this.panTooltipObj) {
          this.panTooltipObj.position.copy(this.plateMesh.position).add(new THREE.Vector3(2, 0, 0));
      }
      if (this.mode === 'guide') {
          this.updateTooltips(); // Keep them locked to moving objects
      }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    if (this.labelRenderer) this.labelRenderer.render(this.scene, this.camera);
  }

  dispose() {
    cancelAnimationFrame(this.frameId);
    window.removeEventListener("resize", this.onResize);
    this.renderer.dispose();
    if (this.envMap) this.envMap.dispose();
    while (this.container.firstChild) {
      this.container.removeChild(this.container.firstChild);
    }
  }
}
