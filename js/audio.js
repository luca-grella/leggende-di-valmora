'use strict';
/* ============================================================
   audio.js — chiptune WebAudio: musiche in loop + effetti
   ============================================================ */

const NOTE_BASE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function noteFreq(tok) {
  // 'A4' / 'C#3' / 'Eb5'
  let i = 0, n = NOTE_BASE[tok[i++]];
  if (tok[i] === '#') { n++; i++; } else if (tok[i] === 'b') { n--; i++; }
  const oct = parseInt(tok[i], 10);
  const midi = n + (oct + 1) * 12;
  return 440 * Math.pow(2, (midi - 69) / 12);
}
function parseSeq(str) {
  // "E4:1 G4:.5 R:2" → [{f,beats}]
  return str.trim().split(/\s+/).map(t => {
    const [p, d] = t.split(':');
    return { f: p === 'R' ? 0 : noteFreq(p), beats: parseFloat(d || '1') };
  });
}

const Music = {
  ac: null, master: null, enabled: true,
  cur: '', timer: null,
  chans: [],          // [{seq, idx, nextT, wave, vol}]
  bpm: 120,
  init() {
    if (this.ac) return;
    try {
      this.ac = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ac.createGain();
      this.master.gain.value = 0.16;
      this.master.connect(this.ac.destination);
    } catch (e) { this.ac = null; }
  },
  setEnabled(v) {
    this.enabled = v;
    if (!v) this.stop(); else if (this._want) this.play(this._want, true);
  },
  stop() {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    this.cur = '';
    this.chans = [];
  },
  play(name, force) {
    this._want = name;
    if (!this.enabled) return;
    if (!this.ac) this.init();
    if (!this.ac) return;
    if (this.ac.state === 'suspended') this.ac.resume();
    if (this.cur === name && !force) return;
    this.stop();
    const tr = TRACKS[name];
    if (!tr) return;
    this.cur = name;
    this.bpm = tr.bpm;
    const t0 = this.ac.currentTime + 0.06;
    this.chans = tr.ch.map(c => ({
      seq: parseSeq(c.seq), idx: 0, nextT: t0, wave: c.wave, vol: c.vol, loop: tr.loop !== false,
    }));
    this.timer = setInterval(() => this.schedule(), 120);
    this.schedule();
  },
  schedule() {
    if (!this.ac) return;
    const ahead = this.ac.currentTime + 0.45;
    const beatSec = 60 / this.bpm;
    for (const ch of this.chans) {
      if (!ch.seq.length) continue;
      while (ch.nextT < ahead) {
        if (ch.idx >= ch.seq.length) {
          if (!ch.loop) { ch.idx = -1; break; }
          ch.idx = 0;
        }
        const n = ch.seq[ch.idx++];
        const dur = n.beats * beatSec;
        if (n.f > 0) this.tone(n.f, ch.nextT, dur * 0.92, ch.wave, ch.vol);
        ch.nextT += dur;
      }
      if (ch.idx === -1) continue;
    }
  },
  tone(freq, t, dur, wave, vol) {
    const o = this.ac.createOscillator();
    const g = this.ac.createGain();
    o.type = wave || 'square';
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol || 0.5, t);
    g.gain.setTargetAtTime(0.0001, t + dur * 0.7, 0.04);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + 0.1);
  },
};

