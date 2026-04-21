/**
 * GameController.js — Phase 3: Gamification State Machine
 *
 * Game phases:
 *   intro → predict → ready → dropping → observing → quiz → results → explanation
 *
 * Scoring (100 pts max):
 *   +25  correct prediction
 *   +15  each correct quiz answer (×4 = 60)
 *   +15  experiment completion bonus
 * Stars: ≥80 = 3⭐, ≥55 = 2⭐, else 1⭐
 */

// ── Quiz questions ────────────────────────────────────────────────────────────

export const QUIZ_QUESTIONS = [
  {
    id: 0,
    question: 'What do you see just above the crystal right after it settles?',
    options: [
      '🔵 Blue colour spreading upward',
      '❌ Absolutely no change',
      '🔴 Red colour spreading',
      '💨 White smoke rising',
    ],
    correct: 0,
    explanation:
      'The crystal slowly dissolves and releases blue Cu²⁺ ions that immediately start diffusing upward from the bottom — you can see a dense blue cloud just above the crystal.',
    fact: '💡 This is diffusion beginning at its source!',
  },
  {
    id: 1,
    question: 'In which glass does the colour spread faster?',
    options: [
      '🔥 Hot water',
      '❄️ Cold water',
      '⚖️ Both spread at identical speed',
      '🚫 Neither glass changes colour',
    ],
    correct: 0,
    explanation:
      'Hot water particles carry more kinetic energy, so they move faster and spread the copper sulphate ions much more quickly throughout the glass.',
    fact: '💡 Hot water diffuses about 3× faster than cold water!',
  },
  {
    id: 2,
    question: 'Why does hot water make diffusion happen faster?',
    options: [
      '🏃 Particles in hot water move faster',
      '💧 Hot water has fewer particles',
      '⬇️ The crystal sinks faster in hot water',
      '🌊 Hot water is less dense so colour spreads easily',
    ],
    correct: 0,
    explanation:
      'Temperature is a direct measure of average kinetic energy. Higher temperature → faster moving particles → more collisions → faster diffusion across the water.',
    fact: '💡 This is the Kinetic Particle Theory in action!',
  },
  {
    id: 3,
    question: 'What does diffusion prove about particles of solids and liquids?',
    options: [
      '🌀 Particles are always in constant random motion',
      '🛑 Particles are completely stationary',
      '🌡️ Only liquid particles ever move',
      '⚡ Particles only move when heated above 50 °C',
    ],
    correct: 0,
    explanation:
      'Because diffusion happens without any stirring, it proves that solid and liquid particles are ALWAYS spontaneously moving — even at room temperature.',
    fact: '💡 Even at room temperature, particles never stop moving!',
  },
];

// ── Badge definitions ─────────────────────────────────────────────────────────

export const BADGES = {
  smart_predictor: { emoji: '🎯', label: 'Smart Predictor', desc: 'Predicted the correct result' },
  scientist:       { emoji: '🔬', label: 'Scientist',        desc: 'Completed the experiment' },
  top_student:     { emoji: '🌟', label: 'Top Student',      desc: 'All 4 quiz questions correct' },
  einstein:        { emoji: '🧠', label: 'Einstein',         desc: 'Perfect score on everything' },
};

// ── GameController ────────────────────────────────────────────────────────────

export class GameController {
  constructor() {
    this._phase            = 'intro';
    this._score            = 0;
    this._prediction       = null;   // 'hot' | 'cold' | null
    this._predictionCorrect = null;  // true | false | null
    this._quizIndex        = 0;      // current question (0-3)
    this._quizAnswers      = [];     // player's answer indices
    this._quizResults      = [];     // true/false per question
    this._starsEarned      = 0;
    this._badges           = [];
    this._timeElapsed      = 0;
    this._lastAnswerCorrect = null;  // for immediate feedback
    this._listeners        = [];
    this._snap             = this._build();
  }

  // ── Accessors ──────────────────────────────────────────────────────────────
  get phase() { return this._phase; }
  get score() { return this._score; }
  snapshot()  { return this._snap; }

