import './EnergyPanel.css';

const ENERGY_PER_WINDING = 0.012; // joules per winding (realistic toy scale)

function getPhaseLabel(phase, springPct, kineticPct) {
  if (phase === 'idle' || phase === 'winding') return { label: '⚙️ Energy Stored in Spring', cls: 'ep-stored' };
  if (phase === 'running') {
    if (kineticPct > springPct) return { label: '⚡ Converting → Kinetic Energy', cls: 'ep-converting' };
    return { label: '🚀 Kinetic Energy Dominant', cls: 'ep-kinetic' };
  }
  return { label: '🏁 Energy Dissipated by Friction', cls: 'ep-dissipated' };
}

export default function EnergyPanel({ windingCount, springPct, kineticPct, phase }) {
  const maxEnergy = 20 * ENERGY_PER_WINDING; // at 20 windings
  const springJ   = (springPct / 100) * maxEnergy;
  const kineticJ  = (kineticPct / 100) * maxEnergy;
  const { label, cls } = getPhaseLabel(phase, springPct, kineticPct);

  return (
    <div className="energy-panel">
      {/* Spring / Potential Energy */}
      <div className="exp-card">
        <div className="exp-card-title">Spring (Potential) Energy</div>
        <div className="energy-label-row">
          <span className="energy-name" style={{ color: 'var(--accent-purple)' }}>🌀 Stored</span>
          <span className="energy-value" style={{ color: 'var(--accent-purple)' }}>{springJ.toFixed(3)} J</span>
        </div>
        <div className="energy-bar-track">
          <div className="energy-bar-fill bar-spring" style={{ width: `${springPct}%` }} />
        </div>

        {/* Conversion arrow */}
        <div className="conversion-row">
          <div className="conversion-arrow" />
          <span>converts to</span>
          <div className="conversion-arrow" style={{ transform: 'scaleX(-1)' }} />
        </div>

        {/* Kinetic Energy */}
        <div className="energy-label-row" style={{ marginTop: 4 }}>
          <span className="energy-name" style={{ color: 'var(--accent-cyan)' }}>💨 Kinetic</span>
          <span className="energy-value" style={{ color: 'var(--accent-cyan)' }}>{kineticJ.toFixed(3)} J</span>
        </div>
        <div className="energy-bar-track">
          <div className="energy-bar-fill bar-kinetic" style={{ width: `${kineticPct}%` }} />
        </div>

        <div className={`energy-phase-label ${cls}`}>{label}</div>
      </div>

      {/* Formula */}
      <div className="exp-card">
        <div className="exp-card-title">Key Relationship</div>
        <div className="formula-box">
          <strong>E<sub>spring</sub></strong> = ½ · k · x²<br />
          More windings → more <strong>x</strong> → more <strong>E</strong><br />
          → car travels <strong>farther</strong>
        </div>
      </div>
    </div>
  );
}
