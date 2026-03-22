import { useState, useEffect, useRef } from "react";
import { SFX } from "../utils/sounds.js";
import "./ChallengeSystem.css";

const G = 9.8, MASS = 1;

/** All 4 challenge definitions */
export const CHALLENGES = [
  {
    id:        "precision",
    icon:      "🎯",
    title:     "Precision Lift",
    tagline:   "Hit the exact height!",
    color:     "#42a5f5",
    type:      "lift",
    targetH:   5,
    tolerance: 0.6,
    maxScore:  100,
    tip:       "Drag the slider to exactly 5 m, then click Lift.",
    explain:   (h) =>
      `At ${h.toFixed(1)} m, GPE = 1 × 9.8 × ${h.toFixed(1)} = ${(G * h).toFixed(1)} J stored in the block.`,
  },
  {
    id:        "predict",
    icon:      "🔍",
    title:     "Energy Detective",
    tagline:   "Guess the Joules!",
    color:     "#ab47bc",
    type:      "predict",
    targetH:   6,
    options:   ["39.2 J", "58.8 J", "78.4 J", "100 J"],
    correctIdx: 1,
    maxScore:  120,
    tip:       "Calculate W = 1 × 9.8 × 6 before lifting!",
    explain:   () =>
      "W = 1 × 9.8 × 6 = 58.8 J. The formula gives us exactly how much energy is stored.",
  },
  {
    id:      "compare",
    icon:    "⚡",
    title:   "Double Trouble",
    tagline: "Lift low, then lift high!",
    color:   "#66bb6a",
    type:    "compare",
    heights: [3, 6],
    maxScore: 110,
    tip:     "First lift to 3 m, then Reset and lift to 6 m. Notice the energy doubles!",
    explain: () =>
      "6 m height → 58.8 J = exactly 2× the 29.4 J from 3 m. Double height = double energy!",
  },
  {
    id:      "maxfall",
    icon:    "💥",
    title:   "Max Fall Power",
    tagline: "Go as high as you can, then drop!",
    color:   "#ff7043",
    type:    "freefall",
    maxScore: 150,
    tip:     "Use the slider to maximum height, Lift, then Release!",
    explain: (h) =>
      `From ${h?.toFixed(1) ?? 0} m, the block had ${(G * (h ?? 0)).toFixed(1)} J of GPE — all converted to speed on impact!`,
  },
];

