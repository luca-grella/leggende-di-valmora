// The shady side of Valmora: fixers in Città Fulgida and Porto Corallo hand
// out jobs (timed deliveries, stall robberies, street races, back-alley
// battles with bets), guards chase the player while they are "wanted" and
// battle them when they catch up, scooters to steal and a paint blaster that
// leaves guards dizzy for a while. Everything stays cartoonish: no blood.

import * as THREE from 'three';
import { mulberry32 } from '../core/noise.js';
import { TOWNS, ROADS, roadPoint, heightAt } from './heightfield.js';
import { makeCharacter } from './character.js';
import { makeScooter } from './scooter.js';
import { bubble, beacon, checkpoint } from './markers.js';
import { SPECIES } from '../creatures/species.js';
import { createMonster } from '../creatures/monster.js';

const townById = (id) => TOWNS.find((t) => t.region.id === id);
const at = (t, ang, dist) => ({ x: t.x + Math.cos(ang) * dist, z: t.z + Math.sin(ang) * dist });
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

const FIXERS = [
  { town: 'fulgida', name: 'Er Faina', ang: Math.PI / 2 + 0.26, lines: ['Psst! Sì, dico a te. Cerchi lavoretti... discreti?', 'In questa città gira un sacco di grana. Basta sapere dove guardare.'] },
  { town: 'corallo', name: 'Zio Murena', ang: Math.PI / 2 - 0.26, lines: ['Ehi, ragazzo. Al porto arrivano casse che nessuno deve vedere.', 'Ho un lavoretto per te, se hai il fegato.'] },
];
const SCOOTER_SPOTS = [['fulgida', 0.52, 0x2f8fd8], ['corallo', 0.52, 0xe23b3b], ['aurora', 2.62, 0xf2c14e]];
const STALL_SPOTS = [['fulgida', [0.8, 2.35]], ['corallo', [0.8, 2.35]]];
const FIGHTERS = ['Tony Due Denti', 'La Vipera', 'Rocco il Muro', 'Gina Pugno Duro', 'Il Barone'];
const BLASTER_PRICE = 400;

function fixerModel() {
  const o = makeCharacter({ shirt: 0x2b2b2b, pants: 0x1a1a1a, hat: 0x4a3b30, hatBrim: 0x4a3b30, backpack: null, hair: 0x111111 });
  const glasses = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.08, 0.05), new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.2 }));
  glasses.position.set(0, 1.71, 0.24);
  o.userData.body.add(glasses);
  return o;
}

function guardModel() {
  return makeCharacter({ shirt: 0x1f3a7a, pants: 0x14213d, hat: 0x14213d, hatBrim: 0x0d0d0d, backpack: null, shoes: 0x0d0d0d });
}

function stallModel(color) {
  const g = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0x8a6240, roughness: 0.9, flatShading: true });
  const cloth = new THREE.MeshStandardMaterial({ color, roughness: 0.8 });
  const add = (geo, m, x, y, z) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; g.add(o); return o; };
  add(new THREE.BoxGeometry(3, 0.9, 1.2), wood, 0, 0.45, 0);
  for (const x of [-1.4, 1.4]) for (const z of [-0.55, 0.55]) add(new THREE.CylinderGeometry(0.05, 0.05, 2.4, 5), wood, x, 1.2, z);
  add(new THREE.BoxGeometry(3.4, 0.08, 1.8), cloth, 0, 2.45, 0.1).rotation.x = -0.18;
  const goods = [0xffd23f, 0xe85d75, 0x7ac74c, 0xff9f43, 0x6390f0];
  for (let i = 0; i < 7; i++) add(new THREE.SphereGeometry(0.16, 8, 6), new THREE.MeshStandardMaterial({ color: goods[i % 5], roughness: 0.5 }), -1.2 + i * 0.4, 1.05, 0.2 * (i % 2));
  add(new THREE.BoxGeometry(0.5, 0.35, 0.4), new THREE.MeshStandardMaterial({ color: 0x3d3d3d, metalness: 0.5, roughness: 0.4 }), 1.0, 1.08, -0.3); // the cash box
  return g;
}

