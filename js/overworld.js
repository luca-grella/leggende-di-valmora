'use strict';
/* ============================================================
   overworld.js — esplorazione: movimento, PNG, eventi, incontri
   ============================================================ */

function healParty() {
  for (const mon of Game.sv.party) {
    mon.hp = DATA.stats(mon).maxhp;
    mon.status = null; mon.slp = 0;
    for (const m of mon.moves) m.pp = DATA.MOVES[m.id].pp;
  }
}

const OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' };

const Overworld = Game.states.overworld = {
  mapId: '', map: null,
  p: { x: 0, y: 0, dir: 'down', moving: false, prog: 0, hop: false },
  npcs: [],
  script: null,
  warping: false,
  bumpT: 0,

  enter(mapId, x, y, dir) {
    this.mapId = mapId;
    this.map = MAPS[mapId];
    this.p = { x, y, dir: dir || 'down', moving: false, prog: 0, hop: false };
    this.npcs = (this.map.npcs || []).map(def => ({
      def, x: def.x, y: def.y, hx: def.x, hy: def.y,
      dir: def.dir || 'down', moving: false, prog: 0, wanderT: rndi(60, 180), alert: 0,
    }));
    this.script = null;
    this.warping = false;
    Music.play(this.map.music);
  },

  resumeMusic() { Music.play(this.map.music); },
  battleEnv() { return this.map.cave ? 'cave' : this.map.interior ? 'arena' : 'field'; },

  /* ---------- accesso tile ---------- */
  tileChar(x, y) {
    if (x < 0 || y < 0 || y >= this.map.h || x >= this.map.w) return 'T';
    return this.map.tiles[y][x];
  },
  td(x, y) { return TD[this.tileChar(x, y)] || { solid: true }; },

  npcActive(npc) { return !npc.def.cond || npc.def.cond(Game.sv); },
  npcAt(x, y, except) {
    return this.npcs.find(n => n !== except && this.npcActive(n) && n.x === x && n.y === y) || null;
  },
  objVisible(o) {
    if (o.kind === 'item') return !Game.sv.flags['it_' + this.mapId + '_' + o.x + '_' + o.y];
    if (o.kind === 'sphere') return !Game.sv.flags.starter;
    if (o.kind === 'mon') return !Game.sv.flags[o.flag];
    return false;
  },
  objAt(x, y) {
    return (this.map.objects || []).find(o => o.x === x && o.y === y && this.objVisible(o)) || null;
  },
  walkable(x, y, except) {
    const t = this.td(x, y);
    if (t.solid || t.ledge) return false;
    if (this.npcAt(x, y, except)) return false;
    if (this.objAt(x, y)) return false;
    return true;
  },

  giveItem(id, n) { Game.sv.bag[id] = (Game.sv.bag[id] || 0) + (n || 1); },

  /* ---------- aggiornamento ---------- */
  update() {
    if (Input.pressed('mute') && Game.sv) {
      Game.sv.opts.audio = !Game.sv.opts.audio;
      Music.setEnabled(Game.sv.opts.audio);
    }
    if (this.warping) return;
    if (this.bumpT > 0) this.bumpT--;

    if (this.script) {
      if (this.p.moving) this.advancePlayer();
      this.updateScript();
      for (const npc of this.npcs) if (npc.moving) this.advanceNpcMove(npc);
      return;
    }

    if (this.p.moving) { this.advancePlayer(); }
    else {
      if (Input.pressed('start')) { Sfx.play('confirm'); UI.push(new PauseMenu()); return; }
      if (Input.pressed('a')) { this.interact(); return; }
      const d = Input.dir();
      if (d) {
        this.p.dir = d;
        const nx = this.p.x + DIRS[d].dx, ny = this.p.y + DIRS[d].dy;
        const t = this.td(nx, ny);
        if (t.ledge && d === 'down' && this.walkable(nx, ny + 1)) {
          // salto del dirupo
          this.p.x = nx; this.p.y = ny + 1;
          this.p.moving = true; this.p.hop = true; this.p.prog = 0;
          Sfx.play('jump');
        } else if (this.walkable(nx, ny)) {
          this.p.x = nx; this.p.y = ny;
          this.p.moving = true; this.p.hop = false; this.p.prog = 0;
        } else if (this.bumpT <= 0) {
          Sfx.play('bump'); this.bumpT = 16;
        }
      }
    }
    this.updateNPCs();
  },

  advancePlayer() {
    const run = Input.held.b && this.map.outdoor && !this.script;
    const total = this.p.hop ? 32 : 16;
    this.p.prog += this.p.hop ? 2 : (run ? 3 : 2);
    if (this.p.prog >= total) {
      this.p.moving = false; this.p.hop = false; this.p.prog = 0;
      this.onArrive();
    }
  },

  onArrive() {
    const { x, y } = this.p;
    // warp
    const w = (this.map.warps || []).find(w => w.x === x && w.y === y);
    if (w) {
      const ch = this.tileChar(x, y);
      if (ch === 'D' || ch === 'm' || ch === 'E') Sfx.play('door');
      this.doWarp(w);
      return;
    }
    if (this.script) return;
    // trigger
    const tr = (this.map.triggers || []).find(t =>
      y === t.y && x >= t.x && x < t.x + (t.w || 1) && (!t.cond || t.cond(Game.sv)));
    if (tr) { this.startScript(tr.script.map(s => Object.assign({}, s))); return; }
    // incontri selvatici
    const enc = this.map.enc;
    if (enc && Game.sv.party.some(m => m.hp > 0)) {
      const t = this.td(x, y);
      if ((t.grass || (enc.all && t.cave)) && Math.random() < enc.rate) {
        const tot = enc.list.reduce((a, e) => a + e[3], 0);
        let roll = Math.random() * tot, sel = enc.list[0];
        for (const e of enc.list) { roll -= e[3]; if (roll <= 0) { sel = e; break; } }
        this.startWildBattle(sel[0], rndi(sel[1], sel[2]));
        return;
      }
    }
    // sguardo degli allenatori
    this.checkTrainers();
  },

  doWarp(w) {
    this.warping = true;
    Game.fadeOut(() => {
      this.enter(w.to, w.tx, w.ty, w.dir);
      Game.fadeIn();
    }, 0.12);
  },

  startWildBattle(sp, lv, onEnd) {
    this.warping = true;
    Game.fadeOut(() => {
      this.warping = false;
      Game.set('battle', { kind: 'wild', sp, lv, env: this.battleEnv(), onEnd });
      Game.fadeIn();
    }, 0.1);
  },

  startTrainerBattle(npc) {
    const t = npc.def.trainer;
    this.warping = true;
    Game.fadeOut(() => {
      this.warping = false;
      Game.set('battle', {
        kind: 'trainer', env: this.battleEnv(),
        trainer: { name: t.name, team: t.team, money: t.money, winText: t.win, boss: t.boss, badge: t.badge },
        onEnd: res => { if (res === 'win') Game.sv.flags[t.flag] = true; },
      });
      Game.fadeIn();
    }, 0.1);
  },

  /* ---------- allenatori: linea di vista ---------- */
  sightClear(x, y) {
    const t = this.td(x, y);
    if (t.solid) return false;
    if (this.npcAt(x, y)) return false;
    return true;
  },
  checkTrainers() {
    for (const npc of this.npcs) {
      if (!this.npcActive(npc)) continue;
      const t = npc.def.trainer;
      if (!t || Game.sv.flags[t.flag]) continue;
      const dd = DIRS[npc.dir];
      for (let k = 1; k <= (t.los || 0); k++) {
        const sx = npc.x + dd.dx * k, sy = npc.y + dd.dy * k;
        if (sx === this.p.x && sy === this.p.y) {
          this.startScript([
            { alertNpc: npc },
            { npcApproach: { npc } },
            { fn: ow => { ow.facePair(npc); } },
            { say: t.before },
            { trainerBattle: npc },
          ]);
          return;
        }
        if (!this.sightClear(sx, sy)) break;
      }
    }
  },
  facePair(npc) {
    const dx = Math.sign(npc.x - this.p.x), dy = Math.sign(npc.y - this.p.y);
    this.p.dir = dx ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
    npc.dir = OPPOSITE[this.p.dir];
  },

  /* ---------- script / scene ---------- */
  startScript(steps) { this.script = { steps, i: 0 }; },
  updateScript() {
    const s = this.script;
    if (!s) return;
    if (s.waitUI) { if (!UI.stack.length) { s.waitUI = false; s.i++; } return; }
    if (s.waitBattle) return;
    const st = s.steps[s.i];
    if (!st) { this.script = null; return; }
    if (st.say) { say(st.say); s.waitUI = true; return; }
    if (st.flag) { Game.sv.flags[st.flag] = true; s.i++; return; }
    if (st.fn) { st.fn(this); s.i++; return; }
    if (st.step) {
      if (!s.pushing) {
        s.pushing = true;
        const d = st.step;
        this.p.dir = d;
        const nx = this.p.x + DIRS[d].dx, ny = this.p.y + DIRS[d].dy;
        if (this.walkable(nx, ny)) {
          this.p.x = nx; this.p.y = ny;
          this.p.moving = true; this.p.prog = 0;
        }
      }
      if (!this.p.moving) { s.pushing = false; s.i++; }
      return;
    }
    if (st.wait) { st.wait--; if (st.wait <= 0) s.i++; return; }
    if (st.alertNpc) {
      if (st.t === undefined) { st.t = 40; st.alertNpc.alert = 40; Sfx.play('alert'); }
      st.t--;
      if (st.t <= 0) s.i++;
      return;
    }
    if (st.npcApproach) {
      const npc = st.npcApproach.npc;
      if (npc.moving) return;
      const dist = Math.abs(npc.x - this.p.x) + Math.abs(npc.y - this.p.y);
      if (dist <= 1) { s.i++; return; }
      const dx = Math.sign(this.p.x - npc.x), dy = Math.sign(this.p.y - npc.y);
      const d = dx ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
      npc.dir = d;
      npc.x += DIRS[d].dx; npc.y += DIRS[d].dy;
      npc.moving = true; npc.prog = 0;
      return;
    }
    if (st.battle) {
      s.waitBattle = true;
      const b = st.battle;
      const team = b.team || rivalTeam(b.rivalStage, Game.sv);
      this.warping = true;
      Game.fadeOut(() => {
        this.warping = false;
        Game.set('battle', {
          kind: 'trainer', env: this.battleEnv(),
          trainer: { name: b.trainerName, team, money: b.money, winText: b.winText, boss: b.boss, badge: b.badge, champion: b.champion },
          onEnd: () => { if (this.script === s) { s.waitBattle = false; s.i++; } },
        });
        Game.fadeIn();
      }, 0.1);
      return;
    }
    if (st.trainerBattle) {
      s.waitBattle = true;
      const npc = st.trainerBattle;
      const t = npc.def.trainer;
      this.warping = true;
      Game.fadeOut(() => {
        this.warping = false;
        Game.set('battle', {
          kind: 'trainer', env: this.battleEnv(),
          trainer: { name: t.name, team: t.team, money: t.money, winText: t.win, boss: t.boss, badge: t.badge },
          onEnd: res => {
            if (res === 'win') Game.sv.flags[t.flag] = true;
            if (this.script === s) { s.waitBattle = false; s.i++; }
          },
        });
        Game.fadeIn();
      }, 0.1);
      return;
    }
    s.i++;
  },

  /* ---------- sconfitta ---------- */
  onBattleLost() {
    UI.clear();
    this.script = null;
    const lost = Math.floor(Game.sv.money / 2);
    Game.sv.money -= lost;
    this.warping = true;
    // Lo schermo è già nero (finish() ha già fatto fadeOut): esegue direttamente
    healParty();
    const r = Game.sv.respawn || { map: 'borgo', x: 5, y: 5, dir: 'down' };
    this.enter(r.map, r.x, r.y, r.dir || 'down');
    Game.fadeIn();
    say(['Sei tornato di corsa in un luogo sicuro.',
      lost > 0 ? 'Per la fretta hai perso ' + fmtMoney(lost) + '...' : 'Riprendi fiato.']);
  },

  /* ---------- interazioni ---------- */
  interact() {
    const d = DIRS[this.p.dir];
    let fx = this.p.x + d.dx, fy = this.p.y + d.dy;
    const npc = this.npcAt(fx, fy);
    if (npc) { this.talkNpc(npc); return; }
    const obj = this.objAt(fx, fy);
    if (obj) { this.useObj(obj); return; }
    let t = this.td(fx, fy);
    if (t.counter) {
      fx += d.dx; fy += d.dy;
      const n2 = this.npcAt(fx, fy);
      if (n2) { this.talkNpc(n2); return; }
      t = this.td(fx, fy);
    }
    if (t.sign) {
      const s = this.map.signs[fx + ',' + fy];
      if (s) say(s.split('\n'));
      return;
    }
    if (t.pc) { openPC(); return; }
    if (t.healer) { say(['La macchina curatrice ronza piano.']); return; }
    if (this.tileChar(fx, fy) === 'w') { say(['L\'acqua è limpida e fresca.']); return; }
    if (this.tileChar(fx, fy) === 'y') { say(['Il cristallo emette una debole melodia...']); return; }
  },

  talkNpc(npc) {
    npc.dir = OPPOSITE[this.p.dir];
    const def = npc.def;
    if (def.trainer) {
      const t = def.trainer;
      if (!Game.sv.flags[t.flag]) {
        this.startScript([{ say: t.before }, { trainerBattle: npc }]);
      } else {
        say(t.after && t.after[0] ? t.after : ['...']);
      }
      return;
    }
    if (def.heal === true) {
      say(def.say || ['Benvenuto al Centro di Cura!'], () => {
        if (!Game.sv.party.length) { say(['Torna quando avrai dei Velmon con te!']); return; }
        say(['Vuoi che rimetta in forze i tuoi Velmon?'], () => {
          askYesNo(yes => {
            if (!yes) { say(['Torna quando vuoi!']); return; }
            Sfx.play('heal');
            healParty();
            Game.sv.respawn = { map: this.mapId, x: this.p.x, y: this.p.y, dir: 'down' };
            say(['...', 'I tuoi Velmon sono in piena forma!', 'Torna a trovarci!']);
          });
        });
      });
      return;
    }
    if (def.heal === 'home') {
      const lines = typeof def.say === 'function' ? def.say(Game.sv, npc, this) : def.say;
      say(lines, () => {
        if (Game.sv.party.length) {
          Sfx.play('heal');
          healParty();
          Game.sv.respawn = { map: this.mapId, x: this.p.x, y: this.p.y, dir: 'down' };
          say(['Mamma ha curato i tuoi Velmon!']);
        }
      });
      return;
    }
    if (def.shop) { openShop(def.shop); return; }
    if (def.say) {
      const lines = typeof def.say === 'function' ? def.say(Game.sv, npc, this) : def.say;
      say(lines);
      return;
    }
    if (def.name) { say([def.name + ': La Lega forgia i campioni. Avanza, sfidante!']); return; }
    say(['...']);
  },

  useObj(obj) {
    if (obj.kind === 'item') {
      const key = 'it_' + this.mapId + '_' + obj.x + '_' + obj.y;
      Game.sv.flags[key] = true;
      this.giveItem(obj.item, 1);
      Sfx.play('buy');
      say(['Hai trovato: ' + DATA.ITEMS[obj.item].n + '!']);
      return;
    }
    if (obj.kind === 'sphere') { this.useSphere(obj); return; }
    if (obj.kind === 'mon') {
      say(obj.say, () => {
        this.startWildBattle(obj.species, obj.lv, res => {
          if (res === 'win' || res === 'catch') Game.sv.flags[obj.flag] = true;
        });
      });
      return;
    }
  },

  useSphere(obj) {
    if (Game.sv.flags.starter) { say(['La sfera è vuota.']); return; }
    const sp = DATA.SPECIES[obj.species];
    say(['C\'è ' + sp.name + ', il Velmon di tipo ' + sp.type + '.', 'Lo scegli come compagno di viaggio?'], () => {
      askYesNo(yes => {
        if (!yes) return;
        const mon = DATA.makeMon(obj.species, 5);
        Game.sv.party.push(mon);
        Game.sv.dex.seen[obj.species] = 1;
        Game.sv.dex.caught[obj.species] = 1;
        Game.sv.flags.starter = true;
        Game.sv.starterChoice = obj.species;
        Sfx.play('levelup');
        const rsp = DATA.SPECIES[DATA.RIVAL_STARTER[obj.species]];
        say(['Hai ricevuto ' + sp.name + '!',
          'PROF.SSA QUERCIA: Ottima scelta! Abbine cura come di un amico.',
          'DARIO: E allora io prendo ' + rsp.name + ', tipo ' + rsp.type + '!',
          'DARIO: Eh eh... so già chi vincerà tra noi due.']);
      });
    });
  },

  /* ---------- PNG ---------- */
  updateNPCs() {
    for (const npc of this.npcs) {
      if (npc.alert > 0) npc.alert--;
      if (npc.moving) { this.advanceNpcMove(npc); continue; }
      if (!this.npcActive(npc) || npc.def.move !== 'wander') continue;
      npc.wanderT--;
      if (npc.wanderT <= 0) {
        npc.wanderT = rndi(60, 200);
        const d = pick(['up', 'down', 'left', 'right']);
        npc.dir = d;
        if (chance(0.55)) {
          const nx = npc.x + DIRS[d].dx, ny = npc.y + DIRS[d].dy;
          if (Math.abs(nx - npc.hx) <= 2 && Math.abs(ny - npc.hy) <= 2 &&
              this.walkable(nx, ny, npc) && !(nx === this.p.x && ny === this.p.y)) {
            npc.x = nx; npc.y = ny;
            npc.moving = true; npc.prog = 0;
          }
        }
      }
    }
  },
  advanceNpcMove(npc) {
    npc.prog += 1.5;
    if (npc.prog >= 16) { npc.moving = false; npc.prog = 0; }
  },

  /* ---------- disegno ---------- */
  pixX(e) { return e.x * 16 - (e.moving ? DIRS[e.dir].dx * ((e.hop ? 32 : 16) - e.prog) : 0); },
  pixY(e) { return e.y * 16 - (e.moving ? DIRS[e.dir].dy * ((e.hop ? 32 : 16) - e.prog) : 0); },

  draw() {
    const m = this.map;
    const ppx = this.pixX(this.p), ppy = this.pixY(this.p);
    let camx = clamp(ppx - VW / 2 + 8, 0, Math.max(0, m.w * 16 - VW));
    let camy = clamp(ppy - VH / 2 + 8, 0, Math.max(0, m.h * 16 - VH));
    if (m.w * 16 < VW) camx = -(VW - m.w * 16) / 2;
    if (m.h * 16 < VH) camy = -(VH - m.h * 16) / 2;
    const f = Math.floor(Game.frame / 28) % 2;

    const x0 = Math.max(0, Math.floor(camx / 16));
    const y0 = Math.max(0, Math.floor(camy / 16));
    const x1 = Math.min(m.w - 1, Math.floor((camx + VW) / 16) + 1);
    const y1 = Math.min(m.h - 1, Math.floor((camy + VH) / 16) + 1);
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const def = TD[m.tiles[y][x]];
        const color = def.t === 'roof' ? m.theme : undefined;
        cx.drawImage(Tiles.get(def.t, f, color), Math.round(x * 16 - camx), Math.round(y * 16 - camy));
      }
    }

    // oggetti a terra
    for (const o of (m.objects || [])) {
      if (!this.objVisible(o)) continue;
      const ox = Math.round(o.x * 16 - camx), oy = Math.round(o.y * 16 - camy);
      if (o.kind === 'mon') {
        MonArt.drawIcon(cx, o.species, ox, oy, 16);
        if (Math.floor(Game.frame / 16) % 3 === 0) { cx.fillStyle = '#fff8a0'; cx.fillRect(ox + 13, oy + 1, 2, 2); }
      } else {
        drawBallSprite(cx, ox + 4, oy + 5, 8);
      }
    }

    // entità ordinate per Y
    const ents = [];
    for (const npc of this.npcs) {
      if (!this.npcActive(npc)) continue;
      ents.push({ npc, py: this.pixY(npc) });
    }
    ents.push({ player: true, py: ppy });
    ents.sort((a, b) => a.py - b.py);
    for (const e of ents) {
      if (e.player) {
        const step = this.p.moving ? Math.floor(this.p.prog / 4) % 4 : 0;
        let dy = 0;
        if (this.p.hop) dy = -Math.sin(this.p.prog / 32 * Math.PI) * 10;
        Chars.draw(cx, 'player', this.p.dir, step, ppx - camx, ppy - camy - 2 + dy);
        this.drawGrassOver(this.p.x, this.p.y, camx, camy, f, this.p.moving);
      } else {
        const npc = e.npc;
        const nx = this.pixX(npc), ny = this.pixY(npc);
        const step = npc.moving ? Math.floor(npc.prog / 4) % 4 : 0;
        Chars.draw(cx, npc.def.preset, npc.dir, step, nx - camx, ny - camy - 2);
        this.drawGrassOver(npc.x, npc.y, camx, camy, f, npc.moving);
        if (npc.alert > 0) {
          const bx = Math.round(nx - camx) + 3, by = Math.round(ny - camy) - 14;
          drawBox(bx, by, 10, 12);
          txt('!', bx + 3, by + 2, { c: '#d04848' });
        }
      }
    }
  },

  drawGrassOver(tx, ty, camx, camy, f, moving) {
    if (moving) return;
    if (this.tileChar(tx, ty) !== 't') return;
    cx.drawImage(Tiles.get('tall', f), 0, 8, 16, 8,
      Math.round(tx * 16 - camx), Math.round(ty * 16 - camy + 8), 16, 8);
  },
};
