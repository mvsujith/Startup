/**
 * GameOverlay.jsx — Phase 3: Gamification UI Overlay
 *
 * Renders different full-screen or hint content based on gameSnap.phase:
 *   intro       → Welcome + checklist
 *   predict     → Prediction challenge (hot vs cold)
 *   ready       → Hint bar "Drop the crystal!"
 *   dropping    → Hint bar "Watch it fall…"
 *   observing   → Progressive hints at 3 progress levels
 *   quiz        → 4-question science quiz (one at a time)
 *   results     → Stars, score, badges, comparison table
 *   explanation → Science summary in plain language
 */

import { useState, useEffect } from 'react';
import { QUIZ_QUESTIONS, BADGES } from '../scene/GameController';
import './GameOverlay.css';

// ── Phases that block the full screen ─────────────────────────────────────────
const FULL_PHASES = new Set(['intro', 'predict', 'quiz', 'results', 'explanation']);

// ── Main export ────────────────────────────────────────────────────────────────

export default function GameOverlay({
  gameSnap,
  diffSnap,
  onPrediction,
  onGoReady,
  onQuizAnswer,
  onNextQuestion,
  onGoExplanation,
  onReset,
  sound,
}) {
  const { phase, score } = gameSnap;

  const isFull = FULL_PHASES.has(phase);

  return (
    <>
      {/* Score badge — visible during experiment phases */}
      {(phase === 'ready' || phase === 'dropping' || phase === 'observing') && score > 0 && (
        <div className="go-score-badge">⭐ {score} pts</div>
      )}

      {/* Full-screen backdrop for blocking overlays */}
      {isFull && (
        <div className="go-backdrop">
          {phase === 'intro'       && <IntroScreen  onStart={() => { sound?.whoosh(); onGoReady?.(); /* special: skip predict if we go to intro first */}} onPredictMode={() => { sound?.whoosh(); /* navigate to predict handled in onStart with predict mode */ }} gameSnap={gameSnap} sound={sound} onGoReady={onGoReady} />}
          {phase === 'predict'     && <PredictScreen gameSnap={gameSnap} onPrediction={onPrediction} onGoReady={onGoReady} sound={sound} />}
          {phase === 'quiz'        && <QuizPanel     gameSnap={gameSnap} onAnswer={onQuizAnswer} onNext={onNextQuestion} sound={sound} />}
          {phase === 'results'     && <ResultsPanel  gameSnap={gameSnap} diffSnap={diffSnap} onExplanation={onGoExplanation} onReset={onReset} sound={sound} />}
          {phase === 'explanation' && <ExplanationPanel onReset={onReset} sound={sound} />}
        </div>
      )}

      {/* Non-blocking hints during experiment */}
      {phase === 'ready'     && <HintBar icon="💎" text="Click 'Drop Crystal' to begin the experiment!" />}
      {phase === 'dropping'  && <HintBar icon="👀" text="Crystal falling — watch it settle at the bottom…" />}
      {phase === 'observing' && <ObservingHints diffSnap={diffSnap} />}
    </>
  );
}

// ── Intro Screen ──────────────────────────────────────────────────────────────

function IntroScreen({ onGoReady, sound }) {
  const items = [
    { icon: '💎', text: 'Drop a copper sulphate crystal into both glasses' },
    { icon: '👁',  text: 'Observe diffusion in hot & cold water' },
    { icon: '🌡️', text: 'Discover why temperature matters' },
    { icon: '🧠', text: 'Answer 4 science questions' },
    { icon: '⭐', text: 'Earn stars and badges!' },
  ];

  return (
    <div className="go-panel">
      <span className="go-icon">🔬</span>
      <h2 className="go-title">Diffusion in Liquids</h2>
      <p className="go-subtitle">
        What happens when a crystal dissolves in hot vs cold water?<br />
        <em>No stirring allowed!</em>
      </p>
      <div className="go-divider" />
      <div className="go-checklist">
        {items.map((it, i) => (
          <div className="go-check-item" key={i}>
            <span className="go-check-icon">{it.icon}</span>
            <span>{it.text}</span>
          </div>
        ))}
      </div>
      <button
        className="go-btn go-btn-success"
        onClick={() => {
          sound?.unlock();
          sound?.whoosh();
          onGoReady('predict');   // go to prediction phase
        }}
      >
        🚀 Start Learning
      </button>
    </div>
  );
}

// ── Prediction Screen ─────────────────────────────────────────────────────────

