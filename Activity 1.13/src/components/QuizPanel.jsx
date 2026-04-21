/**
 * QuizPanel.jsx — Phase 3 Science Quiz
 *
 * 3-question MCQ modal overlaid on the experiment scene.
 * Tests student understanding of sublimation concepts.
 */

import { useState } from 'react';
import './QuizPanel.css';

// ── Questions ────────────────────────────────────────────────────────────────
const QUESTIONS = [
  {
    id   : 'q1',
    text : 'What happens to camphor when it is heated?',
    icon : '🌡️',
    options: [
      { key: 'a', label: 'It melts into a liquid first' },
      { key: 'b', label: 'It changes directly from solid to vapour' },
      { key: 'c', label: 'It catches fire and burns' },
    ],
    correct : 'b',
    explain : 'Camphor sublimates — it converts directly from solid to vapour without passing through the liquid state.',
  },
  {
    id   : 'q2',
    text : 'Where do white camphor crystals re-appear during this experiment?',
    icon : '❄️',
    options: [
      { key: 'a', label: 'On the cotton plug at the stem top' },
      { key: 'b', label: 'On the walls of the inverted funnel' },
      { key: 'c', label: 'Back in the china dish' },
    ],
    correct : 'b',
    explain : 'Camphor vapour rises and hits the cooler inner walls of the funnel, where it re-solidifies (deposition) forming white crystals.',
  },
  {
    id   : 'q3',
    text : 'What is the scientific name for the process where a solid changes directly to a vapour?',
    icon : '🔬',
    options: [
      { key: 'a', label: 'Evaporation' },
      { key: 'b', label: 'Condensation' },
      { key: 'c', label: 'Sublimation' },
    ],
    correct : 'c',
    explain : 'Sublimation is the process where a substance changes directly from solid to gas (vapour) without becoming a liquid. Camphor is a classic example!',
  },
];

// ── Component ────────────────────────────────────────────────────────────────
export default function QuizPanel({ onComplete }) {
  const [answers,   setAnswers]   = useState({ q1: null, q2: null, q3: null });
  const [submitted, setSubmitted] = useState(false);

  const allAnswered = Object.values(answers).every(v => v !== null);

  const handleSelect = (qid, key) => {
    if (submitted) return;
    setAnswers(prev => ({ ...prev, [qid]: key }));
  };

  const handleSubmit = () => {
    if (!allAnswered || submitted) return;
    setSubmitted(true);
  };

  const handleFinish = () => {
    const score = QUESTIONS.filter(q => answers[q.id] === q.correct).length;
    onComplete(score, answers);
  };

  return (
    <div className="quiz-backdrop">
      <div className="quiz-panel">

        {/* Header */}
        <div className="quiz-header">
          <span className="quiz-header-icon">🧪</span>
          <div>
            <h2 className="quiz-heading">Quick Science Check!</h2>
            <p  className="quiz-sub">Answer all 3 questions and see how well you observed.</p>
          </div>
          {submitted && (
            <div className="quiz-score-badge">
              {QUESTIONS.filter(q => answers[q.id] === q.correct).length} / 3
            </div>
          )}
        </div>

        {/* Questions */}
        <div className="quiz-questions">
          {QUESTIONS.map((q, idx) => {
            const chosen  = answers[q.id];
            const correct = q.correct;
            return (
              <div key={q.id} className={`quiz-q ${submitted ? 'quiz-q--submitted' : ''}`}>
                <p className="quiz-q-text">
                  <span className="quiz-q-num">{idx + 1}</span>
                  <span className="quiz-q-icon">{q.icon}</span>
                  {q.text}
                </p>
                <div className="quiz-options">
                  {q.options.map(opt => {
                    let cls = 'quiz-opt';
                    if (chosen === opt.key) cls += ' quiz-opt--chosen';
                    if (submitted && opt.key === correct) cls += ' quiz-opt--correct';
                    if (submitted && chosen === opt.key && opt.key !== correct) cls += ' quiz-opt--wrong';
                    return (
                      <button
                        key={opt.key}
                        className={cls}
                        onClick={() => handleSelect(q.id, opt.key)}
                      >
                        <span className="quiz-opt-key">{opt.key.toUpperCase()}</span>
                        <span className="quiz-opt-label">{opt.label}</span>
                        {submitted && opt.key === correct && <span className="quiz-tick">✓</span>}
                        {submitted && chosen === opt.key && opt.key !== correct && <span className="quiz-cross">✗</span>}
                      </button>
                    );
                  })}
                </div>
                {submitted && (
                  <p className="quiz-explain">
                    <strong>{chosen === correct ? '✅ Correct! ' : '❌ '}</strong>
                    {q.explain}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer actions */}
        <div className="quiz-footer">
          {!submitted ? (
            <button
              id="quiz-submit"
              className={`quiz-btn quiz-btn--submit ${allAnswered ? '' : 'quiz-btn--disabled'}`}
              onClick={handleSubmit}
              disabled={!allAnswered}
            >
              {allAnswered ? '✅ Submit Answers' : `Answer all questions (${Object.values(answers).filter(Boolean).length}/3)`}
            </button>
          ) : (
            <button id="quiz-see-results" className="quiz-btn quiz-btn--results" onClick={handleFinish}>
              🏆 See Your Results →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
