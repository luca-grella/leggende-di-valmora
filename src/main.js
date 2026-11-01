// Leggende di Valmora 3D — entry point: renderer, game loop, saving,
// encounters and the glue between world, player, battles and HUD.

import * as THREE from 'three';
import { QUALITY, IS_MOBILE } from './core/quality.js';
import { Input } from './core/input.js';
import { SkySystem } from './world/sky.js';
import { Water } from './world/water.js';
import { ChunkManager } from './world/terrain.js';
import { Towns } from './world/towns.js';
import { Trainers } from './world/trainers.js';
import { Crime } from './world/crime.js';
import { TOWNS } from './world/heightfield.js';
import { regionAt } from './world/regions.js';
import { windUniforms } from './world/vegetation.js';
import { Player } from './player.js';
import { Hud } from './ui/hud.js';
import { Battle } from './battle/battle.js';
import { SPECIES, STARTERS } from './creatures/species.js';
import { createMonster, heal, nameOf } from './creatures/monster.js';

const SAVE_KEY = 'valmora3d-save-v1';
const $ = (id) => document.getElementById(id);
// yield to the browser without setTimeout's 4 ms clamp and background throttling
const yieldNow = () => new Promise((r) => { const c = new MessageChannel(); c.port1.onmessage = r; c.port2.postMessage(0); });

class Game {
  constructor() {
    const canvas = $('game');
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(QUALITY.pixelRatio);
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.9;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(IS_MOBILE ? 62 : 55, innerWidth / innerHeight, 0.1, 9500);

    this.sky = new SkySystem(this.scene, QUALITY);
    this.water = new Water(this.scene, QUALITY.viewDistance + 200);
    this.chunks = new ChunkManager(this.scene, QUALITY);
    this.towns = new Towns(this.scene);
    this.player = new Player(this.scene, this.camera);
    this.player.towns = this.towns;
    this.hud = new Hud();
    this.battle = new Battle(this);
    this.trainers = new Trainers(this.scene);
    this.crime = new Crime(this);
    this.input = new Input(canvas, {
      joyBase: $('joy-base'), joyKnob: $('joy-knob'), btnA: $('btn-a'), btnMenu: $('btn-menu'),
      btnMap: $('btn-map'), btnJump: $('btn-jump'), btnRun: $('btn-run'), btnFire: $('btn-fire'),
    });

    this.state = this.load();
    this.region = null;
    this.grassMeters = 0;
    this.cooldown = 2;
    this.busy = false;
    this.saveT = 0;
    this.mapT = 0;
    this.timer = new THREE.Timer();

    addEventListener('resize', () => this.resize());
    window.valmora = this; // handy for debugging from the console
  }

  newState() {
    const start = TOWNS.find((t) => t.region.start);
    return { v: 1, pos: { x: start.x + 2, z: start.z + 14, facing: Math.PI }, time: 9.5, party: [], box: [], balls: 0, seen: {}, caught: {}, cura: start.region.id, started: false, money: 300, beaten: {}, blaster: false, crimes: 0 };
  }

  load() {
    try {
      const s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
      // saves from before money and trainers get the new fields
      if (s && s.v === 1) return { money: 300, beaten: {}, blaster: false, crimes: 0, ...s };
    } catch { /* private mode or corrupted save: start fresh */ }
    return this.newState();
  }