function PredictScreen({ gameSnap, onPrediction, onGoReady, sound }) {
  const { prediction, predictionCorrect } = gameSnap;
  const hasPredicted = prediction !== null;

  const choose = (choice) => {
    if (hasPredicted) return;
    sound?.unlock();
    sound?.tick();
    onPrediction(choice);
  };

  return (
    <div className="go-panel">
      <span className="go-icon">🤔</span>
      <h2 className="go-title">Make a Prediction!</h2>
      <p className="go-subtitle">
        Before we drop the crystal — which glass do you think the colour
        will spread <strong>faster</strong> in?
      </p>

      <div className="go-predict-grid">
        <div
          className={`go-pred-card hot ${prediction === 'hot' ? 'selected' : ''}`}
          onClick={() => choose('hot')}
        >
          <span className="go-pred-emoji">🔥</span>
          <div className="go-pred-label">Hot Water</div>
          <div className="go-pred-temp">≈ 80 °C</div>
        </div>
        <div
          className={`go-pred-card cold ${prediction === 'cold' ? 'selected' : ''}`}
          onClick={() => choose('cold')}
        >
          <span className="go-pred-emoji">❄️</span>
          <div className="go-pred-label">Cold Water</div>
          <div className="go-pred-temp">≈ 10 °C</div>
        </div>
      </div>

      {hasPredicted && (
        <>
          <div className={`go-pred-feedback ${predictionCorrect ? 'correct' : 'wrong'}`}>
            <div className="go-pred-row">
              <span className="go-pred-dot">{predictionCorrect ? '✅' : '❌'}</span>
              <span>
                {predictionCorrect
                  ? 'Correct! Great scientific thinking! '
                  : `Not quite — it's actually hot water. `}
                {predictionCorrect && <span className="go-pts-badge">+25 pts</span>}
              </span>
            </div>
            <div className="go-pred-explain">
              {predictionCorrect
                ? 'Hot water particles have more kinetic energy → they move faster → diffusion is faster!'
                : 'Hot water particles have more kinetic energy and move faster, so diffusion happens more quickly.'}
            </div>
          </div>
          <button
            className="go-btn go-btn-primary"
            style={{ marginTop: 14 }}
            onClick={() => { sound?.whoosh(); onGoReady('ready'); }}
          >
            🔬 Proceed to Experiment →
          </button>
        </>
      )}
    </div>
  );
}

// ── Hint Bar (non-blocking, bottom of screen) ─────────────────────────────────

function HintBar({ icon, text }) {
  return (
    <div className="go-hint-bar">
      <span className="go-hint-icon">{icon}</span>
      <span className="go-hint-text">{text}</span>
    </div>
  );
}

// ── Observing Hints (progressive, bottom bar) ─────────────────────────────────

const OBS_HINTS = [
  { minProg: 0.00, icon: '👀', text: 'Watch closely! What forms just above the crystal?' },
  { minProg: 0.18, icon: '🔵', text: 'Blue colour spreading up! Compare the two glasses…' },
  { minProg: 0.55, icon: '🔥', text: 'Hot glass almost full! Why is it so much faster?' },
  { minProg: 0.90, icon: '🎉', text: 'Hot glass fully mixed! Cold glass still spreading…' },
];

function ObservingHints({ diffSnap }) {
  const avgProg = diffSnap ? (diffSnap.hotProg + diffSnap.coldProg) / 2 : 0;
  const hint = [...OBS_HINTS].reverse().find(h => avgProg >= h.minProg) || OBS_HINTS[0];

  return <HintBar icon={hint.icon} text={hint.text} />;
}

// ── Quiz Panel ────────────────────────────────────────────────────────────────

