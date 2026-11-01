// Moves the two people during romantic scenes: every choice gets its own
// staging (where each one stands, sits or kneels, how arms and head move) and
// a camera framing, with a gentle loop (massaging, swaying) while she talks.

import * as THREE from 'three';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ease = (t) => t * t * (3 - 2 * t);

// pose keys -> [object, property]
function joints(o) {
  const L = o.userData.limbs, b = o.userData.body;
  return {
    y: [b.position, 'y'], lean: [b.rotation, 'x'], tilt: [b.rotation, 'z'], twist: [b.rotation, 'y'],
    armLx: [L.armL.upper.rotation, 'x'], armLz: [L.armL.upper.rotation, 'z'], armLl: [L.armL.lower.rotation, 'x'],
    armRx: [L.armR.upper.rotation, 'x'], armRz: [L.armR.upper.rotation, 'z'], armRl: [L.armR.lower.rotation, 'x'],
    legLx: [L.legL.upper.rotation, 'x'], legLl: [L.legL.lower.rotation, 'x'], legRx: [L.legR.upper.rotation, 'x'], legRl: [L.legR.lower.rotation, 'x'],
    headX: [L.head.rotation, 'x'], headY: [L.head.rotation, 'y'], headZ: [L.head.rotation, 'z'],
    rollY: [o.rotation, 'y'],
  };
}
const NEUTRAL = { y: 0, lean: 0, tilt: 0, twist: 0, armLx: 0, armLz: -0.06, armLl: -0.08, armRx: 0, armRz: 0.06, armRl: -0.08, legLx: 0, legLl: 0, legRx: 0, legRl: 0, headX: 0, headY: 0, headZ: 0 };
const SIT_GROUND = { y: -0.83, legLx: -1.5, legLl: 0, legRx: -1.5, legRl: 0, armLx: 0.7, armRx: 0.7, armLl: 0, armRl: 0, lean: -0.15 };
const KNEEL = { y: -0.42, legLx: -1.55, legLl: 1.6, legRx: 0.25, legRl: 1.5 };

// smoothly moves joints ([obj, pose]) and positions ([obj, {x, z, ry}]) together
async function tween(poses, moves = [], ms = 450) {
  const tracks = [];
  for (const [o, pose] of poses) {
    const J = joints(o);
    for (const [k, v] of Object.entries(pose)) { const [ref, key] = J[k]; tracks.push([ref, key, ref[key], v]); }
  }
  for (const [o, m] of moves) {
    if (m.x != null) tracks.push([o.position, 'x', o.position.x, m.x], [o.position, 'z', o.position.z, m.z]);
    if (m.ry != null) { let d = m.ry - o.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); tracks.push([o.rotation, 'y', o.rotation.y, o.rotation.y + d]); }
  }
  const steps = Math.max(1, Math.round(ms / 30));
  for (let i = 1; i <= steps; i++) {
    const t = ease(i / steps);
    for (const [ref, key, a, b] of tracks) ref[key] = a + (b - a) * t;
    await sleep(30);
  }
}

// repeats a small movement until stop() is called
function loop(fn) {
  let on = true, t = 0;
  (async () => { while (on) { t += 0.05; fn(t); await sleep(50); } })();
  return () => { on = false; };
}

export class Staging {
  // ctx: { game, me, her, stage: 'stand' | 'seat' | 'bed', anchor: Vector3, face }
  constructor(ctx) {
    Object.assign(this, ctx);
    for (const o of [this.me, this.her]) o.userData.posed = true;
    this.fwd = new THREE.Vector3(Math.sin(this.face), 0, Math.cos(this.face));
    this.side = new THREE.Vector3(this.fwd.z, 0, -this.fwd.x);
    this.y = this.anchor.y;
  }

  at(f, s = 0) { // a point in front (f) and to the side (s) of where she stands
    return { x: this.anchor.x + this.fwd.x * f + this.side.x * s, z: this.anchor.z + this.fwd.z * f + this.side.z * s };
  }