/* ---------- effetti sonori ---------- */
const Sfx = {
  play(name) {
    if (!Music.enabled) return;
    if (!Music.ac) Music.init();
    const ac = Music.ac;
    if (!ac) return;
    if (ac.state === 'suspended') ac.resume();
    const t = ac.currentTime;
    const beep = (f0, f1, dur, wave, vol, dt) => {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = wave || 'square';
      o.frequency.setValueAtTime(f0, t + (dt || 0));
      if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + (dt || 0) + dur);
      g.gain.setValueAtTime(vol || 0.12, t + (dt || 0));
      g.gain.setTargetAtTime(0.0001, t + (dt || 0) + dur * 0.7, 0.02);
      o.connect(g); g.connect(ac.destination);
      o.start(t + (dt || 0)); o.stop(t + (dt || 0) + dur + 0.05);
    };
    switch (name) {
      case 'cursor': beep(880, 0, 0.05, 'square', 0.07); break;
      case 'confirm': beep(660, 990, 0.08, 'square', 0.09); break;
      case 'cancel': beep(440, 330, 0.08, 'square', 0.08); break;
      case 'bump': beep(120, 80, 0.08, 'square', 0.1); break;
      case 'jump': beep(300, 600, 0.12, 'square', 0.08); break;
      case 'door': beep(500, 250, 0.12, 'triangle', 0.12); break;
      case 'hit': beep(220, 60, 0.14, 'sawtooth', 0.14); break;
      case 'hitSuper': beep(420, 50, 0.2, 'sawtooth', 0.16); break;
      case 'hitWeak': beep(150, 90, 0.1, 'sawtooth', 0.08); break;
      case 'faint': beep(400, 60, 0.4, 'square', 0.12); break;
      case 'levelup':
        beep(523, 0, 0.09, 'square', 0.1); beep(659, 0, 0.09, 'square', 0.1, 0.09);
        beep(784, 0, 0.09, 'square', 0.1, 0.18); beep(1046, 0, 0.2, 'square', 0.12, 0.27);
        break;
      case 'heal':
        beep(784, 0, 0.08, 'square', 0.09); beep(988, 0, 0.08, 'square', 0.09, 0.09);
        beep(1175, 0, 0.16, 'square', 0.1, 0.18);
        break;
      case 'ballToss': beep(500, 900, 0.15, 'square', 0.1); break;
      case 'ballShake': beep(180, 140, 0.08, 'square', 0.12); break;
      case 'ballCatch':
        beep(800, 0, 0.06, 'square', 0.1); beep(600, 0, 0.2, 'square', 0.1, 0.08);
        break;
      case 'ballOut': beep(300, 700, 0.18, 'sawtooth', 0.12); break;
      case 'alert': beep(990, 990, 0.1, 'square', 0.12); beep(990, 0, 0.1, 'square', 0.12, 0.12); break;
      case 'save':
        beep(659, 0, 0.07, 'square', 0.09); beep(880, 0, 0.14, 'square', 0.1, 0.08);
        break;
      case 'badge':
        beep(523, 0, 0.1, 'square', 0.1); beep(659, 0, 0.1, 'square', 0.1, 0.1);
        beep(784, 0, 0.1, 'square', 0.1, 0.2); beep(1046, 0, 0.3, 'square', 0.12, 0.3);
        beep(784, 0, 0.1, 'square', 0.08, 0.6); beep(1046, 0, 0.4, 'square', 0.12, 0.7);
        break;
      case 'buy': beep(1046, 0, 0.05, 'square', 0.08); beep(1318, 0, 0.1, 'square', 0.08, 0.06); break;
    }
  },
};

/* ---------- tracce musicali ----------
   ch: canali {wave, vol, seq}; seq = nota:durata in battiti, R = pausa */
