import { useState } from 'react';
import './ExperimentPanel.css';

const QUIZ = {
  question: "Where did the kinetic energy (movement) come from when you released the slinky?",
  options: [
    { id: "a", text: "Gravity pulled it down" },
    { id: "b", text: "Elastic potential energy stored in the stretched slinky" },
    { id: "c", text: "The air pressure in the room" },
    { id: "d", text: "Energy was created when we let go" },
  ],
  correct: "b",
  explanation: "✅ Correct! The stretching stored elastic PE in the coils. On release, it converted to kinetic energy — the Law of Conservation of Energy!",
};

const AUTO_OBS = [
  { minStep: 2,   minRound: 0, icon: "↔️", text: "Slinky stretched — coils spaced apart" },
  { minStep: 3,   minRound: 0, icon: "⚡", text: "Elastic PE stored in the stretched coils" },
  { minStep: 5,   minRound: 0, icon: "💫", text: "Released! Slinky snaps back — energy → motion" },
  { minStep: 5.5, minRound: 1, icon: "📊", text: "More stretch → faster snap-back observed" },
  { minStep: 5.5, minRound: 2, icon: "🔥", text: "Full stretch = maximum stored energy & fastest return" },
];

const REAL_WORLD = [
  { emoji: "🏹", name: "Archery Bow", desc: "Pulling the bowstring stores EPE that launches the arrow" },
  { emoji: "🤸", name: "Bungee Cord", desc: "Stretching a bungee cord stores EPE released on rebound" },
  { emoji: "🎯", name: "Rubber Band", desc: "A stretched rubber band stores EPE → snaps back when released" },
  { emoji: "🚗", name: "Car Suspension", desc: "Springs absorb road bumps by storing & releasing EPE" },
];

