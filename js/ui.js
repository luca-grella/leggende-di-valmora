'use strict';
/* ============================================================
   ui.js — stack UI, dialoghi, scelte
   ============================================================ */

const UI = {
  stack: [],
  push(c) { this.stack.push(c); if (c.open) c.open(); },
  pop() { return this.stack.pop(); },
  top() { return this.stack[this.stack.length - 1]; },
  clear() { this.stack = []; },
  draw() { for (const u of this.stack) if (u.draw) u.draw(); },
};

function textSpeed() {
  const i = Game.sv && Game.sv.opts ? Game.sv.opts.textSpeed : 1;
  return [0.5, 1, 2][i] || 1;
}

/* ---------- dialogo a pagine con effetto macchina da scrivere ---------- */
class Dialog {
  constructor(lines, cb) {
    this.pages = [];
    const arr = Array.isArray(lines) ? lines : [lines];
    const maxw = VW - 26;
    for (const line of arr) {
      const rows = wrapText(String(line), maxw);
      for (let i = 0; i < rows.length; i += 2) this.pages.push(rows.slice(i, i + 2));
    }
    if (!this.pages.length) this.pages.push(['...']);
    this.pi = 0; this.chars = 0; this.cb = cb || null;
  }
  pageLen() { return this.pages[this.pi].reduce((a, r) => a + r.length, 0); }
  update() {
    const total = this.pageLen();
    if (this.chars < total) {
      this.chars += textSpeed();
      if (Input.pressed('a') || Input.pressed('b')) this.chars = total;
    } else if (Input.pressed('a') || Input.pressed('b')) {
      this.pi++;
      this.chars = 0;
      if (this.pi >= this.pages.length) {
        UI.pop();
        if (this.cb) this.cb();
      }
    }
  }
  draw() {
    drawBox(2, VH - 42, VW - 4, 40);
    const page = this.pages[this.pi];
    let budget = Math.floor(this.chars);
    for (let i = 0; i < page.length; i++) {
      const take = clamp(budget, 0, page[i].length);
      txt(page[i].slice(0, take), 10, VH - 33 + i * 13, { c: '#383838' });
      budget -= page[i].length;
    }
    if (this.chars >= this.pageLen()) drawArrowBlink(VW - 16, VH - 10);
  }
}
function say(lines, cb) { UI.push(new Dialog(lines, cb)); }

/* ---------- menù di scelta ---------- */
class Choice {
  constructor(options, cb, opts) {
    opts = opts || {};
    this.options = options;
    this.cb = cb;
    this.i = 0;
    this.canCancel = opts.canCancel !== false;
    setFont(8);
    this.w = opts.w || Math.max(...options.map(o => cx.measureText(o).width)) + 24;
    this.h = options.length * 13 + 10;
    this.x = opts.x !== undefined ? opts.x : VW - 4 - this.w;
    this.y = opts.y !== undefined ? opts.y : VH - 44 - this.h;
  }
  update() {
    if (Input.pressed('up')) { this.i = (this.i + this.options.length - 1) % this.options.length; Sfx.play('cursor'); }
    if (Input.pressed('down')) { this.i = (this.i + 1) % this.options.length; Sfx.play('cursor'); }
    if (Input.pressed('a')) {
      Sfx.play('confirm');
      UI.pop();
      this.cb(this.i);
    } else if (Input.pressed('b') && this.canCancel) {
      Sfx.play('cancel');
      UI.pop();
      this.cb(-1);
    }
  }
  draw() {
    drawBox(this.x, this.y, this.w, this.h);
    for (let k = 0; k < this.options.length; k++) {
      txt(this.options[k], this.x + 16, this.y + 6 + k * 13, { c: '#383838' });
    }
    drawCursor(this.x + 7, this.y + 7 + this.i * 13);
  }
}
function ask(options, cb, opts) { UI.push(new Choice(options, cb, opts)); }
function askYesNo(cb, opts) { ask(['Sì', 'No'], i => cb(i === 0), opts); }

/* ---------- riquadro descrizione tipo ---------- */
function drawTypeTag(t, x, y) {
  const w = 44;
  cx.fillStyle = DATA.TYPE_COLORS[t] || '#888';
  cx.fillRect(x, y, w, 10);
  cx.fillStyle = 'rgba(0,0,0,0.25)';
  cx.fillRect(x, y + 8, w, 2);
  setFont(7);
  cx.fillStyle = '#fff';
  cx.fillText(t.toUpperCase(), x + (w - cx.measureText(t.toUpperCase()).width) / 2, y + 1);
}

function drawStatusTag(st, x, y) {
  if (!st) return;
  cx.fillStyle = DATA.statusColor[st];
  cx.fillRect(x, y, 22, 9);
  setFont(7);
  cx.fillStyle = '#fff';
  cx.fillText(DATA.statusLabel[st], x + 3, y + 1);
}
