export class GameLoop {
  constructor({ update, render }) {
    this.update = update;
    this.render = render;
    this.running = false;
    this.lastTime = 0;
    this.accumulator = 0;
    this.fixedStep = 1000 / 60;
    this._raf = null;
  }

  start() {
    this.running = true;
    this.lastTime = performance.now();
    this._raf = requestAnimationFrame((t) => this._loop(t));
  }

  stop() {
    this.running = false;
    if (this._raf) cancelAnimationFrame(this._raf);
  }

  _loop(timestamp) {
    if (!this.running) return;
    const dt = Math.min(timestamp - this.lastTime, 100);
    this.lastTime = timestamp;
    this.accumulator += dt;

    while (this.accumulator >= this.fixedStep) {
      this.update(this.fixedStep / 1000);
      this.accumulator -= this.fixedStep;
    }

    this.render();
    this._raf = requestAnimationFrame((t) => this._loop(t));
  }
}
