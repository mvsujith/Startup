import React from 'react';

export default function EnergyHUD({ pe, ke }) {
  const pePercent = Math.min(100, (pe || 0) * 100);
  const kePercent = Math.min(100, (ke || 0) * 100);

  return (
    <div className="energy-hud">
      <div className="energy-meters">
        <div className="meter-group">
          <div className="meter-label">
            <span>Potential Energy (Stored)</span>
            <span className="percentage">{Math.round(pePercent)}%</span>
          </div>
          <div className="meter-bar">
            <div className="fill pe" style={{ width: `${pePercent}%` }} />
          </div>
        </div>

        <div className="meter-group">
          <div className="meter-label">
            <span>Kinetic Energy (Motion)</span>
            <span className="percentage">{Math.round(kePercent)}%</span>
          </div>
          <div className="meter-bar">
            <div className="fill ke" style={{ width: `${kePercent}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}
