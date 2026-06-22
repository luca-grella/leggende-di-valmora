'use strict';
/* ============================================================
   menus.js — menù di pausa, squadra, zaino, negozio, dex, PC
   ============================================================ */

function monName(mon) { return DATA.SPECIES[mon.sp].name; }
function fmtMoney(n) { return '$' + n; }
function bagList() {
  return Object.keys(Game.sv.bag).filter(id => Game.sv.bag[id] > 0);
}

/* ---------- salvataggio ---------- */
function saveGame(cb) {
  Game.sv.pos = { map: Overworld.mapId, x: Overworld.p.x, y: Overworld.p.y, dir: Overworld.p.dir };
  try {
    localStorage.setItem('valmora_save', JSON.stringify(Game.sv));
    Sfx.play('save');
    say(['Partita salvata con successo!'], cb);
  } catch (e) {
    say(['Impossibile salvare la partita!'], cb);
  }
}
function loadSave() {
  try {
    const s = localStorage.getItem('valmora_save');
    return s ? JSON.parse(s) : null;
  } catch (e) { return null; }
}

/* ---------- livelli e mosse ---------- */
function applyLevelUp(mon) {
  const prev = DATA.stats(mon);
  mon.lv++;
  const ns = DATA.stats(mon);
  mon.hp = Math.min(ns.maxhp, mon.hp + (ns.maxhp - prev.maxhp));
  return DATA.SPECIES[mon.sp].learn
    .filter(e => e[0] === mon.lv).map(e => e[1])
    .filter(id => !mon.moves.some(m => m.id === id));
}
function learnMoveFlow(mon, moveId, done) {
  const mv = DATA.MOVES[moveId];
  if (mon.moves.length < 4) {
    mon.moves.push({ id: moveId, pp: mv.pp });
    say([monName(mon) + ' impara ' + mv.n + '!'], done);
    return;
  }
  say([monName(mon) + ' vorrebbe imparare ' + mv.n + ', ma conosce già 4 mosse.', 'Dimenticare una mossa per far posto a ' + mv.n + '?'], () => {
    ask([...mon.moves.map(m => DATA.MOVES[m.id].n), 'Rinuncia'], i => {
      if (i < 0 || i === 4) { say([monName(mon) + ' non ha imparato ' + mv.n + '.'], done); return; }
      const old = DATA.MOVES[mon.moves[i].id].n;
      mon.moves[i] = { id: moveId, pp: mv.pp };
      say(['1, 2 e... puff! ' + monName(mon) + ' ha dimenticato ' + old + '...', 'E ha imparato ' + mv.n + '!'], done);
    }, { canCancel: false });
  });
}
function processNewMoves(mon, list, done) {
  if (!list.length) { done(); return; }
  learnMoveFlow(mon, list[0], () => processNewMoves(mon, list.slice(1), done));
}

/* ---------- effetti oggetti ---------- */
function itemEffect(itemId, mon) {
  const it = DATA.ITEMS[itemId];
  const st = DATA.stats(mon);
  if (it.heal) {
    if (mon.hp <= 0) return { ok: false, msg: 'Non ha effetto sui Velmon esausti!' };
    if (mon.hp >= st.maxhp) return { ok: false, msg: monName(mon) + ' ha già tutti i PS!' };
    const before = mon.hp;
    mon.hp = Math.min(st.maxhp, mon.hp + it.heal);
    return { ok: true, msg: monName(mon) + ' recupera ' + (mon.hp - before) + ' PS!' };
  }
  if (it.cure) {
    if (mon.hp <= 0) return { ok: false, msg: 'Non ha effetto sui Velmon esausti!' };
    if (!mon.status || (it.cure !== 'all' && mon.status !== it.cure)) return { ok: false, msg: 'Non avrebbe alcun effetto.' };
    mon.status = null; mon.slp = 0;
    return { ok: true, msg: monName(mon) + ' è tornato in piena forma!' };
  }
  if (it.revive) {
    if (mon.hp > 0) return { ok: false, msg: 'Non avrebbe alcun effetto.' };
    mon.hp = Math.floor(st.maxhp / 2);
    mon.status = null; mon.slp = 0;
    return { ok: true, msg: monName(mon) + ' ha riaperto gli occhi!' };
  }
  return { ok: false, msg: 'Non è il momento di usarlo!' };
}