  // ── Subscriptions ──────────────────────────────────────────────────────────
  onChange(fn) {
    this._listeners.push(fn);
    return () => { this._listeners = this._listeners.filter(f => f !== fn); };
  }

  // ── Phase transitions ──────────────────────────────────────────────────────

  /** Navigate explicitly to a phase */
  goTo(phase) { this._phase = phase; this._emit(); }

  /** Player picks a prediction */
  makePrediction(choice) {
    if (this._prediction !== null) return;
    this._prediction = choice;
    this._predictionCorrect = (choice === 'hot');
    if (this._predictionCorrect) {
      this._addScore(25);
      this._awardBadge('smart_predictor');
    }
    this._emit();
  }

  /** Called when Drop Crystal triggers in the engine */
  markDropping() { this._phase = 'dropping'; this._emit(); }

  /** Called when engine enters OBSERVING */
  markObserving() { this._phase = 'observing'; this._emit(); }

  /** Called when experiment completes — moves to quiz */
  markComplete(timeElapsed) {
    this._timeElapsed = timeElapsed;
    const bonus = Math.max(0, Math.round((1 - Math.min(timeElapsed, 90) / 90) * 10));
    this._addScore(15 + bonus);
    this._awardBadge('scientist');
    this._phase     = 'quiz';
    this._quizIndex = 0;
    this._emit();
  }

  /** Player chooses an answer. Returns true if correct. */
  submitQuizAnswer(answerIdx) {
    const q = this._quizIndex;
    if (q >= QUIZ_QUESTIONS.length) return false;
    const correct = QUIZ_QUESTIONS[q].correct === answerIdx;
    this._quizAnswers[q]     = answerIdx;
    this._quizResults[q]     = correct;
    this._lastAnswerCorrect  = correct;
    if (correct) {
      this._addScore(15);
      if (q === QUIZ_QUESTIONS.length - 1) {
        // All correct implies top_student
        const allRight = this._quizResults.every(Boolean);
        if (allRight) this._awardBadge('top_student');
      }
    }
    this._emit();
    return correct;
  }

  /** Advance to the next question or results */
  nextQuestion() {
    this._quizIndex++;
    this._lastAnswerCorrect = null;
    if (this._quizIndex >= QUIZ_QUESTIONS.length) {
      this._phase = 'results';
      this._computeStars();
      const perfectScore =
        this._predictionCorrect && this._quizResults.every(Boolean);
      if (perfectScore) this._awardBadge('einstein');
    }
    this._emit();
  }

  /** Move from results to explanation */
  goToExplanation() { this._phase = 'explanation'; this._emit(); }

  /** Full reset — game & engine */
  reset() {
    this._phase             = 'intro';
    this._score             = 0;
    this._prediction        = null;
    this._predictionCorrect = null;
    this._quizIndex         = 0;
    this._quizAnswers       = [];
    this._quizResults       = [];
    this._starsEarned       = 0;
    this._badges            = [];
    this._timeElapsed       = 0;
    this._lastAnswerCorrect = null;
    this._emit();
  }

  dispose() { this._listeners = []; }

  // ── Private ────────────────────────────────────────────────────────────────

  _addScore(pts) { this._score = Math.min(this._score + pts, 100); }

  _awardBadge(id) {
    if (!this._badges.includes(id)) this._badges.push(id);
  }

  _computeStars() {
    this._starsEarned = this._score >= 80 ? 3 : this._score >= 55 ? 2 : 1;
  }

  _emit() {
    this._snap = this._build();
    this._listeners.forEach(fn => fn(this._snap));
  }

  _build() {
    return {
      phase            : this._phase,
      score            : this._score,
      prediction       : this._prediction,
      predictionCorrect: this._predictionCorrect,
      quizIndex        : this._quizIndex,
      quizAnswers      : [...this._quizAnswers],
      quizResults      : [...this._quizResults],
      starsEarned      : this._starsEarned,
      badges           : [...this._badges],
      timeElapsed      : this._timeElapsed,
      lastAnswerCorrect: this._lastAnswerCorrect,
      currentQuestion  : QUIZ_QUESTIONS[this._quizIndex] ?? null,
    };
  }
}