export default function ExperimentPanel({ step, round, score, roundResults, currentPreset, stretchPresets, correctStreak, onReset, onQuizAnswered }) {
  const [quizAnswer,    setQuizAnswer]    = useState(null);
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  const visibleObs = AUTO_OBS.filter(o =>
    (step > o.minStep || (step === o.minStep && round >= o.minRound))
  );

  const handleSubmit = () => {
    if (!quizAnswer || quizSubmitted) return;
    setQuizSubmitted(true);
    onQuizAnswered(quizAnswer === QUIZ.correct);
  };

  return (
    <div className="exp-panel">
      <div className="ep-header">
        <span className="ep-icon">🔬</span>
        <h2 className="ep-title">Lab Panel</h2>
      </div>

      {/* Concept */}
      <div className="ep-concept-card">
        <div className="ep-concept-icon">🌀</div>
        <p className="ep-concept-text">
          <strong>Elastic Potential Energy</strong> is stored in a deformed spring. Released as <strong>kinetic energy</strong> when it returns to its natural shape.
        </p>
        {step >= 2 && (
          <div className="ep-formula-badge" style={{marginTop: "12px", textAlign: "left", padding: "12px", background: "rgba(0,0,0,0.2)", borderRadius: "8px", flexDirection: "column", alignItems: "flex-start", gap: "8px", width: "100%"}}>
            <div style={{fontSize: "1.1rem", fontWeight: "bold", color: "#facc15", textAlign: "center", width: "100%"}}>Elastic Energy = ½ × Stiffness × (Stretch)²</div>
            <div style={{ textAlign: "center", fontSize: "0.85rem", color: "#94a3b8", width: "100%", marginBottom: "8px" }}><i>(Often written as EPE = ½ · k · x²)</i></div>
            <ul style={{fontSize: "0.85rem", margin: 0, paddingLeft: "16px", color: "#cbd5e1", lineHeight: "1.4"}}>
              <li style={{marginBottom: "4px"}}><strong style={{color: "#f8fafc"}}>EPE</strong>: Elastic Potential Energy</li>
              <li style={{marginBottom: "4px"}}><strong style={{color: "#f8fafc"}}>k</strong>: Spring constant (stiffness)</li>
              <li><strong style={{color: "#f8fafc"}}>x²</strong>: Stretch distance squared. <span style={{color: "#facc15"}}>Pulling it twice as far stores 4x the energy!</span></li>
            </ul>
          </div>
        )}
      </div>

      {/* Round tracker */}
      <div className="ep-section">
        <h3 className="ep-section-title"><span>🎮</span> Rounds</h3>
        <div className="ep-rounds">
          {stretchPresets.map((preset, i) => {
            const done   = i < round || (i === round && step >= 5.5);
            const active = i === round && step > 0 && step < 5.5;
            return (
              <div key={i} className={`ep-round-chip${done ? " done" : ""}${active ? " active" : ""}`}
                style={{ borderColor: active || done ? preset.color : "rgba(255,255,255,0.08)",
                         color: active || done ? preset.color : "#475569" }}>
                {done ? "✓" : preset.emoji} {preset.label}
              </div>
            );
          })}
        </div>
      </div>

      {/* Observations */}
      <div className="ep-section">
        <h3 className="ep-section-title"><span>👁️</span> Observations</h3>
        <div className="ep-obs-list">
          {visibleObs.length === 0 && <p className="ep-empty">Complete steps to log observations…</p>}
          {visibleObs.map((obs, i) => (
            <div key={i} className="ep-obs-item ep-obs-slide">
              <span className="ep-obs-icon">{obs.icon}</span>
              <span className="ep-obs-text">{obs.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Comparison table */}
      {roundResults.length > 0 && (
        <div className="ep-section">
          <h3 className="ep-section-title"><span>📊</span> Round Comparison</h3>
          <table className="ep-table">
            <thead>
              <tr>
                <th>Round</th>
                <th>Stretch</th>
                <th>Prediction</th>
              </tr>
            </thead>
            <tbody>
              {roundResults.map((r, i) => (
                <tr key={i}>
                  <td style={{ color: r.color }}>{stretchPresets[i]?.emoji} {r.label}</td>
                  <td>{Math.round(r.stretch * 100)}%</td>
                  <td className={r.predictCorrect ? "tc-correct" : "tc-wrong"}>
                    {r.predictCorrect ? "✅ Correct" : "❌ Wrong"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="ep-table-hint">💡 More stretch = more elastic PE = faster return!</p>
        </div>
      )}

      {/* Real World Connections — show after first stretch */}
      {step >= 2 && (
        <div className="ep-section">
          <h3 className="ep-section-title"><span>🌍</span> Real World</h3>
          <div className="ep-realworld-grid">
            {REAL_WORLD.map((rw, i) => (
              <div key={i} className="ep-rw-card">
                <div className="ep-rw-emoji">{rw.emoji}</div>
                <div className="ep-rw-name">{rw.name}</div>
                <div className="ep-rw-desc">{rw.desc}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Combo bonus notice */}
      {correctStreak >= 2 && step < 6 && (
        <div className="ep-combo-banner">
          🔥 {correctStreak}/3 correct predictions! Keep it up for a +50 COMBO BONUS!
        </div>
      )}

      {/* Quiz */}
      {step >= 6 && (
        <div className="ep-section ep-quiz">
          <h3 className="ep-section-title"><span>🧠</span> Final Quiz +20pts</h3>
          <p className="ep-quiz-question">{QUIZ.question}</p>
          <div className="ep-quiz-options">
            {QUIZ.options.map(opt => {
              let cls = "ep-quiz-opt";
              if (quizSubmitted) {
                if (opt.id === QUIZ.correct) cls += " correct";
                else if (opt.id === quizAnswer) cls += " wrong";
              } else if (opt.id === quizAnswer) cls += " selected";
              return (
                <button key={opt.id} className={cls} onClick={() => !quizSubmitted && setQuizAnswer(opt.id)}>
                  <span className="ep-quiz-letter">{opt.id.toUpperCase()}</span>{opt.text}
                </button>
              );
            })}
          </div>
          {!quizSubmitted && (
            <button className="ep-quiz-submit" disabled={!quizAnswer} onClick={handleSubmit}>
              Submit Answer
            </button>
          )}
          {quizSubmitted && (
            <div className={`ep-quiz-result ${quizAnswer === QUIZ.correct ? "correct" : "wrong"}`}>
              {QUIZ.explanation}
            </div>
          )}
        </div>
      )}

      {/* Conclusion */}
      {step >= 7 && (
        <div className="ep-section ep-conclusion">
          <h3 className="ep-section-title">📝 Conclusion</h3>
          <p className="ep-conclusion-text">
            Objects like springs store <strong>elastic potential energy</strong> when stretched. This is released as <strong>kinetic energy</strong> when they spring back. More stretch = more stored energy = greater motion on release.
          </p>
          <div className="ep-badge">
            <div className="ep-badge-icon">🏅</div>
            <div className="ep-badge-label">
              <div className="ep-badge-title">Elastic Energy Explorer</div>
              <div className="ep-badge-score">Final Score: {score} pts</div>
            </div>
          </div>
          <button className="ep-reset-btn" onClick={onReset}>🔄 Try Again</button>
        </div>
      )}
    </div>
  );
}
