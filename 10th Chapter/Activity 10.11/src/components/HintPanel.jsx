import "./HintPanel.css";

const HINTS = [
  {
    icon: "🏋️",
    title: "Lifting Stores Energy",
    body: "When you lift an object, you do work against gravity. This work is stored as Gravitational Potential Energy (GPE).",
  },
  {
    icon: "📐",
    title: "Formula: W = mgh",
    body: "Work done = Mass × Gravity × Height\nm = 1 kg  |  g = 9.8 m/s²  |  h = height in metres",
  },
  {
    icon: "⬇️",
    title: "Falling Converts Energy",
    body: "When released, GPE converts into Kinetic Energy (KE). At the bottom all GPE has become KE = ½mv².",
  },
  {
    icon: "📊",
    title: "More Height = More Energy",
    body: "Doubling the height doubles the energy stored. Try Compare mode to see two heights side by side!",
  },
];

export default function HintPanel({ onClose }) {
  return (
    <div className="hint-overlay" onClick={onClose}>
      <div className="hint-panel" onClick={(e) => e.stopPropagation()}>
        <div className="hint-header">
          <span className="hint-title">💡 Science Hints</span>
          <button className="hint-close" onClick={onClose}>✕</button>
        </div>
        <div className="hint-grid">
          {HINTS.map((h, i) => (
            <div className="hint-card" key={i}>
              <span className="hint-icon">{h.icon}</span>
              <strong className="hint-card-title">{h.title}</strong>
              <p className="hint-card-body">{h.body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
