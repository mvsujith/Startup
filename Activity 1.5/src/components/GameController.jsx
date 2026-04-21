/**
 * GameController.jsx — Phase 3
 *
 * Full gamified learning experience built on top of Phase 2.
 * Manages an 8-step science journey:
 *   0 Welcome → 1 Observe → 2 Predict → 3 Experiment
 *   → 4 Results → 5 Challenge → 6 Score → 7 Explain
 */
import { useState, useEffect, useCallback } from 'react';
import CompressionPanel from './CompressionPanel';
import { soundManager }  from '../scene/SoundManager';
import './GameController.css';

// ── Static data ────────────────────────────────────────────────────────────

const STEPS = [
  { id: 'welcome',   icon: '🧪', label: 'Welcome'    },
  { id: 'observe',   icon: '👁️',  label: 'Observe'    },
  { id: 'predict',   icon: '🤔', label: 'Predict'    },
  { id: 'push',      icon: '🔽', label: 'Experiment' },
  { id: 'see',       icon: '📊', label: 'Results'    },
  { id: 'challenge', icon: '❓', label: 'Challenge'  },
  { id: 'score',     icon: '🏆', label: 'Score'      },
  { id: 'explain',   icon: '🔬', label: 'Science'    },
];

const PART_LABELS = [
  { icon: '⬆️',  name: 'Piston (T-Handle)', desc: 'You push this to apply force. When pressed down, it squeezes the contents inside the barrel.' },
  { icon: '⬛',  name: 'Rubber Seal',        desc: 'Fits tightly inside the barrel. Transfers your pushing force directly to the material inside.' },
  { icon: '📏',  name: 'Barrel (100 mL)',    desc: 'The graduated glass cylinder. The marks show how much the contents have been compressed.' },
  { icon: '💨',  name: 'Gas – Air',          desc: 'Trapped in Syringe 1. Gas molecules have large spaces — easy to squish together!' },
  { icon: '💧',  name: 'Water',              desc: 'Fills Syringe 2. Liquid molecules are tightly packed — almost impossible to compress.' },
  { icon: '🪨',  name: 'Chalk Pieces',       desc: 'Fills Syringe 3. Solid particles are rigid and locked — they strongly resist any push.' },
  { icon: '🔴',  name: 'Rubber Cork',        desc: 'Seals the nozzle tip so nothing escapes when you push the piston all the way down.' },
  { icon: '↕️',  name: 'Compression',        desc: 'How far the piston travels inward shows how compressible the material is.' },
  { icon: '🔬',  name: 'Compressibility',    desc: 'The ability to be squeezed into a smaller volume. Gases = high; Liquids/Solids = low.' },
];

const CHALLENGE_QS = [
  {
    q: 'Why did the AIR syringe compress the most?',
    opts: [
      'Air molecules are very light',
      'Gas molecules have large spaces between them — room to squeeze closer',
      'The barrel is made of special stretchy glass',
      'The rubber cork was not sealed tightly',
    ],
    correct: 1,
  },
  {
    q: 'Which state of matter is the MOST compressible?',
    opts: [
      'Solid — like chalk or rock',
      'Liquid — like water or oil',
      'Gas — like air or steam',
      'All states are equally compressible',
    ],
    correct: 2,
  },
];

const SCIENCE_CARDS = [
  {
    icon: '💨', title: 'Gas (Air)', color: '#66bb6a',
    text: `Gas molecules are spread far apart with lots of empty space between them. When you push the piston, those molecules have room to move closer together — so it glides easily all the way down!`,
    fact: '⚡ Air can be compressed to a tiny fraction of its original volume!',
  },
  {
    icon: '💧', title: 'Liquid (Water)', color: '#42a5f5',
    text: `Liquid molecules are already packed closely together. There is almost no empty space between them. When you push, they have nowhere to go — the piston hits a wall of resistance immediately!`,
    fact: '🚗 Car brakes use liquid because it is incompressible — perfect for transferring force!',
  },
  {
    icon: '🪨', title: 'Solid (Chalk)', color: '#bcaaa4',
    text: `Solid particles are locked into a rigid structure. They cannot move closer because strong bonds hold them in fixed positions. The piston barely moves — all your force is reflected back at you!`,
    fact: '🏗️ Buildings use solid materials because they do not compress under heavy loads!',
  },
];

