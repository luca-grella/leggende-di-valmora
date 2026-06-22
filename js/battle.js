'use strict';
/* ============================================================
   battle.js — sistema di lotta a turni (stile prima/terza gen)
   ============================================================ */

const BADGE_NAMES = ['SIGILLO DI PIETRA', 'SIGILLO DELL\'ONDA', 'SIGILLO DEL FULMINE', 'SIGILLO DELLA BRACE'];
const STRUGGLE = { n: 'Disperazione', t: 'Normale', p: 50, a: 100, pp: 0 };

const Battle = Game.states.battle = {
  /* opts: { kind:'wild'|'trainer', sp, lv, trainer:{name,preset,team,money,winText,boss,badge,champion},
            env:'field'|'cave'|'arena', onEnd(result) } */
  enter(opts) {
    this.kind = opts.kind;
    this.env = opts.env || 'field';
    this.onEnd = opts.onEnd || null;
    this.trainer = opts.trainer || null;
    this.party = Game.sv.party;
    this.pIdx = this.party.findIndex(m => m.hp > 0);
    if (this.pIdx < 0) this.pIdx = 0;
    this.eTeam = this.kind === 'wild'
      ? [DATA.makeMon(opts.sp, opts.lv)]
      : this.trainer.team.map(([sp, lv]) => DATA.makeMon(sp, lv));
    this.eIdx = 0;
    this.pStages = { atk: 0, def: 0, spd: 0, spc: 0 };
    this.eStages = { atk: 0, def: 0, spd: 0, spc: 0 };
    this.disp = { p: this.pmon().hp, e: this.emon().hp };
    this.fxSide = null;
    this.faintOff = { p: 0, e: 0 };
    this.hidden = { p: false, e: false };
    this.enemyHidden = false;
    this.ballDraw = null;
    this.phase = 'queue';
    this.menuI = 0; this.moveI = 0;
    this.runAttempts = 0;
    this.pendingEvo = [];
    this.skipRest = false;
    this.over = false;
    Game.sv.dex.seen[this.emon().sp] = 1;
    Music.play(this.trainer && this.trainer.boss ? 'boss' : 'battle');
    this.q = [];
    if (this.kind === 'wild') {
      this.q.push({ t: 'msg', s: 'Appare ' + monName(this.emon()) + ' selvatico! (Lv' + this.emon().lv + ')' });
    } else {
      this.q.push({ t: 'msg', s: this.trainer.name + ' ti sfida!' });
      this.q.push({ t: 'msg', s: this.trainer.name + ' manda in campo ' + monName(this.emon()) + '!' });
    }
    this.q.push({ t: 'msg', s: 'Vai! ' + monName(this.pmon()) + '!' });
    this.q.push({ t: 'menu' });
  },

  pmon() { return this.party[this.pIdx]; },
  emon() { return this.eTeam[this.eIdx]; },
  insertQ(...items) { this.q.splice(1, 0, ...items); },

  effStat(mon, stat, stages) {
    let v = DATA.stats(mon)[stat] * DATA.stageMult(stages[stat]);
    if (stat === 'atk' && mon.status === 'brn') v *= 0.5;
    if (stat === 'spd' && mon.status === 'par') v *= 0.5;
    return Math.max(1, Math.floor(v));
  },

  calcDmg(att, attStages, def, defStages, mv) {
    const phys = DATA.PHYS[mv.t];
    const A = this.effStat(att, phys ? 'atk' : 'spc', attStages);
    const D = this.effStat(def, phys ? 'def' : 'spc', defStages);
    let dmg = Math.floor(Math.floor(Math.floor(2 * att.lv / 5 + 2) * mv.p * A / Math.max(1, D)) / 50) + 2;
    const sp = DATA.SPECIES[att.sp];
    const crit = Math.random() < (mv.crit ? 0.25 : sp.base.spd / 512);
    if (crit) dmg *= 2;
    const stab = mv.t === sp.type ? 1.5 : 1;
    const e = DATA.eff(mv.t, DATA.SPECIES[def.sp].type);
    dmg = Math.floor(dmg * stab * e * (0.85 + Math.random() * 0.15));
    return { dmg: Math.max(1, dmg), crit, e };
  },

  /* ---------- IA nemica ---------- */
  enemyAI() {
    const e = this.emon();
    const usable = e.moves.map((m, i) => ({ m, i })).filter(x => x.m.pp > 0);
    if (!usable.length) return -1; // disperazione
    const p = this.pmon();
    let best = usable[0], bestScore = -1;
    for (const x of usable) {
      const mv = DATA.MOVES[x.m.id];
      let score;
      if (mv.p > 0) {
        score = mv.p * DATA.eff(mv.t, DATA.SPECIES[p.sp].type) * (mv.t === DATA.SPECIES[e.sp].type ? 1.5 : 1);
      } else if (mv.fx) {
        score = p.status ? 5 : 55;
      } else {
        score = 30 - Math.abs(this.eStages.atk) * 10;
      }
      score *= 0.8 + Math.random() * 0.4;
      if (score > bestScore) { bestScore = score; best = x; }
    }
    return best.i;
  },

  /* ---------- costruzione del turno ---------- */
  doTurn(action) {
    this.skipRest = false;
    const enemyAction = { type: 'move', mi: this.enemyAI() };
    let order;
    if (action.type !== 'move') order = [['p', action], ['e', enemyAction]];
    else {
      const ps = this.effStat(this.pmon(), 'spd', this.pStages);
      const es = this.effStat(this.emon(), 'spd', this.eStages);
      const pFirst = ps > es || (ps === es && Math.random() < 0.5);
      order = pFirst ? [['p', action], ['e', enemyAction]] : [['e', enemyAction], ['p', action]];
    }
    this.q = [
      { t: 'fn', f: () => this.actStep(order[0][1], order[0][0]) },
      { t: 'fn', f: () => this.actStep(order[1][1], order[1][0]) },
      { t: 'fn', f: () => this.endTurnStep() },
    ];
    this.phase = 'queue';
  },

  actStep(action, side) {
    if (this.skipRest) return;
    const me = side === 'p' ? this.pmon() : this.emon();
    if (me.hp <= 0) return;
    switch (action.type) {
      case 'move': this.performMove(side, action.mi); break;
      case 'switch': this.performSwitch(action.idx); break;
      case 'item': this.performItem(action); break;
      case 'ball': this.performBall(action.id); break;
      case 'run': this.performRun(); break;
    }
  },

  performMove(side, mi) {
    const att = side === 'p' ? this.pmon() : this.emon();
    const def = side === 'p' ? this.emon() : this.pmon();
    const attStages = side === 'p' ? this.pStages : this.eStages;
    const defStages = side === 'p' ? this.eStages : this.pStages;
    const defSide = side === 'p' ? 'e' : 'p';
    const attName = (side === 'e' ? 'Il nemico ' : '') + monName(att);
    const defName = (side === 'p' ? 'Il nemico ' : '') + monName(def);
    const items = [];

    // sonno
    if (att.status === 'slp') {
      att.slp--;
      if (att.slp > 0) { this.insertQ({ t: 'msg', s: attName + ' dorme profondamente.' }); return; }
      att.status = null;
      items.push({ t: 'msg', s: attName + ' si è svegliato!' });
    }
    // paralisi
    if (att.status === 'par' && Math.random() < 0.25) {
      this.insertQ(...items, { t: 'msg', s: attName + ' è paralizzato! Non riesce a muoversi!' });
      return;
    }
    let mv;
    if (mi < 0 || mi === undefined) mv = STRUGGLE;
    else {
      const slot = att.moves[mi];
      mv = DATA.MOVES[slot.id];
      slot.pp = Math.max(0, slot.pp - 1);
    }
    items.push({ t: 'msg', s: attName + ' usa ' + mv.n + '!' });

    if (mv.p > 0) {
      if (Math.random() * 100 >= mv.a) {
        items.push({ t: 'msg', s: 'Ma fallisce!' });
        this.insertQ(...items); return;
      }
      const r = this.calcDmg(att, attStages, def, defStages, mv);
      if (r.e === 0) {
        items.push({ t: 'msg', s: 'Non ha effetto su ' + defName + '...' });
        this.insertQ(...items); return;
      }
      items.push({ t: 'sfx', name: r.e > 1 ? 'hitSuper' : r.e < 1 ? 'hitWeak' : 'hit' });
      items.push({ t: 'flash', side: defSide });
      items.push({ t: 'fn', f: () => { def.hp = Math.max(0, def.hp - r.dmg); } });
      items.push({ t: 'hp', side: defSide });
      if (r.crit) items.push({ t: 'msg', s: 'Colpo critico!' });
      if (r.e > 1) items.push({ t: 'msg', s: 'È superefficace!' });
      if (r.e < 1) items.push({ t: 'msg', s: 'Non è molto efficace...' });
      if (mv.drain) {
        items.push({ t: 'fn', f: () => {
          const st = DATA.stats(att);
          att.hp = Math.min(st.maxhp, att.hp + Math.max(1, Math.floor(r.dmg / 2)));
        } });
        items.push({ t: 'hp', side });
        items.push({ t: 'msg', s: attName + ' assorbe energia!' });
      }
      if (mv.fx && !def.status) {
        items.push({ t: 'fn', f: () => {
          if (def.hp > 0 && !def.status && Math.random() * 100 < mv.fx.ch) {
            this.applyStatus(def, defName, mv.fx.st);
          }
        } });
      }
      if (mv.sta && mv.sta.ch) {
        items.push({ t: 'fn', f: () => {
          if (def.hp > 0 && Math.random() * 100 < mv.sta.ch) {
            this.applyStage(defStages, def, defName, mv.sta, defSide);
          }
        } });
      }
      items.push({ t: 'fn', f: () => this.checkFaint(defSide) });
      this.insertQ(...items);
      return;
    }

    // mosse di stato
    if (mv.fx) {
      if (Math.random() * 100 >= mv.a) { items.push({ t: 'msg', s: 'Ma fallisce!' }); }
      else if (def.status) items.push({ t: 'msg', s: 'Ma fallisce!' });
      else items.push({ t: 'fn', f: () => this.applyStatus(def, defName, mv.fx.st) });
      this.insertQ(...items);
      return;
    }
    if (mv.sta) {
      const self = mv.sta.tgt === 's';
      if (!self && Math.random() * 100 >= mv.a) {
        items.push({ t: 'msg', s: 'Ma fallisce!' });
      } else {
        const tgtStages = self ? attStages : defStages;
        const tgtMon = self ? att : def;
        const tgtName = self ? attName : defName;
        items.push({ t: 'fn', f: () => this.applyStage(tgtStages, tgtMon, tgtName, mv.sta, self ? side : defSide) });
      }
      this.insertQ(...items);
    }
  },

  applyStatus(mon, name, st) {
    mon.status = st;
    if (st === 'slp') mon.slp = rndi(2, 4);
    const label = { brn: ' è stato scottato!', psn: ' è stato avvelenato!', par: ' è paralizzato!', slp: ' si è addormentato!' };
    this.insertQ({ t: 'msg', s: name + label[st] });
  },

  applyStage(stages, mon, name, sta, side) {
    const labels = { atk: 'L\'Attacco', def: 'La Difesa', spd: 'La Velocità', spc: 'Lo Speciale' };
    const cur = stages[sta.stat];
    const next = clamp(cur + sta.d, -6, 6);
    if (next === cur) {
      this.insertQ({ t: 'msg', s: labels[sta.stat] + ' di ' + name + ' non può ' + (sta.d > 0 ? 'salire' : 'scendere') + ' oltre!' });
      return;
    }
    stages[sta.stat] = next;
    const verb = sta.d >= 2 ? ' sale moltissimo!' : sta.d === 1 ? ' sale!' : sta.d <= -2 ? ' scende di brutto!' : ' scende!';
    this.insertQ({ t: 'msg', s: labels[sta.stat] + ' di ' + name + verb });
  },

  checkFaint(side) {
    const mon = side === 'p' ? this.pmon() : this.emon();
    if (mon.hp > 0) return;
    this.skipRest = true;
    const name = (side === 'e' ? 'Il nemico ' : '') + monName(mon);
    const items = [
      { t: 'sfx', name: 'faint' },
      { t: 'faintAnim', side },
      { t: 'msg', s: name + ' è esausto!' },
    ];
    if (side === 'e') {
      items.push({ t: 'fn', f: () => this.giveExp() });
      items.push({ t: 'fn', f: () => this.nextEnemy() });
    } else {
      items.push({ t: 'fn', f: () => this.afterPlayerFaint() });
    }
    this.insertQ(...items);
  },

  giveExp() {
    const winner = this.pmon();
    if (winner.hp <= 0 || winner.lv >= 100) return;
    const beaten = this.emon();
    const gained = Math.max(1, Math.floor(DATA.SPECIES[beaten.sp].exp * beaten.lv / 7 * (this.kind === 'trainer' ? 1.5 : 1)));
    this.insertQ(
      { t: 'msg', s: monName(winner) + ' guadagna ' + gained + ' Punti Esp.!' },
      { t: 'fn', f: () => this.applyExp(winner, gained) },
    );
  },

  applyExp(mon, gained) {
    mon.xp += gained;
    const items = [];
    while (mon.lv < 100 && mon.xp >= DATA.expForLv(mon.lv + 1)) {
      const newMoves = applyLevelUp(mon);
      items.push({ t: 'sfx', name: 'levelup' });
      items.push({ t: 'msg', s: monName(mon) + ' sale al livello ' + mon.lv + '!' });
      for (const id of newMoves) items.push({ t: 'learn', mon, moveId: id });
      const sp = DATA.SPECIES[mon.sp];
      if (sp.evolve && mon.lv >= sp.evolve.lv && !this.pendingEvo.some(p => p.mon === mon)) {
        this.pendingEvo.push({ mon, to: sp.evolve.to });
      }
    }
    if (items.length) this.insertQ(...items);
  },

  nextEnemy() {
    if (this.kind === 'wild') { this.victoryWild(); return; }
    const next = this.eTeam.findIndex(m => m.hp > 0);
    if (next < 0) { this.victoryTrainer(); return; }
    this.eIdx = next;
    this.eStages = { atk: 0, def: 0, spd: 0, spc: 0 };
    this.hidden.e = false; this.faintOff.e = 0;
    this.disp.e = 0;
    Game.sv.dex.seen[this.emon().sp] = 1;
    this.insertQ(
      { t: 'msg', s: this.trainer.name + ' manda in campo ' + monName(this.emon()) + '!' },
      { t: 'hp', side: 'e' },
      { t: 'menu' },
    );
  },

  victoryWild() {
    Music.play('victory');
    this.insertQ({ t: 'end', result: 'win' });
  },

  victoryTrainer() {
    Music.play('victory');
    const t = this.trainer;
    const items = [{ t: 'msg', s: 'Hai sconfitto ' + t.name + '!' }];
    for (const line of (t.winText || [])) if (line) items.push({ t: 'msg', s: line });
    items.push({ t: 'fn', f: () => { Game.sv.money += t.money || 0; } });
    items.push({ t: 'msg', s: 'Hai vinto ' + fmtMoney(t.money || 0) + '!' });
    if (t.badge !== undefined) {
      items.push({ t: 'fn', f: () => { Game.sv.badges[t.badge] = true; } });
      items.push({ t: 'sfx', name: 'badge' });
      items.push({ t: 'msg', s: 'Hai ottenuto il ' + BADGE_NAMES[t.badge] + '!' });
    }
    items.push({ t: 'end', result: 'win' });
    this.insertQ(...items);
  },

  afterPlayerFaint() {
    if (!this.party.some(m => m.hp > 0)) {
      this.insertQ(
        { t: 'msg', s: 'Non hai più Velmon in grado di lottare!' },
        { t: 'end', result: 'lose' },
      );
      return;
    }
    this.insertQ({ t: 'forceSwitch' });
  },

  performSwitch(idx) {
    const oldName = monName(this.pmon());
    this.insertQ(
      { t: 'msg', s: 'Torna, ' + oldName + '!' },
      { t: 'fn', f: () => {
        this.pIdx = idx;
        this.pStages = { atk: 0, def: 0, spd: 0, spc: 0 };
        this.disp.p = this.pmon().hp;
        this.hidden.p = false; this.faintOff.p = 0;
      } },
      { t: 'msg', s: 'Vai! ' + monName(this.party[idx]) + '!' },
    );
  },

  performItem(action) {
    const items = [{ t: 'msg', s: 'Hai usato ' + DATA.ITEMS[action.id].n + '!' }];
    items.push({ t: 'sfx', name: 'heal' });
    items.push({ t: 'hp', side: 'p' });
    items.push({ t: 'msg', s: action.msg });
    this.insertQ(...items);
  },

  performBall(id) {
    const e = this.emon();
    const sp = DATA.SPECIES[e.sp];
    const st = DATA.stats(e);
    const ballMult = DATA.ITEMS[id].ball;
    const stMult = e.status === 'slp' ? 2 : e.status ? 1.5 : 1;
    const a = clamp(Math.floor((3 * st.maxhp - 2 * e.hp) * sp.catch * ballMult * stMult / (3 * st.maxhp)), 1, 255);
    const caught = Math.random() * 255 < a;
    const shakes = caught ? 3 : Math.min(2, Math.floor(a / 255 * 4 * Math.random()));
    const items = [
      { t: 'msg', s: 'Hai lanciato ' + DATA.ITEMS[id].n + '!' },
      { t: 'ball', shakes, caught, n: 0 },
    ];
    if (caught) {
      items.push({ t: 'sfx', name: 'ballCatch' });
      items.push({ t: 'msg', s: 'Preso! ' + monName(e) + ' è stato catturato!' });
      items.push({ t: 'fn', f: () => {
        Game.sv.dex.caught[e.sp] = 1;
        Game.sv.dex.seen[e.sp] = 1;
        if (Game.sv.party.length < 6) Game.sv.party.push(e);
        else { Game.sv.box.push(e); this.insertQ({ t: 'msg', s: monName(e) + ' è stato inviato al Box del PC!' }); }
      } });
      items.push({ t: 'end', result: 'catch' });
    } else {
      items.push({ t: 'sfx', name: 'ballOut' });
      items.push({ t: 'fn', f: () => { this.enemyHidden = false; } });
      items.push({ t: 'msg', s: shakes === 0 ? 'Oh no! Si è liberato subito!' : 'Accidenti! C\'era quasi!' });
    }
    this.insertQ(...items);
  },

  performRun() {
    this.runAttempts++;
    const ps = this.effStat(this.pmon(), 'spd', this.pStages);
    const es = this.effStat(this.emon(), 'spd', this.eStages);
    const F = Math.floor(ps * 128 / Math.max(1, es)) + 30 * this.runAttempts;
    if (rndi(0, 255) < F) {
      this.skipRest = true;
      this.insertQ({ t: 'msg', s: 'Fuga riuscita!' }, { t: 'end', result: 'run' });
    } else {
      this.insertQ({ t: 'msg', s: 'Non riesci a fuggire!' });
    }
  },

  endTurnStep() {
    if (this.skipRest) return;
    const items = [];
    for (const side of ['p', 'e']) {
      const mon = side === 'p' ? this.pmon() : this.emon();
      if (mon.hp <= 0) continue;
      const name = (side === 'e' ? 'Il nemico ' : '') + monName(mon);
      if (mon.status === 'psn' || mon.status === 'brn') {
        const frac = mon.status === 'psn' ? 8 : 16;
        const what = mon.status === 'psn' ? 'il veleno' : 'l\'ustione';
        items.push({ t: 'msg', s: name + ' soffre per ' + what + '!' });
        items.push({ t: 'fn', f: () => {
          mon.hp = Math.max(0, mon.hp - Math.max(1, Math.floor(DATA.stats(mon).maxhp / frac)));
        } });
        items.push({ t: 'hp', side });
        items.push({ t: 'fn', f: () => this.checkFaint(side) });
      }
    }
    items.push({ t: 'fn', f: () => { if (!this.skipRest) this.insertQ({ t: 'menu' }); } });
    this.insertQ(...items);
  },

  /* ---------- scelte del giocatore ---------- */
  itemChosen(id) {
    if (!id) { this.phase = 'menu'; return; }
    const it = DATA.ITEMS[id];
    if (it.ball) {
      if (this.kind === 'trainer') {
        this.q = [{ t: 'msg', s: 'Non puoi catturare i Velmon degli altri allenatori!' }, { t: 'menu' }];
        this.phase = 'queue';
        return;
      }
      Game.sv.bag[id]--;
      this.doTurn({ type: 'ball', id });
      return;
    }
    UI.push(new PartyScreen({ mode: 'select', title: 'Su chi usarlo?', cb: idx => {
      if (idx < 0) { this.phase = 'menu'; return; }
      const res = itemEffect(id, this.party[idx]);
      if (!res.ok) {
        this.q = [{ t: 'msg', s: res.msg }, { t: 'menu' }];
        this.phase = 'queue';
        return;
      }
      Game.sv.bag[id]--;
      if (idx === this.pIdx) this.disp.p = this.disp.p; // l'animazione parte dal valore attuale
      this.doTurn({ type: 'item', id, msg: res.msg });
    } }));
  },

  switchChosen(idx) {
    if (idx < 0) { this.phase = 'menu'; return; }
    if (idx === this.pIdx) {
      this.q = [{ t: 'msg', s: monName(this.party[idx]) + ' è già in campo!' }, { t: 'menu' }];
      this.phase = 'queue'; return;
    }
    if (this.party[idx].hp <= 0) {
      this.q = [{ t: 'msg', s: monName(this.party[idx]) + ' è esausto! Non può lottare!' }, { t: 'menu' }];
      this.phase = 'queue'; return;
    }
    this.doTurn({ type: 'switch', idx });
  },

  askSwitch(it) {
    UI.push(new PartyScreen({ mode: 'select', forcePick: true, title: 'Chi mandi in campo?', cb: idx => {
      const mon = this.party[idx];
      if (idx < 0 || mon.hp <= 0) {
        say([idx >= 0 ? monName(mon) + ' è esausto!' : 'Devi scegliere!'], () => this.askSwitch(it));
        return;
      }
      this.pIdx = idx;
      this.pStages = { atk: 0, def: 0, spd: 0, spc: 0 };
      this.disp.p = mon.hp;
      this.hidden.p = false; this.faintOff.p = 0;
      this.insertQ({ t: 'msg', s: 'Vai! ' + monName(mon) + '!' }, { t: 'menu' });
      it.done = true;
    } }));
  },

  /* ---------- elaborazione coda ---------- */
  update() {
    // animazione PS
    for (const side of ['p', 'e']) {
      const actual = side === 'p' ? this.pmon().hp : this.emon().hp;
      const maxhp = DATA.stats(side === 'p' ? this.pmon() : this.emon()).maxhp;
      const step = Math.max(0.3, maxhp / 50);
      const d = actual - this.disp[side];
      if (Math.abs(d) > 0.01) this.disp[side] += clamp(d, -step, step);
    }
    if (this.over) return;

    if (this.phase === 'menu') { this.menuInput(); return; }
    if (this.phase === 'moves') { this.movesInput(); return; }

    let guard = 60;
    while (guard-- > 0) {
      const it = this.q[0];
      if (!it) { this.phase = 'menu'; return; }
      switch (it.t) {
        case 'fn': it.f(); this.q.shift(); continue;
        case 'sfx': Sfx.play(it.name); this.q.shift(); continue;
        case 'msg': {
          if (it.chars === undefined) it.chars = 0;
          const len = it.s.length;
          if (it.chars < len) {
            it.chars += textSpeed() * 1.6;
            if (Input.pressed('a') || Input.pressed('b')) it.chars = len;
            return;
          }
          if (Input.pressed('a') || Input.pressed('b')) { this.q.shift(); continue; }
          return;
        }
        case 'wait': it.n--; if (it.n <= 0) { this.q.shift(); continue; } return;
        case 'hp': {
          const actual = it.side === 'p' ? this.pmon().hp : this.emon().hp;
          if (Math.abs(this.disp[it.side] - actual) < 0.5) { this.disp[it.side] = actual; this.q.shift(); continue; }
          return;
        }
        case 'flash':
          if (it.n === undefined) it.n = 18;
          it.n--; this.fxSide = it.side;
          if (it.n <= 0) { this.fxSide = null; this.q.shift(); continue; }
          return;
        case 'faintAnim':
          it.n = (it.n || 0) + 1;
          this.faintOff[it.side] = it.n * 2.5;
          if (it.n >= 26) { this.hidden[it.side] = true; this.faintOff[it.side] = 0; this.q.shift(); continue; }
          return;
        case 'menu':
          this.q = [];
          this.phase = 'menu';
          this.menuI = 0;
          return;
        case 'learn':
          if (!it.pushed) { it.pushed = true; learnMoveFlow(it.mon, it.moveId, () => { it.done = true; }); }
          if (it.done) { this.q.shift(); continue; }
          return;
        case 'forceSwitch':
          if (!it.pushed) { it.pushed = true; this.askSwitch(it); }
          if (it.done) { this.q.shift(); continue; }
          return;
        case 'ball': {
          it.n++;
          if (it.n <= 24) {  // lancio ad arco
            const t = it.n / 24;
            this.ballDraw = { x: 60 + t * 110, y: 70 - Math.sin(t * Math.PI) * 50 + t * (-20) };
            if (it.n === 1) Sfx.play('ballToss');
            return;
          }
          if (it.n <= 40) { this.enemyHidden = true; this.ballDraw = { x: 170, y: 52 }; return; }  // assorbimento
          const shakeFrame = it.n - 40;
          const shakeIdx = Math.floor(shakeFrame / 26);
          if (shakeIdx < it.shakes) {
            if (shakeFrame % 26 === 1) Sfx.play('ballShake');
            const ph = (shakeFrame % 26) / 26;
            this.ballDraw = { x: 170 + Math.sin(ph * Math.PI * 2) * 4, y: 52 };
            return;
          }
          if (it.n < 40 + it.shakes * 26 + 24) { this.ballDraw = { x: 170, y: 52 }; return; }  // pausa
          this.ballDraw = null;
          this.q.shift();
          continue;
        }
        case 'end':
          this.q = [];
          this.finish(it.result);
          return;
        default:
          this.q.shift();
      }
    }
  },

  menuInput() {
    if (Input.pressed('left') || Input.pressed('right')) { this.menuI ^= 1; Sfx.play('cursor'); }
    if (Input.pressed('up') || Input.pressed('down')) { this.menuI ^= 2; Sfx.play('cursor'); }
    if (!Input.pressed('a')) return;
    Sfx.play('confirm');
    switch (this.menuI) {
      case 0: // LOTTA
        if (this.pmon().moves.every(m => m.pp <= 0)) {
          this.q = [{ t: 'msg', s: monName(this.pmon()) + ' non ha più PP!' }];
          this.doTurnStruggle();
          return;
        }
        this.phase = 'moves'; this.moveI = 0;
        break;
      case 1: // ZAINO
        UI.push(new BagScreen({ mode: 'battle', cb: id => this.itemChosen(id) }));
        break;
      case 2: // SQUADRA
        UI.push(new PartyScreen({ mode: 'select', cb: idx => this.switchChosen(idx) }));
        break;
      case 3: // FUGA
        if (this.kind === 'trainer') {
          this.q = [{ t: 'msg', s: 'Non puoi fuggire da una lotta tra allenatori!' }, { t: 'menu' }];
          this.phase = 'queue';
        } else this.doTurn({ type: 'run' });
        break;
    }
  },

  doTurnStruggle() {
    this.doTurn({ type: 'move', mi: -1 });
  },

  movesInput() {
    const moves = this.pmon().moves;
    if (Input.pressed('b')) { this.phase = 'menu'; Sfx.play('cancel'); return; }
    if (Input.pressed('left') || Input.pressed('right')) { this.moveI ^= 1; Sfx.play('cursor'); }
    if (Input.pressed('up') || Input.pressed('down')) { this.moveI ^= 2; Sfx.play('cursor'); }
    this.moveI = clamp(this.moveI, 0, moves.length - 1);
    if (Input.pressed('a')) {
      if (moves[this.moveI].pp <= 0) { Sfx.play('bump'); return; }
      Sfx.play('confirm');
      this.doTurn({ type: 'move', mi: this.moveI });
    }
  },

  finish(result) {
    this.over = true;
    Game.fadeOut(() => {
      const done = () => {
        if (this.trainer && this.trainer.champion && result === 'win') {
          Game.sv.flags.champion = true;
          Game.set('hof');
          Game.fadeIn();
          return;
        }
        if (result === 'lose') {
          // schermata già nera: onBattleLost fa il warp e il fadeIn
          Game.resume('overworld');
          Overworld.onBattleLost();
          return;
        }
        Game.resume('overworld');
        Overworld.resumeMusic();
        if (this.onEnd) this.onEnd(result);
        Game.fadeIn();
      };
      if (result !== 'lose' && this.pendingEvo.length) {
        const evo = this.pendingEvo;
        this.pendingEvo = [];
        Game.set('evolve', evo, done);
        Game.fadeIn();
      } else done();
    }, 0.12);
  },

  /* ---------- disegno ---------- */
  draw() {
    this.drawBG();
    const flick = this.fxSide && Math.floor(Game.frame / 3) % 2 === 0;
    // nemico
    if (!this.hidden.e && !this.enemyHidden && !(flick && this.fxSide === 'e')) {
      MonArt.drawFront(cx, this.emon().sp, 150, 10 + this.faintOff.e, !this.faintOff.e);
    }
    // giocatore (di spalle)
    if (this.party.length && !this.hidden.p && !(flick && this.fxSide === 'p')) {
      MonArt.drawBack(cx, this.pmon().sp, 26, 64 + this.faintOff.p);
    }
    if (this.ballDraw) drawBallSprite(cx, this.ballDraw.x, this.ballDraw.y, 10);

    // riquadro nemico
    const e = this.emon(), est = DATA.stats(e);
    drawBox(4, 6, 106, 30);
    txt(monName(e), 10, 10, { c: '#383838' });
    txt('Lv' + e.lv, 80, 10, { c: '#383838', size: 7 });
    drawHPBar(26, 24, 64, this.disp.e, est.maxhp);
    drawStatusTag(e.status, 10, 20);
    txt('PS', 10, 27, { c: '#707070', size: 6 });

    // riquadro giocatore
    const p = this.pmon(), pst = DATA.stats(p);
    drawBox(128, 82, 108, 42);
    txt(monName(p), 134, 86, { c: '#383838' });
    txt('Lv' + p.lv, 204, 86, { c: '#383838', size: 7 });
    drawHPBar(150, 98, 64, this.disp.p, pst.maxhp);
    txt(Math.round(this.disp.p) + '/' + pst.maxhp, 150, 104, { c: '#383838', size: 7 });
    drawStatusTag(p.status, 134, 104);
    // barra esperienza
    const lo = DATA.expForLv(p.lv), hi = DATA.expForLv(p.lv + 1);
    const xr = p.lv >= 100 ? 1 : clamp((p.xp - lo) / (hi - lo), 0, 1);
    cx.fillStyle = '#404040'; cx.fillRect(150, 114, 66, 4);
    cx.fillStyle = '#48a0e8'; cx.fillRect(151, 115, Math.floor(64 * xr), 2);
    txt('EXP', 134, 113, { c: '#707070', size: 6 });

    // area inferiore
    if (this.phase === 'menu') {
      drawBox(0, 126, 140, 34);
      txt('Cosa farà', 8, 131, { c: '#383838' });
      txt(monName(p) + '?', 8, 143, { c: '#383838' });
      drawBox(140, 126, 100, 34);
      const labels = ['LOTTA', 'ZAINO', 'SQUADRA', 'FUGA'];
      labels.forEach((l, k) => {
        const x = 152 + (k % 2) * 46, y = 131 + Math.floor(k / 2) * 14;
        txt(l, x, y, { c: '#383838', size: 7 });
      });
      drawCursor(146 + (this.menuI % 2) * 46, 132 + Math.floor(this.menuI / 2) * 14);
    } else if (this.phase === 'moves') {
      drawBox(0, 126, 154, 34);
      const moves = p.moves;
      moves.forEach((m, k) => {
        const x = 14 + (k % 2) * 72, y = 131 + Math.floor(k / 2) * 14;
        txt(DATA.MOVES[m.id].n.slice(0, 11), x, y, { c: m.pp > 0 ? '#383838' : '#b0b0b0', size: 7 });
      });
      drawCursor(8 + (this.moveI % 2) * 72, 132 + Math.floor(this.moveI / 2) * 14);
      drawBox(154, 126, 86, 34);
      const sel = moves[this.moveI];
      if (sel) {
        const mv = DATA.MOVES[sel.id];
        txt('PP ' + sel.pp + '/' + mv.pp, 160, 131, { c: '#383838', size: 7 });
        drawTypeTag(mv.t, 160, 143);
      }
    } else {
      drawBox(0, 126, VW, 34);
      const it = this.q[0];
      if (it && it.t === 'msg') {
        const shown = it.s.slice(0, Math.floor(it.chars || 0));
        wrapText(shown, VW - 24).slice(0, 2).forEach((r, k) => txt(r, 8, 131 + k * 13, { c: '#383838' }));
        if ((it.chars || 0) >= it.s.length) drawArrowBlink(VW - 14, 152);
      }
    }
  },

  drawBG() {
    if (this.env === 'cave') {
      // GROTTA stile FireRed
      cx.fillStyle='#302040'; cx.fillRect(0,0,VW,126);
      cx.fillStyle='#483860'; cx.fillRect(0,40,VW,40);
      cx.fillStyle='#382850'; cx.fillRect(0,78,VW,2);
      cx.fillStyle='#282038'; cx.fillRect(0,80,VW,46);
      cx.fillStyle='#201830';
      [[0,14],[36,10],[72,16],[108,11],[144,13],[180,9],[216,15]].forEach(([x,h])=>{
        cx.beginPath(); cx.moveTo(x,0); cx.lineTo(x+14,0); cx.lineTo(x+7,h); cx.closePath(); cx.fill();
      });
      cx.fillStyle='#403050';
      [[20,100,24,10],[80,108,18,8],[140,102,22,9],[190,106,16,7]].forEach(([x,y,w,h])=>{
        cx.beginPath(); cx.ellipse(x+w/2,y+h/2,w/2,h/2,0,0,Math.PI*2); cx.fill();
      });
      cx.fillStyle='#3c3054'; cx.beginPath(); cx.ellipse(182,72,44,12,0,0,7); cx.fill();
      cx.fillStyle='#524868'; cx.beginPath(); cx.ellipse(182,70,42,10,0,0,7); cx.fill();
      cx.fillStyle='#3c3054'; cx.beginPath(); cx.ellipse(60,118,48,13,0,0,7); cx.fill();
      cx.fillStyle='#524868'; cx.beginPath(); cx.ellipse(60,116,46,11,0,0,7); cx.fill();
    } else if (this.env === 'arena') {
      // ARENA palestra stile FireRed
      cx.fillStyle='#f0e4c0'; cx.fillRect(0,0,VW,126);
      cx.fillStyle='#e0d4b0'; cx.fillRect(0,0,20,126); cx.fillRect(220,0,20,126);
      cx.fillStyle='#a8d0f0';
      [[30,8,28,40],[100,8,40,40],[170,8,28,40]].forEach(([x,y,w,h])=>{
        cx.fillRect(x,y,w,h);
        cx.fillStyle='#c8e4f8'; cx.fillRect(x+2,y+2,w/2-2,h/2-2);
        cx.fillStyle='#7090b8'; cx.fillRect(x,y,w,2); cx.fillRect(x,y,2,h);
        cx.fillStyle='#a8d0f0';
      });
      cx.fillStyle='#d8cc90'; cx.fillRect(0,60,VW,66);
      cx.fillStyle='#c8bc80'; cx.fillRect(0,60,VW,2);
      for(let tx=0;tx<VW;tx+=24){
        cx.fillStyle=tx%48===0?'#c0b470':'#ccc080'; cx.fillRect(tx,62,24,64);
        cx.fillStyle='#b0a460'; cx.fillRect(tx,62,1,64); cx.fillRect(tx,62,24,1);
      }
      cx.fillStyle='#c03838'; cx.fillRect(VW/2-1,62,2,64);
      cx.fillStyle='#e0d460'; cx.beginPath(); cx.ellipse(182,72,46,13,0,0,7); cx.fill();
      cx.fillStyle='#c8bc50'; cx.beginPath(); cx.ellipse(182,70,44,11,0,0,7); cx.fill();
      cx.fillStyle='#d8cc58'; cx.beginPath(); cx.ellipse(178,68,40,9,0,0,Math.PI); cx.fill();
      cx.fillStyle='#e0d460'; cx.beginPath(); cx.ellipse(60,118,50,14,0,0,7); cx.fill();
      cx.fillStyle='#c8bc50'; cx.beginPath(); cx.ellipse(60,116,48,12,0,0,7); cx.fill();
      cx.fillStyle='#d8cc58'; cx.beginPath(); cx.ellipse(56,114,44,10,0,0,Math.PI); cx.fill();
    } else {
      // ESTERNO — FireRed outdoor battle, colori piatti (stile GBA autentico)
      cx.fillStyle='#98c8f0'; cx.fillRect(0,0,VW,38);
      cx.fillStyle='#80b4e8'; cx.fillRect(0,38,VW,18);
      cx.fillStyle='#70a4d8'; cx.fillRect(0,56,VW,6);
      // Nuvole flat stile GBA
      cx.fillStyle='#e0f0ff';
      [[14,10,30,10],[90,18,22,8],[160,8,28,10],[205,22,18,7]].forEach(([x,y,w,h])=>{
        cx.fillRect(x,y,w,h); cx.fillRect(x+4,y-4,w-8,4); cx.fillRect(x+4,y+h,w-8,4);
      });
      // Linea orizzonte erba
      cx.fillStyle='#5ca830'; cx.fillRect(0,62,VW,3);
      // Prato — 2 toni piatti stile FireRed
      cx.fillStyle='#68bc38'; cx.fillRect(0,65,VW,61);
      cx.fillStyle='#58a828'; cx.fillRect(0,74,VW,52);
      // Texture erba pixel art
      cx.fillStyle='#78cc48';
      for(let gx=0;gx<VW;gx+=8){ cx.fillRect(gx,65,1,9); cx.fillRect(gx+4,68,1,6); }
      // PEDANA NEMICA — bordo+ombre FireRed
      cx.fillStyle='#306018'; cx.beginPath(); cx.ellipse(182,70,48,14,0,0,7); cx.fill();
      cx.fillStyle='#58a828'; cx.beginPath(); cx.ellipse(182,69,46,13,0,0,7); cx.fill();
      cx.fillStyle='#68bc38'; cx.beginPath(); cx.ellipse(182,68,44,12,0,0,7); cx.fill();
      cx.fillStyle='#88d858'; cx.beginPath(); cx.ellipse(182,66,40,10,0,0,7); cx.fill();
      cx.fillStyle='#a0e870'; cx.beginPath(); cx.ellipse(176,63,30,6,0,0,Math.PI); cx.fill();
      // PEDANA GIOCATORE — più grande, primo piano
      cx.fillStyle='#306018'; cx.beginPath(); cx.ellipse(58,118,56,16,0,0,7); cx.fill();
      cx.fillStyle='#58a828'; cx.beginPath(); cx.ellipse(58,117,54,15,0,0,7); cx.fill();
      cx.fillStyle='#68bc38'; cx.beginPath(); cx.ellipse(58,116,52,14,0,0,7); cx.fill();
      cx.fillStyle='#88d858'; cx.beginPath(); cx.ellipse(58,114,48,12,0,0,7); cx.fill();
      cx.fillStyle='#a0e870'; cx.beginPath(); cx.ellipse(52,111,38,8,0,0,Math.PI); cx.fill();
    }
    // Ombra sotto piattaforme
    cx.globalAlpha=0.22; cx.fillStyle='#000';
    cx.beginPath(); cx.ellipse(182,76,40,7,0,0,7); cx.fill();
    cx.beginPath(); cx.ellipse(58,122,48,8,0,0,7); cx.fill();
    cx.globalAlpha=1;
  },};