/* ============================================================
   MENU DI PAUSA
   ============================================================ */
class PauseMenu {
  constructor() {
    this.items = ['VELMODEX', 'SQUADRA', 'ZAINO', Game.sv.name, 'SALVA', 'OPZIONI', 'ESCI'];
    this.i = 0;
  }
  update() {
    if (Input.pressed('up')) { this.i = (this.i + this.items.length - 1) % this.items.length; Sfx.play('cursor'); }
    if (Input.pressed('down')) { this.i = (this.i + 1) % this.items.length; Sfx.play('cursor'); }
    if (Input.pressed('b') || Input.pressed('start')) { Sfx.play('cancel'); UI.pop(); return; }
    if (Input.pressed('a')) {
      Sfx.play('confirm');
      switch (this.i) {
        case 0: UI.push(new DexScreen()); break;
        case 1:
          if (!Game.sv.party.length) say(['Non hai ancora nessun Velmon!']);
          else UI.push(new PartyScreen({ mode: 'field' }));
          break;
        case 2: UI.push(new BagScreen({ mode: 'field' })); break;
        case 3: UI.push(new CardScreen()); break;
        case 4: askYesNo(yes => { if (yes) saveGame(); }, { y: 40 }); break;
        case 5: UI.push(new OptionsScreen()); break;
        case 6: UI.pop(); break;
      }
    }
  }
  draw() {
    const w = 92, h = this.items.length * 13 + 10;
    drawBox(VW - w - 2, 2, w, h);
    this.items.forEach((it, k) => txt(it, VW - w + 12, 8 + k * 13, { c: '#383838' }));
    drawCursor(VW - w + 4, 9 + this.i * 13);
  }
}

/* ============================================================
   SQUADRA
   ============================================================ */
class PartyScreen {
  /* opts: mode 'field' | 'select'; cb(idx) per select; activeIdx; forcePick; title */
  constructor(opts) {
    this.o = opts || {};
    this.i = 0;
    this.swapFrom = -1;
  }
  update() {
    const party = Game.sv.party;
    if (Input.pressed('up')) { this.i = (this.i + party.length - 1) % party.length; Sfx.play('cursor'); }
    if (Input.pressed('down')) { this.i = (this.i + 1) % party.length; Sfx.play('cursor'); }
    if (Input.pressed('b') && !this.o.forcePick) {
      Sfx.play('cancel');
      UI.pop();
      if (this.o.mode === 'select' && this.o.cb) this.o.cb(-1);
      return;
    }
    if (Input.pressed('a')) {
      Sfx.play('confirm');
      if (this.o.mode === 'select') {
        UI.pop();
        this.o.cb(this.i);
        return;
      }
      if (this.swapFrom >= 0) {
        const t = party[this.swapFrom];
        party[this.swapFrom] = party[this.i];
        party[this.i] = t;
        this.swapFrom = -1;
        return;
      }
      const idx = this.i;
      ask(['Dati', 'Sposta', 'Annulla'], c => {
        if (c === 0) UI.push(new SummaryScreen(party[idx]));
        else if (c === 1) this.swapFrom = idx;
      });
    }
  }
  draw() {
    drawBox(0, 0, VW, VH, 'dark');
    txt(this.o.title || (this.swapFrom >= 0 ? 'Spostare con chi?' : 'SQUADRA'), 8, 5, { c: '#f8f8f8' });
    const party = Game.sv.party;
    party.forEach((mon, k) => {
      const y = 18 + k * 23;
      const sel = k === this.i;
      drawBox(4, y, VW - 8, 21, sel ? undefined : 'dark');
      MonArt.drawIcon(cx, mon.sp, 8, y + 2, 17);
      const tc = sel ? '#383838' : '#e8e8e8';
      txt(monName(mon), 30, y + 3, { c: tc });
      txt('Lv' + mon.lv, 96, y + 3, { c: tc });
      const st = DATA.stats(mon);
      drawHPBar(132, y + 7, 56, mon.hp, st.maxhp);
      txt(mon.hp + '/' + st.maxhp, 194, y + 3, { c: tc, size: 7 });
      drawStatusTag(mon.status, 30, y + 12);
      if (mon.hp <= 0) txt('KO', 100, y + 12, { c: '#e05050', size: 7 });
      if (this.swapFrom === k) txt('<>', 118, y + 3, { c: '#d04848' });
    });
  }
}

