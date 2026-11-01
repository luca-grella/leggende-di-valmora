// Low-poly human figure used for the player and the townsfolk, with simple
// walk/run animation driven by swinging arm and leg pivots.

import * as THREE from 'three';

const mats = new Map();
function mat(hex) {
  if (!mats.has(hex)) mats.set(hex, new THREE.MeshStandardMaterial({ color: hex, roughness: 0.8, flatShading: true }));
  return mats.get(hex);
}

function part(geo, hex, x, y, z) {
  const m = new THREE.Mesh(geo, mat(hex));
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

export function makeCharacter({ skin = 0xf1c7a3, shirt = 0xd94a3d, pants = 0x2e3f63, shoes = 0x2a2a2a, hair = 0x3b2a1e, hat = 0xd94a3d, hatBrim = 0xffffff, backpack = 0xf2c14e, scale = 1, longHair = false, top = null } = {}) {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const torso = part(new THREE.CapsuleGeometry(0.27, 0.42, 3, 8), shirt, 0, 1.12, 0);
  torso.scale.set(1, 1, 0.75);
  body.add(torso);
  body.add(part(new THREE.SphereGeometry(0.255, 12, 10), skin, 0, 1.68, 0));
  // hair and cap
  const hairM = part(new THREE.SphereGeometry(0.265, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), hair, 0, 1.7, -0.02);
  body.add(hairM);
  if (longHair) { const lh = part(new THREE.SphereGeometry(0.2, 10, 8), hair, 0, 1.5, -0.16); lh.scale.set(1.25, 1.7, 0.7); body.add(lh); }
  if (top !== null) { const tp = part(new THREE.BoxGeometry(0.5, 0.16, 0.36), top, 0, 1.3, 0.02); body.add(tp); } // underwear top
  if (hat !== null) {
    body.add(part(new THREE.SphereGeometry(0.275, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.42), hat, 0, 1.73, 0));
    const brim = part(new THREE.CylinderGeometry(0.2, 0.2, 0.03, 12, 1, false, -Math.PI / 2, Math.PI), hatBrim, 0, 1.79, 0.17);
    brim.scale.set(1.1, 1, 1.25);
    body.add(brim);
  }
  // eyes
  const eyeGeo = new THREE.SphereGeometry(0.035, 6, 6);
  body.add(part(eyeGeo, 0x1d1d1d, -0.085, 1.7, 0.225), part(eyeGeo, 0x1d1d1d, 0.085, 1.7, 0.225));
  if (backpack !== null) {
    const bp = part(new THREE.BoxGeometry(0.42, 0.46, 0.2), backpack, 0, 1.18, -0.27);
    body.add(bp);
  }

  const limb = (hex, len, r) => {
    const pivot = new THREE.Group();
    const m = part(new THREE.CapsuleGeometry(r, len, 2, 6), hex, 0, -len / 2 - r, 0);
    pivot.add(m);
    return pivot;
  };
  const armL = limb(shirt, 0.42, 0.075), armR = limb(shirt, 0.42, 0.075);
  armL.position.set(-0.36, 1.42, 0); armR.position.set(0.36, 1.42, 0);
  armL.add(part(new THREE.SphereGeometry(0.075, 6, 6), skin, 0, -0.62, 0));
  armR.add(part(new THREE.SphereGeometry(0.075, 6, 6), skin, 0, -0.62, 0));
  const legL = limb(pants, 0.5, 0.1), legR = limb(pants, 0.5, 0.1);
  legL.position.set(-0.13, 0.78, 0); legR.position.set(0.13, 0.78, 0);
  legL.add(part(new THREE.BoxGeometry(0.17, 0.1, 0.28), shoes, 0, -0.73, 0.05));
  legR.add(part(new THREE.BoxGeometry(0.17, 0.1, 0.28), shoes, 0, -0.73, 0.05));
  body.add(armL, armR, legL, legR);
  root.scale.setScalar(scale);
  root.userData.body = body;

  let phase = 0;
  root.userData.animate = (dt, speed) => {
    if (root.userData.sitting) { // riding: knees forward, hands on the handlebar
      legL.rotation.x = legR.rotation.x = -1.35;
      armL.rotation.x = armR.rotation.x = -1.1;
      body.position.y = 0; body.rotation.x = 0.12;
      return;
    }
    const moving = speed > 0.2;
    phase += dt * (moving ? 2.2 + speed * 0.9 : 0);
    const amp = moving ? Math.min(0.25 + speed * 0.07, 0.95) : 0;
    const target = Math.sin(phase) * amp;
    legL.rotation.x = THREE.MathUtils.lerp(legL.rotation.x, target, 0.4);
    legR.rotation.x = THREE.MathUtils.lerp(legR.rotation.x, -target, 0.4);
    armL.rotation.x = THREE.MathUtils.lerp(armL.rotation.x, -target * 0.8, 0.4);
    armR.rotation.x = THREE.MathUtils.lerp(armR.rotation.x, target * 0.8, 0.4);
    body.position.y = moving ? Math.abs(Math.sin(phase)) * 0.05 * Math.min(speed / 4, 1.5) : 0;
    body.rotation.x = THREE.MathUtils.lerp(body.rotation.x, moving ? Math.min(speed * 0.012, 0.15) : 0, 0.1);
  };
  return root;
}
