/**
 * ControlPanel.jsx
 *
 * Full experiment control UI — Add Ink, Add Honey, Start, Pause,
 * Reset, Compare, Show Hint — plus live progress bars and a
 * simulated-time clock.
 */

import { useState } from 'react';
import './ControlPanel.css';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Format seconds as  h:mm:ss  or  m:ss */
function fmtTime(totalSeconds) {
  const s = Math.floor(totalSeconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) {
    return `${h}h ${String(m).padStart(2, '0')}m ${String(sec).padStart(2, '0')}s`;
  }
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

/** Estimated total real-world spread time for display. */
const REAL_WORLD = {
  ink  : '~2 hours (real world)',
  honey: '~48 hours (real world)',
};

// ── ProgressBar ───────────────────────────────────────────────────────────────
function ProgressBar({ value, color, label, sublabel }) {
  const pct = Math.round(value * 100);
  return (
    <div className="progress-row">
      <div className="progress-meta">
        <span className="progress-label" style={{ color }}>
          {label}
        </span>
        <span className="progress-pct" style={{ color }}>{pct}%</span>
      </div>
      <div className="progress-track">
        <div
          className="progress-fill"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      {sublabel && <p className="progress-sub">{sublabel}</p>}
    </div>
  );
}

// ── HintOverlay ───────────────────────────────────────────────────────────────
function HintOverlay({ onClose }) {
  return (
    <div className="hint-overlay" role="dialog" aria-modal="true">
      <div className="hint-card">
        <button className="hint-close" onClick={onClose} aria-label="Close hint">✕</button>
        <div className="hint-icon">💡</div>
        <h3 className="hint-title">Why do they spread differently?</h3>
        <div className="hint-body">
          <div className="hint-item hint-item--blue">
            <strong>🔵 Ink (low viscosity)</strong>
            <p>Ink molecules are tiny and light. They zip around in the water quickly through <em>Brownian motion</em> — random collisions with water molecules push them far and fast.</p>
            <p className="hint-time">Spreads evenly in <strong>~2 hours</strong></p>
          </div>
          <div className="hint-item hint-item--amber">
            <strong>🍯 Honey (high viscosity)</strong>
            <p>Honey is thick — sugar molecules are large and sticky. They resist random collisions and move very slowly. It stays concentrated much longer.</p>
            <p className="hint-time">Spreads evenly in <strong>~24–48 hours</strong></p>
          </div>
          <div className="hint-science">
            <strong>🔬 The Science</strong>
            <p>This is called <em>molecular diffusion</em> — substances move from regions of high concentration to low concentration. The rate depends on the substance's <em>diffusion coefficient D</em>.</p>
            <code>D(ink) ≈ 14 × D(honey)</code>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── ComparePanel ──────────────────────────────────────────────────────────────
function ComparePanel({ inkProgress, honeyProgress, elapsed }) {
  const inkSpeedRelative = inkProgress > 0 && honeyProgress > 0
    ? (inkProgress / Math.max(honeyProgress, 0.001)).toFixed(1)
    : '—';

  return (
    <div className="compare-panel">
      <h4 className="compare-title">⊞ Side-by-Side Comparison</h4>
      <div className="compare-cols">
        {/* Ink column */}
        <div className="compare-col compare-col--blue">
          <div className="compare-vial">
            <div
              className="compare-fill"
              style={{
                height  : `${Math.round(inkProgress * 100)}%`,
                background: `rgba(29, 78, 216, ${0.3 + inkProgress * 0.6})`,
              }}
            />
          </div>
          <span className="compare-name">Ink</span>
          <span className="compare-value">{Math.round(inkProgress * 100)}%</span>
          <span className="compare-real">{REAL_WORLD.ink}</span>
        </div>

        {/* Divider */}
        <div className="compare-divider">
          {inkSpeedRelative !== '—' && (
            <div className="compare-badge">
              Ink is <strong>{inkSpeedRelative}×</strong> faster
            </div>
          )}
        </div>

        {/* Honey column */}
        <div className="compare-col compare-col--amber">
          <div className="compare-vial">
            <div
              className="compare-fill"
              style={{
                height  : `${Math.round(honeyProgress * 100)}%`,
                background: `rgba(217, 119, 6, ${0.3 + honeyProgress * 0.6})`,
              }}
            />
          </div>
          <span className="compare-name">Honey</span>
          <span className="compare-value">{Math.round(honeyProgress * 100)}%</span>
          <span className="compare-real">{REAL_WORLD.honey}</span>
        </div>
      </div>
    </div>
  );
}

// ── ControlPanel (main export) ────────────────────────────────────────────────
export default function ControlPanel({
  // State flags passed from App
  inkAdded,
  honeyAdded,
  isRunning,
  inkProgress,
  honeyProgress,
  elapsed,
  compareMode,
  // Callbacks
  onAddInk,
  onAddHoney,
  onStart,
  onPause,
  onReset,
  onToggleCompare,
}) {
  const [showHint, setShowHint] = useState(false);

  const anyDropped = inkAdded || honeyAdded;
  const allComplete = inkProgress >= 1 && honeyProgress >= 1 && anyDropped;

  return (
    <>
      {/* ── Hint overlay (modal) ────────────────────────────────────────── */}
      {showHint && <HintOverlay onClose={() => setShowHint(false)} />}

      {/* ── Compare panel (above control strip) ─────────────────────────── */}
      {compareMode && (
        <ComparePanel
          inkProgress={inkProgress}
          honeyProgress={honeyProgress}
          elapsed={elapsed}
        />
      )}

      {/* ── Main control strip ──────────────────────────────────────────── */}
      <div className="ctrl-panel" role="region" aria-label="Experiment Controls">

        {/* Row 1 — drop buttons */}
        <div className="ctrl-row ctrl-row--drops">
          <button
            id="btn-add-ink"
            className={`ctrl-btn ctrl-btn--ink ${inkAdded ? 'ctrl-btn--done' : ''}`}
            onClick={onAddInk}
            disabled={inkAdded}
            title="Add a drop of ink into Beaker 1"
          >
            {inkAdded ? '🔵 Ink Added ✓' : '🔵 Add Ink'}
          </button>

          <button
            id="btn-add-honey"
            className={`ctrl-btn ctrl-btn--honey ${honeyAdded ? 'ctrl-btn--done' : ''}`}
            onClick={onAddHoney}
            disabled={honeyAdded}
            title="Add a drop of honey into Beaker 2"
          >
            {honeyAdded ? '🍯 Honey Added ✓' : '🍯 Add Honey'}
          </button>
        </div>

        {/* Row 2 — simulation controls */}
        <div className="ctrl-row ctrl-row--controls">
          <button
            id="btn-start"
            className="ctrl-btn ctrl-btn--start"
            onClick={onStart}
            disabled={isRunning || !anyDropped}
            title="Begin the diffusion observation"
          >
            ▶ {allComplete ? 'Complete!' : 'Start Observation'}
          </button>

          <button
            id="btn-pause"
            className="ctrl-btn ctrl-btn--pause"
            onClick={onPause}
            disabled={!isRunning}
            title="Pause the simulation"
          >
            ⏸ Pause
          </button>

          <button
            id="btn-reset"
            className="ctrl-btn ctrl-btn--reset"
            onClick={onReset}
            title="Reset the experiment"
          >
            ↺ Reset
          </button>
        </div>

        {/* Row 3 — time display + extra tools */}
        <div className="ctrl-row ctrl-row--info">
          {/* Simulated clock */}
          <div className="ctrl-clock" title="Simulated elapsed time">
            <span className="clock-label">⏱ Sim time</span>
            <span className="clock-value">{fmtTime(elapsed)}</span>
          </div>

          {/* Progress bars — only shown after drops added */}
          {anyDropped && (
            <div className="ctrl-progress">
              {inkAdded && (
                <ProgressBar
                  value={inkProgress}
                  color="#60a5fa"
                  label="Ink spread"
                  sublabel={inkProgress >= 1 ? '✅ Fully diffused!' : null}
                />
              )}
              {honeyAdded && (
                <ProgressBar
                  value={honeyProgress}
                  color="#f59e0b"
                  label="Honey spread"
                  sublabel={honeyProgress >= 1 ? '✅ Fully diffused!' : null}
                />
              )}
            </div>
          )}

          {/* Extra tools */}
          <div className="ctrl-tools">
            <button
              id="btn-compare"
              className={`ctrl-btn ctrl-btn--compare ${compareMode ? 'ctrl-btn--active' : ''}`}
              onClick={onToggleCompare}
              title="Toggle side-by-side comparison"
            >
              ⊞ Compare
            </button>
            <button
              id="btn-hint"
              className="ctrl-btn ctrl-btn--hint"
              onClick={() => setShowHint(true)}
              title="Learn why ink and honey spread differently"
            >
              💡 Hint
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
