/**
 * AnimationLoop
 * Manages the rAF render loop and collects per-frame update callbacks.
 */
export class AnimationLoop {
  constructor(renderer, scene, camera, controls) {
    this._renderer = renderer;
    this._scene = scene;
    this._camera = camera;
    this._controls = controls;
    this._callbacks = [];
    this._frameId = null;
    this._clock = { elapsed: 0, _last: performance.now() };
  }

  /** Register a per-frame callback: fn(elapsed, delta) */
  add(fn) {
    this._callbacks.push(fn);
  }

  start() {
    const tick = () => {
      this._frameId = requestAnimationFrame(tick);
      const now = performance.now();
      const delta = (now - this._clock._last) / 1000;
      this._clock._last = now;
      this._clock.elapsed += delta;

      this._controls.update();

      for (const cb of this._callbacks) {
        cb(this._clock.elapsed, delta);
      }

      this._renderer.render(this._scene, this._camera);
    };
    tick();
  }

  stop() {
    if (this._frameId !== null) {
      cancelAnimationFrame(this._frameId);
      this._frameId = null;
    }
  }

  dispose() {
    this.stop();
    this._callbacks.length = 0;
  }
}