/* ============================================================
   SCHEDA VELMON
   ============================================================ */
class SummaryScreen {
  constructor(mon) { this.mon = mon; this.page = 0; }
  update() {
    if (Input.pressed('b')) { Sfx.play('cancel'); UI.pop(); return; }
    if (Input.pressed('left') || Input.pressed('right')) { this.page = 1 - this.page; Sfx.play('cursor'); }
  }
  draw() {
    const mon = this.mon, sp = DATA.SPECIES[mon.sp], st = DATA.stats(mon);
    drawBox(0, 0, VW, VH, 'dark');
    drawBox(4, 4, 92, 100);
    MonArt.drawFront(cx, mon.sp, 18, 14, true);
    txt(sp.name, 10, 82, { c: '#383838' });
    txt('Lv' + mon.lv, 10, 92, { c: '#383838', size: 7 });
    drawTypeTag(sp.type, 46, 91);
    drawBox(100, 4, 136, 100);
    if (this.page === 0) {
      txt('DATI', 108, 9, { c: '#383838' });
      txt('PS', 108, 24, { c: '#707070' }); txt(mon.hp + '/' + st.maxhp, 170, 24, { c: '#383838' });
      txt('Attacco', 108, 37, { c: '#707070' }); txt('' + st.atk, 186, 37, { c: '#383838' });
      txt('Difesa', 108, 50, { c: '#707070' }); txt('' + st.def, 186, 50, { c: '#383838' });
      txt('Speciale', 108, 63, { c: '#707070' }); txt('' + st.spc, 186, 63, { c: '#383838' });
      txt('Velocità', 108, 76, { c: '#707070' }); txt('' + st.spd, 186, 76, { c: '#383838' });
      const next = mon.lv >= 100 ? 0 : DATA.expForLv(mon.lv + 1) - mon.xp;
      txt('Prossimo Lv: ' + next + ' EXP', 108, 90, { c: '#707070', size: 7 });
    } else {
      txt('MOSSE', 108, 9, { c: '#383838' });
      this.mon.moves.forEach((m, k) => {
        const mv = DATA.MOVES[m.id];
        txt(mv.n, 108, 22 + k * 20, { c: '#383838' });
        drawTypeTag(mv.t, 108, 31 + k * 20);
        txt('PP ' + m.pp + '/' + mv.pp, 162, 31 + k * 20, { c: '#707070', size: 7 });
      });
    }
    drawBox(4, 108, VW - 8, 48);
    wrapText(sp.dex, VW - 28).slice(0, 3).forEach((r, k) => txt(r, 10, 114 + k * 12, { c: '#383838', size: 7 }));
    txt('◀ ▶ cambia pagina   B esci', 10, 148, { c: '#9098a8', size: 7 });
  }
}

/* ============================================================
   ZAINO
   ============================================================ */