// ── Main component ─────────────────────────────────────────────────────────
export default function GameController({ progress, phase, onPush, onReset, onReplay }) {
  const [step,       setStep]       = useState(0);
  const [prediction, setPrediction] = useState(null);
  const [score,      setScore]      = useState(0);
  const [badges,     setBadges]     = useState([]);
  const [toast,      setToast]      = useState(null);
  const [cIdx,       setCIdx]       = useState(0);
  const [cAnswers,   setCAnswers]   = useState([]);
  const [predResult, setPredResult] = useState(null);
  const [hasPushed,  setHasPushed]  = useState(false);

  // Auto-advance from Experiment step when animation finishes
  useEffect(() => {
    if (step === 3 && phase === 'idle' && hasPushed) {
      const t = setTimeout(() => goTo(4), 1400);
      return () => clearTimeout(t);
    }
  }, [step, phase, hasPushed]);

  const goTo = (n) => {
    soundManager.playStep();
    // Play popup sound for full-screen overlays
    if ([2, 5, 6, 7].includes(n)) soundManager.playPop();
    setStep(n);
  };

  const addBadge = useCallback((icon, name, desc) => {
    setBadges(prev => {
      if (prev.find(b => b.name === name)) return prev;
      soundManager.playBadge();
      setToast({ icon, name, desc });
      setTimeout(() => setToast(null), 2800);
      return [...prev, { icon, name, desc }];
    });
  }, []);

  const handlePush = useCallback(() => {
    soundManager.playPush();        // mechanical click
    soundManager.playAirRelease();  // hissing air sound for full animation
    setHasPushed(true);
    onPush();
  }, [onPush]);

  const submitPrediction = useCallback(() => {
    if (!prediction) return;
    soundManager.playClick();
    const correct = prediction === 'air';
    if (correct) { setScore(s => s + 30); soundManager.playCorrect(); setPredResult('correct'); addBadge('🎯', 'Sharp Predictor', 'You predicted correctly before the experiment!'); }
    else         { soundManager.playWrong(); setPredResult('wrong'); }
    goTo(3);
  }, [prediction, addBadge]);

  const handleChallenge = useCallback((qIdx, ansIdx) => {
    const correct = ansIdx === CHALLENGE_QS[qIdx].correct;
    if (correct) setScore(s => s + 25);
    soundManager[correct ? 'playCorrect' : 'playWrong']();
    const newAnswers = [...cAnswers, correct];
    setCAnswers(newAnswers);

    if (qIdx + 1 < CHALLENGE_QS.length) {
      setTimeout(() => setCIdx(qIdx + 1), 700);
    } else {
      if (newAnswers.every(Boolean)) addBadge('🧠', 'Science Expert', 'All challenge questions answered correctly!');
      setTimeout(() => {
        addBadge('🔬', 'Young Scientist', 'You completed the science experiment!');
        setScore(s => s + 20);
        soundManager.playSuccess();
        goTo(6);
      }, 800);
    }
  }, [cAnswers, addBadge]);

  const restart = useCallback(() => {
    setStep(0); setPrediction(null); setScore(0); setBadges([]);
    setCIdx(0); setCAnswers([]); setPredResult(null); setHasPushed(false);
    onReset();
  }, [onReset]);

  const stars = score >= 80 ? 3 : score >= 50 ? 2 : 1;
  const airP  = progress.find(p => p.id === 'air');

  return (
    <div className="gc-root">

      {step === 0 && <WelcomeScreen onStart={() => goTo(1)} />}

      {step >= 1 && step <= 5 && <StepBar current={step} steps={STEPS} score={score} />}

      {step === 1 && (
        <div className="gc-overlay-panel">
          <div className="gc-instruction-title">👁️ Observe the Three Syringes</div>
          <p className="gc-instruction-body">Each syringe contains a different material. Read the part guide below, then look at the 3D scene.</p>
          <PartLabels />
          <button className="gc-btn gc-btn--primary" onClick={() => goTo(2)}>I've Observed! → Make a Prediction</button>
        </div>
      )}

      {step === 2 && (
        <PredictionModal prediction={prediction} onSelect={setPrediction} onSubmit={submitPrediction} />
      )}

      {step === 3 && (
        <>
          <CompressionPanel progress={progress} phase={phase} onPush={handlePush} onReset={() => { soundManager.playReset(); setHasPushed(false); onReset(); }} onReplay={() => { soundManager.playReset(); setHasPushed(false); onReplay(); }} />
          {!hasPushed && <div className="gc-push-prompt">👇 Click <strong>Push Piston</strong> to run the experiment!</div>}
          {hasPushed && phase === 'pushing' && <div className="gc-push-prompt gc-push-prompt--go">🔬 Watch each syringe carefully…</div>}
        </>
      )}

      {step === 4 && (
        <div className="gc-overlay-panel">
          <div className="gc-instruction-title">📊 What Did You Notice?</div>
          <div className={`gc-pred-result gc-pred-result--${predResult}`}>
            {predResult === 'correct' ? '✅ Your prediction was CORRECT! Air compressed the most. +30 pts' : '❌ Air was the most compressible. Keep learning — that is what science is for!'}
          </div>
          <div className="gc-result-summary">
            {progress.map(p => (
              <div key={p.id} className="gc-result-row">
                <span className="gc-result-icon">{p.emoji}</span>
                <span className="gc-result-name">{p.contents.toUpperCase()}</span>
                <div className="gc-result-bar-wrap">
                  <div className="gc-result-bar" style={{ width: `${Math.round(p.comprFrac * 100)}%`, background: p.glowHex }} />
                </div>
                <span className="gc-result-pct" style={{ color: p.glowHex }}>{Math.round(p.comprFrac * 100)}%</span>
              </div>
            ))}
          </div>
          <button className="gc-btn gc-btn--primary" onClick={() => goTo(5)}>Answer the Challenge →</button>
        </div>
      )}

      {step === 5 && (
        <ChallengeModal q={CHALLENGE_QS[cIdx]} qIdx={cIdx} total={CHALLENGE_QS.length} answers={cAnswers} onAnswer={(ai) => handleChallenge(cIdx, ai)} />
      )}

      {step === 6 && (
        <ScoreScreen score={score} stars={stars} badges={badges} airP={airP} onExplain={() => goTo(7)} onReplay={restart} />
      )}

      {step === 7 && <ExplanationScreen onReplay={restart} />}

      {toast && <BadgeToast badge={toast} />}

    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function WelcomeScreen({ onStart }) {
  return (
    <div className="gc-full-overlay gc-welcome">
      <div className="gc-welcome-card">
        <div className="gc-welcome-icon">🧪</div>
        <h1 className="gc-welcome-title">Compressibility<br/>of Matter</h1>
        <p className="gc-welcome-sub">A guided science experiment for students</p>
        <div className="gc-welcome-goals">
          <div className="gc-goal">🔽 Push pistons into three syringes</div>
          <div className="gc-goal">📊 Compare gas, liquid and solid compression</div>
          <div className="gc-goal">🧠 Answer challenge questions</div>
          <div className="gc-goal">🏆 Earn stars and science badges!</div>
        </div>
        <button className="gc-btn gc-btn--hero" onClick={() => { soundManager.playStart(); onStart(); }}>Start Experiment →</button>
      </div>
    </div>
  );
}

function StepBar({ current, steps, score }) {
  return (
    <div className="gc-stepbar">
      <div className="gc-stepbar-steps">
        {steps.slice(1, 7).map((s, i) => {
          const idx   = i + 1;
          const state = idx < current ? 'done' : idx === current ? 'active' : 'todo';
          return (
            <div key={s.id} className={`gc-step gc-step--${state}`}>
              <div className="gc-step-dot">{state === 'done' ? '✓' : s.icon}</div>
              <div className="gc-step-label">{s.label}</div>
              {i < 5 && <div className={`gc-step-line ${state === 'done' ? 'gc-step-line--done' : ''}`} />}
            </div>
          );
        })}
      </div>
      <div className="gc-stepbar-score">⭐ {score} pts</div>
    </div>
  );
}

function PartLabels() {
  return (
    <div className="gc-part-labels">
      {PART_LABELS.map(p => (
        <div className="gc-part-item" key={p.name}>
          <span className="gc-part-icon">{p.icon}</span>
          <div>
            <div className="gc-part-name">{p.name}</div>
            <div className="gc-part-desc">{p.desc}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function PredictionModal({ prediction, onSelect, onSubmit }) {
  const opts = [
    { id: 'air',   icon: '💨', label: 'Syringe 1 — Air',   sub: 'Contains gas' },
    { id: 'water', icon: '💧', label: 'Syringe 2 — Water', sub: 'Contains liquid' },
    { id: 'chalk', icon: '🪨', label: 'Syringe 3 — Chalk', sub: 'Contains solid' },
  ];
  return (
    <div className="gc-full-overlay">
      <div className="gc-modal">
        <div className="gc-modal-header">🤔 Make Your Prediction</div>
        <p className="gc-modal-sub">Which syringe will compress the most when you push the piston?</p>
        <div className="gc-predict-options">
          {opts.map(o => (
            <button key={o.id} className={`gc-predict-opt ${prediction === o.id ? 'gc-predict-opt--selected' : ''}`}
              onClick={() => { soundManager.playSelect(); onSelect(o.id); }}>
              <span className="gc-predict-icon">{o.icon}</span>
              <span className="gc-predict-label">{o.label}</span>
              <span className="gc-predict-sub">{o.sub}</span>
            </button>
          ))}
        </div>
        <button className="gc-btn gc-btn--primary" onClick={onSubmit} disabled={!prediction}>Submit Prediction →</button>
      </div>
    </div>
  );
}

function ChallengeModal({ q, qIdx, total, answers, onAnswer }) {
  const [picked, setPicked] = useState(null);
  const answered = answers[qIdx] !== undefined;

  const handlePick = (i) => {
    if (answered || picked !== null) return;
    soundManager.playClick();   // instant click feedback
    setPicked(i);
    setTimeout(() => onAnswer(i), 550);  // parent plays correct/wrong after delay
  };

  useEffect(() => { setPicked(null); }, [qIdx]);

  const getOptClass = (i) => {
    let cls = 'gc-copt';
    if (picked === i) cls += i === q.correct ? ' gc-copt--correct' : ' gc-copt--wrong';
    return cls;
  };

  return (
    <div className="gc-full-overlay">
      <div className="gc-modal gc-modal--challenge">
        <div className="gc-modal-header">❓ Challenge — Question {qIdx + 1} of {total}</div>
        <p className="gc-challenge-q">{q.q}</p>
        <div className="gc-challenge-opts">
          {q.opts.map((opt, i) => (
            <button key={i} className={getOptClass(i)} onClick={() => handlePick(i)} disabled={picked !== null}>
              <span className="gc-copt-letter">{['A','B','C','D'][i]}</span>
              <span>{opt}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ScoreScreen({ score, stars, badges, airP, onExplain, onReplay }) {
  return (
    <div className="gc-full-overlay">
      <div className="gc-modal gc-modal--score">
        <div className="gc-score-stars">{'⭐'.repeat(stars)}{'☆'.repeat(3 - stars)}</div>
        <div className="gc-score-num">{score} <span>/ 100</span></div>
        <div className="gc-score-label">{score >= 80 ? '🏆 Excellent work!' : score >= 50 ? '👍 Good job!' : '💪 Keep practising!'}</div>
        {badges.length > 0 && (
          <div className="gc-badges">
            {badges.map(b => (
              <div key={b.name} className="gc-badge">
                <span className="gc-badge-icon">{b.icon}</span>
                <div><div className="gc-badge-name">{b.name}</div><div className="gc-badge-desc">{b.desc}</div></div>
              </div>
            ))}
          </div>
        )}
        <div className="gc-finding">
          <div className="gc-finding-title">🔑 Key Finding</div>
          <p>The <strong>Air</strong> syringe compressed {Math.round((airP?.comprFrac ?? 0) * 100)}%. Water and Chalk barely moved. <em>Gases are compressible — liquids and solids are not!</em></p>
        </div>
        <div className="gc-score-btns">
          <button className="gc-btn gc-btn--primary"  onClick={() => { soundManager.playPop();   onExplain(); }}>🔬 Learn the Science</button>
          <button className="gc-btn gc-btn--secondary" onClick={() => { soundManager.playReset(); onReplay(); }}>🔄 Play Again</button>
        </div>
      </div>
    </div>
  );
}

function ExplanationScreen({ onReplay }) {
  return (
    <div className="gc-full-overlay gc-explain-overlay">
      <div className="gc-explain-box">
        <h2 className="gc-explain-title">🔬 The Science of Compressibility</h2>
        <div className="gc-explain-grid">
          {SCIENCE_CARDS.map(c => (
            <div key={c.title} className="gc-explain-card" style={{ '--cc': c.color }}>
              <div className="gc-explain-icon">{c.icon}</div>
              <div className="gc-explain-ctitle">{c.title}</div>
              <p className="gc-explain-text">{c.text}</p>
              <div className="gc-explain-fact">{c.fact}</div>
            </div>
          ))}
        </div>
        <div className="gc-explain-takeaway">
          <div className="gc-takeaway-title">🧠 Key Principle</div>
          <p>The <strong>arrangement of particles</strong> determines compressibility.<br/>
          Gas: <em>far apart</em> → easily compressible ✅<br/>
          Liquid: <em>close together</em> → incompressible ❌<br/>
          Solid: <em>rigidly locked</em> → incompressible ❌</p>
        </div>
        <button className="gc-btn gc-btn--hero" onClick={() => { soundManager.playStart(); onReplay(); }} style={{ marginTop: '20px' }}>🔄 Play Again from Start</button>
      </div>
    </div>
  );
}

function BadgeToast({ badge }) {
  return (
    <div className="gc-toast">
      <span className="gc-toast-icon">{badge.icon}</span>
      <div>
        <div className="gc-toast-title">🏅 Badge Unlocked!</div>
        <div className="gc-toast-name">{badge.name}</div>
        <div className="gc-toast-desc">{badge.desc}</div>
      </div>
    </div>
  );
}
