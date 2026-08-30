// ---------------------------------------------------------------------------
// Sound effects, synthesized in code with the Web Audio API. No audio files,
// so it's original and license-clean. A single shared instance (`sfx`) is
// imported wherever the game needs a sound. Mute state persists in localStorage.
//
// Browsers block audio until a user gesture, so the AudioContext is created
// lazily and resumed on the first sound (which always follows a click/key).
// ---------------------------------------------------------------------------

class Sfx {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.last = {}; // throttle timestamps per sound key
    try { this.muted = localStorage.getItem('frostline_muted') === '1'; } catch (e) { /* ignore */ }
  }

  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) this.ctx = new AC();
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  setMuted(m) {
    this.muted = m;
    try { localStorage.setItem('frostline_muted', m ? '1' : '0'); } catch (e) { /* ignore */ }
  }

  toggle() { this.setMuted(!this.muted); return this.muted; }

  // One short enveloped tone, optionally gliding to another frequency.
  tone({ freq = 440, dur = 0.1, type = 'sine', vol = 0.2, slideTo = null, delay = 0 }) {
    if (this.muted) return;
    const ctx = this.ensure();
    if (!ctx) return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.03);
  }

  throttled(key, ms, fn) {
    const now = Date.now();
    if (this.last[key] && now - this.last[key] < ms) return;
    this.last[key] = now;
    fn();
  }

  // ---- named effects -----------------------------------------------------
  shoot() { this.throttled('shoot', 45, () => this.tone({ freq: 680, slideTo: 420, dur: 0.07, type: 'square', vol: 0.05 })); }
  zap() { this.throttled('zap', 45, () => this.tone({ freq: 900, slideTo: 1500, dur: 0.06, type: 'sawtooth', vol: 0.045 })); }
  boom() { this.throttled('boom', 60, () => this.tone({ freq: 170, slideTo: 60, dur: 0.24, type: 'sawtooth', vol: 0.16 })); }
  place() { this.tone({ freq: 300, slideTo: 620, dur: 0.12, type: 'triangle', vol: 0.18 }); }
  sell() { this.tone({ freq: 620, slideTo: 240, dur: 0.14, type: 'triangle', vol: 0.16 }); }
  upgrade() { this.tone({ freq: 520, slideTo: 940, dur: 0.16, type: 'square', vol: 0.16 }); }
  kill() { this.throttled('kill', 35, () => this.tone({ freq: 330, slideTo: 150, dur: 0.08, type: 'triangle', vol: 0.07 })); }
  hit() { this.tone({ freq: 130, slideTo: 50, dur: 0.3, type: 'sawtooth', vol: 0.22 }); }
  click() { this.tone({ freq: 540, dur: 0.05, type: 'square', vol: 0.12 }); }
  wave() { this.tone({ freq: 300, dur: 0.12, type: 'square', vol: 0.13 }); this.tone({ freq: 470, dur: 0.12, type: 'square', vol: 0.13, delay: 0.1 }); }
  win() { [523, 659, 784, 1047].forEach((f, i) => this.tone({ freq: f, dur: 0.18, type: 'square', vol: 0.16, delay: i * 0.13 })); }
  lose() { [392, 311, 247, 175].forEach((f, i) => this.tone({ freq: f, dur: 0.2, type: 'sawtooth', vol: 0.16, delay: i * 0.14 })); }
}

export const sfx = new Sfx();
