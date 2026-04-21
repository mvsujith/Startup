/**
 * GuidedOverlay.jsx — Phase 3 Guided Learning Mode
 *
 * A beautiful bottom-dock overlay card that walks students
 * through each component of the camphor sublimation experiment
 * step-by-step, with embedded actions and progress tracking.
 */

import { useEffect, useRef } from 'react';
import './GuidedOverlay.css';

// ── Step definitions ─────────────────────────────────────────────────────────
export const GUIDE_STEPS = [
  {
    id     : 'welcome',
    icon   : '🔬',
    title  : 'Camphor Sublimation Experiment',
    body   : 'In this experiment, we will observe camphor changing directly from a solid to a vapour without passing through a liquid state. This is called sublimation.',
    action : null,
    hint   : null,
  },
  {
    id     : 'burner',
    icon   : '🔥',
    title  : 'The Spirit Burner',
    body   : 'A spirit burner (alcohol lamp) sits beneath the tripod stand. It provides gentle, controlled heat — just enough to cause sublimation without burning the camphor.',
    action : null,
    hint   : 'Look at the glass bottle with a wick at the bottom of the setup.',
  },
  {
    id     : 'stand',
    icon   : '⚙️',
    title  : 'Tripod Stand & Wire Gauze',
    body   : 'An iron tripod stand holds the apparatus. A wire gauze rests on the ring to distribute heat evenly from the burner to the china dish above it.',
    action : null,
    hint   : 'Notice the three legs spreading outward and the flat gauze mesh.',
  },
  {
    id     : 'dish',
    icon   : '🍽️',
    title  : 'The China Dish',
    body   : 'A shallow porcelain china dish is placed on the wire gauze. It holds the crushed camphor crystals. Porcelain conducts heat well and withstands high temperatures.',
    action : null,
    hint   : 'The wide white dish sits on the wire gauze at the top of the stand.',
  },
  {
    id     : 'camphor',
    icon   : '🧊',
    title  : 'Camphor Crystals',
    body   : 'Camphor (C₁₀H₁₆O) is a white waxy solid. It is crushed into small pieces and placed in the china dish. It has a strong, distinct smell.',
    action : null,
    hint   : 'The small white chunks inside the dish are camphor crystals.',
  },
  {
    id     : 'funnel',
    icon   : '🔺',
    title  : 'The Inverted Funnel',
    body   : 'A laboratory funnel is placed upside-down (inverted) over the china dish. The wide opening faces downward, trapping the camphor vapour and directing it up through the stem.',
    action : null,
    hint   : 'The transparent cone shape over the dish — wide at the bottom, narrow stem at the top.',
  },
  {
    id     : 'cotton',
    icon   : '☁️',
    title  : 'The Cotton Plug',
    body   : 'A loose cotton plug is placed at the open tip of the funnel stem. It allows air to flow through but prevents solid camphor crystals from escaping, collecting them instead.',
    action : null,
    hint   : 'The small white fluffy piece at the very top of the funnel stem.',
  },
  {
    id     : 'heat',
    icon   : '🌡️',
    title  : 'Time to Heat!',
    body   : 'Now we apply gentle heat using the spirit burner. Click "🔥 Heat Slowly" to begin. Watch carefully — camphor will soon start to change!',
    action : 'heat',
    hint   : 'Click the Heat Slowly button to start the experiment.',
  },
  {
    id     : 'observe',
    icon   : '👁️',
    title  : 'Observe the Sublimation!',
    body   : 'Camphor is sublimating — changing directly from solid → vapour. White vapour rises inside the funnel. On the cooler funnel walls, vapour turns back into white crystals (deposition).',
    action : null,
    hint   : 'Watch the white vapour particles rise and crystals form on the funnel walls.',
  },
  {
    id     : 'quiz',
    icon   : '📝',
    title  : 'Ready for the Science Check?',
    body   : 'Great observation! The experiment is complete. Test your understanding with 3 quick questions about what you just saw.',
    action : 'quiz',
    hint   : null,
  },
];

// ── Component ────────────────────────────────────────────────────────────────

export default function GuidedOverlay({
  step,
  totalSteps,
  heating,
  progress,
  onNext,
  onPrev,
  onSkip,
  onHeat,
  onStartQuiz,
}) {
  const cardRef    = useRef(null);
  const current    = GUIDE_STEPS[step] ?? GUIDE_STEPS[0];
  const isLast     = step === GUIDE_STEPS.length - 1;
  const isFirst    = step === 0;
  const isHeatStep = current.action === 'heat';
  const isQuizStep = current.action === 'quiz';

  // Animate in when step changes
  useEffect(() => {
    if (!cardRef.current) return;
    cardRef.current.classList.remove('guide-card--in');
    void cardRef.current.offsetWidth; // reflow
    cardRef.current.classList.add('guide-card--in');
  }, [step]);

  return (
    <div className="guided-overlay">
      {/* Progress dots */}
      <div className="guide-dots">
        {GUIDE_STEPS.map((_, i) => (
          <span
            key={i}
            className={`guide-dot ${i === step ? 'guide-dot--active' : i < step ? 'guide-dot--done' : ''}`}
          />
        ))}
      </div>

      {/* Step card */}
      <div className="guide-card" ref={cardRef}>
        {/* Left: icon + count */}
        <div className="guide-icon-wrap">
          <span className="guide-icon">{current.icon}</span>
          <span className="guide-count">{step + 1} / {totalSteps}</span>
        </div>

        {/* Centre: text */}
        <div className="guide-body">
          <h3 className="guide-title">{current.title}</h3>
          <p  className="guide-desc">{current.body}</p>
          {current.hint && (
            <p className="guide-hint">💡 {current.hint}</p>
          )}

          {/* Inline heat progress bar (only on observe step) */}
          {step === 8 && (
            <div className="guide-progress-wrap">
              <div className="guide-progress-bar-track">
                <div className="guide-progress-bar-fill" style={{ width: `${progress * 100}%` }} />
              </div>
              <span className="guide-progress-label">{Math.round(progress * 100)}% sublimated</span>
            </div>
          )}
        </div>

        {/* Right: action buttons */}
        <div className="guide-actions">
          {isHeatStep && !heating && (
            <button id="guide-btn-heat" className="guide-btn guide-btn--heat" onClick={onHeat}>
              🔥 Heat Slowly
            </button>
          )}
          {isHeatStep && heating && (
            <button className="guide-btn guide-btn--heating" disabled>
              🌡️ Heating…
            </button>
          )}

          {isQuizStep && (
            <button id="guide-btn-quiz" className="guide-btn guide-btn--quiz" onClick={onStartQuiz}>
              📝 Start Quiz
            </button>
          )}

          {!isHeatStep && !isQuizStep && (
            <>
              {!isFirst && (
                <button className="guide-btn guide-btn--prev" onClick={onPrev}>← Back</button>
              )}
              <button
                id={`guide-next-${step}`}
                className="guide-btn guide-btn--next"
                onClick={onNext}
              >
                {isLast ? 'Finish' : 'Next →'}
              </button>
            </>
          )}

          {isHeatStep && (
            <button className="guide-btn guide-btn--prev" onClick={step > 0 ? onPrev : undefined}>
              ← Back
            </button>
          )}

          {/* Skip tour link */}
          {step < 7 && (
            <button className="guide-skip" onClick={onSkip}>Skip Tour</button>
          )}
        </div>
      </div>
    </div>
  );
}
