'use strict';
/* ============================================================
   LEGGENDE DI VALMORA — engine.js
   Motore base: canvas, input, loop, testo, box, transizioni
   ============================================================ */

const TILE = 16, VW = 240, VH = 160;
let cv = null, cx = null;
let SCALE = 3;   // risoluzione interna = 240x160 × SCALE: sprite chunky, testo nitido

/* ---------- utilità ---------- */
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function rndi(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
function chance(p) { return Math.random() < p; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/* ---------- stato globale di gioco ---------- */
const Game = {
  states: {}, state: null, frame: 0,
  sv: null,                 // dati salvataggio correnti
  fade: { a: 0, target: 0, speed: 0.08, cb: null },
  set(name, ...args) {
    const s = this.states[name];
    this.state = name;
    if (s && s.enter) s.enter(...args);
  },
  resume(name) { this.state = name; },   // torna a uno stato senza ri-enter
  cur() { return this.states[this.state]; },
  fadeOut(cb, speed) {
    this.fade.target = 1; this.fade.speed = speed || 0.08; this.fade.cb = cb || null;
  },
  fadeIn(cb, speed) {
    this.fade.target = 0; this.fade.speed = speed || 0.08; this.fade.cb = cb || null;
  },
};

/* ---------- input (tastiera + touch) ---------- */
const Input = {
  held: {}, prev: {},
  KEYMAP: {
    ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
    ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
    KeyZ: 'a', Space: 'a', KeyX: 'b', Backspace: 'b',
    Enter: 'start', KeyM: 'mute',
  },
  init() {
    addEventListener('keydown', e => {
      const k = this.KEYMAP[e.code];
      if (k) { this.held[k] = true; e.preventDefault(); }
    });
    addEventListener('keyup', e => {
      const k = this.KEYMAP[e.code];
      if (k) { this.held[k] = false; e.preventDefault(); }
    });
    // controlli touch
    if ('ontouchstart' in window) {
      const t = document.getElementById('touch');
      if (t) t.style.display = 'block';
      const bind = (id, key) => {
        const el = document.getElementById(id);
        if (!el) return;
        const on = e => { e.preventDefault(); this.held[key] = true; };
        const off = e => { e.preventDefault(); this.held[key] = false; };
        el.addEventListener('touchstart', on, { passive: false });
        el.addEventListener('touchend', off, { passive: false });
        el.addEventListener('touchcancel', off, { passive: false });
      };
      bind('b-up', 'up'); bind('b-down', 'down'); bind('b-left', 'left'); bind('b-right', 'right');
      bind('b-a', 'a'); bind('b-b', 'b'); bind('b-start', 'start');
    }
  },
  pressed(k) { return !!this.held[k] && !this.prev[k]; },
  dir() {
    if (this.held.up) return 'up';
    if (this.held.down) return 'down';
    if (this.held.left) return 'left';
    if (this.held.right) return 'right';
    return null;
  },
  endFrame() { this.prev = Object.assign({}, this.held); },
};

const DIRS = {
  up: { dx: 0, dy: -1 }, down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 }, right: { dx: 1, dy: 0 },
};

/* ---------- testo ---------- */
function setFont(size) {
  cx.font = 'bold ' + (size || 8) + 'px "Trebuchet MS", Verdana, "Segoe UI", sans-serif';
  cx.textBaseline = 'top';
}
function txt(s, x, y, o) {
  o = o || {};
  setFont(o.size);
  if (o.shadow) { cx.fillStyle = o.shadow; cx.fillText(s, x + 1, y + 1); }
  cx.fillStyle = o.c || '#383838';
  cx.fillText(s, x, y);
}
function txtW(s, size) { setFont(size); return cx.measureText(s).width; }
function txtC(s, xCenter, y, o) {  // centrato
  o = o || {};
  const w = txtW(s, o.size);
  txt(s, Math.round(xCenter - w / 2), y, o);
}
function wrapText(s, maxw, size) {
  setFont(size);
  const words = String(s).split(' ');
  const lines = []; let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (cx.measureText(test).width > maxw && line) { lines.push(line); line = w; }
    else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

/* ---------- box stile GBA ---------- */
function drawBox(x, y, w, h, style) {
  const dark = style === 'dark';
  // ombra esterna
  cx.fillStyle = 'rgba(0,0,0,0.25)';
  cx.fillRect(x + 2, y + 2, w, h);
  // bordo esterno scuro
  cx.fillStyle = '#18203a';
  cx.fillRect(x, y, w, h);
  // bordo interno colorato (GBA style: blu medio)
  cx.fillStyle = dark ? '#3a4a6a' : '#5878a8';
  cx.fillRect(x + 1, y + 1, w - 2, h - 2);
  // sfondo interno
  cx.fillStyle = dark ? '#283450' : '#f0f4f8';
  cx.fillRect(x + 2, y + 2, w - 4, h - 4);
  // highlight top per effetto 3D
  if (!dark) {
    cx.fillStyle = 'rgba(255,255,255,0.6)';
    cx.fillRect(x + 2, y + 2, w - 4, 1);
    cx.fillStyle = 'rgba(255,255,255,0.2)';
    cx.fillRect(x + 2, y + 3, 1, h - 5);
  }
}
function drawCursor(x, y, color) {
  cx.fillStyle = color || '#383838';
  cx.beginPath();
  cx.moveTo(x, y); cx.lineTo(x + 5, y + 3); cx.lineTo(x, y + 6);
  cx.closePath(); cx.fill();
}
function drawArrowBlink(x, y) {
  if (Math.floor(Game.frame / 20) % 2 === 0) {
    cx.fillStyle = '#d04848';
    cx.beginPath();
    cx.moveTo(x, y); cx.lineTo(x + 6, y); cx.lineTo(x + 3, y + 4);
    cx.closePath(); cx.fill();
  }
}

/* ---------- barra HP ---------- */
function hpColor(ratio) {
  return ratio > 0.5 ? '#58c858' : ratio > 0.2 ? '#f8b838' : '#f05858';
}
function drawHPBar(x, y, w, hp, maxhp) {
  const r = maxhp > 0 ? clamp(hp / maxhp, 0, 1) : 0;
  const fill = Math.round(w * r);
  const col = hpColor(r);
  // outer border
  cx.fillStyle = '#283858'; cx.fillRect(x - 1, y - 1, w + 2, 6);
  // track (dark)
  cx.fillStyle = '#303848'; cx.fillRect(x, y, w, 4);
  // bar fill
  cx.fillStyle = col; cx.fillRect(x, y, fill, 4);
  // shine highlight on bar
  if (fill > 2) { cx.fillStyle = 'rgba(255,255,255,0.35)'; cx.fillRect(x, y, fill, 1); }
}

/* ---------- canvas ---------- */
function initCanvas() {
  cv = document.getElementById('game');
  cx = cv.getContext('2d');
  const resize = () => {
    const isTouch = ('ontouchstart' in window);
    const availH = innerHeight - (isTouch ? 150 : 16);
    const disp = Math.max(1, Math.min(innerWidth / VW, Math.max(availH, 160) / VH));
    cv.style.width = Math.round(VW * disp) + 'px';
    cv.style.height = Math.round(VH * disp) + 'px';
    // risoluzione interna adattata allo schermo reale (testo sempre nitido)
    SCALE = clamp(Math.ceil(disp * (window.devicePixelRatio || 1)), 2, 8);
    cv.width = VW * SCALE;
    cv.height = VH * SCALE;
    cx.imageSmoothingEnabled = false;
    if (isTouch) {
      document.getElementById('wrap').style.alignItems = 'flex-start';
      cv.style.marginTop = '8px';
    }
  };
  resize();
  addEventListener('resize', resize);
}

/* ---------- loop principale ---------- */
let _lastSec = 0;
function mainLoop(ts) {
  requestAnimationFrame(mainLoop);
  Game.frame++;
  // tempo di gioco
  if (Game.sv && ts - _lastSec > 1000) { Game.sv.playSec = (Game.sv.playSec || 0) + 1; _lastSec = ts; }

  // update: la UI in cima cattura l'input, altrimenti lo stato corrente
  if (UI.stack.length) {
    const top = UI.top();
    if (top && top.update) top.update();
  } else {
    const s = Game.cur();
    if (s && s.update) s.update();
  }

  // draw (tutte le coordinate restano in spazio 240x160)
  cx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  cx.imageSmoothingEnabled = false;
  cx.fillStyle = '#000';
  cx.fillRect(0, 0, VW, VH);
  const s = Game.cur();
  if (s && s.draw) s.draw();
  UI.draw();

  // dissolvenza
  const f = Game.fade;
  if (f.a !== f.target) {
    f.a += (f.target > f.a ? 1 : -1) * f.speed;
    if (Math.abs(f.a - f.target) < f.speed) {
      f.a = f.target;
      if (f.cb) { const cb = f.cb; f.cb = null; cb(); }
    }
  }
  if (f.a > 0.01) {
    cx.fillStyle = 'rgba(0,0,0,' + f.a.toFixed(2) + ')';
    cx.fillRect(0, 0, VW, VH);
  }

  Input.endFrame();
}