export class Crime {
  constructor(game) {
    this.game = game;
    const scene = game.scene;
    this.scene = scene;
    this.wanted = 0;
    this.calm = 0;
    this.grace = 0;
    this.fireT = 0;
    this.mission = null;
    this.markers = [];
    this.shots = [];
    this.t = 0;

    this.fixers = FIXERS.map((f) => {
      const t = townById(f.town);
      const p = at(t, f.ang, t.region.town.big ? 38 : 37);
      const obj = fixerModel();
      obj.position.set(p.x, heightAt(p.x, p.z), p.z);
      obj.rotation.y = Math.atan2(t.x - p.x, t.z - p.z);
      scene.add(obj);
      return { ...f, t, obj, x: p.x, z: p.z };
    });

    this.scooters = SCOOTER_SPOTS.map(([id, ang, color]) => {
      const t = townById(id);
      const p = at(t, ang, 17);
      const model = makeScooter(color);
      model.position.set(p.x, heightAt(p.x, p.z), p.z);
      model.rotation.y = ang;
      scene.add(model);
      return { model, town: t };
    });

    this.stalls = [];
    for (const [id, angs] of STALL_SPOTS) {
      const t = townById(id);
      angs.forEach((ang, i) => {
        const p = at(t, ang, 16.5);
        const g = stallModel([0xe85d75, 0x2f8fd8][i]);
        g.position.set(p.x, t.h, p.z);
        g.rotation.y = -ang - Math.PI / 2; // counter faces the well
        scene.add(g);
        game.towns.colliders.push({ x: p.x, z: p.z, rot: g.rotation.y, hx: 1.6, hz: 0.7 });
        const seller = makeCharacter({ shirt: 0xffffff, pants: 0x5d4037, hat: null, backpack: null, hair: 0x5b3a1e });
        const sp = at(t, ang, 18);
        seller.position.set(sp.x, t.h, sp.z);
        seller.rotation.y = Math.atan2(t.x - sp.x, t.z - sp.z);
        scene.add(seller);
        const front = at(t, ang, 14.8);
        this.stalls.push({ town: t, x: front.x, z: front.z, model: g, seller, robbedT: -1e9 });
      });
    }

    // two guards patrol every town square
    this.guards = [];
    const rnd = mulberry32(777);
    for (const t of TOWNS) for (let i = 0; i < 2; i++) this.addGuard(t, at(t, rnd() * Math.PI * 2, 8 + rnd() * 10), false);
  }

  addGuard(town, p, extra) {
    const obj = guardModel();
    obj.position.set(p.x, heightAt(p.x, p.z), p.z);
    const b = bubble('!', '#2f5fd8');
    b.visible = false;
    obj.add(b);
    const dizzy = bubble('★', '#ffd23f', '#7a4b00');
    dizzy.visible = false;
    dizzy.scale.setScalar(0.55);
    dizzy.position.y = 2.1;
    obj.add(dizzy);
    this.scene.add(obj);
    const g = { obj, town, home: { x: p.x, z: p.z }, target: { x: p.x, z: p.z }, wait: Math.random() * 3, state: 'patrol', stun: 0, bubble: b, dizzy, extra };
    this.guards.push(g);
    return g;
  }

  removeGuard(g) {
    this.scene.remove(g.obj);
    this.guards.splice(this.guards.indexOf(g), 1);
  }

  get money() { return this.game.state.money; }

  // ---------- wanted level ----------
  addWanted(n, reason) {
    const before = this.wanted;
    this.wanted = Math.min(3, this.wanted + n);
    this.calm = 0;
    if (this.wanted > before) {
      this.game.hud.toast(`${reason} ${'★'.repeat(this.wanted)}`, 2600);
      // reinforcements arrive from behind when the stars go up
      const P = this.game.player.pos;
      const town = TOWNS.find((t) => dist(t, P) < t.radius + 120);
      for (let i = before; i < this.wanted; i++) {
        if (i === 0 || !town) continue;
        const a = this.game.player.facing + Math.PI + (Math.random() - 0.5);
        const g = this.addGuard(town, { x: P.x + Math.sin(a) * 30, z: P.z + Math.cos(a) * 30 }, true);
        g.state = 'chase';
      }
    }
    this.game.hud.setWanted(this.wanted);
  }

