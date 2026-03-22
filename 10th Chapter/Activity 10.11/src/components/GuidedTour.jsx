import { useState } from "react";
import "./GuidedTour.css";

const STEPS = [
  {
    icon: "🔬",
    title: "Welcome to the Physics Lab!",
    body: "In this experiment, you'll discover how lifting an object stores invisible energy called Gravitational Potential Energy (GPE).",
    highlight: null,
    action: null,
  },
  {
    icon: "📦",
    title: "Meet the Object",
    body: "The red block has a mass of 1 kg. When you lift it, you're doing work against gravity (g = 9.8 m/s²). The higher you lift it, the more energy gets stored inside it!",
    highlight: null,
    action: null,
  },
  {
    icon: "📐",
    title: "Set a Height",
    body: "Use the TARGET HEIGHT slider on the right panel. Drag it to 4 m. You'll see the value update in real-time.",
    highlight: "height-slider",
    action: null,
  },
  {
    icon: "⬆️",
    title: "Lift the Object!",
    body: "Click the ⬆ Lift button. Watch the block rise smoothly to 4 m. Notice the cyan glow on the pole — that's how high the energy reaches!",
    highlight: "btn-lift",
    action: null,
  },
  {
    icon: "⚡",
    title: "Energy is Stored!",
    body: "GPE = m × g × h = 1 × 9.8 × 4 = 39.2 J\n\nThe energy bar on the right fills up — that 39.2 Joules of energy is now locked inside the block, waiting to be released.",
    highlight: null,
    action: null,
  },
  {
    icon: "⬇️",
    title: "Release — Watch Energy Convert!",
    body: "Click ⬇ Release. The block falls under gravity. As it drops, GPE converts to Kinetic Energy (KE = ½mv²). At the bottom, all energy becomes motion!",
    highlight: "btn-release",
    action: null,
  },
  {
    icon: "🎓",
    title: "You've Learned the Basics!",
    body: "✅ Lifting stores GPE\n✅ GPE = mgh\n✅ Releasing converts GPE → KE\n✅ Higher = more energy\n\nNow try the Challenges to test your knowledge!",
    highlight: null,
    action: "done",
  },
];

export default function GuidedTour({ onComplete, phase, currentHeight }) {
  const [step, setStep] = useState(0);
  const curr = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const next = () => {
    if (isLast) { onComplete(); return; }
    setStep((s) => s + 1);
  };
  const prev = () => setStep((s) => Math.max(0, s - 1));

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="guided-overlay">
      <div className="guided-card">
        {/* Progress bar */}
        <div className="guided-progress-track">
          <div className="guided-progress-fill" style={{ width: `${progress}%` }} />
        </div>

        {/* Step counter */}
        <div className="guided-step-row">
          <span className="guided-step-label">Step {step + 1} of {STEPS.length}</span>
          <button className="guided-skip" onClick={onComplete}>Skip Tour</button>
        </div>

        {/* Content */}
        <div className="guided-content">
          <div className="guided-icon">{curr.icon}</div>
          <div className="guided-text">
            <h2 className="guided-title">{curr.title}</h2>
            <p className="guided-body">{curr.body}</p>
          </div>
        </div>

        {/* Live GPE display (if relevant step) */}
        {step >= 4 && currentHeight > 0 && (
          <div className="guided-live">
            <span>📏 h = {currentHeight} m</span>
            <span>⚡ GPE = {(1 * 9.8 * currentHeight).toFixed(1)} J</span>
          </div>
        )}

        {/* Navigation */}
        <div className="guided-nav">
          <button className="guided-btn guided-btn-back" onClick={prev} disabled={step === 0}>
            ← Back
          </button>

          {/* Step dots */}
          <div className="guided-dots">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={`guided-dot ${i === step ? "active" : i < step ? "done" : ""}`}
                onClick={() => setStep(i)}
              />
            ))}
          </div>

          <button className="guided-btn guided-btn-next" onClick={next}>
            {isLast ? "🏆 Start Challenges!" : "Next →"}
          </button>
        </div>
      </div>
    </div>
  );
}
