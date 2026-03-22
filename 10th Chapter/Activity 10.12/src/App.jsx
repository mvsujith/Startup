import { useState, useCallback, useEffect } from 'react';
import EnergyLabScene from './components/EnergyLabScene';
import './App.css';

function App() {
  const [gameState, setGameState] = useState('IDLE');
  const [stretch, setStretch] = useState(0); 
  const [speed, setSpeed] = useState(0);
  const [distance, setDistance] = useState(0);
  const [accuracy, setAccuracy] = useState(null); // Distance from bullseye
  const [labels, setLabels] = useState(null);
  
  const [gameMode, setGameMode] = useState('GUIDED'); // GUIDED, CHALLENGE_1, CHALLENGE_2, FREEPLAY
  const [guidedStep, setGuidedStep] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [showConcepts, setShowConcepts] = useState(false);
  const [scoreInfo, setScoreInfo] = useState({ stars: 0, message: '' });
  const [lastShotStretch, setLastShotStretch] = useState(0);

  // Live evaluated stretch that respects flying state locks
  const displayStretch = (lastShotStretch > stretch && stretch === 0) ? lastShotStretch : stretch;
  const livePE = Math.round(displayStretch * displayStretch * 100);


  // Update HUD
  const handleUpdateStats = useCallback((newStretch, newSpeed, newDistance, newAccuracy = null) => {
    if (newStretch !== null) {
      setStretch(newStretch);
      if (newStretch > 0) setLastShotStretch(newStretch);
    }
    if (newSpeed !== null) setSpeed(newSpeed);
    if (newDistance !== null) setDistance(newDistance);
    if (newAccuracy !== null) setAccuracy(newAccuracy);
  }, []);

  const handleUpdateLabels = useCallback((newLabels) => {
    setLabels(newLabels);
  }, []);

  // Handle Game Logic when shot finishes
  useEffect(() => {
    if (gameState === 'FINISHED') {
      let stars = 0;
      let msg = '';
      
      const energy = Math.round(lastShotStretch * lastShotStretch * 100);

      if (gameMode === 'CHALLENGE_1') {
        if (Math.abs(energy - 50) <= 5) { stars = 3; msg = 'Perfect! You stored exactly 50 Joules of energy.'; }
        else if (Math.abs(energy - 50) <= 15) { stars = 2; msg = 'Close! Try to get exactly 50 Joules next time.'; }
        else { stars = 1; msg = 'You shot it, but you need closer to 50 Joules for 3 stars.'; }
      } else if (gameMode === 'CHALLENGE_2') {
        const hitDist = accuracy !== null ? accuracy : 999;
        
        if (hitDist <= 15) { stars = 3; msg = 'Bullseye! You hit the exact center of the target!'; }
        else if (hitDist <= 45) { stars = 2; msg = 'Great shot! You hit the middle rings of the target.'; }
        else if (hitDist <= 70) { stars = 1; msg = 'You hit the outer ring of the target. Try to aim better!'; }
        else { stars = 0; msg = 'Missed! The arrow landed off-target. Try adjusting your power or aim.'; }
      } else {
        // FREEPLAY scoring based on hit
        const hitDist = accuracy !== null ? accuracy : 999;
        if (hitDist <= 70) {
          stars = hitDist <= 20 ? 3 : 2;
          msg = `Nice shot! You hit the target! Hit distance: ${Math.round(hitDist)} units.`;
        } else {
          stars = 1;
          msg = `Shot complete. You missed the target, but your arrow flew ${Math.round(distance)} meters!`;
        }
      }

      setScoreInfo({ stars, message: msg });
      
      // Delay results popup
      setTimeout(() => setShowResults(true), 1200);
    }
  }, [gameState, gameMode, stretch, distance]);

  // Hook for guided step tracking
  useEffect(() => {
    if (gameMode === 'GUIDED') {
      if (gameState === 'STRETCHING' && stretch > 0.3 && guidedStep === 0) {
        setGuidedStep(1);
      }
      if (gameState === 'FLYING' && guidedStep === 1) {
        setGuidedStep(2);
      }
      if (gameState === 'FINISHED' && guidedStep === 2) {
        setGuidedStep(3);
      }
    }
  }, [stretch, gameState, gameMode, guidedStep]);

  const handleReset = () => {
    setShowResults(false);
    setGameState('RESETTING'); 
    setAccuracy(null);
    setTimeout(() => {
      setGameState('IDLE');
      setStretch(0);
      setSpeed(0);
      setDistance(0);
      if (gameMode === 'GUIDED' && guidedStep === 3) setGuidedStep(0);
    }, 100);
  };

  const setMode = (m) => {
    setGameMode(m);
    setGuidedStep(0);
    handleReset();
  };

  // Educational Tooltips helper
  const Tooltip = ({ lbl, text, offset = {x:0, y:0} }) => {
    if (!labels || !labels[lbl]) return null;
    return (
      <div style={{
        position: 'absolute', left: labels[lbl].left, top: labels[lbl].top,
        transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
        background: 'rgba(15, 23, 42, 0.9)', color: '#fff', padding: '5px 10px',
        borderRadius: 6, fontSize: '0.8rem', fontWeight: 600, pointerEvents: 'none',
        border: '1px solid rgba(255,255,255,0.2)', whiteSpace: 'nowrap',
        boxShadow: '0 4px 12px rgba(0,0,0,0.4)', transition: 'top 0.1s, left 0.1s', zIndex: 5
      }}>
        {text}
      </div>
    );
  };

  return (
    <div className="app-container" style={{ width: '100vw', height: '100vh', margin: 0, padding: 0, overflow: 'hidden', position: 'relative' }}>
      
      {/* 3D Scene Layer */}
      <EnergyLabScene 
        gameState={gameState} 
        setGameState={setGameState} 
        stretch={stretch}
        setStretch={setStretch}
        onUpdateStats={handleUpdateStats} 
        onUpdateLabels={handleUpdateLabels}
      />

      {/* 3D World Space Labels */}
      {(gameMode === 'GUIDED' || gameMode === 'FREEPLAY') && (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 4 }}>
          <Tooltip lbl="bow" text="Elastic Bow" offset={{ x: -60, y: -40 }} />
          <Tooltip lbl="string" text="Bowstring" offset={{ x: 60, y: 0 }} />
          <Tooltip lbl="arrow" text="Arrow (Projectile)" offset={{ x: -25, y: -30 }} />
          <Tooltip lbl="target" text="Target Board" offset={{ x: 0, y: -80 }} />
        </div>
      )}

      {/* Guided Tour Overlay */}
      {gameMode === 'GUIDED' && (
        <div className="guided-overlay">
          <h3>Guided Learning</h3>
          <p>
            {guidedStep === 0 && "Welcome! Click and drag backwards anywhere to pull the bowstring."}
            {guidedStep === 1 && "Great! Notice how the Kinetic Energy turns into Potential Energy. Let go to shoot!"}
            {guidedStep === 2 && "The stored Potential Energy is instantly converted into Kinetic Energy!"}
            {guidedStep === 3 && "Awesome shot! The energy transferred from the bow launched the arrow."}
          </p>
          {guidedStep === 3 && <button onClick={() => setMode('CHALLENGE_1')}>Start Challenges</button>}
        </div>
      )}

      {/* Results Modal */}
      {showResults && (
        <div className="results-modal-backdrop">
          <div className="results-modal">
            <h2>{scoreInfo.stars >= 2 ? 'Mission Success!' : 'Shot Complete'}</h2>
            <div className="stars">
              {[1, 2, 3].map(i => (
                <span key={i} style={{ color: i <= scoreInfo.stars ? '#fbbf24' : '#475569', fontSize: '3rem' }}>★</span>
              ))}
            </div>
            <p className="results-msg">{scoreInfo.message}</p>
            
            <div className="stats-box">
              <div className="stat"><span>Stored Potential Energy (PE):</span> <strong>{Math.round(lastShotStretch * lastShotStretch * 100)} J</strong></div>
              <div className="stat"><span>Release Velocity (v):</span> <strong>{Math.round(speed)} m/s</strong></div>
              <div className="stat"><span>Distance Flown (d):</span> <strong>{Math.round(distance)} m</strong></div>
            </div>

            <button className="results-btn" onClick={handleReset}>Try Again</button>
            {scoreInfo.stars >= 2 && gameMode === 'CHALLENGE_1' && (
               <button className="results-btn next-btn" onClick={() => setMode('CHALLENGE_2')}>Next Challenge</button>
            )}
            {scoreInfo.stars >= 2 && gameMode === 'CHALLENGE_2' && (
               <button className="results-btn next-btn" onClick={() => setMode('FREEPLAY')}>Enter Sandbox Mode</button>
            )}
          </div>
        </div>
      )}

      {/* Energy Concepts Summary Modal */}
      {showConcepts && (
        <div className="results-modal-backdrop" style={{ zIndex: 60 }}>
          <div className="results-modal" style={{ width: '480px' }}>
            <h2 style={{ color: '#38bdf8' }}>How it Works</h2>
            <div style={{ textAlign: 'left', marginTop: 20 }}>
              <p style={{ marginBottom: 15, color: '#e2e8f0', fontSize: '0.95rem', lineHeight: 1.6 }}>👉 <strong>Potential Energy:</strong> Bending the elastic bow stores energy. The more you pull the bowstring back, the more potential energy gets stored.</p>
              <p style={{ marginBottom: 15, color: '#e2e8f0', fontSize: '0.95rem', lineHeight: 1.6 }}>👉 <strong>Kinetic Energy:</strong> Releasing the string instantly converts that stored potential energy into kinetic energy (motion).</p>
              <p style={{ marginBottom: 15, color: '#e2e8f0', fontSize: '0.95rem', lineHeight: 1.6 }}>👉 <strong>Transfer:</strong> The moving string transfers its kinetic energy into the arrow, launching it forward.</p>
              <p style={{ color: '#e2e8f0', fontSize: '0.95rem', lineHeight: 1.6 }}>👉 <strong>Conclusion:</strong> A greater bend means more stored energy, which results in a much faster and farther arrow flight!</p>
            </div>
            <button className="results-btn next-btn" style={{ marginTop: 25 }} onClick={() => setShowConcepts(false)}>Got It!</button>
          </div>
        </div>
      )}

      {/* Main HUD Panel */}
      <div className="dashboard-panel">
        <h2 style={{ margin: '0 0 15px 0', fontSize: '1.4rem', color: '#38bdf8' }}>Archery Physics</h2>
        
        {/* Mode Selector */}
        <div className="mode-tabs">
          <button className={gameMode === 'GUIDED' ? 'active' : ''} onClick={() => setMode('GUIDED')}>Tour</button>
          <button className={gameMode === 'CHALLENGE_1' ? 'active' : ''} onClick={() => setMode('CHALLENGE_1')}>Ch 1</button>
          <button className={gameMode === 'CHALLENGE_2' ? 'active' : ''} onClick={() => setMode('CHALLENGE_2')}>Ch 2</button>
          <button className={gameMode === 'FREEPLAY' ? 'active' : ''} onClick={() => setMode('FREEPLAY')}>Sandbox</button>
        </div>

        {/* Objective */}
        <div className="objective-box">
          <div className="label">Current Objective</div>
          <div className="text">
            {gameMode === 'GUIDED' && 'Follow the guided tour instructions.'}
            {gameMode === 'CHALLENGE_1' && 'Store exactly 50 Joules of Potential Energy and release.'}
            {gameMode === 'CHALLENGE_2' && 'Hit the exact center of the target board.'}
            {gameMode === 'FREEPLAY' && 'Shoot arrows freely and observe the energy conversions.'}
          </div>
        </div>

        {/* Live Stats */}
        <div className="live-stats-grid">
          <div>
            <div className="label">Bend Amount</div>
            <div className="val">{Math.round(displayStretch * 100)}%</div>
          </div>
          <div>
            <div className="label">Potential Energy</div>
            <div className="val highlight">{livePE} J</div>
          </div>
          <div>
            <div className="label">Arrow Velocity</div>
            <div className="val">{Math.round(speed)} m/s</div>
          </div>
          <div>
            <div className="label">Flight Distance</div>
            <div className="val">{Math.round(distance)} m</div>
          </div>
        </div>

        {/* Deep Physics Live Calculations (Moved to Hero panel) */}
        <div style={{ background: 'rgba(0,0,0,0.5)', padding: 15, borderRadius: 8, fontSize: '0.85rem', textAlign: 'left', color: '#94a3b8', marginTop: 15 }}>
          <div style={{ color: '#38bdf8', marginBottom: 10, fontWeight: 'bold', fontSize: '0.95rem' }}>Deep Math Breakdown</div>
          <div style={{ marginBottom: 2 }}>• <strong>Constant (k):</strong> 200 N/m</div>
          <div style={{ marginBottom: 2 }}>• <strong>Mass (m):</strong> 0.0006 kg</div>
          <div style={{ marginBottom: 10 }}>• <strong>Stretch (x):</strong> {Math.round(displayStretch * 100) / 100} m</div>
          
          <div style={{ marginBottom: 4, fontFamily: 'monospace', color: '#facc15' }}>PE = ½ k x²</div>
          <div style={{ marginBottom: 10, color: '#f1f5f9' }}>PE = 0.5 × 200 × ({Math.round(displayStretch * 100) / 100})² = <strong>{livePE} J</strong></div>
          
          <div style={{ marginBottom: 4, fontFamily: 'monospace', color: '#facc15' }}>KE = ½ m v²</div>
          <div style={{ marginBottom: 4, color: '#f1f5f9' }}>v = √(2 × PE / m)</div>
          <div style={{ color: '#f1f5f9' }}>v = √(2 × {livePE} / 0.0006) ≈ <strong>{Math.round(Math.sqrt((2 * livePE)/0.0006) || 0)} m/s</strong></div>
        </div>

        {/* Status */}
        <div style={{ textAlign: 'center', marginTop: 15, fontSize: '0.9rem', color: '#94a3b8' }}>
          Status: <strong style={{color: '#fff'}}>
            {gameState === 'IDLE' && 'Ready to Draw'}
            {gameState === 'STRETCHING' && 'Storing Energy...'}
            {gameState === 'RELEASED' && 'Converting to Kinetic...'}
            {gameState === 'FLYING' && 'In Flight'}
            {gameState === 'FINISHED' && 'Impact'}
            {gameState === 'RESETTING' && 'Resetting'}
          </strong>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginTop: '15px' }}>
          <button className="reset-scene-btn" style={{ flex: 1, margin: 0 }} onClick={handleReset}>Reset Field</button>
          <button className="reset-scene-btn" style={{ flex: 1, margin: 0, background: '#1e293b', border: '1px solid #38bdf8', color: '#38bdf8' }} onClick={() => setShowConcepts(true)}>Review Science</button>
        </div>
      </div>
    </div>
  );
}

export default App;
