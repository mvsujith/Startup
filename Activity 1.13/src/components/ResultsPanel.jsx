/**
 * ResultsPanel.jsx — Phase 3 Results & Explanation Screen
 *
 * Shows after the quiz:
 *   • Star rating (1–3) based on quiz score
 *   • Achievement badge
 *   • Experiment stats (elapsed time, crystals deposited)
 *   • Final scientific explanation of sublimation
 *   • Try Again / New Experiment buttons
 */

import { useEffect, useRef } from 'react';
import './ResultsPanel.css';

// ── Badge config by score ────────────────────────────────────────────────────
const BADGES = {
  3: { label: 'Science Star!',     emoji: '🏆', color: '#fcd34d', bg: 'rgba(252,211,77,0.12)'  },
  2: { label: 'Lab Explorer!',     emoji: '🔬', color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
  1: { label: 'Curious Learner!',  emoji: '🌱', color: '#4ade80', bg: 'rgba(74,222,128,0.12)'  },
  0: { label: 'Keep Trying!',      emoji: '💪', color: '#fb923c', bg: 'rgba(251,146,60,0.12)'  },
};

function formatTime(s) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

// ── Stars component ──────────────────────────────────────────────────────────
function Stars({ score }) {
  return (
    <div className="stars-row" aria-label={`${score} out of 3 stars`}>
      {[1, 2, 3].map(i => (
        <span
          key={i}
          className={`star ${i <= score ? 'star--lit' : 'star--dim'}`}
          style={{ animationDelay: `${(i - 1) * 0.18}s` }}
        >
          ★
        </span>
      ))}
    </div>
  );
}

// ── Component ────────────────────────────────────────────────────────────────
export default function ResultsPanel({ score, elapsed, crystalsN, onReplay, onNewMode }) {
  const badge    = BADGES[score] ?? BADGES[0];
  const panelRef = useRef(null);

  useEffect(() => {
    panelRef.current?.classList.add('results-panel--in');
  }, []);

  return (
    <div className="results-backdrop">
      <div className="results-panel" ref={panelRef}>

        {/* ── Score section ── */}
        <div className="results-score-section">
          <div className="results-badge" style={{ background: badge.bg, borderColor: badge.color + '44' }}>
            <span className="results-badge-emoji">{badge.emoji}</span>
            <span className="results-badge-label" style={{ color: badge.color }}>{badge.label}</span>
          </div>

          <Stars score={score} />

          <p className="results-score-text">
            You answered <strong>{score} out of 3</strong> questions correctly!
          </p>
        </div>

        {/* ── Experiment stats ── */}
        <div className="results-stats">
          <div className="results-stat">
            <span className="results-stat-icon">⏱️</span>
            <span className="results-stat-value">{formatTime(elapsed)}</span>
            <span className="results-stat-label">Time Elapsed</span>
          </div>
          <div className="results-stat">
            <span className="results-stat-icon">❄️</span>
            <span className="results-stat-value">{crystalsN}</span>
            <span className="results-stat-label">Crystals Deposited</span>
          </div>
          <div className="results-stat">
            <span className="results-stat-icon">📊</span>
            <span className="results-stat-value">100%</span>
            <span className="results-stat-label">Sublimation Progress</span>
          </div>
        </div>

        {/* ── Scientific explanation ── */}
        <div className="results-explanation">
          <h3 className="results-exp-title">🔬 What Did We Learn?</h3>

          <div className="results-exp-block">
            <h4>What is Sublimation?</h4>
            <p>
              Sublimation is the process by which a substance converts directly from its
              <strong> solid state to the gaseous (vapour) state</strong>, without passing
              through the liquid state. Camphor is one of the most common examples of sublimation.
            </p>
          </div>

          <div className="results-exp-block">
            <h4>What happened in this experiment?</h4>
            <ol className="results-exp-list">
              <li>Camphor (solid) was placed in a china dish and gently heated.</li>
              <li>On heating, camphor changed directly into vapour — <em>no liquid was observed</em>.</li>
              <li>Vapour rose into the inverted funnel and reached the cooler upper walls.</li>
              <li>On the cooler surface, the vapour re-solidified (deposition) forming white camphor crystals on the funnel walls.</li>
              <li>The cotton plug prevented crystals from escaping while allowing air flow.</li>
            </ol>
          </div>

          <div className="results-exp-block results-exp-block--highlight">
            <h4>🧠 The Inference</h4>
            <p>
              Camphor undergoes <strong>sublimation</strong>. It changes from solid directly to vapour
              on heating, and the vapour re-solidifies on a cooler surface. This is why camphor
              can be used as a purification method — impurities are left behind as only the
              sublimable substance travels through the funnel.
            </p>
          </div>

          <div className="results-formula">
            <span className="results-formula-pill">Solid Camphor</span>
            <span className="results-formula-arrow">→<small>heat</small>→</span>
            <span className="results-formula-pill results-formula-pill--vapour">Camphor Vapour</span>
            <span className="results-formula-arrow">→<small>cool</small>→</span>
            <span className="results-formula-pill results-formula-pill--crystal">Pure Crystals</span>
          </div>
        </div>

        {/* ── Actions ── */}
        <div className="results-actions">
          <button id="btn-replay" className="results-btn results-btn--replay" onClick={onReplay}>
            ↺ Replay Experiment
          </button>
          <button id="btn-new-mode" className="results-btn results-btn--new" onClick={onNewMode}>
            🔬 Try Free Explore
          </button>
        </div>

      </div>
    </div>
  );
}
