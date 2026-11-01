// House interiors. Every house in every town can be entered: the room is built
// on demand deep below the house (so the outside world never shows), with
// furniture, drawers and cupboards to rummage through, things to pick up and
// sometimes someone at home. One house per town is the Bottega (the shop).

import * as THREE from 'three';
import { mulberry32 } from '../core/noise.js';
import { makeCharacter } from './character.js';
import { ITEMS, add as addItem } from '../items.js';

export const INDOOR_Y = -400;
const W = 10, D = 8, H = 3.2;

const mats = new Map();
const mat = (hex, opts = {}) => {
  const k = hex + JSON.stringify(opts);
  if (!mats.has(k)) mats.set(k, new THREE.MeshStandardMaterial({ color: hex, roughness: 0.8, ...opts }));
  return mats.get(k);
};

const WALLS = [0xf3e6cf, 0xdfe8d8, 0xe9dcef, 0xd9e6f2, 0xf2dcd0, 0xeee7c8];
const FLOORS = [0x9a6b43, 0x7c5434, 0xb38b5d, 0x8c6a4f];
const BLANKETS = [0xd94a3d, 0x2f8fd8, 0x4caf50, 0xf2c14e, 0x9c27b0];
const LINES = [
  ['Ehi! Chi ti ha fatto entrare? Vabbè, già che ci sei siediti.', 'Mio figlio vuole diventare allenatore come te.'],
  ['Oh, una visita! Non ricevo mai nessuno...', 'Dicono che di notte nelle rovine si sentano strani versi.'],
  ['Stavo giusto per cucinare. Profumino, eh?', 'Il campione del paese è fortissimo, stai attento.'],
  ['Shh, il gatto dorme.', 'Se ti servono Pozioni, la Bottega è dall\'altra parte della piazza.'],
  ['Mi sa che hai sbagliato porta... ma resta pure.', 'Ho sentito che a Città Fulgida girano tipi loschi.'],
];
const LOOT = [['money', 0.4], ['pozione', 0.25], ['sfera', 0.15], ['superpozione', 0.1], ['nothing', 0.1]];

function box(g, w, h, d, m, x, y, z, ry = 0) {
  const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  o.position.set(x, y, z);
  o.rotation.y = ry;
  o.castShadow = true; o.receiveShadow = true;
  g.add(o);
  return o;
}

export class Interiors {
  constructor(game) {
    this.game = game;
    this.room = null; // the room the player is in
  }

  get inside() { return !!this.room; }

