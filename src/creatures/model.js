// Procedural 3D models for the Velmon, assembled from simple shapes according
// to the "model" parameters in species.js. Every model faces +Z.

import * as THREE from 'three';
import { SPECIES } from './species.js';

const cache = new Map();
function m(color, opts = {}) {
  const key = `${color}-${JSON.stringify(opts)}`;
  const { glossy, ...rest } = opts;
  if (!cache.has(key)) cache.set(key, new THREE.MeshStandardMaterial({ color, roughness: glossy ? 0.25 : 0.6, ...rest }));
  return cache.get(key);
}

function add(parent, geo, mat, x = 0, y = 0, z = 0, sx = 1, sy = sx, sz = sx) {
  const o = new THREE.Mesh(geo, mat);
  o.position.set(x, y, z);
  o.scale.set(sx, sy, sz);
  o.castShadow = true;
  parent.add(o);
  return o;
}

const S = (r = 1, w = 18, h = 14) => new THREE.SphereGeometry(r, w, h);
// `extra` is a single name or a list of them
const has = (p, name) => p.extra === name || (Array.isArray(p.extra) && p.extra.includes(name));

function eyes(head, p, y, z, spread, size = 0.13) {
  const white = m(0xffffff, { roughness: 0.2 });
  const pupil = m(p.eye ?? 0x111111, { roughness: 0.15 });
  for (const s of [-1, 1]) {
    add(head, S(size, 12, 10), white, s * spread, y, z, 1, 1.15, 0.6);
    add(head, S(size * 0.62, 10, 8), pupil, s * spread * 1.02, y - size * 0.05, z + size * 0.42, 1, 1.15, 0.5);
    add(head, S(size * 0.2, 6, 6), m(0xffffff, { emissive: 0xffffff, emissiveIntensity: 0.6 }), s * spread * 1.02 + size * 0.15, y + size * 0.25, z + size * 0.62);
  }
}

function ears(head, p, y, spread) {
  const mat = m(p.body), inner = m(p.belly);
  for (const s of [-1, 1]) {
    let e;
    switch (p.ears) {
      case 'pointy':
        e = add(head, new THREE.ConeGeometry(0.16, 0.42, 8), mat, s * spread, y + 0.18, -0.02); e.rotation.z = -s * 0.35; break;
      case 'round':
        e = add(head, S(0.17), mat, s * spread * 1.1, y + 0.12, -0.05, 1, 1, 0.45);
        add(e, S(0.12), inner, 0, 0, 0.12, 1, 1, 0.4); break;
      case 'long':
        e = add(head, S(0.12), mat, s * spread * 0.8, y + 0.36, -0.05, 0.8, 2.6, 0.55); e.rotation.z = -s * 0.25;
        if (p.tail === 'bolt') add(e, S(0.12), m(0x222222), 0, 0.75, 0, 1, 0.3, 1); break;
      case 'leaf':
        e = add(head, S(0.12), m(0x4f9a46), s * spread, y + 0.2, 0, 0.6, 1.8, 0.25); e.rotation.z = -s * 0.7; break;
      case 'fin':
        e = add(head, new THREE.ConeGeometry(0.14, 0.4, 3), m(p.belly), s * spread * 1.15, y, -0.05); e.rotation.z = -s * 1.2; break;
      default: return;
    }
  }
}

