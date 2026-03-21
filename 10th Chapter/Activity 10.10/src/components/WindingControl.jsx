import { useState, useEffect, useRef } from 'react';
import './WindingControl.css';

const WINDING_PRESETS = [5, 10, 15, 20];
const MAX_WINDINGS = 20;

export default function WindingControl({
  windingCount,
  phase,
  onSetWindings,
  onRelease,
  onReset,
  trialsDone,
}) {
  const [spinning, setSpinning] = useState(false);
  const prevCount = useRef(windingCount);

  const isRunning = phase === 'running';
  const isDone    = phase === 'done';
  const canRelease = windingCount > 0 && !isRunning && !isDone;
  const canWind    = !isRunning && !isDone;
  const currentTrial = (trialsDone % 3) + 1;

  // Spin the key icon when winding increases
  useEffect(() => {
    if (windingCount > prevCount.current) {
      setSpinning(true);
      const t = setTimeout(() => setSpinning(false), 350);
      prevCount.current = windingCount;
      return () => clearTimeout(t);
    }
    prevCount.current = windingCount;
  }, [windingCount]);

  const fillPct = Math.round((windingCount / MAX_WINDINGS) * 100);

  const handleIncrement = () => {
    if (windingCount < MAX_WINDINGS && canWind) onSetWindings(windingCount + 1);
  };
  const handleDecrement = () => {
    if (windingCount > 0 && canWind) onSetWindings(windingCount - 1);
  };

  return (
    <div className="winding-section">
      {/* Key display */}
      <div className="key-display">
        <div
          className={`key-icon-wrap ${windingCount > 0 ? 'is-winding' : ''}`}
          style={{ '--fill': `${fillPct}%` }}
        >
          <span className={spinning ? 'key-spinning' : ''} style={{ display: 'inline-block' }}>🔑</span>
        </div>
        <div className="key-count-label">
          Spring Energy: <span className="key-count-value">{fillPct}%</span>
        </div>
      </div>

      {/* Preset winding buttons */}
      <div style={{ padding: '0 10px 4px', fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        Quick Set
      </div>
      <div className="winding-grid">
        {WINDING_PRESETS.map(n => (
          <button
            key={n}
            className={`winding-step-btn ${windingCount === n ? 'active' : ''}`}
            onClick={() => canWind && onSetWindings(n)}
            disabled={!canWind}
          >
            {n}×
          </button>
        ))}
      </div>

      {/* Manual +/- */}
      <div className="winding-manual">
        <button className="wind-btn" onClick={handleDecrement} disabled={!canWind || windingCount === 0}>−</button>
        <div>
          <div className="winding-count-big">{windingCount}</div>
          <div className="winding-label-sub">windings</div>
        </div>
        <button className="wind-btn" onClick={handleIncrement} disabled={!canWind || windingCount >= MAX_WINDINGS}>+</button>
      </div>

      {/* Trial dots */}
      <div className="trial-info">
        <span className="trial-label">Trial {currentTrial} / 3</span>
        <div className="trial-dots">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className={`trial-dot ${i < trialsDone % 3 ? 'done' : i === trialsDone % 3 && isRunning ? 'active' : ''}`}
            />
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div className="action-btns">
        <button className="btn-release" onClick={onRelease} disabled={!canRelease}>
          {isRunning ? '🚗 Running…' : '▶ Release!'}
        </button>
        <button className="btn-reset" onClick={onReset} disabled={isRunning}>
          ↺
        </button>
      </div>
    </div>
  );
}
