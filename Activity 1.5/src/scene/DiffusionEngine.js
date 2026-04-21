/**
 * DiffusionEngine.js — Phase 2: Diffusion Simulation
 *
 * Manages the scientific simulation state for BOTH glasses simultaneously.
 *
 * State machine:
 *   idle → dropping → settling → observing ⇄ paused → complete
 *
 * Science model:
 *   Hot water diffuses ~3× faster than cold (kinetic theory:
 *   higher temperature → greater molecular kinetic energy → faster mixing).
 *
 *   HOT_DURATION  = 20 s  (full diffusion in hot  water)
 *   COLD_DURATION = 60 s  (full diffusion in cold water — 3× slower)
 */

// ── Timing constants ───────────────────────────────────────────────────────────

const DROP_DURATION   = 1.0;   // seconds crystal takes to fall to bottom
const SETTLE_DURATION = 0.55;  // seconds for crystal to bounce & settle
const HOT_DURATION    = 20.0;  // seconds for full diffusion in hot water
const COLD_DURATION   = 60.0;  // seconds for full diffusion in cold water

// ── State constants ────────────────────────────────────────────────────────────

export const DS = {
  IDLE:       'idle',
  DROPPING:   'dropping',
  SETTLING:   'settling',
  OBSERVING:  'observing',
  PAUSED:     'paused',
  COMPLETE:   'complete',
};

// ── DiffusionEngine class ──────────────────────────────────────────────────────

export class DiffusionEngine {
  constructor() {
    this._state        = DS.IDLE;
    this._phaseTimer   = 0;    // timer for current drop/settle phase
    this._obsElapsed   = 0;    // total seconds spent actually observing
    this._hotProg      = 0;    // 0 → 1: hot glass diffusion progress
    this._coldProg     = 0;    // 0 → 1: cold glass diffusion progress
    this._dropProg     = 0;    // 0 → 1: crystal drop animation progress
    this._settleProg   = 0;    // 0 → 1: crystal settle animation progress
    this._listeners    = [];   // onChange callbacks
  }

  // ── Controls ────────────────────────────────────────────────────────────────

  /** Drop both crystals. Only valid from IDLE. */
  drop() {
    if (this._state !== DS.IDLE) return;
    this._state      = DS.DROPPING;
    this._phaseTimer = 0;
    this._dropProg   = 0;
    this._emit();
  }

  /** Start / resume observation. Valid from SETTLING, PAUSED, or OBSERVING. */
  start() {
    if (this._state === DS.PAUSED   ||
        this._state === DS.SETTLING ||
        this._state === DS.DROPPING) {
      this._state = DS.OBSERVING;
      this._emit();
    }
  }

  /** Pause observation. */
  pause() {
    if (this._state === DS.OBSERVING) {
      this._state = DS.PAUSED;
      this._emit();
    }
  }

  /** Toggle start / pause. */
  toggle() {
    if (this._state === DS.OBSERVING) this.pause();
    else this.start();
  }

  /** Full reset back to IDLE — clears all progress. */
  reset() {
    this._state      = DS.IDLE;
    this._phaseTimer = 0;
    this._obsElapsed = 0;
    this._hotProg    = 0;
    this._coldProg   = 0;
    this._dropProg   = 0;
    this._settleProg = 0;
    this._emit();
  }

  // ── Per-frame update ────────────────────────────────────────────────────────

  /**
   * Call once per frame from the AnimationLoop.
   * @param {number} dt - Delta time in seconds.
   */
  update(dt) {
    switch (this._state) {

      case DS.DROPPING:
        this._phaseTimer += dt;
        this._dropProg    = Math.min(this._phaseTimer / DROP_DURATION, 1.0);
        if (this._phaseTimer >= DROP_DURATION) {
          this._state      = DS.SETTLING;
          this._phaseTimer = 0;
          this._settleProg = 0;
        }
        this._emit();
        break;

      case DS.SETTLING:
        this._phaseTimer += dt;
        this._settleProg  = Math.min(this._phaseTimer / SETTLE_DURATION, 1.0);
        if (this._phaseTimer >= SETTLE_DURATION) {
          // Auto-start observation immediately after crystal settles
          this._state      = DS.OBSERVING;
          this._phaseTimer = 0;
        }
        this._emit();
        break;

      case DS.OBSERVING:
        this._obsElapsed += dt;
        this._hotProg     = Math.min(this._obsElapsed / HOT_DURATION,  1.0);
        this._coldProg    = Math.min(this._obsElapsed / COLD_DURATION, 1.0);
        if (this._hotProg >= 1.0 && this._coldProg >= 1.0) {
          this._state = DS.COMPLETE;
        }
        this._emit();
        break;

      // IDLE, PAUSED, COMPLETE — nothing to advance
      default: break;
    }
  }

  // ── Accessors ───────────────────────────────────────────────────────────────

  getState()       { return this._state; }
  getHotProg()     { return this._hotProg; }
  getColdProg()    { return this._coldProg; }
  getDropProg()    { return this._dropProg; }
  getSettleProg()  { return this._settleProg; }
  getElapsed()     { return this._obsElapsed; }

  isIdle()         { return this._state === DS.IDLE; }
  isDropping()     { return this._state === DS.DROPPING; }
  isSettling()     { return this._state === DS.SETTLING; }
  isObserving()    { return this._state === DS.OBSERVING; }
  isPaused()       { return this._state === DS.PAUSED; }
  isComplete()     { return this._state === DS.COMPLETE; }
  hasCrystalDropped() {
    return this._state !== DS.IDLE;
  }

  // ── Callback registration ────────────────────────────────────────────────────

  /** Register a callback invoked on every state/progress change. */
  onChange(fn) { this._listeners.push(fn); }

  // ── Private ─────────────────────────────────────────────────────────────────

  _emit() {
    const snap = this.snapshot();
    this._listeners.forEach(fn => fn(snap));
  }

  /** Returns a plain JS snapshot of current state — safe to use in React. */
  snapshot() {
    return {
      state:       this._state,
      elapsed:     this._obsElapsed,
      hotProg:     this._hotProg,
      coldProg:    this._coldProg,
      dropProg:    this._dropProg,
      settleProg:  this._settleProg,
      isIdle:      this.isIdle(),
      isDropping:  this.isDropping(),
      isSettling:  this.isSettling(),
      isObserving: this.isObserving(),
      isPaused:    this.isPaused(),
      isComplete:  this.isComplete(),
      hasDrop:     this.hasCrystalDropped(),
    };
  }

  dispose() { this._listeners.length = 0; }
}
