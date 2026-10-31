// Audio: plays real audio files when present in the Phaser cache (see assets/data/manifest.json "audio"),
// otherwise falls back to procedurally synthesised placeholder SFX and chiptune music via WebAudio.
import { GameState } from './GameState.js';

const NOTE = n => 440 * Math.pow(2, (n - 69) / 12);
// Simple tracks: [bpm, wave, bass pattern, lead pattern] (MIDI notes, 0 = rest), 16 steps per bar
const TRACKS = {
  menu:    { bpm: 84,  scale: [57, 60, 64, 67, 69, 72], bass: [45, 0, 0, 0, 41, 0, 0, 0, 43, 0, 0, 0, 40, 0, 0, 0], lead: 'arp', wave: 'triangle' },
  academy: { bpm: 112, scale: [62, 65, 69, 72, 74, 77], bass: [38, 0, 38, 0, 41, 0, 41, 0, 36, 0, 36, 0, 33, 0, 36, 0], lead: 'melody', wave: 'square' },
  forest:  { bpm: 96,  scale: [57, 60, 62, 64, 67, 69], bass: [45, 0, 0, 52, 43, 0, 0, 50, 41, 0, 0, 48, 40, 0, 47, 0], lead: 'arp', wave: 'triangle' },
  lab:     { bpm: 120, scale: [60, 63, 65, 67, 70, 72], bass: [36, 36, 0, 36, 39, 0, 36, 0, 34, 34, 0, 34, 31, 0, 34, 0], lead: 'melody', wave: 'sawtooth' },
  city:    { bpm: 132, scale: [64, 67, 69, 71, 74, 76], bass: [40, 0, 40, 40, 43, 0, 43, 0, 38, 0, 38, 38, 36, 0, 38, 0], lead: 'melody', wave: 'square' },
  void:    { bpm: 100, scale: [58, 61, 63, 66, 68, 70], bass: [34, 0, 0, 34, 37, 0, 0, 37, 33, 0, 0, 33, 30, 0, 32, 0], lead: 'arp', wave: 'sawtooth' },
  boss1:   { bpm: 150, scale: [62, 63, 66, 67, 69, 70], bass: [38, 38, 50, 38, 38, 50, 39, 51, 38, 38, 50, 38, 36, 48, 37, 49], lead: 'melody', wave: 'square' },
  boss2:   { bpm: 160, scale: [57, 58, 61, 62, 64, 65], bass: [33, 45, 33, 45, 34, 46, 34, 46, 33, 45, 33, 45, 31, 43, 32, 44], lead: 'melody', wave: 'sawtooth' },
  boss3:   { bpm: 140, scale: [55, 56, 59, 60, 62, 63, 67], bass: [31, 0, 31, 43, 32, 0, 32, 44, 31, 0, 31, 43, 30, 42, 29, 41], lead: 'melody', wave: 'sawtooth' },
  victory: { bpm: 120, scale: [60, 64, 67, 72, 76, 79], bass: [48, 0, 0, 0, 53, 0, 0, 0, 55, 0, 0, 0, 48, 0, 0, 0], lead: 'arp', wave: 'triangle' },
};

class AudioManagerClass {
  constructor() { this.ctx = null; this.track = null; this.timer = null; this.step = 0; this.phaserMusic = null; this.scene = null; this.noiseBuf = null; }