class BagScreen {
  /* opts: mode 'field' | 'battle'; cb(itemId) per battle */
  constructor(opts) {
    this.o = opts || {};
    this.i = 0;
    this.scroll = 0;
  }
  items() {
    let ids = bagList();
    if (this.o.mode === 'battle') {
      ids = ids.filter(id => {
        const it = DATA.ITEMS[id];
        return it.heal || it.cure || it.revive || it.ball;
      });
    }
    return ids;
  }
  update() {
    const ids = this.items();
    if (Input.pressed('b')) {
      Sfx.play('cancel'); UI.pop();
      if (this.o.mode === 'battle' && this.o.cb) this.o.cb(null);
      return;
    }
    if (!ids.length) {
      if (Input.pressed('a')) { Sfx.play('cancel'); UI.pop(); if (this.o.mode === 'battle' && this.o.cb) this.o.cb(null); }
      return;
    }
    if (Input.pressed('up')) { this.i = (this.i + ids.length - 1) % ids.length; Sfx.play('cursor'); }
    if (Input.pressed('down')) { this.i = (this.i + 1) % ids.length; Sfx.play('cursor'); }
    this.i = clamp(this.i, 0, ids.length - 1);
    if (Input.pressed('a')) {
      const id = ids[this.i];
      Sfx.play('confirm');
      if (this.o.mode === 'battle') {
        UI.pop();
        this.o.cb(id);
        return;
      }
      this.useField(id);
    }
  }
  useField(id) {
    const it = DATA.ITEMS[id];
    if (it.ball) { say(['Non è il momento di usarlo!']); return; }
    if (!Game.sv.party.length) { say(['Non hai nessun Velmon!']); return; }
    if (it.candy) {
      UI.push(new PartyScreen({ mode: 'select', title: 'A chi darla?', cb: idx => {
        if (idx < 0) return;
        const mon = Game.sv.party[idx];
        if (mon.lv >= 100) { say(['Non avrebbe alcun effetto.']); return; }
        Game.sv.bag[id]--;
        mon.xp = DATA.expForLv(mon.lv + 1);
        const newMoves = applyLevelUp(mon);
        Sfx.play('levelup');
        say([monName(mon) + ' sale al livello ' + mon.lv + '!'], () => {
          processNewMoves(mon, newMoves, () => {
            const sp = DATA.SPECIES[mon.sp];
            if (sp.evolve && mon.lv >= sp.evolve.lv) {
              UI.clear();
              Game.set('evolve', [{ mon, to: sp.evolve.to }], () => {
                Game.resume('overworld');
                Overworld.resumeMusic();
              });
            }
          });
        });
      } }));
      return;
    }
    UI.push(new PartyScreen({ mode: 'select', title: 'Su chi usarlo?', cb: idx => {
      if (idx < 0) return;
      const res = itemEffect(id, Game.sv.party[idx]);
      if (res.ok) { Game.sv.bag[id]--; Sfx.play('heal'); }
      say([res.msg]);
    } }));
  }
  draw() {
    drawBox(0, 0, VW, VH, 'dark');
    txt('ZAINO', 8, 5, { c: '#f8f8f8' });
    txt(fmtMoney(Game.sv.money), VW - 70, 5, { c: '#f8e858' });
    drawBox(4, 16, VW - 8, 120);
    const ids = this.items();
    if (!ids.length) { txt('Lo zaino è vuoto.', 14, 24, { c: '#707070' }); }
    const view = 8;
    if (this.i < this.scroll) this.scroll = this.i;
    if (this.i >= this.scroll + view) this.scroll = this.i - view + 1;
    ids.slice(this.scroll, this.scroll + view).forEach((id, k) => {
      const it = DATA.ITEMS[id];
      const y = 22 + k * 14;
      txt(it.n, 22, y, { c: '#383838' });
      txt('x' + Game.sv.bag[id], 140, y, { c: '#707070' });
    });
    if (ids.length) drawCursor(10, 23 + (this.i - this.scroll) * 14);
    drawBox(4, 138, VW - 8, 18);
    if (ids.length) txt(DATA.ITEMS[ids[this.i]].desc, 10, 143, { c: '#383838', size: 7 });
  }
}

/* ============================================================
   NEGOZIO
   ============================================================ */
