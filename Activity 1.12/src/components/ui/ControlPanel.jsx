import { useLabStore } from '../../store/useLabStore';
import { exportDataToCSV, formatTemperature, formatMass, getPhaseDisplayName } from '../../utils/dataExport';
import { TemperatureGraph } from './TemperatureGraph';
import './LabUI.css';

export function ControlPanel() {
    const {
        temperature,
        iceMass,
        waterMass,
        phase,
        hasBurner,
        hasThermometer,
        burnerOn,
        burnerPower,
        dataLog,
        observations,
        toggleBurner,
        setBurnerPower,
        reset,
    } = useLabStore();

    const handleExport = () => {
        exportDataToCSV(dataLog);
    };

    return (
        <div className="control-panel">
            {/* Temperature Display */}
            <div className="panel-section">
                <div className="temp-display">
                    <div className="temp-value">
                        {hasThermometer ? formatTemperature(temperature) : '--'}
                    </div>
                    <div className="phase-indicator">
                        Phase: {hasThermometer ? getPhaseDisplayName(phase) : '--'}
                    </div>
                </div>

                <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.7)', lineHeight: '1.6' }}>
                    <div>Ice: {hasThermometer ? formatMass(iceMass) : '--'}</div>
                    <div>Water: {hasThermometer ? formatMass(waterMass) : '--'}</div>
                </div>
            </div>

            {/* Burner Controls */}
            <div className="panel-section">
                <div className="panel-title">Burner Controls</div>
                <div className="burner-controls">
                    <div className="control-row">
                        <span className="control-label">Status:</span>
                        <button
                            className={`toggle-button ${burnerOn ? 'active' : ''}`}
                            onClick={hasBurner ? toggleBurner : undefined}
                            disabled={!hasBurner}
                            title={!hasBurner ? 'Place the burner to enable' : ''}
                        >
                            {burnerOn ? '🔥 ON' : '⚫ OFF'}
                        </button>
                    </div>

                    <div>
                        <div className="control-row">
                            <span className="control-label">Power:</span>
                            <span className="control-label">{burnerPower}W</span>
                        </div>
                        <input
                            type="range"
                            min="500"
                            max="2000"
                            step="100"
                            value={burnerPower}
                            onChange={(e) => setBurnerPower(Number(e.target.value))}
                            className="slider-input"
                            disabled={!hasBurner}
                        />
                    </div>
                </div>
            </div>

            {/* Temperature Graph */}
            <div className="panel-section">
                <div className="panel-title">Temperature vs Time</div>
                <TemperatureGraph dataLog={dataLog} />
            </div>

            {/* Observations Log */}
            <div className="panel-section">
                <div className="panel-title">Observations</div>
                <div className="observation-log">
                    {observations.length === 0 ? (
                        <div style={{ color: 'rgba(255, 255, 255, 0.5)', textAlign: 'center', padding: '20px 0' }}>
                            No observations yet
                        </div>
                    ) : (
                        observations.map((obs, idx) => (
                            <div key={idx} className="observation-item">
                                <span className="observation-time">[{obs.time}]</span>
                                {obs.text}
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Export & Reset */}
            <div className="panel-section">
                <button
                    className="export-button"
                    onClick={handleExport}
                    disabled={dataLog.length === 0}
                    style={{ opacity: dataLog.length === 0 ? 0.5 : 1, marginBottom: '12px' }}
                >
                    📊 Export Data (CSV)
                </button>

                <button
                    className="export-button"
                    onClick={reset}
                    style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}
                >
                    🔄 Reset Experiment
                </button>
            </div>
        </div>
    );
}