  init(scene) {
    this.scene = scene;
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    try {
      this.ctx = (scene.sound && scene.sound.context) ? scene.sound.context : new AC();
      this.master = this.ctx.createGain(); this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain(); this.musicGain.connect(this.master);
      this.sfxGain = this.ctx.createGain(); this.sfxGain.connect(this.master);
      this.applyVolume();
      const len = this.ctx.sampleRate * 0.5; this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const ch = this.noiseBuf.getChannelData(0); for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1;
    } catch (e) { console.warn('Audio disabled', e); this.ctx = null; }
  }
  unlock() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); }
  applyVolume() {
    if (!this.ctx) return;
    this.musicGain.gain.value = GameState.settings.music * 0.22;
    this.sfxGain.gain.value = GameState.settings.sfx * 0.5;
    if (this.phaserMusic) this.phaserMusic.setVolume(GameState.settings.music);
  }

  // ---------------- SFX
  play(key, opts = {}) {
    const sc = this.scene;
    if (sc && sc.cache && sc.cache.audio.exists('sfx_' + key)) { sc.sound.play('sfx_' + key, { volume: GameState.settings.sfx }); return; }
    if (!this.ctx || GameState.settings.sfx <= 0) return;
    const t = this.ctx.currentTime;
    switch (key) {
      case 'sword': this.noise(t, 0.12, 2400, 'bandpass', 0.5); this.tone(t, 0.08, 900, 300, 'sawtooth', 0.12); break;
      case 'void': this.tone(t, 0.3, 300, 80, 'sawtooth', 0.25); this.noise(t, 0.25, 600, 'lowpass', 0.3); break;
      case 'ice': this.tone(t, 0.18, 1800, 2600, 'triangle', 0.2); this.tone(t + 0.03, 0.12, 2400, 3200, 'sine', 0.12); break;
      case 'fire': this.noise(t, 0.3, 900, 'lowpass', 0.5); this.tone(t, 0.2, 200, 90, 'sawtooth', 0.15); break;
      case 'light': this.tone(t, 0.2, 1200, 1800, 'sine', 0.22); this.tone(t, 0.25, 1500, 2200, 'triangle', 0.1); break;
      case 'dash': this.noise(t, 0.18, 1500, 'highpass', 0.35); break;
      case 'jump': this.tone(t, 0.12, 300, 600, 'square', 0.1); break;
      case 'hit': this.noise(t, 0.08, 1200, 'bandpass', 0.6); this.tone(t, 0.06, 220, 110, 'square', 0.18); break;
      case 'hurt': this.tone(t, 0.25, 400, 120, 'square', 0.25); break;
      case 'enemy_die': this.tone(t, 0.35, 500, 60, 'sawtooth', 0.22); this.noise(t, 0.3, 500, 'lowpass', 0.3); break;
      case 'explode': this.noise(t, 0.6, 400, 'lowpass', 0.8); this.tone(t, 0.5, 120, 40, 'sine', 0.5); break;
      case 'ult': this.tone(t, 0.9, 80, 600, 'sawtooth', 0.3); this.noise(t + 0.2, 0.8, 700, 'lowpass', 0.6); break;
      case 'heal': [0, 0.08, 0.16].forEach((d, i) => this.tone(t + d, 0.3, NOTE(72 + i * 4), NOTE(72 + i * 4), 'triangle', 0.2)); break;
      case 'pickup': this.tone(t, 0.08, NOTE(84), NOTE(84), 'square', 0.12); this.tone(t + 0.07, 0.1, NOTE(91), NOTE(91), 'square', 0.12); break;
      case 'coin': this.tone(t, 0.05, NOTE(88), NOTE(88), 'square', 0.1); this.tone(t + 0.05, 0.12, NOTE(95), NOTE(95), 'square', 0.1); break;
      case 'levelup': [0, 4, 7, 12].forEach((n, i) => this.tone(t + i * 0.09, 0.25, NOTE(72 + n), NOTE(72 + n), 'square', 0.15)); break;
      case 'ui': this.tone(t, 0.05, 900, 1200, 'square', 0.08); break;
      case 'ui_back': this.tone(t, 0.06, 700, 400, 'square', 0.08); break;
      case 'checkpoint': [0, 7, 12].forEach((n, i) => this.tone(t + i * 0.07, 0.2, NOTE(79 + n), NOTE(79 + n), 'triangle', 0.18)); break;
      case 'boss_roar': this.tone(t, 1.0, 120, 50, 'sawtooth', 0.4); this.noise(t, 0.9, 300, 'lowpass', 0.5); break;
      case 'laser': this.tone(t, 0.15, 1600, 400, 'square', 0.12); break;
      case 'shoot': this.tone(t, 0.12, 700, 250, 'square', 0.1); break;
      case 'slam': this.noise(t, 0.4, 250, 'lowpass', 0.9); this.tone(t, 0.3, 90, 40, 'sine', 0.5); break;
      default: this.tone(t, 0.08, 600, 600, 'square', 0.08);
    }
  }
  tone(t, dur, f0, f1, type, vol) {
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.sfxGain); o.start(t); o.stop(t + dur + 0.02);
  }
  noise(t, dur, freq, ftype, vol) {
    const s = this.ctx.createBufferSource(); s.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter(); f.type = ftype; f.frequency.value = freq;
    const g = this.ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.sfxGain); s.start(t); s.stop(t + dur + 0.02);
  }

  // ---------------- Music
  music(key) {
    if (this.track === key) return;
    this.stopMusic(); this.track = key;
    const sc = this.scene;
    if (sc && sc.cache && sc.cache.audio.exists('music_' + key)) {
      this.phaserMusic = sc.sound.add('music_' + key, { loop: true, volume: GameState.settings.music }); this.phaserMusic.play(); return;
    }
    if (!this.ctx) return;
    const tr = TRACKS[key] || TRACKS.menu; this.step = 0;
    const stepDur = 60 / tr.bpm / 4; let next = this.ctx.currentTime + 0.05;
    const melody = this.makeMelody(tr);
    this.timer = setInterval(() => {
      if (!this.ctx) return;
      while (next < this.ctx.currentTime + 0.25) { this.playStep(tr, melody, this.step, next, stepDur); next += stepDur; this.step++; }
    }, 80);
  }
  makeMelody(tr) {
    // deterministic pseudo-random melody from the track's scale
    let seed = tr.bpm * 7 + tr.scale[0]; const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
    const out = [];
    for (let i = 0; i < 64; i++) out.push(rnd() < (tr.lead === 'arp' ? 0.9 : 0.55) ? tr.scale[Math.floor(rnd() * tr.scale.length)] + (rnd() < 0.2 ? 12 : 0) : 0);
    return out;
  }
  playStep(tr, melody, step, t, sd) {
    const b = tr.bass[step % 16];
    if (b) this.mtone(t, sd * 1.8, NOTE(b), 'triangle', 0.5);
    const m = melody[step % 64];
    if (m && (tr.lead === 'arp' || step % 2 === 0)) this.mtone(t, sd * (tr.lead === 'arp' ? 0.9 : 1.8), NOTE(m), tr.wave, 0.16);
    if (tr.bpm >= 110 && step % 4 === 0) this.mnoise(t, 0.05, step % 8 === 0 ? 150 : 4000, 0.25);
    if (tr.bpm >= 110 && step % 4 === 2) this.mnoise(t, 0.03, 7000, 0.1);
  }
  mtone(t, dur, f, type, vol) {
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.value = f; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.musicGain); o.start(t); o.stop(t + dur + 0.02);
  }
  mnoise(t, dur, freq, vol) {
    const s = this.ctx.createBufferSource(); s.buffer = this.noiseBuf; const f = this.ctx.createBiquadFilter();
    f.type = freq < 1000 ? 'lowpass' : 'highpass'; f.frequency.value = freq;
    const g = this.ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.musicGain); s.start(t); s.stop(t + dur + 0.02);
  }
  stopMusic() {
    if (this.timer) clearInterval(this.timer); this.timer = null; this.track = null;
    if (this.phaserMusic) { this.phaserMusic.stop(); this.phaserMusic.destroy(); this.phaserMusic = null; }
  }
}

export const Audio = new AudioManagerClass();
