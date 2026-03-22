import { useState, useEffect } from "react";
import "./StepGuide.css";

const STEP_META = {
  0:   { icon: "🌀", title: "Welcome — Elastic Potential Energy" },
  1:   { icon: "🤝", title: "Hold the Slinky" },
  2:   { icon: "↔️", title: "Stretch It Apart!" },
  3:   { icon: "🤔", title: "Make Your Prediction" },
  4:   { icon: "🚀", title: "Release!" },
  5:   { icon: "👀", title: "Observe the Motion" },
  5.5: { icon: "✅", title: "Round Complete!" },
  6:   { icon: "🧠", title: "Final Quiz" },
  7:   { icon: "🏅", title: "Experiment Complete!" },
};

const ROUND_LABELS = ["Round 1 — Short Stretch", "Round 2 — Medium Stretch", "Round 3 — Full Stretch"];

const getPredictions = (round) => {
  if (round === 0) return [
    { id: "correct", text: "It will snap back relatively slowly",  emoji: "🐢" },
    { id: "wrong1",  text: "It will stay stretched in place",  emoji: "😐" },
    { id: "wrong2",  text: "It will snap back incredibly fast", emoji: "🚀" }
  ];
  if (round === 1) return [
    { id: "wrong1",  text: "It will move back SLOWER than Round 1", emoji: "📉" },
    { id: "wrong2",  text: "Same speed as Round 1", emoji: "😐" },
    { id: "correct", text: "It will move back FASTER than Round 1", emoji: "⚡" }
  ];
  return [
    { id: "wrong1",  text: "It will move back SLOWER than Round 2", emoji: "📉" },
    { id: "wrong2",  text: "Same speed as Round 2", emoji: "😐" },
    { id: "correct", text: "Fastest snap-back of all rounds!", emoji: "🔥" }
  ];
};

