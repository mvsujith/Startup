/**
 * App.jsx — Phase 2 + Phase 3
 *
 * Phase 2: 3-D scene, drop animations, diffusion physics.
 * Phase 3: GameController adds guided mode, quizzes, scoring, and results.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';

import { createRenderer, createScene, createLighting, createCamera, createControls } from './scene/SceneSetup';
import { createLabEnvironment } from './scene/LabTable';
import { createBeakerAssembly }  from './scene/BeakerBuilder';
import { AnimationLoop }         from './scene/AnimationLoop';
import { DiffusionSystem }       from './scene/DiffusionSystem';
import { DropAnimation }         from './scene/DropAnimation';
import ControlPanel   from './components/ControlPanel';
import GameController from './components/GameController';
import './App.css';

// ── Beaker configs ────────────────────────────────────────────────────────────
const BEAKER_CONFIGS = [
  {
    id         : 'ink',
    label      : 'Beaker 1 — Ink',
    labelColor : 0x3b82f6,
    waterColor : 0xc8e8f5,
    waterAlpha : 0.42,
    position   : new THREE.Vector3(-3.2, 3.61, 0),
  },
  {
    id         : 'honey',
    label      : 'Beaker 2 — Honey',
    labelColor : 0xf59e0b,
    waterColor : 0xc8e8f5,
    waterAlpha : 0.42,
    position   : new THREE.Vector3(3.2, 3.61, 0),
  },
];

// ── Initial sim state ─────────────────────────────────────────────────────────
const INITIAL_STATE = {
  inkAdded     : false,
  honeyAdded   : false,
  isRunning    : false,
  inkProgress  : 0,
  honeyProgress: 0,
  elapsed      : 0,
  compareMode  : false,
};

export default function App() {
  const mountRef = useRef(null);

  // ── Three.js refs (not React state — avoids re-renders) ──────────────────
  const beakersRef   = useRef({});    // { ink: {group,water}, honey: {group,water} }
  const diffusionRef = useRef(null);
  const dropAnimRef  = useRef(null);
  const loopRef      = useRef(null);
  const isRunningRef = useRef(false);

  // ── React state ──────────────────────────────────────────────────────────
  const [simState,   setSimState]   = useState(INITIAL_STATE);
  const [guidedMode, setGuidedMode] = useState(true); // Phase 3 starts in guided mode

  // ── Scene bootstrap (once) ───────────────────────────────────────────────
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const renderer          = createRenderer(container);
    const { scene, envMap } = createScene(renderer);
    createLighting(scene);
    const camera   = createCamera(container.clientWidth, container.clientHeight);
    const controls = createControls(camera, renderer.domElement);

    createLabEnvironment(scene);

    BEAKER_CONFIGS.forEach((cfg) => {
      const { group, water } = createBeakerAssembly({
        scene,
        envMap,
        position  : cfg.position,
        label     : cfg.label,
        labelColor: cfg.labelColor,
        waterColor: cfg.waterColor,
        waterAlpha: cfg.waterAlpha,
      });
      beakersRef.current[cfg.id] = { group, water };
    });

    const onProgress = ({ ink, honey, elapsed }) => {
      setSimState(prev => ({ ...prev, inkProgress: ink, honeyProgress: honey, elapsed }));
    };

    diffusionRef.current = new DiffusionSystem(onProgress);
    dropAnimRef.current  = new DropAnimation();

    const loop = new AnimationLoop(renderer, scene, camera, controls);
    loopRef.current = loop;

    loop.add((_elapsed, dt) => {
      dropAnimRef.current?.update(dt);
      diffusionRef.current?.update(dt, isRunningRef.current);
    });

    loop.start();

    const handleResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      loop.dispose();
      diffusionRef.current?.dispose();
      dropAnimRef.current?.dispose();
      window.removeEventListener('resize', handleResize);
      controls.dispose();
      renderer.dispose();
      envMap.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // ── Callbacks ────────────────────────────────────────────────────────────

  const handleAddInk = useCallback(() => {
    const { group, water } = beakersRef.current.ink ?? {};
    if (!group || !water) return;
    setSimState(prev => ({ ...prev, inkAdded: true }));
    dropAnimRef.current?.startDrop('ink', group, ({ x, y }) => {
      diffusionRef.current?.addDrop('ink', group, water, { x, y });
    });
  }, []);

  const handleAddHoney = useCallback(() => {
    const { group, water } = beakersRef.current.honey ?? {};
    if (!group || !water) return;
    setSimState(prev => ({ ...prev, honeyAdded: true }));
    dropAnimRef.current?.startDrop('honey', group, ({ x, y }) => {
      diffusionRef.current?.addDrop('honey', group, water, { x, y });
    });
  }, []);

  const handleStart = useCallback(() => {
    isRunningRef.current = true;
    setSimState(prev => ({ ...prev, isRunning: true }));
  }, []);

  const handlePause = useCallback(() => {
    isRunningRef.current = false;
    setSimState(prev => ({ ...prev, isRunning: false }));
  }, []);

  const handleReset = useCallback(() => {
    isRunningRef.current = false;
    diffusionRef.current?.reset();
    setSimState(INITIAL_STATE);
  }, []);

  const handleToggleCompare = useCallback(() => {
    setSimState(prev => ({ ...prev, compareMode: !prev.compareMode }));
  }, []);

  const handleExitGuided = useCallback(() => {
    setGuidedMode(false);
  }, []);

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="app-shell">

      {/* Header */}
      <header className="hud-header">
        <div className="hud-logo">
          <span className="hud-logo-icon">🔬</span>
          <span className="hud-logo-text">Science Lab</span>
        </div>
        <h1 className="hud-title">Diffusion in Liquids</h1>
        <div className="hud-badge">
          {simState.isRunning
            ? '🟢 Observing…'
            : simState.inkAdded || simState.honeyAdded
              ? guidedMode ? 'Guided Mode' : '⏸ Paused'
              : guidedMode ? 'Guided Mode' : 'Phase 2 — Interaction'}
        </div>
      </header>

      {/* ── Phase 3: Guided mode — GameController owns the UI ─────────── */}
      {guidedMode && (
        <GameController
          simState    ={simState}
          onAddInk    ={handleAddInk}
          onAddHoney  ={handleAddHoney}
          onStart     ={handleStart}
          onReset     ={handleReset}
          onExitGuided={handleExitGuided}
        />
      )}

      {/* ── Free-play mode: classic side panels ─────────────────────────── */}
      {!guidedMode && (
        <aside className="info-panel info-panel--left">
          <div className="panel-accent" style={{ '--accent': '#3b82f6' }} />
          <h2 className="panel-heading">
            <span className="panel-dot" style={{ background: '#3b82f6' }} />
            Beaker 1
          </h2>
          <p className="panel-subtitle">Blue Ink Experiment</p>
          <ul className="panel-facts">
            <li><span className="fact-label">Contents</span><span className="fact-value">Water</span></li>
            <li><span className="fact-label">Drop</span><span className="fact-value">Blue Ink</span></li>
            <li><span className="fact-label">Spread</span><span className="fact-value">{Math.round(simState.inkProgress * 100)}%</span></li>
            <li>
              <span className="fact-label">Status</span>
              <span className={`fact-value ${simState.inkAdded ? 'status-active' : 'status-ready'}`}>
                {simState.inkProgress >= 1 ? '✅ Complete' : simState.inkAdded ? '🔵 Spreading…' : 'Ready'}
              </span>
            </li>
          </ul>
        </aside>
      )}

      {!guidedMode && (
        <aside className="info-panel info-panel--right">
          <div className="panel-accent" style={{ '--accent': '#f59e0b' }} />
          <h2 className="panel-heading">
            <span className="panel-dot" style={{ background: '#f59e0b' }} />
            Beaker 2
          </h2>
          <p className="panel-subtitle">Honey Experiment</p>
          <ul className="panel-facts">
            <li><span className="fact-label">Contents</span><span className="fact-value">Water</span></li>
            <li><span className="fact-label">Drop</span><span className="fact-value">Honey</span></li>
            <li><span className="fact-label">Spread</span><span className="fact-value">{Math.round(simState.honeyProgress * 100)}%</span></li>
            <li>
              <span className="fact-label">Status</span>
              <span className={`fact-value ${simState.honeyAdded ? 'status-active' : 'status-ready'}`}>
                {simState.honeyProgress >= 1 ? '✅ Complete' : simState.honeyAdded ? '🍯 Spreading…' : 'Ready'}
              </span>
            </li>
          </ul>
        </aside>
      )}

      {/* ── Free-play controls ───────────────────────────────────────────── */}
      {!guidedMode && (
        <ControlPanel
          inkAdded       ={simState.inkAdded}
          honeyAdded     ={simState.honeyAdded}
          isRunning      ={simState.isRunning}
          inkProgress    ={simState.inkProgress}
          honeyProgress  ={simState.honeyProgress}
          elapsed        ={simState.elapsed}
          compareMode    ={simState.compareMode}
          onAddInk       ={handleAddInk}
          onAddHoney     ={handleAddHoney}
          onStart        ={handleStart}
          onPause        ={handlePause}
          onReset        ={handleReset}
          onToggleCompare={handleToggleCompare}
        />
      )}

      {/* Footer */}
      <footer className="hud-footer">
        <span className="hint">🖱 Drag to orbit</span>
        <span className="hint">📜 Scroll to zoom</span>
        <span className="hint">🤚 Right-drag to pan</span>
      </footer>

      {/* Canvas */}
      <div ref={mountRef} className="canvas-shell" />
    </div>
  );
}