  camera(f, s, h, lookY = 1.2, lookF = 0.4) {
    const p = this.at(f, s), l = this.at(lookF, 0);
    this.game.cine = { pos: new THREE.Vector3(p.x, this.y + h, p.z), look: new THREE.Vector3(l.x, this.y + lookY, l.z) };
  }

  async act(kind) {
    const { me, her } = this;
    if (this.stage === 'bed') return this.bed(kind);
    if (this.stage === 'seat') return this.seat(kind);
    const faceMe = this.face, faceHer = this.face + Math.PI;
    her.userData.setBarefoot?.(['feet', 'legs'].includes(kind) || her.userData.barefoot);
    // back to standing, facing each other
    await tween([[me, NEUTRAL], [her, NEUTRAL]], [[her, { ...this.at(0), ry: faceMe }], [me, { ...this.at(0.75), ry: faceHer }]], 350);
    this.camera(0.4, 2.6, 1.5);
    switch (kind) {
      case 'kiss':
        await tween([[me, { lean: 0.13, headZ: 0.14 }], [her, { lean: 0.13, headZ: -0.14, armLx: -0.5, armRx: -0.5 }]], [[me, this.at(0.43)]], 600);
        this.camera(0.2, 1.5, 1.6, 1.55, 0.2);
        return loop((t) => { me.userData.limbs.head.rotation.z = 0.14 + Math.sin(t * 2) * 0.05; });
      case 'hair':
        await tween([[me, { armRx: -2.5, armRz: 0.35, armRl: -0.9 }], [her, { headZ: 0.25 }]], [[me, this.at(0.55)]], 600);
        return loop((t) => { me.userData.limbs.armR.upper.rotation.z = 0.35 + Math.sin(t * 3) * 0.12; });
      case 'shoulders': case 'back': {
        const up = kind === 'shoulders' ? -1.6 : -1.0;
        await tween([[me, { armLx: up, armRx: up, armLz: 0.3, armRz: -0.3, armLl: -0.4, armRl: -0.4 }], [her, { headX: 0.25 }]], [[me, { ...this.at(-0.42), ry: faceMe }]], 700);
        this.camera(0.3, 2.4, 1.6, 1.2, -0.2);
        return loop((t) => { const k = Math.sin(t * 6) * 0.18; me.userData.limbs.armL.lower.rotation.x = -0.4 + k; me.userData.limbs.armR.lower.rotation.x = -0.4 - k; });
      }
      case 'legs':
        await tween([[her, SIT_GROUND], [me, { ...KNEEL, armRx: -1.1, armLx: -0.9, lean: 0.2 }]], [[me, { ...this.at(0.55, 0.45), ry: faceMe - Math.PI / 2 }]], 800);
        this.camera(1.2, 2.6, 1.3, 0.5, 0.5);
        return loop((t) => { me.userData.limbs.armR.upper.rotation.x = -1.1 + Math.sin(t * 3) * 0.15; });
      case 'feet': case 'feetKiss': case 'feetLick': {
        const bend = kind === 'feet' ? { lean: 0.35, armLx: -0.95, armRx: -0.95, armLl: -0.3, armRl: -0.3 } : { lean: 0.8, headX: 0.4, armLx: -0.8, armRx: -0.8 };
        await tween([[her, SIT_GROUND], [me, { ...KNEEL, ...bend }]], [[me, { ...this.at(1.5), ry: faceHer }]], 800);
        this.camera(0.7, 2.9, 1.2, 0.35, 0.7);
        return loop((t) => {
          if (kind === 'feet') { const k = Math.sin(t * 5) * 0.15; me.userData.limbs.armL.lower.rotation.x = -0.2 + k; me.userData.limbs.armR.lower.rotation.x = -0.2 - k; }
          else me.userData.body.rotation.x = 0.75 + Math.sin(t * 2.5) * 0.06;
          her.userData.limbs.head.rotation.z = Math.sin(t * 1.5) * 0.1; // she watches, amused
        });
      }
      case 'neck': case 'ear': case 'whisper': {
        const p = this.at(0.2, 0.32);
        await tween([[me, { headZ: -0.3, lean: 0.1 }], [her, { headZ: 0.25 }]], [[me, { ...p, ry: Math.atan2(this.anchor.x - p.x, this.anchor.z - p.z) }]], 600);
        this.camera(0.5, -2.2, 1.6, 1.5, 0.1);
        return loop((t) => { me.userData.limbs.head.rotation.x = Math.sin(t * 3) * 0.08; });
      }
      case 'hug':
        await tween([[me, { armLx: -1.3, armRx: -1.3, armLz: -0.5, armRz: 0.5, armLl: -1.2, armRl: -1.2, lean: 0.08 }], [her, { armLx: -1.3, armRx: -1.3, armLz: -0.5, armRz: 0.5, armLl: -1.2, armRl: -1.2, headZ: 0.2 }]], [[me, this.at(0.34)]], 650);
        return loop((t) => { me.rotation.y = faceHer + Math.sin(t * 1.5) * 0.08; });
      case 'guide':
        await tween([[her, { armLx: -2.0, armRx: -2.0, armLz: -0.35, armRz: 0.35, armLl: -0.5, armRl: -0.5, lean: 0.12 }], [me, { armLx: -0.9, armRx: -0.9, armLz: -0.6, armRz: 0.6, armLl: -0.6, armRl: -0.6, lean: 0.1 }]], [[me, this.at(0.38)]], 700);
        this.camera(0.2, 1.9, 1.7, 1.4, 0.2);
        return loop((t) => { her.userData.body.rotation.y = Math.sin(t * 1.2) * 0.12; me.userData.body.rotation.y = -Math.sin(t * 1.2) * 0.12; });
      default:
        await tween([[her, { headZ: 0.2 }]], [], 300);
        return loop((t) => { her.userData.body.position.y = Math.abs(Math.sin(t * 6)) * 0.02; });
    }
  }