function tail(body, p, x, y, z) {
  let t;
  switch (p.tail) {
    case 'flame': {
      add(body, new THREE.CylinderGeometry(0.06, 0.09, 0.5, 6), m(p.body), x, y + 0.1, z - 0.15).rotation.x = -0.9;
      const fl = new THREE.Group(); fl.position.set(x, y + 0.35, z - 0.42); body.add(fl);
      add(fl, new THREE.ConeGeometry(0.16, 0.45, 8), m(0xff7b1c, { emissive: 0xff5a00, emissiveIntensity: 3 }), 0, 0.18, 0);
      add(fl, new THREE.ConeGeometry(0.09, 0.3, 8), m(0xffe066, { emissive: 0xffd000, emissiveIntensity: 3.5 }), 0, 0.12, 0.02);
      body.userData.flame = fl; break;
    }
    case 'leaf':
      t = add(body, S(0.18), m(0x4f9a46), x, y + 0.15, z - 0.3, 0.5, 0.25, 1.6); t.rotation.x = 0.6; break;
    case 'fin':
      t = add(body, new THREE.ConeGeometry(0.22, 0.45, 3), m(p.belly ?? p.body), x, y, z - 0.3); t.rotation.x = -Math.PI / 2; t.scale.set(1, 1, 0.35); break;
    case 'fluffy':
      t = add(body, S(0.3), m(p.body), x, y + 0.45, z - 0.38, 0.75, 1.5, 0.8); t.rotation.x = -0.4;
      add(t, S(0.2), m(p.belly), 0, 0.35, 0, 0.9, 0.7, 0.9); break;
    case 'thin':
      t = add(body, new THREE.CylinderGeometry(0.025, 0.04, 0.7, 5), m(p.belly), x, y + 0.15, z - 0.4); t.rotation.x = -1.1; break;
    case 'feather':
      for (const s of [-1, 0, 1]) { const f = add(body, S(0.1), m(p.body), x + s * 0.08, y + 0.05, z - 0.35, 0.6, 0.25, 2); f.rotation.y = s * 0.3; f.rotation.x = -0.3; } break;
    case 'bolt': {
      const shape = new THREE.Shape();
      shape.moveTo(0, 0); shape.lineTo(0.18, 0.25); shape.lineTo(0.06, 0.28); shape.lineTo(0.24, 0.6); shape.lineTo(-0.02, 0.3); shape.lineTo(0.1, 0.27); shape.lineTo(-0.06, 0);
      const g = new THREE.ExtrudeGeometry(shape, { depth: 0.06, bevelEnabled: false });
      t = add(body, g, m(p.body, { emissive: 0xffd000, emissiveIntensity: 0.25 }), x, y, z - 0.3, 1.3); t.rotation.y = Math.PI / 2; break;
    }
    default:
  }
}

function legs(body, p, n, y, spreadX, spreadZ, len = 0.3, r = 0.09) {
  const mat = m(p.body);
  const pts = n === 4 ? [[-1, 1], [1, 1], [-1, -1], [1, -1]] : [[-1, 0], [1, 0]];
  const out = [];
  for (const [sx, sz] of pts) {
    const leg = add(body, new THREE.CapsuleGeometry(r, len, 2, 6), mat, sx * spreadX, y, sz * spreadZ);
    out.push(leg);
  }
  body.userData.legs = out;
}