function QuizPanel({ gameSnap, onAnswer, onNext, sound }) {
  const { quizIndex, quizAnswers, quizResults, score, currentQuestion, lastAnswerCorrect } = gameSnap;
  const [selected, setSelected] = useState(null);

  // Reset selected option on new question
  useEffect(() => { setSelected(null); }, [quizIndex]);

  const answered = selected !== null;
  const isCorrect = answered && lastAnswerCorrect;

  const handleOption = (idx) => {
    if (answered) return;
    sound?.unlock();
    setSelected(idx);
    const correct = onAnswer(idx);
    if (correct) sound?.correct();
    else sound?.wrong();
  };

  const handleNext = () => {
    sound?.tick();
    onNext();
  };

  if (!currentQuestion) return null;
  const q = currentQuestion;

  const optionClass = (idx) => {
    if (!answered) return '';
    if (idx === q.correct) return 'reveal-correct';
    if (idx === selected && !isCorrect) return 'selected-wrong';
    return 'disabled';
  };

  return (
    <div className="go-panel">
      {/* Header row */}
      <div className="go-quiz-header">
        <div className="go-quiz-progress">
          {QUIZ_QUESTIONS.map((_, i) => (
            <div
              key={i}
              className={`go-quiz-dot ${
                i < quizIndex ? (quizResults[i] ? 'done' : 'wrong')
                : i === quizIndex ? 'current'
                : ''
              }`}
            />
          ))}
        </div>
        <div className="go-quiz-score">⭐ {score} pts</div>
      </div>

      {/* Question */}
      <div className="go-q-num">Question {quizIndex + 1} of {QUIZ_QUESTIONS.length}</div>
      <div className="go-question">{q.question}</div>

      {/* Options */}
      <div className="go-options">
        {q.options.map((opt, idx) => (
          <button
            key={idx}
            className={`go-option ${optionClass(idx)} ${answered ? 'disabled' : ''}`}
            onClick={() => handleOption(idx)}
          >
            {opt}
          </button>
        ))}
      </div>

      {/* Feedback */}
      {answered && (
        <div className={`go-feedback-box ${isCorrect ? 'correct' : 'wrong'}`}>
          <div className="go-feedback-title">
            {isCorrect ? '✅ Correct!' : '❌ Not quite!'}
            {isCorrect && <span className="go-pts-badge">+15 pts</span>}
          </div>
          <div className="go-feedback-text">{q.explanation}</div>
          <div className="go-feedback-fact">{q.fact}</div>
        </div>
      )}

      {/* Next button */}
      <button
        className="go-btn go-btn-primary"
        onClick={handleNext}
        disabled={!answered}
      >
        {quizIndex < QUIZ_QUESTIONS.length - 1 ? 'Next Question →' : 'See Results 🎉'}
      </button>
    </div>
  );
}

// ── Results Panel ─────────────────────────────────────────────────────────────

