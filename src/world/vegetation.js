// Shared low-poly geometries and materials for trees, rocks, flowers and grass.
// Every model is merged into one geometry with vertex colours so each type
// draws as a single InstancedMesh per chunk.

import * as THREE from 'three';
import { photoDetail } from './textures.js';
import { IS_MOBILE } from '../core/quality.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mulberry32 } from '../core/noise.js';

export const windUniforms = { uTime: { value: 0 } };

// Injects a cheap wind sway: vertices bend more the higher they are above the base.
function addWind(material, strength, power = 1.5) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = windUniforms.uTime;
    // double-sided foliage: keep the same normal on both faces, otherwise
    // three.js flips it on the back face and the blades turn black
    if (material.side === THREE.DoubleSide) {
      shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_begin>', '#include <normal_fragment_begin>\n  normal = normalize( vNormal );');
    }
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        #ifdef USE_INSTANCING
          vec4 wOrigin = modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        #else
          vec4 wOrigin = modelMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        #endif
        float bend = pow(max(position.y, 0.0), ${power.toFixed(2)}) * ${strength.toFixed(3)};
        float ph = uTime * 1.6 + wOrigin.x * 0.21 + wOrigin.z * 0.17;
        transformed.x += (sin(ph) + 0.4 * sin(ph * 2.7)) * bend;
        transformed.z += cos(ph * 0.8) * bend * 0.6;`
      );
  };
  // the source of every onBeforeCompile above is identical, so give each
  // strength its own program cache key or three.js would share one shader
  material.customProgramCacheKey = () => `wind-${strength}-${power}`;
  return material;
}

function colored(geo, hex, jitter = 0, seed = 1) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  const c = new THREE.Color(hex);
  const rnd = mulberry32(seed);
  const n = g.attributes.position.count;
  const col = new Float32Array(n * 3);
  for (let i = 0; i < n; i += 3) {
    const k = 1 + (rnd() - 0.5) * jitter;
    for (let j = 0; j < 3 && i + j < n; j++) {
      col[(i + j) * 3] = c.r * k;
      col[(i + j) * 3 + 1] = c.g * k;
      col[(i + j) * 3 + 2] = c.b * k;
    }
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.deleteAttribute('uv');
  return g;
}

function blob(r, detail, x, y, z, sx = 1, sy = 1, sz = 1, seed = 1) {
  // rounder, lumpier canopies on desktop; phones keep the light version
  const g = new THREE.IcosahedronGeometry(r, detail + (detail > 0 && !IS_MOBILE ? 1 : 0));
  const p = g.attributes.position;
  const rnd = mulberry32(seed);
  const cache = new Map();
  for (let i = 0; i < p.count; i++) {
    const key = `${p.getX(i).toFixed(3)},${p.getY(i).toFixed(3)},${p.getZ(i).toFixed(3)}`;
    if (!cache.has(key)) cache.set(key, 0.85 + rnd() * 0.3);
    const k = cache.get(key);
    p.setXYZ(i, p.getX(i) * k * sx + x, p.getY(i) * k * sy + y, p.getZ(i) * k * sz + z);
  }
  return g;
}

function trunk(h, r0, r1, color) {
  const g = new THREE.CylinderGeometry(r1, r0, h, 7, 1);
  g.translate(0, h / 2, 0);
  return colored(g, color, 0.15);
}

const TREE_BUILDERS = {
  broad: () => {
    const parts = [trunk(3.2, 0.42, 0.28, 0x6b4a2f)];
    const greens = [0x3f7d34, 0x4b8f3a, 0x5a9a41];
    parts.push(colored(blob(2.2, 1, 0, 4.2, 0, 1.1, 0.9, 1.1, 3), greens[0], 0.25, 3));
    parts.push(colored(blob(1.6, 1, 1.2, 5.0, 0.4, 1, 0.9, 1, 4), greens[1], 0.25, 4));
    parts.push(colored(blob(1.5, 1, -1.0, 5.2, -0.6, 1, 0.9, 1, 5), greens[2], 0.25, 5));
    parts.push(colored(blob(1.3, 1, 0.2, 6.2, 0.1, 1, 0.9, 1, 6), greens[1], 0.25, 6));
    // a few smaller clumps so the crown is not a single ball
    parts.push(colored(blob(1.0, 1, -1.6, 4.4, 0.9, 1, 0.85, 1, 8), greens[2], 0.25, 8));
    parts.push(colored(blob(0.9, 1, 1.7, 4.1, -0.9, 1, 0.85, 1, 9), greens[0], 0.25, 9));
    parts.push(colored(blob(0.8, 1, 0.4, 3.6, 1.7, 1, 0.8, 1, 10), greens[1], 0.25, 10));
    return mergeGeometries(parts);
  },
  pine: () => {
    const parts = [trunk(2.4, 0.32, 0.22, 0x5b3d26)];
    const tiers = [[2.4, 3.2, 1.6], [1.9, 2.8, 3.2], [1.3, 2.4, 4.7], [0.7, 1.8, 6.0]];
    tiers.forEach(([r, h, y], i) => {
      const c = new THREE.ConeGeometry(r, h, 8, 1);
      c.translate(0, y + h / 2 - 0.4, 0);
      parts.push(colored(c, i % 2 ? 0x2f5d3a : 0x356b41, 0.2, 10 + i));
    });
    return mergeGeometries(parts);
  },
  snowpine: () => {
    const parts = [trunk(2.2, 0.32, 0.22, 0x5b3d26)];
    const tiers = [[2.3, 3.0, 1.5], [1.8, 2.6, 3.0], [1.2, 2.2, 4.4], [0.6, 1.6, 5.6]];
    tiers.forEach(([r, h, y], i) => {
      const c = new THREE.ConeGeometry(r, h, 8, 1);
      c.translate(0, y + h / 2 - 0.4, 0);
      parts.push(colored(c, 0x2b5640, 0.2, 20 + i));
      const s = new THREE.ConeGeometry(r * 0.55, h * 0.45, 8, 1);
      s.translate(0, y + h - 0.55, 0);
      parts.push(colored(s, 0xf2f6fb, 0.05, 30 + i));
    });
    return mergeGeometries(parts);
  },
  cypress: () => {
    const parts = [trunk(1.2, 0.25, 0.2, 0x5b3d26)];
    parts.push(colored(blob(1, 1, 0, 4.2, 0, 0.9, 3.6, 0.9, 7), 0x2f5a2e, 0.2, 7));
    return mergeGeometries(parts);
  },
  palm: () => {
    const parts = [];
    let x = 0, y = 0;
    for (let i = 0; i < 6; i++) {
      const seg = new THREE.CylinderGeometry(0.22 - i * 0.015, 0.26 - i * 0.015, 1.25, 6, 1);
      seg.rotateZ(-0.06 * i);
      seg.translate(x, y + 0.6, 0);
      parts.push(colored(seg, i % 2 ? 0x8a6a45 : 0x7a5c3a, 0.1, 40 + i));
      x += 0.08 * i;
      y += 1.2;
    }
    for (let i = 0; i < 7; i++) {
      const leaf = new THREE.ConeGeometry(0.55, 3.6, 4, 1);
      leaf.rotateX(Math.PI / 2);
      leaf.scale(1, 0.25, 1);
      leaf.translate(0, 0, 1.7);
      leaf.rotateX(0.45);
      leaf.rotateY((i / 7) * Math.PI * 2);
      leaf.translate(x, y, 0);
      parts.push(colored(leaf, i % 2 ? 0x3f9a3c : 0x4fae45, 0.15, 50 + i));
    }
    const nut = new THREE.IcosahedronGeometry(0.35, 0);
    nut.translate(x, y - 0.3, 0.2);
    parts.push(colored(nut, 0x6a4a2a, 0.1, 60));
    return mergeGeometries(parts);
  },
  cactus: () => {
    const parts = [];
    const body = new THREE.CapsuleGeometry(0.42, 3.2, 3, 8);
    body.translate(0, 2, 0);
    parts.push(colored(body, 0x4f8a45, 0.15, 70));
    const arm = new THREE.CapsuleGeometry(0.28, 1.2, 3, 7);
    const a1 = arm.clone(); a1.translate(0.85, 2.6, 0); parts.push(colored(a1, 0x56924a, 0.15, 71));
    const j1 = new THREE.CapsuleGeometry(0.26, 0.5, 2, 6); j1.rotateZ(Math.PI / 2); j1.translate(0.55, 2.0, 0); parts.push(colored(j1, 0x56924a, 0.15, 72));
    const a2 = arm.clone(); a2.scale(1, 0.8, 1); a2.translate(-0.8, 3.1, 0); parts.push(colored(a2, 0x56924a, 0.15, 73));
    const j2 = new THREE.CapsuleGeometry(0.24, 0.45, 2, 6); j2.rotateZ(Math.PI / 2); j2.translate(-0.5, 2.6, 0); parts.push(colored(j2, 0x56924a, 0.15, 74));
    return mergeGeometries(parts);
  },
};

export const TREE_TYPES = Object.keys(TREE_BUILDERS);
const treeGeos = {};
let treeMat;
export function treeAssets(type) {
  if (!treeGeos[type]) treeGeos[type] = TREE_BUILDERS[type]();
  if (!treeMat) treeMat = photoDetail(addWind(new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: false, roughness: 0.85 }), 0.012, 1.4), 'tree');
  return { geometry: treeGeos[type], material: treeMat };
}

let rockGeo, rockMat;
export function rockAssets() {
  if (!rockGeo) {
    const g = blob(1, 0, 0, 0.35, 0, 1.3, 0.75, 1.1, 90);
    rockGeo = colored(g, 0xffffff, 0.25, 91); // tinted per region through instanceColor
    rockMat = photoDetail(new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95 }), 'rock');
  }
  return { geometry: rockGeo, material: rockMat };
}

let flowerGeo, flowerMat;
export function flowerAssets() {
  if (!flowerGeo) {
    const stem = new THREE.CylinderGeometry(0.02, 0.025, 0.42, 3);
    stem.translate(0, 0.21, 0);
    const stemC = colored(stem, 0x3b7a2e, 0, 1);
    const head = new THREE.CircleGeometry(0.13, 5);
    head.rotateX(-Math.PI / 2 + 0.3);
    head.translate(0, 0.43, 0);
    const headC = colored(head, 0xffffff, 0, 2);
    const eye = new THREE.CircleGeometry(0.045, 5);
    eye.rotateX(-Math.PI / 2 + 0.3);
    eye.translate(0, 0.435, 0);
    const eyeC = colored(eye, 0xffd23f, 0, 3);
    flowerGeo = mergeGeometries([stemC, headC, eyeC]);
    // instanceColor tints only the petals: keep stem/eye by storing a mask in uv-free 'petal' attribute
    const n = flowerGeo.attributes.position.count;
    const mask = new Float32Array(n);
    const stemCount = stemC.attributes.position.count, headCount = headC.attributes.position.count;
    for (let i = stemCount; i < stemCount + headCount; i++) mask[i] = 1;
    flowerGeo.setAttribute('petal', new THREE.BufferAttribute(mask, 1));
    flowerMat = addWind(new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.8 }), 0.12, 1.2);
    const prev = flowerMat.onBeforeCompile;
    flowerMat.onBeforeCompile = (shader) => {
      prev(shader);
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nattribute float petal;')
        .replace('#include <color_vertex>', `#include <color_vertex>
          #ifdef USE_INSTANCING_COLOR
            vColor.xyz = mix(color.xyz, instanceColor.xyz, petal);
          #endif`);
    };
    flowerMat.customProgramCacheKey = () => 'flower-petal';
  }
  return { geometry: flowerGeo, material: flowerMat };
}

