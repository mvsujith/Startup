/**
 * GameController.jsx — Phase 3
 *
 * Transforms the diffusion experiment into a gamified guided learning
 * experience.  Manages:
 *
 *   • 11-step guided walkthrough
 *   • 3 quiz questions (predict, ink observation, honey observation)
 *   • Scoring (0-50 pts) → 1-3 stars
 *   • Badge system (3 earnable badges)
 *   • Sound effects via SoundManager
 *   • In-scene HTML tooltips / labels
 *   • Results panel with comparison
 *   • Final explanation screen
 *   • Confetti celebration
 *   • Free-play handoff
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { SoundManager } from '../scene/SoundManager';
import './GameController.css';

// ── Step constants ────────────────────────────────────────────────────────────
const S = {
  WELCOME      : 'welcome',
  OBSERVE      : 'observe',
  QUIZ_PREDICT : 'quiz_predict',
  ADD_INK      : 'add_ink',
  QUIZ_INK     : 'quiz_ink',
  ADD_HONEY    : 'add_honey',
  QUIZ_HONEY   : 'quiz_honey',
  START_OBS    : 'start_obs',
  WATCHING     : 'watching',
  RESULTS      : 'results',
  EXPLANATION  : 'explanation',
  FREE_PLAY    : 'free_play',
};

const STEP_ORDER = [
  S.WELCOME, S.OBSERVE, S.QUIZ_PREDICT,
  S.ADD_INK, S.QUIZ_INK,
  S.ADD_HONEY, S.QUIZ_HONEY,
  S.START_OBS, S.WATCHING,
  S.RESULTS, S.EXPLANATION, S.FREE_PLAY,
];

// ── Steps metadata ────────────────────────────────────────────────────────────
const STEPS = {
  [S.WELCOME]: {
    emoji: '🔬', num: 1,
    title: 'Welcome to the Diffusion Lab!',
    body: 'In this experiment you will add a drop of blue ink and a drop of honey to two beakers of water, then observe how they behave differently. Ready?',
    cta: 'Let\'s Begin →',
    showTooltips: false,
  },
  [S.OBSERVE]: {
    emoji: '👀', num: 2,
    title: 'Observe the Beakers',
    body: 'Look at the two glass beakers. Both contain plain, clear water. Nothing has been added yet. Notice how transparent the water is.',
    cta: 'I Can See Them →',
    showTooltips: true,
  },
  [S.QUIZ_PREDICT]: {
    emoji: '🤔', num: 3,
    title: 'Make a Prediction',
    body: 'Before we add anything — which substance do you think will spread (diffuse) through water faster?',
    cta: null,
    showTooltips: false,
    quiz: 'predict',
  },
  [S.ADD_INK]: {
    emoji: '🔵', num: 4,
    title: 'Add the Ink Drop',
    body: 'Click the button below (or the "Add Ink" button) to drop a small amount of blue ink into Beaker 1. Watch carefully what happens!',
    cta: '🔵 Add Ink Now',
    action: 'add-ink',
    showTooltips: true,
  },
  [S.QUIZ_INK]: {
    emoji: '👁️', num: 5,
    title: 'What Did You Observe?',
    body: 'The ink drop has entered the water. What did you notice happening immediately?',
    cta: null,
    showTooltips: false,
    quiz: 'ink',
  },
  [S.ADD_HONEY]: {
    emoji: '🍯', num: 6,
    title: 'Add the Honey Drop',
    body: 'Now add a drop of honey to Beaker 2. Notice how it behaves very differently from the ink!',
    cta: '🍯 Add Honey Now',
    action: 'add-honey',
    showTooltips: true,
  },
  [S.QUIZ_HONEY]: {
    emoji: '🧪', num: 7,
    title: 'What Did You Observe?',
    body: 'The honey drop has entered the water. What happened to it?',
    cta: null,
    showTooltips: false,
    quiz: 'honey',
  },
  [S.START_OBS]: {
    emoji: '▶️', num: 8,
    title: 'Start the Observation',
    body: 'Both substances are now in the water. Start the observation and watch how they spread over time. In real life this takes hours — we have sped it up!',
    cta: '▶ Start Observation',
    action: 'start',
    showTooltips: false,
  },
  [S.WATCHING]: {
    emoji: '⏱️', num: 9,
    title: 'Observing Diffusion…',
    body: 'Watch the blue ink particles spreading through Beaker 1. Compare with the honey in Beaker 2. Can you see the huge speed difference?',
    cta: null,
    showTooltips: false,
  },
  [S.RESULTS]: { emoji: '🎉', num: 10, title: 'Results', cta: null },
  [S.EXPLANATION]: { emoji: '🧬', num: 11, title: 'The Science', cta: null },
  [S.FREE_PLAY]: { emoji: '🎮', num: 12, title: 'Free Play', cta: null },
};

// ── Quiz data ─────────────────────────────────────────────────────────────────
const QUIZZES = {
  predict: {
    question: 'Which substance do you think will spread faster through water?',
    options: [
      { id: 'ink',   label: '🔵 Blue Ink',         correct: true  },
      { id: 'honey', label: '🍯 Honey',             correct: false },
      { id: 'same',  label: '⚖️ Both the same speed', correct: false },
    ],
    points: 20,
    correctFeedback: '🎉 Excellent prediction! Ink molecules are tiny and light, so they diffuse through water much faster than honey.',
    wrongFeedback  : '🧐 Good try! Actually, ink spreads much faster. Honey\'s large, sticky molecules move very slowly — this is called high viscosity.',
  },
  ink: {
    question: 'What happened immediately after the ink drop entered the water?',
    options: [
      { id: 'spread',  label: '💧 It began spreading and mixing with the water', correct: true  },
      { id: 'nothing', label: '😴 Nothing happened',                              correct: false },
      { id: 'float',   label: '🫧 It floated on the surface',                    correct: false },
      { id: 'solid',   label: '🧊 It became a solid ball',                       correct: false },
    ],
    points: 15,
    correctFeedback: '✅ Exactly right! Ink molecules immediately begin diffusing — spreading from the high-concentration drop into the surrounding water.',
    wrongFeedback  : '🔍 Actually, ink begins spreading almost immediately! This is diffusion — molecules move from areas of high concentration to low concentration.',
  },
  honey: {
    question: 'What happened after the honey drop entered the water?',
    options: [
      { id: 'sink',    label: '⬇️ It sank slowly to the bottom and stayed concentrated', correct: true  },
      { id: 'instant', label: '⚡ It mixed instantly like the ink',                       correct: false },
      { id: 'float',   label: '🫧 It floated to the top',                                correct: false },
      { id: 'vanish',  label: '💨 It disappeared immediately',                           correct: false },
    ],
    points: 15,
    correctFeedback: '✅ Correct! Honey is denser than water, so it sinks. Its huge sugar molecules move very slowly — diffusion is extremely slow.',
    wrongFeedback  : '🍯 Honey actually sinks to the bottom! It\'s denser than water, and its large molecules diffuse very slowly compared to ink.',
  },
};

// ── Badges ────────────────────────────────────────────────────────────────────
const BADGES = {
  mind_reader  : { emoji: '🧠', title: 'Mind Reader',     desc: 'Correctly predicted the faster substance' },
  sharp_eye    : { emoji: '👁️', title: 'Sharp Observer',  desc: 'Answered all observation questions correctly' },
  lab_scientist: { emoji: '🔬', title: 'Lab Scientist',   desc: 'Completed the full diffusion experiment' },
};

// ── Confetti helper ───────────────────────────────────────────────────────────
function Confetti({ active }) {
  if (!active) return null;
  const pieces = Array.from({ length: 60 }, (_, i) => ({
    id: i,
    color: ['#3b82f6', '#f59e0b', '#10b981', '#ec4899', '#8b5cf6', '#f97316'][i % 6],
    left : `${Math.random() * 100}%`,
    delay: `${Math.random() * 1.5}s`,
    dur  : `${1.5 + Math.random() * 1.5}s`,
    rot  : `${Math.random() * 360}deg`,
  }));
  return (
    <div className="confetti-container" aria-hidden>
      {pieces.map(p => (
        <div key={p.id} className="confetti-piece" style={{
          background: p.color, left: p.left,
          animationDelay: p.delay, animationDuration: p.dur,
          '--rot': p.rot,
        }} />
      ))}
    </div>
  );
}

// ── ScoreHUD ─────────────────────────────────────────────────────────────────
function ScoreHUD({ score, stars, step, totalSteps }) {
  const pct = Math.round((STEP_ORDER.indexOf(step) / (STEP_ORDER.length - 2)) * 100);
  return (
    <div className="score-hud">
      <div className="score-hud__stars">
        {[1, 2, 3].map(n => (
          <span key={n} className={`star ${stars >= n ? 'star--lit' : ''}`}>★</span>
        ))}
      </div>
      <div className="score-hud__score">{score} <span>pts</span></div>
      <div className="score-hud__bar">
        <div className="score-hud__fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ── BadgeToast ────────────────────────────────────────────────────────────────
function BadgeToast({ badge, onDone }) {
  if (!badge) return null;
  const b = BADGES[badge];
  return (
    <div className="badge-toast" onAnimationEnd={onDone}>
      <span className="badge-toast__emoji">{b.emoji}</span>
      <div>
        <div className="badge-toast__title">Badge Earned!</div>
        <div className="badge-toast__name">{b.title}</div>
        <div className="badge-toast__desc">{b.desc}</div>
      </div>
    </div>
  );
}

// ── InSceneTooltips ───────────────────────────────────────────────────────────
function InSceneTooltips({ show, inkAdded, honeyAdded, isRunning }) {
  if (!show) return null;
  return (
    <div className="tooltips-layer" aria-hidden>
      {/* Beaker 1 label */}
      <div className="isl-tooltip isl-tooltip--left">
        <div className="isl-arrow" />
        <div className="isl-box">
          <span className="isl-icon">🧪</span>
          <div>
            <strong>Beaker 1</strong>
            <p>Contains: <em>Water</em></p>
            {inkAdded && <p className="isl-sub isl-blue">+ Ink (diffusing)</p>}
          </div>
        </div>
      </div>

      {/* Beaker 2 label */}
      <div className="isl-tooltip isl-tooltip--right">
        <div className="isl-arrow isl-arrow--right" />
        <div className="isl-box">
          <span className="isl-icon">🧪</span>
          <div>
            <strong>Beaker 2</strong>
            <p>Contains: <em>Water</em></p>
            {honeyAdded && <p className="isl-sub isl-amber">+ Honey (sinking)</p>}
          </div>
        </div>
      </div>

      {/* Science vocab pills at bottom */}
      <div className="isl-vocab">
        {[
          { term: 'Diffusion', def: 'Movement of particles from high → low concentration' },
          { term: 'Viscosity', def: 'Resistance of a liquid to flow (honey = high, ink = low)' },
          { term: 'Spreading', def: 'How a substance mixes through a liquid over time' },
          { term: 'Observation', def: 'Recording what you see during an experiment' },
        ].map(v => (
          <div key={v.term} className="isl-vocab__pill" title={v.def}>
            <strong>{v.term}</strong>
            <span>{v.def}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── StepCard ──────────────────────────────────────────────────────────────────
function StepCard({ step, stepData, onCta, inkProgress }) {
  const isWatching = step === S.WATCHING;
  return (
    <div className={`step-card ${isWatching ? 'step-card--watching' : ''}`}>
      <div className="step-card__header">
        <span className="step-card__emoji">{stepData.emoji}</span>
        <div>
          <div className="step-card__num">Step {stepData.num} of {STEP_ORDER.length - 2}</div>
          <div className="step-card__title">{stepData.title}</div>
        </div>
      </div>
      <p className="step-card__body">{stepData.body}</p>

      {isWatching && (
        <div className="step-card__progress">
          <div className="watch-bar">
            <span className="wb-label" style={{ color: '#60a5fa' }}>🔵 Ink</span>
            <div className="wb-track">
              <div className="wb-fill wb-fill--blue" style={{ width: `${Math.round(inkProgress * 100)}%` }} />
            </div>
            <span className="wb-pct">{Math.round(inkProgress * 100)}%</span>
          </div>
          <p className="watch-hint">Observation will complete at 80% ink spread…</p>
        </div>
      )}

      {stepData.cta && (
        <button className="step-card__cta" onClick={onCta} id={`gc-cta-${step}`}>
          {stepData.cta}
        </button>
      )}
    </div>
  );
}

// ── QuizModal ─────────────────────────────────────────────────────────────────
function QuizModal({ quizKey, onAnswer }) {
  const [selected, setSelected] = useState(null);
  const [revealed, setRevealed]  = useState(false);
  const quiz = QUIZZES[quizKey];
  if (!quiz) return null;

  const handleSelect = (opt) => {
    if (revealed) return;
    setSelected(opt.id);
    setRevealed(true);
    onAnswer(opt.correct, quiz.points);
  };

  const isCorrect = quiz.options.find(o => o.id === selected)?.correct;

  return (
    <div className="quiz-overlay">
      <div className="quiz-modal">
        <div className="quiz-modal__header">
          <span className="quiz-modal__label">❓ Quick Question</span>
        </div>
        <h3 className="quiz-modal__question">{quiz.question}</h3>

        <div className="quiz-modal__options">
          {quiz.options.map(opt => {
            let cls = 'quiz-opt';
            if (revealed) {
              if (opt.correct) cls += ' quiz-opt--correct';
              else if (opt.id === selected && !opt.correct) cls += ' quiz-opt--wrong';
              else cls += ' quiz-opt--dim';
            }
            if (opt.id === selected) cls += ' quiz-opt--selected';
            return (
              <button
                key={opt.id}
                className={cls}
                onClick={() => handleSelect(opt)}
                disabled={revealed}
                id={`quiz-opt-${quizKey}-${opt.id}`}
              >
                {revealed && opt.correct && <span className="quiz-opt__tick">✓</span>}
                {revealed && opt.id === selected && !opt.correct && <span className="quiz-opt__tick">✗</span>}
                {opt.label}
              </button>
            );
          })}
        </div>

        {revealed && (
          <div className={`quiz-feedback ${isCorrect ? 'quiz-feedback--correct' : 'quiz-feedback--wrong'}`}>
            <p>{isCorrect ? quiz.correctFeedback : quiz.wrongFeedback}</p>
            {isCorrect && <div className="quiz-pts">+{quiz.points} pts</div>}
            <button className="quiz-continue" onClick={() => onAnswer(isCorrect, 0, true)} id="quiz-continue-btn">
              Continue →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── ResultsPanel ──────────────────────────────────────────────────────────────
function ResultsPanel({ score, stars, badges, inkProgress, honeyProgress, elapsed, onExplain, earnedBadges }) {
  const ratio = honeyProgress > 0
    ? (inkProgress / Math.max(honeyProgress, 0.001)).toFixed(1)
    : '∞';

  const fmtTime = (s) => {
    const m = Math.floor(s / 60), sec = Math.floor(s % 60);
    return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  };

  return (
    <div className="results-overlay">
      <div className="results-panel">
        <div className="results-panel__stars">
          {[1, 2, 3].map(n => (
            <span key={n} className={`results-star ${stars >= n ? 'results-star--lit' : ''}`}
              style={{ animationDelay: `${(n - 1) * 0.3}s` }}>★</span>
          ))}
        </div>

        <h2 className="results-panel__title">Experiment Complete!</h2>
        <div className="results-panel__score">{score} / 50 points</div>

        {/* Comparison bars */}
        <div className="results-compare">
          <div className="rc-row">
            <span className="rc-label rc-label--blue">🔵 Ink spread</span>
            <div className="rc-track"><div className="rc-fill rc-fill--blue" style={{ width: `${Math.round(inkProgress * 100)}%` }} /></div>
            <span className="rc-val">{Math.round(inkProgress * 100)}%</span>
          </div>
          <div className="rc-row">
            <span className="rc-label rc-label--amber">🍯 Honey spread</span>
            <div className="rc-track"><div className="rc-fill rc-fill--amber" style={{ width: `${Math.round(honeyProgress * 100)}%` }} /></div>
            <span className="rc-val">{Math.round(honeyProgress * 100)}%</span>
          </div>
          <div className="rc-badge">
            {ratio !== '∞' ? `Ink was ${ratio}× faster than honey` : 'Ink spread — honey barely moved!'}
          </div>
        </div>

        {/* Time */}
        <div className="results-time">⏱ Simulated time: {fmtTime(elapsed)}</div>

        {/* Badges */}
        {earnedBadges.length > 0 && (
          <div className="results-badges">
            <div className="results-badges__title">Badges Earned</div>
            <div className="results-badges__row">
              {earnedBadges.map(b => (
                <div key={b} className="results-badge-item">
                  <span className="rbi-emoji">{BADGES[b].emoji}</span>
                  <span className="rbi-name">{BADGES[b].title}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <button className="results-panel__btn" onClick={onExplain} id="btn-see-explanation">
          🧬 See The Science →
        </button>
      </div>
    </div>
  );
}

// ── ExplanationScreen ─────────────────────────────────────────────────────────
function ExplanationScreen({ onFreePlay, onReplay }) {
  const cards = [
    {
      icon: '🔵', title: 'Why does Ink spread fast?',
      color: '#1d4ed8', bg: 'rgba(29,78,216,0.10)',
      points: [
        'Ink molecules are very small and light',
        'They move freely through the gaps between water molecules',
        'Random collisions (Brownian motion) spread them quickly',
        'Spreads evenly in about 2 hours in real life',
      ],
    },
    {
      icon: '🍯', title: 'Why does Honey spread slowly?',
      color: '#d97706', bg: 'rgba(217,119,6,0.10)',
      points: [
        'Honey is made of large, sticky sugar molecules',
        'It is much more viscous (thick) than ink',
        'High viscosity = strong resistance to flow',
        'Takes 24–48 hours to spread evenly in real life',
      ],
    },
    {
      icon: '⚗️', title: 'What is Diffusion?',
      color: '#7c3aed', bg: 'rgba(124,58,237,0.10)',
      points: [
        'Diffusion is the natural movement of molecules',
        'Molecules always move from HIGH to LOW concentration',
        'No stirring needed — it happens on its own',
        'Rate depends on molecule size and liquid viscosity',
      ],
    },
    {
      icon: '📐', title: 'The Science Formula',
      color: '#059669', bg: 'rgba(5,150,105,0.10)',
      isFormula: true,
      formula: 'Δx = √(2 · D · Δt)',
      formulaDesc: 'D = diffusion coefficient\nInk D ≈ 14× larger than Honey D\nSo ink spreads √14 ≈ 3.7× faster per second',
    },
  ];

  return (
    <div className="explain-overlay">
      <div className="explain-panel">
        <div className="explain-header">
          <span className="explain-emoji">🧬</span>
          <h2 className="explain-title">The Science Behind It</h2>
          <p className="explain-sub">Simple words, real science</p>
        </div>

        <div className="explain-cards">
          {cards.map(c => (
            <div key={c.title} className="explain-card" style={{ background: c.bg, borderColor: c.color + '44' }}>
              <div className="explain-card__icon" style={{ color: c.color }}>{c.icon}</div>
              <div className="explain-card__content">
                <h4 style={{ color: c.color }}>{c.title}</h4>
                {c.isFormula ? (
                  <>
                    <code className="explain-formula" style={{ borderColor: c.color }}>{c.formula}</code>
                    <p className="explain-formula-desc">{c.formulaDesc}</p>
                  </>
                ) : (
                  <ul>
                    {c.points.map(p => <li key={p}>{p}</li>)}
                  </ul>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="explain-actions">
          <button className="explain-btn explain-btn--secondary" onClick={onReplay} id="btn-replay">
            ↺ Replay Experiment
          </button>
          <button className="explain-btn explain-btn--primary" onClick={onFreePlay} id="btn-free-play">
            🎮 Free Play Mode
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Main GameController export
// ══════════════════════════════════════════════════════════════════════════════
export default function GameController({
  simState,
  onAddInk,
  onAddHoney,
  onStart,
  onReset,
  onExitGuided,    // called when entering free play
}) {
  const { inkAdded, honeyAdded, isRunning, inkProgress, honeyProgress, elapsed } = simState;

  const [step,         setStep]         = useState(S.WELCOME);
  const [score,        setScore]        = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [earnedBadges, setEarnedBadges] = useState([]);
  const [badgeToast,   setBadgeToast]   = useState(null);
  const [confetti,     setConfetti]     = useState(false);
  const [predictedInk, setPredictedInk] = useState(false);
  const [quizCorrect,  setQuizCorrect]  = useState({ predict: null, ink: null, honey: null });

  const soundRef = useRef(null);

  // Initialise sound manager on first interaction
  useEffect(() => {
    soundRef.current = new SoundManager();
  }, []);

  const sfx = useCallback((name) => {
    soundRef.current?.resume();
    soundRef.current?.[name]?.();
  }, []);

  // ── Step helpers ────────────────────────────────────────────────────────────
  const goTo = useCallback((s) => {
    setStep(s);
    sfx('playTick');
  }, [sfx]);

  const nextStep = useCallback(() => {
    setStep(prev => {
      const idx  = STEP_ORDER.indexOf(prev);
      const next = STEP_ORDER[Math.min(idx + 1, STEP_ORDER.length - 1)];
      sfx('playTick');
      return next;
    });
  }, [sfx]);

  // ── Auto-advance based on simState ───────────────────────────────────────
  useEffect(() => {
    if (step === S.ADD_INK && inkAdded) {
      goTo(S.QUIZ_INK);
    }
  }, [inkAdded, step, goTo]);

  useEffect(() => {
    if (step === S.ADD_HONEY && honeyAdded) {
      goTo(S.QUIZ_HONEY);
    }
  }, [honeyAdded, step, goTo]);

  useEffect(() => {
    if (step === S.WATCHING && inkProgress >= 0.80) {
      // Award lab scientist badge
      awardBadge('lab_scientist');
      sfx('playComplete');
      setConfetti(true);
      setTimeout(() => setConfetti(false), 5000);
      goTo(S.RESULTS);
    }
  }, [inkProgress, step]); // eslint-disable-line

  // ── Badge helper ────────────────────────────────────────────────────────────
  const awardBadge = useCallback((id) => {
    setEarnedBadges(prev => {
      if (prev.includes(id)) return prev;
      setBadgeToast(id);
      sfx('playBadge');
      return [...prev, id];
    });
  }, [sfx]);

  // ── Stars calculation ───────────────────────────────────────────────────────
  const stars = score >= 45 ? 3 : score >= 25 ? 2 : score >= 10 ? 1 : 0;

  // ── CTA handler ─────────────────────────────────────────────────────────────
  const handleCta = useCallback(() => {
    const s = STEPS[step];
    if (!s) return;
    sfx('playTick');
    if (s.action === 'add-ink')  { onAddInk();   return; }
    if (s.action === 'add-honey'){ onAddHoney();  return; }
    if (s.action === 'start')    { onStart();     goTo(S.WATCHING); return; }
    nextStep();
  }, [step, onAddInk, onAddHoney, onStart, nextStep, goTo, sfx]);

  // ── Quiz answer handler ──────────────────────────────────────────────────
  const handleQuizAnswer = useCallback((isCorrect, pts, isContinue = false) => {
    const quizKey = STEPS[step]?.quiz;
    if (!quizKey) return;

    if (!isContinue) {
      // First call: record result + award points
      if (isCorrect) {
        sfx('playCorrect');
        setScore(prev => prev + pts);
        setCorrectCount(prev => prev + 1);
        setQuizCorrect(prev => ({ ...prev, [quizKey]: true }));

        // Badge logic
        if (quizKey === 'predict') {
          setPredictedInk(true);
          awardBadge('mind_reader');
          sfx('playStar');
        }
      } else {
        sfx('playWrong');
        setQuizCorrect(prev => ({ ...prev, [quizKey]: false }));
      }
    } else {
      // Continue pressed — check sharp eye badge
      const newCorrectCount = correctCount + (quizCorrect[quizKey] === null && isCorrect ? 1 : 0);
      if (newCorrectCount >= 3 || (correctCount >= 2 && isCorrect)) {
        awardBadge('sharp_eye');
      }
      nextStep();
    }
  }, [step, correctCount, quizCorrect, awardBadge, nextStep, sfx]);

  // ── Free play ────────────────────────────────────────────────────────────
  const handleFreePlay = useCallback(() => {
    onReset();
    setStep(S.FREE_PLAY);
    onExitGuided?.();
  }, [onReset, onExitGuided]);

  const handleReplay = useCallback(() => {
    onReset();
    setStep(S.WELCOME);
    setScore(0);
    setCorrectCount(0);
    setEarnedBadges([]);
    setBadgeToast(null);
    setConfetti(false);
    setPredictedInk(false);
    setQuizCorrect({ predict: null, ink: null, honey: null });
  }, [onReset]);

  // ── Render ───────────────────────────────────────────────────────────────
  if (step === S.FREE_PLAY) return null; // hand off to ControlPanel

  const stepData = STEPS[step];
  if (!stepData) return null;

  const activeQuiz = stepData.quiz;
  const showStep   = !activeQuiz && step !== S.RESULTS && step !== S.EXPLANATION;

  return (
    <div className="gc-root">
      <Confetti active={confetti} />

      {/* ── Score HUD ───────────────────────────── */}
      <ScoreHUD score={score} stars={stars} step={step} totalSteps={STEP_ORDER.length} />

      {/* ── Badge toast ─────────────────────────── */}
      <BadgeToast badge={badgeToast} onDone={() => setBadgeToast(null)} />

      {/* ── In-scene tooltips ────────────────────── */}
      <InSceneTooltips
        show={!!stepData.showTooltips}
        inkAdded={inkAdded}
        honeyAdded={honeyAdded}
        isRunning={isRunning}
      />

      {/* ── Step card ────────────────────────────── */}
      {showStep && (
        <StepCard
          step={step}
          stepData={stepData}
          onCta={handleCta}
          inkProgress={inkProgress}
        />
      )}

      {/* ── Quiz modal ───────────────────────────── */}
      {activeQuiz && (
        <QuizModal
          quizKey={activeQuiz}
          onAnswer={handleQuizAnswer}
        />
      )}

      {/* ── Results ─────────────────────────────── */}
      {step === S.RESULTS && (
        <ResultsPanel
          score={score}
          stars={stars}
          earnedBadges={earnedBadges}
          inkProgress={inkProgress}
          honeyProgress={honeyProgress}
          elapsed={elapsed}
          onExplain={() => goTo(S.EXPLANATION)}
        />
      )}

      {/* ── Explanation ─────────────────────────── */}
      {step === S.EXPLANATION && (
        <ExplanationScreen
          onFreePlay={handleFreePlay}
          onReplay={handleReplay}
        />
      )}
    </div>
  );
}