  guardsNear(P, r) {
    return this.guards.some((g) => g.stun <= 0 && dist(g.obj.position, P) < r);
  }

  // ---------- jobs ----------
  async talkFixer(f) {
    const game = this.game, st = game.state;
    game.busy = true;
    f.obj.lookAt(game.player.pos.x, f.obj.position.y, game.player.pos.z);
    if (this.mission) {
      const i = await game.hud.choose(`${f.name}: "Hai già un lavoro in corso."`, [{ icon: '👍', label: 'Ci sto lavorando' }, { icon: '✋', label: 'Lascio perdere il lavoro', sub: 'Il lavoro fallisce, niente paga.' }]);
      if (i === 1) this.endMission(false, 'Hai mollato il lavoro.');
      game.busy = false;
      return;
    }
    await game.hud.say(f.name, [f.lines[Math.floor(Math.random() * f.lines.length)]]);
    const dest = this.deliveryTarget(f.t);
    const opts = [
      { icon: '📦', label: 'Consegna a tempo', sub: `Porta un pacco "speciale" a ${dest.region.town.name} entro il tempo. Paga 💰 ${this.deliveryPay(f.t, dest)}.`, act: () => this.startDelivery(f, dest) },
      { icon: '💰', label: 'Colpo alla bancarella', sub: 'Arraffa l\'incasso del mercato e semina le guardie. Paga 💰 600.', act: () => this.startTheft(f) },
      { icon: '🏁', label: 'Corsa clandestina', sub: 'Passa nei cerchi per le strade prima che scada il tempo. Paga 💰 500.', act: () => this.startRace(f) },
      { icon: '🥊', label: 'Lotta clandestina', sub: 'Scommetti sulla tua squadra in una lotta nel vicolo.', act: () => this.startFight(f) },
    ];
    if (!st.blaster) opts.push({ icon: '🎯', label: `Spara-vernice · 💰 ${BLASTER_PRICE}`, sub: 'Spara palle di vernice: le guardie colpite restano stordite per un po\'.', act: () => this.buyBlaster(f) });
    opts.push({ icon: '🚶', label: 'Niente, grazie' });
    const i = await game.hud.choose(f.name, opts);
    if (opts[i]?.act) await opts[i].act();
    game.busy = false;
  }

  async buyBlaster(f) {
    const st = this.game.state;
    if (st.money < BLASTER_PRICE) { await this.game.hud.say(f.name, [`Costa 💰 ${BLASTER_PRICE}. Torna quando hai i soldi.`]); return; }
    st.money -= BLASTER_PRICE;
    st.blaster = true;
    this.game.save();
    this.game.hud.setMoney(st.money);
    this.game.hud.showFire(true);
    await this.game.hud.say(f.name, ['Ecco qua, uno Spara-vernice nuovo di zecca.', 'Premi 🎯 (o F) per sparare: le guardie colpite restano stordite e coperte di vernice.', 'Ma occhio: sparare a una guardia ti rende ricercato!']);
  }

  deliveryTarget(from) {
    const near = ROADS.filter((r) => r.a === from || r.b === from).map((r) => (r.a === from ? r.b : r.a));
    return near[Math.floor(Math.random() * near.length)];
  }

  deliveryPay(from, to) { return 500 + Math.round(dist(from, to) / 10); }

  startDelivery(f, dest) {
    const drop = at(dest, Math.random() * Math.PI * 2, dest.region.town.big ? 38 : 36);
    const contact = fixerModel();
    contact.position.set(drop.x, heightAt(drop.x, drop.z), drop.z);
    contact.rotation.y = Math.atan2(dest.x - drop.x, dest.z - drop.z);
    this.scene.add(contact);
    const time = Math.round((dist(f, drop) * 1.15) / 11 + 45);
    this.mission = {
      kind: 'delivery', title: '📦 Consegna', goal: `Porta il pacco a ${dest.region.town.name}`, from: f,
      target: drop, time, pay: this.deliveryPay(f.t, dest), contact,
    };
    this.addMarker(beacon(0xffd23f), drop);
    this.carry(true);
    return this.game.hud.say(f.name, [`Porta questo pacco al mio socio a ${dest.region.town.name}. Non aprirlo e non fare domande.`, `Hai ${mmss(time)}. Uno scooter ti farebbe comodo... ce n'è uno in piazza. 😏`]);
  }