// Grass clump: crossed tapered blades, dark at the root and light at the tip.
function grassClump(blades, height, width, seed) {
  const rnd = mulberry32(seed);
  const pos = [], col = [];
  for (let b = 0; b < blades; b++) {
    const a = rnd() * Math.PI;
    const ox = (rnd() - 0.5) * 0.5, oz = (rnd() - 0.5) * 0.5;
    const h = height * (0.7 + rnd() * 0.5), w = width * (0.7 + rnd() * 0.5);
    const lean = (rnd() - 0.5) * 0.35;
    const dx = Math.cos(a) * w, dz = Math.sin(a) * w;
    const tx = ox + Math.sin(a) * lean, tz = oz - Math.cos(a) * lean;
    // two triangles forming a tapered blade with a mid segment
    const p0 = [ox - dx, 0, oz - dz], p1 = [ox + dx, 0, oz + dz];
    const m0 = [ox - dx * 0.6 + (tx - ox) * 0.4, h * 0.55, oz - dz * 0.6 + (tz - oz) * 0.4];
    const m1 = [ox + dx * 0.6 + (tx - ox) * 0.4, h * 0.55, oz + dz * 0.6 + (tz - oz) * 0.4];
    const tip = [tx, h, tz];
    const tris = [p0, p1, m1, p0, m1, m0, m0, m1, tip];
    for (const v of tris) {
      pos.push(...v);
      const t = v[1] / height;
      col.push(0.35 + t * 0.75, 0.5 + t * 0.6, 0.3 + t * 0.4);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  // point normals up so lighting is soft and even, like stylised console grass
  const nrm = g.attributes.normal;
  for (let i = 0; i < nrm.count; i++) nrm.setXYZ(i, nrm.getX(i) * 0.3, 1, nrm.getZ(i) * 0.3);
  nrm.needsUpdate = true;
  return g;
}

let tallGeo, tuftGeo, grassMat;
export function grassAssets() {
  if (!tallGeo) {
    tallGeo = grassClump(12, 1.15, 0.12, 7);
    tuftGeo = grassClump(5, 0.45, 0.07, 8);
    grassMat = addWind(new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 1 }), 0.16, 1.6);
  }
  return { tall: tallGeo, tuft: tuftGeo, material: grassMat };
}
