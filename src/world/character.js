// Human figure used for the player and every person in the world: realistic
// proportions (about 1.78 m, head one eighth of the height), a shaped torso,
// two-segment arms and legs so knees and elbows bend, hands, shoes, a face
// and fabric on the clothes. Walk/run animation swings hips and shoulders.

import * as THREE from 'three';
import { tex } from './textures.js';

const mats = new Map();
function mat(hex, kind = 'cloth') {
  const k = `${hex}-${kind}`;
  if (!mats.has(k)) {
    const o = { color: hex, roughness: 0.85 };
    if (kind === 'cloth') { o.normalMap = tex('fabric_nor_gl', { color: false, repeat: 3 }); o.normalScale = new THREE.Vector2(0.6, 0.6); }
    if (kind === 'skin') { o.roughness = 0.6; o.sheen = 0.3; }
    if (kind === 'shiny') o.roughness = 0.35;
    mats.set(k, kind === 'skin' ? new THREE.MeshPhysicalMaterial(o) : new THREE.MeshStandardMaterial(o));
  }
  return mats.get(k);
}

function part(geo, material, x, y, z) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

// a smooth body of revolution from a [radius, height] profile
const lathe = (pts, seg = 14) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);
const TORSO = lathe([[0.001, 0], [0.15, 0.0], [0.16, 0.08], [0.135, 0.22], [0.15, 0.33], [0.17, 0.43], [0.155, 0.5], [0.06, 0.55], [0.001, 0.56]]);
const HIPS = lathe([[0.001, -0.1], [0.12, -0.08], [0.155, 0.0], [0.15, 0.06], [0.001, 0.07]]);

