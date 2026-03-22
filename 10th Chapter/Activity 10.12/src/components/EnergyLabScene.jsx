import { useEffect, useRef, useState, memo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { playStretchSound, playSwooshSound, playThudSound } from '../audio.js';

const G = 30.0;
const VEL_SCALE = 580;

const makeLimbCurve = (isUpper, bendAmount) => {
  const sign = isUpper ? 1 : -1;
  const points = [];
  const bend = bendAmount * 30; // lateral bend inward
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    const y = sign * t * 60; // 60 half-height
    // Base natural shape curves towards -Z (target).
    // center (t=0) is at Z = -15.
    // tips (t=1) are at Z = 0.
    // Bending moves tips backwards towards +Z.
    const z = -15 * Math.cos(t * Math.PI / 2) + (bend * Math.pow(t, 1.5));
    points.push(new THREE.Vector3(0, y, z));
  }
  return new THREE.CatmullRomCurve3(points);
};

const EnergyLabScene = memo(({ gameState, setGameState, stretch, setStretch, onUpdateStats, onUpdateLabels }) => {
  const mountRef = useRef(null);
  const [error, setError] = useState(null);
  
  // Scene Refs
  const r = useRef({
    scene: null, renderer: null, camera: null, controls: null,
    objs: {
      bowGroup: null, upperLimb: null, lowerLimb: null, stringLine: null, arrow: null,
      trail: null, trailPositions: [], trailIdx: 0, arcLine: null 
    },
    physics: { active: false, finished: false, pos: new THREE.Vector3(), vel: new THREE.Vector3(), time: 0 },
    state: { dragStart: {x: 0, y: 0}, activeDrag: false, yaw: 0, pitch: 0, lastSoundStretch: 0 },
    labels: { bow: null, string: null, arrow: null, target: null }
  });

  // Track the external gameState
  useEffect(() => {
    if (gameState === 'RELEASED' && stretch > 0.05) {
      // Trigger shot
      const stretchVal = stretch;
      const yaw = r.current.state.yaw;
      const pitch = r.current.state.pitch;
      
      const p = r.current.physics;
      p.active = true;
      p.finished = false;
      p.time = 0;
      // Arrow local starting position resting on bow
      p.pos.set(1.5, 78, 5); 

      // Launch vector: we shoot towards -Z, respecting the exact same Euler rotation
      const aimEuler = new THREE.Euler(pitch, -yaw, 0, 'YXZ');
      const vel0 = new THREE.Vector3(0, 0, -1).applyEuler(aimEuler).multiplyScalar(stretchVal * VEL_SCALE);
      
      p.vel.copy(vel0);
      setStretch(0); // release string immediately
      
      playSwooshSound();
      if (r.current.objs.trail) r.current.objs.trail.visible = true;
      r.current.objs.trailIdx = 0;
      r.current.objs.trailPositions.forEach(pos => pos.copy(p.pos));
      
      setGameState('FLYING');
    } else if (gameState === 'RESETTING') {
      r.current.physics.active = false;
      r.current.physics.finished = false;
      setStretch(0);
      r.current.state.yaw = 0;
      r.current.state.pitch = 0;
      if (r.current.objs.arrow) {
        r.current.objs.arrow.position.set(1.5, 78, 5);
        r.current.objs.arrow.quaternion.identity();
      }
      if (r.current.objs.trail) r.current.objs.trail.visible = false;
      
      // reset camera
      if (r.current.camera) r.current.camera.position.set(150, 100, 200);
      if (r.current.controls) r.current.controls.target.set(0, 60, 0);
    }
  }, [gameState, setGameState, stretch, setStretch]);

  useEffect(() => {
    if (!mountRef.current) return;
    let raf;

    const cleanup = () => {
      cancelAnimationFrame(raf);
      if (r.current.controls) r.current.controls.dispose();
      if (r.current.renderer) {
        r.current.renderer.dispose();
      }
      try { mountRef.current.removeChild(r.current.renderer.domElement); } catch (e) {}
    };

    try {
      const w = mountRef.current.clientWidth || window.innerWidth;
      const h = mountRef.current.clientHeight || window.innerHeight;

      // Renderer
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(w, h);
      renderer.shadowMap.enabled = true;
      mountRef.current.appendChild(renderer.domElement);
      r.current.renderer = renderer;

      // Scene
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x020a18);
      scene.fog = new THREE.FogExp2(0x020a18, 0.00015);
      r.current.scene = scene;

      // Camera
      const camera = new THREE.PerspectiveCamera(50, w / h, 0.5, 20000);
      camera.position.set(150, 100, 200);
      r.current.camera = camera;

      // Controls
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.target.set(0, 60, 0);
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.maxPolarAngle = Math.PI / 2 - 0.05; // avoid going under ground
      
      // Customize controls: right-click rotates, left-click is completely ignored by controls (so it can be used for the bow string), no panning.
      controls.enablePan = false;
      controls.mouseButtons = {
        LEFT: null,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.ROTATE
      };
      
      r.current.controls = controls;

      // Lights
      scene.add(new THREE.AmbientLight(0x1a2a4a, 1.5));
      const sun = new THREE.DirectionalLight(0xfff8e0, 2.5);
      sun.position.set(200, 500, 300);
      sun.castShadow = true;
      sun.shadow.camera.left = -300;
      sun.shadow.camera.right = 300;
      sun.shadow.camera.top = 300;
      sun.shadow.camera.bottom = -300;
      scene.add(sun);
      scene.add(new THREE.DirectionalLight(0x3060a0, 0.8).position.set(-200, 200, -400));

      // Ground & Lane
      const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(20000, 20000),
        new THREE.MeshStandardMaterial({ color: 0x0f2918, roughness: 1.0 })
      );
      ground.rotation.x = -Math.PI / 2;
      ground.receiveShadow = true;
      scene.add(ground);

      // Procedural Low-Poly Trees
      const createTree = () => {
        const tree = new THREE.Group();
        
        // Trunk
        const trunk = new THREE.Mesh(
          new THREE.CylinderGeometry(4, 6, 40, 7),
          new THREE.MeshStandardMaterial({ color: 0x3d2817, roughness: 0.9 })
        );
        trunk.position.y = 20;
        trunk.castShadow = true;
        tree.add(trunk);

        // Leaves (3 overlapping cones)
        const leavesMat = new THREE.MeshStandardMaterial({ color: 0x144520, roughness: 0.8 });
        
        const l1 = new THREE.Mesh(new THREE.ConeGeometry(30, 80, 7), leavesMat);
        l1.position.y = 60; l1.castShadow = true;
        
        const l2 = new THREE.Mesh(new THREE.ConeGeometry(25, 70, 7), leavesMat);
        l2.position.y = 90; l2.castShadow = true;
        
        const l3 = new THREE.Mesh(new THREE.ConeGeometry(20, 50, 7), leavesMat);
        l3.position.y = 120; l3.castShadow = true;

        tree.add(l1, l2, l3);

        // Random slight tilt
        tree.rotation.x = (Math.random() - 0.5) * 0.1;
        tree.rotation.z = (Math.random() - 0.5) * 0.1;
        
        // Random scale variation
        const scale = 0.6 + Math.random() * 0.6;
        tree.scale.set(scale, scale, scale);

        return tree;
      };

      // Populate Forest (Avoid the center archery lane)
      for (let i = 0; i < 150; i++) {
        const tree = createTree();
        
        // Position X: Outer zones, strictly avoiding -150 to +150
        const signX = Math.random() > 0.5 ? 1 : -1;
        const px = signX * (200 + Math.random() * 3000);
        
        // Position Z: Ranging from slightly behind player to far away
        const pz = 500 - Math.random() * 4000;
        
        tree.position.set(px, 0, pz);
        scene.add(tree);
      }

      const lane = new THREE.Mesh(
        new THREE.PlaneGeometry(60, 2000),
        new THREE.MeshStandardMaterial({ color: 0x050d05 })
      );
      lane.rotation.x = -Math.PI / 2;
      lane.position.set(0, 0.5, -950);
      lane.receiveShadow = true;
      scene.add(lane);

      // Stars
      const starGeo = new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(8000 * 3).map(() => (Math.random() - 0.5) * 18000), 3));
      scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 3 })));

      // Target Board
      const target = new THREE.Group();
      const rings = [
        { color: 0xfaf0c0, r: 70 }, { color: 0x111111, r: 56 },
        { color: 0x1d4ed8, r: 42 }, { color: 0xdc2626, r: 28 }, { color: 0xfacc15, r: 14 }
      ];
      rings.forEach(({ color, r: rad }, i) => {
        const ring = new THREE.Mesh(
          new THREE.CylinderGeometry(rad, rad, 4, 32),
          new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.1 })
        );
        ring.rotation.x = Math.PI / 2;
        ring.position.z = i * 0.8;
        target.add(ring);
      });
      const standPole1 = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 150, 8), new THREE.MeshStandardMaterial({ color: 0x4a3018 }));
      standPole1.position.set(-40, -75, 0);
      target.add(standPole1);
      const standPole2 = standPole1.clone();
      standPole2.position.set(40, -75, 0);
      target.add(standPole2);
      target.position.set(0, 150, -500); // Moved closer and raised higher
      scene.add(target);

      // Support Stand for Bow
      const bowStand = new THREE.Group();
      const woodMat = new THREE.MeshStandardMaterial({ color: 0x5c3a21 });
      [-15, 15].forEach((x, i) => {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 80, 8), woodMat);
        leg.position.set(x, 38, -10);
        leg.rotation.set(-0.2, 0, i===0?0.2:-0.2);
        leg.castShadow = true;
        bowStand.add(leg);
      });
      const leg3 = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 80, 8), woodMat);
      leg3.position.set(0, 38, 20);
      leg3.rotation.set(0.35, 0, 0);
      bowStand.add(leg3);
      const slot = new THREE.Mesh(new THREE.BoxGeometry(10, 4, 10), woodMat);
      slot.position.set(0, 78, 0);
      bowStand.add(slot);
      scene.add(bowStand);

      // Bow
      const bowGroup = new THREE.Group();
      const bambooMat = new THREE.MeshStandardMaterial({ color: 0xd4b872, roughness: 0.6 });
      
      const upperLimb = new THREE.Mesh(new THREE.TubeGeometry(makeLimbCurve(true, 0), 16, 1.8, 8, false), bambooMat);
      const lowerLimb = new THREE.Mesh(new THREE.TubeGeometry(makeLimbCurve(false, 0), 16, 1.8, 8, false), bambooMat);
      upperLimb.castShadow = true; lowerLimb.castShadow = true;
      bowGroup.add(upperLimb);
      bowGroup.add(lowerLimb);

      const grip = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 14, 8), new THREE.MeshStandardMaterial({ color: 0x4a2c12 }));
      grip.rotation.x = Math.PI / 2;
      bowGroup.add(grip);

      // String
      const strGeo = new THREE.BufferGeometry();
      strGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(3 * 3), 3));
      const stringLine = new THREE.Line(strGeo, new THREE.LineBasicMaterial({ color: 0xe0e0e0, linewidth: 2 }));
      bowGroup.add(stringLine);

      // Rotate bow slightly to lay/stand gracefully
      bowGroup.rotation.z = -0.1;
      bowGroup.position.set(0, 78, 0);
      scene.add(bowGroup);

      // Arrow
      const arrow = new THREE.Group();
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 80, 8), new THREE.MeshStandardMaterial({ color: 0xe6d5ac }));
      shaft.rotation.x = Math.PI / 2;
      arrow.add(shaft);
      const arrowhead = new THREE.Mesh(new THREE.ConeGeometry(2.5, 8, 4), new THREE.MeshStandardMaterial({ color: 0xa0a0a0, metalness: 0.8 }));
      arrowhead.rotation.x = -Math.PI / 2;
      arrowhead.position.z = -40;
      arrow.add(arrowhead);
      for (let i = 0; i < 3; i++) {
        const fin = new THREE.Mesh(new THREE.BoxGeometry(0.1, 8, 12), new THREE.MeshStandardMaterial({ color: 0xef4444 }));
        fin.position.set(0, 0, 34);
        const fp = new THREE.Group();
        fp.rotation.z = (i * Math.PI * 2) / 3;
        fp.add(fin);
        arrow.add(fp);
      }
      arrow.position.set(1.5, 78, 5);
      scene.add(arrow);

      // Yellow Trail
      const TRAIL_COUNT = 40;
      const trailGeo = new THREE.BufferGeometry();
      trailGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(TRAIL_COUNT * 3), 3));
      const trail = new THREE.Points(trailGeo, new THREE.PointsMaterial({ color: 0xfacc15, size: 6, transparent: true, opacity: 0.7 }));
      trail.visible = false;
      scene.add(trail);
      const trailPositions = Array.from({length: TRAIL_COUNT}, () => new THREE.Vector3());

      // Predictive Aiming Arc (Dotted Line)
      const arcGeo = new THREE.BufferGeometry().setAttribute(
        'position', new THREE.BufferAttribute(new Float32Array(150 * 3), 3)
      );
      const arcMat = new THREE.LineDashedMaterial({ color: 0x38bdf8, dashSize: 10, gapSize: 6, transparent: true, opacity: 0.8 });
      const arcLine = new THREE.Line(arcGeo, arcMat);
      arcLine.visible = false;
      scene.add(arcLine);

      // Store Refs
      r.current.objs = { bowGroup, upperLimb, lowerLimb, stringLine, arrow, trail, trailPositions, trailIdx: 0, arcLine };

      // Animation Loop
      let lastHudTime = 0;
      let lastLabelTime = 0;
      
      const animate = (time) => {
        raf = requestAnimationFrame(animate);
        const dt = 0.016;

        const stateObj = r.current.state;
        const objs = r.current.objs;
        const physics = r.current.physics;

        // Visual bending
        const s = stateObj.stretch;
        
        if (s > 0) {
          // Update Limbs Shape
          objs.upperLimb.geometry.dispose();
          objs.upperLimb.geometry = new THREE.TubeGeometry(makeLimbCurve(true, s), 16, 1.8, 8, false);
          objs.lowerLimb.geometry.dispose();
          objs.lowerLimb.geometry = new THREE.TubeGeometry(makeLimbCurve(false, s), 16, 1.8, 8, false);
          
          const yaw = stateObj.yaw;
          const pitch = stateObj.pitch;

          // Aim rotation
          const aimEuler = new THREE.Euler(pitch, -yaw, 0, 'YXZ');
          objs.bowGroup.rotation.copy(aimEuler);
          objs.bowGroup.rotation.z = -0.1; // maintain natural resting tilt

          // Pull vector: direction string is dragged
          const pullDist = s * 60; // Max string pullback 60 units

          const center = new THREE.Vector3(0, 78, 0);
          
          // Arrow's resting position is slightly offset (x=1.5, z=-15) relative to bow.
          // Applying same exact aiming rotation:
          const restingDir = new THREE.Vector3(0, 0, -1).applyEuler(aimEuler);
          
          // Move arrow back opposite to restingDir. Arrow tip goes exactly along string pull center.
          if (!physics.active && !physics.finished) {
            objs.arrow.position.copy(center).addScaledVector(restingDir, -pullDist + 5);
            objs.arrow.position.x += 1.5; // slight horizontal shift
            objs.arrow.rotation.copy(aimEuler);
          }

          // Update String Line to stretch backward
          // In bow local coords, the tips are at Z = bend (s*30).
          const tipZ = s * 30; 
          const strZ = tipZ + pullDist; // middle pulls backward behind the tips
          
          const sAttr = objs.stringLine.geometry.attributes.position;
          sAttr.setXYZ(0, 0, 60, tipZ);
          sAttr.setXYZ(1, 0, 0, strZ);
          sAttr.setXYZ(2, 0, -60, tipZ);
          sAttr.needsUpdate = true;
          
          // Draw Predictive Arc
          objs.arcLine.visible = true;
          const arcVel = new THREE.Vector3(0, 0, -1).applyEuler(aimEuler).multiplyScalar(s * VEL_SCALE);
          
          const pStart = new THREE.Vector3(1.5, 78, 5); // arrow start node
          const arcPts = [];
          for (let i = 0; i < 150; i++) {
            const t = i * 0.035; // predict flight ahead
            const pX = pStart.x + arcVel.x * t;
            const pY = pStart.y + arcVel.y * t - 0.5 * G * t * t;
            const pZ = pStart.z + arcVel.z * t;
            
            // stop the arc if it hits ground or past target plane
            if (pY < 0.5 || pZ < -600) break;
            arcPts.push(pX, pY, pZ);
          }
          
          const arcPos = objs.arcLine.geometry.attributes.position;
          for (let i = 0; i < 150; i++) {
            if (i * 3 < arcPts.length) {
              arcPos.setXYZ(i, arcPts[i*3], arcPts[i*3+1], arcPts[i*3+2]);
            } else {
              // duplicate last point so remainder of buffer converges
              const lastIdx = arcPts.length - 3;
              arcPos.setXYZ(i, arcPts[lastIdx]||0, arcPts[lastIdx+1]||0, arcPts[lastIdx+2]||0);
            }
          }
          arcPos.needsUpdate = true;
          objs.arcLine.geometry.setDrawRange(0, arcPts.length / 3);
          objs.arcLine.computeLineDistances(); // REQUIRED for dashes
          
        } else {
          // Idle bow state
          objs.upperLimb.geometry.dispose();
          objs.upperLimb.geometry = new THREE.TubeGeometry(makeLimbCurve(true, 0), 16, 1.8, 8, false);
          objs.lowerLimb.geometry.dispose();
          objs.lowerLimb.geometry = new THREE.TubeGeometry(makeLimbCurve(false, 0), 16, 1.8, 8, false);
          objs.bowGroup.rotation.set(0, 0, -0.1);
          
          if (!physics.finished && !physics.active) {
            objs.arrow.position.set(1.5, 78, 5); // bow center offset
            objs.arrow.rotation.set(0, 0, 0);
          }
          objs.arcLine.visible = false;

          const sAttr = objs.stringLine.geometry.attributes.position;
          sAttr.setXYZ(0, 0, 60, 0);
          sAttr.setXYZ(1, 0, 0, 0);
          sAttr.setXYZ(2, 0, -60, 0);
          sAttr.needsUpdate = true;
        }

        // Project 3D coordinates to 2D Screen for Labels
        if (time - lastLabelTime > 50 && onUpdateLabels && gameState !== 'RESETTING') {
          const projectPoint = (vec) => {
            const v = vec.clone().project(camera);
            if (v.z > 1) return null; // behind camera
            return { left: `${(v.x * 0.5 + 0.5) * 100}%`, top: `${-(v.y * 0.5 - 0.5) * 100}%` };
          };
          
          const bowPos = new THREE.Vector3(0, 140, -15).applyEuler(objs.bowGroup.rotation).add(objs.bowGroup.position);
          
          let stringPos = new THREE.Vector3(0, 78, 0);
          if (objs.stringLine.geometry.attributes.position) {
            const z = objs.stringLine.geometry.attributes.position.getZ(1);
            stringPos = new THREE.Vector3(0, 78, z).applyEuler(objs.bowGroup.rotation).add(objs.bowGroup.position);
          }

          const arrowTip = objs.arrow.position.clone()
            .add(new THREE.Vector3(0, 0, -40).applyEuler(objs.arrow.rotation));
          
          const targetCenter = new THREE.Vector3(0, 150, -500);

          onUpdateLabels({
            bow: projectPoint(bowPos),
            string: projectPoint(stringPos),
            arrow: projectPoint(arrowTip),
            target: projectPoint(targetCenter)
          });
          lastLabelTime = time;
        }

        if (physics.active) {
          objs.arcLine.visible = false; // Hide arc while flying
          
          // FLYING PHYSICS
          physics.time += dt;
          physics.pos.addScaledVector(physics.vel, dt);
          physics.vel.y -= G * dt; // gravity

          objs.arrow.position.copy(physics.pos);
          const dir = physics.vel.clone().normalize();
          if (dir.lengthSq() > 0.001) {
            objs.arrow.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), dir);
          }

          // Camera follow for first 3 seconds
          if (physics.time < 3.0) {
            camera.position.lerp(new THREE.Vector3(physics.pos.x + 80, physics.pos.y + 30, physics.pos.z + 150), 0.08);
            controls.target.lerp(physics.pos, 0.12);
          }

          // Trail
          objs.trailPositions[objs.trailIdx % TRAIL_COUNT].copy(physics.pos);
          objs.trailIdx++;
          const tp = objs.trail.geometry.attributes.position;
          for (let i = 0; i < TRAIL_COUNT; i++) {
            const pos = objs.trailPositions[i] || physics.pos;
            tp.setXYZ(i, pos.x, pos.y, pos.z);
          }
          tp.needsUpdate = true;

          // HUD Live Stats
          if (time - lastHudTime > 30) {
            const distanceLine = Math.sqrt(physics.pos.x**2 + (physics.pos.z)**2);
            onUpdateStats(null, physics.vel.length(), distanceLine);
            lastHudTime = time;
          }

          // Calculate actual world coordinates of the arrow's tip
          const tipOffset = new THREE.Vector3(0, 0, -44).applyQuaternion(objs.arrow.quaternion);
          const tipZ = physics.pos.z + tipOffset.z;

          // Collisions
          if (physics.pos.y <= 0.5) { // Hit Ground
            physics.pos.y = 0.5;
            physics.vel.set(0,0,0);
            physics.active = false;
            physics.finished = true;
            playThudSound();
            setGameState('FINISHED');
          } else if (tipZ <= -500 && physics.active) { 
            const tipX = physics.pos.x + tipOffset.x;
            const tipY = physics.pos.y + tipOffset.y;
            
            // Check if the exact tip is within the 70-radius circle of the target board (centered at x=0, y=150)
            const distFromTargetCenter = Math.sqrt(Math.pow(tipX, 2) + Math.pow(tipY - 150, 2));

            if (distFromTargetCenter <= 70) {
               // Hit the target board! Pierce exactly 3 units in.
               // Back-calculate the required group position so tipZ == -503
               physics.pos.z = -503 - tipOffset.z;
               physics.vel.set(0,0,0);
               physics.active = false;
               physics.finished = true;
               playThudSound();
               onUpdateStats(null, null, 500, distFromTargetCenter); // Report exact hit distance
               setGameState('FINISHED');
            } else if (physics.pos.z <= -2000) {
               // Missed completely, arrow flew way past 
               physics.vel.set(0,0,0);
               physics.active = false;
               physics.finished = true;
               playThudSound();
               onUpdateStats(null, null, 2000, 999); // Report total miss
               setGameState('FINISHED');
            }
          }
        }

        controls.update();
        renderer.render(scene, camera);
      };
      animate(0);

      const onResize = () => {
        const w2 = mountRef.current?.clientWidth || window.innerWidth;
        const h2 = mountRef.current?.clientHeight || window.innerHeight;
        camera.aspect = w2 / h2;
        camera.updateProjectionMatrix();
        renderer.setSize(w2, h2);
      };
      window.addEventListener('resize', onResize);

      return () => {
        cleanup();
        window.removeEventListener('resize', onResize);
      };
    } catch (e) { setError(e.message); }
  }, []);

  // UI Drag Handlers
  const handlePointerDown = (e) => {
    // Only allow left click (button 0) or touch for drawing the bow
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    // Prevent interaction if flying
    if (gameState === 'FLYING' || gameState === 'FINISHED' || gameState === 'RESETTING') return;
    
    // Explicitly reset finished so drag works beautifully
    r.current.physics.finished = false;
    r.current.state.activeDrag = true;
    r.current.state.dragStart = { x: e.clientX, y: e.clientY };
    setGameState('STRETCHING');
  };

  const handlePointerMove = (e) => {
    if (!r.current.state.activeDrag) return;
    const dx = e.clientX - r.current.state.dragStart.x;
    const dy = e.clientY - r.current.state.dragStart.y;
    
    // Calculate pull based on drag distance down/right
    const dist = Math.sqrt(dx*dx + dy*dy);
    // 400px = max pull
    const stretch = Math.min(1.0, dist / 400); 
    
    r.current.state.stretch = stretch;
    // user feedback: drag left (-dx) points right, drag right (+dx) points left.
    // So we apply a negative sign to fix it!
    r.current.state.yaw = -dx / 500; 
    r.current.state.pitch = Math.max(-0.2, Math.min(0.5, -dy / 600));
    
    // Play stretch audio
    if (Math.abs(stretch - r.current.state.lastSoundStretch) > 0.08) {
      playStretchSound(stretch);
      r.current.state.lastSoundStretch = stretch;
    }

    onUpdateStats(stretch, 0, 0); // Update HUD immediately
  };

  const handlePointerUp = () => {
    if (!r.current.state.activeDrag) return;
    r.current.state.activeDrag = false;
    
    if (gameState === 'STRETCHING') {
       if (r.current.state.stretch > 0.05) {
         setGameState('RELEASED'); 
       } else {
         r.current.state.stretch = 0;
         setGameState('IDLE');
         onUpdateStats(0, 0, 0);
       }
    }
  };

  if (error) return <div style={{ color: 'white' }}>Error: {error}</div>;

  return (
    <div 
      style={{ width: '100%', height: '100%', position: 'absolute', inset: 0, zIndex: 1, touchAction: 'none' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onContextMenu={(e) => e.preventDefault()} // prevent right-click browser menu
    >
      <div ref={mountRef} style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }} />
    </div>
  );
});

export default EnergyLabScene;
