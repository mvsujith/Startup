import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { createRenderer, createCamera, createControls, createLights } from "./scene/SceneSetup.js";
import { createGround, createBackground, createWalls } from "./scene/Environment.js";
import {
  createHeightMarkers, createHeightLabelSprites,
  createHeightLine, createGlowPole, MAX_HEIGHT,
} from "./scene/HeightMarkers.js";
import {
  createLiftableObject, createGroundShadowCircle,
  updateShadowCircle, OBJECT_INITIAL_Y,
} from "./scene/LiftableObject.js";
import { startFall, createGhostBlock } from "./scene/PhysicsEngine.js";
import { SFX } from "./utils/sounds.js";
import EnergyMeter    from "./components/EnergyMeter.jsx";
import HintPanel      from "./components/HintPanel.jsx";
import TrialLog       from "./components/TrialLog.jsx";
import ModeBar        from "./components/ModeBar.jsx";
import GuidedTour     from "./components/GuidedTour.jsx";
import ChallengeSystem from "./components/ChallengeSystem.jsx";
import "./App.css";

const G = 9.8, MASS = 1;

const PHASE = {
  RESTING: "resting", LIFTED: "lifted",
  LIFTING: "lifting", FALLING: "falling", LANDED: "landed",
};

function easeInOutCubic(t) {
  return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2;
}