export default function StepGuide({ step, round, stretchAmount, prediction, currentPreset, totalRounds, onAction, slowMotion, score }) {
  const meta        = STEP_META[step] || STEP_META[0];
  const pct         = Math.round(stretchAmount * 100);
  const floorStep   = Math.floor(step);
  const totalPips   = 6;
  const progressPip = Math.min(floorStep, totalPips);
  const atTarget    = stretchAmount >= currentPreset.amount - 0.05;
  const nearTarget  = stretchAmount >= currentPreset.amount - 0.18;

  // Countdown state for step 4
  const [countdown, setCountdown] = useState(null);
  const [cdDone, setCdDone] = useState(false);

  useEffect(() => {
    if (step === 4) {
      setCountdown(3);
      setCdDone(false);
      const t1 = setTimeout(() => setCountdown(2), 900);
      const t2 = setTimeout(() => setCountdown(1), 1800);
      const t3 = setTimeout(() => { setCountdown(null); setCdDone(true); }, 2700);
      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    } else {
      setCountdown(null);
      setCdDone(false);
    }
  }, [step]);

  return (
    <div className="step-guide">
      {/* Round badge */}
      {step > 0 && step < 6 && (
        <div className="sg-round-badge" style={{ background: currentPreset.color + "22", border: `1px solid ${currentPreset.color}55` }}>
          <span style={{ color: currentPreset.color }}>{currentPreset.emoji}</span>
          <span style={{ color: currentPreset.color, fontWeight: 700 }}>{ROUND_LABELS[round]}</span>
        </div>
      )}

      {/* Progress pips */}
      <div className="sg-header">
        <div className="sg-pips">
          {Array.from({ length: totalPips }).map((_, i) => (
            <div key={i} className={`sg-pip${i < progressPip ? " done" : ""}${i === progressPip ? " active" : ""}`} />
          ))}
        </div>
        <span className="sg-counter">Round {round + 1} / {totalRounds}</span>
      </div>

      {/* Card */}
      <div className={`sg-card${step === 2 && nearTarget && !atTarget ? " charging" : ""}${step === 2 && atTarget ? " ready" : ""}`}>
        <div className="sg-icon">{meta.icon}</div>
        <h2 className="sg-title">{meta.title}</h2>

        {/* ── Step 0: Intro ── */}
        {step === 0 && (
          <>
            <p className="sg-body">
              Two students use a Slinky to understand how energy is stored and released. <strong>Varun</strong> stands at a starting point holding one end, while <strong>Kiran</strong> walks backward to stretch it. You'll predict which stretch makes it move back faster and earn points!
            </p>

            {/* EPE Formula intro card */}
            <div className="sg-formula-card" style={{ padding: "16px", textAlign: "left" }}>
              <div className="sg-formula-label" style={{ textAlign: "center", marginBottom: "8px" }}>The Core Concept</div>
              <div className="sg-formula-eq" style={{ marginBottom: "12px", textAlign: "center", fontSize: "1.25rem" }}>Elastic Energy = ½ × Stiffness × (Stretch)²</div>
              <div style={{ textAlign: "center", fontSize: "0.9rem", color: "#94a3b8", marginBottom: "12px" }}><i>(Often written as EPE = ½ · k · x²)</i></div>
              <ul className="sg-formula-desc" style={{ listStyleType: "none", margin: "0 0 12px 0", paddingLeft: "12px", color: "#cbd5e1", lineHeight: "1.5" }}>
                <li style={{marginBottom: "4px"}}><strong className="sg-var" style={{ color: "#fff", background: "rgba(255,255,255,0.1)", padding: "2px 6px", borderRadius: "4px" }}>EPE</strong> = Elastic Potential Energy</li>
                <li style={{marginBottom: "4px"}}><strong className="sg-var" style={{ color: "#fff", background: "rgba(255,255,255,0.1)", padding: "2px 6px", borderRadius: "4px" }}>k</strong>   = Spring stiffness</li>
                <li style={{marginBottom: "4px"}}><strong className="sg-var" style={{ color: "#fff", background: "rgba(255,255,255,0.1)", padding: "2px 6px", borderRadius: "4px" }}>x</strong>   = Stretch distance</li>
              </ul>
              <div className="sg-formula-note" style={{ lineHeight: "1.4", background: "rgba(250, 204, 21, 0.15)", borderLeft: "4px solid #facc15", padding: "10px", borderRadius: "0 6px 6px 0", color: "#fef08a", marginTop: "12px", fontSize: "0.9rem" }}>
                Notice the <strong style={{ color: "#facc15", fontSize: "1.1em" }}>x²</strong>! This means if Kiran pulls it twice as far, it remarkably stores <strong>four times</strong> the returning energy!
              </div>
            </div>

            <div className="sg-rounds-preview">
              <div className="sg-round-chip" style={{ color: "#4ade80" }}>🔹 Short</div>
              <div className="sg-round-chip" style={{ color: "#facc15" }}>🔶 Medium</div>
              <div className="sg-round-chip" style={{ color: "#f97316" }}>🔴 Full</div>
            </div>
            <button className="sg-btn" onClick={() => onAction("next")}>Start Experiment 🚀</button>
          </>
        )}

        {/* ── Step 1: Hold ends ── */}
        {step === 1 && (
          <>
            <p className="sg-body">
              <span style={{ color: "#38bdf8" }}>🟦 Varun</span> stands at the starting point holding one end firmly. <span style={{ color: "#fb7185" }}>🟥 Kiran</span> holds the other end.
            </p>
            <p className="sg-body" style={{ marginTop: 4 }}>
              This round you'll stretch to <strong style={{ color: currentPreset.color }}>{currentPreset.label} ({Math.round(currentPreset.amount * 100)}%)</strong>.
            </p>
            <div className="sg-tip-box">
              💡 <strong>Remember:</strong> Stretching stores energy in the coils — the further you pull, the more energy is stored!
            </div>
            <button className="sg-btn" onClick={() => onAction("next")}>Both holding → Move apart!</button>
          </>
        )}

        {/* ── Step 2: Stretch ── */}
        {step === 2 && (
          <>
            <p className="sg-body">Kiran slowly walks backward to stretch the slinky. Pull the slinky to the <strong style={{ color: currentPreset.color }}>{currentPreset.label}</strong> target!</p>

            {/* Charging status label */}
            {!atTarget && (
              <div className={`sg-charging-label${nearTarget ? " near" : ""}`} style={{ color: nearTarget ? currentPreset.color : "#64748b" }}>
                {nearTarget ? "⚡ Almost there — keep pulling!" : "↔️ Slowly stretch apart…"}
              </div>
            )}

            <div className="sg-slider-wrap">
              <label className="sg-slider-label">
                Stretch Amount
                <span className="sg-slider-pct" style={{ color: atTarget ? currentPreset.color : "#94a3b8" }}>
                  {pct}%
                </span>
              </label>
              <input
                type="range" min={0} max={100}
                value={pct}
                onChange={e => onAction("stretch", e.target.value / 100)}
                className="sg-slider"
                style={{ "--accent": currentPreset.color }}
              />
              {/* Target indicator */}
              <div className="sg-target-row">
                <span style={{ color: "#64748b", fontSize: 12 }}>Target:</span>
                <div className="sg-target-bar">
                  <div className="sg-target-marker" style={{ left: `${Math.round(currentPreset.amount * 100)}%`, background: currentPreset.color }} />
                  <div className="sg-target-fill" style={{ width: `${pct}%`, background: currentPreset.color + "66" }} />
                </div>
                <span style={{ color: currentPreset.color, fontSize: 12, fontWeight: 700 }}>{Math.round(currentPreset.amount * 100)}%</span>
              </div>

              {/* EPE live readout */}
              <div className="sg-epe-live">
                <span className="sg-epe-label">Stored Energy:</span>
                <div className="sg-epe-bar">
                  <div className="sg-epe-fill" style={{ width: `${Math.min(100, pct * pct / 100)}%`, background: currentPreset.color }} />
                </div>
                <span className="sg-epe-note">{pct === 0 ? "none" : pct < 40 ? "low" : pct < 70 ? "medium" : "HIGH!"}</span>
              </div>

              {atTarget && (
                <button className="sg-btn pulse" onClick={() => onAction("next")}>
                  🎯 Target reached! Observe →
                </button>
              )}
            </div>
          </>
        )}

        {/* ── Step 3: Predict ── */}
        {step === 3 && (
          <>
            <p className="sg-body" style={{ marginBottom: 10 }}>
              🤔 Before it is released — <strong>predict how quickly the slinky will move back to its original shape.</strong> Each correct prediction earns a point!
            </p>
            <div className="sg-prediction-opts">
              {getPredictions(round).map(p => (
                <button
                  key={p.id}
                  className={`sg-pred-btn${prediction === p.id ? " selected" : ""}`}
                  onClick={() => onAction("predict", p.id)}
                  disabled={!!prediction}
                >
                  <span className="sg-pred-emoji">{p.emoji}</span>
                  <span>{p.text}</span>
                </button>
              ))}
            </div>
            {prediction && (
              <div className={`sg-pred-result ${prediction === "correct" ? "correct" : "wrong"}`}>
                {prediction === "correct"
                  ? "✅ Great prediction! +1 point — now get ready for the signal!"
                  : "🔁 Let's see what really happens when released!"}
              </div>
            )}
          </>
        )}

        {/* ── Step 4: Release ── */}
        {step === 4 && (
          <>
            <p className="sg-body">Wait for the teacher's signal, then Kiran will carefully release the slinky!</p>

            {/* Countdown display */}
            {countdown !== null && (
              <div key={countdown} className="sg-countdown" style={{ fontSize: countdown === 1 ? '5rem' : '4rem' }}>
                {countdown === 3 ? "Ready..." : countdown === 2 ? "Set..." : "Start!"}
              </div>
            )}

            {cdDone && (
              <button className="sg-btn danger release-pulse" onClick={() => onAction("release")}>
                Teacher says: "Start!" 🚀
              </button>
            )}

            {!cdDone && countdown === null && (
              <button className="sg-btn danger release-pulse" onClick={() => onAction("release")}>
                Teacher says: "Start!" 🚀
              </button>
            )}
          </>
        )}

        {/* ── Step 5: Observe ── */}
        {step === 5 && (
          <>
            <p className="sg-body">Watch closely! The slinky snaps back and oscillates. <strong>Elastic PE → Kinetic Energy!</strong></p>
            <div className="sg-observing">
              <span className="sg-blink">●</span> Observing…
            </div>

            {/* Slow-motion button */}
            <button
              className={`sg-btn sm${slowMotion ? " sm-active" : ""}`}
              onClick={() => onAction("slow-mo")}
            >
              {slowMotion ? "⏩ Normal Speed" : "🐢 Slow Motion Replay"}
            </button>

            <div className="sg-obs-fact">
              <span>⚡</span>
              <span>Elastic PE in the coils is converting into kinetic energy (motion). Notice the oscillation — the slinky overshoots, then bounces back!</span>
            </div>
          </>
        )}

        {/* ── Step 5.5: Round done ── */}
        {step === 5.5 && (
          <>
            {/* Show wrong prediction consequence */
             prediction !== "correct" && (
              <div className="sg-compare-hint" style={{ background: "rgba(239, 68, 68, 0.15)", borderLeftColor: "#ef4444", color: "#fca5a5", marginBottom: 12 }}>
                ❌ Incorrect prediction! You lost 20 points! Note how the slinky actually moves based on Elastic PE!
              </div>
            )}
            
            {/* Wrong Prediction Barrier */}
            {prediction !== "correct" ? (
               <>
                  <p className="sg-body">
                    Oops! You predicted incorrectly. You must restart the game from Round 1 to try again!
                  </p>
                  <button className="sg-btn danger release-pulse" onClick={() => onAction("restart-wrong")}>
                    Restart from Round 1 🔄
                  </button>
               </>
            ) : score < (round + 1) * 110 ? (
               <>
                  <p className="sg-body">
                    Oops! You only have <strong>{score} pts</strong>, but you need at least <strong>{(round + 1) * 110} pts</strong> to advance to the next round.
                  </p>
                  <button className="sg-btn danger release-pulse" onClick={() => onAction("restart-wrong")}>
                    Restart to Earn More Points 🔄
                  </button>
               </>
            ) : (
               <>
                 <p className="sg-body">
                   {round < 2
                     ? `Round ${round + 1} complete! Next: try a ${["Medium", "Full"][round]} stretch and compare the motion.`
                     : "All 3 rounds complete! Time for the final quiz."}
                 </p>
                 <div className="sg-compare-hint">
                   💡 More stretch = more stored energy = faster return!
                 </div>
                 <button className="sg-btn" onClick={() => onAction("next-round")}>
                   {round < 2 ? `▶ Start Round ${round + 2}` : "Go to Final Quiz 🧠"}
                 </button>
               </>
            )}
          </>
        )}

        {step === 6 && (
          <p className="sg-body">Answer the quiz question on the right panel to complete your experiment!</p>
        )}

        {step === 7 && (
          <>
            <p className="sg-body">You completed all 3 rounds and the quiz! You've learned that stretching stores energy in the slinky, and when released, it changes into motion.</p>
            <button className="sg-btn" onClick={() => onAction("reset")}>🔄 Try Again</button>
          </>
        )}
      </div>
    </div>
  );
}
