import { useState, useEffect } from 'react';
import './ControlPanel.css';

const QUIZ_DATA = [
    {
        question: '❓ Why did the paper fall slower than the stone in air?',
        options: [
            'A) Paper is lighter, so gravity pulls it less',
            'B) Air resistance opposes the paper more due to its larger surface area',
            'C) The stone has more gravity acting on it',
            'D) Paper floats because it is made of wood fiber',
        ],
        correct: 1,
        explanationCorrect:
            '✅ Correct! Air resistance (drag force) depends on surface area. Paper has a large surface area relative to its mass, so air pushes back harder against it, slowing it down significantly.',
        explanationWrong:
            '❌ Not quite. The real reason is that air resistance depends on surface area. Paper has a large surface area relative to its weight, so air pushes back harder against it. In a vacuum (no air), both fall at the same rate!',
    },
    {
        question: '❓ What happens when both objects are dropped in a vacuum?',
        options: [
            'A) The stone still falls faster',
            'B) The paper floats and never lands',
            'C) Both fall at exactly the same rate',
            'D) Both float due to lack of air pressure',
        ],
        correct: 2,
        explanationCorrect:
            '✅ Correct! Without air resistance, the only force acting is gravity, which accelerates all objects equally at 9.8 m/s² regardless of mass. This was famously demonstrated by Galileo!',
        explanationWrong:
            '❌ Not quite. In a vacuum, there is no air resistance. Gravity accelerates all objects equally at 9.8 m/s², so both the paper and stone fall at the exact same rate!',
    },
];