const BUILD = {
  quad(g, p) {
    const body = add(g, S(0.45), m(p.body, { glossy: p.glossy }), 0, 0.55, 0, 0.9, 0.8, 1.25);
    add(g, S(0.36), m(p.belly), 0, 0.48, 0.12, 0.8, 0.7, 1.05);
    legs(g, p, 4, 0.22, 0.24, 0.3, 0.24, 0.09);
    const head = new THREE.Group(); head.position.set(0, 0.9, 0.48); g.add(head);
    add(head, S(0.36), m(p.body, { glossy: p.glossy }), 0, 0, 0, 1, 0.95, 0.95);
    add(head, S(0.17), m(p.belly), 0, -0.1, 0.27, 1.1, 0.75, 0.7);
    add(head, S(0.05), m(0x2a2a2a), 0, -0.02, 0.43);
    eyes(head, p, 0.06, 0.25, 0.16);
    ears(head, p, 0.2, 0.2);
    tail(g, p, 0, 0.6, -0.4);
    g.userData.head = head; g.userData.height = 1.25; void body;
  },
  biped(g, p) {
    add(g, S(0.4), m(p.body), 0, 0.62, 0, 1, 1.15, 0.9);
    add(g, S(0.3), m(p.belly), 0, 0.58, 0.14, 0.95, 1.1, 0.75);
    legs(g, p, 2, 0.2, 0.2, 0, 0.18, 0.11);
    for (const s of [-1, 1]) { const a = add(g, new THREE.CapsuleGeometry(0.07, 0.22, 2, 6), m(p.body), s * 0.4, 0.7, 0.1); a.rotation.z = s * 0.6; }
    const head = new THREE.Group(); head.position.set(0, 1.18, 0.05); g.add(head);
    add(head, S(0.38), m(p.body), 0, 0, 0, 1, 0.95, 0.95);
    add(head, S(0.16), m(p.belly), 0, -0.13, 0.28, 1.2, 0.7, 0.6);
    eyes(head, p, 0.05, 0.27, 0.15);
    ears(head, p, 0.22, 0.22);
    tail(g, p, 0, 0.45, -0.25);
    if (has(p, 'shell')) add(g, S(0.42), m(0x8a6a45), 0, 0.68, -0.18, 1, 1.1, 0.6);
    g.userData.head = head; g.userData.height = 1.6;
  },
  bird(g, p) {
    add(g, S(0.42), m(p.body), 0, 0.62, 0, 1, 0.95, 1.1);
    add(g, S(0.32), m(p.belly), 0, 0.56, 0.18, 0.9, 0.85, 0.7);
    for (const s of [-1, 1]) {
      const w = add(g, S(0.3), m(p.body), s * 0.42, 0.7, -0.05, 0.25, 0.75, 1.1); w.rotation.z = s * 0.4;
      g.userData.wings = (g.userData.wings || []).concat(w);
      add(g, new THREE.CylinderGeometry(0.025, 0.025, 0.3, 4), m(p.beak), s * 0.14, 0.18, 0.02);
    }
    const head = new THREE.Group(); head.position.set(0, 1.05, 0.2); g.add(head);
    add(head, S(0.28), m(p.body), 0, 0, 0);
    const beak = add(head, new THREE.ConeGeometry(0.08, 0.24, 6), m(p.beak), 0, -0.04, 0.32); beak.rotation.x = Math.PI / 2;
    eyes(head, p, 0.06, 0.2, 0.13, 0.1);
    if (p.crest) for (let i = 0; i < 3; i++) { const c = add(head, new THREE.ConeGeometry(0.05, 0.3, 5), m(p.crest), 0, 0.28, -0.05 - i * 0.08); c.rotation.x = -0.4 - i * 0.25; }
    tail(g, p, 0, 0.5, -0.1);
    g.userData.head = head; g.userData.height = 1.3; g.userData.hover = 0;
  },
  fluffy(g, p) {
    const wool = m(p.body, { roughness: 1 });
    const puffs = [[0, 0.7, 0, 0.52], [0.3, 0.75, 0.1, 0.36], [-0.3, 0.75, 0.1, 0.36], [0.25, 0.65, -0.25, 0.35], [-0.25, 0.65, -0.25, 0.35], [0, 1.02, -0.05, 0.36], [0, 0.72, -0.4, 0.33]];
    for (const [x, y, z, r] of puffs) add(g, new THREE.IcosahedronGeometry(r, 1), wool, x, y, z);
    legs(g, p, 4, 0.2, 0.25, 0.22, 0.18, 0.08);
    const head = new THREE.Group(); head.position.set(0, 0.82, 0.45); g.add(head);
    add(head, S(0.28), m(has(p, 'scarf') ? 0xffffff : 0x5d4b3c), 0, 0, 0, 1, 0.95, 0.9);
    eyes(head, p, 0.05, 0.2, 0.12, 0.1);
    ears(head, p, 0.12, 0.25);
    if (p.horns) for (const s of [-1, 1]) { const h = add(head, new THREE.TorusGeometry(0.12, 0.045, 6, 10, Math.PI * 1.4), m(p.horns), s * 0.24, 0.1, -0.05); h.rotation.y = s * Math.PI / 2; }
    if (has(p, 'scarf')) add(g, new THREE.TorusGeometry(0.33, 0.08, 8, 18), m(0xe63946), 0, 0.72, 0.3).rotation.x = Math.PI / 2.4;
    g.userData.head = head; g.userData.height = 1.3;
  },
  bug(g, p) {
    const mat = m(p.body, { roughness: 0.35 });
    add(g, S(0.3), mat, 0, 0.45, -0.35, 0.9, 0.8, 1.2);
    add(g, S(0.24), mat, 0, 0.45, 0.05);
    const head = new THREE.Group(); head.position.set(0, 0.55, 0.38); g.add(head);
    add(head, S(0.26), mat, 0, 0, 0);
    eyes(head, p, 0.06, 0.15, 0.14, 0.12);
    for (const s of [-1, 1]) {
      const a = add(head, new THREE.CylinderGeometry(0.015, 0.015, 0.5, 4), m(0x222222), s * 0.1, 0.38, 0.05); a.rotation.z = -s * 0.35; a.rotation.x = 0.3;
      for (let i = 0; i < 3; i++) { const l = add(g, new THREE.CylinderGeometry(0.02, 0.02, 0.45, 4), m(0x3b5a1a), s * 0.28, 0.25, 0.15 - i * 0.22); l.rotation.z = s * 0.9; }
      const w = add(g, S(0.25), m(0xe8f5d0, { transparent: true, opacity: 0.55 }), s * 0.18, 0.7, -0.3, 0.4, 0.12, 1.2); w.rotation.z = s * 0.4;
      g.userData.wings = (g.userData.wings || []).concat(w);
    }
    g.userData.head = head; g.userData.height = 1;
  },
  blob(g, p) {
    const body = add(g, S(0.5, 24, 18), m(p.body, { glossy: p.glossy, transparent: !!p.glossy, opacity: p.glossy ? 0.92 : 1 }), 0, 0.5, 0, 1, 0.9, 1);
    if (p.glossy) { const tip = add(g, new THREE.ConeGeometry(0.25, 0.4, 16), body.material, 0, 1.05, -0.05); tip.rotation.x = -0.25; }
    add(g, S(0.3), m(p.belly), 0, 0.4, 0.28, 1, 0.8, 0.5);
    const head = new THREE.Group(); head.position.set(0, 0.62, 0.35); g.add(head);
    eyes(head, p, 0, 0.08, 0.17, 0.12);
    if (has(p, 'leafhat')) for (let i = 0; i < 5; i++) { const l = add(g, S(0.2), m(i % 2 ? 0x3f7d34 : 0x5a9a41), 0, 0.98, 0, 0.5, 0.15, 1.3); l.rotation.y = (i / 5) * Math.PI; l.rotation.x = 0.3; }
    tail(g, p, 0, 0.35, -0.2);
    g.userData.head = head; g.userData.height = 1.1; g.userData.squash = true;
  },
  butterfly(g, p) {
    add(g, new THREE.CapsuleGeometry(0.09, 0.45, 3, 8), m(p.body), 0, 0.9, 0).rotation.x = Math.PI / 2;
    const head = new THREE.Group(); head.position.set(0, 0.95, 0.35); g.add(head);
    add(head, S(0.16), m(p.body), 0, 0, 0);
    eyes(head, p, 0.03, 0.1, 0.08, 0.06);
    for (const s of [-1, 1]) {
      const a = add(head, new THREE.CylinderGeometry(0.012, 0.012, 0.4, 4), m(0x222222), s * 0.06, 0.25, 0.05); a.rotation.z = -s * 0.4;
      const pivot = new THREE.Group(); pivot.position.set(s * 0.05, 0.95, 0); g.add(pivot);
      const wing = new THREE.MeshStandardMaterial({ color: p.wings, side: THREE.DoubleSide, roughness: 0.5, emissive: p.wings, emissiveIntensity: 0.15 });
      add(pivot, new THREE.CircleGeometry(0.45, 14), wing, s * 0.4, 0.15, 0.05, 1, 1.1, 1).rotation.y = Math.PI / 2 - s * 0.1;
      add(pivot, new THREE.CircleGeometry(0.3, 12), wing, s * 0.32, -0.25, -0.15, 1, 1, 1).rotation.y = Math.PI / 2 - s * 0.1;
      pivot.children.forEach((c) => (c.rotation.order = 'YXZ'));
      g.userData.wings = (g.userData.wings || []).concat(pivot);
    }
    g.userData.head = head; g.userData.height = 1.4; g.userData.hover = 0.25; g.userData.flap = true;
  },
  bat(g, p) {
    add(g, S(0.36), m(p.body), 0, 0.95, 0);
    add(g, S(0.26), m(p.belly), 0, 0.9, 0.15, 1, 1, 0.6);
    const head = new THREE.Group(); head.position.set(0, 1.0, 0.18); g.add(head);
    eyes(head, p, 0.08, 0.15, 0.13, 0.11);
    ears(head, p, 0.22, 0.2);
    add(head, new THREE.ConeGeometry(0.03, 0.08, 4), m(0xffffff), 0.07, -0.13, 0.17).rotation.x = Math.PI;
    for (const s of [-1, 1]) {
      const pivot = new THREE.Group(); pivot.position.set(s * 0.3, 1.0, 0); g.add(pivot);
      const shape = new THREE.Shape();
      shape.moveTo(0, 0.1); shape.lineTo(0.8, 0.3); shape.lineTo(0.7, -0.05); shape.lineTo(0.5, 0.05); shape.lineTo(0.35, -0.15); shape.lineTo(0.2, 0); shape.lineTo(0, -0.15);
      const wg = new THREE.ShapeGeometry(shape);
      const w = add(pivot, wg, new THREE.MeshStandardMaterial({ color: p.wings, side: THREE.DoubleSide, roughness: 0.7 }), 0, 0, 0);
      w.scale.x = s;
      g.userData.wings = (g.userData.wings || []).concat(pivot);
    }
    g.userData.head = head; g.userData.height = 1.4; g.userData.hover = 0.35; g.userData.flap = true;
  },
  ghost(g, p) {
    const mat = m(p.body, { transparent: true, opacity: 0.85, emissive: p.glow, emissiveIntensity: 0.35 });
    add(g, S(0.45), mat, 0, 1.0, 0);
    const tailG = add(g, new THREE.ConeGeometry(0.42, 0.8, 16, 1, true), mat, 0, 0.45, -0.05); tailG.rotation.x = Math.PI; tailG.rotation.z = 0.15;
    for (const s of [-1, 1]) add(g, S(0.12), mat, s * 0.48, 0.95, 0.05, 1, 0.6, 0.6);
    const head = new THREE.Group(); head.position.set(0, 1.05, 0.32); g.add(head);
    eyes(head, p, 0.05, 0.08, 0.15, 0.12);
    add(head, S(0.08), m(0x2b1a40), 0, -0.18, 0.08, 1.4, 0.6, 0.5);
    g.userData.head = head; g.userData.height = 1.6; g.userData.hover = 0.3;
  },
  rock(g, p) {
    const geo = new THREE.DodecahedronGeometry(0.55, 0);
    add(g, geo, m(p.body, { flatShading: true, roughness: 0.95 }), 0, 0.55, 0, 1.1, 0.95, 1);
    for (const [x, y, z, r] of [[0.35, 0.95, -0.1, 0.22], [-0.3, 0.9, -0.2, 0.25], [0.05, 1.05, -0.25, 0.2]]) add(g, new THREE.DodecahedronGeometry(r, 0), m(p.belly, { flatShading: true }), x, y, z);
    for (const s of [-1, 1]) { const a = add(g, new THREE.DodecahedronGeometry(0.2, 0), m(p.body, { flatShading: true }), s * 0.62, 0.45, 0.15); a.scale.set(1, 1.3, 1); }
    const head = new THREE.Group(); head.position.set(0, 0.62, 0.45); g.add(head);
    eyes(head, p, 0.05, 0.05, 0.17, 0.11);
    legs(g, p, 2, 0.12, 0.25, 0, 0.1, 0.12);
    g.userData.head = head; g.userData.height = 1.2;
  },
  crab(g, p) {
    const shell = m(p.body, { roughness: 0.4 });
    add(g, S(0.45), shell, 0, 0.45, 0, 1.25, 0.6, 0.95);
    add(g, S(0.3), m(p.belly), 0, 0.35, 0.18, 1.2, 0.4, 0.6);
    for (const s of [-1, 1]) {
      const stalk = add(g, new THREE.CylinderGeometry(0.03, 0.03, 0.3, 5), shell, s * 0.15, 0.82, 0.2);
      const eye = new THREE.Group(); eye.position.set(s * 0.15, 0.98, 0.22); g.add(eye);
      eyes(eye, p, 0, 0, 0, 0.09); void stalk;
      const arm = add(g, new THREE.CapsuleGeometry(0.06, 0.3, 2, 6), shell, s * 0.62, 0.48, 0.25); arm.rotation.z = s * 1.0; arm.rotation.y = -s * 0.5;
      const claw = add(g, S(0.18), shell, s * 0.8, 0.62, 0.45, 1, 0.75, 1.2);
      add(claw, new THREE.ConeGeometry(0.08, 0.25, 6), shell, s * 0.05, 0.12, 0.15).rotation.x = 0.9;
      for (let i = 0; i < 3; i++) { const l = add(g, new THREE.CylinderGeometry(0.03, 0.025, 0.45, 5), shell, s * 0.55, 0.25, -0.15 + i * 0.15); l.rotation.z = s * 1.0; }
    }
    g.userData.head = g; g.userData.height = 1.1;
  },
};

