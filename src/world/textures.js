// Photographic textures (CC0, from Poly Haven) shared by the terrain and the
// buildings. Files live in public/textures and load in the background.

import * as THREE from 'three';

const loader = new THREE.TextureLoader();
const cache = new Map();

export function tex(name, { color = true, repeat = 1 } = {}) {
  const k = `${name}-${repeat}`;
  if (cache.has(k)) return cache.get(k);
  const t = loader.load(`textures/${name}.jpg`);
  if (color) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.setScalar(repeat);
  t.anisotropy = 8;
  cache.set(k, t);
  return t;
}