class ShopScreen {
  /* kind: 'buy' (stock) | 'sell' */
  constructor(kind, stock) {
    this.kind = kind;
    this.stock = stock || [];
    this.i = 0;
  }
  list() { return this.kind === 'buy' ? this.stock : bagList().filter(id => DATA.ITEMS[id].price > 0); }
  update() {
    const ids = this.list();
    if (Input.pressed('b')) { Sfx.play('cancel'); UI.pop(); return; }
    if (!ids.length) { if (Input.pressed('a')) { Sfx.play('cancel'); UI.pop(); } return; }
    if (Input.pressed('up')) { this.i = (this.i + ids.length - 1) % ids.length; Sfx.play('cursor'); }
    if (Input.pressed('down')) { this.i = (this.i + 1) % ids.length; Sfx.play('cursor'); }
    this.i = clamp(this.i, 0, ids.length - 1);
    if (Input.pressed('a')) {
      const id = ids[this.i];
      const it = DATA.ITEMS[id];
      if (this.kind === 'buy') {
        if (Game.sv.money >= it.price) {
          Game.sv.money -= it.price;
          Game.sv.bag[id] = (Game.sv.bag[id] || 0) + 1;
          Sfx.play('buy');
        } else Sfx.play('bump');
      } else {
        const val = Math.floor(it.price / 2);
        Game.sv.bag[id]--;
        Game.sv.money += val;
        Sfx.play('buy');
      }
    }
  }
  draw() {
    drawBox(0, 0, VW, VH, 'dark');
    txt(this.kind === 'buy' ? 'EMPORIO — COMPRA' : 'EMPORIO — VENDI', 8, 5, { c: '#f8f8f8' });
    txt(fmtMoney(Game.sv.money), VW - 70, 5, { c: '#f8e858' });
    drawBox(4, 16, VW - 8, 122);
    const ids = this.list();
    if (!ids.length) txt('Niente da vendere.', 14, 24, { c: '#707070' });
    ids.slice(0, 8).forEach((id, k) => {
      const it = DATA.ITEMS[id];
      const y = 22 + k * 14;
      txt(it.n, 22, y, { c: '#383838' });
      const price = this.kind === 'buy' ? it.price : Math.floor(it.price / 2);
      txt(fmtMoney(price), 130, y, { c: '#383838' });
      if (this.kind === 'sell') txt('x' + Game.sv.bag[id], 190, y, { c: '#707070' });
    });
    if (ids.length) drawCursor(10, 23 + this.i * 14);
    drawBox(4, 140, VW - 8, 16);
    if (ids.length) txt(DATA.ITEMS[ids[this.i]].desc, 10, 144, { c: '#383838', size: 7 });
  }
}
function openShop(stock) {
  say(['Benvenuto! Come posso aiutarti?'], () => {
    ask(['Compra', 'Vendi', 'Esci'], i => {
      if (i === 0) UI.push(new ShopScreen('buy', stock));
      else if (i === 1) UI.push(new ShopScreen('sell'));
    });
  });
}

/* ============================================================
   VELMODEX
   ============================================================ */
