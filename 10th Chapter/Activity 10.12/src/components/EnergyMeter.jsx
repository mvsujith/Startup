import "./EnergyMeter.css";

export default function EnergyMeter({ stretchAmount, kineticAmount, phase }) {
  const elasticPct = Math.round(stretchAmount * 100);
  const kineticPct = Math.round(kineticAmount * 100);

  const getLabel = () => {
    if (phase === "idle")        return "Rest — no stored energy";
    if (phase === "stretching")  return "⚡ Storing elastic potential energy…";
    if (phase === "observe")     return "🔒 Energy locked in stretched slinky";
    if (phase === "releasing")   return "🚀 Energy converting to motion!";
    if (phase === "oscillating") return "🔄 Kinetic ↔ Elastic cycling…";
    if (phase === "rest")        return "✅ Energy dissipated as heat & sound";
    return "";
  };

  const isConventing = phase === "releasing" || phase === "oscillating";

  return (
    <div className="energy-meter">
      <h3 className="em-title">⚡ Energy Meter</h3>

      <div className="em-bars-row">
        <div className="em-bar-group">
          <div className="em-bar-label">
            <span className="em-dot elastic" />
            Elastic PE
            <span className="em-pct" style={{ color: elasticPct > 60 ? "#f97316" : "#facc15" }}>{elasticPct}%</span>
          </div>
          <div className="em-track">
            <div
              className={`em-fill elastic-fill${elasticPct > 80 ? " pulsing" : ""}`}
              style={{ width: `${elasticPct}%` }}
            />
          </div>
        </div>

        {/* Conversion arrow */}
        <div className={`em-arrow${isConventing ? " active" : ""}`}>
          {isConventing ? "⇄" : "→"}
        </div>

        <div className="em-bar-group">
          <div className="em-bar-label">
            <span className="em-dot kinetic" />
            Kinetic KE
            <span className="em-pct" style={{ color: kineticPct > 60 ? "#38bdf8" : "#94a3b8" }}>{kineticPct}%</span>
          </div>
          <div className="em-track">
            <div
              className={`em-fill kinetic-fill${kineticPct > 60 ? " pulsing-blue" : ""}`}
              style={{ width: `${kineticPct}%` }}
            />
          </div>
        </div>
      </div>

      <div className="em-phase-label">{getLabel()}</div>

      {/* Conservation law note when converting */}
      {isConventing && (
        <div className="em-conservation">
          Law of Conservation of Energy: PE + KE = constant
        </div>
      )}

      <div className="em-legend">
        <div className="em-legend-item">
          <span className="em-dot elastic" /> Stored in spring
        </div>
        <div className="em-legend-item">
          <span className="em-dot kinetic" /> Movement energy
        </div>
      </div>
    </div>
  );
}
