// Builds the nine towns: houses facing a central square, a Centro Cura where
// the team is healed, lamp posts that light up at night and wandering townsfolk.

import * as THREE from 'three';
import { mulberry32 } from '../core/noise.js';
import { TOWNS } from './heightfield.js';
import { makeCharacter } from './character.js';
import { tex } from './textures.js';

const windowMat = new THREE.MeshStandardMaterial({ color: 0x9cc3d9, emissive: 0xffc46b, emissiveIntensity: 0, roughness: 0.3 });
const lampMat = new THREE.MeshStandardMaterial({ color: 0xfff1c9, emissive: 0xffd28a, emissiveIntensity: 0 });
// Procedural textures drawn once on a canvas: rough plaster and clay roof tiles.
function canvasTex(draw, size = 256, repeat = 1) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.setScalar(repeat);
  t.anisotropy = 4;
  return t;
}
const plaster = canvasTex((ctx, n) => {
  ctx.fillStyle = '#f2f2f2'; ctx.fillRect(0, 0, n, n);
  for (let i = 0; i < 2600; i++) { const v = 200 + Math.random() * 55; ctx.fillStyle = `rgba(${v},${v},${v},0.35)`; ctx.fillRect(Math.random() * n, Math.random() * n, 2 + Math.random() * 5, 2 + Math.random() * 5); }
  ctx.fillStyle = 'rgba(120,110,100,0.18)'; ctx.fillRect(0, n * 0.88, n, n * 0.12); // dirt along the base
});
const tiles = canvasTex((ctx, n) => {
  ctx.fillStyle = '#e8e8e8'; ctx.fillRect(0, 0, n, n);
  const rows = 8;
  for (let r = 0; r < rows; r++) for (let c = 0; c < 6; c++) {
    const x = (c + (r % 2) * 0.5) * (n / 6), y = r * (n / rows);
    const g = ctx.createLinearGradient(0, y, 0, y + n / rows);
    g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#9a9a9a');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x + n / 12, y + n / rows * 0.6, n / 13, n / rows * 0.6, 0, 0, Math.PI * 2); ctx.fill();
  }
}, 256, 0.35);
// photographic plaster and clay tiles, tinted with each town's colours
const wallMat = (hex) => {
  const k = `wall-${hex}`;
  if (!matCache.has(k)) matCache.set(k, new THREE.MeshStandardMaterial({ color: new THREE.Color(hex).lerp(new THREE.Color(0xffffff), 0.5).multiplyScalar(2.1), map: tex('clay_plaster_diff', { repeat: 2 }), normalMap: tex('clay_plaster_nor_gl', { color: false, repeat: 2 }), roughness: 0.95 }));
  return matCache.get(k);
};
const roofMat = (hex) => {
  const k = `roof-${hex}`;
  if (!matCache.has(k)) matCache.set(k, new THREE.MeshStandardMaterial({ color: new THREE.Color(hex).lerp(new THREE.Color(0xffffff), 0.5).multiplyScalar(1.5), map: tex('clay_roof_tiles_diff', { repeat: 0.4 }), normalMap: tex('clay_roof_tiles_nor_gl', { color: false, repeat: 0.4 }), roughness: 0.8 }));
  return matCache.get(k);
};
const matCache = new Map();
const mat = (hex, rough = 0.85, map = null) => {
  const k = `${hex}-${rough}-${map ? map.id : ''}`;
  if (!matCache.has(k)) matCache.set(k, new THREE.MeshStandardMaterial({ color: hex, roughness: rough, flatShading: !map, map }));
  return matCache.get(k);
};

function mesh(geo, material, x, y, z) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function gableRoof(w, d, h) {
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2 - 0.35, 0);
  shape.lineTo(0, h);
  shape.lineTo(w / 2 + 0.35, 0);
  shape.lineTo(-w / 2 - 0.35, 0);
  const g = new THREE.ExtrudeGeometry(shape, { depth: d + 0.7, bevelEnabled: false });
  g.translate(0, 0, -(d + 0.7) / 2);
  return g;
}

