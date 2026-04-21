/**
 * App.jsx — Diffusion in Liquids Experiment · Phase 3
 *
 * Integrates:
 *  • Three.js scene (GlassBuilder GLB models)
 *  • DiffusionEngine (physics simulation)
 *  • DiffusionVisuals (Three.js animations)
 *  • GameController  (gamification state machine)
 *  • SoundEngine     (synthesized audio)
 *  • GameOverlay     (full-screen UI: intro, quiz, results, explanation)
 *  • Phase2Panel     (experiment controls, visible only during experiment)
 */
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';

import {
  createRenderer, createScene, createEnvMap,
  createLighting, createCamera, createControls,
} from './scene/DiffusionSceneSetup';
import { createDiffusionLabEnvironment } from './scene/DiffusionLabEnvironment';
import { loadGlassModels, createGlassPair } from './scene/GlassBuilder';
import { AnimationLoop }                     from './scene/AnimationLoop';
import { DiffusionEngine }                   from './scene/DiffusionEngine';
import { DiffusionVisuals }                  from './scene/DiffusionVisuals';
import { GameController }                    from './scene/GameController';
import { SoundEngine }                       from './utils/SoundEngine';
import Phase2Panel                            from './components/Phase2Panel';
import GameOverlay                            from './components/GameOverlay';
import './App.css';

// ── Initial snapshots ─────────────────────────────────────────────────────────

const INIT_SNAP = {
  state: 'idle', elapsed: 0,
  hotProg: 0, coldProg: 0,
  dropProg: 0, settleProg: 0,
  isIdle: true, isDropping: false, isSettling: false,
  isObserving: false, isPaused: false, isComplete: false, hasDrop: false,
};

const INIT_GAME = {
  phase: 'intro', score: 0,
  prediction: null, predictionCorrect: null,
  quizIndex: 0, quizAnswers: [], quizResults: [],
  starsEarned: 0, badges: [], timeElapsed: 0,
  lastAnswerCorrect: null, currentQuestion: null,
};

// Phases that show a full-screen overlay (hide the side HUD)
const FULL_PHASES = new Set(['intro', 'predict', 'quiz', 'results', 'explanation']);

// ── App Component ─────────────────────────────────────────────────────────────

