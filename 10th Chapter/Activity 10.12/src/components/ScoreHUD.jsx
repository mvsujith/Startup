import "./ScoreHUD.css";

export default function ScoreHUD({ score, step }) {
  return (
    <div className="score-hud">
      <div className="sh-label">Score</div>
      <div className="sh-score">{score}</div>
      <div className="sh-pts">pts</div>
    </div>
  );
}
