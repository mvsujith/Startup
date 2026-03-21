import React, { useEffect, useRef, useState } from "react";
import { PhysicsExperiment } from "./systems/PhysicsExperiment.js";
import "./App.css";

// Web Audio API Synthesizer Helper
let globalAudioCtx = null;
const playSound = (type) => {
    try {
        if (!globalAudioCtx) {
            globalAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (globalAudioCtx.state === 'suspended') {
            globalAudioCtx.resume();
        }
        const audioCtx = globalAudioCtx;
        if (!audioCtx) return;
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        switch (type) {
            case 'click':
                osc.type = 'sine';
                osc.frequency.setValueAtTime(800, audioCtx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.05);
                gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
                osc.start();
                osc.stop(audioCtx.currentTime + 0.1);
                break;
            case 'thud':
                // Impact sound
                osc.type = 'square';
                osc.frequency.setValueAtTime(150, audioCtx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.2);
                gainNode.gain.setValueAtTime(0.8, audioCtx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
                osc.start();
                osc.stop(audioCtx.currentTime + 0.3);
                break;
            case 'success':
                // Chime
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(440, audioCtx.currentTime);
                osc.frequency.setValueAtTime(554.37, audioCtx.currentTime + 0.1);
                osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.2);
                osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.3);
                gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
                gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.8);
                osc.start();
                osc.stop(audioCtx.currentTime + 0.8);
                break;
            case 'rolling':
                // Low rumble while moving using brown noise approx
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(50, audioCtx.currentTime);
                gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
                gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.5);
                osc.start();
                osc.stop(audioCtx.currentTime + 0.5);
                break;
        }
    } catch(e) { }
};