function ResultsPanel({ gameSnap, diffSnap, onExplanation, onReset, sound }) {
  const { starsEarned, score, badges, quizResults, timeElapsed, prediction, predictionCorrect } = gameSnap;

  useEffect(() => {
    // Play success sound after a brief delay
    const t = setTimeout(() => {
      if (starsEarned >= 3) sound?.success();
      else sound?.badge();
    }, 400);
    return () => clearTimeout(t);
  }, []);

  const fmtTime = (s) => {
    const m = Math.floor(s / 60).toString().padStart(2,'0');
    return `${m}:${Math.floor(s % 60).toString().padStart(2,'0')}`;
  };

  const quizCorrect = quizResults.filter(Boolean).length;

  return (
    <div className="go-panel">
      <h2 className="go-title">🎉 Experiment Complete!</h2>

      {/* Stars */}
      <div className="go-stars">
        {[1,2,3].map(n => (
          <span key={n} className={`go-star ${n > starsEarned ? 'empty' : ''}`}>
            {n <= starsEarned ? '⭐' : '☆'}
          </span>
        ))}
      </div>

      {/* Score */}
      <div className="go-score-display">
        <span className="go-score-num">{score}</span>
        <span className="go-score-max"> / 100</span>
        <div className="go-score-label">Total Score</div>
      </div>

      <div className="go-divider" />

      {/* Quiz summary dots */}
      <div className="go-quiz-summary">
        {quizResults.map((r, i) => (
          <div key={i} className={`go-q-result ${r ? 'correct' : 'wrong'}`}>
            {r ? '✅' : '❌'}
          </div>
        ))}
      </div>

      {/* Results table */}
      <table className="go-results-table">
        <thead>
          <tr>
            <th>Metric</th>
            <th className="go-td-hot">🔥 Hot</th>
            <th className="go-td-cold">❄️ Cold</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Diffusion time</td>
            <td className="go-td-hot">~20 s</td>
            <td className="go-td-cold">~60 s</td>
          </tr>
          <tr>
            <td>Speed ratio</td>
            <td className="go-td-hot" colSpan={2} style={{textAlign:'center'}}>Hot is <strong>3× faster</strong></td>
          </tr>
          <tr>
            <td>Time observed</td>
            <td colSpan={2} style={{textAlign:'center', color:'#a0c0ff'}}>{fmtTime(timeElapsed)}</td>
          </tr>
          <tr>
            <td>Your prediction</td>
            <td colSpan={2} style={{textAlign:'center'}}>
              {prediction === 'hot' ? '🔥 Hot water' : '❄️ Cold water'}
              {' '}{predictionCorrect ? '✅' : '❌'}
            </td>
          </tr>
          <tr>
            <td>Quiz score</td>
            <td colSpan={2} style={{textAlign:'center', color:'#fbbf24'}}>
              {quizCorrect}/{QUIZ_QUESTIONS.length} correct
            </td>
          </tr>
        </tbody>
      </table>

      {/* Badges */}
      {badges.length > 0 && (
        <>
          <div style={{fontSize:'0.80rem',color:'rgba(180,210,255,0.50)',marginBottom:8,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.5px'}}>
            🏅 Badges Earned
          </div>
          <div className="go-badges">
            {badges.map(id => {
              const b = BADGES[id];
              return b ? (
                <div key={id} className="go-badge">
                  <span className="go-badge-emoji">{b.emoji}</span>
                  <div className="go-badge-info">
                    <span className="go-badge-label">{b.label}</span>
                    <span className="go-badge-desc">{b.desc}</span>
                  </div>
                </div>
              ) : null;
            })}
          </div>
        </>
      )}

      {/* Final inference */}
      <div className="go-exp-section" style={{marginBottom:16}}>
        <div className="go-exp-title">🔬 Key Finding</div>
        <div className="go-exp-body">
          Diffusion in <strong style={{color:'#ff9a60'}}>hot water</strong> is approximately{' '}
          <strong>3× faster</strong> than in{' '}
          <strong style={{color:'#5bc9ff'}}>cold water</strong> because higher temperature
          increases the kinetic energy of particles, causing them to move and collide more rapidly.
        </div>
      </div>

      <div className="go-btn-row">
        <button className="go-btn go-btn-ghost" onClick={() => { sound?.whoosh(); onExplanation(); }}>
          📚 See Explanation
        </button>
        <button className="go-btn go-btn-reset" onClick={() => { sound?.whoosh(); onReset(); }}>
          🔄 Try Again
        </button>
      </div>
    </div>
  );
}

// ── Explanation Panel ─────────────────────────────────────────────────────────

function ExplanationPanel({ onReset, sound }) {
  const concepts = [
    { icon: '🌀', heading: 'What is Diffusion?', text: 'Diffusion is the movement of particles from a region of HIGH concentration to LOW concentration — without stirring. The particles move on their own.' },
    { icon: '🔬', heading: 'Kinetic Particle Theory', text: 'All matter is made of tiny particles that are ALWAYS in constant random motion. They never stop — not even at room temperature.' },
    { icon: '🔥', heading: 'Why Hot Water is Faster', text: 'Temperature = kinetic energy. Hot water particles move faster → more collisions → diffusion spreads the colour much more quickly through the glass.' },
    { icon: '❄️', heading: 'Why Cold Water is Slower', text: 'Cold water particles move slowly → fewer collisions → diffusion is gradual and takes ~3× longer than in hot water.' },
    { icon: '🤔', heading: 'Why No Stirring?', text: 'Stirring is a bulk physical movement — not diffusion. This experiment shows that particles mix entirely on their own due to their natural motion.' },
  ];

  return (
    <div className="go-panel">
      <span className="go-icon">📚</span>
      <h2 className="go-title">What Did We Learn?</h2>
      <p className="go-subtitle">Science explained in simple language</p>

      {concepts.map((c, i) => (
        <div key={i} className="go-exp-section">
          <div className="go-exp-title">{c.icon} {c.heading}</div>
          <div className="go-exp-body">{c.text}</div>
        </div>
      ))}

      <div className="go-exp-section" style={{background:'rgba(251,191,36,0.08)',borderColor:'rgba(251,191,36,0.22)'}}>
        <div className="go-exp-title">📝 Key Terms</div>
        <div className="go-exp-body">
          <span className="go-highlight sci">Diffusion</span> — particles spreading from high to low concentration<br/>
          <span className="go-highlight hot">Kinetic Energy</span> — energy of motion; increases with temperature<br/>
          <span className="go-highlight sci">Concentration</span> — how many particles are packed into a region<br/>
          <span className="go-highlight cold">Copper Sulphate</span> — CuSO₄ — the blue crystal used in this experiment
        </div>
      </div>

      <button
        className="go-btn go-btn-success"
        onClick={() => { sound?.whoosh(); onReset(); }}
        style={{ marginTop: 14 }}
      >
        🔄 Try the Experiment Again!
      </button>
    </div>
  );
}
