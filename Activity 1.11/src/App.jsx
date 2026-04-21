/**
 * App.jsx — Phase 3: Gamified Science Experience
 * Three.js scene + CompressionSystem + GameController (full game UI).
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';

import { createRenderer, createScene, createLighting, createCamera, createControls } from './scene/SceneSetup';
import { createLabEnvironment } from './scene/LabEnvironment';
import { createSyringe }        from './scene/SyringeBuilder';
import { AnimationLoop }        from './scene/AnimationLoop';
import { CompressionSystem }    from './scene/CompressionSystem';
import GameController           from './components/GameController';
import './App.css';

// ── Syringe configs ────────────────────────────────────────────────────────
const SYRINGES = [
  { id: 'air',   contents: 'air',   label: 'Syringe 1 — Air',   position: new THREE.Vector3(-4.0, 0, 0), accent: '#66bb6a' },
  { id: 'water', contents: 'water', label: 'Syringe 2 — Water', position: new THREE.Vector3( 0,   0, 0), accent: '#42a5f5' },
  { id: 'chalk', contents: 'chalk', label: 'Syringe 3 — Chalk', position: new THREE.Vector3( 4.0, 0, 0), accent: '#bcaaa4' },
];

const INIT_PROGRESS = SYRINGES.map(s => ({
  id: s.id, contents: s.contents,
  comprFrac: 0, forceFrac: 0,
  label: '', science: '', glowHex: s.accent, emoji: '',
  travel: 0, maxTravel: 1,
}));

// ── Component ──────────────────────────────────────────────────────────────
export default function App() {
  const mountRef = useRef(null);
  const comprRef = useRef(null);
  const [progress, setProgress] = useState(INIT_PROGRESS);
  const [phase,    setPhase]    = useState('idle');

  // ── Three.js bootstrap ──────────────────────────────────────────────────
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const renderer = createRenderer(container);
    const scene    = createScene();
    createLighting(scene);
    const camera   = createCamera(container.clientWidth, container.clientHeight);
    const controls = createControls(camera, renderer.domElement);

    createLabEnvironment(scene);

    const refs = SYRINGES.map((cfg, i) =>
      createSyringe({ scene, position: cfg.position, contents: cfg.contents, label: cfg.label, index: i })
    );

    const compr = new CompressionSystem();
    comprRef.current = compr;

    SYRINGES.forEach((cfg, i) => {
      const r = refs[i];
      compr.register({
        id: cfg.id, contents: cfg.contents,
        plungerGroup: r.plungerGroup, airHaze: r.airHaze,
        waterMesh: r.waterMesh, waterSurf: r.waterSurf,
        glowMesh: r.glowMesh, groupRef: r.group,
        fillBot: r.fillBot, fillH: r.fillH,
      });
    });

    compr.onUpdate(prog => {
      setProgress([...prog]);
      setPhase(compr.getPhase());
    });

    const loop = new AnimationLoop(renderer, scene, camera, controls);
    loop.add((_e, dt) => { compr.update(dt); });
    loop.start();

    const onResize = () => {
      const w = container.clientWidth, h = container.clientHeight;
      camera.aspect = w / h; camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    return () => {
      loop.dispose(); compr.dispose();
      window.removeEventListener('resize', onResize);
      controls.dispose(); renderer.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };
  }, []);

  const onPush   = useCallback(() => comprRef.current?.push(),   []);
  const onReset  = useCallback(() => comprRef.current?.reset(),  []);
  const onReplay = useCallback(() => comprRef.current?.replay(), []);

  return (
    <div className="app-shell">

      <header className="hud-header">
        <div className="hud-logo">
          <span className="hud-logo-icon">🧪</span>
          <span className="hud-logo-text">Science Lab</span>
        </div>
        <h1 className="hud-title">Compressibility of Matter</h1>
        <div className="hud-badge">
          <span className="badge-dot" />
          Phase 3 — Gamified
        </div>
      </header>

      {/* Game controller owns ALL UI — it conditionally renders CompressionPanel */}
      <GameController
        progress={progress}
        phase={phase}
        onPush={onPush}
        onReset={onReset}
        onReplay={onReplay}
      />

      <footer className="hud-footer">
        <span className="hint">🖱 Drag to orbit</span>
        <span className="hint">📜 Scroll to zoom</span>
        <span className="hint">🤚 Right-drag to pan</span>
      </footer>

      <div ref={mountRef} className="canvas-shell" />
    </div>
  );
}