  // ---------- building a room ----------
  build(house) {
    const rnd = mulberry32([...house.id].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0);
    const pick = (a) => a[Math.floor(rnd() * a.length)];
    const o = new THREE.Vector3(house.x, INDOOR_Y, house.z);
    const g = new THREE.Group();
    g.position.copy(o);
    const boxes = []; // colliders in world space
    const solid = (w, d, x, z) => boxes.push({ x: o.x + x, z: o.z + z, rot: 0, hx: w / 2, hz: d / 2 });
    const wall = mat(pick(WALLS)), floor = mat(pick(FLOORS), { roughness: 0.6 });
    box(g, W, 0.2, D, floor, 0, -0.1, 0);
    box(g, W, 0.2, D, mat(0xf7f3ea), 0, H + 0.1, 0);
    box(g, W + 0.4, H, 0.2, wall, 0, H / 2, -D / 2 - 0.1);
    box(g, 0.2, H, D, wall, -W / 2 - 0.1, H / 2, 0);
    box(g, 0.2, H, D, wall, W / 2 + 0.1, H / 2, 0);
    for (const s of [-1, 1]) box(g, W / 2 - 0.6, H, 0.2, wall, s * (W / 4 + 0.3), H / 2, D / 2 + 0.1);
    box(g, 1.2, H - 2.1, 0.2, wall, 0, 2.1 + (H - 2.1) / 2, D / 2 + 0.1);
    box(g, 1.1, 2.05, 0.08, mat(0x6b4a2f), 0, 1.02, D / 2 + 0.02); // door (inside)
    box(g, W, 0.12, 0.05, mat(0xffffff), 0, 0.06, -D / 2 + 0.02); // skirting
    const glass = mat(0xbfe6ff, { emissive: 0xcfeaff, emissiveIntensity: 0.9, roughness: 0.1 });
    for (const x of [-3, 3]) { box(g, 1.3, 1.1, 0.05, mat(0xffffff), x, 1.7, -D / 2 + 0.03); box(g, 1.1, 0.9, 0.06, glass, x, 1.7, -D / 2 + 0.04); }
    box(g, 3.2, 0.02, 2.2, mat(pick(BLANKETS), { roughness: 1 }), 0, 0.01, 0.6); // rug
    const light = new THREE.PointLight(0xffe2b8, 18, 16, 1.6);
    light.position.set(0, H - 0.4, 0);
    g.add(light);
    box(g, 0.5, 0.1, 0.5, mat(0xfff1c9, { emissive: 0xffd28a, emissiveIntensity: 2 }), 0, H - 0.05, 0);

    const containers = [];
    const things = [];
    if (house.shop) {
      // counter, shelves full of goods, the shopkeeper behind
      box(g, 4.2, 1.0, 0.8, mat(0x8a6240), 0, 0.5, -1.6); solid(4.2, 0.8, 0, -1.6);
      for (const x of [-3.4, 3.4]) {
        box(g, 2.2, 2.4, 0.5, mat(0x7a5535), x, 1.2, -D / 2 + 0.3); solid(2.2, 0.5, x, -D / 2 + 0.3);
        for (let r = 0; r < 3; r++) for (let k = 0; k < 5; k++) box(g, 0.3, 0.35, 0.25, mat([0xe23b3b, 0x2f8fd8, 0x7ac74c, 0xffd23f][(k + r) % 4]), x - 0.8 + k * 0.4, 0.55 + r * 0.7, -D / 2 + 0.35);
      }
      const keeper = makeCharacter({ shirt: 0x2f8fd8, pants: 0x37474f, hat: 0x2f8fd8, hatBrim: 0xffffff, backpack: null });
      keeper.position.set(o.x, INDOOR_Y, o.z - 2.6);
      g.userData.keeper = keeper;
      things.push({ kind: 'keeper', obj: keeper, x: o.x, z: o.z - 1.0 });
    } else {
      // bed with pillow and blanket in a back corner
      const bx = -W / 2 + 1.1, bz = -D / 2 + 1.3;
      box(g, 1.6, 0.45, 2.3, mat(0x7a5535), bx, 0.25, bz);
      box(g, 1.5, 0.15, 1.6, mat(pick(BLANKETS), { roughness: 1 }), bx, 0.55, bz + 0.3);
      box(g, 1.1, 0.18, 0.45, mat(0xffffff, { roughness: 1 }), bx, 0.58, bz - 0.8);
      solid(1.6, 2.3, bx, bz);
      // wardrobe, chest of drawers, fridge: things to rummage through
      const spots = [
        { label: 'l\'armadio', w: 1.2, h: 2.1, d: 0.6, x: W / 2 - 0.7, z: -D / 2 + 0.4, color: 0x6e4a2c },
        { label: 'la cassettiera', w: 1.2, h: 0.9, d: 0.55, x: -W / 2 + 0.4, z: 1.6, color: 0x8a6240, ry: Math.PI / 2 },
        { label: 'il frigo', w: 0.8, h: 1.8, d: 0.7, x: 0.6, z: -D / 2 + 0.45, color: 0xf2f2f2 },
      ];
      spots.forEach((s, i) => {
        const m = box(g, s.w, s.h, s.d, mat(s.color, { roughness: 0.5 }), s.x, s.h / 2, s.z, s.ry || 0);
        if (s.ry) solid(s.d, s.w, s.x, s.z); else solid(s.w, s.d, s.x, s.z);
        m.add(box(new THREE.Group(), 0.3, 0.06, 0.05, mat(0xc0c0c0, { metalness: 0.8 }), 0, s.h * 0.15, s.d / 2 + 0.03)); // handle
        const fx = s.ry ? s.x + 0.9 : s.x, fz = s.ry ? s.z : s.z + 0.9;
        containers.push({ id: `${house.id}-c${i}`, label: s.label, x: o.x + fx, z: o.z + fz });
      });
      // kitchen counter, table and chairs
      box(g, 1.8, 0.9, 0.6, mat(0xd8d0c0, { roughness: 0.5 }), -1.0, 0.45, -D / 2 + 0.35); solid(1.8, 0.6, -1.0, -D / 2 + 0.35);
      box(g, 1.4, 0.06, 0.9, mat(0x9a6b43), 2.2, 0.75, 0.6);
      for (const [x, z] of [[1.6, 0.25], [2.8, 0.25], [1.6, 0.95], [2.8, 0.95]]) box(g, 0.06, 0.75, 0.06, mat(0x6e4a2c), x, 0.37, z);
      solid(1.4, 0.9, 2.2, 0.6);
      for (const z of [-0.1, 1.3]) { box(g, 0.45, 0.06, 0.45, mat(0x6e4a2c), 2.2, 0.45, z); box(g, 0.45, 0.5, 0.06, mat(0x6e4a2c), 2.2, 0.72, z + (z < 0 ? -0.2 : 0.2)); }
      // a plant in a pot
      box(g, 0.4, 0.4, 0.4, mat(0xb5523b), W / 2 - 0.5, 0.2, D / 2 - 0.6);
      const leaves = new THREE.Mesh(new THREE.IcosahedronGeometry(0.45, 0), mat(0x3f7d34, { flatShading: true }));
      leaves.position.set(W / 2 - 0.5, 0.75, D / 2 - 0.6); leaves.castShadow = true; g.add(leaves);
      solid(0.5, 0.5, W / 2 - 0.5, D / 2 - 0.6);
      // somebody at home, sometimes
      if (!house.reserved && rnd() < 0.7) {
        const npc = makeCharacter({ shirt: pick([0x3d7dd9, 0x4caf50, 0x9c27b0, 0xff9800, 0x795548]), pants: 0x37474f, hat: null, backpack: null, hair: pick([0x2b1b10, 0x8d5524, 0xe0c07a, 0xbdbdbd]), skin: pick([0xf1c7a3, 0xc68642, 0xe0ac69]) });
        npc.position.set(o.x - 1.5, INDOOR_Y, o.z + 0.2);
        things.push({ kind: 'resident', obj: npc, x: o.x - 1.5, z: o.z + 0.2, lines: pick(LINES), name: pick(['Abitante', 'Padrona di casa', 'Nonno', 'Ragazzo']) });
      }
    }
    for (const t of things) this.game.scene.add(t.obj);
    return { house, g, origin: o, boxes, containers, things, bounds: { x0: o.x - W / 2 + 0.3, x1: o.x + W / 2 - 0.3, z0: o.z - D / 2 + 0.3, z1: o.z + D / 2 - 0.3, y: INDOOR_Y, ceil: INDOOR_Y + H }, rnd };
  }