class DexScreen {
  constructor() { this.i = 0; this.scroll = 0; }
  update() {
    const n = DATA.DEX_ORDER.length;
    if (Input.pressed('b')) { Sfx.play('cancel'); UI.pop(); return; }
    if (Input.pressed('up')) { this.i = (this.i + n - 1) % n; Sfx.play('cursor'); }
    if (Input.pressed('down')) { this.i = (this.i + 1) % n; Sfx.play('cursor'); }
    if (Input.pressed('a')) {
      const id = DATA.DEX_ORDER[this.i];
      if (Game.sv.dex.seen[id]) { Sfx.play('confirm'); UI.push(new DexEntry(id)); }
    }
  }
  draw() {
    drawBox(0, 0, VW, VH, 'dark');
    const seen = Object.keys(Game.sv.dex.seen).length;
    const caught = Object.keys(Game.sv.dex.caught).length;
    txt('VELMODEX', 8, 5, { c: '#f8f8f8' });
    txt('Visti: ' + seen + '  Presi: ' + caught, 110, 5, { c: '#f8e858', size: 7 });
    drawBox(4, 16, VW - 8, 140);
    const view = 10;
    if (this.i < this.scroll) this.scroll = this.i;
    if (this.i >= this.scroll + view) this.scroll = this.i - view + 1;
    for (let k = 0; k < view; k++) {
      const di = this.scroll + k;
      if (di >= DATA.DEX_ORDER.length) break;
      const id = DATA.DEX_ORDER[di];
      const y = 21 + k * 13;
      txt('N.' + String(di + 1).padStart(3, '0'), 22, y, { c: '#707070', size: 7 });
      if (Game.sv.dex.seen[id]) {
        txt(DATA.SPECIES[id].name, 64, y, { c: '#383838' });
        if (Game.sv.dex.caught[id]) drawBallSprite(cx, 150, y, 8);
      } else {
        txt('----------', 64, y, { c: '#b0b0b0' });
      }
    }
    drawCursor(10, 22 + (this.i - this.scroll) * 13);
  }
}
class DexEntry {
  constructor(id) { this.id = id; }
  update() { if (Input.pressed('b') || Input.pressed('a')) { Sfx.play('cancel'); UI.pop(); } }
  draw() {
    const sp = DATA.SPECIES[this.id];
    drawBox(0, 0, VW, VH, 'dark');
    drawBox(4, 4, 92, 96);
    MonArt.drawFront(cx, this.id, 18, 14, true);
    drawBox(100, 4, 136, 96);
    txt('N.' + String(DATA.DEX_ORDER.indexOf(this.id) + 1).padStart(3, '0'), 108, 10, { c: '#707070' });
    txt(sp.name, 108, 24, { c: '#383838' });
    drawTypeTag(sp.type, 108, 38);
    txt(Game.sv.dex.caught[this.id] ? 'CATTURATO' : 'VISTO', 108, 54, { c: '#707070', size: 7 });
    drawBox(4, 104, VW - 8, 52);
    wrapText(sp.dex, VW - 28).slice(0, 3).forEach((r, k) => txt(r, 10, 110 + k * 12, { c: '#383838', size: 7 }));
  }
}

/* ============================================================
   SCHEDA GIOCATORE
   ============================================================ */
class CardScreen {
  update() { if (Input.pressed('b') || Input.pressed('a')) { Sfx.play('cancel'); UI.pop(); } }
  draw() {
    drawBox(0, 0, VW, VH, 'dark');
    drawBox(10, 14, VW - 20, 120);
    txt('SCHEDA ALLENATORE', 20, 22, { c: '#383838' });
    Chars.draw(cx, 'player', 'down', 0, VW - 44, 24);
    txt('Nome: ' + Game.sv.name, 20, 42, { c: '#383838' });
    txt('Soldi: ' + fmtMoney(Game.sv.money), 20, 56, { c: '#383838' });
    const sec = Game.sv.playSec || 0;
    txt('Tempo: ' + Math.floor(sec / 3600) + 'h ' + Math.floor(sec / 60) % 60 + 'm', 20, 70, { c: '#383838' });
    txt('Velmodex: ' + Object.keys(Game.sv.dex.caught).length + ' catturati', 20, 84, { c: '#383838' });
    txt('Sigilli:', 20, 100, { c: '#383838' });
    const names = ['PIETRA', 'ONDA', 'FULMINE', 'BRACE'];
    const cols = ['#b8a038', '#6890f0', '#e8c020', '#f08030'];
    names.forEach((n, k) => {
      const x = 64 + k * 40;
      cx.fillStyle = Game.sv.badges[k] ? cols[k] : '#c8c8c8';
      cx.beginPath(); cx.arc(x + 6, 104, 6, 0, 7); cx.fill();
      cx.fillStyle = '#404040';
      txt(n, x - 6, 112, { c: Game.sv.badges[k] ? '#383838' : '#b0b0b0', size: 6 });
    });
    if (Game.sv.flags.champion) txt('★ CAMPIONE DI VALMORA ★', 20, 122, { c: '#d04848', size: 7 });
  }
}

/* ============================================================
   OPZIONI
   ============================================================ */