function house({ w, d, h, wall, roof, floors = 1 }) {
  const g = new THREE.Group();
  const H = h * floors;
  g.add(mesh(new THREE.BoxGeometry(w, H, d), wallMat(wall), 0, H / 2, 0));
  g.add(mesh(new THREE.BoxGeometry(w + 0.2, 0.35, d + 0.2), mat(0x8a8178), 0, 0.17, 0)); // plinth
  g.add(mesh(gableRoof(w, d, Math.min(w, d) * 0.45), roofMat(roof), 0, H, 0));
  g.add(mesh(new THREE.BoxGeometry(1.1, 2.0, 0.12), mat(0x6b4a2f), 0, 1.0, d / 2 + 0.03)); // door
  const winGeo = new THREE.BoxGeometry(0.9, 0.9, 0.1);
  for (let f = 0; f < floors; f++) {
    const y = f * h + (f === 0 ? 1.6 : h * 0.55);
    for (const x of [-w / 2 + 1.1, w / 2 - 1.1]) {
      if (f === 0 && Math.abs(x) < 1.2) continue;
      g.add(mesh(winGeo, windowMat, x, y, d / 2 + 0.02));
      g.add(mesh(winGeo, windowMat, x, y, -d / 2 - 0.02));
    }
    for (const z of [-d / 4, d / 4]) {
      const sw = mesh(winGeo, windowMat, w / 2 + 0.02, y, z); sw.rotation.y = Math.PI / 2; g.add(sw);
      const sw2 = mesh(winGeo, windowMat, -w / 2 - 0.02, y, z); sw2.rotation.y = Math.PI / 2; g.add(sw2);
    }
  }
  g.add(mesh(new THREE.BoxGeometry(0.5, 1.6, 0.5), mat(0x7d6f66), w / 4, H + Math.min(w, d) * 0.3, -d / 4)); // chimney
  g.userData.half = { x: w / 2 + 0.2, z: d / 2 + 0.2 };
  g.userData.size = { w, d };
  return g;
}

function signBoard(text) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 64;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#2f6fb3'; ctx.fillRect(0, 0, 256, 64);
  ctx.fillStyle = '#fff'; ctx.font = '800 38px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 34);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.6, 0.1), new THREE.MeshStandardMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.25 }));
}

// Pushes a circle out of a list of boxes rotated around Y: { x, z, rot, hx, hz }.
export function collideBoxes(boxes, pos, r) {
  for (const c of boxes) {
    if (Math.abs(pos.x - c.x) > 20 || Math.abs(pos.z - c.z) > 20) continue;
    // world -> box space (inverse of three.js rotation.y)
    const cos = Math.cos(c.rot), sin = Math.sin(c.rot);
    const lx = (pos.x - c.x) * cos - (pos.z - c.z) * sin;
    const lz = (pos.x - c.x) * sin + (pos.z - c.z) * cos;
    const cx = Math.max(-c.hx, Math.min(c.hx, lx)), cz = Math.max(-c.hz, Math.min(c.hz, lz));
    const dx = lx - cx, dz = lz - cz, d = Math.hypot(dx, dz);
    if (d < r) {
      let nx, nz;
      if (d > 1e-4) { nx = cx + (dx / d) * r; nz = cz + (dz / d) * r; }
      else { // inside: push out along the shallowest axis
        const px = c.hx - Math.abs(lx), pz = c.hz - Math.abs(lz);
        if (px < pz) { nx = Math.sign(lx || 1) * (c.hx + r); nz = lz; } else { nx = lx; nz = Math.sign(lz || 1) * (c.hz + r); }
      }
      pos.x = c.x + nx * cos + nz * sin;
      pos.z = c.z - nx * sin + nz * cos;
    }
  }
}

function centroCura(wall) {
  const g = house({ w: 9, d: 7, h: 4.2, wall: 0xfaf7f2, roof: 0xd8383b });
  // red cross sign above the door
  const sign = new THREE.Group();
  sign.add(mesh(new THREE.BoxGeometry(1.6, 1.6, 0.15), mat(0xffffff, 0.4), 0, 0, 0));
  const red = new THREE.MeshStandardMaterial({ color: 0xe0393c, emissive: 0xe0393c, emissiveIntensity: 0.4 });
  sign.add(mesh(new THREE.BoxGeometry(1.1, 0.35, 0.18), red, 0, 0, 0.02), mesh(new THREE.BoxGeometry(0.35, 1.1, 0.18), red, 0, 0, 0.02));
  sign.position.set(0, 3.2, 3.6);
  g.add(sign);
  g.userData.isCura = true;
  return g;
}

function lamp() {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.07, 0.1, 3.6, 6), mat(0x2f3338, 0.5), 0, 1.8, 0));
  g.add(mesh(new THREE.BoxGeometry(0.42, 0.5, 0.42), lampMat, 0, 3.75, 0));
  g.add(mesh(new THREE.ConeGeometry(0.38, 0.3, 4), mat(0x2f3338, 0.5), 0, 4.15, 0));
  return g;
}