  // ---------- going in and out ----------
  async enter(house) {
    const game = this.game;
    game.busy = true;
    await this.fade(true);
    const room = this.build(house);
    game.scene.add(room.g);
    this.room = room;
    game.player.indoor = { ...room.bounds, boxes: room.boxes };
    game.player.place(room.origin.x, room.origin.z + D / 2 - 1.2, Math.PI);
    game.player.camDist = Math.min(game.player.camDist, 3.4);
    game.player.snapCamera();
    // a few things lying around that can be picked up
    const r = room.rnd;
    if (!house.shop) {
      game.grab.spawn('vaso', room.origin.x + 2.2, INDOOR_Y + 0.8, room.origin.z + 0.6, true);
      game.grab.spawn('mela', room.origin.x + 2.5, INDOOR_Y + 0.8, room.origin.z + 0.4, true);
      if (r() < 0.7) game.grab.spawn('palla', room.origin.x - 1, INDOOR_Y + 0.2, room.origin.z + 2, true);
      if (r() < 0.6) game.grab.spawn('libro', room.origin.x - 4.4, INDOOR_Y + 0.95, room.origin.z + 1.4, true);
    }
    await this.fade(false);
    game.busy = false;
    game.quests?.onEnterHouse(house, room);
  }

  async exit() {
    const game = this.game, room = this.room;
    if (!room) return;
    game.busy = true;
    await this.fade(true);
    game.grab.clearIndoor();
    game.scene.remove(room.g);
    for (const t of room.things) game.scene.remove(t.obj);
    room.g.traverse((m) => m.geometry?.dispose());
    this.room = null;
    game.player.indoor = null;
    const h = room.house;
    game.player.place(h.door.x, h.door.z, h.rot);
    await this.fade(false);
    game.busy = false;
  }

  fade(on) {
    const el = document.getElementById('fade');
    el.classList.toggle('on', on);
    return new Promise((r) => setTimeout(r, 260));
  }

