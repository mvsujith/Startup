import './GameHUD.css';

const PRESET_WINDINGS = [5, 10, 15, 20];

const ACHIEVEMENTS = [
  { id: 'first_run',     icon: '🚀', label: 'First Run!',       condition: (r) => r.length === 1 },
  { id: 'three_trials',  icon: '🔬', label: 'Triple Trial!',    condition: (r) => r.length === 3 },
  { id: 'all_presets',   icon: '🏆', label: 'Data Master!',     condition: (r, tested) => tested.size >= 4 },
  { id: 'speed_demon',   icon: '⚡', label: 'Speed Demon!',     condition: (r) => r.some(x => x.speed > 60) },
  { id: 'max_winding',   icon: '💥', label: 'Full Power!',      condition: (r) => r.some(x => x.windings === 20) },
];

function getLevel(score) {
  if (score >= 150) return { name: '👨‍🔬 Professor', cls: 'level-professor' };
  if (score >= 60)  return { name: '🔬 Scientist',  cls: 'level-scientist' };
  return { name: '🎒 Student', cls: 'level-student' };
}

export default function GameHUD({ score, results, achievements }) {
  const { name, cls } = getLevel(score);
  const testedWindings = new Set(results.map(r => r.windings));
  const progressPct = (testedWindings.size / 4) * 100;

  const STEPS = [
    'Set winding count (5, 10, 15 or 20)',
    'Click ▶ Release to run the car',
    'Watch energy convert: spring → kinetic',
    'Record data across 3 trials per level',
    'Compare distances in the chart',
  ];

  return (
    <div className="game-hud">
      {/* Score + Level */}
      <div className="exp-card">
        <div className="exp-card-title">Score & Level</div>
        <div className="score-card">
          <div>
            <div className="score-value">{score}</div>
            <div className="score-label">points</div>
          </div>
          <div className={`level-badge ${cls}`}>{name}</div>
        </div>
      </div>

      {/* Winding levels progress */}
      <div className="exp-card">
        <div className="exp-card-title">Winding Levels Tested</div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${progressPct}%` }} />
        </div>
        <div className="progress-labels">
          {PRESET_WINDINGS.map(w => (
            <div key={w} className={`progress-pip ${testedWindings.has(w) ? 'tested' : ''}`}>
              {testedWindings.has(w) ? '✓' : w + '×'}
            </div>
          ))}
        </div>
      </div>

      {/* Achievements */}
      {achievements.length > 0 && (
        <div className="exp-card">
          <div className="exp-card-title">🏅 Achievements</div>
          <div className="achievements-list">
            {achievements.map(a => (
              <div key={a.id} className="achievement-item">
                <span className="achievement-icon">{a.icon}</span>
                {a.label}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="exp-card">
        <div className="exp-card-title">📋 How to Play</div>
        <div className="instructions-list">
          {STEPS.map((s, i) => {
            const done = i < (results.length > 0 ? Math.min(i + 1, 3) : 0);
            return (
              <div key={i} className="instruction-step">
                <div className={`step-num ${done ? 'done' : ''}`}>{done ? '✓' : i + 1}</div>
                <span>{s}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
