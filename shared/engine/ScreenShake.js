export class ScreenShake {
  constructor() {
    this.intensity = 0;
    this.duration = 0;
    this.elapsed = 0;
    this.offsetX = 0;
    this.offsetY = 0;
  }

  trigger(intensity = 8, duration = 0.3) {
    this.intensity = Math.max(this.intensity, intensity);
    this.duration = duration;
    this.elapsed = 0;
  }

  update(dt) {
    if (this.elapsed < this.duration) {
      this.elapsed += dt;
      const progress = this.elapsed / this.duration;
      const fade = 1 - progress;
      this.offsetX = (Math.random() - 0.5) * this.intensity * fade * 2;
      this.offsetY = (Math.random() - 0.5) * this.intensity * fade * 2;
    } else {
      this.offsetX = 0;
      this.offsetY = 0;
      this.intensity = 0;
    }
  }

  apply(ctx) {
    ctx.translate(this.offsetX, this.offsetY);
  }
}
