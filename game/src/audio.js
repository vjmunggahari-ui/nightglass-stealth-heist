// NIGHTGLASS — sound, synthesized live with WebAudio.
// No audio files ship with the game: footsteps, chimes, alarm stings
// and the ambient drone are all oscillators and filtered noise, so the
// game loads nothing over the network and nothing from disk.
export class SoundBank {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.droneNodes = null;
  }

  // Created lazily on the first user gesture; headless screenshot runs
  // never have one, and every call below no-ops without it.
  ensure() {
    if (this.ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
      return true;
    } catch {
      return false;
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master) this.master.gain.value = muted ? 0 : 0.5;
  }

  tone(freq, duration, type, volume, when = 0, slideTo = null) {
    if (!this.ctx || this.muted) return;
    try {
      const t0 = this.ctx.currentTime + when;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + duration);
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(volume, t0 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
      osc.connect(gain);
      gain.connect(this.master);
      osc.start(t0);
      osc.stop(t0 + duration + 0.05);
    } catch {
      // Audio is decoration; a failure never breaks the game.
    }
  }

  // A footstep: pitch and thud depend on the floor and the gait.
  // Marble clicks, carpet hushes, stone echoes — the sound tells you
  // where a guard is, and tells the guards where you are.
  footstep(floor, gait) {
    if (!this.ctx || this.muted) return;
    const base = floor === ',' ? 140 : floor === ';' ? 95 : 170;
    const vol = gait === 'run' ? 0.16 : gait === 'sneak' ? 0.03 : 0.09;
    this.tone(base, 0.07, 'triangle', vol);
    this.tone(base * 0.5, 0.09, 'sine', vol * 0.7);
  }

  // A guard's step, quieter and lower, so you can track patrols by ear.
  guardStep(distance) {
    if (!this.ctx || this.muted) return;
    const vol = Math.max(0, 0.12 - distance * 0.014);
    if (vol <= 0.01) return;
    this.tone(110, 0.08, 'triangle', vol);
  }

  treasureChime() {
    this.tone(880, 0.18, 'sine', 0.12);
    this.tone(1318, 0.28, 'sine', 0.1, 0.07);
  }

  gemChime() {
    this.tone(523, 0.3, 'sine', 0.12);
    this.tone(784, 0.3, 'sine', 0.12, 0.1);
    this.tone(1046, 0.5, 'sine', 0.12, 0.2);
  }

  suspiciousBlip() {
    this.tone(392, 0.14, 'square', 0.05);
  }

  alertSting() {
    this.tone(220, 0.35, 'sawtooth', 0.1, 0, 440);
    this.tone(233, 0.35, 'sawtooth', 0.08, 0.05, 466);
  }

  lockpickClick(ok) {
    this.tone(ok ? 1200 : 300, ok ? 0.06 : 0.16, 'square', ok ? 0.07 : 0.09);
  }

  lockpickOpen() {
    this.tone(660, 0.1, 'sine', 0.1);
    this.tone(990, 0.2, 'sine', 0.1, 0.08);
  }

  caughtSting() {
    this.tone(110, 0.7, 'sawtooth', 0.14, 0, 55);
    this.tone(116, 0.7, 'sawtooth', 0.12, 0.05, 58);
  }

  winSting() {
    [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.4, 'sine', 0.1, i * 0.11));
  }

  // A low night drone under the whole heist, started once per session.
  startDrone() {
    if (!this.ctx || this.muted || this.droneNodes) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 55;
      gain.gain.value = 0.035;
      osc.connect(gain);
      gain.connect(this.master);
      osc.start();
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.value = 82.5;
      gain2.gain.value = 0.015;
      osc2.connect(gain2);
      gain2.connect(this.master);
      osc2.start();
      this.droneNodes = [osc, osc2];
    } catch {
      // Decoration only.
    }
  }
}
