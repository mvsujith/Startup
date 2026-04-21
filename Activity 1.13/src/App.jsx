/**
 * App.jsx — Camphor Sublimation Experiment
 *
 * Phase 1 — 3D lab scene (CamphorScene)
 * Phase 2 — Heating animation: FlameSystem, SublimationSystem, HeatHaze,
 *            camphor-shrink, elapsed timer, pause/resume/replay controls
 * Phase 3 — Guided learning mode (GuidedOverlay), Science Quiz (QuizPanel),
 *            Results & Explanation (ResultsPanel)
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import './App.css';

// ── Scene systems ──────────────────────────────────────────────────────────
import { initScene, createCamera, createControls } from './scene/SceneSetup.js';
import { AnimationLoop }     from './scene/AnimationLoop.js';
import { buildCamphorSetup } from './scene/CamphorScene.js';
import { FlameSystem }       from './scene/FlameSystem.js';
import { SublimationSystem } from './scene/SublimationSystem.js';
import { HeatHaze }          from './scene/HeatHaze.js';

// ── Phase 3 components ─────────────────────────────────────────────────────
import GuidedOverlay, { GUIDE_STEPS } from './components/GuidedOverlay.jsx';
import QuizPanel   from './components/QuizPanel.jsx';
import ResultsPanel from './components/ResultsPanel.jsx';

// ── Apparatus card data ────────────────────────────────────────────────────
const APPARATUS = [
  { icon: '🔥', name: 'Spirit Burner', desc: 'Supplies gentle heat via an alcohol wick to cause sublimation.', color: '#fb923c' },
  { icon: '⚙️', name: 'Tripod Stand',  desc: 'Iron support that holds the china dish at the correct height.', color: '#c4b5fd' },
  { icon: '🍽️', name: 'China Dish',    desc: 'Shallow porcelain bowl that holds the crushed camphor.', color: '#fcd34d' },
  { icon: '🧊', name: 'Camphor',       desc: 'White waxy solid (C₁₀H₁₆O) that sublimates on gentle heating.', color: '#a5f3fc' },
  { icon: '🔺', name: 'Inverted Funnel', desc: 'Traps vapour & directs it upward — wide end down.', color: '#86efac' },
  { icon: '☁️', name: 'Cotton Plug',   desc: 'Allows airflow but catches re-solidified camphor crystals.', color: '#fda4af' },
];

const STEPS = [
  'Take some camphor & crush it',
  'Place it in the china dish',
  'Put inverted funnel over the dish',
  'Plug the funnel stem with cotton',
  'Heat slowly & observe',
];

export default function App() {
  // ── Canvas ref ──────────────────────────────────────────────────────────
  const mountRef = useRef(null);

  // ── System refs (not React state — updated every frame) ─────────────────
  const loopRef        = useRef(null);
  const flameRef       = useRef(null);
  const sublimRef      = useRef(null);
  const hazeRef        = useRef(null);
  const camphorMeshRef = useRef(null);  // camphor group for shrinking

  const isHeatingRef = useRef(false);
  const isPausedRef  = useRef(false);
  const elapsedRef   = useRef(0);      // total heating seconds

  // ── React UI state ──────────────────────────────────────────────────────
  const [appMode,    setAppMode]    = useState('guided');   // 'guided' | 'freeplay'
  const [heating,    setHeating]    = useState(false);
  const [paused,     setPaused]     = useState(false);
  const [progress,   setProgress]   = useState(0);
  const [crystalsN,  setCrystalsN]  = useState(0);
  const [elapsed,    setElapsed]    = useState(0);
  const [activeCard, setActiveCard] = useState(null);
  const [guideStep,  setGuideStep]  = useState(0);

  // Phase 3 quiz + results
  const [showQuiz,    setShowQuiz]    = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [quizScore,   setQuizScore]   = useState(0);

  // derived
  const simComplete = progress >= 1;

  // ── Scene initialisation ────────────────────────────────────────────────
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const { renderer, scene, burnerGlow } = initScene(container);
    const camera   = createCamera(container.clientWidth, container.clientHeight);
    const controls = createControls(camera, renderer.domElement);

    // Build scene → get world-space coords for systems
    const { wickPosition, funnelRimY, camphorY, dishY, camphor } =
      buildCamphorSetup(scene);

    camphorMeshRef.current = camphor;

    // Phase 2 systems
    const flame  = new FlameSystem(scene, wickPosition, burnerGlow);
    const sublim = new SublimationSystem(scene, funnelRimY, camphorY);
    const haze   = new HeatHaze(scene, dishY);

    flameRef.current  = flame;
    sublimRef.current = sublim;
    hazeRef.current   = haze;

    // Animation loop
    const loop = new AnimationLoop(renderer, scene, camera, controls);
    loopRef.current = loop;

    loop.add((_el, dt) => {
      if (!isHeatingRef.current || isPausedRef.current) {
        // Still drain fading particles when stopped
        sublim.update(dt);
        return;
      }

      elapsedRef.current += dt;

      flame.update(dt);
      sublim.update(dt);
      haze.update(dt);

      // Camphor shrinks as it sublimates
      if (camphorMeshRef.current) {
        const s = Math.max(1 - sublim.progress * 0.90, 0.08);
        camphorMeshRef.current.scale.setScalar(s);
      }

      // Push to React state (throttled)
      const p = sublim.progress;
      setProgress(prev => Math.abs(p - prev) > 0.004 ? p : prev);
      setCrystalsN(sublim.crystalCount);
      setElapsed(Math.round(elapsedRef.current));

      // Auto-advance guide step when complete
      if (p >= 1 && isHeatingRef.current) {
        isHeatingRef.current = false;
        setHeating(false);
        flame.stop();
        haze.stop();
      }
    });

    loop.start();

    // Resize
    const onResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      loop.stop();
      flame.dispose?.();
      sublim.dispose?.();
      haze.dispose?.();
      renderer.dispose();
      container.innerHTML = '';
    };
  }, []);

  // ── Control handlers ────────────────────────────────────────────────────
  const handleHeat = useCallback(() => {
    if (simComplete) return;
    isHeatingRef.current = true;
    isPausedRef.current  = false;
    setHeating(true);
    setPaused(false);
    flameRef.current?.start();
    sublimRef.current?.start();
    hazeRef.current?.start();
    // Advance guide to observe step
    setGuideStep(prev => prev === 7 ? 8 : prev);
  }, [simComplete]);

  const handlePause = useCallback(() => {
    isPausedRef.current = true;
    setPaused(true);
    flameRef.current?.stop();
    hazeRef.current?.stop();
  }, []);

  const handleResume = useCallback(() => {
    if (simComplete) return;
    isPausedRef.current  = false;
    isHeatingRef.current = true;
    setPaused(false);
    flameRef.current?.start();
    hazeRef.current?.start();
  }, [simComplete]);

  const handleStop = useCallback(() => {
    isHeatingRef.current = false;
    isPausedRef.current  = false;
    setHeating(false);
    setPaused(false);
    flameRef.current?.stop();
    hazeRef.current?.stop();
  }, []);

  const handleReset = useCallback(() => {
    isHeatingRef.current = false;
    isPausedRef.current  = false;
    elapsedRef.current   = 0;
    setHeating(false);
    setPaused(false);
    setProgress(0);
    setCrystalsN(0);
    setElapsed(0);
    setShowQuiz(false);
    setShowResults(false);
    setGuideStep(0);
    flameRef.current?.stop();
    sublimRef.current?.reset();
    hazeRef.current?.stop();
    // Restore camphor size
    if (camphorMeshRef.current) camphorMeshRef.current.scale.setScalar(1);
  }, []);

  const handleReplay = useCallback(() => {
    handleReset();
  }, [handleReset]);

  // ── Guided mode handlers ────────────────────────────────────────────────
  const handleGuideNext = useCallback(() => {
    setGuideStep(prev => Math.min(prev + 1, GUIDE_STEPS.length - 1));
  }, []);

  const handleGuidePrev = useCallback(() => {
    setGuideStep(prev => Math.max(prev - 1, 0));
  }, []);

  const handleSkipTour = useCallback(() => {
    setAppMode('freeplay');
  }, []);

  const handleStartQuiz = useCallback(() => {
    setShowQuiz(true);
  }, []);

  const handleQuizComplete = useCallback((score) => {
    setQuizScore(score);
    setShowQuiz(false);
    setShowResults(true);
  }, []);

  const handleNewMode = useCallback(() => {
    handleReset();
    setAppMode('freeplay');
  }, [handleReset]);

  // Current phase label
  const phaseLabel = !heating && progress === 0
    ? 'Phase 1 — Scene Setup'
    : heating
      ? 'Phase 2 — Sublimation Active'
      : simComplete
        ? 'Phase 3 — Experiment Complete'
        : 'Phase 2 — Heating Paused';

  const isGuided   = appMode === 'guided';
  const isFreeplay = appMode === 'freeplay';

  return (
    <div className="app-shell">
      {/* ── 3D Canvas ── */}
      <div className="canvas-mount" ref={mountRef} />

      {/* ── HUD Header ── */}
      <header className="hud-header">
        <div className="hud-logo">
          <span className="hud-logo-icon">⚗️</span>
          <span className="hud-logo-text">SCIENCE LAB</span>
        </div>
        <h1 className="hud-title">Sublimation of Camphor</h1>
        <div className="hud-badge-wrap">
          {heating && (
            <span className="hud-badge hud-badge--heating">🔥 HEATING…</span>
          )}
          {paused && (
            <span className="hud-badge hud-badge--paused">⏸ PAUSED</span>
          )}
          {simComplete && !showQuiz && !showResults && (
            <span className="hud-badge hud-badge--complete">✅ COMPLETE</span>
          )}
          {isGuided && !heating && !simComplete && (
            <span className="hud-badge hud-badge--guide">🗺️ GUIDED MODE</span>
          )}
          {isFreeplay && (
            <span className="hud-badge hud-badge--free">🔬 FREE EXPLORE</span>
          )}
        </div>
      </header>

      {/* ══════════════════════════════════════════════
          FREE-PLAY side panels (only in freeplay mode)
          ══════════════════════════════════════════════ */}
      {isFreeplay && (
        <>
          {/* Left panel */}
          <aside className="info-panel info-panel--left">
            <div className="panel-section">
              <p className="panel-label">⚗️ EXPERIMENT STEPS</p>
              <ol className="step-list">
                {STEPS.map((s, i) => {
                  const done   = i < 4 || (i === 4 && heating);
                  const active = i === 4 && heating;
                  return (
                    <li
                      key={i}
                      className={`step-item ${active ? 'step-item--active' : done ? 'step-item--done' : 'step-item--pending'}`}
                    >
                      {s}
                    </li>
                  );
                })}
              </ol>
            </div>

            {/* Heat controls */}
            <div className="heat-controls">
              {!heating && !paused && !simComplete && (
                <button id="btn-heat" className="btn btn--heat" onClick={handleHeat}>🔥 Heat Slowly</button>
              )}
              {heating && !paused && (
                <>
                  <button id="btn-pause" className="btn btn--stop" onClick={handlePause}>⏸ Pause</button>
                  <button id="btn-stop"  className="btn btn--stop" onClick={handleStop}>⏹ Stop</button>
                </>
              )}
              {paused && (
                <>
                  <button id="btn-resume" className="btn btn--heat" onClick={handleResume}>▶ Resume</button>
                  <button id="btn-stop2"  className="btn btn--stop" onClick={handleStop}>⏹ Stop</button>
                </>
              )}
              {simComplete && (
                <button id="btn-quiz-free" className="btn btn--quiz" onClick={() => setShowQuiz(true)}>📝 Take Quiz</button>
              )}
              <button id="btn-reset" className="btn btn--reset" onClick={handleReset}>↺ Reset</button>
            </div>

            {/* Progress */}
            {(heating || progress > 0) && (
              <div className="sublimation-progress">
                <div className="progress-header">
                  <span className="progress-label">SUBLIMATION</span>
                  <span className="progress-pct">{Math.round(progress * 100)}%</span>
                </div>
                <div className="progress-bar-track">
                  <div className="progress-bar-fill" style={{ width: `${progress * 100}%` }} />
                </div>
                <div className="progress-sub-row">
                  <span className="progress-sub">❄️ {crystalsN} crystals deposited</span>
                  <span className="progress-sub">⏱️ {elapsed}s</span>
                </div>
              </div>
            )}

            {/* Inference */}
            {simComplete && (
              <div className="inference-box">
                <span className="inference-label">💡 INFERENCE</span>
                <p className="inference-text">
                  Camphor <strong>sublimates</strong> — it converts directly from a solid to a vapour
                  without passing through the liquid state.
                </p>
              </div>
            )}
          </aside>

          {/* Right panel */}
          <aside className="info-panel info-panel--right">
            <div className="panel-section">
              <p className="panel-label">🔬 APPARATUS</p>
              <div className="component-cards">
                {APPARATUS.map(a => (
                  <div
                    key={a.name}
                    className={`comp-card ${activeCard === a.name ? 'comp-card--active' : ''}`}
                    style={{ '--card-accent': a.color }}
                    onMouseEnter={() => setActiveCard(a.name)}
                    onMouseLeave={() => setActiveCard(null)}
                  >
                    <span className="comp-icon">{a.icon}</span>
                    <div className="comp-body">
                      <span className="comp-name" style={{ color: a.color }}>{a.name}</span>
                      {activeCard === a.name && (
                        <p className="comp-desc">{a.desc}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Mode switch */}
            <button className="mode-switch-btn" onClick={() => { handleReset(); setAppMode('guided'); }}>
              🗺️ Switch to Guided Mode
            </button>
          </aside>
        </>
      )}

      {/* ══════════════════════════════════════════════
          GUIDED MODE overlay (bottom dock)
          ══════════════════════════════════════════════ */}
      {isGuided && !showQuiz && !showResults && (
        <GuidedOverlay
          step={guideStep}
          totalSteps={GUIDE_STEPS.length}
          heating={heating}
          progress={progress}
          onNext={handleGuideNext}
          onPrev={handleGuidePrev}
          onSkip={handleSkipTour}
          onHeat={handleHeat}
          onStartQuiz={handleStartQuiz}
        />
      )}

      {/* During guided observe step — show minimal controls top-right */}
      {isGuided && guideStep === 8 && !showQuiz && !showResults && (
        <div className="guided-controls-float">
          {heating && !paused && (
            <button className="gfloat-btn gfloat-btn--pause" onClick={handlePause}>⏸ Pause</button>
          )}
          {paused && (
            <button className="gfloat-btn gfloat-btn--resume" onClick={handleResume}>▶ Resume</button>
          )}
          <button className="gfloat-btn gfloat-btn--reset" onClick={handleReset}>↺ Reset</button>
          {simComplete && (
            <button className="gfloat-btn gfloat-btn--next" onClick={handleGuideNext}>
              Next → Quiz
            </button>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════
          QUIZ PANEL (overlaid on scene)
          ══════════════════════════════════════════════ */}
      {showQuiz && (
        <QuizPanel onComplete={handleQuizComplete} />
      )}

      {/* ══════════════════════════════════════════════
          RESULTS PANEL
          ══════════════════════════════════════════════ */}
      {showResults && (
        <ResultsPanel
          score={quizScore}
          elapsed={elapsed}
          crystalsN={crystalsN}
          onReplay={handleReplay}
          onNewMode={handleNewMode}
        />
      )}

      {/* ── Footer hint bar ── */}
      {!showQuiz && !showResults && (
        <footer className="hud-footer">
          <span className="hint">🖱 Drag to orbit</span>
          <span className="hint-sep" />
          <span className="hint">📦 Scroll to zoom</span>
          <span className="hint-sep" />
          <span className="hint">🖱 Right-drag to pan</span>
          <span className="hint-sep" />
          <span className="hint hint--phase">{phaseLabel}</span>
        </footer>
      )}
    </div>
  );
}