function well() {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(1.4, 1.5, 0.9, 12, 1, true), mat(0x9a948b), 0, 0.45, 0));
  g.add(mesh(new THREE.CylinderGeometry(1.25, 1.25, 0.1, 12), new THREE.MeshStandardMaterial({ color: 0x3a7ea8, roughness: 0.1 }), 0, 0.6, 0));
  g.add(mesh(new THREE.TorusGeometry(1.45, 0.12, 6, 16), mat(0x8a847b), 0, 0.92, 0).rotateX(Math.PI / 2));
  return g;
}

const NPC_LINES = {
  aurora: ['Benvenuto a Borgo Alba! L\'erba alta è piena di Velmon.', 'Se la tua squadra è stanca, passa dal Centro Cura.', 'Dicono che a nord ci siano castelli avvolti nella nebbia.'],
  gelidi: ['Copriti bene, quassù il vento morde.', 'Sulle vette vivono Velmon di ghiaccio rarissimi.'],
  nebbia: ['La nebbia nasconde più di quanto pensi...', 'Di notte gli Ombrale escono dalle rovine.'],
  giada: ['La selva è antica quanto Valmora stessa.', 'Fai attenzione, nel fitto ci si perde facilmente.'],
  fiorita: ['Senti il profumo? Qui fiorisce tutto l\'anno.', 'Le Farfalline adorano i campi di lavanda.'],
  fulgida: ['Città Fulgida non dorme mai!', 'Un giorno qui ci sarà la Lega di Valmora.'],
  ramato: ['Il canyon è caldo di giorno e gelido di notte.', 'I Sabbioli si nascondono sotto la sabbia.'],
  corallo: ['Da qui partono i traghetti per tutte le isole.', 'I Granchietti pizzicano, attento alle dita!'],
  solari: ['Il vulcano dorme... per ora.', 'Le spiagge più belle di Valmora sono qui.'],
};

export class Towns {
  constructor(scene) {
    this.scene = scene;
    this.colliders = []; // oriented boxes
    this.interactables = []; // { x, z, r, kind, data }
    this.npcs = [];
    this.lampLights = [];
    this.houses = []; // houses that can be entered: { id, town, x, z, rot, door: {x, z}, shop }
    for (const t of TOWNS) this.buildTown(t);
  }

  buildTown(t) {
    const r = t.region;
    const rnd = mulberry32(r.gx * 31 + r.gz * 7 + 100);
    const root = new THREE.Group();
    root.position.set(t.x, t.h, t.z);
    this.scene.add(root);

    const addBuilding = (b, ang, dist) => {
      const x = Math.cos(ang) * dist, z = Math.sin(ang) * dist;
      b.position.set(x, 0, z);
      b.rotation.y = -ang - Math.PI / 2; // door faces the square
      root.add(b);
      this.colliders.push({ x: t.x + x, z: t.z + z, rot: b.rotation.y, hx: b.userData.half.x, hz: b.userData.half.z });
      return { x: t.x + x, z: t.z + z };
    };

    // Centro Cura on the north side of the square
    const cura = centroCura(r.town.wall);
    const curaAng = -Math.PI / 2;
    const cp = addBuilding(cura, curaAng, 22);
    const doorX = cp.x + Math.cos(curaAng) * -4.6, doorZ = cp.z + Math.sin(curaAng) * -4.6;
    this.interactables.push({ x: doorX, z: doorZ, r: 3.2, kind: 'cura', town: t });

    const count = r.town.big ? 22 : 11;
    for (let i = 0; i < count; i++) {
      const ring = r.town.big && i >= 11 ? 2 : 1;
      const ang = curaAng + ((i + 1) / (Math.min(count, 11) + 1)) * Math.PI * 2 + (ring === 2 ? 0.14 : 0);
      const dist = (ring === 1 ? 24 : 48) + rnd() * 6;
      const floors = r.town.big ? 1 + Math.floor(rnd() * 3) : rnd() < 0.3 ? 2 : 1;
      const b = house({ w: 6 + rnd() * 3, d: 5.5 + rnd() * 2.5, h: 3.3, wall: r.town.wall, roof: r.town.roof, floors });
      const shop = i === 5; // the house opposite the Centro Cura is the shop
      if (shop) { const sg = signBoard('BOTTEGA'); sg.position.set(0, 2.6, b.userData.size.d / 2 + 0.12); b.add(sg); }
      const hp = addBuilding(b, ang, dist);
      // the door is on the local +Z side
      const rot = b.rotation.y, out = b.userData.size.d / 2 + 0.9;
      this.houses.push({ id: `${r.id}-${i}`, town: t, x: hp.x, z: hp.z, rot, shop, door: { x: hp.x + Math.sin(rot) * out, z: hp.z + Math.cos(rot) * out } });
    }

    const w = well();
    root.add(w);
    this.colliders.push({ x: t.x, z: t.z, rot: 0, hx: 1.6, hz: 1.6 });

    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.3;
      const l = lamp();
      l.position.set(Math.cos(a) * 12, 0, Math.sin(a) * 12);
      root.add(l);
    }
    const light = new THREE.PointLight(0xffc77a, 0, 45, 1.6);
    light.position.set(0, 5, 0);
    root.add(light);
    this.lampLights.push({ light, town: t });

