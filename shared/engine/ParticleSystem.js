export class Particle {
  constructor(x, y, opts = {}) {
    this.x = x;
    this.y = y;
    const angle = opts.angle ?? Math.random() * Math.PI * 2;
    const speed = opts.speed ?? (2 + Math.random() * 4);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.gravity = opts.gravity ?? 0.15;
    this.life = 1;
    this.decay = opts.decay ?? (0.015 + Math.random() * 0.02);
    this.size = opts.size ?? (3 + Math.random() * 5);
    this.color = opts.color ?? '#FF3B3B';
    this.shape = opts.shape ?? 'rect';
    this.rotation = Math.random() * Math.PI * 2;
    this.rotSpeed = (Math.random() - 0.5) * 0.3;
  }

  update(dt) {
    this.x += this.vx;
    this.vy += this.gravity;
    this.y += this.vy;
    this.life -= this.decay;
    this.rotation += this.rotSpeed;
    this.size *= 0.99;
  }

  get dead() {
    return this.life <= 0;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.globalAlpha = Math.max(0, this.life);
    ctx.fillStyle = this.color;

    if (this.shape === 'circle') {
      ctx.beginPath();
      ctx.arc(0, 0, this.size, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
    }

    ctx.restore();
  }
}

export class ParticleSystem {
  constructor() {
    this.particles = [];
  }

  emit(x, y, count = 20, opts = {}) {
    const colors = opts.colors ?? ['#FF3B3B', '#FF8C00', '#FFD700', '#FFFFFF'];
    for (let i = 0; i < count; i++) {
      this.particles.push(new Particle(x, y, {
        ...opts,
        color: colors[Math.floor(Math.random() * colors.length)],
        angle: opts.angle ?? undefined,
      }));
    }
  }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].update(dt);
      if (this.particles[i].dead) {
        this.particles.splice(i, 1);
      }
    }
  }

  draw(ctx) {
    for (const p of this.particles) {
      p.draw(ctx);
    }
  }

  get count() {
    return this.particles.length;
  }

  clear() {
    this.particles = [];
  }
}
