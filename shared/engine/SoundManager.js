export class SoundManager {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.masterGain.connect(this.ctx.destination);
    this.initialized = true;
  }

  resume() {
    if (this.ctx?.state === 'suspended') this.ctx.resume();
  }

  // Procedural sounds - no external files needed

  playBreak() {
    this.init();
    this._noise(0.12, 800, 200);
    this._tone(800, 0.05, 'square');
  }

  playPop() {
    this.init();
    this._tone(600, 0.08, 'sine', 0.3);
    this._tone(400, 0.05, 'sine', 0.2);
  }

  playHit() {
    this.init();
    this._tone(200, 0.1, 'sawtooth', 0.3);
    this._noise(0.06, 600, 100);
  }

  playCombo(level = 1) {
    this.init();
    const freq = 400 + level * 80;
    this._tone(freq, 0.15, 'sine', 0.4);
    setTimeout(() => this._tone(freq * 1.25, 0.1, 'sine', 0.3), 80);
  }

  playExplosion() {
    this.init();
    this._noise(0.3, 400, 50);
    this._tone(80, 0.2, 'sawtooth', 0.5);
  }

  playVictory() {
    this.init();
    const notes = [523, 659, 784, 1047];
    notes.forEach((f, i) => {
      setTimeout(() => this._tone(f, 0.2, 'sine', 0.3), i * 120);
    });
  }

  playClick() {
    this.init();
    this._tone(1000, 0.03, 'square', 0.2);
  }

  _tone(freq, dur, type = 'sine', vol = 0.3) {
    const { ctx } = this;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(ctx.currentTime + dur);
  }

  _noise(dur, highFreq = 800, lowFreq = 100) {
    const { ctx } = this;
    const bufferSize = ctx.sampleRate * dur;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(highFreq, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(lowFreq, ctx.currentTime + dur);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.5, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    source.start();
    source.stop(ctx.currentTime + dur);
  }
}
