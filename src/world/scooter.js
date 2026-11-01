// A small low-poly scooter the player can ride (see Player.mount).

import * as THREE from 'three';

const mats = new Map();
const mat = (hex, opts = {}) => {
  const k = hex + JSON.stringify(opts);
  if (!mats.has(k)) mats.set(k, new THREE.MeshStandardMaterial({ color: hex, roughness: 0.45, ...opts }));
  return mats.get(k);
};

function part(g, geo, m, x, y, z) {
  const o = new THREE.Mesh(geo, m);
  o.position.set(x, y, z);
  o.castShadow = true;
  g.add(o);
  return o;
}

export function makeScooter(color = 0xe23b3b) {
  const g = new THREE.Group();
  const paint = mat(color, { metalness: 0.3, roughness: 0.3 });
  const dark = mat(0x222222, { roughness: 0.8 });
  part(g, new THREE.BoxGeometry(0.5, 0.3, 1.25), paint, 0, 0.45, -0.05); // deck and body
  part(g, new THREE.BoxGeometry(0.55, 0.42, 0.65), paint, 0, 0.62, -0.38); // rear cowl
  part(g, new THREE.BoxGeometry(0.42, 0.12, 0.62), dark, 0, 0.88, -0.36); // seat
  part(g, new THREE.BoxGeometry(0.52, 0.95, 0.14), paint, 0, 0.9, 0.55).rotation.x = -0.25; // leg shield
  part(g, new THREE.CylinderGeometry(0.04, 0.04, 0.6, 6), dark, 0, 1.15, 0.68).rotation.x = -0.3; // stem
  part(g, new THREE.CylinderGeometry(0.03, 0.03, 0.75, 6), dark, 0, 1.42, 0.62).rotation.z = Math.PI / 2; // handlebar
  part(g, new THREE.SphereGeometry(0.09, 10, 8), mat(0xfff6c9, { emissive: 0xffe08a, emissiveIntensity: 1.5 }), 0, 1.3, 0.76);
  for (const z of [-0.62, 0.62]) {
    const w = part(g, new THREE.CylinderGeometry(0.27, 0.27, 0.16, 16), dark, 0, 0.27, z);
    w.rotation.z = Math.PI / 2;
    part(g, new THREE.CylinderGeometry(0.12, 0.12, 0.18, 10), mat(0xc0c0c0, { metalness: 0.8 }), 0, 0.27, z).rotation.z = Math.PI / 2;
  }
  return g;
}
