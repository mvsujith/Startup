import "./TrialLog.css";

export default function TrialLog({ trials, onClear }) {
  return (
    <aside className="trial-panel">
      <div className="trial-header">
        <div className="trial-title-row">
          <span className="trial-title">📋 Trial Log</span>
          {trials.length > 0 && (
            <button className="trial-clear-btn" onClick={onClear} title="Clear all trials">
              🗑
            </button>
          )}
        </div>
        <p className="trial-subtitle">{trials.length} experiment{trials.length !== 1 ? "s" : ""} recorded</p>
      </div>

      <div className="trial-list">
        {trials.length === 0 && (
          <div className="trial-empty">
            <span className="trial-empty-icon">🧪</span>
            <p>Lift and release the object<br />to record a trial.</p>
          </div>
        )}

        {[...trials].reverse().map((t) => (
          <div className="trial-card" key={t.id} style={{ borderColor: hueToColor(t.peakHeight) }}>
            <div className="trial-card-header">
              <span className="trial-num">Trial #{t.id}</span>
              <span className="trial-time">{t.time}</span>
            </div>

            <div className="trial-stats">
              <Stat label="Height"    value={`${t.peakHeight.toFixed(1)} m`}  color="#ffa726" />
              <Stat label="PE stored" value={`${t.pe.toFixed(1)} J`}          color="#ef5350" />
              <Stat label="Work Done" value={`${t.work.toFixed(1)} J`}        color="#ab47bc" />
              <Stat label="Fall Dist" value={`${t.fallDist.toFixed(1)} m`}    color="#26c6da" />
            </div>

            {/* Mini energy bar */}
            <div className="trial-mini-bar-track">
              <div
                className="trial-mini-bar-fill"
                style={{
                  width: `${(t.peakHeight / 8) * 100}%`,
                  background: hueToColor(t.peakHeight),
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {trials.length > 1 && (
        <div className="trial-summary">
          <div className="trial-summary-title">📊 Best Trial</div>
          <div className="trial-summary-row">
            <span>Max Height</span>
            <strong>{Math.max(...trials.map(t => t.peakHeight)).toFixed(1)} m</strong>
          </div>
          <div className="trial-summary-row">
            <span>Max PE</span>
            <strong>{Math.max(...trials.map(t => t.pe)).toFixed(1)} J</strong>
          </div>
          <div className="trial-summary-row">
            <span>Total Trials</span>
            <strong>{trials.length}</strong>
          </div>
        </div>
      )}
    </aside>
  );
}

function Stat({ label, value, color }) {
  return (
    <div className="trial-stat">
      <span className="trial-stat-label">{label}</span>
      <span className="trial-stat-value" style={{ color }}>{value}</span>
    </div>
  );
}

/** Returns a CSS color string based on peakHeight (0–8 m) */
function hueToColor(h) {
  const pct = Math.min(h / 8, 1);
  const hue = Math.round(120 - pct * 120); // green → red
  return `hsl(${hue}, 80%, 55%)`;
}
