/**
 * DropAnimation.js  (Phase 2 — rev 3)
 *
 * Single-timeline state machine: elapsed counts from 0 to DONE with
 * NO per-phase resets, so every effect (ripples, dissolve, sinking)
 * is computed from the same absolute clock.  This prevents:
 *   • ripple rings persisting after the drop sinks  (prev bug)
 *   • horizontal x-jump through the beaker middle    (prev bug)
 *
 * Timeline (seconds):
 *   0                         FALL_END
 *   |--- FALL (air) ----------|
 *                             FALL_END        SINK_END
 *                             |--- IMPACT ----|--- SINKING ---|
 *                             FALL_END                       SINK_END   DONE
 *                             |--- RIPPLES (longer) ----------|
 *                                                             |DISSOLVE--|
 *
 * onComplete({ x, y }) fires at DONE with the drop's final beaker-local
 * position so DiffusionSystem can start particles exactly there.
 */

import * as THREE from 'three';

const WATER_YMAX = 1.595;
const WATER_YMIN = 0.045;

// ── Substance configs ────────────────────────────────────────────────────────
const SUBSTANCE = {
  ink: {
    color          : new THREE.Color(0x1447c0),
    emissive       : new THREE.Color(0x0033aa),
    dropRadius     : 0.13,
    splashColor    : new THREE.Color(0x3b82f6),
    fallDuration   : 0.60,
    // Ink ≈ water density → sinks gently to mid-level
    sinkTargetY    : (WATER_YMAX + WATER_YMIN) / 2,  // ≈ 0.82
    sinkDuration   : 0.55,
    dissolveDuration: 0.50,
    dropX          : 0.28,   // inside wall, stays constant throughout
  },
  honey: {
    color          : new THREE.Color(0xc87000),
    emissive       : new THREE.Color(0x8b4500),
    dropRadius     : 0.19,
    splashColor    : new THREE.Color(0xf59e0b),
    fallDuration   : 0.68,
    // Honey ≈ 1.4× water density → sinks to the floor, very slowly
    sinkTargetY    : WATER_YMIN + 0.12,  // ≈ 0.165 (near bottom)
    sinkDuration   : 2.20,
    dissolveDuration: 0.70,
    dropX          : 0.28,
  },
};

// ── DropAnimation class ───────────────────────────────────────────────────────
export class DropAnimation {
  constructor() {
    this._queue = [];
  }

