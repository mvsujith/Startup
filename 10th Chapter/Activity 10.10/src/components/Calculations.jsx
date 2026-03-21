import './Calculations.css';

const CM_PER_WINDING = 14;
const ENERGY_PER_WINDING = 0.012;

export default function Calculations({ windingCount, results }) {
  // If we are currently winding/idle, use current windingCount.
  // Otherwise, if we have results, you can use the latest result or just windingCount
  const w = windingCount;
  
  const distance = w * CM_PER_WINDING;
  const maxSpeed = w > 0 ? 8 + w * 2.6 : 0;
  const energy = w * ENERGY_PER_WINDING;

  return (
    <div className="calculations-panel">
      <div className="calc-card">
        <div className="calc-title">📏 Distance Formula</div>
        <div className="calc-formula highlight">
          Distance = Windings × {CM_PER_WINDING} cm
        </div>
        <div className="calc-note">
          Each full turn of the key unwinds to push the car {CM_PER_WINDING} centimeters.
        </div>
        <div className="calc-result">
          <div className="calc-result-label">Current ({w} windings):</div>
          <div className="calc-result-value">{distance.toFixed(1)} cm</div>
        </div>
      </div>

      <div className="calc-card">
        <div className="calc-title">⚡ Max Speed Formula</div>
        <div className="calc-formula highlight-speed">
          Speed = 8 + (Windings × 2.6) cm/s
        </div>
        <div className="calc-note">
          Base speed plus accelerating force from the spring tension.
        </div>
        <div className="calc-result">
          <div className="calc-result-label">Current ({w} windings):</div>
          <div className="calc-result-value">{maxSpeed.toFixed(1)} cm/s</div>
        </div>
      </div>

      <div className="calc-card">
        <div className="calc-title">🔋 Stored Energy</div>
        <div className="calc-formula highlight-energy">
          E = Windings × {ENERGY_PER_WINDING} Joules
        </div>
        <div className="calc-note">
          Energy scales linearly with the number of turns on this coil spring.
        </div>
        <div className="calc-result">
          <div className="calc-result-label">Current ({w} windings):</div>
          <div className="calc-result-value">{energy.toFixed(3)} J</div>
        </div>
      </div>
    </div>
  );
}
