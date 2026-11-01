// Things that fill the land between towns: campsites with a fire and a
// camper, old ruins, signposts by the roads, treasure chests hidden in every
// region and travellers walking the roads from town to town.

import * as THREE from 'three';
import { mulberry32 } from '../core/noise.js';
import { TOWNS, ROADS, roadPoint, heightAt, slopeAt, townAt } from './heightfield.js';
import { REGIONS, regionCenter, REGION_SIZE } from './regions.js';
import { makeCharacter } from './character.js';
import { add as addItem, ITEMS } from '../items.js';

const mats = new Map();
const mat = (hex, opts = {}) => {
  const k = hex + JSON.stringify(opts);
  if (!mats.has(k)) mats.set(k, new THREE.MeshStandardMaterial({ color: hex, roughness: 0.85, ...opts }));
  return mats.get(k);
};
function part(g, geo, m, x, y, z) {
  const o = new THREE.Mesh(geo, m);
  o.position.set(x, y, z);
  o.castShadow = true; o.receiveShadow = true;
  g.add(o);
  return o;
}

// A dry, gentle spot near (cx, cz), away from towns and roads.
export function findLand(rnd, cx, cz, radius) {
  for (let i = 0; i < 60; i++) {
    const a = rnd() * Math.PI * 2, r = radius * (0.3 + rnd() * 0.7);
    const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
    const h = heightAt(x, z);
    if (h > 2 && slopeAt(x, z) < 0.35 && !townAt(x, z)) return { x, z };
  }
  return null;
}

function camp() {
  const g = new THREE.Group();
  const tent = part(g, new THREE.ConeGeometry(1.6, 2.2, 4), mat(0xd9822b, { flatShading: true }), -2.2, 1.1, 0);
  tent.rotation.y = Math.PI / 4;
  for (let i = 0; i < 5; i++) { const l = part(g, new THREE.CylinderGeometry(0.08, 0.08, 0.9, 5), mat(0x6b4a2f), Math.cos(i * 1.3) * 0.25, 0.1, Math.sin(i * 1.3) * 0.25); l.rotation.z = Math.PI / 2; l.rotation.y = i * 1.3; }
  const fire = part(g, new THREE.ConeGeometry(0.3, 0.7, 7), mat(0xff7b1c, { emissive: 0xff5a00, emissiveIntensity: 2.5 }), 0, 0.45, 0);
  g.userData.fire = fire;
  for (const [x, z] of [[1.2, 0.4], [-0.3, 1.3]]) part(g, new THREE.CylinderGeometry(0.25, 0.25, 0.4, 8), mat(0x7a5535), x, 0.2, z);
  return g;
}

function ruins(rnd) {
  const g = new THREE.Group();
  const stone = mat(0xa39d90, { flatShading: true });
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2, h = 1 + rnd() * 3.5;
    part(g, new THREE.CylinderGeometry(0.45, 0.5, h, 8), stone, Math.cos(a) * 5, h / 2, Math.sin(a) * 5);
  }
  part(g, new THREE.BoxGeometry(6, 0.4, 1.2), stone, 0, 0.2, 0).rotation.y = rnd() * 3;
  return g;
}

function chestModel() {
  const g = new THREE.Group();
  part(g, new THREE.BoxGeometry(0.9, 0.5, 0.6), mat(0x8a5a2b), 0, 0.25, 0);
  const lid = new THREE.Group(); lid.position.set(0, 0.5, -0.3); g.add(lid);
  part(lid, new THREE.BoxGeometry(0.92, 0.22, 0.62), mat(0x7a4a1e), 0, 0.11, 0.3);
  part(g, new THREE.BoxGeometry(0.95, 0.08, 0.64), mat(0xffc93c, { metalness: 0.7, roughness: 0.3 }), 0, 0.42, 0);
  g.userData.lid = lid;
  return g;
}

