// The story and the side quests: quest NPCs placed in the world, a journal,
// the tracked objective on the map and the scripted scenes. Progress lives in
// state.quests = { questId: stepIndex | 'done' }.

import * as THREE from 'three';
import { mulberry32 } from '../core/noise.js';
import { TOWNS, heightAt, slopeAt } from '../world/heightfield.js';
import { makeCharacter } from '../world/character.js';
import { findLand } from '../world/props.js';
import { bubble, beacon } from '../world/markers.js';
import { buildCreature } from '../creatures/model.js';
import { createMonster } from '../creatures/monster.js';
import { add as addItem } from '../items.js';
import { Staging, ACT } from './staging.js';

const town = (id) => TOWNS.find((t) => t.region.id === id);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const SKIN = 0xf1c7a3, MARINA = { skin: 0xe0ac69, hair: 0x2b1b10 };

export class Quests {
  constructor(game) {
    this.game = game;
    const rnd = mulberry32(2024);
    const alba = town('aurora'), petalo = town('fiorita'), muschio = town('giada'), corallo = town('corallo'), fulgida = town('fulgida'), cristallo = town('gelidi');
    this.camp = findLand(rnd, petalo.x, petalo.z, 320) || { x: petalo.x + 200, z: petalo.z };
    this.briciola = findLand(rnd, alba.x, alba.z, 260) || { x: alba.x + 150, z: alba.z + 80 };
    this.beach = this.findBeach(rnd, corallo) || { x: corallo.x + 120, z: corallo.z + 60 };
    this.marinaHouse = game.towns.houses.find((h) => h.id === 'corallo-2');
    this.marinaHouse.reserved = true;

    this.npcs = [];
    const npc = (id, name, look, x, z) => {
      const obj = makeCharacter(look);
      obj.position.set(x, heightAt(x, z), z);
      const b = bubble('!', '#ffb300', '#3b2a00');
      b.visible = false;
      obj.add(b);
      game.scene.add(obj);
      const n = { id, name, obj, x, z, mark: b };
      this.npcs.push(n);
      return n;
    };
    npc('ginepro', 'Dott. Ginepro', { shirt: 0xffffff, pants: 0x3e2723, hat: null, backpack: null, hair: 0x9e9e9e }, petalo.x + 8, petalo.z - 6);
    npc('rosa', 'Nonna Rosa', { shirt: 0x9c27b0, pants: 0x4a148c, hat: null, backpack: null, hair: 0xe0e0e0, longHair: true }, alba.x - 8, alba.z - 4);
    npc('fornaio', 'Fornaio Bruno', { shirt: 0xffffff, pants: 0x5d4037, hat: 0xffffff, hatBrim: 0xffffff, backpack: null }, alba.x + 9, alba.z - 5);
    npc('fornaia', 'Fornaia Ada', { shirt: 0xffffff, pants: 0x795548, hat: 0xffffff, hatBrim: 0xffffff, backpack: null, longHair: true, hair: 0x8d5524 }, muschio.x + 6, muschio.z + 6);
    npc('marina', 'Marina', { shirt: 0x00acc1, pants: 0xf5f5f5, hat: null, backpack: null, longHair: true, ...MARINA }, corallo.x - 6, corallo.z - 8);
    const grunt = { shirt: 0x212121, pants: 0x212121, hat: 0x6a1b9a, hatBrim: 0x212121, backpack: null };
    npc('eclissi1', 'Recluta dell\'Eclissi', grunt, this.camp.x + 2, this.camp.z);
    npc('eclissi2', 'Recluta dell\'Eclissi', grunt, this.camp.x - 2, this.camp.z + 1.5);
    // Chapter 2: the Eclissi warehouse outside Città Fulgida
    this.depot = findLand(rnd, fulgida.x, fulgida.z + 260, 160) || { x: fulgida.x + 60, z: fulgida.z + 300 };
    this.buildDepot(this.depot);
    npc('eclissi3', 'Recluta dell\'Eclissi', grunt, this.depot.x - 4, this.depot.z + 9);
    npc('eclissi4', 'Recluta dell\'Eclissi', grunt, this.depot.x + 4, this.depot.z + 9);
    npc('notte', 'Comandante Notte', { shirt: 0x4a148c, pants: 0x111111, hat: 0x111111, hatBrim: 0x6a1b9a, backpack: null, longHair: true, hair: 0xd1c4e9 }, this.depot.x, this.depot.z + 6.5);
    // Chapter 3: the sanctuary of Aurorante, high on the Picchi Gelidi
    this.shrine = this.findPeak(rnd, cristallo);
    this.buildShrine(this.shrine);
    npc('neve', 'Guardiana Neve', { shirt: 0xeceff1, pants: 0x90a4ae, hat: null, backpack: null, longHair: true, hair: 0xf5f5f5 }, cristallo.x + 7, cristallo.z + 5);
    npc('granmaestro', 'Gran Maestro dell\'Eclissi', { shirt: 0x1a0033, pants: 0x1a0033, hat: 0x6a1b9a, hatBrim: 0xffd23f, backpack: null }, this.shrine.x + 5, this.shrine.z + 5);
    this.legend = buildCreature('aurorante');
    this.legend.position.set(this.shrine.x, heightAt(this.shrine.x, this.shrine.z) + 1.2, this.shrine.z);
    game.scene.add(this.legend);
    // Briciola, the lost Topolux
    this.pet = buildCreature('topolux');
    this.pet.position.set(this.briciola.x, heightAt(this.briciola.x, this.briciola.z), this.briciola.z);
    game.scene.add(this.pet);

    this.Q = {
      main1: {
        title: 'Capitolo 1 · L\'ombra dell\'Eclissi', main: true,
        steps: [
          { text: 'Sconfiggi il Campione di Borgo Alba (vicino al pozzo)', at: () => ({ x: alba.x - 5, z: alba.z + 11 }), done: (s) => s.beaten['town-aurora'] },
          { text: 'Parla con la Prof.ssa Quercia', at: () => ({ x: alba.x + 5, z: alba.z + 6 }) },
          { text: 'Porta la lettera al Dott. Ginepro a Villa Petalo (Costa Fiorita)', at: () => ({ x: petalo.x + 8, z: petalo.z - 6 }) },
          { text: 'Sconfiggi le reclute dell\'Eclissi all\'accampamento', at: () => this.camp, done: (s) => s.beaten.eclissi1 && s.beaten.eclissi2 },
          { text: 'Torna dal Dott. Ginepro', at: () => ({ x: petalo.x + 8, z: petalo.z - 6 }) },
        ],
        reward: { money: 1500, items: { superpozione: 2 } },
      },
      main2: {
        title: 'Capitolo 2 · Il magazzino dell\'Eclissi', main: true,
        steps: [
          { text: 'Chiedi informazioni a Er Faina, nei vicoli di Città Fulgida', at: () => game.crime.fixers[0] },
          { text: 'Sconfiggi le due reclute davanti al magazzino dell\'Eclissi', at: () => this.depot, done: (s) => s.beaten.eclissi3 && s.beaten.eclissi4 },
          { text: 'Sconfiggi il Comandante Notte', at: () => this.depot, done: (s) => s.beaten.notte },
          { text: 'Racconta tutto alla Prof.ssa Quercia a Borgo Alba', at: () => ({ x: alba.x + 5, z: alba.z + 6 }) },
        ],
        reward: { money: 3000, items: { ravviva: 2, superpozione: 2 } },
      },
      main3: {
        title: 'Capitolo 3 · Il santuario dell\'alba', main: true,
        steps: [
          { text: 'Vai a Borgo Cristallo (Picchi Gelidi) e parla con la Guardiana Neve', at: () => ({ x: cristallo.x + 7, z: cristallo.z + 5 }) },
          { text: 'Sali al santuario di Aurorante, in cima ai monti', at: () => this.shrine, near: 18 },
          { text: 'Sconfiggi il Gran Maestro dell\'Eclissi', at: () => this.shrine, done: (s) => s.beaten.granmaestro },
          { text: 'Affronta Aurorante e prova a catturarlo', at: () => this.shrine, done: (s) => s.caught.aurorante },
        ],
        reward: { money: 5000, items: { ravviva: 3 } },
      },
      briciola: {
        title: 'Il Topolux di Nonna Rosa',
        steps: [
          { text: 'Trova Briciola, il Topolux di Nonna Rosa, fuori Borgo Alba', at: () => this.briciola },
          { text: 'Riporta Briciola da Nonna Rosa', at: () => ({ x: alba.x - 8, z: alba.z - 4 }) },
        ],
        reward: { money: 400, items: { pozione: 2 } },
      },
      pane: {
        title: 'Pane caldo',
        steps: [{ text: 'Porta il pane alla Fornaia Ada a Borgo Muschio (Selva di Giada)', at: () => ({ x: muschio.x + 6, z: muschio.z + 6 }) }],
        reward: { money: 600, items: { pozione: 1 } },
      },
      strada: { title: 'Re della strada', steps: [{ text: 'Sconfiggi 6 allenatori lungo le strade', done: (s) => Object.keys(s.beaten).filter((k) => k.startsWith('road-')).length >= 6 }], reward: { money: 1500 } },
      tesori: { title: 'Cacciatore di tesori', steps: [{ text: 'Apri 5 forzieri nascosti nel mondo', done: (s) => Object.keys(s.chests || {}).length >= 5 }], reward: { items: { ravviva: 2 } } },
      collezione: { title: 'Collezionista', steps: [{ text: 'Cattura 10 specie diverse di Velmon', done: (s) => Object.keys(s.caught).length >= 10 }], reward: { money: 2000, items: { sfera: 10 } } },
      marina: {
        title: '❤️ Una sera a Porto Corallo', adult: true,
        steps: [
          { text: 'Porta un vaso di fiori a Marina (ce ne sono nelle piazze)', at: () => ({ x: corallo.x - 6, z: corallo.z - 8 }) },
          { text: 'Raggiungi Marina in spiaggia, di sera (dopo le 20)', at: () => this.beach },
          { text: 'Vai a casa di Marina', at: () => this.marinaHouse.door },
        ],
        reward: {},
      },
    };
    this.t = 0;
    // a golden column of light over the current objective, visible from far away
    this.guide = beacon(0xffc93c);
    this.guide.visible = false;
    game.scene.add(this.guide);
  }