  startTheft(f) {
    const stalls = this.stalls.filter((s) => s.town === f.t);
    const s = stalls[Math.floor(Math.random() * stalls.length)];
    this.mission = { kind: 'theft', title: '💰 Colpo', goal: 'Arraffa l\'incasso della bancarella', from: f, target: s, stall: s, pay: 600, grabbed: false };
    this.addMarker(beacon(0xff5d5d), s);
    return this.game.hud.say(f.name, ['Vedi quella bancarella in piazza? Il venditore tiene l\'incasso in una cassetta.', 'Prendila e sparisci. Le guardie ti staranno addosso: seminale e la grana è tua.']);
  }

  startRace(f) {
    const road = ROADS.find((r) => r.a === f.t || r.b === f.t);
    const rev = road.b === f.t;
    const pts = [];
    for (let i = 0; i < 8; i++) {
      const u = 0.045 + i * 0.04;
      const p = roadPoint(road, rev ? 1 - u : u);
      pts.push({ x: p.x, z: p.z, dx: p.dx, dz: p.dz });
    }
    let len = dist(f, pts[0]);
    for (let i = 1; i < pts.length; i++) len += dist(pts[i - 1], pts[i]);
    this.mission = { kind: 'race', title: '🏁 Corsa', goal: 'Passa in tutti i cerchi', from: f, pts, idx: 0, time: Math.round(len / 13 + 15), countdown: 3.5, pay: 500 };
    this.raceMarkers();
    return this.game.hud.say(f.name, [`Corsa clandestina: ${pts.length} cerchi lungo la strada, ${mmss(this.mission.time)} di tempo.`, 'A piedi non ce la fai: prendi uno scooter. Pronti...']);
  }

  raceMarkers() {
    this.clearMarkers();
    const m = this.mission;
    m.pts.slice(m.idx, m.idx + 2).forEach((p, i) => {
      const c = checkpoint(i === 0 ? 0x3ad1ff : 0x9aa7b0);
      c.rotation.y = Math.atan2(p.dx, p.dz);
      if (i) c.scale.setScalar(0.6);
      this.addMarker(c, p);
    });
    m.target = m.pts[m.idx];
  }

  async startFight(f) {
    const game = this.game, st = game.state;
    if (!st.party.some((m) => m.hp > 0)) { await game.hud.say(f.name, ['Con una squadra a pezzi? Passa prima dal Centro Cura.']); return; }
    const bets = [100, 300, 1000].filter((b) => b <= st.money);
    if (!bets.length) { await game.hud.say(f.name, ['Qui si scommette almeno 💰 100. Torna quando hai i soldi.']); return; }
    const i = await game.hud.choose('Quanto scommetti?', [...bets.map((b) => ({ icon: '💰', label: `${b} monete`, sub: `Se vinci ne ricevi ${b * 2}.` })), { icon: '✋', label: 'Ci ho ripensato' }]);
    if (i < 0 || i >= bets.length) return;
    const bet = bets[i];
    const top = Math.max(...st.party.map((m) => m.level));
    const ids = Object.keys(SPECIES).filter((id) => !SPECIES[id].evo);
    const rnd = Math.random;
    const size = bet >= 1000 ? 3 : 2;
    const team = Array.from({ length: size }, () => createMonster(ids[Math.floor(rnd() * ids.length)], Math.max(5, top + (bet >= 1000 ? 3 : bet >= 300 ? 1 : -1) + Math.floor(rnd() * 3))));
    const name = FIGHTERS[Math.floor(rnd() * FIGHTERS.length)];
    st.money -= bet;
    game.hud.setMoney(st.money);
    await game.hud.say(f.name, [`Si scommettono 💰 ${bet}. Contro di te c'è ${name}. Niente regole, chi vince prende tutto!`]);
    const outcome = await game.battle.start(null, { trainer: { name, team, reward: bet * 2, fine: 0, obj: f.obj } });
    this.returnFixer(f);
    game.busy = true;
    if (outcome === 'win') { st.crimes = (st.crimes || 0) + 1; await game.hud.say(f.name, ['Hai fatto il botto! Torna quando vuoi.']); }
    else if (outcome === 'lose') game.hud.toast(`Hai perso la scommessa (💰 ${bet}).`, 2600);
    game.hud.setMoney(st.money);
    game.save();
  }