function extras(g, p) {
  const head = g.userData.head;
  if (has(p, 'sprout')) {
    add(g, new THREE.CylinderGeometry(0.03, 0.04, 0.3, 5), m(0x3f7d34), 0, 1.05, -0.1);
    for (const s of [-1, 1]) { const l = add(g, S(0.12), m(0x5cbf4a), s * 0.12, 1.22, -0.1, 1.3, 0.3, 0.7); l.rotation.z = s * 0.4; }
  }
  if (has(p, 'mane')) for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    add(head, new THREE.ConeGeometry(0.1, 0.32, 5), m(0xffb703, { emissive: 0xff7b00, emissiveIntensity: 0.6 }), Math.cos(a) * 0.3, Math.sin(a) * 0.3, -0.12).rotation.z = a - Math.PI / 2;
  }
  if (has(p, 'spikes')) for (let i = 0; i < 4; i++) add(g, new THREE.ConeGeometry(0.08, 0.25, 5), m(0x9c6b2f), 0, 0.98, 0.25 - i * 0.2).rotation.x = -0.4;
  if (p.cheeks) for (const s of [-1, 1]) add(head, S(0.07), m(p.cheeks, { emissive: p.cheeks, emissiveIntensity: 0.4 }), s * 0.25, -0.08, 0.22, 1, 1, 0.5);

  // Features of the evolved forms. They are placed from the bounding box of
  // the body (top of the back) and on the head group, so they fit every shape.
  const box = new THREE.Box3().setFromObject(g);
  const top = box.max.y, back = Math.min(-0.05, (box.min.z + box.max.z) / 2 - 0.08);
  const onHead = head && head !== g;
  if (has(p, 'flower')) {
    const f = new THREE.Group(); f.position.set(0, top - 0.04, back); g.add(f);
    for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; add(f, S(0.13), m(0xff8fb8), Math.cos(a) * 0.15, 0.05, Math.sin(a) * 0.15, 1, 0.45, 1); }
    add(f, S(0.09), m(0xffd23f, { emissive: 0xffb300, emissiveIntensity: 0.3 }), 0, 0.1, 0);
  }
  if (has(p, 'tree')) {
    add(g, new THREE.CylinderGeometry(0.06, 0.09, 0.45, 6), m(0x6b4a2f), 0, top + 0.15, back);
    for (const [x, y, z, r] of [[0, 0.55, 0, 0.32], [0.2, 0.42, 0.08, 0.22], [-0.2, 0.44, -0.05, 0.24], [0.02, 0.75, -0.04, 0.2]]) add(g, new THREE.IcosahedronGeometry(r, 0), m(0x2f6e2b, { flatShading: true }), x, top + y, back + z);
  }
  if (has(p, 'horns')) {
    const hm = m(p.horn ?? 0xf3e9d2);
    const parent = onHead ? head : g, y = onHead ? 0.28 : top, z = onHead ? -0.02 : box.max.z - 0.2;
    for (const s of [-1, 1]) { const h = add(parent, new THREE.ConeGeometry(0.07, 0.36, 7), hm, s * 0.16, y + 0.1, z); h.rotation.z = -s * 0.35; h.rotation.x = -0.35; }
  }
  if (has(p, 'crown') && onHead) {
    const gold = m(p.crownColor ?? 0xffc93c, { emissive: p.crownColor ?? 0xffa000, emissiveIntensity: 0.25, roughness: 0.3, metalness: 0.6 });
    const c = new THREE.Group(); c.position.set(0, 0.3, -0.02); head.add(c);
    add(c, new THREE.CylinderGeometry(0.17, 0.19, 0.08, 10, 1, true), gold);
    for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; add(c, new THREE.ConeGeometry(0.045, 0.14, 4), gold, Math.cos(a) * 0.17, 0.09, Math.sin(a) * 0.17); }
  }
  if (has(p, 'acorn') && onHead) {
    add(head, S(0.3, 14, 8), m(0x7a4a1e, { roughness: 1 }), 0, 0.14, -0.02, 1.05, 0.55, 1.05);
    add(head, new THREE.CylinderGeometry(0.03, 0.04, 0.16, 5), m(0x4a2c10), 0, 0.36, -0.02);
  }
  if (has(p, 'tusks') && onHead) for (const s of [-1, 1]) add(head, new THREE.BoxGeometry(0.07, 0.12, 0.04), m(0xfff8e1), s * 0.04, -0.2, 0.3);
  if (has(p, 'armor')) {
    const rock = m(p.armor ?? 0x4b4440, { flatShading: true, roughness: 1 });
    for (const s of [-1, 1]) { add(g, new THREE.DodecahedronGeometry(0.2, 0), rock, s * 0.38, top * 0.78, 0.05); add(g, new THREE.DodecahedronGeometry(0.16, 0), rock, s * 0.2, top * 0.86, back); }
  }
  if (has(p, 'flames')) {
    const fm = m(0xff7b1c, { emissive: 0xff5a00, emissiveIntensity: 2.5 });
    for (const s of [-1, 1]) add(g, new THREE.ConeGeometry(0.1, 0.34, 7), fm, s * 0.34, top * 0.82 + 0.12, back + 0.1);
  }
  if (has(p, 'fins')) { const f = add(g, new THREE.ConeGeometry(0.2, 0.5, 3), m(p.belly ?? p.body), 0, top - 0.02, back); f.scale.set(0.3, 1, 1); f.rotation.x = -0.4; }
  if (has(p, 'plates')) for (let i = 0; i < 4; i++) {
    const pl = add(g, new THREE.OctahedronGeometry(0.16, 0), m(p.accent ?? 0x8fe3ff, { emissive: p.accent ?? 0x8fe3ff, emissiveIntensity: 0.35, roughness: 0.2 }), 0, top - 0.06 - i * 0.04, box.max.z - 0.45 - i * 0.22);
    pl.scale.set(0.45, 1.3, 1);
  }
  if (has(p, 'bolts')) for (let i = 0; i < 4; i++) {
    const b = add(g, new THREE.ConeGeometry(0.07, 0.3, 4), m(0xfff176, { emissive: 0xffd000, emissiveIntensity: 1.2 }), 0, top - 0.02, box.max.z - 0.5 - i * 0.18);
    b.rotation.x = -0.6;
  }
  if (has(p, 'icicles')) for (let i = 0; i < 5; i++) {
    const a = (i / 4 - 0.5) * 1.6;
    const ic = add(g, new THREE.ConeGeometry(0.06, 0.32, 5), m(0xcff4ff, { emissive: 0x9fe8ff, emissiveIntensity: 0.4, roughness: 0.1, transparent: true, opacity: 0.9 }), Math.sin(a) * 0.3, top - 0.03, back + Math.cos(a) * 0.1);
    ic.rotation.z = -Math.sin(a) * 0.5;
  }
}