  // seated at a table or on the scooter: gestures only
  async seat(kind) {
    const { me, her } = this;
    const J = (o) => o.userData;
    if (kind === 'kiss' || kind === 'guide' || kind === 'neck') {
      await tween([[me, { lean: 0.35, headZ: 0.1 }], [her, { lean: 0.35, headZ: -0.1 }]], [], 500);
      return loop((t) => { J(her).limbs.head.rotation.z = -0.1 + Math.sin(t * 2) * 0.05; });
    }
    await tween([[me, { armRx: -1.2, armRl: -0.3 }], [her, { headZ: 0.25 }]], [], 450);
    return loop((t) => { J(her).body.position.y = Math.abs(Math.sin(t * 5)) * 0.015; J(me).limbs.armR.upper.rotation.z = Math.sin(t * 2) * 0.1; });
  }

  // lying in bed: turn towards each other, heads close
  async bed(kind) {
    const { me, her } = this;
    const close = ['kiss', 'neck', 'ear', 'whisper', 'guide', 'hug', 'hair'].includes(kind);
    await tween([[me, { rollY: close ? 0.45 : 0.15, headZ: close ? -0.25 : 0 }], [her, { rollY: close ? -0.45 : -0.15, headZ: close ? 0.25 : 0 }]], [], 600);
    return loop((t) => { her.userData.limbs.head.rotation.y = Math.sin(t * 1.4) * 0.1; });
  }

  async reset() {
    await tween([[this.me, NEUTRAL], [this.her, NEUTRAL]], [], 300);
  }
}

// which staging each choice uses
export const ACT = {
  'Baciala': 'kiss', 'Accarezzale i capelli': 'hair', 'Massaggiale le spalle': 'shoulders', 'Massaggiale la schiena': 'back',
  'Accarezzale le gambe': 'legs', 'Massaggiale i piedi': 'feet', 'Baciale i piedi': 'feetKiss', 'Leccale i piedi': 'feetLick',
  'Baciale il collo': 'neck', 'Leccale il collo': 'neck', "Mordicchiale l'orecchio": 'ear', 'Stringila a te': 'hug',
  "Sussurrale qualcosa all'orecchio": 'whisper', 'Lasciati guidare da lei…': 'guide',
};