    // townsfolk
    const palette = [0x3d7dd9, 0x4caf50, 0x9c27b0, 0xff9800, 0x795548, 0x00897b];
    const lines = NPC_LINES[r.id] || NPC_LINES.aurora;
    for (let i = 0; i < 3; i++) {
      const npc = makeCharacter({ shirt: palette[(i + r.gx + 3) % palette.length], pants: 0x37474f, hat: null, backpack: null, hair: [0x2b1b10, 0x8d5524, 0xe0c07a][i], skin: [0xf1c7a3, 0xc68642, 0xe0ac69][i] });
      const home = { x: t.x + (rnd() - 0.5) * 30, z: t.z + (rnd() - 0.5) * 30 };
      npc.position.set(home.x, t.h, home.z);
      this.scene.add(npc);
      this.npcs.push({ obj: npc, home, target: { ...home }, wait: rnd() * 3, line: lines[i % lines.length], town: t, name: ['Abitante', 'Viandante', 'Bambina'][i] });
    }
    if (r.start) {
      const prof = makeCharacter({ shirt: 0xffffff, pants: 0x5d4037, hat: null, backpack: null, hair: 0xbdbdbd, skin: 0xf1c7a3 });
      prof.position.set(t.x + 5, t.h, t.z + 6);
      this.scene.add(prof);
      this.npcs.push({ obj: prof, home: { x: t.x + 5, z: t.z + 6 }, target: { x: t.x + 5, z: t.z + 6 }, wait: 1e9, line: null, prof: true, town: t, name: 'Prof.ssa Quercia' });
    }
  }

  update(dt, night, playerPos) {
    windowMat.emissiveIntensity = night * 2.6;
    lampMat.emissiveIntensity = night * 4.5;
    for (const { light, town } of this.lampLights) {
      const near = Math.hypot(playerPos.x - town.x, playerPos.z - town.z) < 300;
      light.intensity = near ? night * 60 : 0;
    }
    for (const n of this.npcs) {
      const o = n.obj;
      const dx = n.target.x - o.position.x, dz = n.target.z - o.position.z, d = Math.hypot(dx, dz);
      if (n.talking) { o.userData.animate(dt, 0); continue; }
      if (d < 0.3) {
        n.wait -= dt;
        o.userData.animate(dt, 0);
        if (n.wait < 0) {
          n.target = { x: n.home.x + (Math.random() - 0.5) * 16, z: n.home.z + (Math.random() - 0.5) * 16 };
          n.wait = 2 + Math.random() * 5;
        }
      } else {
        const sp = 1.3;
        o.position.x += (dx / d) * sp * dt;
        o.position.z += (dz / d) * sp * dt;
        o.rotation.y = Math.atan2(dx, dz);
        o.userData.animate(dt, sp);
      }
      o.position.y = n.town.h;
    }
  }

  collide(pos, r) {
    collideBoxes(this.colliders, pos, r);
  }

  // true if the point is inside a building (with some padding)
  inside(x, z, pad = 0.3) {
    for (const c of this.colliders) {
      if (Math.abs(x - c.x) > 20 || Math.abs(z - c.z) > 20) continue;
      const cos = Math.cos(c.rot), sin = Math.sin(c.rot);
      const lx = (x - c.x) * cos - (z - c.z) * sin, lz = (x - c.x) * sin + (z - c.z) * cos;
      if (Math.abs(lx) < c.hx + pad && Math.abs(lz) < c.hz + pad) return true;
    }
    return false;
  }

  nearestInteraction(pos) {
    let best = null, bd = Infinity;
    for (const it of this.interactables) {
      const d = Math.hypot(pos.x - it.x, pos.z - it.z);
      if (d < it.r && d < bd) { best = it; bd = d; }
    }
    for (const n of this.npcs) {
      const d = Math.hypot(pos.x - n.obj.position.x, pos.z - n.obj.position.z);
      if (d < 2.4 && d < bd) { best = { kind: n.prof ? 'prof' : 'npc', npc: n }; bd = d; }
    }
    return best && { ...best, d: bd };
  }
}