export function makeCharacter({ skin = 0xf1c7a3, shirt = 0xd94a3d, pants = 0x2e3f63, shoes = 0x2a2a2a, hair = 0x3b2a1e, hat = 0xd94a3d, hatBrim = 0xffffff, backpack = 0xf2c14e, scale = 1, longHair = false, top = null } = {}) {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const S = mat(skin, 'skin'), C = mat(shirt), P = mat(pants), H = mat(hair, 'hair'), SH = mat(shoes, 'shiny');

  // torso and hips
  const torso = part(TORSO, C, 0, 0.95, 0); torso.scale.set(1, 1, 0.62); body.add(torso);
  const hips = part(HIPS, P, 0, 0.95, 0); hips.scale.set(1, 1, 0.66); body.add(hips);
  body.add(part(new THREE.CylinderGeometry(0.052, 0.06, 0.12, 10), S, 0, 1.53, 0)); // neck

  // head: slightly egg shaped, with face
  const head = new THREE.Group(); head.position.set(0, 1.665, 0.01); body.add(head);
  const skull = part(new THREE.SphereGeometry(0.1, 20, 16), S, 0, 0, 0); skull.scale.set(0.95, 1.18, 1.05); head.add(skull);
  const jaw = part(new THREE.SphereGeometry(0.06, 12, 8), S, 0, -0.065, 0.035); jaw.scale.set(1.1, 0.7, 1); head.add(jaw);
  for (const s of [-1, 1]) {
    const w = part(new THREE.SphereGeometry(0.017, 10, 8), mat(0xffffff, 'shiny'), s * 0.036, 0.018, 0.088); w.scale.set(1.2, 0.8, 0.6); head.add(w);
    head.add(part(new THREE.SphereGeometry(0.0095, 8, 6), mat(0x3b2a1e, 'shiny'), s * 0.036, 0.018, 0.097));
    const brow = part(new THREE.BoxGeometry(0.034, 0.007, 0.01), H, s * 0.037, 0.043, 0.094); brow.rotation.z = -s * 0.12; head.add(brow);
    const ear = part(new THREE.SphereGeometry(0.018, 8, 6), S, s * 0.098, 0.0, 0.0); ear.scale.set(0.5, 1, 0.8); head.add(ear);
  }
  head.add(part(new THREE.ConeGeometry(0.014, 0.04, 6), S, 0, -0.008, 0.108).rotateX(Math.PI / 2)); // nose
  head.add(part(new THREE.BoxGeometry(0.035, 0.007, 0.006), mat(0xa0524a, 'skin'), 0, -0.05, 0.098)); // mouth

  // hair: a cap over the skull, a fringe and optionally a long tail
  const cap = part(new THREE.SphereGeometry(0.106, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.52), H, 0, 0.012, -0.008); cap.scale.set(1, 1.2, 1.1); head.add(cap);
  const fringe = part(new THREE.SphereGeometry(0.09, 12, 6, 0, Math.PI * 2, 0, Math.PI * 0.28), H, 0, 0.055, 0.035); fringe.scale.set(1.1, 1, 1.05); head.add(fringe);
  if (longHair) { const lh = part(new THREE.SphereGeometry(0.09, 12, 10), H, 0, -0.08, -0.07); lh.scale.set(1.25, 1.9, 0.6); head.add(lh); }
  if (hat !== null) {
    const hm = mat(hat);
    const c = part(new THREE.SphereGeometry(0.11, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.45), hm, 0, 0.035, 0); c.scale.set(1, 1.05, 1.1); head.add(c);
    const brim = part(new THREE.CylinderGeometry(0.09, 0.09, 0.012, 14, 1, false, -Math.PI / 2, Math.PI), mat(hatBrim), 0, 0.055, 0.085); brim.scale.set(1.05, 1, 1.1); head.add(brim);
  }
  if (top !== null) { const tp = part(new THREE.CylinderGeometry(0.155, 0.15, 0.09, 14), mat(top), 0, 1.33, 0.005); tp.scale.z = 0.66; body.add(tp); } // underwear top
  if (backpack !== null) {
    const bp = part(new THREE.BoxGeometry(0.28, 0.36, 0.13), mat(backpack), 0, 1.22, -0.16);
    body.add(bp);
    for (const s of [-1, 1]) body.add(part(new THREE.BoxGeometry(0.035, 0.32, 0.02), mat(0x333333), s * 0.09, 1.25, 0.1));
  }

  // limbs: an upper pivot (shoulder/hip) and a lower pivot (elbow/knee)
  const limb = (m1, m2, len1, len2, r1, r2) => {
    const upper = new THREE.Group();
    upper.add(part(new THREE.CapsuleGeometry(r1, len1 - r1 * 2, 3, 10), m1, 0, -len1 / 2, 0));
    const lower = new THREE.Group(); lower.position.y = -len1; upper.add(lower);
    lower.add(part(new THREE.CapsuleGeometry(r2, len2 - r2 * 2, 3, 10), m2, 0, -len2 / 2, 0));
    return { upper, lower };
  };
  const arm = (s) => {
    const a = limb(C, C, 0.3, 0.27, 0.056, 0.046);
    a.upper.position.set(s * 0.205, 1.43, 0);
    const hand = part(new THREE.SphereGeometry(0.042, 10, 8), S, 0, -0.3, 0.01); hand.scale.set(0.8, 1.25, 0.55);
    a.lower.add(hand);
    a.upper.rotation.z = s * 0.06;
    body.add(a.upper);
    return a;
  };
  const leg = (s) => {
    const l = limb(P, P, 0.45, 0.43, 0.088, 0.066);
    l.upper.position.set(s * 0.09, 0.93, 0);
    const shoe = part(new THREE.BoxGeometry(0.095, 0.07, 0.24), SH, 0, -0.45, 0.045);
    l.lower.add(shoe);
    body.add(l.upper);
    return l;
  };
  const armL = arm(-1), armR = arm(1), legL = leg(-1), legR = leg(1);
  root.scale.setScalar(scale);
  root.userData.body = body;

  const lerp = THREE.MathUtils.lerp;
  let phase = 0;
  root.userData.animate = (dt, speed) => {
    if (root.userData.sitting) { // riding: knees bent forward, hands on the handlebar
      legL.upper.rotation.x = legR.upper.rotation.x = -1.4;
      legL.lower.rotation.x = legR.lower.rotation.x = 1.45;
      armL.upper.rotation.x = armR.upper.rotation.x = -1.0;
      armL.lower.rotation.x = armR.lower.rotation.x = -0.4;
      body.position.y = 0; body.rotation.x = 0.12;
      return;
    }
    const moving = speed > 0.2;
    phase += dt * (moving ? 2.2 + speed * 0.9 : 1.2);
    const amp = moving ? Math.min(0.3 + speed * 0.07, 0.9) : 0;
    const sw = Math.sin(phase) * amp;
    const k = 0.35;
    legL.upper.rotation.x = lerp(legL.upper.rotation.x, sw, k);
    legR.upper.rotation.x = lerp(legR.upper.rotation.x, -sw, k);
    // the knee bends while the leg swings forward and lifts
    legL.lower.rotation.x = lerp(legL.lower.rotation.x, moving ? Math.max(0, -Math.cos(phase)) * amp * 1.4 : 0, k);
    legR.lower.rotation.x = lerp(legR.lower.rotation.x, moving ? Math.max(0, Math.cos(phase)) * amp * 1.4 : 0, k);
    armL.upper.rotation.x = lerp(armL.upper.rotation.x, -sw * 0.8, k);
    armR.upper.rotation.x = lerp(armR.upper.rotation.x, sw * 0.8, k);
    armL.lower.rotation.x = armR.lower.rotation.x = lerp(armL.lower.rotation.x, moving ? -0.25 - amp * 0.4 : -0.08, k);
    body.position.y = moving ? Math.abs(Math.sin(phase)) * 0.04 * Math.min(speed / 4, 1.5) : Math.sin(phase) * 0.004; // idle breathing
    body.rotation.x = lerp(body.rotation.x, moving ? Math.min(speed * 0.012, 0.15) : 0, 0.1);
    body.rotation.y = lerp(body.rotation.y, moving ? Math.sin(phase) * 0.06 : 0, 0.2);
  };
  return root;
}