export function buildCreature(speciesId) {
  const sp = SPECIES[speciesId];
  const p = sp.model;
  const root = new THREE.Group();
  const g = new THREE.Group();
  root.add(g);
  (BUILD[p.shape] || BUILD.quad)(g, p);
  if (p.hover) g.userData.hover = p.hover;
  extras(g, p);
  const scale = p.size * 1.7;
  root.scale.setScalar(scale);
  root.userData.height = (g.userData.height || 1.2) * scale;
  root.userData.inner = g;
  let t = Math.random() * 10;
  root.userData.animate = (dt) => {
    t += dt;
    const u = g.userData;
    const hover = u.hover ?? 0;
    g.position.y = hover + (hover ? Math.sin(t * 2.2) * 0.08 : Math.abs(Math.sin(t * 2.4)) * 0.02);
    const breathe = 1 + Math.sin(t * 2.4) * 0.025;
    g.scale.set(u.squash ? 1 / breathe : 1, breathe, u.squash ? 1 / breathe : 1);
    if (u.head && u.head !== g) u.head.rotation.y = Math.sin(t * 0.7) * 0.15;
    if (u.wings) u.wings.forEach((w, i) => {
      const s = i % 2 ? -1 : 1;
      if (u.flap) w.rotation.y = s * Math.sin(t * 9) * 0.6; else w.rotation.z = s * (0.4 + Math.sin(t * 6) * 0.15);
    });
    if (u.flame) { u.flame.scale.set(1 + Math.sin(t * 13) * 0.08, 1 + Math.sin(t * 17) * 0.15, 1); }
  };
  return root;
}