function signpost(text) {
  const g = new THREE.Group();
  part(g, new THREE.CylinderGeometry(0.07, 0.08, 2.4, 6), mat(0x6b4a2f), 0, 1.2, 0);
  const c = document.createElement('canvas'); c.width = 256; c.height = 64;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#e8d3a8'; ctx.fillRect(0, 0, 256, 64);
  ctx.fillStyle = '#3b2a1e'; ctx.font = '700 30px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 34);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  part(g, new THREE.BoxGeometry(1.8, 0.45, 0.06), new THREE.MeshStandardMaterial({ map: t }), 0, 2.05, 0);
  return g;
}

const CAMPER_LINES = [
  'Niente di meglio di una notte sotto le stelle.', 'Ho visto un forziere vicino alle rovine, ma non sono riuscito ad aprirlo... o forse sì.',
  'Di notte qui girano Velmon strani. Tieni gli occhi aperti.', 'Vuoi un marshmallow? Scherzo, li ho finiti.',
];
const TRAVELLER_LINES = ['Sto andando al paese qui vicino. Bella giornata, eh?', 'Queste strade sono piene di allenatori, non si cammina in pace!', 'Hai sentito? Dicono che degli uomini in nero rubino Velmon.', 'Ogni tanto lungo la strada trovi un cartello. Sempre utile.'];

export class Props {
  constructor(game) {
    this.game = game;
    const scene = game.scene;
    this.spots = []; // { obj, x, z } toggled by distance
    this.chests = [];
    this.npcs = [];
    const rnd = mulberry32(31337);
    for (const r of REGIONS) {
      const c = regionCenter(r);
      // campsites and ruins
      for (let i = 0; i < 2; i++) {
        const p = findLand(rnd, c.x, c.z, REGION_SIZE * 0.42);
        if (!p) continue;
        const g = camp();
        g.position.set(p.x, heightAt(p.x, p.z), p.z);
        g.rotation.y = rnd() * 6;
        scene.add(g);
        this.spots.push({ obj: g, x: p.x, z: p.z });
        const npc = makeCharacter({ shirt: [0x558b2f, 0x8d6e63, 0x1565c0][i % 3], pants: 0x37474f, hat: 0x33691e, backpack: 0x795548 });
        npc.position.set(p.x + 1.4, heightAt(p.x + 1.4, p.z + 1.4), p.z + 1.4);
        scene.add(npc);
        this.npcs.push({ obj: npc, name: 'Campeggiatore', lines: [CAMPER_LINES[Math.floor(rnd() * CAMPER_LINES.length)]], still: true });
      }
      const pr = findLand(rnd, c.x, c.z, REGION_SIZE * 0.4);
      if (pr) {
        const g = ruins(rnd);
        g.position.set(pr.x, heightAt(pr.x, pr.z) - 0.2, pr.z);
        scene.add(g);
        this.spots.push({ obj: g, x: pr.x, z: pr.z });
        // a chest always waits in the middle of the ruins
        this.addChest(`ruin-${r.id}`, pr.x, pr.z, rnd);
      }
      // three more chests hidden around the region
      for (let i = 0; i < 3; i++) {
        const p = findLand(rnd, c.x, c.z, REGION_SIZE * 0.45);
        if (p) this.addChest(`${r.id}-${i}`, p.x, p.z, rnd);
      }
    }
    // signposts where every road leaves a town, and travellers on the roads
    ROADS.forEach((road, i) => {
      for (const [t, toward] of [[0.06, road.b], [0.94, road.a]]) {
        const p = roadPoint(road, t);
        const x = p.x - p.dz * 5, z = p.z + p.dx * 5;
        const s = signpost(`→ ${toward.region.town.name}`);
        s.position.set(x, heightAt(x, z), z);
        s.rotation.y = Math.atan2(p.dx, p.dz) + Math.PI / 2;
        scene.add(s);
        this.spots.push({ obj: s, x, z });
      }
      const npc = makeCharacter({ shirt: [0xe85d75, 0x00897b, 0xff9800, 0x5c6bc0][i % 4], pants: 0x37474f, hat: i % 2 ? 0xffffff : null, backpack: 0xf2c14e });
      scene.add(npc);
      this.npcs.push({ obj: npc, name: 'Viaggiatore', lines: [TRAVELLER_LINES[i % TRAVELLER_LINES.length]], road, t: rnd(), dir: rnd() < 0.5 ? 1 : -1 });
    });
  }

