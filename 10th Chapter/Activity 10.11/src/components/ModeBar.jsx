import "./ModeBar.css";

const MODES = [
  { id: "free",      label: "🎮 Free Play",    desc: "Explore freely" },
  { id: "guided",    label: "📚 Guided Tour",  desc: "Learn step by step" },
  { id: "challenge", label: "🏆 Challenges",   desc: "Test your skills" },
];

export default function ModeBar({ mode, onChange, score, badges }) {
  return (
    <div className="mode-bar">
      <div className="mode-tabs">
        {MODES.map((m) => (
          <button
            key={m.id}
            className={`mode-tab ${mode === m.id ? "active" : ""}`}
            onClick={() => onChange(m.id)}
          >
            <span className="mode-tab-label">{m.label}</span>
            <span className="mode-tab-desc">{m.desc}</span>
          </button>
        ))}
      </div>
      <div className="mode-score">
        <span className="score-icon">⭐</span>
        <span className="score-val">{score}</span>
        {badges.length > 0 && (
          <div className="badge-row">
            {badges.slice(-3).map((b, i) => (
              <span key={i} className="badge-pill" title={b.name}>{b.icon}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
