import { useState, useEffect } from 'react';
import './BowStepGuide.css';

const STEPS = [
  { icon: '🏹', title: 'Bow & Arrow — Energy Experiment' },
  { icon: '🌿', title: 'Meet the Bow' },
  { icon: '⬆️', title: 'Place the Arrow' },
  { icon: '💪', title: 'Stretch the String!' },
  { icon: '🚀', title: 'Release!' },
  { icon: '👁️', title: 'Observe the Motion' },
  { icon: '⚡', title: 'The Science Behind It' },
  { icon: '🧠', title: 'Quick Quiz' },
  { icon: '🏅', title: 'Experiment Complete!' },
];

const TOTAL_STEPS = STEPS.length - 1;

const QUIZ = {
  question: 'Where did the arrow\'s Kinetic Energy come from?',
  options: [
    { id: 'a', text: 'Gravity pulled the arrow forward' },
    { id: 'b', text: 'Potential energy stored in the bent bow was converted to KE' },
    { id: 'c', text: 'The air pushed the arrow' },
    { id: 'd', text: 'Energy was created when the string was released' },
  ],
  correct: 'b',
  explanation:
    '✅ Correct! The bent bow stored Elastic Potential Energy (due to change in shape). The moment the string was released, that PE instantly converted to Kinetic Energy — launching the arrow!',
};

