/**
 * Phase2Panel.jsx — Diffusion Experiment Controls (Phase 2)
 *
 * React UI panel with all controls + displays:
 *   • Drop Crystal button
 *   • Start Observation / Pause toggle
 *   • Reset
 *   • Compare (show side-by-side ratio)
 *   • Show Hint (science explanation modal)
 *   • Progress bars for hot & cold
 *   • Time elapsed display
 *   • In-experiment observation prompt
 */

import { useState } from 'react';
import './Phase2Panel.css';

// ── Helper: format elapsed seconds as MM:SS ────────────────────────────────────
function fmtTime(sec) {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = Math.floor(sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

// ── Phase2Panel component ──────────────────────────────────────────────────────

/**
 * @param {object}   props
 * @param {object}   props.snap       — DiffusionEngine.snapshot()
 * @param {Function} props.onDrop     — () => void
 * @param {Function} props.onToggle   — () => void  (start / pause)
 * @param {Function} props.onReset    — () => void
 */
export default function Phase2Panel({ snap, onDrop, onToggle, onReset }) {
  const [showHint,    setShowHint]    = useState(false);
  const [showCompare, setShowCompare] = useState(false);

  // Derived flags
  const canDrop   = snap.isIdle;
  const canToggle = snap.hasDrop && !snap.isComplete && !snap.isDropping;
  const canReset  = snap.hasDrop;
  const isRunning = snap.isObserving;

  // Speed ratio label (cold is 3× slower)
  const ratio = snap.hotProg > 0 && snap.coldProg > 0
    ? (snap.hotProg / snap.coldProg).toFixed(1)
    : '3.0';

  return (
    <>
      {/* ── Main control panel ──────────────────────────────────────────────── */}
      <div className="p2-panel">

        {/* Header */}
        <div className="p2-header">
          <span className="p2-icon">⚗️</span>
          <span className="p2-title">Diffusion Controls</span>
          <span className={`p2-status ${snap.state}`}>{stateLabel(snap)}</span>
        </div>

        {/* ── Primary buttons ────────────────────────────────────────────────── */}
        <div className="p2-buttons">

          {/* Drop Crystal */}
          <button
            id="btn-drop"
            className={`p2-btn btn-drop ${!canDrop ? 'disabled' : ''}`}
            onClick={canDrop ? onDrop : undefined}
            disabled={!canDrop}
            title="Drop copper sulphate crystal into both glasses"
          >
            <span className="p2-btn-icon">💎</span>
            Drop Crystal
          </button>

          {/* Start / Pause */}
          <button
            id="btn-toggle"
            className={`p2-btn btn-toggle ${!canToggle ? 'disabled' : ''} ${isRunning ? 'running' : ''}`}
            onClick={canToggle ? onToggle : undefined}
            disabled={!canToggle}
            title={isRunning ? 'Pause observation' : 'Start / resume observation'}
          >
            <span className="p2-btn-icon">{isRunning ? '⏸' : '▶'}</span>
            {isRunning ? 'Pause' : 'Start Observation'}
          </button>

          {/* Reset */}
          <button
            id="btn-reset"
            className={`p2-btn btn-reset ${!canReset ? 'disabled' : ''}`}
            onClick={canReset ? onReset : undefined}
            disabled={!canReset}
            title="Reset both glasses to clear water"
          >
            <span className="p2-btn-icon">↺</span>
            Reset
          </button>
        </div>

        {/* ── Secondary buttons ───────────────────────────────────────────────── */}
        <div className="p2-buttons-secondary">
          <button
            id="btn-compare"
            className={`p2-btn-sm ${showCompare ? 'active' : ''}`}
            onClick={() => setShowCompare(v => !v)}
            title="Show speed comparison"
          >
            🔍 Compare
          </button>
          <button
            id="btn-hint"
            className={`p2-btn-sm ${showHint ? 'active' : ''}`}
            onClick={() => setShowHint(v => !v)}
            title="Show scientific hint"
          >
            💡 Show Hint
          </button>
        </div>

        {/* ── Time display ────────────────────────────────────────────────────── */}
        <div className="p2-time-row">
          <span className="p2-time-label">⏱ Time</span>
          <span className="p2-time-value">{fmtTime(snap.elapsed)}</span>
        </div>

        <div className="p2-divider" />

        {/* ── Progress: Hot glass ──────────────────────────────────────────────── */}
        <div className="p2-progress-block">
          <div className="p2-prog-header">
            <span className="p2-prog-label hot">🔥 Hot Water (≈ 80 °C)</span>
            <span className="p2-prog-pct hot">{Math.round(snap.hotProg * 100)}%</span>
          </div>
          <div className="p2-prog-track">
            <div
              className="p2-prog-fill hot"
              style={{ width: `${snap.hotProg * 100}%` }}
            />
            {snap.hotProg >= 1 && (
              <span className="p2-prog-done">✓ Complete!</span>
            )}
          </div>
          <div className="p2-prog-sub">
            {snap.hotProg > 0 && snap.hotProg < 1 && (
              <span>Particles spreading rapidly ↑</span>
            )}
            {snap.hotProg >= 1 && (
              <span>Fully mixed — uniform colour</span>
            )}
            {snap.hotProg === 0 && <span>Waiting for crystal…</span>}
          </div>
        </div>

        {/* ── Progress: Cold glass ─────────────────────────────────────────────── */}
        <div className="p2-progress-block">
          <div className="p2-prog-header">
            <span className="p2-prog-label cold">❄️ Cold Water (≈ 10 °C)</span>
            <span className="p2-prog-pct cold">{Math.round(snap.coldProg * 100)}%</span>
          </div>
          <div className="p2-prog-track">
            <div
              className="p2-prog-fill cold"
              style={{ width: `${snap.coldProg * 100}%` }}
            />
            {snap.coldProg >= 1 && (
              <span className="p2-prog-done">✓ Complete!</span>
            )}
          </div>
          <div className="p2-prog-sub">
            {snap.coldProg > 0 && snap.coldProg < 1 && (
              <span>Particles spreading slowly ↑</span>
            )}
            {snap.coldProg >= 1 && (
              <span>Fully mixed — uniform colour</span>
            )}
            {snap.coldProg === 0 && <span>Waiting for crystal…</span>}
          </div>
        </div>

        {/* ── Completion message ───────────────────────────────────────────────── */}
        {snap.isComplete && (
          <div className="p2-complete">
            <div className="p2-complete-icon">🎉</div>
            <div className="p2-complete-text">
              Hot water diffused <strong>3× faster</strong>!
            </div>
            <div className="p2-complete-sub">
              Higher temperature → more kinetic energy → faster diffusion
            </div>
          </div>
        )}

      </div>

      {/* ── Compare overlay ──────────────────────────────────────────────────── */}
      {showCompare && (
        <div className="p2-compare">
          <div className="p2-compare-title">📊 Speed Comparison</div>
          <div className="p2-compare-row">
            <div className="p2-compare-col hot">
              <div className="p2-compare-name">🔥 Hot</div>
              <div className="p2-compare-bar-wrap">
                <div className="p2-compare-bar hot" style={{ height: `${snap.hotProg * 100}%` }} />
              </div>
              <div className="p2-compare-pct">{Math.round(snap.hotProg * 100)}%</div>
            </div>
            <div className="p2-compare-vs">
              <div className="p2-ratio">{ratio}×</div>
              <div className="p2-ratio-label">faster</div>
            </div>
            <div className="p2-compare-col cold">
              <div className="p2-compare-name">❄️ Cold</div>
              <div className="p2-compare-bar-wrap">
                <div className="p2-compare-bar cold" style={{ height: `${snap.coldProg * 100}%` }} />
              </div>
              <div className="p2-compare-pct">{Math.round(snap.coldProg * 100)}%</div>
            </div>
          </div>
          <div className="p2-compare-fact">
            Hot molecules have more kinetic energy and move
            <strong> ~3× faster</strong>, so diffusion is faster.
          </div>
          <button className="p2-compare-close" onClick={() => setShowCompare(false)}>✕ Close</button>
        </div>
      )}

      {/* ── Hint modal ───────────────────────────────────────────────────────── */}
      {showHint && (
        <div className="p2-hint-overlay" onClick={() => setShowHint(false)}>
          <div className="p2-hint-modal" onClick={e => e.stopPropagation()}>
            <div className="p2-hint-title">💡 Science Hint</div>

            <div className="p2-hint-block">
              <div className="p2-hint-q">What do you see just above the crystal?</div>
              <div className="p2-hint-a">A dense blue cloud — the dissolved copper sulphate ions are most concentrated nearest the crystal.</div>
            </div>

            <div className="p2-hint-block">
              <div className="p2-hint-q">What happens as time passes?</div>
              <div className="p2-hint-a">The blue colour spreads upward until the water is uniformly coloured — this is diffusion.</div>
            </div>

            <div className="p2-hint-block">
              <div className="p2-hint-q">What does this tell us about particles?</div>
              <div className="p2-hint-a">Solid and liquid particles are in constant random motion. The crystal slowly dissolves and its particles move into the water on their own — <em>without stirring</em>.</div>
            </div>

            <div className="p2-hint-block">
              <div className="p2-hint-q">Why is hot water faster?</div>
              <div className="p2-hint-a">
                <strong>Temperature = kinetic energy.</strong> Hotter particles move faster → collide more → spread out more quickly.
                <br/>Hot water takes ~20 s · Cold water takes ~60 s = <strong>3× slower</strong>.
              </div>
            </div>

            <button className="p2-hint-close" onClick={() => setShowHint(false)}>✕ Got it!</button>
          </div>
        </div>
      )}

      {/* ── In-scene observation prompts (shown when observing) ─────────────── */}
      {(snap.isObserving || snap.isPaused) && (
        <div className="p2-obs-prompt">
          <div className="p2-obs-icon">👁</div>
          <div className="p2-obs-text">
            {snap.hotProg < 0.15
              ? 'Watch for colour appearing just above the crystal…'
              : snap.hotProg < 0.60
              ? 'Notice how hot water colour spreads much faster!'
              : snap.hotProg >= 1 && snap.coldProg < 1
              ? '🔥 Hot glass fully mixed! Cold glass still spreading…'
              : 'Both glasses filling — compare the speeds!'}
          </div>
        </div>
      )}
    </>
  );
}

// ── Helper: state label string ─────────────────────────────────────────────────
function stateLabel(snap) {
  if (snap.isIdle)      return 'Ready';
  if (snap.isDropping)  return 'Dropping…';
  if (snap.isSettling)  return 'Settling…';
  if (snap.isObserving) return 'Observing';
  if (snap.isPaused)    return 'Paused';
  if (snap.isComplete)  return 'Complete ✓';
  return '';
}