function App() {
  const mountRef = useRef(null);
  const appRef = useRef(null);
  
  const [loading, setLoading] = useState(true);
  const [guideStep, setGuideStep] = useState(0);
  const [completedChallenges, setCompletedChallenges] = useState([]);
  const [trials, setTrials] = useState([]);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationText, setCelebrationText] = useState("");

  const [physicsState, setPhysicsState] = useState({
      massPan: 0,
      velocity: 0,
      impactVelocity: 0,
      trolleyDisplacement: 0,
      blockDisplacement: 0,
      isSimulating: false,
      hasHitBlock: false,
      mT: 0.2, mB: 0.4, fK: 0.5, a1: 0, a2: 0
  });
  
  // Track previous state locally to detect edge events
  const prevSimulating = useRef(false);
  const prevHitBlock = useRef(false);

  useEffect(() => {
    if (mountRef.current) {
      appRef.current = new PhysicsExperiment(
          mountRef.current, 
          () => setLoading(false),
          (state) => setPhysicsState({ ...state })
      );
    }
    return () => {
      if (appRef.current) {
        appRef.current.dispose();
        appRef.current = null;
      }
    };
  }, []);

  // Sync Mode to 3D Scene for specific tooltips permanently
  useEffect(() => {
      if (appRef.current) {
          appRef.current.setMode('guide'); // Natively lock the tooltips mode on
      }
  }, []);

  // Hook into Physics State exclusively to process events natively (Thud, Run completion)
  useEffect(() => {
      // Detect impact 
      if (!prevHitBlock.current && physicsState.hasHitBlock) {
          playSound('thud');
      }
      
      // Keep track of rolling sound frame
      if (physicsState.isSimulating && physicsState.velocity > 0.5 && Math.random() > 0.8) {
          playSound('rolling');
      }

      // Simulation Complete (Decelerated fully after impact)
      if (prevSimulating.current && !physicsState.isSimulating && physicsState.hasHitBlock && physicsState.velocity === 0) {
          handleSimulationComplete(physicsState);
      }

      prevSimulating.current = physicsState.isSimulating;
      prevHitBlock.current = physicsState.hasHitBlock;
  }, [physicsState]);

  const handleSimulationComplete = (state) => {
      // Save trial
      const workDone = state.fK * state.mB * 9.81 * state.blockDisplacement;
      setTrials(prev => [...prev, {
          trialNum: prev.length + 1,
          mass: state.massPan,
          v: state.impactVelocity,
          s: state.blockDisplacement,
          w: workDone
      }]);

      checkChallenges(state, workDone);
  };

  const celebrate = (msg) => {
      playSound('success');
      setCelebrationText(msg);
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 4000);
  };

  const checkChallenges = (state, workDone) => {
      const newCompletes = [...completedChallenges];
      let didWin = false;

      if (!newCompletes.includes('first_run')) {
          newCompletes.push('first_run');
          celebrate('⭐ Challenge Complete: First Steps!');
          didWin = true;
      }
      if (!newCompletes.includes('heavy_lifter') && state.massPan >= 0.25) {
          newCompletes.push('heavy_lifter');
          celebrate('🌟 Challenge Complete: Heavy Lifter!');
          didWin = true;
      }
      if (!newCompletes.includes('power_slide') && state.blockDisplacement > 3.0) {
          newCompletes.push('power_slide');
          celebrate('⭐ Challenge Complete: Power Slide!');
          didWin = true;
      }

      if (didWin) setCompletedChallenges(newCompletes);
  };

  const handleAddWeight = () => {
      playSound('click');
      appRef.current?.addWeight();
  };
  const handleRemoveWeight = () => {
      playSound('click');
      appRef.current?.removeWeight();
  };

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative', fontFamily: "'Inter', sans-serif" }}>
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
      
      {loading && (
          <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
              background: '#0f162e', display: 'flex', alignItems: 'center', 
              justifyContent: 'center', color: 'white', zIndex: 100
          }}>
              <h2>Loading Gamified Assets...</h2>
          </div>
      )}

      {showCelebration && (
          <div style={{
              position: 'absolute', top: '20%', left: '50%', transform: 'translate(-50%, -50%)',
              background: 'linear-gradient(135deg, #FFC107, #FF9800)', color: 'white',
              padding: '20px 40px', borderRadius: '50px', fontSize: '1.5rem', fontWeight: 'bold',
              boxShadow: '0 10px 40px rgba(255, 193, 7, 0.6)', zIndex: 999,
              animation: 'popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
          }}>
              {celebrationText}
          </div>
      )}

      {/* Main Educational Controls */}
      <div style={{
          position: 'absolute', top: 20, left: 20, background: 'rgba(25, 28, 41, 0.9)',
          padding: '20px', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          color: 'white', width: '320px', border: '1px solid rgba(255,255,255,0.1)'
      }}>
          <div style={{ background: 'rgba(76, 175, 80, 0.2)', padding: '15px', borderRadius: '8px', marginBottom: '15px', borderLeft: '4px solid #4CAF50' }}>
              <h4 style={{ margin: '0 0 5px 0', color: '#8BC34A' }}>Guided Mission</h4>
              <p style={{ margin: 0, fontSize: '0.85rem', lineHeight: '1.4' }}>
                  {physicsState.massPan === 0 ? "First, let's observe how force correlates with movement! Add at least 50g using the [+] button below." 
                   : !physicsState.isSimulating && physicsState.trolleyDisplacement === 0 ? "Excellent. The gravitational pull on that mass creates Tension in the string! Now click START to observe the Work Done."
                   : physicsState.isSimulating ? "Watch carefully! Kinetic energy from the falling mass passes through the string pulling the trolley."
                   : "Success! The trolley slammed the block! Notice how the kinetic energy was expended over distance (Displacement) to overcome Kinetic Friction. That is 'Work Done'!"}
              </p>
          </div>

          <div style={{ background: 'rgba(233, 30, 99, 0.2)', padding: '15px', borderRadius: '8px', marginBottom: '15px', borderLeft: '4px solid #E91E63' }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#E91E63' }}>Earn your Badges</h4>
              <ul style={{ margin: 0, paddingLeft: 20, fontSize: '0.85rem', lineHeight: '1.6' }}>
                  <li style={{ color: completedChallenges.includes('first_run') ? '#8BC34A' : '#ccc', textDecoration: completedChallenges.includes('first_run') ? 'line-through' : 'none' }}>First Steps: Run an experiment</li>
                  <li style={{ color: completedChallenges.includes('heavy_lifter') ? '#8BC34A' : '#ccc', textDecoration: completedChallenges.includes('heavy_lifter') ? 'line-through' : 'none' }}>Heavy Lifter: Use &ge; 250g weight</li>
                  <li style={{ color: completedChallenges.includes('power_slide') ? '#8BC34A' : '#ccc', textDecoration: completedChallenges.includes('power_slide') ? 'line-through' : 'none' }}>Power Slide: Displace Block &gt; 3.0m</li>
              </ul>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              <button 
                onClick={() => { playSound('click'); appRef.current?.startSimulation(); }} 
                disabled={physicsState.massPan === 0 || physicsState.isSimulating || physicsState.trolleyDisplacement > 0}
                style={{ 
                    flex: 1, padding: '10px', background: (physicsState.isSimulating || physicsState.trolleyDisplacement > 0) ? '#555' : '#4CAF50', 
                    color: 'white', border: 'none', borderRadius: '6px', cursor: (physicsState.isSimulating || physicsState.trolleyDisplacement > 0) ? 'not-allowed' : 'pointer', fontWeight: 'bold'
                }}>
                START
              </button>
              <button 
                onClick={() => { playSound('click'); appRef.current?.resetSimulation(); }}
                style={{ 
                    flex: 1, padding: '10px', background: '#D32F2F', 
                    color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold'
                }}>
                RESET
              </button>
          </div>

          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.9rem' }}>Hanging Mass</span>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <button onClick={handleRemoveWeight} disabled={physicsState.isSimulating || physicsState.massPan === 0} style={{ width: 30, height: 30, background: '#444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>-</button>
                      <strong style={{ width: '60px', textAlign: 'center' }}>{(physicsState.massPan * 1000).toFixed(0)}g</strong>
                      <button onClick={handleAddWeight} disabled={physicsState.isSimulating} style={{ width: 30, height: 30, background: '#444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>+</button>
                  </div>
              </div>
          </div>

          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '15px', borderRadius: '8px' }}>
              <h3 style={{ margin: '0 0 10px 0', fontSize: '1rem' }}>Live Measurements</h3>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.85rem', color: '#ccc' }}>Trolley Velocity</span>
                  <strong style={{ color: '#2196F3' }}>{physicsState.velocity.toFixed(2)} m/s</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.85rem', color: '#ccc' }}>Impact Velocity (v_max)</span>
                  <strong style={{ color: '#00BCD4' }}>{physicsState.impactVelocity > 0 ? physicsState.impactVelocity.toFixed(2) : '-.--'} m/s</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.85rem', color: '#ccc' }}>Block Displacement</span>
                  <strong style={{ color: '#FF9800' }}>{physicsState.blockDisplacement.toFixed(2)} m</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.85rem', color: '#ccc' }}>Work Done</span>
                  <strong style={{ color: '#E91E63' }}>{(physicsState.fK * physicsState.mB * 9.81 * physicsState.blockDisplacement).toFixed(2)} J</strong>
              </div>
          </div>
      </div>

      {/* Physics Calculus Breakdown */}
      <div style={{
          position: 'absolute', top: 20, right: 20, background: 'rgba(25, 28, 41, 0.95)',
          padding: '20px', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          color: 'white', width: '380px', border: '1px solid rgba(255,255,255,0.1)',
          pointerEvents: 'none'
      }}>
          <h3 style={{ margin: '0 0 15px 0', fontSize: '1.1rem', color: '#FFD54F', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}>
              Physics Calculus Breakdown
          </h3>

          <div style={{ marginBottom: 15, fontSize: '0.85rem' }}>
              <strong style={{color: '#ccc', display: 'block', marginBottom: 5}}>System Parameters</strong>
              <div style={{display: 'flex', justifyContent: 'space-between', fontFamily: 'monospace'}}>
                  <span>Trolley Mass (m<sub>t</sub>)</span> <span>{physicsState.mT} kg</span>
              </div>
              <div style={{display: 'flex', justifyContent: 'space-between', fontFamily: 'monospace'}}>
                  <span>Block Mass (m<sub>b</sub>)</span> <span>{physicsState.mB} kg</span>
              </div>
              <div style={{display: 'flex', justifyContent: 'space-between', fontFamily: 'monospace'}}>
                  <span>Kinetic Friction (μ<sub>k</sub>)</span> <span>{physicsState.fK}</span>
              </div>
          </div>

          <div style={{ marginBottom: 15, fontSize: '0.85rem' }}>
              <strong style={{color: '#ccc', display: 'block', marginBottom: 5}}>Simulation State</strong>
              <div style={{ padding: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', fontFamily: 'monospace', color: '#2196F3' }}>
                  {physicsState.plateHitFloor && !physicsState.hasHitBlock ? "Phase 3: Slack String Coasting" : (physicsState.hasHitBlock ? (physicsState.isSimulating ? "Phase 2: Sliding Impact" : "Phase 4: Stopped (Friction)") : "Phase 1: Free Pull (Pre-Impact)")}
              </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ marginBottom: 15, fontSize: '0.85rem', background: 'rgba(0,0,0,0.3)', padding: 10, borderRadius: 6 }}>
                <strong style={{color: '#8BC34A', display: 'block', marginBottom: 5}}>Phase 1: Free Pull (Pre-Impact)</strong>
                <span style={{ fontFamily: 'monospace' }}>
                    a₁ = (m<sub>p</sub> · g) ÷ (m<sub>t</sub> + m<sub>p</sub>)<br/>
                    a₁ = ({physicsState.massPan.toFixed(2)} · 9.81) ÷ ({physicsState.mT} + {physicsState.massPan.toFixed(2)})<br/>
                    a₁ = <u>{((physicsState.massPan * 9.81) / (physicsState.mT + physicsState.massPan) || 0).toFixed(2)} m/s²</u>
                </span>
            </div>
            
            <div style={{ marginBottom: 15, fontSize: '0.85rem', background: 'rgba(0,0,0,0.3)', padding: 10, borderRadius: 6 }}>
                <strong style={{color: '#E91E63', display: 'block', marginBottom: 5}}>Phase 2: Sliding Impact</strong>
                <span style={{ fontFamily: 'monospace' }}>
                    F<sub>net</sub> = (m<sub>p</sub> · g) − (μ<sub>k</sub> · m<sub>b</sub> · g)<br/>
                    F<sub>net</sub> = ({(physicsState.massPan * 9.81).toFixed(2)}) − ({(physicsState.fK * physicsState.mB * 9.81).toFixed(2)}) 
                    = {((physicsState.massPan * 9.81) - (physicsState.fK * physicsState.mB * 9.81)).toFixed(2)} N <br/>
                    <br/>
                    a₂ = F<sub>net</sub> ÷ (m<sub>t</sub> + m<sub>b</sub> + m<sub>p</sub>)<br/>
                    a₂ = <u>{(((physicsState.massPan * 9.81) - (physicsState.fK * physicsState.mB * 9.81)) / (physicsState.mT + physicsState.mB + physicsState.massPan) || 0).toFixed(2)} m/s²</u>
                </span>
            </div>
          </div>
      </div>

      {/* Trial Results Ledger */}
      {trials.length > 0 && (
          <div style={{
              position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
              background: 'rgba(25, 28, 41, 0.95)', padding: '15px', borderRadius: 12,
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)', color: 'white', width: '600px',
              border: '1px solid rgba(255,255,255,0.1)'
          }}>
              <h3 style={{ margin: '0 0 10px 0', fontSize: '1rem', color: '#03A9F4' }}>Student Lab Ledger</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                      <tr style={{ borderBottom: '1px solid #444' }}>
                          <th style={{ textAlign: 'left', padding: '5px' }}>Trial</th>
                          <th style={{ textAlign: 'left', padding: '5px' }}>Mass (g)</th>
                          <th style={{ textAlign: 'left', padding: '5px' }}>Impact (m/s)</th>
                          <th style={{ textAlign: 'left', padding: '5px' }}>Displacement (m)</th>
                          <th style={{ textAlign: 'left', padding: '5px', color: '#E91E63' }}>Work Done (J)</th>
                      </tr>
                  </thead>
                  <tbody>
                      {trials.map(t => (
                          <tr key={t.trialNum} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                              <td style={{ padding: '8px 5px' }}>#{t.trialNum}</td>
                              <td style={{ padding: '8px 5px' }}>{(t.mass * 1000).toFixed(0)}</td>
                              <td style={{ padding: '8px 5px' }}>{t.v.toFixed(2)}</td>
                              <td style={{ padding: '8px 5px' }}>{t.s.toFixed(2)}</td>
                              <td style={{ padding: '8px 5px', color: '#E91E63', fontWeight: 'bold' }}>{t.w.toFixed(2)}</td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      )}

      {/* Custom Styles for Gamification Animations */}
      <style>{`
          @keyframes popIn {
              0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
              100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
          }
      `}</style>
    </div>
  );
}

export default App;