export default function App() {
  // ── Three.js refs ──────────────────────────────────────────────────────────
  const mountRef            = useRef(null);
  const objectRef           = useRef(null);
  const shadowCircleRef     = useRef(null);
  const updateHeightLineRef = useRef(null);
  const updateGlowHeightRef = useRef(null);
  const ghostRef            = useRef(null);

  // ── Animation control ──────────────────────────────────────────────────────
  const animFrameRef   = useRef(null);
  const liftRafRef     = useRef(null);
  const fallCancelRef  = useRef(null);

  // ── Physics state refs ─────────────────────────────────────────────────────
  const phaseRef         = useRef(PHASE.RESTING);
  const currentHeightRef = useRef(0);
  const targetHeightRef  = useRef(0);
  const compareHeightRef = useRef(null);
  const peakHeightRef    = useRef(0);
  const trialCounterRef  = useRef(0);

  // ── React UI state ─────────────────────────────────────────────────────────
  const [phase,         setPhase]         = useState(PHASE.RESTING);
  const [currentHeight, setCurrentHeight] = useState(0);
  const [targetHeight,  setTargetHeight]  = useState(0);
  const [fallDistance,  setFallDistance]  = useState(0);
  const [showHint,      setShowHint]      = useState(false);
  const [compareActive, setCompareActive] = useState(false);
  const [landedFlash,   setLandedFlash]   = useState(false);
  const [trials,        setTrials]        = useState([]);
  // ── Phase 3: Game state ────────────────────────────────────────────────────
  const [gameMode,  setGameMode]  = useState("free");   // free|guided|challenge
  const [totalScore, setTotalScore] = useState(0);
  const [badges,    setBadges]    = useState([]);

  // ── Shared height-update helper ────────────────────────────────────────────
  const applyHeight = useCallback((h) => {
    currentHeightRef.current = h;
    setCurrentHeight(parseFloat(h.toFixed(2)));
    if (objectRef.current)       objectRef.current.position.y = OBJECT_INITIAL_Y + h;
    if (shadowCircleRef.current) updateShadowCircle(shadowCircleRef.current, h);
    if (updateHeightLineRef.current) updateHeightLineRef.current(h);
    if (updateGlowHeightRef.current) updateGlowHeightRef.current(h);
  }, []);

  // ── Three.js scene init ────────────────────────────────────────────────────
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;
    while (container.firstChild) container.removeChild(container.firstChild);

    const scene    = new THREE.Scene();
    const renderer = createRenderer(container);
    const camera   = createCamera(container.clientWidth, container.clientHeight);
    const controls = createControls(camera, renderer.domElement);
    createLights(scene);

    createBackground(scene);
    createGround(scene);
    createWalls(scene);

    createHeightMarkers(scene);
    createHeightLabelSprites(scene);

    const { updateHeightLine } = createHeightLine(scene);
    updateHeightLineRef.current = updateHeightLine;

    const { updateGlowHeight } = createGlowPole(scene);
    updateGlowHeightRef.current = updateGlowHeight;

    const obj = createLiftableObject(scene);
    obj.userData.halfHeight = OBJECT_INITIAL_Y;
    objectRef.current = obj;

    const shadowCircle = createGroundShadowCircle(scene);
    shadowCircleRef.current = shadowCircle;

    const ghost = createGhostBlock(scene, 0x42a5f5);
    ghostRef.current = ghost;

    const onResize = () => {
      const w = container.clientWidth, h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener("resize", onResize);
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };
  }, []); // eslint-disable-line

  // ── LIFT ──────────────────────────────────────────────────────────────────
  const handleLift = useCallback(() => {
    if (phaseRef.current === PHASE.LIFTING || phaseRef.current === PHASE.FALLING) return;
    if (Math.abs(currentHeightRef.current - targetHeightRef.current) < 0.01) return;
    fallCancelRef.current?.cancel();
    SFX.lift();
    phaseRef.current = PHASE.LIFTING;
    setPhase(PHASE.LIFTING);

    const start = currentHeightRef.current;
    const end   = targetHeightRef.current;
    const dur   = Math.abs(end - start) * 0.55 + 0.45;
    const t0    = performance.now();

    const tick = () => {
      const elapsed = (performance.now() - t0) / 1000;
      const t = Math.min(elapsed / dur, 1);
      applyHeight(start + (end - start) * easeInOutCubic(t));
      if (t < 1) { liftRafRef.current = requestAnimationFrame(tick); }
      else { phaseRef.current = PHASE.LIFTED; setPhase(PHASE.LIFTED); }
    };
    liftRafRef.current = requestAnimationFrame(tick);
  }, [applyHeight]);

  // ── RELEASE ────────────────────────────────────────────────────────────────
  const handleRelease = useCallback(() => {
    if (phaseRef.current !== PHASE.LIFTED) return;
    if (currentHeightRef.current < 0.05) return;
    if (liftRafRef.current) cancelAnimationFrame(liftRafRef.current);

    const h0 = currentHeightRef.current;
    peakHeightRef.current = h0;
    phaseRef.current = PHASE.FALLING;
    setPhase(PHASE.FALLING);

    const ctrl = startFall({
      objectGroup: objectRef.current,
      initialHeight: h0,
      onUpdate: (h, fd) => {
        currentHeightRef.current = h;
        setCurrentHeight(parseFloat(h.toFixed(2)));
        setFallDistance(parseFloat(fd.toFixed(2)));
        if (shadowCircleRef.current) updateShadowCircle(shadowCircleRef.current, h);
        if (updateHeightLineRef.current) updateHeightLineRef.current(h);
        if (updateGlowHeightRef.current) updateGlowHeightRef.current(h);
      },
      onLand: (fd) => {
        SFX.land();
        currentHeightRef.current = 0;
        setCurrentHeight(0);
        setFallDistance(parseFloat(fd.toFixed(2)));
        phaseRef.current = PHASE.LANDED;
        setPhase(PHASE.LANDED);
        setLandedFlash(true);
        setTimeout(() => setLandedFlash(false), 600);

        // Record trial
        const h = peakHeightRef.current;
        const now = new Date();
        const ts = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}:${String(now.getSeconds()).padStart(2,"0")}`;
        trialCounterRef.current += 1;
        setTrials(prev => [...prev, {
          id: trialCounterRef.current, time: ts,
          peakHeight: h, pe: MASS*G*h, work: MASS*G*h, fallDist: fd,
        }]);
      },
    });
    fallCancelRef.current = ctrl;
  }, []);

  // ── RESET ──────────────────────────────────────────────────────────────────
  const handleReset = useCallback(() => {
    fallCancelRef.current?.cancel();
    if (liftRafRef.current) cancelAnimationFrame(liftRafRef.current);
    targetHeightRef.current = 0;
    setTargetHeight(0);
    setFallDistance(0);

    const start = currentHeightRef.current;
    const dur   = start * 0.4 + 0.3;
    const t0    = performance.now();
    phaseRef.current = PHASE.LIFTING;
    setPhase(PHASE.LIFTING);

    const tick = () => {
      const elapsed = (performance.now() - t0) / 1000;
      const t = Math.min(elapsed / dur, 1);
      applyHeight(start * (1 - easeInOutCubic(t)));
      if (t < 1) { liftRafRef.current = requestAnimationFrame(tick); }
      else {
        phaseRef.current = PHASE.RESTING;
        setPhase(PHASE.RESTING);
        if (objectRef.current) objectRef.current.scale.set(1,1,1);
      }
    };
    liftRafRef.current = requestAnimationFrame(tick);
  }, [applyHeight]);

  // ── COMPARE ────────────────────────────────────────────────────────────────
  const handleCompare = () => {
    const h = currentHeightRef.current;
    if (h < 0.1) return;
    if (compareActive) {
      ghostRef.current?.hide();
      compareHeightRef.current = null;
      setCompareActive(false);
    } else {
      compareHeightRef.current = h;
      ghostRef.current?.setHeight(h, `${h.toFixed(1)}m · ${(MASS*G*h).toFixed(1)}J`);
      ghostRef.current?.show();
      setCompareActive(true);
    }
  };

  const handleClearTrials = () => { setTrials([]); trialCounterRef.current = 0; };

  // ── Challenge system callbacks ─────────────────────────────────────────────
  const handleSetTargetFromChallenge = useCallback((h) => {
    targetHeightRef.current = h;
    setTargetHeight(h);
  }, []);

  const handleScoreGained = useCallback((pts, badge) => {
    setTotalScore(s => s + pts);
    if (badge) setBadges(b => [...b, badge]);
  }, []);

  // ── Guided Tour completion ─────────────────────────────────────────────────
  const handleGuidedComplete = () => setGameMode("challenge");

  // ── Derived values ─────────────────────────────────────────────────────────
  const pe       = (MASS * G * currentHeight).toFixed(2);
  const workDone = pe;
  const isMoving   = phase === PHASE.LIFTING || phase === PHASE.FALLING;
  const canLift    = !isMoving && targetHeight !== currentHeight;
  const canRelease = phase === PHASE.LIFTED && currentHeight > 0.05;
  const canReset   = !isMoving && (currentHeight > 0.01 || phase === PHASE.LANDED);
  const handleSliderChange = (e) => {
    const h = parseFloat(e.target.value);
    targetHeightRef.current = h;
    setTargetHeight(h);
  };

  return (
    <div className="app-shell">
      {/* 3D canvas */}
      <div ref={mountRef} className="canvas-shell" />

      {/* Impact flash */}
      {landedFlash && <div className="impact-flash" />}

      {/* Hint modal */}
      {showHint && <HintPanel onClose={() => setShowHint(false)} />}

      {/* ── Mode bar ── */}
      <ModeBar mode={gameMode} onChange={setGameMode} score={totalScore} badges={badges} />

      {/* ── Guided Tour (below mode bar, full-screen bottom card) ── */}
      {gameMode === "guided" && (
        <GuidedTour onComplete={handleGuidedComplete} phase={phase} currentHeight={currentHeight} />
      )}

      {/* ── Challenge System ── */}
      {gameMode === "challenge" && (
        <ChallengeSystem
          currentHeight={currentHeight}
          phase={phase}
          fallDistance={fallDistance}
          onSetTarget={handleSetTargetFromChallenge}
          onRequestLifted={handleLift}
          onScoreGained={handleScoreGained}
        />
      )}

      {/* ── Left panel: Trial Log ── */}
      <TrialLog trials={trials} onClear={handleClearTrials} />

      {/* ── Top bar ── */}
      <header className="top-bar">
        <div className="title-block">
          <span className="title-icon">🔬</span>
          <div>
            <h1 className="title-text">Physics Experiment</h1>
            <p className="subtitle-text">Work Done Against Gravity — Class 9 Science</p>
          </div>
        </div>
        <div className="top-bar-right">
          <div className={`phase-badge phase-${phase}`}>
            {phase === PHASE.RESTING  && "⬜ Resting"}
            {phase === PHASE.LIFTING  && "⬆ Lifting…"}
            {phase === PHASE.LIFTED   && "🔒 Held"}
            {phase === PHASE.FALLING  && "⬇ Falling…"}
            {phase === PHASE.LANDED   && "💥 Landed!"}
          </div>
          <div className="formula-badge">W = mgh</div>
        </div>
      </header>

      {/* ── Control panel (always visible — needed to Lift/Release in all modes) ── */}
      {(
        <aside className="control-panel">
          <div className="panel-section">
            <label className="panel-label">Target Height (h)</label>
            <input type="range" min="0" max={MAX_HEIGHT} step="0.5"
              value={targetHeight} onChange={handleSliderChange}
              className="height-slider" disabled={isMoving} />
            <div className="slider-values">
              <span>0 m</span>
              <span className="slider-val-display">{targetHeight} m</span>
              <span>{MAX_HEIGHT} m</span>
            </div>
          </div>

          <div className="panel-section btn-grid">
            <button className={`btn btn-lift ${!canLift?"disabled":""}`} onClick={handleLift} disabled={!canLift}>⬆ Lift</button>
            <button className={`btn btn-release ${!canRelease?"disabled":""}`} onClick={handleRelease} disabled={!canRelease}>⬇ Release</button>
            <button className={`btn btn-reset ${!canReset?"disabled":""}`} onClick={handleReset} disabled={!canReset}>↺ Reset</button>
            <button className={`btn btn-compare ${compareActive?"active":""} ${currentHeight<0.1?"disabled":""}`} onClick={handleCompare} disabled={currentHeight<0.1}>
              ⇄ {compareActive?"Clear":"Compare"}
            </button>
          </div>

          <EnergyMeter height={currentHeight} maxHeight={MAX_HEIGHT} mass={MASS} g={G} />

          <div className="data-grid">
            <DataCard label="Mass (m)"   value="1 kg"               color="#42a5f5" />
            <DataCard label="Gravity (g)" value="9.8 m/s²"          color="#66bb6a" />
            <DataCard label="Height (h)"  value={`${currentHeight} m`} color="#ffa726" highlight />
            <DataCard label="PE = mgh"    value={`${pe} J`}          color="#ef5350" highlight />
            <DataCard label="Work Done"   value={`${workDone} J`}    color="#ab47bc" />
            <DataCard label="Fall Dist."  value={`${fallDistance} m`} color="#26c6da" />
          </div>

          <div className="info-box">
            <p>W = m × g × h = {MASS} × {G} × {currentHeight}</p>
            <p>= <strong>{workDone} J</strong></p>
            {compareActive && compareHeightRef.current && (
              <p className="compare-note">
                📊 Compare: {compareHeightRef.current.toFixed(1)} m → {(MASS*G*compareHeightRef.current).toFixed(1)} J
              </p>
            )}
          </div>

          <button className="btn btn-hint" onClick={() => setShowHint(true)}>💡 Show Hint</button>
        </aside>
      )}

      {/* Legend */}
      <div className="legend">
        <div className="legend-item"><span className="legend-dot" style={{background:"#ff4d2e"}} />Object (1 kg)</div>
        {compareActive && (<div className="legend-item"><span className="legend-dot" style={{background:"#42a5f5"}} />Compare ({compareHeightRef.current?.toFixed(1)} m)</div>)}
        <div className="legend-item"><span className="legend-dot" style={{background:"#00e5ff"}} />Energy level</div>
        <div className="legend-item"><span className="legend-dot" style={{background:"#ffeb3b"}} />Height line</div>
      </div>
    </div>
  );
}

function DataCard({ label, value, color, highlight }) {
  return (
    <div className={`data-card ${highlight?"highlight":""}`} style={{borderColor:color}}>
      <span className="data-label">{label}</span>
      <span className="data-value" style={{color}}>{value}</span>
    </div>
  );
}
