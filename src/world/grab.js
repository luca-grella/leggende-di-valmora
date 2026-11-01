// Things that can be picked up, carried and thrown: vases, apples, balls,
// books inside houses, crates and pots around the town squares. A thrown
// object bounces, and hitting a guard knocks them dizzy for a few seconds.

import * as THREE from 'three';
import { heightAt, TOWNS } from './heightfield.js';
import { mulberry32 } from '../core/noise.js';

const KINDS = {
  vaso: { name: 'il vaso', make: () => { const g = new THREE.Group(); const m = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.09, 0.32, 10), new THREE.MeshStandardMaterial({ color: 0x3d7dd9, roughness: 0.3 })); m.position.y = 0.16; g.add(m); return g; }, r: 0.14 },
  mela: { name: 'la mela', make: () => { const g = new THREE.Group(); const m = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), new THREE.MeshStandardMaterial({ color: 0xd62828, roughness: 0.4 })); m.position.y = 0.08; g.add(m); return g; }, r: 0.08 },
  palla: { name: 'la palla', make: () => { const g = new THREE.Group(); const m = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 10), new THREE.MeshStandardMaterial({ color: 0xffd23f, roughness: 0.5 })); m.position.y = 0.16; g.add(m); return g; }, r: 0.16, bouncy: true },
  libro: { name: 'il libro', make: () => { const g = new THREE.Group(); const m = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.06, 0.3), new THREE.MeshStandardMaterial({ color: 0x7b1fa2 })); m.position.y = 0.03; g.add(m); return g; }, r: 0.12 },
  cassa: { name: 'la cassa', make: () => { const g = new THREE.Group(); const m = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.55), new THREE.MeshStandardMaterial({ color: 0xa47148, roughness: 0.9, flatShading: true })); m.position.y = 0.275; g.add(m); return g; }, r: 0.3, heavy: true },
  vasofiori: { name: 'il vaso di fiori', make: () => { const g = new THREE.Group(); const p = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.15, 0.3, 10), new THREE.MeshStandardMaterial({ color: 0xb5523b })); p.position.y = 0.15; const f = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 0), new THREE.MeshStandardMaterial({ color: 0xff6b9a, flatShading: true })); f.position.y = 0.42; g.add(p, f); return g; }, r: 0.22 },
};

export class Grab {
  constructor(game) {
    this.game = game;
    this.items = [];
    this.held = null;
    // a few things to play with around every town square
    const rnd = mulberry32(99);
    for (const t of TOWNS) for (let i = 0; i < 5; i++) {
      const a = rnd() * Math.PI * 2, d = 6 + rnd() * 9;
      this.spawn(['cassa', 'palla', 'vasofiori', 'cassa', 'mela'][i], t.x + Math.cos(a) * d, null, t.z + Math.sin(a) * d, false);
    }
  }

  spawn(kind, x, y, z, indoor) {
    const k = KINDS[kind];
    const obj = k.make();
    obj.traverse((o) => { o.castShadow = true; });
    const it = { kind, k, obj, indoor, vel: new THREE.Vector3(), resting: true };
    obj.position.set(x, y ?? heightAt(x, z), z);
    this.game.scene.add(obj);
    this.items.push(it);
    return it;
  }

  clearIndoor() {
    if (this.held?.indoor) this.drop();
    for (const it of this.items.filter((i) => i.indoor)) { this.game.scene.remove(it.obj); this.items.splice(this.items.indexOf(it), 1); }
  }

  floor(it, x, z) {
    const ind = this.game.player.indoor;
    return it.indoor && ind ? ind.y : heightAt(x, z);
  }

  nearest(pos) {
    if (this.held) return { kind: 'throw', d: 99, hint: `A · Lancia ${this.held.k.name}` };
    let best = null;
    for (const it of this.items) {
      if (!it.resting) continue;
      const d = Math.hypot(pos.x - it.obj.position.x, pos.z - it.obj.position.z);
      if (d < 1.5 && Math.abs(pos.y - it.obj.position.y) < 1.6 && (!best || d < best.d)) best = { kind: 'grab', it, d, hint: `A · Prendi ${it.k.name}` };
    }
    return best;
  }

  pick(it) {
    this.held = it;
    it.resting = false;
    const body = this.game.player.model.userData.body;
    body.add(it.obj);
    it.obj.position.set(0, it.k.heavy ? 1.25 : 1.1, it.k.heavy ? 0.42 : 0.32);
    it.obj.rotation.set(0, 0, 0);
  }

  // drops what is held at the player's feet
  drop() {
    const it = this.held;
    if (!it) return;
    this.held = null;
    const P = this.game.player.pos;
    it.obj.removeFromParent();
    this.game.scene.add(it.obj);
    it.obj.position.set(P.x + Math.sin(this.game.player.facing) * 0.7, P.y + 1, P.z + Math.cos(this.game.player.facing) * 0.7);
    it.vel.set(0, 0, 0);
    it.resting = false;
  }

  throw() {
    const it = this.held;
    if (!it) return;
    const p = this.game.player, f = p.facing;
    this.drop();
    const speed = it.k.heavy ? 6 : 11;
    it.vel.set(Math.sin(f) * speed + p.vel.x, it.k.heavy ? 3 : 4.5, Math.cos(f) * speed + p.vel.z);
    it.thrown = true;
  }

  update(dt) {
    const game = this.game;
    if (this.held && (game.battle.active || game.player.vehicle || game.player.swimming)) this.drop();
    const ind = game.player.indoor;
    for (const it of this.items) {
      if (it.resting || it === this.held) continue;
      if (it.indoor !== !!ind && it.indoor) continue;
      const o = it.obj.position;
      it.vel.y -= 22 * dt;
      o.addScaledVector(it.vel, dt);
      if (ind && it.indoor) { // bounce off the walls of the room
        if (o.x < ind.x0 || o.x > ind.x1) { o.x = Math.max(ind.x0, Math.min(ind.x1, o.x)); it.vel.x *= -0.5; }
        if (o.z < ind.z0 || o.z > ind.z1) { o.z = Math.max(ind.z0, Math.min(ind.z1, o.z)); it.vel.z *= -0.5; }
      }
      it.obj.rotation.x += it.vel.z * dt * 2; it.obj.rotation.z -= it.vel.x * dt * 2;
      const g = this.floor(it, o.x, o.z);
      if (o.y <= g) {
        o.y = g;
        it.vel.y = Math.abs(it.vel.y) > 2 ? -it.vel.y * (it.k.bouncy ? 0.7 : 0.3) : 0;
        it.vel.x *= 0.7; it.vel.z *= 0.7;
        if (!it.vel.y && Math.hypot(it.vel.x, it.vel.z) < 0.3) { it.resting = true; it.thrown = false; it.obj.rotation.set(0, it.obj.rotation.y, 0); }
      }
      // a flying object knocks a guard dizzy
      if (it.thrown && !it.indoor) for (const gd of game.crime.guards) {
        if (gd.stun > 0) continue;
        const gp = gd.obj.position;
        if (Math.hypot(gp.x - o.x, gp.z - o.z) < 0.7 && o.y - gp.y < 2) {
          it.thrown = false; it.vel.multiplyScalar(-0.3);
          game.crime.bonk(gd);
        }
      }
    }
  }
}