const TRACKS = {
  title: {
    bpm: 112,
    ch: [
      { wave: 'square', vol: 0.5, seq: `
        E4:1 G4:1 B4:1 C5:1 B4:2 G4:2 A4:1 B4:1 C5:1 D5:1 E5:4
        D5:1 C5:1 B4:1 A4:1 G4:2 E4:2 F4:1 G4:1 A4:1 B4:1 G4:4
        E4:1 G4:1 B4:1 C5:1 B4:2 G4:2 A4:1 B4:1 C5:1 D5:1 E5:2 G5:2
        F5:1 E5:1 D5:1 C5:1 B4:2 D5:2 C5:4 R:4` },
      { wave: 'triangle', vol: 0.7, seq: `
        E3:2 E3:2 A3:2 A3:2 F3:2 F3:2 G3:2 G3:2
        E3:2 E3:2 A3:2 A3:2 F3:2 G3:2 C3:4
        E3:2 E3:2 A3:2 A3:2 F3:2 F3:2 G3:2 G3:2
        F3:2 F3:2 G3:2 G3:2 C3:4 G2:4` },
    ],
  },
  town: {
    bpm: 100,
    ch: [
      { wave: 'square', vol: 0.42, seq: `
        E4:1 G4:1 C5:2 B4:1 G4:1 A4:2 G4:1 E4:1 F4:2 E4:1 D4:1 C4:2
        E4:1 G4:1 C5:2 B4:1 G4:1 A4:2 G4:1 A4:1 B4:1 D5:1 C5:4
        A4:1 C5:1 F5:2 E5:1 C5:1 D5:2 C5:1 A4:1 B4:2 G4:2 R:2
        E4:1 G4:1 C5:1 E5:1 D5:1 B4:1 G4:1 B4:1 C5:4 R:2` },
      { wave: 'triangle', vol: 0.6, seq: `
        C3:2 G3:2 C3:2 G3:2 F3:2 C3:2 G3:2 G2:2
        C3:2 G3:2 C3:2 G3:2 F3:2 G3:2 C3:4
        F3:2 C3:2 G3:2 C3:2 F3:2 G3:2 E3:2 G3:2
        C3:2 G3:2 F3:2 G3:2 C3:4 R:2` },
    ],
  },
  route: {
    bpm: 126,
    ch: [
      { wave: 'square', vol: 0.42, seq: `
        D4:0.5 G4:0.5 B4:1 A4:0.5 G4:0.5 A4:1 B4:0.5 C5:0.5 D5:1 B4:1 G4:1
        E5:1 D5:0.5 C5:0.5 B4:1 A4:1 G4:2 R:1
        D4:0.5 G4:0.5 B4:1 A4:0.5 G4:0.5 A4:1 B4:0.5 C5:0.5 D5:1 E5:1 D5:1
        C5:1 B4:0.5 A4:0.5 B4:1 C5:1 B4:1 A4:1 G4:2 R:1` },
      { wave: 'triangle', vol: 0.6, seq: `
        G2:1 D3:1 G3:1 D3:1 C3:1 G3:1 D3:1 A2:1
        C3:1 G3:1 D3:1 D2:1 G2:1 D3:1 G2:1 R:1
        G2:1 D3:1 G3:1 D3:1 C3:1 G3:1 E3:1 C3:1
        A2:1 D3:1 G2:1 D3:1 G2:2 R:1 R:1` },
    ],
  },
  forest: {
    bpm: 92,
    ch: [
      { wave: 'square', vol: 0.36, seq: `
        A4:1.5 C5:0.5 E5:2 D5:1.5 C5:0.5 B4:2
        C5:1.5 B4:0.5 A4:2 G4:1.5 A4:0.5 E4:2
        A4:1.5 C5:0.5 E5:2 G5:1.5 E5:0.5 D5:2
        C5:1 B4:1 A4:1 G4:1 A4:4` },
      { wave: 'triangle', vol: 0.55, seq: `
        A2:2 E3:2 F3:2 E3:2 A2:2 E3:2 C3:2 E3:2
        A2:2 E3:2 F3:2 G3:2 A2:2 E3:2 A2:4` },
    ],
  },
  cave: {
    bpm: 96,
    ch: [
      { wave: 'square', vol: 0.3, seq: `
        D4:2 F4:2 E4:2 C4:2 D4:2 A4:2 G4:2 E4:2
        F4:2 A4:2 G4:2 E4:2 D4:1 E4:1 F4:1 E4:1 D4:4` },
      { wave: 'triangle', vol: 0.6, seq: `
        D2:4 A2:4 C3:4 G2:4 D2:4 F2:4 A2:4 D2:4
        D2:4 A2:4 C3:4 G2:4 D2:2 A2:2 D2:4 R:4` },
    ],
  },
  battle: {
    bpm: 152,
    ch: [
      { wave: 'square', vol: 0.42, seq: `
        A4:0.5 A4:0.5 C5:0.5 A4:0.5 E5:1 D5:0.5 C5:0.5 B4:1 G4:1 B4:1 D5:1
        C5:0.5 B4:0.5 A4:1 E4:1 A4:1 G4:0.5 A4:0.5 B4:2
        A4:0.5 A4:0.5 C5:0.5 A4:0.5 E5:1 F5:0.5 E5:0.5 D5:1 F5:1 E5:1 D5:1
        C5:0.5 D5:0.5 E5:1 D5:1 C5:1 B4:0.5 C5:0.5 A4:2` },
      { wave: 'triangle', vol: 0.65, seq: `
        A2:0.5 A2:0.5 A2:0.5 A2:0.5 G2:0.5 G2:0.5 G2:0.5 G2:0.5
        F2:0.5 F2:0.5 F2:0.5 F2:0.5 E2:0.5 E2:0.5 E2:0.5 E2:0.5
        A2:0.5 A2:0.5 A2:0.5 A2:0.5 G2:0.5 G2:0.5 G2:0.5 G2:0.5
        F2:0.5 F2:0.5 G2:0.5 G2:0.5 A2:0.5 E2:0.5 A2:1` },
    ],
  },
  boss: {
    bpm: 160,
    ch: [
      { wave: 'square', vol: 0.42, seq: `
        E5:0.5 E5:0.5 E5:1 C5:0.5 D5:0.5 E5:1 F5:0.5 E5:0.5 D5:1 B4:0.5 C5:0.5 D5:1
        E5:0.5 D5:0.5 C5:1 A4:0.5 B4:0.5 C5:1 D5:1 B4:1 G4:1 B4:1
        E5:0.5 E5:0.5 E5:1 G5:0.5 F5:0.5 E5:1 D5:0.5 E5:0.5 F5:1 A5:1
        G5:0.5 F5:0.5 E5:1 D5:1 C5:1 B4:1 E5:1 E4:2` },
      { wave: 'triangle', vol: 0.65, seq: `
        E2:0.5 E3:0.5 E2:0.5 E3:0.5 A2:0.5 A3:0.5 A2:0.5 A3:0.5
        F2:0.5 F3:0.5 F2:0.5 F3:0.5 G2:0.5 G3:0.5 B2:0.5 B3:0.5
        E2:0.5 E3:0.5 E2:0.5 E3:0.5 A2:0.5 A3:0.5 A2:0.5 A3:0.5
        F2:0.5 F3:0.5 G2:0.5 G3:0.5 E2:0.5 B2:0.5 E2:1` },
    ],
  },
  league: {
    bpm: 132,
    ch: [
      { wave: 'square', vol: 0.42, seq: `
        C5:1 C5:0.5 C5:0.5 C5:1 D5:1 E5:2 C5:1 E5:1
        G5:2 E5:1 G5:1 A5:3 G5:1
        F5:1 F5:0.5 F5:0.5 F5:1 G5:1 A5:2 F5:1 A5:1
        G5:2 E5:1 C5:1 G4:3 R:1` },
      { wave: 'triangle', vol: 0.6, seq: `
        C3:1 G3:1 C3:1 G3:1 A2:1 E3:1 A2:1 E3:1
        E3:1 B3:1 E3:1 B3:1 A2:1 E3:1 A2:1 A2:1
        F3:1 C4:1 F3:1 C4:1 F3:1 C4:1 D3:1 A3:1
        C3:1 G3:1 A2:1 E3:1 G2:2 G2:2` },
    ],
  },
  victory: {
    bpm: 140, loop: true,
    ch: [
      { wave: 'square', vol: 0.42, seq: `
        G4:0.5 C5:0.5 E5:0.5 G5:1.5 E5:0.5 G5:2
        F5:0.5 E5:0.5 D5:0.5 C5:1 D5:1 E5:1 C5:2 R:1
        A4:1 C5:1 F5:1 E5:1 D5:1 G5:1 E5:1 C5:1 G4:2 C5:2 R:2` },
      { wave: 'triangle', vol: 0.6, seq: `
        C3:2 G3:2 C3:2 G3:2 F3:2 G3:2 C3:2 R:2
        F3:2 C3:2 G3:2 C3:2 C3:2 G2:2 C3:2 R:2` },
    ],
  },
  credits: {
    bpm: 88,
    ch: [
      { wave: 'square', vol: 0.36, seq: `
        E5:2 D5:1 C5:1 B4:2 G4:2 A4:2 B4:1 C5:1 D5:4
        C5:2 B4:1 A4:1 G4:2 E4:2 F4:2 G4:1 A4:1 G4:4
        E5:2 D5:1 C5:1 B4:2 G4:2 A4:2 B4:1 C5:1 E5:4
        D5:1 C5:1 B4:1 A4:1 G4:2 B4:2 C5:6 R:2` },
      { wave: 'triangle', vol: 0.55, seq: `
        C3:4 G2:4 A2:4 G2:4 A2:4 C3:4 F2:4 G2:4
        C3:4 G2:4 A2:4 C3:4 F2:4 G2:4 C3:6 R:2` },
    ],
  },
};
