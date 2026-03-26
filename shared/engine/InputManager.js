export class InputManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.listeners = {};
    this.pointers = new Map();
    this._bind();
  }

  on(event, fn) {
    (this.listeners[event] ||= []).push(fn);
  }

  _emit(event, data) {
    (this.listeners[event] || []).forEach((fn) => fn(data));
  }

  _pos(e) {
    const r = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / r.width;
    const scaleY = this.canvas.height / r.height;
    return {
      x: (e.clientX - r.left) * scaleX,
      y: (e.clientY - r.top) * scaleY,
    };
  }

  _bind() {
    const c = this.canvas;

    // Mouse
    c.addEventListener('mousedown', (e) => {
      this._emit('pointerdown', { ...this._pos(e), id: 'mouse' });
    });
    c.addEventListener('mousemove', (e) => {
      this._emit('pointermove', { ...this._pos(e), id: 'mouse' });
    });
    c.addEventListener('mouseup', (e) => {
      this._emit('pointerup', { ...this._pos(e), id: 'mouse' });
    });

    // Touch
    c.addEventListener('touchstart', (e) => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        this._emit('pointerdown', { ...this._pos(t), id: t.identifier });
      }
    }, { passive: false });
    c.addEventListener('touchmove', (e) => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        this._emit('pointermove', { ...this._pos(t), id: t.identifier });
      }
    }, { passive: false });
    c.addEventListener('touchend', (e) => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        this._emit('pointerup', { ...this._pos(t), id: t.identifier });
      }
    }, { passive: false });

    // Keyboard
    window.addEventListener('keydown', (e) => {
      this._emit('keydown', { key: e.key, code: e.code });
    });
    window.addEventListener('keyup', (e) => {
      this._emit('keyup', { key: e.key, code: e.code });
    });
  }

  destroy() {
    this.listeners = {};
  }
}