  // ---------- inside ----------
  async rummage(c) {
    const game = this.game, st = game.state;
    st.looted ??= {};
    game.busy = true;
    let text;
    if (st.looted[c.id]) text = `Hai già frugato ${c.label}: non c'è più niente.`;
    else {
      st.looted[c.id] = true;
      let x = this.room.rnd(), kind = 'nothing';
      for (const [k, w] of LOOT) { x -= w; if (x <= 0) { kind = k; break; } }
      if (kind === 'money') { const n = 20 + Math.floor(this.room.rnd() * 100); st.money += n; game.hud.setMoney(st.money); text = `Frughi ${c.label}... trovi 💰 ${n}!`; }
      else if (kind === 'nothing') text = `Frughi ${c.label}... solo calzini spaiati.`;
      else { addItem(st, kind, kind === 'sfera' ? 2 : 1); text = `Frughi ${c.label}... trovi ${kind === 'sfera' ? '2 Sfere' : `una ${ITEMS[kind].name}`}!`; }
      game.save();
    }
    await game.hud.say('', [text]);
    const res = this.room.things.find((t) => t.kind === 'resident');
    if (res && !res.angry && !st.looted[`${c.id}-seen`]) {
      st.looted[`${c.id}-seen`] = true;
      res.angry = true;
      res.obj.lookAt(game.player.pos.x, res.obj.position.y, game.player.pos.z);
      await game.hud.say(res.name, ['EHI! Giù le mani dalla mia roba! Chiamo le guardie!']);
      game.crime.addWanted(1, 'Furto in casa!');
    }
    game.busy = false;
  }

  async shop() {
    const game = this.game, st = game.state;
    game.busy = true;
    await game.hud.say('Bottegaio', ['Benvenuto in Bottega! Cosa ti serve?']);
    for (;;) {
      const ids = Object.keys(ITEMS);
      const i = await game.hud.choose(`Bottega · hai 💰 ${st.money.toLocaleString('it-IT')}`, [...ids.map((id) => ({ icon: ITEMS[id].icon, label: `${ITEMS[id].name} · 💰 ${ITEMS[id].price}`, sub: ITEMS[id].desc })), { icon: '👋', label: 'Basta così' }]);
      if (i < 0 || i >= ids.length) break;
      const it = ITEMS[ids[i]];
      if (st.money < it.price) { game.hud.toast('Non hai abbastanza monete!', 1600); continue; }
      st.money -= it.price;
      addItem(st, ids[i], 1);
      game.hud.setMoney(st.money);
      game.hud.toast(`Comprato: ${it.name}!`, 1200);
      game.save();
    }
    await game.hud.say('Bottegaio', ['Grazie e torna presto!']);
    game.busy = false;
  }

  nearest(pos) {
    let best = null;
    const consider = (o) => { if (o.d < (best?.d ?? Infinity)) best = o; };
    if (!this.room) {
      for (const h of this.game.towns.houses) {
        if (Math.abs(pos.x - h.door.x) > 3 || Math.abs(pos.z - h.door.z) > 3) continue;
        const d = Math.hypot(pos.x - h.door.x, pos.z - h.door.z);
        if (d < 1.8) consider({ kind: 'door', house: h, d, hint: h.shop ? 'A · Entra in Bottega' : 'A · Entra in casa' });
      }
      return best;
    }
    const r = this.room;
    const exit = { x: r.origin.x, z: r.origin.z + D / 2 - 0.5 };
    const de = Math.hypot(pos.x - exit.x, pos.z - exit.z);
    if (de < 1.4) consider({ kind: 'exit', d: de, hint: 'A · Esci' });
    for (const c of r.containers) { const d = Math.hypot(pos.x - c.x, pos.z - c.z); if (d < 1.3) consider({ kind: 'rummage', c, d, hint: `A · Fruga ${c.label}` }); }
    for (const t of r.things) {
      const d = Math.hypot(pos.x - t.x, pos.z - t.z);
      if (d < 2.2) consider({ kind: t.kind === 'keeper' ? 'shop' : 'resident', t, d, hint: t.kind === 'keeper' ? 'A · Compra' : `A · Parla con ${t.name}` });
    }
    return best;
  }

  async interact(it) {
    const game = this.game;
    if (it.kind === 'door') return this.enter(it.house);
    if (it.kind === 'exit') return this.exit();
    if (it.kind === 'rummage') return this.rummage(it.c);
    if (it.kind === 'shop') return this.shop();
    if (it.kind === 'resident') {
      game.busy = true;
      it.t.obj.lookAt(game.player.pos.x, it.t.obj.position.y, game.player.pos.z);
      await game.hud.say(it.t.name, it.t.angry ? ['Fuori da casa mia, ladro!'] : it.t.lines);
      game.busy = false;
    }
  }

  update(dt) {
    if (!this.room) return;
    const P = this.game.player.pos;
    for (const t of this.room.things) {
      const o = t.obj;
      const want = Math.atan2(P.x - o.position.x, P.z - o.position.z);
      let d = want - o.rotation.y;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      o.rotation.y += d * Math.min(dt * 3, 1);
      o.userData.animate(dt, 0);
    }
  }
}