  returnFixer(f) {
    f.obj.position.set(f.x, heightAt(f.x, f.z), f.z);
    f.obj.rotation.y = Math.atan2(f.t.x - f.x, f.t.z - f.z);
  }

  async robStall(s) {
    const game = this.game, st = game.state;
    s.robbedT = this.t;
    const m = this.mission;
    const big = m?.kind === 'theft' && m.stall === s;
    const loot = big ? 0 : 60 + Math.floor(Math.random() * 120);
    s.seller.lookAt(game.player.pos.x, s.seller.position.y, game.player.pos.z);
    if (big) {
      m.grabbed = true;
      m.goal = 'Semina le guardie!';
      this.clearMarkers();
      this.carry(true);
    } else {
      st.money += loot;
      game.hud.setMoney(st.money);
    }
    game.hud.toast(big ? 'Hai arraffato la cassetta!' : `Hai arraffato 💰 ${loot}!`, 1800);
    await game.hud.say('Venditore', ['Al ladro! Al ladro! GUARDIE!']);
    this.addWanted(2, 'Furto al mercato!');
  }

  carry(on) {
    const body = this.game.player.model.userData.body;
    if (on && !this.parcel) {
      this.parcel = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.42, 0.34), new THREE.MeshStandardMaterial({ color: 0xa47148, roughness: 0.9 }));
      this.parcel.position.set(0, 1.2, -0.38);
      this.parcel.castShadow = true;
      body.add(this.parcel);
    } else if (!on && this.parcel) { body.remove(this.parcel); this.parcel = null; }
  }

  addMarker(obj, p) {
    obj.position.set(p.x, heightAt(p.x, p.z), p.z);
    this.scene.add(obj);
    this.markers.push(obj);
  }

  clearMarkers() {
    for (const o of this.markers) this.scene.remove(o);
    this.markers = [];
  }

  endMission(ok, text) {
    const m = this.mission;
    if (!m) return;
    const game = this.game, st = game.state;
    this.clearMarkers();
    this.carry(false);
    if (m.contact) this.scene.remove(m.contact);
    this.mission = null;
    game.hud.mission(null);
    if (ok) {
      st.money += m.pay;
      st.crimes = (st.crimes || 0) + 1;
      game.hud.setMoney(st.money);
      game.hud.banner(`+ 💰 ${m.pay}`, 'Lavoro fatto!');
      game.save();
    } else game.hud.banner(text || 'Il lavoro è andato male', 'Lavoro fallito');
  }

  // ---------- guards ----------
  async caught(g) {
    const game = this.game, st = game.state;
    game.busy = true;
    game.player.stopVehicle();
    g.state = 'battle';
    g.bubble.visible = false;
    g.obj.lookAt(game.player.pos.x, g.obj.position.y, game.player.pos.z);
    game.player.faceTo(g.obj.position.x, g.obj.position.z);
    await game.hud.say('Guardia', [['Alt! Guardia cittadina! Fermo dove sei!', 'Ti ho preso, furfante!', 'Fine della corsa, amico!'][Math.floor(Math.random() * 3)]]);
    const top = Math.max(...st.party.map((m) => m.level));
    const ids = ['voltino', 'fiammello', 'roccione', 'pipistro', 'scoiattolo', 'sabbiolo'];
    const team = Array.from({ length: Math.min(this.wanted, 2) }, (_, i) => {
      const level = Math.max(g.town.region.levels[0], top - 2 + this.wanted);
      let id = ids[(i + Math.floor(Math.random() * ids.length)) % ids.length];
      if (SPECIES[id].evo && level >= SPECIES[id].evo.level) id = SPECIES[id].evo.to;
      return createMonster(id, level);
    });
    const outcome = await game.battle.start(null, { trainer: { name: 'La Guardia', team, reward: 0, fine: Math.round(st.money * 0.25), obj: g.obj } });
    game.busy = true;
    if (outcome === 'win') {
      g.stun = 20; g.state = 'stunned';
      this.wanted = Math.max(0, this.wanted - 1);
      this.calm = 0;
      this.grace = 4;
      game.hud.setWanted(this.wanted);
      await game.hud.say('Guardia', ['Ahia, ahia... mi arrendo! Vado a chiamare rinforzi... prima o poi.']);
    } else {
      // defeated: fined (inside the battle) and brought to the Centro Cura by afterBattle
      this.wanted = 0;
      game.hud.setWanted(0);
      if (this.mission?.kind === 'theft' || this.mission?.kind === 'delivery') this.endMission(false, 'Le guardie ti hanno sequestrato la refurtiva');
      for (const x of this.guards) if (x.state === 'chase') x.state = 'return';
      g.state = 'return';
    }
    game.hud.setMoney(st.money);
    game.busy = false;
  }

  fire() {
    const game = this.game, P = game.player.pos;
    if (!game.state.blaster || this.fireT > 0) return;
    this.fireT = 0.45;
    const fx = Math.sin(game.player.facing), fz = Math.cos(game.player.facing);
    // aim assist: the closest guard in front, within 24 m
    let best = null, bd = 24;
    for (const g of this.guards) {
      if (g.stun > 0 || !g.obj.visible) continue;
      const dx = g.obj.position.x - P.x, dz = g.obj.position.z - P.z, d = Math.hypot(dx, dz);
      if (d < bd && (dx * fx + dz * fz) / d > 0.55) { best = g; bd = d; }
    }
    const colors = [0xff3d9a, 0x3ad1ff, 0x7cfc4a, 0xffd23f];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.4 }));
    const from = new THREE.Vector3(P.x + fx * 0.6, P.y + 1.3, P.z + fz * 0.6);
    const to = best ? best.obj.position.clone().setY(best.obj.position.y + 1.1) : from.clone().add(new THREE.Vector3(fx * 22, -0.6, fz * 22));
    ball.position.copy(from);
    this.scene.add(ball);
    this.shots.push({ ball, from, to, t: 0, dur: Math.max(0.12, from.distanceTo(to) / 45), target: best, color });
  }

  splat(g, color) {
    g.stun = 12; g.state = 'stunned';
    g.bubble.visible = false;
    const body = g.obj.userData.body;
    const paint = new THREE.MeshStandardMaterial({ color, roughness: 0.3 });
    for (let i = 0; i < 4; i++) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.1 + Math.random() * 0.08, 8, 6), paint);
      s.position.set((Math.random() - 0.5) * 0.4, 1.0 + Math.random() * 0.8, 0.22);
      s.scale.z = 0.4;
      s.userData.paint = true;
      body.add(s);
    }
    if (!this.wanted) this.addWanted(1, 'Hai impiastricciato una guardia!');
    else this.game.hud.toast('Colpita! La guardia è stordita.', 1400);
  }

  // hit by a thrown object: dizzy for a while, no paint
  bonk(g) {
    g.stun = 8; g.state = 'stunned';
    g.bubble.visible = false;
    if (!this.wanted) this.addWanted(1, 'Hai colpito una guardia!');
    else this.game.hud.toast('Bersaglio colpito!', 1200);
  }

  unsplat(g) {
    const body = g.obj.userData.body;
    for (const c of [...body.children]) if (c.userData.paint) body.remove(c);
  }

  nearest(pos) {
    let best = null;
    const consider = (o) => { if (o.d < (best?.d ?? Infinity)) best = o; };
    for (const f of this.fixers) { const d = dist(pos, f.obj.position); if (d < 2.6) consider({ kind: 'fixer', fixer: f, d, hint: `A · Parla con ${f.name}` }); }
    if (!this.game.player.vehicle) for (const s of this.scooters) { const d = dist(pos, s.model.position); if (d < 2.2) consider({ kind: 'scooter', scooter: s, d, hint: 'A · Sali sullo scooter' }); }
    for (const s of this.stalls) {
      const d = dist(pos, s);
      const target = this.mission?.kind === 'theft' && this.mission.stall === s && !this.mission.grabbed;
      if (d < 2.6 && (target || this.t - s.robbedT > 120)) consider({ kind: 'stall', stall: s, d, hint: 'A · Arraffa l\'incasso (illegale!)' });
    }
    return best;
  }

  async interact(it) {
    const game = this.game;
    if (it.kind === 'fixer') return this.talkFixer(it.fixer);
    if (it.kind === 'stall') return this.robStall(it.stall);
    if (it.kind === 'scooter') {
      game.player.mount(it.scooter);
      if (this.guardsNear(game.player.pos, 22)) this.addWanted(1, 'Furto di scooter!');
      else game.hud.toast('Brum brum! A per scendere.', 1600);
    }
  }

  // ---------- per frame ----------
  update(dt) {
    const game = this.game, P = game.player.pos;
    this.t += dt;
    this.fireT -= dt;
    this.grace -= dt;
    const paused = game.battle.active;
    for (const o of this.markers) o.userData.animate?.(this.t);

    // paint balls in flight
    for (const s of [...this.shots]) {
      s.t += dt / s.dur;
      s.ball.position.lerpVectors(s.from, s.to, Math.min(s.t, 1));
      s.ball.position.y += Math.sin(Math.min(s.t, 1) * Math.PI) * 0.4;
      if (s.t >= 1) {
        this.scene.remove(s.ball);
        this.shots.splice(this.shots.indexOf(s), 1);
        if (s.target && s.target.stun <= 0) this.splat(s.target, s.color);
      }
    }

    // guards
    const chaseSpeed = 5.6 + this.wanted * 0.7;
    let chasing = false;
    for (const g of [...this.guards]) {
      const o = g.obj;
      const dx = P.x - o.position.x, dz = P.z - o.position.z, d = Math.hypot(dx, dz);
      o.visible = d < 240;
      if (g.extra && !this.wanted && d > 35) { this.removeGuard(g); continue; }
      if (paused || g.state === 'battle') { o.userData.animate(dt, 0); continue; }
      if (g.stun > 0) {
        g.stun -= dt;
        g.obj.userData.sitting = true;
        o.userData.animate(dt, 0);
        o.position.y = heightAt(o.position.x, o.position.z) - 0.35;
        g.dizzy.visible = true;
        g.dizzy.position.set(Math.sin(this.t * 6) * 0.35, 2.0, Math.cos(this.t * 6) * 0.35);
        if (g.stun <= 0) { g.obj.userData.sitting = false; g.dizzy.visible = false; this.unsplat(g); g.state = 'return'; }
        continue;
      }
      const inTown = g.extra || dist(P, g.town) < g.town.radius + 110;
      if (this.wanted && inTown && d < 80) g.state = 'chase';
      let tx, tz, sp;
      if (g.state === 'chase') {
        if (!this.wanted || !inTown) { g.state = 'return'; g.bubble.visible = false; continue; }
        g.bubble.visible = true;
        // hiding inside a house: the guards lose sight of the player
        if (game.player.indoor) { o.userData.animate(dt, 0); continue; }
        if (d < 35) chasing = true;
        if (this.grace > 0) { o.userData.animate(dt, 0); continue; }
        tx = P.x; tz = P.z; sp = chaseSpeed;
        if (d < 1.6 && !game.busy && !game.hud.modal) { this.caught(g); continue; }
      } else if (g.state === 'return') {
        g.bubble.visible = false;
        tx = g.home.x; tz = g.home.z; sp = 2.2;
        if (dist(o.position, g.home) < 0.5) g.state = 'patrol';
      } else {
        if (!o.visible) continue;
        if (dist(o.position, g.target) < 0.4) {
          g.wait -= dt;
          o.userData.animate(dt, 0);
          if (g.wait < 0) { g.target = { x: g.home.x + (Math.random() - 0.5) * 18, z: g.home.z + (Math.random() - 0.5) * 18 }; g.wait = 2 + Math.random() * 4; }
          continue;
        }
        tx = g.target.x; tz = g.target.z; sp = 1.4;
      }
      const ex = tx - o.position.x, ez = tz - o.position.z, ed = Math.hypot(ex, ez);
      if (ed > 0.05) {
        const step = Math.min(sp * dt, ed);
        o.position.x += (ex / ed) * step; o.position.z += (ez / ed) * step;
        game.towns.collide(o.position, 0.4);
        o.rotation.y = Math.atan2(ex, ez);
      }
      o.position.y = heightAt(o.position.x, o.position.z);
      o.userData.animate(dt, sp);
    }

    // the stars fade once no guard is close for a while (faster far from towns)
    if (this.wanted && !paused) {
      const far = !TOWNS.some((t) => dist(t, P) < t.radius + 150);
      this.calm += chasing ? -this.calm : dt * (far ? 2.5 : 1);
      if (this.calm > 7 + this.wanted * 3) {
        this.calm = 0;
        this.wanted -= 1;
        game.hud.setWanted(this.wanted);
        game.hud.toast(this.wanted ? `Le guardie perdono le tue tracce... ${'★'.repeat(this.wanted)}` : 'Le guardie hanno perso le tue tracce!', 2200);
      }
      game.hud.setWanted(this.wanted, this.calm > 3);
    }

    this.updateMission(dt);
  }

  updateMission(dt) {
    const m = this.mission, game = this.game, P = game.player.pos;
    if (!m) return;
    if (game.battle.active) return;
    let timer = null;
    if (m.kind === 'delivery') {
      m.time -= dt;
      timer = m.time;
      if (m.contact) m.contact.lookAt(P.x, m.contact.position.y, P.z);
      if (dist(P, m.target) < 4) {
        this.endMission(true);
        game.hud.say('Socio', ['Puntuale come un orologio. Ecco la tua parte.']);
        return;
      }
      if (m.time <= 0) return this.endMission(false, 'Sei arrivato tardi: il socio se n\'è andato');
    } else if (m.kind === 'theft') {
      if (m.grabbed && !this.wanted) return this.endMission(true);
    } else if (m.kind === 'race') {
      if (m.countdown > 0) {
        const before = Math.ceil(m.countdown);
        m.countdown -= dt;
        const now = Math.ceil(m.countdown);
        if (now !== before && !game.busy) game.hud.toast(now > 0 ? `${now}...` : 'VIA!', 900);
        timer = m.time;
      } else {
        m.time -= dt;
        timer = m.time;
        if (dist(P, m.pts[m.idx]) < 6) {
          m.idx += 1;
          if (m.idx >= m.pts.length) return this.endMission(true);
          game.hud.toast(`Cerchio ${m.idx}/${m.pts.length}`, 900);
          this.raceMarkers();
        }
        if (m.time <= 0) return this.endMission(false, 'Tempo scaduto');
      }
      m.goal = `Cerchi: ${m.idx}/${m.pts.length}`;
    }
    const tg = m.target;
    game.hud.mission({ title: m.title, goal: m.goal, timer: timer == null ? '' : mmss(Math.max(0, timer)), urgent: timer != null && timer < 20, dist: tg && (m.kind !== 'theft' || !m.grabbed) ? Math.round(dist(P, tg)) : null });
  }

  // for the minimap: where to go and who is chasing
  mapMarks() {
    const out = [];
    const m = this.mission;
    if (m?.target && !(m.kind === 'theft' && m.grabbed)) out.push({ x: m.target.x, z: m.target.z, color: '#ffd23f', edge: true });
    for (const f of this.fixers) out.push({ x: f.x, z: f.z, color: '#9b59ff', small: true });
    if (this.wanted) for (const g of this.guards) if (g.state === 'chase') out.push({ x: g.obj.position.x, z: g.obj.position.z, color: '#2f5fd8', small: true });
    return out;
  }
}
