import "./EnergyMeter.css";

/**
 * EnergyMeter — Visual energy bar that fills proportional to PE = mgh
 */
export default function EnergyMeter({ height, maxHeight, mass = 1, g = 9.8 }) {
  const pe = mass * g * height;
  const maxPe = mass * g * maxHeight;
  const pct = maxHeight > 0 ? (height / maxHeight) * 100 : 0;

  // Color interpolation: green → yellow → red based on fill
  const hue = Math.round(120 - pct * 1.1); // 120=green → 0=red

  return (
    <div className="energy-meter">
      <div className="meter-header">
        <span className="meter-title">⚡ Potential Energy</span>
        <span className="meter-value" style={{ color: `hsl(${hue},90%,60%)` }}>
          {pe.toFixed(1)} J
        </span>
      </div>
      <div className="meter-track">
        <div
          className="meter-fill"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, hsl(${hue + 20},85%,50%), hsl(${hue},90%,60%))`,
            boxShadow: pct > 5 ? `0 0 10px hsl(${hue},90%,60%)` : "none",
          }}
        />
      </div>
      <div className="meter-labels">
        <span>0 J</span>
        <span>{(maxPe / 2).toFixed(0)} J</span>
        <span>{maxPe.toFixed(0)} J</span>
      </div>
    </div>
  );
}