// ─── Stars ─────────────────────────────────────────────────────────────────────
function starsForScore(pct) {
  if (pct >= 0.85) return 3;
  if (pct >= 0.55) return 2;
  if (pct >= 0.25) return 1;
  return 0;
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function ChallengeSystem({
  currentHeight,
  phase,
  onSetTarget,   // (h: number) => void — sets slider target in App
  onRequestLifted, // () => void — triggers lift button
  onScoreGained,   // (points, badge?) => void
  fallDistance,
}) {
  const [screen,       setScreen]       = useState("menu"); // menu|brief|active|result
  const [challenge,    setChallenge]    = useState(null);
  const [result,       setResult]       = useState(null);   // { score, stars, earned, msg }
  const [predictSel,   setPredictSel]   = useState(null);
  const [comparePhase, setComparePhase] = useState(0);      // 0=lift-low, 1=lift-high
  const [comparePE,    setComparePE]    = useState([]);
  const liftedRef = useRef(false); // track first lift in compare

  // ── Watch for phase transitions driven by App ────────────────────────────────
  useEffect(() => {
    if (!challenge || screen !== "active") return;
    if (phase === "landed") evaluateResult();
    if (phase === "lifted" && challenge.type === "lift") evaluateResult();
    // compare: note PE at each lifted point
    if (phase === "lifted" && challenge.type === "compare" && !liftedRef.current) {
      liftedRef.current = true;
      const pe = parseFloat((MASS * G * currentHeight).toFixed(1));
      setComparePE((prev) => [...prev, pe]);
    }
  // eslint-disable-next-line
  }, [phase]);

  const startChallenge = (ch) => {
    setChallenge(ch);
    setResult(null);
    setPredictSel(null);
    setComparePhase(0);
    setComparePE([]);
    liftedRef.current = false;
    setScreen("brief");
    SFX.click();
  };

  const activateChallenge = () => {
    setScreen("active");
    if (challenge.type === "lift" || challenge.type === "predict") {
      onSetTarget(challenge.targetH);
    } else if (challenge.type === "compare") {
      onSetTarget(challenge.heights[0]);
    }
    // freefall: let user choose height freely
  };

  // ── Evaluation ──────────────────────────────────────────────────────────────
  const evaluateResult = () => {
    if (result) return; // prevent double-fire
    const ch = challenge;
    let score = 0, msg = "", earnedBadge = null;

    if (ch.type === "lift") {
      const diff = Math.abs(currentHeight - ch.targetH);
      const accuracy = Math.max(0, 1 - diff / ch.targetH);
      score = Math.round(ch.maxScore * accuracy);
      const stars = starsForScore(accuracy);
      if (stars === 3) earnedBadge = { icon: "🎯", name: "Sharpshooter" };
      msg = diff <= ch.tolerance
        ? `Perfect! Lifted to ${currentHeight} m — only ${diff.toFixed(2)} m off!`
        : `Lifted to ${currentHeight} m (target: ${ch.targetH} m). Off by ${diff.toFixed(1)} m.`;
      finalise(score, stars, msg, earnedBadge, ch.explain(currentHeight));

    } else if (ch.type === "predict") {
      const correct = predictSel === ch.correctIdx;
      score = correct ? ch.maxScore : Math.round(ch.maxScore * 0.2);
      const stars = correct ? 3 : 1;
      if (correct) { SFX.success(); earnedBadge = { icon: "🔍", name: "Energy Detective" }; }
      else SFX.wrong();
      msg = correct
        ? "Correct prediction! You know your W = mgh! ✅"
        : `The correct answer was "${ch.options[ch.correctIdx]}". Try again!`;
      finalise(score, stars, msg, correct ? earnedBadge : null, ch.explain());

    } else if (ch.type === "compare") {
      // Scored based on whether user noted the correct relationship
      score = ch.maxScore;
      const stars = 3;
      earnedBadge = { icon: "⚡", name: "Energy Comparer" };
      const [low, high] = comparePE.length >= 2 ? comparePE : [0, 0];
      msg = `3 m → ${low} J | 6 m → ${high} J. Doubling height doubled the energy!`;
      finalise(score, stars, msg, earnedBadge, ch.explain());

    } else if (ch.type === "freefall") {
      const h = currentHeight === 0 && fallDistance > 0 ? fallDistance : currentHeight;
      const pct = Math.min(h / 8, 1);
      score = Math.round(ch.maxScore * pct);
      const stars = starsForScore(pct);
      if (stars === 3) earnedBadge = { icon: "💥", name: "Max Power" };
      msg = `Dropped from ${(fallDistance || 0).toFixed(1)} m! Impact energy: ${(G * (fallDistance || 0)).toFixed(1)} J`;
      finalise(score, stars, msg, earnedBadge, ch.explain(fallDistance));
    }
  };

  const finalise = (score, stars, msg, badge, explain) => {
    setResult({ score, stars, msg, explain });
    setScreen("result");
    if (stars === 3) SFX.star3();
    else if (stars === 2) SFX.star2();
    else if (stars >= 1) SFX.star1();
    if (badge) setTimeout(SFX.badge, 500);
    onScoreGained(score, badge);
  };

  // ── Screens ─────────────────────────────────────────────────────────────────
  if (screen === "menu")   return <MenuScreen   onSelect={startChallenge} />;
  if (screen === "brief")  return <BriefScreen  challenge={challenge} onStart={activateChallenge} onBack={() => setScreen("menu")} />;
  if (screen === "active") return (
    <ActiveScreen
      challenge={challenge}
      phase={phase}
      currentHeight={currentHeight}
      predictSel={predictSel}
      onPredictSel={setPredictSel}
      onEvaluate={evaluateResult}
      comparePhase={comparePhase}
      comparePE={comparePE}
      onSetTarget={onSetTarget}
      onNextCompare={() => { setComparePhase(1); liftedRef.current = false; onSetTarget(challenge.heights[1]); }}
      fallDistance={fallDistance}
    />
  );
  if (screen === "result")
    return <ResultScreen result={result} challenge={challenge} onRetry={() => startChallenge(challenge)} onMenu={() => setScreen("menu")} />;

  return null;
}

// ── Sub-screens ────────────────────────────────────────────────────────────────

function MenuScreen({ onSelect }) {
  return (
    <div className="ch-overlay ch-menu">
      <div className="ch-menu-header">
        <h2 className="ch-menu-title">🏆 Choose a Challenge</h2>
        <p className="ch-menu-sub">Test what you've learned about Work and Energy</p>
      </div>
      <div className="ch-card-grid">
        {CHALLENGES.map((ch) => (
          <button key={ch.id} className="ch-card" style={{ borderColor: ch.color }} onClick={() => onSelect(ch)}>
            <span className="ch-card-icon">{ch.icon}</span>
            <strong className="ch-card-title" style={{ color: ch.color }}>{ch.title}</strong>
            <span className="ch-card-tagline">{ch.tagline}</span>
            <span className="ch-card-pts">Up to {ch.maxScore} pts</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function BriefScreen({ challenge: ch, onStart, onBack }) {
  return (
    <div className="ch-overlay ch-brief">
      <div className="ch-brief-card" style={{ borderColor: ch.color }}>
        <div className="ch-brief-icon">{ch.icon}</div>
        <h2 className="ch-brief-title" style={{ color: ch.color }}>{ch.title}</h2>
        <p className="ch-brief-tagline">{ch.tagline}</p>
        <div className="ch-tip">💡 {ch.tip}</div>
        <div className="ch-brief-btns">
          <button className="ch-btn ch-btn-back" onClick={onBack}>← Menu</button>
          <button className="ch-btn ch-btn-start" style={{ background: ch.color }} onClick={onStart}>
            ▶ Start Challenge!
          </button>
        </div>
      </div>
    </div>
  );
}

function ActiveScreen({ challenge: ch, phase, currentHeight, predictSel, onPredictSel, onEvaluate, comparePhase, comparePE, onSetTarget, onNextCompare, fallDistance }) {
  const pe = (MASS * G * currentHeight).toFixed(1);

  return (
    <div className="ch-active">
      <div className="ch-active-header" style={{ borderColor: ch.color }}>
        <span className="ch-active-icon">{ch.icon}</span>
        <div>
          <div className="ch-active-title" style={{ color: ch.color }}>{ch.title}</div>
          <div className="ch-active-sub">{ch.tagline}</div>
        </div>
        <div className="ch-active-live">
          <span>h = {currentHeight} m</span>
          <span>GPE = {pe} J</span>
        </div>
      </div>

      {/* Predict MCQ */}
      {ch.type === "predict" && (
        <div className="ch-predict-box">
          <p className="ch-predict-q">What is the GPE when lifted to {ch.targetH} m?</p>
          <div className="ch-predict-opts">
            {ch.options.map((opt, i) => (
              <button
                key={i}
                className={`ch-opt ${predictSel === i ? "selected" : ""}`}
                onClick={() => { onPredictSel(i); SFX.click(); }}
              >
                {opt}
              </button>
            ))}
          </div>
          {predictSel !== null && (
            <p className="ch-predict-hint">
              ✅ Answer locked! Now set slider to {ch.targetH} m and Lift to reveal the truth!
            </p>
          )}
        </div>
      )}

      {/* Compare progress */}
      {ch.type === "compare" && (
        <div className="ch-compare-box">
          <div className={`ch-compare-step ${comparePhase === 0 ? "active" : "done"}`}>
            <span>Step 1: Lift to {ch.heights[0]} m</span>
            {comparePE[0] && <strong>{comparePE[0]} J ✓</strong>}
          </div>
          {comparePE[0] && comparePhase === 0 && (
            <button className="ch-btn ch-btn-start" onClick={onNextCompare}>
              ▶ Now lift to {ch.heights[1]} m →
            </button>
          )}
          <div className={`ch-compare-step ${comparePhase === 1 ? "active" : ""}`}>
            <span>Step 2: Lift to {ch.heights[1]} m</span>
            {comparePE[1] && <strong>{comparePE[1]} J ✓</strong>}
          </div>
          {comparePE[1] && (
            <button className="ch-btn ch-btn-start" onClick={onEvaluate}>See Results! →</button>
          )}
        </div>
      )}

      {/* Fall power live */}
      {ch.type === "freefall" && phase === "fallen" && (
        <div className="ch-live-fall">Fall: {fallDistance} m | Impact: {(G * fallDistance).toFixed(1)} J</div>
      )}
    </div>
  );
}

function ResultScreen({ result, challenge: ch, onRetry, onMenu }) {
  const stars = result.stars;
  return (
    <div className="ch-overlay ch-result">
      <div className="ch-result-card" style={{ borderColor: ch.color }}>
        <div className="ch-result-icon">{ch.icon}</div>
        <h2 className="ch-result-title" style={{ color: ch.color }}>{ch.title}</h2>

        {/* Stars */}
        <div className="ch-stars">
          {[0,1,2].map((i) => (
            <span key={i} className={`ch-star ${i < stars ? "lit" : ""}`}
              style={{ animationDelay: `${i * 0.18}s` }}>★</span>
          ))}
        </div>
        <div className="ch-score-gained">+{result.score} pts</div>

        {/* Message */}
        <p className="ch-result-msg">{result.msg}</p>

        {/* Science explanation */}
        <div className="ch-explain">
          <span className="ch-explain-label">🔬 Science:</span>
          <p>{result.explain}</p>
        </div>

        <div className="ch-result-btns">
          <button className="ch-btn ch-btn-back" onClick={onMenu}>← Menu</button>
          <button className="ch-btn ch-btn-start" style={{ background: ch.color }} onClick={onRetry}>
            ↺ Try Again
          </button>
        </div>
      </div>
    </div>
  );
}