export default function ControlPanel({
    environment,
    onEnvironmentChange,
    dropHeight,
    onDropHeightChange,
    isDropping,
    hasDropped,
    countdown,
    onDrop,
    onReset,
    onSlowMo,
    isSlowMo,
    paperTime,
    stoneTime,
    paperLanded,
    stoneLanded,
    paperSpeed,
    stoneSpeed,
    experimentStep,
    dropCount,
}) {
    const [quizIndex, setQuizIndex] = useState(0);
    const [quizAnswer, setQuizAnswer] = useState(null);
    const [quizLocked, setQuizLocked] = useState(false);

    // Reset quiz when experiment resets
    useEffect(() => {
        if (!hasDropped) {
            setQuizIndex(0);
            setQuizAnswer(null);
            setQuizLocked(false);
        }
    }, [hasDropped]);

    const quiz = QUIZ_DATA[quizIndex];

    const handleQuizAnswer = (idx) => {
        if (quizLocked) return;
        setQuizAnswer(idx);
        setQuizLocked(true);
    };

    const handleNextQuiz = () => {
        if (quizIndex < QUIZ_DATA.length - 1) {
            setQuizIndex((i) => i + 1);
            setQuizAnswer(null);
            setQuizLocked(false);
        }
    };

    // Steps
    const steps = [
        'Select an environment (Air or Vacuum)',
        'Adjust the drop height using the slider',
        'Press the DROP button to release objects',
        'Observe the falling behaviour',
        'Compare results between Air & Vacuum',
        'Answer the quiz to test understanding',
    ];

    return (
        <div className="control-panel">
            <div className="control-panel-header">
                <h2>
                    <span>🎮</span> Experiment Controls
                </h2>
            </div>

            <div className="control-panel-body">
                {/* Instructions */}
                <div className="cp-section">
                    <div className="cp-section-title">📋 Procedure</div>
                    <div className="steps-list-cp">
                        {steps.map((s, i) => (
                            <div
                                key={i}
                                className={`step-item-cp ${i === experimentStep ? 'active' : ''} ${i < experimentStep ? 'complete' : ''}`}
                            >
                                <span className="step-num">
                                    {i < experimentStep ? '✓' : i + 1}
                                </span>
                                {s}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Environment Toggle */}
                <div className="cp-section">
                    <div className="cp-section-title">🌍 Environment</div>
                    <div className="env-toggle-wrap">
                        <button
                            className={`env-toggle-btn ${environment === 'air' ? 'active' : ''}`}
                            onClick={() => onEnvironmentChange('air')}
                            disabled={isDropping}
                        >
                            🌬️ With Air
                        </button>
                        <button
                            className={`env-toggle-btn ${environment === 'vacuum' ? 'active' : ''}`}
                            onClick={() => onEnvironmentChange('vacuum')}
                            disabled={isDropping}
                        >
                            🔬 Vacuum
                        </button>
                    </div>
                </div>

                {/* Height Slider */}
                <div className="cp-section">
                    <div className="cp-section-title">📏 Drop Height</div>
                    <div className="height-slider-wrap">
                        <div className="height-slider-row">
                            <input
                                type="range"
                                min="3"
                                max="12"
                                step="0.5"
                                value={dropHeight}
                                onChange={(e) => onDropHeightChange(parseFloat(e.target.value))}
                                disabled={isDropping}
                            />
                            <span className="height-value">{dropHeight.toFixed(1)} m</span>
                        </div>
                    </div>
                </div>

                {/* DROP Button */}
                <div className="cp-section">
                    <div className="drop-btn-wrap">
                        <button
                            className={`drop-btn ${countdown !== null ? 'counting' : ''}`}
                            onClick={onDrop}
                            disabled={isDropping || countdown !== null}
                        >
                            {countdown !== null
                                ? `🔥 ${countdown}`
                                : isDropping
                                    ? '⏳ Dropping...'
                                    : '🚀 DROP!'}
                        </button>
                    </div>
                </div>

                {/* Live Timers */}
                {(isDropping || hasDropped) && (
                    <div className="cp-section">
                        <div className="cp-section-title">⏱️ Fall Timers</div>
                        <div className="timers-grid">
                            <div className={`timer-card ${paperLanded ? 'landed' : ''}`}>
                                <div className="timer-card-label">📄 Paper</div>
                                <div className="timer-card-value">
                                    {paperTime.toFixed(2)}s
                                </div>
                                <div className="timer-card-status">
                                    {paperLanded ? '✅ Landed!' : isDropping ? '⬇️ Falling...' : '—'}
                                </div>
                            </div>
                            <div className={`timer-card ${stoneLanded ? 'landed' : ''}`}>
                                <div className="timer-card-label">🪨 Stone</div>
                                <div className="timer-card-value">
                                    {stoneTime.toFixed(2)}s
                                </div>
                                <div className="timer-card-status">
                                    {stoneLanded ? '✅ Landed!' : isDropping ? '⬇️ Falling...' : '—'}
                                </div>
                            </div>
                        </div>

                        {/* Speed indicators */}
                        {isDropping && (
                            <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
                                <div style={{ flex: 1, textAlign: 'center', fontSize: '0.72rem', color: '#94a3b8' }}>
                                    Speed: <span style={{ color: '#e2e8f0', fontWeight: 700 }}>{paperSpeed.toFixed(1)} m/s</span>
                                </div>
                                <div style={{ flex: 1, textAlign: 'center', fontSize: '0.72rem', color: '#94a3b8' }}>
                                    Speed: <span style={{ color: '#d6d3d1', fontWeight: 700 }}>{stoneSpeed.toFixed(1)} m/s</span>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Results Card */}
                {hasDropped && paperLanded && stoneLanded && (
                    <div className="results-card">
                        <h4>📊 Results — {environment === 'air' ? 'With Air' : 'Vacuum'}</h4>
                        {environment === 'air' ? (
                            <>
                                <p>
                                    🪨 Stone landed in <span className="highlight">{stoneTime.toFixed(2)}s</span>
                                </p>
                                <p>
                                    📄 Paper landed in <span className="highlight">{paperTime.toFixed(2)}s</span>
                                </p>
                                <p style={{ marginTop: '0.5rem' }}>
                                    The stone arrived{' '}
                                    <span className="highlight">
                                        {(paperTime - stoneTime).toFixed(2)}s faster
                                    </span>{' '}
                                    because air resistance slowed the paper significantly!
                                </p>
                            </>
                        ) : (
                            <>
                                <p>
                                    🪨 Stone landed in <span className="highlight">{stoneTime.toFixed(2)}s</span>
                                </p>
                                <p>
                                    📄 Paper landed in <span className="highlight">{paperTime.toFixed(2)}s</span>
                                </p>
                                <p style={{ marginTop: '0.5rem' }}>
                                    Both objects fell at <span className="highlight">nearly the same rate</span>!
                                    Without air, gravity is the only force — confirming Galileo's discovery.
                                </p>
                            </>
                        )}
                    </div>
                )}

                {/* Quiz */}
                {dropCount >= 1 && hasDropped && paperLanded && stoneLanded && (
                    <div className="cp-section quiz-section">
                        <div className="cp-section-title">🧠 Knowledge Check</div>
                        <div className="quiz-question">{quiz.question}</div>
                        <div className="quiz-options">
                            {quiz.options.map((opt, idx) => {
                                let cls = 'quiz-option';
                                if (quizLocked) {
                                    if (idx === quiz.correct) cls += ' correct';
                                    else if (idx === quizAnswer && idx !== quiz.correct) cls += ' wrong';
                                }
                                return (
                                    <button
                                        key={idx}
                                        className={cls}
                                        onClick={() => handleQuizAnswer(idx)}
                                        disabled={quizLocked}
                                    >
                                        {opt}
                                    </button>
                                );
                            })}
                        </div>
                        {quizLocked && (
                            <div
                                className={`quiz-feedback ${quizAnswer === quiz.correct ? 'correct' : 'wrong'}`}
                            >
                                {quizAnswer === quiz.correct
                                    ? quiz.explanationCorrect
                                    : quiz.explanationWrong}
                            </div>
                        )}
                        {quizLocked && quizIndex < QUIZ_DATA.length - 1 && (
                            <button
                                className="reset-btn-small"
                                style={{ marginTop: '0.5rem' }}
                                onClick={handleNextQuiz}
                            >
                                Next Question →
                            </button>
                        )}
                    </div>
                )}

                {/* Slow-Mo & Reset */}
                <div className="cp-section" style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                        className="slowmo-btn"
                        onClick={onSlowMo}
                        disabled={!isDropping}
                    >
                        {isSlowMo ? '⏩ Normal Speed' : '🐌 Slow Motion'}
                    </button>
                    <button className="reset-btn-small" onClick={onReset}>
                        🔄 Reset
                    </button>
                </div>
            </div>
        </div>
    );
}