  addChest(id, x, z, rnd) {
    const g = chestModel();
    g.position.set(x, heightAt(x, z), z);
    g.rotation.y = rnd() * 6;
    this.game.scene.add(g);
    const loot = rnd();
    this.chests.push({ id, obj: g, x, z, loot });
    this.spots.push({ obj: g, x, z });
  }

  syncChests() {
    const opened = this.game.state.chests || {};
    for (const c of this.chests) c.obj.userData.lid.rotation.x = opened[c.id] ? -1.9 : 0;
  }

  async open(c) {
    const game = this.game, st = game.state;
    st.chests ??= {};
    game.busy = true;
    if (st.chests[c.id]) { await game.hud.say('', ['Il forziere è vuoto.']); game.busy = false; return; }
    st.chests[c.id] = true;
    c.obj.userData.lid.rotation.x = -1.9;
    let text;
    if (c.loot < 0.45) { const n = 150 + Math.floor(c.loot * 800); st.money += n; game.hud.setMoney(st.money); text = `Dentro ci sono 💰 ${n} monete!`; }
    else { const id = ['pozione', 'superpozione', 'ravviva', 'sfera'][Math.floor((c.loot - 0.45) / 0.1375)] || 'pozione'; addItem(st, id, id === 'sfera' ? 5 : 1); text = `Dentro c'è ${id === 'sfera' ? '5 Sfere' : `una ${ITEMS[id].name}`}!`; }
    const n = Object.keys(st.chests).length;
    await game.hud.say('', ['Apri il forziere...', text, `Forzieri trovati: ${n}/${this.chests.length}.`]);
    game.quests?.check();
    game.save();
    game.busy = false;
  }

  nearest(pos) {
    let best = null;
    for (const c of this.chests) {
      const d = Math.hypot(pos.x - c.x, pos.z - c.z);
      if (d < 1.8 && (!best || d < best.d)) best = { kind: 'chest', c, d, hint: (this.game.state.chests || {})[c.id] ? 'A · Guarda nel forziere' : 'A · Apri il forziere' };
    }
    for (const n of this.npcs) {
      if (!n.obj.visible) continue;
      const d = Math.hypot(pos.x - n.obj.position.x, pos.z - n.obj.position.z);
      if (d < 2.2 && (!best || d < best.d)) best = { kind: 'propnpc', n, d, hint: `A · Parla con ${n.name}` };
    }
    return best;
  }

  async talk(n) {
    const game = this.game;
    game.busy = true; n.talking = true;
    n.obj.lookAt(game.player.pos.x, n.obj.position.y, game.player.pos.z);
    await game.hud.say(n.name, n.lines);
    n.talking = false; game.busy = false;
  }

  update(dt, t) {
    const P = this.game.player.pos;
    for (const s of this.spots) s.obj.visible = Math.abs(P.x - s.x) < 320 && Math.abs(P.z - s.z) < 320;
    for (const s of this.spots) if (s.obj.visible && s.obj.userData.fire) s.obj.userData.fire.scale.set(1 + Math.sin(t * 13) * 0.1, 1 + Math.sin(t * 17) * 0.2, 1);
    for (const n of this.npcs) {
      const o = n.obj;
      if (n.road && !n.talking) {
        // walk along the road, turning back at the towns
        const L = Math.hypot(n.road.b.x - n.road.a.x, n.road.b.z - n.road.a.z);
        n.t += (n.dir * 1.3 * dt) / L;
        if (n.t > 0.95 || n.t < 0.05) n.dir *= -1;
        const p = roadPoint(n.road, n.t);
        o.position.set(p.x - p.dz * 1.5 * n.dir, 0, p.z + p.dx * 1.5 * n.dir);
        o.position.y = heightAt(o.position.x, o.position.z);
        o.rotation.y = Math.atan2(p.dx * n.dir, p.dz * n.dir);
      }
      o.visible = Math.abs(P.x - o.position.x) < 260 && Math.abs(P.z - o.position.z) < 260;
      if (o.visible) o.userData.animate(dt, n.road && !n.talking ? 1.3 : 0);
    }
  }
}