  buildDepot(p) {
    const g = new THREE.Group();
    const h = heightAt(p.x, p.z);
    g.position.set(p.x, h, p.z);
    const m = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, flatShading: true });
    const add = (geo, mt, x, y, z) => { const o = new THREE.Mesh(geo, mt); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; g.add(o); return o; };
    add(new THREE.BoxGeometry(16, 6, 10), m(0x6d6f73), 0, 3, 0);
    add(new THREE.BoxGeometry(16.6, 0.6, 10.6), m(0x3b3d40), 0, 6.3, 0);
    add(new THREE.BoxGeometry(5, 4.5, 0.2), m(0x44474b), 0, 2.25, 5.05); // shutter
    add(new THREE.BoxGeometry(3, 4, 0.1), m(0x6a1b9a), -5.5, 3.8, 5.08); // purple banners
    add(new THREE.BoxGeometry(3, 4, 0.1), m(0x6a1b9a), 5.5, 3.8, 5.08);
    for (const s of [-1, 1]) add(new THREE.CircleGeometry(0.9, 20), new THREE.MeshStandardMaterial({ color: 0xffd23f, emissive: 0xffb300, emissiveIntensity: 0.6 }), s * 5.5, 4.3, 5.14);
    this.game.scene.add(g);
    this.game.towns.colliders.push({ x: p.x, z: p.z, rot: 0, hx: 8.2, hz: 5.2 });
    for (let i = 0; i < 4; i++) this.game.grab?.spawn?.('cassa', p.x - 7 + i * 1.2, null, p.z + 7.5 + (i % 2), false);
  }

  // Er Faina knows where the Eclissi hides (chapter 2); true if handled
  async onFixer(f) {
    if (f.town !== 'fulgida' || this.st.quests.main2 !== 0) return false;
    await this.game.hud.say(f.name, ['L\'Eclissi? Gente che paga bene e fa troppe domande.', 'Hanno un magazzino a sud della città, con le bandiere viola. Io non ti ho detto niente, eh.', 'E se ci vai, porta una squadra forte. Il loro comandante è una tosta.']);
    this.advance('main2');
    return true;
  }

  // the highest gentle spot within reach of a town
  findPeak(rnd, t) {
    let best = null, bh = -1;
    for (let i = 0; i < 400; i++) {
      const a = rnd() * Math.PI * 2, r = 250 + rnd() * 450;
      const x = t.x + Math.cos(a) * r, z = t.z + Math.sin(a) * r;
      const h = heightAt(x, z);
      if (h > bh && slopeAt(x, z) < 0.45) { bh = h; best = { x, z }; }
    }
    return best || { x: t.x + 300, z: t.z };
  }

  buildShrine(p) {
    const g = new THREE.Group();
    g.position.set(p.x, heightAt(p.x, p.z) - 0.2, p.z);
    const stone = new THREE.MeshStandardMaterial({ color: 0xd8dde3, roughness: 0.7, flatShading: true });
    const add = (geo, mt, x, y, z) => { const o = new THREE.Mesh(geo, mt); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; g.add(o); return o; };
    add(new THREE.CylinderGeometry(8, 8.5, 0.6, 24), stone, 0, 0.3, 0);
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; add(new THREE.CylinderGeometry(0.45, 0.55, 5, 8), stone, Math.cos(a) * 7, 2.8, Math.sin(a) * 7); }
    add(new THREE.BoxGeometry(2.2, 1, 2.2), stone, 0, 1.0, 0);
    add(new THREE.TorusGeometry(1.6, 0.12, 8, 32), new THREE.MeshStandardMaterial({ color: 0xffd23f, emissive: 0xffa000, emissiveIntensity: 1.2 }), 0, 4.5, 0).rotation.x = Math.PI / 2;
    this.game.scene.add(g);
  }

  async faceLegend() {
    const game = this.game, st = this.st;
    if (st.quests.main3 !== 3) { await game.hud.say('', [st.beaten.granmaestro ? '...' : 'Aurorante ti osserva dall\'alto. Prima devi fermare l\'Eclissi.']); return; }
    game.busy = true;
    await game.hud.say('', ['Aurorante spalanca le ali. L\'aria si fa calda come a mezzogiorno.', 'Ti sta mettendo alla prova!']);
    const out = await game.battle.start(createMonster('aurorante', 45));
    if (out === 'caught') { this.legend.visible = false; this.check(); }
    else if (out !== 'lose') { game.busy = true; await game.hud.say('', ['Aurorante si rialza e torna sull\'altare. Puoi riprovare quando vuoi.']); }
    game.busy = false;
  }

  findBeach(rnd, t) {
    for (let i = 0; i < 200; i++) {
      const a = rnd() * Math.PI * 2, r = 130 + rnd() * 250;
      const x = t.x + Math.cos(a) * r, z = t.z + Math.sin(a) * r;
      const h = heightAt(x, z);
      if (h > 0.6 && h < 2.2) return { x, z };
    }
    return null;
  }

  get st() { return this.game.state; }

  // quests that start on their own (from a new game, or an old save)
  init() {
    const st = this.st;
    st.quests ??= {};
    for (const id of ['strada', 'tesori', 'collezione']) st.quests[id] ??= 0;
    if (st.started) st.quests.main1 ??= 0;
    if (st.quests.main1 === 'done') st.quests.main2 ??= 0;
    if (st.quests.main2 === 'done') st.quests.main3 ??= 0;
    if (st.caught.aurorante) this.legend.visible = false;
    if (st.quests.briciola === 'done') this.pet.visible = false;
    this.check(true);
  }

  active() {
    return Object.entries(this.st.quests || {}).filter(([id, s]) => s !== 'done' && this.Q[id] && (!this.Q[id].adult || this.st.adult));
  }

  start(id) {
    if (this.st.quests[id] != null) return;
    this.st.quests[id] = 0;
    this.st.track = id;
    this.game.hud.toast(`Nuova missione: ${this.Q[id].title}`, 2600);
    this.game.save();
  }

  advance(id) {
    const q = this.Q[id], st = this.st;
    st.quests[id] += 1;
    if (st.quests[id] >= q.steps.length) {
      st.quests[id] = 'done';
      const r = q.reward || {};
      if (r.money) { st.money += r.money; this.game.hud.setMoney(st.money); }
      for (const [it, n] of Object.entries(r.items || {})) addItem(st, it, n);
      const parts = [r.money ? `💰 ${r.money}` : '', ...Object.entries(r.items || {}).map(([it, n]) => `${n}× ${it}`)].filter(Boolean);
      this.game.hud.banner(parts.length ? `Ricompensa: ${parts.join(', ')}` : 'Completata', q.title);
      if (st.track === id) st.track = null;
    } else this.game.hud.toast(`${q.title}: ${q.steps[st.quests[id]].text}`, 3000);
    this.game.save();
  }

  // automatic objectives (beaten trainers, chests, catches)
  check(silent = false) {
    for (const [id, s] of this.active()) {
      const step = this.Q[id].steps[s];
      if (step?.done?.(this.st)) { if (!silent || true) this.advance(id); }
    }
  }

  tracked() {
    const act = this.active();
    const id = act.find(([i]) => i === this.st.track)?.[0] || act.find(([i]) => this.Q[i].main)?.[0] || act.find(([i]) => this.Q[i].steps[this.st.quests[i]].at)?.[0];
    return id ? { id, q: this.Q[id], step: this.Q[id].steps[this.st.quests[id]] } : null;
  }

  mapMarks() {
    const tr = this.tracked();
    const p = tr?.step.at?.();
    return p ? [{ x: p.x, z: p.z, color: '#ffb300', edge: true }] : [];
  }

  async journal() {
    const act = this.active();
    if (!act.length) { this.game.hud.toast('Nessuna missione attiva.', 1600); return; }
    const i = await this.game.hud.choose('📜 Missioni (tocca per seguirla sulla mappa)', [...act.map(([id, s]) => ({ icon: this.Q[id].main ? '⭐' : this.st.track === id ? '📍' : '📜', label: this.Q[id].title, sub: this.Q[id].steps[s].text })), { icon: '↩︎', label: 'Chiudi' }]);
    if (i >= 0 && i < act.length) { this.st.track = act[i][0]; this.game.save(); }
  }

  // ---------- talking ----------
  nearest(pos) {
    if (this.game.player.indoor) return null;
    let best = null;
    for (const n of this.npcs) {
      if (!n.obj.visible) continue;
      const d = Math.hypot(pos.x - n.obj.position.x, pos.z - n.obj.position.z);
      if (d < 2.3 && (!best || d < best.d)) best = { kind: 'quest', n, d, hint: `A · Parla con ${n.name}` };
    }
    const dl = Math.hypot(pos.x - this.legend.position.x, pos.z - this.legend.position.z);
    if (this.legend.visible && dl < 4) best = { kind: 'legend', d: dl, hint: 'A · Avvicinati ad Aurorante' };
    const dp = Math.hypot(pos.x - this.pet.position.x, pos.z - this.pet.position.z);
    if (this.pet.visible && dp < 2 && this.st.quests.briciola === 0) best = { kind: 'pet', d: dp, hint: 'A · Prendi Briciola' };
    return best;
  }

  // the Professoressa's lines when the story needs her; true if handled
  async onProf() {
    const st = this.st, hud = this.game.hud;
    if (st.quests.main1 === 0) { await hud.say('Prof.ssa Quercia', ['Il Campione di Borgo Alba è lì vicino al pozzo. Battilo e torna da me: ho un incarico importante per te.']); return true; }
    if (st.quests.main2 === 3) {
      await hud.say('Prof.ssa Quercia', ['Aurorante... il Velmon dell\'alba. Credevo fosse solo una leggenda.', 'Se l\'Eclissi riesce a catturarlo, potrà piegare il ciclo del giorno e della notte a suo piacimento.', 'Dobbiamo arrivare al santuario sui Picchi Gelidi prima di loro. Ma ti servirà una squadra fortissima. Allenati, e preparati al viaggio.']);
      this.advance('main2');
      hud.banner('Inizia il Capitolo 3', 'Capitolo 2 completato');
      this.start('main3');
      return true;
    }
    if (st.quests.main1 === 1) {
      await hud.say('Prof.ssa Quercia', ['Hai battuto il Campione! Allora sei pronto.', 'Negli ultimi giorni molti Velmon sono spariti. Si parla di un gruppo vestito di nero: l\'Eclissi.', 'Porta questa lettera al mio collega, il Dott. Ginepro, a Villa Petalo, a ovest sulla costa. Lui sa di più.']);
      this.advance('main1');
      return true;
    }
    return false;
  }

  async talk(n) {
    const game = this.game, st = this.st, hud = game.hud;
    game.busy = true;
    n.obj.lookAt(game.player.pos.x, n.obj.position.y, game.player.pos.z);
    const q = st.quests;
    switch (n.id) {
      case 'ginepro':
        if (q.main1 === 2) {
          await hud.say(n.name, ['Una lettera di Quercia? Vediamo...', 'Proprio come temevo. L\'Eclissi ha piantato un accampamento qui vicino: rubano Velmon dalle fattorie.', 'Io sono troppo vecchio per le lotte. Vai tu e cacciali via! L\'accampamento è segnato sulla tua mappa.']);
          this.advance('main1');
        } else if (q.main1 === 4) {
          await hud.say(n.name, ['Li hai messi in fuga! I Velmon delle fattorie sono liberi.', 'Ma questo era solo un avamposto. Dalle loro carte, il covo dell\'Eclissi è a Città Fulgida, sotto il naso di tutti...', 'Prendi questo per il disturbo. Il viaggio vero comincia adesso.']);
          this.advance('main1');
          hud.banner('Inizia il Capitolo 2', 'Capitolo 1 completato');
          this.start('main2');
        } else await hud.say(n.name, ['La Costa Fiorita è bellissima in primavera. Peccato per tutti questi furti...']);
        break;
      case 'eclissi1': case 'eclissi2': case 'eclissi3': case 'eclissi4': case 'notte': {
        const ch2 = n.id !== 'eclissi1' && n.id !== 'eclissi2';
        const ready = ch2 ? (n.id === 'notte' ? q.main2 === 2 : q.main2 === 1) : q.main1 === 3;
        if (n.id === 'notte' && !st.beaten.notte && q.main2 === 1) { await hud.say(n.name, ['Prima passa sulle mie reclute, moscerino.']); break; }
        if (!ready || st.beaten[n.id]) { await hud.say(n.name, [st.beaten[n.id] ? 'Ahia... il capo non sarà contento.' : 'Circolare, non c\'è niente da vedere qui.']); break; }
        await hud.say(n.name, ['Un ficcanaso! L\'Eclissi non perdona chi mette il becco nei suoi affari!']);
        const top = Math.max(...st.party.map((m) => m.level));
        const TEAMS = { eclissi1: ['pipistro', 'topolux'], eclissi2: ['ombrale', 'sabbiolo', 'voltino'], eclissi3: ['vampistro', 'ratolux'], eclissi4: ['tenebrale', 'desertauro'], notte: ['vampistro', 'tenebrale', 'fulminax'] };
        const lv = ch2 ? Math.max(18, Math.min(top + (n.id === 'notte' ? 2 : 0), 40)) : Math.max(8, Math.min(top, 18));
        if (n.id === 'notte') await hud.say(n.name, ['Così sei tu quello che ha sgominato l\'avamposto di Villa Petalo.', 'Il Gran Maestro mi ha parlato di te. Vediamo se valevi tutto questo disturbo.']);
        const team = TEAMS[n.id].map((id) => createMonster(id, lv));
        const out = await game.battle.start(null, { trainer: { name: n.name, team, reward: n.id === 'notte' ? 2500 : 800, fine: 300, obj: n.obj } });
        n.obj.position.set(n.x, heightAt(n.x, n.z), n.z);
        if (out === 'win') {
          st.beaten[n.id] = true; game.busy = true;
          await hud.say(n.name, n.id === 'notte'
            ? ['Impossibile... battuta da un ragazzino.', 'Goditi la vittoria. Il Gran Maestro ha già quello che cercava: la mappa per il santuario di Aurorante, sui Picchi Gelidi.', 'Quando il Velmon leggendario sarà nostro, nessuno potrà fermare l\'Eclissi!']
            : ['Non finisce qui! Il capo ve la farà pagare!']);
          this.check();
        }
        break;
      }
      case 'neve':
        if (q.main3 === 0) {
          await hud.say(n.name, ['Tu devi essere quello di cui parla la Professoressa. Ti aspettavo.', 'Il santuario di Aurorante è lassù, dove la neve non si scioglie mai. Da giorni vedo luci viola salire il sentiero.', 'L\'Eclissi è già in cammino. Sbrigati... e copriti bene.']);
          this.advance('main3');
        } else await hud.say(n.name, [q.main3 === 'done' ? 'L\'alba è tornata a essere libera. Grazie, allenatore.' : 'Il santuario è in cima ai monti. Segui il segnale sulla mappa.']);
        break;
      case 'granmaestro': {
        if (q.main3 !== 2 || st.beaten.granmaestro) { await hud.say(n.name, [st.beaten.granmaestro ? 'L\'Eclissi... tramonta. Per ora.' : 'Non è ancora il tuo momento.']); break; }
        await hud.say(n.name, ['Quindi sei tu. Il ragazzino che ha umiliato Notte.', 'Guarda, Aurorante è a un passo. Con lui l\'Eclissi deciderà quando sorge il sole su Valmora.', 'Ma prima ti toglierò di mezzo. Personalmente.']);
        const top = Math.max(...st.party.map((m) => m.level));
        const lv = Math.max(30, Math.min(top + 3, 55));
        const team = ['tenebrale', 'vulcanide', 'abissale', 'colossasso'].map((id) => createMonster(id, lv));
        const out = await game.battle.start(null, { trainer: { name: n.name, team, reward: 5000, fine: 500, obj: n.obj } });
        n.obj.position.set(n.x, heightAt(n.x, n.z), n.z);
        if (out === 'win') { st.beaten.granmaestro = true; game.busy = true; await hud.say(n.name, ['No... non è possibile.', 'Prendilo pure, se ci riesci. Aurorante non si piega a nessuno.']); this.check(); }
        break;
      }
      case 'rosa':
        if (q.briciola == null) {
          await hud.say(n.name, ['Oh, caro... il mio Topolux, Briciola, è scappato di nuovo!', 'L\'ho visto correre fuori dal paese. Me lo riporteresti? Ti preparo una torta... e qualche moneta.']);
          this.start('briciola');
        } else if (q.briciola === 1) {
          await hud.say(n.name, ['Briciola! Eccoti, birbante!', 'Grazie, tesoro. Tieni, te lo sei meritato.']);
          this.pet.visible = false;
          this.advance('briciola');
        } else await hud.say(n.name, [q.briciola === 'done' ? 'Briciola non è più scappato, grazie a te.' : 'Hai trovato Briciola? È là fuori da qualche parte...']);
        break;
      case 'fornaio':
        if (q.pane == null) { await hud.say(n.name, ['Ehi, giovane! Mi porti questa pagnotta a mia sorella Ada, a Borgo Muschio? Lei ti pagherà bene.']); this.start('pane'); }
        else await hud.say(n.name, [q.pane === 'done' ? 'Ada mi ha scritto: il pane è arrivato ancora caldo!' : 'Borgo Muschio è a nord-est, nella Selva di Giada.']);
        break;
      case 'fornaia':
        if (q.pane === 0) { await hud.say(n.name, ['Il pane di mio fratello! Ha ancora quel profumo...', 'Ecco a te, e grazie mille!']); this.advance('pane'); }
        else await hud.say(n.name, ['Benvenuto a Borgo Muschio! Il pane migliore della selva è qui.']);
        break;
      case 'marina': await this.marinaTalk(n); break;
      default:
    }
    game.busy = false;
  }

  async petFound() {
    const game = this.game;
    game.busy = true;
    await game.hud.say('', ['Briciola squittisce felice e ti salta in braccio!']);
    this.pet.visible = false;
    this.advance('briciola');
    game.busy = false;
  }

  // ---------- Marina (18+) ----------
  async marinaTalk(n) {
    const st = this.st, hud = this.game.hud, q = st.quests;
    if (!st.adult) { await hud.say(n.name, ['Ciao! Il porto è bellissimo al tramonto, sai?']); return; }
    if (q.marina == null) {
      await hud.say(n.name, ['Ehi, straniero. Non ti ho mai visto al porto.', 'Lavoro qui da dieci anni e conosco tutti... ma tu no. Interessante.', 'Facciamo così: portami un bel vaso di fiori e forse ti concedo una serata. Non sono una che si accontenta, eh.']);
      this.start('marina');
    } else if (q.marina === 0) {
      const g = this.game.grab;
      if (g.held?.kind === 'vasofiori') {
        const it = g.held;
        g.drop();
        this.game.scene.remove(it.obj);
        g.items.splice(g.items.indexOf(it), 1);
        await hud.say(n.name, ['Per me? Ma guarda che galantuomo...', 'Va bene, hai vinto. Stasera, dopo le otto, in spiaggia. Non farmi aspettare.', 'E mettiti qualcosa di carino.']);
        this.advance('marina');
      } else await hud.say(n.name, ['Allora, questi fiori? Una ragazza non aspetta per sempre.']);
    } else if (q.marina === 'done') await hud.say(n.name, ['Ciao, tu... 😏 Ripensavo a quella sera.', 'Passa da casa mia quando vuoi.']);
    else await hud.say(n.name, [q.marina === 1 ? 'Stasera in spiaggia, ricordi? Dopo le otto.' : 'Che fai ancora qui? Ti aspetto a casa mia.']);
  }

  // two people facing each other, slowly closer: the kiss
  async kiss(a, b) {
    const pa = a.position.clone(), pb = b.position.clone();
    const mid = pa.clone().lerp(pb, 0.5);
    const dir = pb.clone().sub(pa).setY(0).normalize();
    a.lookAt(pb.x, pa.y, pb.z); b.lookAt(pa.x, pb.y, pa.z);
    for (let i = 0; i <= 30; i++) {
      const k = i / 30;
      a.position.copy(mid).addScaledVector(dir, -0.75 + k * 0.48); a.position.y = pa.y;
      b.position.copy(mid).addScaledVector(dir, 0.75 - k * 0.48); b.position.y = pb.y;
      a.userData.body.rotation.x = b.userData.body.rotation.x = k * 0.14;
      await sleep(30);
    }
    const heart = bubble('❤', '#ff3d68');
    heart.position.copy(mid).y += 2.3;
    this.game.scene.add(heart);
    await sleep(900);
    return heart;
  }

  // Tender moments with choices: kisses, caresses, massages, whispers. Nothing explicit.
  // Tender moments with choices. Nothing explicit is ever shown or described.
  // feet: optional { massage, kiss, lick } reactions that fit her personality
  // extra: more choices for this moment; only: limit to these labels (public places)
  // stage: optional { me, stage: 'stand' | 'seat' | 'bed' } so every choice is acted out
  async intimacy(her, rounds = 3, name = 'Marina', guide = null, feet = null, extra = [], only = null, stage = null) {
    const st = stage && new Staging({ game: this.game, her, me: stage.me, stage: stage.stage, anchor: her.position.clone(), face: Math.atan2(stage.me.position.x - her.position.x, stage.me.position.z - her.position.z) });
    const hud = this.game.hud;
    const OPTS = [
      { icon: '💋', label: 'Baciala', lines: ['Mmh... ancora.', 'Non smettere.', 'Baci come se fosse l\'ultima volta.'] },
      { icon: '✋', label: 'Accarezzale i capelli', lines: ['Continua così... mi rilassa.', 'Nessuno mi tocca i capelli così da anni.'] },
      { icon: '💆', label: 'Massaggiale le spalle', lines: ['Oh sì, proprio lì...', 'Hai mani d\'oro, lo sai?'] },
      { icon: '🤲', label: 'Massaggiale la schiena', lines: ['Più giù... no, ecco, perfetto.', 'Se continui così mi addormento. O forse no.'] },
      { icon: '🦵', label: 'Accarezzale le gambe', lines: ['Hai le mani calde...', 'Piano... mi fai il solletico. Ma non fermarti.'] },
      { icon: '🦶', label: 'Massaggiale i piedi', lines: feet?.massage || ['Dopo una giornata in piedi è il paradiso.', 'Se mi massaggi così i piedi, ti sposo.'] },
      { icon: '👣', label: 'Baciale i piedi', lines: feet?.kiss || ['Ehi! ...Che tipo strano che sei. Mi piace.', 'Nessuno l\'aveva mai fatto. Fallo ancora.'] },
      { icon: '😘', label: 'Baciale il collo', lines: ['Ehi... così mi fai venire i brividi.', 'Questo è sleale. Rifallo.'] },
      { icon: '🦶', label: 'Leccale i piedi', lines: feet?.lick || ['Ahahah! No, il solletico no! ...Va bene, ancora un po\'.', 'Sei proprio strano. E la cosa mi piace un sacco.'] },
      { icon: '👅', label: 'Leccale il collo', lines: ['Ah! ...Sei un animale. Continua.', 'Mi stai facendo impazzire, lo sai?'] },
      { icon: '😏', label: 'Mordicchiale l\'orecchio', lines: ['Ehi, piano! ...No, non smettere.', 'Il mio punto debole. Come facevi a saperlo?'] },
      { icon: '🤗', label: 'Stringila a te', lines: ['Mi piace stare così.', 'Sento il tuo cuore che batte forte...'] },
      { icon: '🗣️', label: 'Sussurrale qualcosa all\'orecchio', lines: ['Ma che cose dici! ...Dillo ancora.', 'Sei proprio un furfante, sai?'] },
      // allusive only: nothing is named or described
      { icon: '🔥', label: 'Lasciati guidare da lei…', lines: guide || ['Chiudi gli occhi... e fidati di me.', 'Mmh... vedo che hai capito.'], hearts: 3 },
    ];
    const list = [...(only ? OPTS.filter((o) => only.includes(o.label)) : OPTS), ...extra];
    for (let r = 0; r < rounds; r++) {
      const i = await hud.choose(`Cosa fai? ${'❤'.repeat(r + 1)}`, [...list.map((o) => ({ icon: o.icon, label: o.label })), { icon: '➡️', label: r ? 'Continua' : 'Lascia fare a lei' }]);
      if (i < 0 || i >= list.length) break;
      const o = list[i];
      const hs = [];
      for (let k = 0; k < (o.hearts || 1); k++) {
        const h = bubble('❤', '#ff3d68'); h.scale.setScalar(0.35);
        h.position.copy(her.position).add(new THREE.Vector3((k - (o.hearts || 1) / 2 + 0.5) * 0.45, 2.0 + k * 0.15, 0));
        this.game.scene.add(h); hs.push(h);
      }
      const stop = st ? await st.act(ACT[o.label] || 'other') : null;
      hs.forEach((h) => h.position.set(her.position.x + (h.position.x - her.position.x), her.position.y + 2.0, her.position.z));
      await hud.say(name, o.hearts ? o.lines : [o.lines[Math.floor(Math.random() * o.lines.length)]]);
      stop?.();
      hs.forEach((h) => this.game.scene.remove(h));
    }
  }

  get marinaGirl() {
    return {
      name: 'Marina', look: { shirt: 0x00acc1, pants: 0xf5f5f5, ...MARINA }, under: 0xb0003a,
      date: ['Sei venuto davvero. E pure puntuale.', 'Guarda il mare... di notte sembra fatto d\'argento.', 'Lo sai che hai degli occhi pericolosi? Vieni più vicino.'],
      afterKiss: ['Mmh... baci bene, straniero.'], invite: ['Casa mia è qui vicino. Non mi va che questa serata finisca in spiaggia.'],
      home: ['Benvenuto nel mio piccolo regno.', 'Chiudi la porta... e smettila di guardarti intorno. Guarda me.'],
      undress: ['Fa caldo qui dentro, non trovi?', 'Lascia che ti aiuti con quella maglietta...', 'Molto meglio così.', 'Allora, straniero... il letto è da quella parte. Mi ci porti tu?'],
      feet: {
        massage: ['Mmh... dieci anni a camminare sul molo, te lo meriti tu questo lavoro.', 'Più forte. Sì, così. Non smettere finché non te lo dico io.'],
        kiss: ['Guarda un po\' chi si inginocchia davanti a me...', 'Bravo. Mi piace un uomo che sa stare al suo posto.'],
        lick: ['Ehi! ...Va bene, hai il mio permesso. Per ora.', 'Mmh, sapore di mare, eh? Continua, marinaio.'],
      },
      guide: ['Shh... lascia fare a me, straniero.', 'Ecco... così. Vedo che impari in fretta.'],
      bed: ['Mmh... finalmente.'], end: ['Shh. Niente parole, adesso.', '...', 'Wow. Non male, per uno che viene da Borgo Alba.', 'Resta stanotte. Domattina ti preparo il caffè... se mi lasci alzare.'],
    };
  }

  // the date: she waits at the spot, talk, a kiss, choices, then she invites you home
  async dateScene(girl, spot, obj) {
    const game = this.game, hud = game.hud, P = game.player;
    game.busy = true;
    // stand-ins for both of you, so the scene can move them freely
    obj.userData.out = true; obj.visible = false; P.model.visible = false;
    const y = heightAt(spot.x, spot.z);
    const me = makeCharacter({ hat: null, backpack: null }), her = makeCharacter({ hat: null, backpack: null, longHair: true, ...girl.look });
    me.position.set(spot.x - 0.5, y, spot.z); me.rotation.y = Math.PI / 2;
    her.position.set(spot.x + 1.5, heightAt(spot.x + 1.5, spot.z), spot.z); her.rotation.y = -Math.PI / 2;
    game.scene.add(me, her);
    P.place(spot.x - 0.5, spot.z, Math.PI / 2);
    const look = new THREE.Vector3(spot.x + 0.5, y + 1.5, spot.z);
    game.cine = { pos: new THREE.Vector3(spot.x + 0.5, look.y + 0.4, spot.z + 4), look };
    await hud.say(girl.name, girl.date);
    const heart = await this.kiss(me, her);
    await hud.say(girl.name, girl.afterKiss);
    await this.intimacy(her, 2, girl.name, girl.guide, girl.feet, [], null, { me, stage: 'stand' });
    await hud.say(girl.name, girl.invite);
    game.scene.remove(heart, me, her);
    obj.userData.out = false; obj.visible = true; P.model.visible = true;
    game.cine = null;
    game.busy = false;
  }

  async beachScene() {
    await this.dateScene(this.marinaGirl, this.beach, this.npcs.find((x) => x.id === 'marina').obj);
    this.advance('marina');
  }

  // inside her house: kisses, clothes off (no anatomy is ever modelled and the
  // framing never shows anything), then the two of them in bed under the blanket.
  async bedroomScene(room, girl = this.marinaGirl, questId = 'marina') {
    const game = this.game, hud = game.hud, P = game.player;
    game.busy = true;
    const o = room.origin, y = room.bounds.y;
    // candles and a warm, dim light for the evening
    const mood = new THREE.Group();
    const wax = new THREE.MeshStandardMaterial({ color: 0xfff3e0, roughness: 0.6 });
    const flame = new THREE.MeshStandardMaterial({ color: 0xffb347, emissive: 0xff8c1a, emissiveIntensity: 3 });
    for (const [cx, cz] of [[-2.6, -3.5], [-4.6, -1.0], [2.2, 0.6], [1.6, 0.4], [-0.6, -3.6]]) {
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.22, 10), wax); c.position.set(o.x + cx, y + (cz > 0 ? 0.89 : 0.11), o.z + cz);
      const f = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.07, 8), flame); f.position.set(0, 0.15, 0); c.add(f);
      mood.add(c);
    }
    const glow = new THREE.PointLight(0xff9a4d, 9, 9, 1.6); glow.position.set(o.x - 2.5, y + 1.2, o.z - 1.5); mood.add(glow);
    game.scene.add(mood);
    room.g.traverse((m) => { if (m.isPointLight) m.userData.base ??= m.intensity, m.intensity = m.userData.base * 0.35; });
    const her = makeCharacter({ hat: null, backpack: null, longHair: true, ...girl.look });
    her.position.set(o.x + 0.8, y, o.z + 0.4);
    game.scene.add(her);
    P.place(o.x - 0.6, o.z + 0.4, Math.PI / 2);
    const meS = makeCharacter({ hat: null, backpack: null });
    meS.position.set(o.x - 0.6, y, o.z + 0.4); meS.rotation.y = Math.PI / 2;
    game.scene.add(meS); P.model.visible = false;
    const look = new THREE.Vector3(o.x + 0.1, y + 1.55, o.z + 0.4);
    game.cine = { pos: new THREE.Vector3(o.x + 0.1, y + 1.9, o.z + 3.2), look };
    await hud.say(girl.name, girl.homeLines?.() || girl.home);
    const heart = await this.kiss(meS, her);
    await this.intimacy(her, 3, girl.name, girl.guide, girl.feet, [], null, { me: meS, stage: 'stand' });
    await hud.say(girl.name, girl.undress.slice(0, 2));
    // swap both to their underwear
    const meU = makeCharacter({ shirt: SKIN, pants: 0x1d3557, hat: null, backpack: null });
    const herU = makeCharacter({ hat: null, backpack: null, longHair: true, ...girl.look, shirt: girl.look.skin, pants: girl.under, top: girl.under });
    for (const [from, to] of [[meS, meU], [her, herU]]) { to.position.copy(from.position); to.rotation.copy(from.rotation); to.userData.body.rotation.x = 0.14; to.userData.setBarefoot(true); to.userData.barefoot = true; game.scene.add(to); from.visible = false; }
    await hud.say(girl.name, girl.undress.slice(2));
    await this.intimacy(herU, 2, girl.name, girl.guide, girl.feet, [], null, { me: meU, stage: 'stand' });
    // into bed, under the blanket
    const bed = { x: o.x - 3.9, z: o.z - 2.7 };
    // the blanket covers them from the chest down
    const LIE = -Math.PI / 2 + 0.35; // lying back, propped up on the pillows
    const blanket = new THREE.Group();
    blanket.position.set(bed.x, y + 0.8, bed.z + 1.0);
    blanket.rotation.x = LIE;
    const sheet = new THREE.Mesh(new THREE.BoxGeometry(1.62, 1.4, 0.44), new THREE.MeshStandardMaterial({ color: girl.under, roughness: 1 }));
    sheet.position.y = 0.66;
    sheet.castShadow = true;
    blanket.add(sheet);
    game.scene.add(blanket);
    for (const [c, dx] of [[meU, -0.33], [herU, 0.33]]) {
      c.userData.body.rotation.x = 0;
      c.rotation.set(LIE, 0, 0);
      c.position.set(bed.x + dx, y + 0.8, bed.z + 1.0);
    }
    heart.position.set(bed.x, y + 2.0, bed.z - 0.6);
    heart.scale.setScalar(0.4);
    // from the foot of the bed: two heads on the pillows, the rest under the blanket
    game.cine = { pos: new THREE.Vector3(bed.x + 1.9, y + 2.5, bed.z + 1.2), look: new THREE.Vector3(bed.x, y + 1.15, bed.z - 0.45) };
    await hud.say(girl.name, girl.bed);
    await this.intimacy(herU, 3, girl.name, girl.guide, girl.feet, [], ['Baciala', 'Accarezzale i capelli', 'Baciale il collo', 'Leccale il collo', "Mordicchiale l'orecchio", 'Stringila a te', "Sussurrale qualcosa all'orecchio", 'Lasciati guidare da lei…'], { me: meU, stage: 'bed' });
    await hud.say(girl.name, girl.end);
    hud.toast(`❤️ Tu e ${girl.name} siete una coppia`, 2600);
    // back on your feet
    for (const o2 of [meU, herU, blanket, heart, mood, meS]) game.scene.remove(o2);
    room.g.traverse((m) => { if (m.isPointLight && m.userData.base) m.intensity = m.userData.base; });
    game.scene.remove(her);
    P.model.visible = true;
    P.place(o.x - 2, o.z, 0);
    game.cine = null;
    if (this.st.quests[questId] === 2) this.advance(questId);
    game.busy = false;
  }

  onEnterHouse(house, room) {
    // the first night completes the quest; afterwards Marina is happy to see you again
    if (house === this.marinaHouse && this.st.adult && (this.st.quests.marina === 2 || this.st.quests.marina === 'done')) this.bedroomScene(room);
    else this.game.romance?.onEnterHouse(house, room);
  }

  update(dt) {
    this.t += dt;
    const game = this.game, P = game.player.pos, st = this.st;
    for (const n of this.npcs) {
      n.obj.visible = !n.obj.userData.out && !game.player.indoor && Math.abs(P.x - n.obj.position.x) < 260 && Math.abs(P.z - n.obj.position.z) < 260;
      if (!n.obj.visible) continue;
      n.obj.userData.animate(dt, 0);
      // a golden "!" over whoever has something for you
      const q = st.quests || {};
      n.mark.visible = (n.id === 'rosa' && (q.briciola == null || q.briciola === 1)) || (n.id === 'fornaio' && q.pane == null) || (n.id === 'fornaia' && q.pane === 0)
        || (n.id === 'ginepro' && (q.main1 === 2 || q.main1 === 4)) || ((n.id === 'eclissi1' || n.id === 'eclissi2') && q.main1 === 3 && !st.beaten[n.id])
        || ((n.id === 'eclissi3' || n.id === 'eclissi4') && q.main2 === 1 && !st.beaten[n.id]) || (n.id === 'notte' && q.main2 === 2)
        || (n.id === 'neve' && q.main3 === 0) || (n.id === 'granmaestro' && q.main3 === 2)
        || (n.id === 'marina' && st.adult && (q.marina == null || q.marina === 0));
    }
    const tr = this.tracked(), at = tr?.step.at?.();
    this.guide.visible = !!at && !game.player.indoor && Math.hypot(P.x - at.x, P.z - at.z) > 6;
    if (this.guide.visible) { this.guide.position.set(at.x, heightAt(at.x, at.z), at.z); this.guide.userData.animate(performance.now() / 1000); }
    if (this.pet.visible) this.pet.userData.animate(dt);
    if (this.legend.visible && Math.abs(P.x - this.legend.position.x) < 300 && Math.abs(P.z - this.legend.position.z) < 300) this.legend.userData.animate(dt);
    // "go there" steps complete on arrival
    for (const [id, s] of this.active()) {
      const step = this.Q[id].steps[s], at = step?.near && step.at();
      if (at && Math.hypot(P.x - at.x, P.z - at.z) < step.near) this.advance(id);
    }
    if (this.t > 0.5) {
      this.t = 0;
      this.check();
      // the beach date only happens at night
      if (st.quests?.marina === 1 && st.adult && !game.busy && !game.battle.active) {
        const h = game.sky.time;
        if ((h >= 20 || h < 5) && Math.hypot(P.x - this.beach.x, P.z - this.beach.z) < 6) this.beachScene();
      }
    }
  }
}
