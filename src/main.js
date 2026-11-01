// Leggende di Valmora 3D — entry point: renderer, game loop, saving,
// encounters and the glue between world, player, battles and HUD.

import * as THREE from 'three';
import { QUALITY, IS_MOBILE } from './core/quality.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { Input } from './core/input.js';
import { SkySystem } from './world/sky.js';
import { Water } from './world/water.js';
import { ChunkManager } from './world/terrain.js';
import { Towns } from './world/towns.js';
import { Trainers } from './world/trainers.js';
import { Crime } from './world/crime.js';
import { Interiors } from './world/interiors.js';
import { Grab } from './world/grab.js';
import { Props } from './world/props.js';
import { Quests } from './story/quests.js';
import { Romance } from './story/romance.js';
import { TOWNS } from './world/heightfield.js';
import { regionAt } from './world/regions.js';
import { windUniforms } from './world/vegetation.js';
import { Player } from './player.js';
import { Hud } from './ui/hud.js';
import { Battle } from './battle/battle.js';
import { SPECIES, STARTERS } from './creatures/species.js';
import { createMonster, heal, nameOf, gainXp, xpForLevel } from './creatures/monster.js';

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

    // Desktop: ambient occlusion darkens creases and contact points (too heavy for phones)
    if (!IS_MOBILE) {
      this.composer = new EffectComposer(this.renderer);
      this.composer.addPass(new RenderPass(this.scene, this.camera));
      const ao = new GTAOPass(this.scene, this.camera, innerWidth, innerHeight);
      ao.updateGtaoMaterial({ radius: 1.2, distanceExponent: 1.5, thickness: 1, scale: 1.1 });
      ao.blendIntensity = 0.85;
      // the sky dome and the clouds confuse the occlusion (streaks in the sky): hide them from it
      const aoRender = ao.render.bind(ao);
      ao.render = (...a) => {
        const hidden = [this.sky.sky, this.sky.stars, ...this.sky.clouds];
        hidden.forEach((o) => (o.userData.v = o.visible, o.visible = false));
        aoRender(...a);
        hidden.forEach((o) => (o.visible = o.userData.v));
      };
      this.composer.addPass(ao);
      this.composer.addPass(new OutputPass());
    }
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
    this.interiors = new Interiors(this);
    this.grab = new Grab(this);
    this.props = new Props(this);
    this.quests = new Quests(this);
    this.romance = new Romance(this);
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
    addEventListener('keydown', (e) => {
      if (!e.shiftKey || e.repeat) return;
      if (e.code === 'KeyM') this.cheat('money');
      if (e.code === 'KeyL') this.cheat('level');
    });
    // on the phone: three quick taps
    const taps = (el, kind) => { let n = 0, t = 0; el.style.pointerEvents = 'auto'; el.addEventListener('pointerdown', () => { const now = performance.now(); n = now - t < 450 ? n + 1 : 1; t = now; if (n >= 3) { n = 0; this.cheat(kind); } }); };
    taps($('money'), 'money');
    taps($('team-strip'), 'level');
    window.valmora = this; // handy for debugging from the console
  }

  newState() {
    const start = TOWNS.find((t) => t.region.start);
    return { v: 1, pos: { x: start.x + 2, z: start.z + 14, facing: Math.PI }, time: 9.5, party: [], box: [], balls: 0, seen: {}, caught: {}, cura: start.region.id, started: false, money: 300, beaten: {}, blaster: false, crimes: 0, bag: { pozione: 2 }, looted: {}, quests: {}, chests: {} };
  }

  load() {
    try {
      const s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
      // saves from before money and trainers get the new fields
      if (s && s.v === 1) return { money: 300, beaten: {}, blaster: false, crimes: 0, bag: { pozione: 2 }, looted: {}, quests: {}, chests: {}, ...s };
    } catch { /* private mode or corrupted save: start fresh */ }
    return this.newState();
  }

  // Cheats: Shift+M (or triple tap on the money) = +1000 coins,
  // Shift+L (or triple tap on the team) = the lead Velmon goes up one level.
  cheat(kind) {
    const st = this.state;
    if (kind === 'money') { st.money += 1000; this.hud.setMoney(st.money); this.hud.toast('🪄 +1000 monete', 1500); }
    if (kind === 'level') {
      const m = st.party[0];
      if (!m) return;
      const ev = gainXp(m, Math.max(1, xpForLevel(m.level + 1) - m.xp));
      const mv = ev.filter((e) => e.kind === 'move').map((e) => e.move);
      this.hud.teamStrip(st.party);
      this.hud.toast(`🪄 ${nameOf(m)} sale al livello ${m.level}!${mv.length ? ` Impara ${mv.join(', ')}.` : ''}`, 2200);
    }
    this.save();
  }

  // wipes the save and starts over from the beginning
  resetGame() {
    this.resetting = true;
    try { localStorage.removeItem(SAVE_KEY); } catch { /* storage unavailable */ }
    location.reload();
  }

  save() {
    if (this.resetting) return;
    // inside a house the game resumes in front of its door
    const h = this.interiors.room?.house;
    this.state.pos = h ? { x: h.door.x, z: h.door.z, facing: h.rot } : { x: this.player.pos.x, z: this.player.pos.z, facing: this.player.facing };
    this.state.time = this.sky.time;
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.state)); } catch { /* storage unavailable */ }
  }

  resize() {
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(innerWidth, innerHeight);
    this.composer?.setSize(innerWidth, innerHeight);
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
    this.props.syncChests();
    this.quests.init();
    this.renderer.setAnimationLoop((ts) => this.frame(ts));
    if (this.state.adult === undefined) await this.askAdult();
    if (!this.state.started) this.intro();
    else this.hud.toast('Bentornato a Valmora!');
  }

  hudVisible(v) {
    $('hud').hidden = !v;
    if (matchMedia('(pointer: coarse)').matches) $('touch').hidden = !v;
  }

  async askAdult() {
    this.busy = true;
    const i = await this.hud.choose('🔞 Contenuti per adulti', [
      { icon: '🔞', label: 'Ho almeno 18 anni', sub: 'Attiva missioni romantiche e scene piccanti (non esplicite).' },
      { icon: '🙈', label: 'Disattiva le scene per adulti', sub: 'Puoi cambiare idea dal menu Squadra.' },
    ]);
    this.state.adult = i === 0;
    this.save();
    this.busy = false;
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
    this.quests.start('main1');
    await this.hud.say('Prof.ssa Quercia', ['Un\'ultima cosa: il Campione di Borgo Alba è qui vicino al pozzo. Quando ti senti pronto, sfidalo e poi torna da me.']);
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
    if (['door', 'exit', 'rummage', 'shop', 'resident'].includes(it.kind)) return this.interiors.interact(it);
    if (it.kind === 'quest') return this.quests.talk(it.n);
    if (it.kind === 'girl') return this.romance.talk(it.g);
    if (it.kind === 'pet') return this.quests.petFound();
    if (it.kind === 'legend') return this.quests.faceLegend();
    if (it.kind === 'chest') return this.props.open(it.c);
    if (it.kind === 'propnpc') return this.props.talk(it.n);
    if (it.kind === 'grab') { this.grab.pick(it.it); return; }
    if (it.kind === 'throw') { this.grab.throw(); return; }
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
      else if (await this.quests.onProf()) { /* the story took over */ }
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
    this.interiors.update(dt);
    this.grab.update(dt);
    this.props.update(dt, t);
    this.quests.update(dt);
    this.romance.update(dt);

    const frozen = this.busy || this.hud.modal || this.battle.active;
    document.body.classList.toggle('talking', !!(this.hud.modal || this.busy));
    if (!this.battle.active) {
      this.player.update(dt, input, this, frozen);
      // story scenes take over the camera: this.cine = { pos, look }
      if (this.cine) { this.camera.position.lerp(this.cine.pos, Math.min(dt * 3, 1)); this.camera.lookAt(this.cine.look); }
      else this.player.updateCamera(dt);
    } else this.battle.updateCamera(this.camera, t);

    if (!frozen) {
      if (input.pressed('menu')) this.hud.showMenu(this);
      else if (input.pressed('map')) this.hud.showBigMap(this.player.pos.x, this.player.pos.z, this.crime.mapMarks().concat(this.quests.mapMarks()));
      else if (input.pressed('run')) input.runToggle = !input.runToggle;
      if (input.pressed('fire')) this.crime.fire();
      const it = this.nearestInteraction();
      this.hud.hint(it ? it.hint || { cura: 'A · Entra nel Centro Cura', npc: 'A · Parla', prof: 'A · Parla con la Professoressa', dismount: 'A · Scendi dallo scooter' }[it.kind] : '');
      if (it && input.pressed('a')) this.interact(it);
      this.checkEncounter(dt);
    } else this.hud.hint('');

    const center = this.player.pos;
    this.sky.update(dt, center);
    this.sky.updateEnv(this.renderer);
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
      const room = this.interiors.room?.house;
      this.hud.setPlace(room ? (room.shop ? `Bottega · ${room.town.region.town.name}` : `Casa a ${room.town.region.town.name}`) : r.name, this.sky.clockText);
      this.hud.drawMinimap(center.x, center.z, this.player.facing, this.crime.mapMarks().concat(this.quests.mapMarks()));
      // with no job running, the bottom panel shows the tracked quest
      let target = this.crime.mission?.target;
      if (!this.crime.mission) {
        const tq = this.quests.tracked(), at = tq?.step.at?.();
        target = at;
        this.hud.mission(tq && !this.interiors.inside ? { title: `⭐ ${tq.q.title}`, goal: tq.step.text, timer: '', dist: at ? Math.round(Math.hypot(at.x - center.x, at.z - center.z)) : null } : null);
      }
      // an arrow that always points to where to go, relative to the camera
      if (target && !this.interiors.inside) {
        const y = this.player.camYaw, dx = target.x - center.x, dz = target.z - center.z;
        this.hud.setArrow(Math.atan2(dx * Math.cos(y) - dz * Math.sin(y), -dx * Math.sin(y) - dz * Math.cos(y)));
      } else this.hud.setArrow(null);
    }
    this.saveT += dt;
    if (this.saveT > 5 && !this.battle.active) { this.saveT = 0; this.save(); }

    if (this.composer) {
      // the composer can start at size zero if the page loaded in a hidden tab
      if (this.composer.renderTarget1.width !== this.renderer.domElement.width) this.composer.setSize(innerWidth, innerHeight);
      this.composer.render();
    } else this.renderer.render(this.scene, this.camera);
    input.endFrame();
  }

  // the closest thing to talk to or use; on the scooter A always gets off
  nearestInteraction() {
    if (this.player.vehicle) return { kind: 'dismount' };
    const P = this.player.pos;
    if (this.grab.held) {
      const person = [this.romance.nearest(P), this.quests.nearest(P), this.towns.nearestInteraction(P)].filter((x) => x && x.kind !== 'cura').sort((a, b) => a.d - b.d)[0];
      return person || this.grab.nearest(P);
    }
    const all = this.interiors.inside
      ? [this.interiors.nearest(P), this.grab.nearest(P)].filter(Boolean)
      : [this.towns.nearestInteraction(P), this.trainers.nearest(P), this.crime.nearest(P), this.interiors.nearest(P), this.grab.nearest(P), this.quests.nearest(P), this.props.nearest(P), this.romance.nearest(P)].filter(Boolean);
    all.sort((a, b) => a.d - b.d);
    const it = all[0];
    if (it?.kind === 'trainer') it.hint = `A · Parla con ${it.tr.name}`;
    return it || null;
  }

  checkEncounter(dt) {
    this.cooldown -= dt;
    if (this.cooldown > 0 || !this.state.started || this.player.moved < 0.01 || this.player.vehicle || this.crime.wanted || this.player.indoor) return;
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
