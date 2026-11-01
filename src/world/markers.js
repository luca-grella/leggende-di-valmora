// Small 3D signposts shared by trainers and missions: the "!" bubble over a
// head, tall light beacons for destinations and rings for race checkpoints.

import * as THREE from 'three';

const texCache = new Map();
function textTexture(text, bg, fg) {
  const k = `${text}${bg}${fg}`;
  if (texCache.has(k)) return texCache.get(k);
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = bg;
  ctx.beginPath(); ctx.arc(64, 64, 54, 0, Math.PI * 2); ctx.fill();
  ctx.lineWidth = 8; ctx.strokeStyle = '#fff'; ctx.stroke();
  ctx.fillStyle = fg; ctx.font = '900 76px system-ui, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, 64, 70);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  texCache.set(k, t);
  return t;
}

// A round badge that always faces the camera, e.g. bubble('!') over a trainer.
export function bubble(text = '!', bg = '#e8573c', fg = '#fff') {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: textTexture(text, bg, fg), depthTest: false, transparent: true }));
  s.scale.setScalar(0.8);
  s.position.y = 2.45;
  s.renderOrder = 10;
  return s;
}

// A tall column of light visible from far away, with a ring on the ground.
export function beacon(color = 0xffd23f) {
  const g = new THREE.Group();
  const col = new THREE.Mesh(
    new THREE.CylinderGeometry(1.6, 1.6, 60, 20, 1, true),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide, fog: false }),
  );
  col.position.y = 30;
  const ring = new THREE.Mesh(new THREE.RingGeometry(2.6, 3.2, 40), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, depthWrite: false, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.15;
  g.add(col, ring);
  g.userData.animate = (t) => { ring.scale.setScalar(1 + Math.sin(t * 4) * 0.08); col.material.opacity = 0.22 + Math.sin(t * 3) * 0.06; };
  return g;
}

// An upright ring to drive through.
export function checkpoint(color = 0x3ad1ff) {
  const g = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(4.2, 0.35, 10, 40), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.4, transparent: true, opacity: 0.9 }));
  ring.position.y = 4.4;
  g.add(ring);
  g.userData.animate = (t) => (ring.rotation.z = t * 0.8);
  return g;
}