  /**
   * @param {'ink'|'honey'} type
   * @param {THREE.Group}   beakerGroup
   * @param {Function}      onComplete  – called with { x, y } final drop position
   */
  startDrop(type, beakerGroup, onComplete) {
    const cfg   = SUBSTANCE[type];
    const DROP_X = cfg.dropX;

    // ── Timeline breakpoints (seconds from t=0) ───────────────────────
    const T_FALL_END    = cfg.fallDuration;
    const T_IMPACT_END  = T_FALL_END + 0.38;          // short surface pause
    const T_RIPPLE_END  = T_FALL_END + 0.90;          // ripples fade longer
    const T_SINK_END    = T_IMPACT_END + cfg.sinkDuration;
    const T_DONE        = T_SINK_END  + cfg.dissolveDuration;

    // ── Drop sphere ──────────────────────────────────────────────────────
    const dropGeo = new THREE.SphereGeometry(cfg.dropRadius, 22, 22);
    const dropMat = new THREE.MeshPhysicalMaterial({
      color            : cfg.color,
      emissive         : cfg.emissive,
      emissiveIntensity: 0.55,
      transparent      : true,
      opacity          : 0.96,
      roughness        : 0.06,
      metalness        : 0.0,
      depthWrite       : false,
    });
    const drop = new THREE.Mesh(dropGeo, dropMat);
    drop.renderOrder = 8;
    drop.position.set(DROP_X, WATER_YMAX + 1.2, 0);  // above beaker rim
    beakerGroup.add(drop);

    // ── Splash ring (hidden until impact) ───────────────────────────────
    const splashGeo = new THREE.TorusGeometry(0.01, 0.018, 8, 48);
    const splashMat = new THREE.MeshBasicMaterial({
      color      : cfg.splashColor,
      transparent: true,
      opacity    : 0,
      depthWrite : false,
    });
    const splash = new THREE.Mesh(splashGeo, splashMat);
    splash.rotation.x = Math.PI / 2;
    splash.position.set(DROP_X, WATER_YMAX + 0.01, 0);
    splash.renderOrder = 9;
    beakerGroup.add(splash);

    // ── Ripple rings (3, staggered) ──────────────────────────────────────
    const ripples = Array.from({ length: 3 }, (_, idx) => {
      const rGeo = new THREE.TorusGeometry(0.01, 0.010, 6, 36);
      const rMat = new THREE.MeshBasicMaterial({
        color      : cfg.splashColor,
        transparent: true,
        opacity    : 0,
        depthWrite : false,
      });
      const r = new THREE.Mesh(rGeo, rMat);
      r.rotation.x = Math.PI / 2;
      r.position.set(DROP_X, WATER_YMAX + 0.004, 0);
      r.renderOrder = 9;
      beakerGroup.add(r);
      return { mesh: r, delay: (idx + 1) * 0.12 };   // 0.12 / 0.24 / 0.36 s
    });

    // ── Disposer ──────────────────────────────────────────────────────────
    const dispose = () => {
      beakerGroup.remove(drop, splash);
      [dropGeo, dropMat, splashGeo, splashMat].forEach(o => o.dispose());
      ripples.forEach(({ mesh }) => {
        mesh.geometry.dispose();
        mesh.material.dispose();
        beakerGroup.remove(mesh);
      });
    };

    // ── Single global elapsed ─────────────────────────────────────────────
    let elapsed  = 0;
    const startY = WATER_YMAX + 1.2;

    // Track whether "impact just started" so we can snapshot the state once
    let impactStarted = false;

    const tick = (dt) => {
      elapsed += dt;

      // ════════════════════════════════════════════════════════════════
      // PHASE 1 — FALLING (air)
      // ════════════════════════════════════════════════════════════════
      if (elapsed < T_FALL_END) {
        const t    = elapsed / T_FALL_END;
        const ease = t * t;                               // ease-in (gravity)
        drop.position.y = startY + (WATER_YMAX - startY) * ease;

        // Squash near surface (surface-tension feel)
        const sq = 1 + Math.max(0, t - 0.78) * 1.3;
        drop.scale.set(1 / sq, sq, 1 / sq);
      }

      // ════════════════════════════════════════════════════════════════
      // TRANSITION → IMPACT (runs exactly once on first tick past T_FALL_END)
      // ════════════════════════════════════════════════════════════════
      if (elapsed >= T_FALL_END && !impactStarted) {
        impactStarted = true;
        drop.position.y = WATER_YMAX;
        drop.position.x = DROP_X;     // keep x fixed — no side journey
        drop.scale.set(1, 1, 1);
        splashMat.opacity = 0.85;     // flash the splash ring on
      }

      // ════════════════════════════════════════════════════════════════
      // PHASE 2 — IMPACT (splash expands at surface)
      // ════════════════════════════════════════════════════════════════
      if (elapsed >= T_FALL_END && elapsed < T_IMPACT_END) {
        const t    = (elapsed - T_FALL_END) / (T_IMPACT_END - T_FALL_END);
        const ease = 1 - (1 - t) * (1 - t);              // ease-out expand
        const sc   = ease * 13;
        splash.scale.set(sc, sc, sc);
        splashMat.opacity = 0.85 * (1 - t);
      } else if (elapsed >= T_IMPACT_END) {
        // Ensure it's fully hidden once impact phase is over
        splashMat.opacity = 0;
      }

      // ════════════════════════════════════════════════════════════════
      // RIPPLES — independent timeline, fade out by T_RIPPLE_END
      // (runs even during sinking so they finish fading naturally)
      // ════════════════════════════════════════════════════════════════
      if (elapsed >= T_FALL_END && elapsed <= T_RIPPLE_END) {
        const impactElapsed = elapsed - T_FALL_END;
        const rippleDur     = T_RIPPLE_END - T_FALL_END;   // 0.90 s
        ripples.forEach(({ mesh, delay }) => {
          const rt = Math.max(0, (impactElapsed - delay) / rippleDur);
          if (rt > 0 && rt <= 1) {
            const rs = rt * 8;
            mesh.scale.set(rs, rs, rs);
            mesh.material.opacity = 0.50 * (1 - rt);
          }
        });
      } else if (elapsed > T_RIPPLE_END) {
        // Force-hide after timeline ends (no ghost bubbles)
        ripples.forEach(({ mesh }) => { mesh.material.opacity = 0; });
      }

      // ════════════════════════════════════════════════════════════════
      // PHASE 3 — SINKING (drop travels straight DOWN through water)
      // x position stays at DROP_X — no horizontal drift
      // ════════════════════════════════════════════════════════════════
      if (elapsed >= T_IMPACT_END && elapsed < T_SINK_END) {
        const t    = (elapsed - T_IMPACT_END) / cfg.sinkDuration;
        // ease-out: quick entry, then slows (water resistance / viscosity)
        const ease = 1 - Math.pow(1 - t, 2.4);
        drop.position.y = WATER_YMAX + (cfg.sinkTargetY - WATER_YMAX) * ease;
        drop.position.x = DROP_X;       // straight down — NO middle detour

        // Gentle squash while pushing through water
        const sq3 = 1 + Math.sin(t * Math.PI) * 0.14;
        drop.scale.set(sq3, 1 / sq3, sq3);

        // Start fading in the last 30% of sinking
        if (t > 0.70) {
          dropMat.opacity = THREE.MathUtils.lerp(0.96, 0.40, (t - 0.70) / 0.30);
        }
      }

      // ════════════════════════════════════════════════════════════════
      // PHASE 4 — DISSOLVE (at its resting position, fades to nothing)
      // ════════════════════════════════════════════════════════════════
      if (elapsed >= T_SINK_END && elapsed < T_DONE) {
        const t = (elapsed - T_SINK_END) / cfg.dissolveDuration;
        dropMat.opacity = THREE.MathUtils.lerp(0.40, 0, t);
      }

      // ════════════════════════════════════════════════════════════════
      // DONE — fire callback with final position for DiffusionSystem
      // ════════════════════════════════════════════════════════════════
      if (elapsed >= T_DONE) {
        dispose();
        // Pass the drop's final resting position to the caller so that
        // DiffusionSystem spawns particles exactly where the drop dissolved
        // instead of always at the water surface.
        onComplete?.({ x: DROP_X, y: cfg.sinkTargetY });
        return true;   // remove from queue
      }

      return false;
    };

    this._queue.push(tick);
  }

  /** Call every frame from the animation loop. */
  update(dt) {
    this._queue = this._queue.filter((tick) => !tick(dt));
  }

  dispose() {
    this._queue = [];
  }
}