export default function App() {
  const mountRef   = useRef(null);
  const engineRef  = useRef(null);
  const visualsRef = useRef(null);
  const loopRef    = useRef(null);
  const gameRef    = useRef(null);

  const [snap,     setSnap]     = useState(INIT_SNAP);
  const [gameSnap, setGameSnap] = useState(INIT_GAME);
  const [loading,  setLoading]  = useState(true);
  const [loadErr,  setLoadErr]  = useState(null);

  // ── Sound engine — stable across renders ─────────────────────────────────────
  const sound = useMemo(() => new SoundEngine(), []);


  const showHUD = !FULL_PHASES.has(gameSnap.phase);

  // ── Three.js bootstrap ────────────────────────────────────────────────────
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;
    let cancelled = false;
    let _renderer, _controls, _envMap;

    async function init() {
      // Core renderer / scene
      _renderer = createRenderer(container);
      const scene = createScene();
      _envMap     = createEnvMap(_renderer);
      scene.environment = _envMap;
      createLighting(scene);
      const camera = createCamera(container.clientWidth, container.clientHeight);
      _controls    = createControls(camera, _renderer.domElement);

      // Lab environment (floor, backdrop, thermometers…)
      createDiffusionLabEnvironment(scene);

      // Load GLB models
      let beakerGLTF, waterGLTF;
      try {
        ({ beakerGLTF, waterGLTF } = await loadGlassModels());
      } catch (err) {
        if (!cancelled) setLoadErr(err.message || 'Failed to load GLB models');
        return;
      }
      if (cancelled) return;

      // Build glass pair from GLB models
      const { hotGlass, coldGlass } = createGlassPair({
        scene, envMap: _envMap, beakerGLTF, waterGLTF,
      });

      // DiffusionEngine (physics state machine)
      const engine       = new DiffusionEngine();
      engineRef.current  = engine;

      // DiffusionVisuals (Three.js animations)
      const visuals      = new DiffusionVisuals({ scene, hotGlass, coldGlass });
      visualsRef.current = visuals;

      // GameController (gamification)
      const game       = new GameController();
      gameRef.current  = game;
      game.onChange(gs => setGameSnap({ ...gs }));
      setGameSnap({ ...game.snapshot() });   // bootstrap initial snap

      // SoundEngine already created synchronously above — nothing to do here.

      // ── Bridge: DiffusionEngine → GameController ──────────────────────────
      let prevEngineSnap = engine.snapshot();

      engine.onChange(s => {
        setSnap({ ...s });
        const g = gameRef.current;
        if (!g) { prevEngineSnap = s; return; }

        const gPhase = g.snapshot().phase;

        // Crystal was dropped
        if (s.hasDrop && !prevEngineSnap.hasDrop && gPhase === 'ready') {
          g.markDropping();
        }
        // Engine auto-enters OBSERVING after settling
        if (s.isObserving && !prevEngineSnap.isObserving && gPhase === 'dropping') {
          g.markObserving();
        }
        // Experiment complete
        if (s.isComplete && !prevEngineSnap.isComplete) {
          if (['dropping', 'observing'].includes(gPhase)) {
            g.markComplete(s.elapsed);
            sound.success();
          }
        }

        prevEngineSnap = s;
      });

      // Animation loop
      const loop      = new AnimationLoop(_renderer, scene, camera, _controls);
      loopRef.current = loop;

      loop.add((_elapsed, dt) => {
        engine.update(dt);
        visuals.update(engine.snapshot(), dt);
      });
      loop.start();
      setLoading(false);

      // Resize handler
      const onResize = () => {
        const w = container.clientWidth, h = container.clientHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        _renderer.setSize(w, h);
      };
      window.addEventListener('resize', onResize);
      container.__diffCleanup = () => window.removeEventListener('resize', onResize);
    }

    init().catch(err => { if (!cancelled) setLoadErr(err.message); });

    // Cleanup
    return () => {
      cancelled = true;
      container.__diffCleanup?.();
      loopRef.current?.dispose();
      engineRef.current?.dispose();
      visualsRef.current?.dispose();
      gameRef.current?.dispose();
      _controls?.dispose();
      _renderer?.dispose();
      _envMap?.dispose();
      if (_renderer && container.contains(_renderer.domElement))
        container.removeChild(_renderer.domElement);
      loopRef.current   = null;
      engineRef.current = null;
      visualsRef.current = null;
      gameRef.current   = null;
    };
  }, [sound]);

  // Clean up sound on true unmount
  useEffect(() => () => sound.dispose(), [sound]);

  // ── Experiment callbacks (Phase2Panel) ────────────────────────────────────
  const onDrop = useCallback(() => {
    if (gameRef.current?.snapshot().phase !== 'ready') return;
    engineRef.current?.drop();
    sound.plop();
  }, [sound]);

  const onToggle = useCallback(() => {
    engineRef.current?.toggle();
    sound.tick();
  }, [sound]);

  const onReset = useCallback(() => {
    engineRef.current?.reset();
    if (visualsRef.current) visualsRef.current.update(INIT_SNAP, 0);
  }, []);

  // ── Game callbacks (GameOverlay) ──────────────────────────────────────────

  /** Move game to 'predict' or 'ready' phase */
  const handleGoReady = useCallback((targetPhase = 'ready') => {
    gameRef.current?.goTo(targetPhase);
  }, []);

  /** Player chose hot or cold */
  const handlePrediction = useCallback((choice) => {
    gameRef.current?.makePrediction(choice);
  }, []);

  /** Quiz answer submitted — returns true/false for sound in GameOverlay */
  const handleQuizAnswer = useCallback((idx) => {
    return gameRef.current?.submitQuizAnswer(idx) ?? false;
  }, []);

  /** Advance to next quiz question or results */
  const handleNextQuestion = useCallback(() => {
    gameRef.current?.nextQuestion();
  }, []);

  /** Move from results to explanation */
  const handleGoExplanation = useCallback(() => {
    gameRef.current?.goToExplanation();
  }, []);

  /** Full game + engine reset back to intro */
  const handleGameReset = useCallback(() => {
    gameRef.current?.reset();
    engineRef.current?.reset();
    if (visualsRef.current) visualsRef.current.update(INIT_SNAP, 0);
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="app-shell">

      {/* ── Header — always visible ──────────────────────────────────────── */}
      <header className="hud-header">
        <div className="hud-logo">
          <span className="hud-logo-icon">🔬</span>
          <span className="hud-logo-text">Science Lab</span>
        </div>
        <h1 className="hud-title">Diffusion in Liquids</h1>
        <div className="hud-badge phase2">
          <span className="badge-dot" />
          Phase 3 — Gamified
        </div>
      </header>

      {/* ── Left legend (hidden during full-screen overlays) ─────────────── */}
      {showHUD && (
        <aside className="legend-panel">
          <div className="legend-title">Experiment Setup</div>

          <div className="legend-item">
            <div className="legend-swatch hot-swatch" />
            <div className="legend-info">
              <span className="legend-name">🔥 Hot Water</span>
              <span className="legend-sub">≈ 80 °C — diffuses fast</span>
            </div>
          </div>

          <div className="legend-item">
            <div className="legend-swatch cold-swatch" />
            <div className="legend-info">
              <span className="legend-name">❄️ Cold Water</span>
              <span className="legend-sub">≈ 10 °C — diffuses slow</span>
            </div>
          </div>

          <div className="legend-item">
            <div className="legend-swatch crystal-swatch" />
            <div className="legend-info">
              <span className="legend-name">💎 Crystal</span>
              <span className="legend-sub">Copper Sulphate (CuSO₄)</span>
            </div>
          </div>

          <div className="legend-item">
            <div className="legend-swatch diff-swatch" />
            <div className="legend-info">
              <span className="legend-name">🌊 Diffusion</span>
              <span className="legend-sub">Blue colour spreading</span>
            </div>
          </div>

          <div className="legend-divider" />

          <div className="legend-stat-row">
            <span className="legend-stat-label">Temperature</span>
            <span className="legend-stat-vals">
              <span style={{color:'#ff7a30'}}>80°C</span>
              {' vs '}
              <span style={{color:'#3ab4f2'}}>10°C</span>
            </span>
          </div>

          {snap.hasDrop && (
            <div className="legend-stat-row">
              <span className="legend-stat-label">Speed ratio</span>
              <span className="legend-stat-vals" style={{color:'#80f0b0'}}>Hot is 3× faster</span>
            </div>
          )}

          {gameSnap.score > 0 && (
            <div className="legend-stat-row">
              <span className="legend-stat-label">Score</span>
              <span className="legend-stat-vals" style={{color:'#fbbf24'}}>
                ⭐ {gameSnap.score} / 100
              </span>
            </div>
          )}

          <div className="legend-divider" />
          <div className="legend-instructions">
            <div className="inst-line">🖱 Drag to orbit</div>
            <div className="inst-line">📜 Scroll to zoom</div>
            <div className="inst-line">🤚 Right-drag to pan</div>
          </div>
        </aside>
      )}

      {/* ── Phase 2 controls (hidden during full overlays) ───────────────── */}
      {showHUD && (
        <Phase2Panel
          snap={snap}
          onDrop={onDrop}
          onToggle={onToggle}
          onReset={onReset}
        />
      )}

      {/* ── Observation questions card (hidden during full overlays) ──────── */}
      {showHUD && (
        <div className="obs-card">
          <div className="obs-title">📋 Observe &amp; Think</div>
          <ul className="obs-list">
            <li>What do you see just above the crystal?</li>
            <li>What happens as time passes?</li>
            <li>What does this suggest about particles of solid &amp; liquid?</li>
            <li>Does the rate of mixing change with temperature?</li>
          </ul>
        </div>
      )}

      {/* ── Footer (hidden during full overlays) ─────────────────────────── */}
      {showHUD && (
        <footer className="hud-footer">
          <span className="hint">🖱 Drag to orbit</span>
          <span className="hint">📜 Scroll to zoom</span>
          <span className="hint">🤚 Right-drag to pan</span>
        </footer>
      )}

      {/* ── Canvas — always rendering behind everything ───────────────────── */}
      <div ref={mountRef} className="canvas-shell" />

      {/* ── Game Overlay — layered on top of canvas ──────────────────────── */}
      {!loading && !loadErr && (
        <GameOverlay
          gameSnap={gameSnap}
          diffSnap={snap}
          onGoReady={handleGoReady}
          onPrediction={handlePrediction}
          onQuizAnswer={handleQuizAnswer}
          onNextQuestion={handleNextQuestion}
          onGoExplanation={handleGoExplanation}
          onReset={handleGameReset}
          sound={sound}
        />
      )}

      {/* ── Loading overlay ───────────────────────────────────────────────── */}
      {loading && !loadErr && (
        <div className="loading-overlay">
          <div className="loading-spinner" />
          <div className="loading-text">Loading lab models…</div>
        </div>
      )}

      {/* ── Error overlay ─────────────────────────────────────────────────── */}
      {loadErr && (
        <div className="loading-overlay error">
          <div className="loading-icon">⚠️</div>
          <div className="loading-text">Failed to load GLB models</div>
          <div className="loading-sub">{loadErr}</div>
        </div>
      )}
    </div>
  );
}