export default function BowStepGuide({ step, stretch, state, pe, ke, onAction }) {
  const meta = STEPS[step] || STEPS[0];
  const pct = Math.round(stretch * 100);
  const isReady = stretch >= 0.85;

  const [countdown, setCountdown] = useState(null);
  const [cdDone, setCdDone] = useState(false);
  const [quizAnswer, setQuizAnswer] = useState(null);
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  useEffect(() => {
    if (step === 4) {
      setCountdown(3); setCdDone(false);
      const t1 = setTimeout(() => setCountdown(2), 900);
      const t2 = setTimeout(() => setCountdown(1), 1800);
      const t3 = setTimeout(() => { setCountdown(null); setCdDone(true); }, 2700);
      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    } else {
      setCountdown(null); setCdDone(false);
    }
  }, [step]);

  const handleQuizSubmit = () => {
    if (!quizAnswer || quizSubmitted) return;
    setQuizSubmitted(true);
    onAction('quiz-answer', quizAnswer === QUIZ.correct);
  };

  const cardClass = [
    'bsg-card',
    state === 'STRETCHING' ? 'stretching' : '',
    state === 'RELEASED' ? 'released' : '',
  ].filter(Boolean).join(' ');

  // Status tag
  const statusTag = () => {
    if (state === 'STRETCHING') return { cls: 'storing', label: 'Storing PE…', dot: true };
    if (state === 'RELEASED') return { cls: 'released', label: 'KE Released!', dot: false };
    if (step >= 5 && state === 'IDLE') return { cls: 'resting', label: 'Arrow Landed', dot: false };
    return { cls: 'resting', label: 'Resting', dot: false };
  };
  const tag = statusTag();

  return (
    <div className="bsg-panel">
      {/* Top bar */}
      <div className="bsg-top-bar">
        <span className="bsg-top-logo">🏹</span>
        <h2>Activity 7.3 — Bow &amp; Arrow Energy</h2>
      </div>

      {/* Progress */}
      <div className="bsg-progress-wrap">
        <div className="bsg-progress-row">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className={`bsg-step-dot${i < step ? ' done' : ''}${i === step - 1 ? ' active' : ''}`}
            />
          ))}
        </div>
        <div className="bsg-step-label">Step {step} / {TOTAL_STEPS}</div>
      </div>

      {/* Energy bars — always visible from step 1 onwards */}
      {step >= 1 && (
        <div style={{ padding: '0 12px 0' }}>
          <div className="bsg-energy-bars">
            <div className="bsg-bar-row">
              <div className="bsg-bar-header">
                <span style={{ color: '#38bdf8' }}>🌀 Potential Energy (Bow Shape)</span>
                <span style={{ color: '#38bdf8', fontWeight: 800 }}>{Math.round(pe * 100)}%</span>
              </div>
              <div className="bsg-bar-track">
                <div className="bsg-bar-fill pe" style={{ width: `${Math.round(pe * 100)}%` }} />
              </div>
            </div>
            <div className="bsg-bar-row">
              <div className="bsg-bar-header">
                <span style={{ color: '#facc15' }}>⚡ Kinetic Energy (Arrow Motion)</span>
                <span style={{ color: '#facc15', fontWeight: 800 }}>{Math.round(ke * 100)}%</span>
              </div>
              <div className="bsg-bar-track">
                <div className="bsg-bar-fill ke" style={{ width: `${Math.round(ke * 100)}%` }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main card */}
      <div className={cardClass}>
        <div className="bsg-step-icon">{meta.icon}</div>
        <h2 className="bsg-step-title">{meta.title}</h2>

        {/* ── Step 0: Welcome ── */}
        {step === 0 && (
          <>
            <p className="bsg-step-body">
              In this experiment, you'll discover how <strong>bending a bamboo bow</strong> stores
              energy—and how releasing it sends an arrow flying!
            </p>

            <div className="bsg-energy-flow">
              <div className="bsg-flow-item shape-item">
                <span className="bsg-flow-icon2">🌿</span>
                <span className="bsg-flow-label">Shape<br/>Changes</span>
              </div>
              <span className="bsg-flow-arrow">→</span>
              <div className="bsg-flow-item pe-item">
                <span className="bsg-flow-icon2">🌀</span>
                <span className="bsg-flow-label">PE<br/>Stored</span>
              </div>
              <span className="bsg-flow-arrow">→</span>
              <div className="bsg-flow-item ke-item">
                <span className="bsg-flow-icon2">⚡</span>
                <span className="bsg-flow-label">KE<br/>Released</span>
              </div>
              <span className="bsg-flow-arrow">→</span>
              <div className="bsg-flow-item" style={{ background: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.3)', minWidth: 70 }}>
                <span className="bsg-flow-icon2">🏹</span>
                <span className="bsg-flow-label" style={{ color: '#fb923c' }}>Arrow<br/>Flies!</span>
              </div>
            </div>

            <div className="bsg-concept-box">
              <div className="bsg-concept-row">
                <span className="bsg-concept-emoji">🌀</span>
                <div className="bsg-concept-text">
                  <strong>Potential Energy (PE)</strong> — Energy stored in the bow
                  because its <em>shape has changed</em>. The more you bend it, the more it stores.
                </div>
              </div>
              <div className="bsg-concept-row">
                <span className="bsg-concept-emoji">⚡</span>
                <div className="bsg-concept-text">
                  <strong>Kinetic Energy (KE)</strong> — Energy of motion. When you release
                  the string, the bow springs back and all the stored PE becomes KE in the arrow.
                </div>
              </div>
            </div>

            <button className="bsg-btn primary" onClick={() => onAction('next')}>
              Start Experiment 🚀
            </button>
          </>
        )}

        {/* ── Step 1: Make the bow ── */}
        {step === 1 && (
          <>
            <p className="bsg-step-body">
              A bamboo stick is bent into a bow shape. Notice how the stick's <strong>shape has changed</strong>.
              This deformation is the key to storing energy!
            </p>
            <div className="bsg-instruction-list">
              {[
                'Take a bamboo stick that is flexible',
                'Bend it gently into a curved bow shape',
                'Tie a string tightly between the two ends',
                'The bent stick NOW stores Potential Energy!',
              ].map((t, i) => (
                <div className="bsg-instr-item" key={i}>
                  <div className="bsg-instr-num">{i + 1}</div>
                  <div className="bsg-instr-text">{t}</div>
                </div>
              ))}
            </div>
            <div className="bsg-concept-box">
              <div className="bsg-concept-row">
                <span className="bsg-concept-emoji">💡</span>
                <div className="bsg-concept-text">
                  When the bow is at rest, the string holds the bent limbs in tension.
                  The bow is <strong>already storing PE</strong> — just from being shaped like a bow!
                </div>
              </div>
            </div>
            <button className="bsg-btn primary" onClick={() => onAction('next')}>
              Bow is ready → Place the Arrow
            </button>
          </>
        )}

        {/* ── Step 2: Place the arrow ── */}
        {step === 2 && (
          <>
            <p className="bsg-step-body">
              Place a light stick (arrow) with one end resting against the <strong>stretched string</strong>.
              The string will push the arrow when released.
            </p>
            <div className="bsg-instruction-list">
              {[
                'Pick up a light, straight stick (the arrow)',
                'Rest it horizontally against the bowstring',
                'One end is supported by the string\'s tension',
                'Arrow is loaded — ready to receive energy!',
              ].map((t, i) => (
                <div className="bsg-instr-item" key={i}>
                  <div className="bsg-instr-num">{i + 1}</div>
                  <div className="bsg-instr-text">{t}</div>
                </div>
              ))}
            </div>
            <div className="bsg-tip">
              <span>💡</span>
              <span>At this point, the arrow has <strong>zero KE</strong> (it's not moving)
              and the bow has some <strong>baseline PE</strong> from being bent.</span>
            </div>
            <button className="bsg-btn primary" onClick={() => onAction('next')}>
              Arrow placed → Stretch the String!
            </button>
          </>
        )}

        {/* ── Step 3: Stretch ── */}
        {step === 3 && (
          <>
            <p className="bsg-step-body">
              <strong>Drag back on the scene</strong> (or use the slider) to pull the string.
              Watch how the bow bends more — storing more PE!
            </p>

            <div className="bsg-stretch-section">
              <div className="bsg-stretch-label-row">
                <span>String Pull</span>
                <span className="bsg-stretch-pct">{pct}%</span>
              </div>
              <input
                type="range" min={0} max={100}
                value={pct}
                onChange={e => onAction('set-stretch', e.target.value / 100)}
                className="bsg-slider"
                style={{ '--pct': `${pct}%`, '--fill-end': pct > 70 ? '#ef4444' : pct > 40 ? '#f97316' : '#38bdf8' }}
              />
              <div className={`bsg-stretch-hint${isReady ? ' ready' : ''}`}>
                {isReady ? '🎯 Maximum tension! Ready to fire!' : pct < 30 ? '← Pull more to store energy' : pct < 60 ? '⚡ Energy building...' : '🔥 High tension — almost there!'}
              </div>
            </div>

            {/* Live energy summary */}
            <div className="bsg-concept-box" style={{ marginTop: 4 }}>
              <div className="bsg-concept-row">
                <span className="bsg-concept-emoji">📐</span>
                <div className="bsg-concept-text">
                  <strong>EPE = ½ · k · x²</strong><br />
                  More pull (x) = bow bends <strong>more</strong> = energy stored grows by the <em>square</em>
                  {pct > 0 && <> — currently at <strong style={{ color: '#f97316' }}>{Math.round(pct * pct / 100)}% stored energy</strong></>}.
                </div>
              </div>
            </div>

            <div
              className={`bsg-status-tag ${state === 'STRETCHING' ? 'storing' : 'resting'}`}
              style={{ marginTop: 4 }}
            >
              {state === 'STRETCHING' && <span className="bsg-dot" />}
              {state === 'STRETCHING' ? 'Actively Storing PE…' : 'Drag the 3D scene to pull!'}
            </div>

            {isReady && (
              <button className="bsg-btn primary" onClick={() => onAction('next')}>
                🎯 String pulled! → Prepare to Release
              </button>
            )}
          </>
        )}

        {/* ── Step 4: Release ── */}
        {step === 4 && (
          <>
            <p className="bsg-step-body">
              All that Potential Energy is locked in the bent bow. The moment you release the string —
              it all <strong>instantly converts to Kinetic Energy!</strong>
            </p>

            {countdown !== null && (
              <div key={countdown} className="bsg-countdown">
                {countdown === 3 ? 'Ready…' : countdown === 2 ? 'Set…' : 'FIRE! 🏹'}
              </div>
            )}

            {(cdDone || countdown === null) && (
              <button className="bsg-btn danger" onClick={() => onAction('release')}>
                🔥 Release the Arrow!
              </button>
            )}

            <div className="bsg-conservation">
              <div className="law-title">⚡ Law of Conservation of Energy</div>
              PE stored in bow = KE gained by arrow<br />
              <em>(Energy is never created or destroyed — only converted!)</em>
            </div>
          </>
        )}

        {/* ── Step 5: Observe ── */}
        {step === 5 && (
          <>
            <p className="bsg-step-body">Watch what just happened!</p>
            <div className="bsg-obs-list">
              {[
                { icon: '🏹', text: 'Arrow flew off the bow at high speed — that\'s Kinetic Energy!' },
                { icon: '🌿', text: 'Bow shape changed back to normal — it released all stored PE!' },
                { icon: '⚡', text: 'PE → KE conversion happened in a split second at the moment of release!' },
                { icon: '📉', text: 'PE meter dropped to 0; KE meter spiked to maximum!' },
              ].map((o, i) => (
                <div className="bsg-obs-item" key={i}>
                  <span className="bsg-obs-icon">{o.icon}</span>
                  <span>{o.text}</span>
                </div>
              ))}
            </div>
            <button className="bsg-btn primary" onClick={() => onAction('next')}>
              See the Science Explanation →
            </button>
          </>
        )}

        {/* ── Step 6: Explanation ── */}
        {step === 6 && (
          <>
            <div className="bsg-quote">
              "The potential energy stored in the bow due to the <strong>change of shape</strong> is
              thus used in the form of kinetic energy in throwing off the arrow."
              <br /><em>— NCERT Science Textbook</em>
            </div>

            <div className="bsg-energy-flow" style={{ marginTop: 4 }}>
              <div className="bsg-flow-item shape-item">
                <span className="bsg-flow-icon2">🌿</span>
                <span className="bsg-flow-label">Bow<br/>Deforms</span>
              </div>
              <span className="bsg-flow-arrow">→</span>
              <div className="bsg-flow-item pe-item">
                <span className="bsg-flow-icon2">🌀</span>
                <span className="bsg-flow-label">PE<br/>Stored</span>
              </div>
              <span className="bsg-flow-arrow">→</span>
              <div className="bsg-flow-item ke-item">
                <span className="bsg-flow-icon2">⚡</span>
                <span className="bsg-flow-label">KE in<br/>Arrow</span>
              </div>
            </div>

            <div className="bsg-obs-list">
              {[
                { icon: '🌿', text: 'SHAPE CHANGE is the source. The more the bow bends, the more PE stored.' },
                { icon: '⚡', text: 'At release, ALL the PE converts to KE — the arrow moves fast!' },
                { icon: '🏹', text: 'The harder you pull (more stretch), the faster the arrow flies (more KE).' },
                { icon: '🔒', text: 'Total energy is conserved: PE before = KE after (ideal case).' },
              ].map((o, i) => (
                <div className="bsg-obs-item" key={i}>
                  <span className="bsg-obs-icon">{o.icon}</span>
                  <span>{o.text}</span>
                </div>
              ))}
            </div>

            <button className="bsg-btn primary" onClick={() => onAction('next')}>
              Take the Quiz 🧠
            </button>
          </>
        )}

        {/* ── Step 7: Quiz ── */}
        {step === 7 && (
          <>
            <p className="bsg-step-body" style={{ fontWeight: 700, color: '#e2e8f0' }}>
              {QUIZ.question}
            </p>
            <div className="bsg-quiz-opts">
              {QUIZ.options.map(opt => {
                let cls = 'bsg-quiz-btn';
                if (quizSubmitted) {
                  if (opt.id === QUIZ.correct) cls += ' correct';
                  else if (opt.id === quizAnswer) cls += ' wrong';
                } else if (opt.id === quizAnswer) cls += ' selected';
                return (
                  <button key={opt.id} className={cls}
                    onClick={() => !quizSubmitted && setQuizAnswer(opt.id)}
                    disabled={quizSubmitted}
                  >
                    <span className="bsg-quiz-letter">{opt.id.toUpperCase()}</span>
                    {opt.text}
                  </button>
                );
              })}
            </div>
            {!quizSubmitted && (
              <button className="bsg-btn primary" disabled={!quizAnswer} onClick={handleQuizSubmit}>
                Submit Answer
              </button>
            )}
            {quizSubmitted && (
              <>
                <div className={`bsg-quiz-result ${quizAnswer === QUIZ.correct ? 'correct' : 'wrong'}`}>
                  {quizAnswer === QUIZ.correct ? QUIZ.explanation : '❌ Not quite! The energy came from the bow\'s shape change — PE stored by bending.'}
                </div>
                <button className="bsg-btn primary" onClick={() => onAction('next')}>
                  Finish Experiment 🏅
                </button>
              </>
            )}
          </>
        )}

        {/* ── Step 8: Complete ── */}
        {step === 8 && (
          <>
            <div className="bsg-badge">
              <div className="bsg-badge-icon">🏅</div>
              <div className="bsg-badge-title">Energy Explorer!</div>
              <div className="bsg-badge-sub">You understand PE → KE conversion!</div>
            </div>
            <div className="bsg-quote">
              The potential energy stored in the bow due to the change of shape is used
              as kinetic energy to throw off the arrow. <strong>Shape change = stored energy!</strong>
            </div>
            <div className="bsg-obs-list">
              {[
                { icon: '🌿', text: 'Bow bends → stores PE (elastic potential energy)' },
                { icon: '🔥', text: 'More bend = more PE = faster arrow' },
                { icon: '⚡', text: 'Release → PE instantly converts to KE' },
                { icon: '🏹', text: 'Arrow flies — carrying all the converted KE' },
              ].map((o, i) => (
                <div className="bsg-obs-item" key={i}>
                  <span className="bsg-obs-icon">{o.icon}</span>
                  <span>{o.text}</span>
                </div>
              ))}
            </div>
            <button className="bsg-btn primary" onClick={() => onAction('reset')}>
              🔄 Try Again
            </button>
          </>
        )}
      </div>
    </div>
  );
}