  save() {
    this.state.pos = { x: this.player.pos.x, z: this.player.pos.z, facing: this.player.facing };
    this.state.time = this.sky.time;
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.state)); } catch { /* storage unavailable */ }
  }

  resize() {
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(innerWidth, innerHeight);
  }

  async boot() {
    const bar = $('load-bar'), txt = $('load-text');
    const setP = (p, t) => { bar.style.width = `${Math.round(p * 100)}%`; if (t) txt.textContent = t; };
    setP(0.02, 'Disegno la mappa di Valmora…');
    await this.hud.buildMap((p) => setP(0.05 + p * 0.45));
    setP(0.5, 'Faccio crescere boschi e prati…');
    this.player.place(this.state.pos.x, this.state.pos.z, this.state.pos.facing);
    this.sky.time = this.state.time ?? 9.5;
    let left = 1, first = null;
    while (left > 0) {
      left = this.chunks.update(this.player.pos.x, this.player.pos.z, 40);
      first ??= Math.max(left, 1);
      setP(0.5 + 0.48 * (1 - left / first));
      await yieldNow();
    }
    this.player.place(this.state.pos.x, this.state.pos.z, this.state.pos.facing);
    setP(1, 'Pronto!');
    this.sky.update(0, this.player.pos);
    this.renderer.compile(this.scene, this.camera);
    $('loading').style.opacity = 0;
    setTimeout(() => ($('loading').hidden = true), 600);
    this.hudVisible(true);
    this.hud.teamStrip(this.state.party);
    this.hud.setMoney(this.state.money);
    this.hud.showFire(this.state.blaster);
    this.renderer.setAnimationLoop((ts) => this.frame(ts));
    if (!this.state.started) this.intro();
    else this.hud.toast('Bentornato a Valmora!');
  }

  hudVisible(v) {
    $('hud').hidden = !v;
    if (matchMedia('(pointer: coarse)').matches) $('touch').hidden = !v;
  }

  // ---------- story beats ----------
  async intro() {
    this.busy = true;
    await this.hud.say('Prof.ssa Quercia', [
      'Ciao! Benvenuto a Borgo Alba, nella Valle Aurora.',
      'Io sono la Professoressa Quercia e studio i Velmon, le creature che abitano Valmora.',
      'Valmora è enorme: nove regioni, dai Picchi Gelidi alle Isole Solari. Nessuno l\'ha mai esplorata tutta.',
      'Ma non puoi avventurarti nell\'erba alta da solo. Scegli il tuo primo compagno!',
    ]);
    await this.pickStarter();
    this.busy = false;
  }

  async pickStarter() {
    let idx = -1;
    while (idx < 0) {
      idx = await this.hud.choose('Scegli il tuo primo Velmon', STARTERS.map((id) => {
        const s = SPECIES[id];
        return { icon: { Erba: '🌱', Fuoco: '🔥', Acqua: '💧' }[s.types[0]], label: `${s.name} · tipo ${s.types[0]}`, sub: s.desc };
      }));
    }
    const id = STARTERS[idx];
    const mon = createMonster(id, 5);
    this.state.party.push(mon);
    this.state.caught[id] = true; this.state.seen[id] = true;
    this.state.balls = 8;
    this.state.started = true;
    this.save();
    this.hud.teamStrip(this.state.party);
    await this.hud.say('Prof.ssa Quercia', [
      `Ottima scelta! ${SPECIES[id].name} sarà un compagno fedele.`,
      'Prendi anche queste 8 Sfere: indebolisci un Velmon selvatico e lanciane una per catturarlo.',
      'Le strade collegano tutti i paesi. Se la squadra è stanca, cerca la croce rossa del Centro Cura.',
      'Ah, e occhio al buio: di notte escono Velmon che di giorno non vedrai mai. Buon viaggio!',
    ]);
    this.hud.banner('Inizia l\'avventura', 'Valle Aurora');
  }

  addCaught(mon) {
    this.state.caught[mon.species] = true;
    if (this.state.party.length < 6) this.state.party.push(mon);
    else { this.state.box.push(mon); this.hud.toast(`${nameOf(mon)} è stato mandato nel Box.`); }
    this.save();
  }

  pickWild() {
    const r = regionAt(this.player.pos.x, this.player.pos.z);
    const night = this.sky.isNight;
    const entries = Object.entries(r.spawns).map(([id, w]) => [id, w * (night && SPECIES[id].types.includes('Spettro') ? 3 : 1) * (!night && SPECIES[id].types.includes('Spettro') ? 0.4 : 1)]);
    let x = Math.random() * entries.reduce((s, [, w]) => s + w, 0);
    let id = entries[0][0];
    for (const [k, w] of entries) { x -= w; if (x <= 0) { id = k; break; } }
    const [lo, hi] = r.levels;
    const level = lo + Math.floor(Math.random() * (hi - lo + 1));
    // past their evolution level, wild Velmon are sometimes already evolved
    const evo = SPECIES[id].evo;
    if (evo && level >= evo.level && Math.random() < 0.4) id = evo.to;
    return createMonster(id, level);
  }

  async afterBattle(outcome) {
    this.hud.setMoney(this.state.money);
    this.cooldown = 4;
    this.grassMeters = 0;
    if (outcome === 'lose') {
      const t = TOWNS.find((x) => x.region.id === this.state.cura) || TOWNS[4];
      this.state.party.forEach(heal);
      this.player.place(t.x + 2, t.z - 14, 0);
      this.busy = true;
      await this.hud.say('Infermiera', ['La tua squadra è stata curata. Fai attenzione là fuori!']);
      this.busy = false;
    }
    this.hud.teamStrip(this.state.party);
    this.save();
  }

  async interact(it) {
    if (it.kind === 'trainer') return this.trainers.talk(it.tr, this);
    if (['fixer', 'scooter', 'stall'].includes(it.kind)) return this.crime.interact(it);
    if (it.kind === 'dismount') { this.player.dismount(); return; }
    this.busy = true;
    if (it.kind === 'cura') {
      this.state.cura = it.town.region.id;
      await this.hud.say('Infermiera', ['Benvenuto al Centro Cura! Curo subito i tuoi Velmon.']);
      this.state.party.forEach(heal);
      const add = Math.max(0, 8 - this.state.balls);
      this.state.balls += add;
      this.hud.teamStrip(this.state.party);
      await this.hud.say('Infermiera', [add ? `Ecco fatto! Ti ho dato anche ${add} Sfere.` : 'Ecco fatto! La tua squadra è in piena forma.', 'Torna quando vuoi.']);
      this.save();
    } else if (it.kind === 'npc') {
      it.npc.talking = true;
      it.npc.obj.lookAt(this.player.pos.x, it.npc.obj.position.y, this.player.pos.z);
      await this.hud.say(it.npc.name, [it.npc.line]);
      it.npc.talking = false;
    } else if (it.kind === 'prof') {
      if (!this.state.started) await this.pickStarter();
      else {
        const seen = Object.keys(this.state.seen).length, caught = Object.keys(this.state.caught).length;
        await this.hud.say('Prof.ssa Quercia', [`Hai visto ${seen} specie e ne hai catturate ${caught} su ${Object.keys(SPECIES).length}.`, caught < 6 ? 'Esplora le altre regioni: ogni zona ha Velmon diversi!' : 'Impressionante! Stai diventando un vero esperto.']);
      }
    }
    this.busy = false;
  }

  // ---------- main loop ----------
  frame(ts) {
    this.timer.update(ts);
    const dt = Math.min(this.timer.getDelta(), 0.05);
    const t = this.timer.getElapsed();
    const input = this.input;
    windUniforms.uTime.value = t;

    this.hud.update(input);
    if (this.battle.active) this.battle.update(input);
    this.trainers.update(dt, this);
    this.crime.update(dt);

    const frozen = this.busy || this.hud.modal || this.battle.active;
    if (!this.battle.active) {
      this.player.update(dt, input, this, frozen);
      this.player.updateCamera(dt);
    } else this.battle.updateCamera(this.camera, t);

    if (!frozen) {
      if (input.pressed('menu')) this.hud.showMenu(this);
      else if (input.pressed('map')) this.hud.showBigMap(this.player.pos.x, this.player.pos.z, this.crime.mapMarks());
      else if (input.pressed('run')) input.runToggle = !input.runToggle;
      if (input.pressed('fire')) this.crime.fire();
      const it = this.nearestInteraction();
      this.hud.hint(it ? it.hint || { cura: 'A · Entra nel Centro Cura', npc: 'A · Parla', prof: 'A · Parla con la Professoressa', dismount: 'A · Scendi dallo scooter' }[it.kind] : '');
      if (it && input.pressed('a')) this.interact(it);
      this.checkEncounter(dt);
    } else this.hud.hint('');

    const center = this.player.pos;
    this.sky.update(dt, center);
    this.water.update(dt, center, this.sky, this.scene.fog);
    this.towns.update(dt, this.sky.nightFactor, center);
    this.chunks.update(center.x, center.z, IS_MOBILE ? 5 : 7);

    const r = regionAt(center.x, center.z);
    if (r !== this.region) {
      if (this.region) this.hud.banner(r.desc, r.name);
      this.region = r;
    }
    this.mapT -= dt;
    if (this.mapT <= 0) {
      this.mapT = 0.12;
      this.hud.setPlace(r.name, this.sky.clockText);
      this.hud.drawMinimap(center.x, center.z, this.player.facing, this.crime.mapMarks());
    }
    this.saveT += dt;
    if (this.saveT > 5 && !this.battle.active) { this.saveT = 0; this.save(); }

    this.renderer.render(this.scene, this.camera);
    input.endFrame();
  }

  // the closest thing to talk to or use; on the scooter A always gets off
  nearestInteraction() {
    if (this.player.vehicle) return { kind: 'dismount' };
    const P = this.player.pos;
    const all = [this.towns.nearestInteraction(P), this.trainers.nearest(P), this.crime.nearest(P)].filter(Boolean);
    all.sort((a, b) => a.d - b.d);
    const it = all[0];
    if (it?.kind === 'trainer') it.hint = `A · Parla con ${it.tr.name}`;
    return it || null;
  }

  checkEncounter(dt) {
    this.cooldown -= dt;
    if (this.cooldown > 0 || !this.state.started || this.player.moved < 0.01 || this.player.vehicle || this.crime.wanted) return;
    if (!this.chunks.isTallGrass(this.player.pos.x, this.player.pos.z)) return;
    if (!this.state.party.some((m) => m.hp > 0)) { if (Math.random() < 0.005) this.hud.toast('La tua squadra è esausta: vai al Centro Cura!'); return; }
    this.grassMeters += this.player.moved;
    if (this.grassMeters > 6 && Math.random() < this.player.moved / 28) {
      this.grassMeters = 0;
      this.battle.start(this.pickWild());
    }
  }
}

new Game().boot();