class OptionsScreen {
  constructor() { this.i = 0; }
  update() {
    if (Input.pressed('b')) { Sfx.play('cancel'); UI.pop(); return; }
    if (Input.pressed('up') || Input.pressed('down')) { this.i = 1 - this.i; Sfx.play('cursor'); }
    if (Input.pressed('left') || Input.pressed('right')) {
      const d = Input.pressed('left') ? -1 : 1;
      if (this.i === 0) Game.sv.opts.textSpeed = clamp(Game.sv.opts.textSpeed + d, 0, 2);
      else {
        Game.sv.opts.audio = !Game.sv.opts.audio;
        Music.setEnabled(Game.sv.opts.audio);
      }
      Sfx.play('cursor');
    }
  }
  draw() {
    drawBox(0, 0, VW, VH, 'dark');
    drawBox(20, 30, VW - 40, 70);
    txt('OPZIONI', 30, 38, { c: '#383838' });
    txt('Testo', 34, 56, { c: '#383838' });
    txt(['LENTO', 'NORMALE', 'VELOCE'][Game.sv.opts.textSpeed], 130, 56, { c: '#d04848' });
    txt('Audio', 34, 72, { c: '#383838' });
    txt(Game.sv.opts.audio ? 'SÌ' : 'NO', 130, 72, { c: '#d04848' });
    drawCursor(26, 57 + this.i * 16);
    txt('◀ ▶ per cambiare, B per uscire', 30, 88, { c: '#9098a8', size: 7 });
  }
}

/* ============================================================
   PC — BOX VELMON
   ============================================================ */
function openPC() {
  Sfx.play('confirm');
  say(['Hai acceso il PC.', 'Sistema di Custodia Velmon: pronto!'], () => {
    pcMenu();
  });
}
function pcMenu() {
  ask(['Deposita', 'Preleva', 'Esci'], i => {
    if (i === 0) {
      if (Game.sv.party.length <= 1) { say(['Non puoi depositare il tuo ultimo Velmon!'], pcMenu); return; }
      UI.push(new PartyScreen({ mode: 'select', title: 'Chi vuoi depositare?', cb: idx => {
        if (idx < 0) { pcMenu(); return; }
        const mon = Game.sv.party.splice(idx, 1)[0];
        Game.sv.box.push(mon);
        say([monName(mon) + ' è al sicuro nel Box!'], pcMenu);
      } }));
    } else if (i === 1) {
      if (!Game.sv.box.length) { say(['Il Box è vuoto.'], pcMenu); return; }
      UI.push(new BoxScreen());
    }
  });
}
class BoxScreen {
  constructor() { this.i = 0; this.scroll = 0; }
  update() {
    const box = Game.sv.box;
    if (Input.pressed('b') || !box.length) { Sfx.play('cancel'); UI.pop(); pcMenu(); return; }
    if (Input.pressed('up')) { this.i = (this.i + box.length - 1) % box.length; Sfx.play('cursor'); }
    if (Input.pressed('down')) { this.i = (this.i + 1) % box.length; Sfx.play('cursor'); }
    this.i = clamp(this.i, 0, box.length - 1);
    if (Input.pressed('a')) {
      if (Game.sv.party.length >= 6) { say(['La squadra è al completo!']); return; }
      const mon = box.splice(this.i, 1)[0];
      Game.sv.party.push(mon);
      Sfx.play('confirm');
      this.i = clamp(this.i, 0, Math.max(0, box.length - 1));
      say([monName(mon) + ' torna in squadra!']);
    }
  }
  draw() {
    drawBox(0, 0, VW, VH, 'dark');
    txt('BOX VELMON', 8, 5, { c: '#f8f8f8' });
    txt('A: preleva  B: chiudi', 120, 5, { c: '#b8c0d8', size: 7 });
    drawBox(4, 16, VW - 8, 140);
    const view = 9;
    if (this.i < this.scroll) this.scroll = this.i;
    if (this.i >= this.scroll + view) this.scroll = this.i - view + 1;
    Game.sv.box.slice(this.scroll, this.scroll + view).forEach((mon, k) => {
      const y = 22 + k * 15;
      MonArt.drawIcon(cx, mon.sp, 20, y - 2, 14);
      txt(monName(mon), 40, y, { c: '#383838' });
      txt('Lv' + mon.lv, 120, y, { c: '#707070' });
    });
    if (Game.sv.box.length) drawCursor(10, 23 + (this.i - this.scroll) * 15);
  }
}
