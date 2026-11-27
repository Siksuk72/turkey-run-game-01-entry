// All sound is synthesized with WebAudio — no audio files, no network.
// Gobbles, chimes, sizzles and a little fanfare, built from oscillators and
// filtered noise. Created lazily on the first user gesture so browsers allow
// it, and silenced with M.

export class SoundBank {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this._musicTimer = null;
    this._musicStep = 0;
  }

  // Call from the first key/click handler. Safe to call repeatedly.
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.5;
    return this.muted;
  }

  _tone(freq, dur, type, vol, slideTo) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    g.gain.setValueAtTime(vol || 0.2, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  _noise(dur, vol, filterFreq) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filt = this.ctx.createBiquadFilter();
    filt.type = 'bandpass';
    filt.frequency.value = filterFreq || 1200;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol || 0.15, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(filt);
    filt.connect(g);
    g.connect(this.master);
    src.start(t0);
  }

  // The turkey's own voice: three quick descending blips.
  gobble() {
    if (!this.ctx) return;
    [520, 430, 340].forEach((f, i) => {
      setTimeout(() => this._tone(f, 0.09, 'square', 0.12, f * 0.7), i * 70);
    });
  }

  jump() {
    this._tone(280, 0.16, 'sine', 0.16, 620);
  }

  land() {
    this._noise(0.07, 0.08, 500);
  }

  corn() {
    this._tone(880, 0.1, 'triangle', 0.18);
    setTimeout(() => this._tone(1320, 0.14, 'triangle', 0.16), 70);
  }

  shield() {
    [523, 659, 784].forEach((f, i) => {
      setTimeout(() => this._tone(f, 0.16, 'triangle', 0.15), i * 80);
    });
  }

  hurt() {
    this._tone(220, 0.25, 'sawtooth', 0.2, 90);
    this._noise(0.12, 0.12, 900);
  }

  // An oven's sizzle: a burst of high noise.
  sizzle() {
    this._noise(0.4, 0.12, 3200);
  }

  // The farmer's shout when he nearly has you.
  farmerShout() {
    this._tone(160, 0.22, 'sawtooth', 0.16, 110);
    setTimeout(() => this._tone(140, 0.3, 'sawtooth', 0.16, 90), 140);
  }

  stageClear() {
    [392, 523, 659, 784].forEach((f, i) => {
      setTimeout(() => this._tone(f, 0.2, 'triangle', 0.16), i * 110);
    });
  }

  // Escaped! A short Thanksgiving fanfare.
  fanfare() {
    const notes = [523, 659, 784, 1047, 784, 1047, 1319];
    notes.forEach((f, i) => {
      setTimeout(() => this._tone(f, 0.28, 'triangle', 0.18), i * 140);
    });
  }

  // Caught. A slow, sad slide down.
  sadTrombone() {
    [330, 311, 294, 277].forEach((f, i) => {
      setTimeout(() => this._tone(f, 0.42, 'sawtooth', 0.12, f * 0.94), i * 380);
    });
  }

  // A gentle music-box loop for the title screen: C major pentatonic,
  // one soft pluck every beat. Starts on unlock, stops on play.
  startMusic() {
    if (!this.ctx || this._musicTimer) return;
    const scale = [523, 587, 659, 784, 880, 1047];
    this._musicTimer = setInterval(() => {
      if (this.muted) return;
      const f = scale[this._musicStep % scale.length];
      this._tone(f, 0.5, 'sine', 0.05);
      this._musicStep += 1;
    }, 420);
  }

  stopMusic() {
    if (this._musicTimer) {
      clearInterval(this._musicTimer);
      this._musicTimer = null;
    }
  }
}
