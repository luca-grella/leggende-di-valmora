// Streams the world in 64 m chunks around the player: terrain mesh (two levels
// of detail, with skirts to hide seams), trees and rocks for every chunk, and
// flowers, tall grass and grass tufts only for the chunks close to the camera.

import * as THREE from 'three';
import { mulberry32, hash2 } from '../core/noise.js';
import { heightAt, groundColor, tallGrassAt, isRoad, townAt, biomeAt, SEA_LEVEL } from './heightfield.js';
import { regionAt } from './regions.js';
import { treeAssets, rockAssets, flowerAssets, grassAssets } from './vegetation.js';
import { TOWNS } from './heightfield.js';
import { tex } from './textures.js';

export const CHUNK = 64;

const KIND = { GRASS: 0, TALL: 1, PATH: 2, SHORE: 3, ROCK: 4 };

const terrainMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.93, metalness: 0 });
// Photographic detail on top of the biome colours: the vertex colour keeps the
// hue of each region, the photos add the grain (two scales to hide tiling).
// Rock on steep slopes, sand by the sea, cobblestones on the town squares.
terrainMat.onBeforeCompile = (sh) => {
  sh.uniforms.tGrass = { value: tex('aerial_grass_rock_diff') };
  sh.uniforms.tRock = { value: tex('aerial_rocks_02_diff') };
  sh.uniforms.tSand = { value: tex('coast_sand_01_diff') };
  sh.uniforms.tCobble = { value: tex('cobblestone_floor_01_diff') };
  sh.uniforms.uTowns = { value: TOWNS.map((t) => new THREE.Vector3(t.x, t.z, t.radius * 0.5)) };
  sh.vertexShader = sh.vertexShader
    .replace('#include <common>', '#include <common>\nvarying vec3 vWPos; varying vec3 vWN;')
    .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz; vWN = normalize(mat3(modelMatrix) * objectNormal);');
  sh.fragmentShader = sh.fragmentShader
    .replace('#include <common>', `#include <common>
varying vec3 vWPos; varying vec3 vWN;
uniform sampler2D tGrass, tRock, tSand, tCobble;
uniform vec3 uTowns[${TOWNS.length}];
float lum(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }`)
    .replace('#include <color_fragment>', `#include <color_fragment>
{
  vec2 p = vWPos.xz;
  float g = lum(texture2D(tGrass, p / 7.0).rgb) * 0.6 + lum(texture2D(tGrass, p / 41.0).rgb) * 0.4;
  float slope = 1.0 - clamp(vWN.y, 0.0, 1.0);
  vec2 rp = abs(vWN.x) > abs(vWN.z) ? vWPos.zy : vWPos.xy; // rock seen from the side on cliffs
  float r = lum(texture2D(tRock, mix(p, rp, smoothstep(0.5, 0.8, slope)) / 9.0).rgb);
  float s = lum(texture2D(tSand, p / 6.0).rgb);
  float d = mix(g / 0.36, r / 0.42, smoothstep(0.38, 0.7, slope));
  d = mix(d, s / 0.55, 1.0 - smoothstep(0.8, 2.0, vWPos.y));
  diffuseColor.rgb *= clamp(d, 0.55, 1.5);
  for (int i = 0; i < ${TOWNS.length}; i++) {
    float k = 1.0 - smoothstep(uTowns[i].z * 0.85, uTowns[i].z, distance(p, uTowns[i].xy));
    if (k > 0.0) diffuseColor.rgb = mix(diffuseColor.rgb, texture2D(tCobble, p / 3.0).rgb * 0.95, k * 0.9);
  }
}`);
};
terrainMat.customProgramCacheKey = () => 'terrain-photo';
const indexCache = {};
const tmpColor = new THREE.Color();
const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s3 = new THREE.Vector3(), p3 = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);

function gridIndex(res) {
  if (indexCache[res]) return indexCache[res];
  const n = res + 1, idx = [];
  for (let j = 0; j < res; j++) {
    for (let i = 0; i < res; i++) {
      const a = j * n + i, b = a + 1, c = a + n, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }
  // skirts: one extra ring of vertices pushed down, appended after the grid
  const base = n * n;
  const edges = [
    [...Array(n).keys()].map((i) => i), // north row
    [...Array(n).keys()].map((i) => res * n + i), // south row
    [...Array(n).keys()].map((j) => j * n), // west column
    [...Array(n).keys()].map((j) => j * n + res), // east column
  ];
  edges.forEach((edge, e) => {
    for (let k = 0; k < res; k++) {
      const a = edge[k], b = edge[k + 1];
      const sa = base + e * n + k, sb = sa + 1;
      idx.push(a, sa, b, b, sa, sb, a, b, sa, b, sb, sa); // both windings so skirts show from either side
    }
  });
  indexCache[res] = { index: idx, edges };
  return indexCache[res];
}

function buildTerrain(cx, cz, res) {
  const step = CHUNK / res, n = res + 1, ox = cx * CHUNK, oz = cz * CHUNK;
  const W = res + 3; // with a one-cell border for normals
  const H = new Float32Array(W * W);
  for (let j = 0; j < W; j++) for (let i = 0; i < W; i++) H[j * W + i] = heightAt(ox + (i - 1) * step, oz + (j - 1) * step);
  const { index, edges } = gridIndex(res);
  const vcount = n * n + 4 * n;
  const pos = new Float32Array(vcount * 3), nor = new Float32Array(vcount * 3), col = new Float32Array(vcount * 3);
  const kind = new Uint8Array(n * n), heights = new Float32Array(n * n);
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const h = H[(j + 1) * W + i + 1];
      const hl = H[(j + 1) * W + i], hr = H[(j + 1) * W + i + 2], hu = H[j * W + i + 1], hd = H[(j + 2) * W + i + 1];
      const dx = (hr - hl) / (2 * step), dz = (hd - hu) / (2 * step);
      const slope = Math.hypot(dx, dz);
      const v = j * n + i, x = ox + i * step, z = oz + j * step;
      pos[v * 3] = i * step; pos[v * 3 + 1] = h; pos[v * 3 + 2] = j * step;
      const inv = 1 / Math.hypot(dx, 1, dz);
      nor[v * 3] = -dx * inv; nor[v * 3 + 1] = inv; nor[v * 3 + 2] = -dz * inv;
      groundColor(x, z, h, slope, tmpColor);
      col[v * 3] = tmpColor.r; col[v * 3 + 1] = tmpColor.g; col[v * 3 + 2] = tmpColor.b;
      heights[v] = h;
      let k = KIND.GRASS;
      if (h < 1.5) k = KIND.SHORE;
      else if (slope > 0.6 || h > biomeAt(x, z).snowLine + 30) k = KIND.ROCK;
      else if (isRoad(x, z)) k = KIND.PATH;
      else { const t = townAt(x, z); if (t && Math.hypot(x - t.x, z - t.z) < t.radius + 20) k = KIND.PATH; else if (tallGrassAt(x, z, h)) k = KIND.TALL; }
      kind[v] = k;
    }
  }
  edges.forEach((edge, e) => {
    edge.forEach((v, k) => {
      const s = n * n + e * n + k;
      pos[s * 3] = pos[v * 3]; pos[s * 3 + 1] = pos[v * 3 + 1] - 6; pos[s * 3 + 2] = pos[v * 3 + 2];
      nor[s * 3] = nor[v * 3]; nor[s * 3 + 1] = nor[v * 3 + 1]; nor[s * 3 + 2] = nor[v * 3 + 2];
      col[s * 3] = col[v * 3]; col[s * 3 + 1] = col[v * 3 + 1]; col[s * 3 + 2] = col[v * 3 + 2];
    });
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setIndex(index);
  g.computeBoundingSphere();
  g.computeBoundingBox();
  const mesh = new THREE.Mesh(g, terrainMat);
  mesh.position.set(ox, 0, oz);
  mesh.receiveShadow = true;
  mesh.matrixAutoUpdate = false;
  mesh.updateMatrix();
  return { mesh, kind, heights, res, step };
}

function instanced(assets, list, castShadow = true, colors = null) {
  const mesh = new THREE.InstancedMesh(assets.geometry, assets.material, list.length);
  list.forEach((m, i) => mesh.setMatrixAt(i, m));
  if (colors) colors.forEach((c, i) => mesh.setColorAt(i, c));
  mesh.castShadow = castShadow;
  mesh.receiveShadow = true;
  mesh.computeBoundingSphere();
  return mesh;
}

function place(x, y, z, rotY, sx, sy = sx, sz = sx, tilt = 0) {
  q.setFromAxisAngle(up, rotY);
  if (tilt) q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), tilt));
  return new THREE.Matrix4().compose(p3.set(x, y, z), q, s3.set(sx, sy, sz));
}

export class ChunkManager {
  constructor(scene, quality) {
    this.scene = scene;
    this.q = quality;
    this.chunks = new Map();
    this.radius = quality.chunkRadius;
    this.lod0Radius = 2;
    this.nearRadius = quality.name === 'mobile' ? 1 : 2;
  }

  key(cx, cz) { return `${cx},${cz}`; }

  buildFar(c) {
    const rnd = mulberry32(Math.floor(hash2(c.cx, c.cz, 11) * 1e9));
    const ox = c.cx * CHUNK, oz = c.cz * CHUNK;
    const byType = {}, rocks = [], rockCols = [];
    c.trees = [];
    const region = regionAt(ox + CHUNK / 2, oz + CHUNK / 2);
    const density = biomeAt(ox + CHUNK / 2, oz + CHUNK / 2).treeDensity;
    const tries = Math.round(60 * density);
    for (let t = 0; t < tries; t++) {
      const x = ox + rnd() * CHUNK, z = oz + rnd() * CHUNK;
      const k = this.kindAt(c, x, z);
      if (k !== KIND.GRASS) continue;
      const h = this.sampleHeight(c, x, z);
      let type = regionAt(x, z).trees.type;
      if (type === 'broad' && h > 45) type = 'pine';
      if (type === 'palm' && h > 25) type = 'broad';
      const sc = 0.8 + rnd() * 0.7;
      (byType[type] ||= []).push(place(x, h - 0.2, z, rnd() * 6.28, sc, sc * (0.85 + rnd() * 0.3), sc));
      c.trees.push({ x, z, r: type === 'cactus' ? 0.6 * sc : 0.5 * sc });
    }
    const rockTries = 4 + Math.round(rnd() * 6) + (region.mountains > 80 ? 8 : 0);
    for (let t = 0; t < rockTries; t++) {
      const x = ox + rnd() * CHUNK, z = oz + rnd() * CHUNK;
      const k = this.kindAt(c, x, z);
      if (k === KIND.PATH || k === KIND.TALL) continue;
      const h = this.sampleHeight(c, x, z);
      if (h < -2) continue;
      const sc = 0.4 + rnd() * rnd() * 2.6;
      rocks.push(place(x, h - 0.15 * sc, z, rnd() * 6.28, sc * (0.8 + rnd() * 0.5), sc, sc * (0.8 + rnd() * 0.5), (rnd() - 0.5) * 0.4));
      rockCols.push(biomeAt(x, z).colors.rock.clone().multiplyScalar(0.9 + rnd() * 0.25));
      if (sc > 1.2) c.trees.push({ x, z, r: sc * 0.9 });
    }
    const group = new THREE.Group();
    for (const [type, list] of Object.entries(byType)) group.add(instanced(treeAssets(type), list));
    if (rocks.length) group.add(instanced(rockAssets(), rocks, true, rockCols));
    this.scene.add(group);
    c.far = group;
  }

  buildNear(c) {
    const rnd = mulberry32(Math.floor(hash2(c.cx, c.cz, 23) * 1e9));
    const ox = c.cx * CHUNK, oz = c.cz * CHUNK;
    const grass = grassAssets();
    const tall = [], tallCol = [], tufts = [], tuftCol = [], flowers = [], flowerCol = [];
    const dens = this.q.grassDensity;
    const tallStep = 0.95 / Math.sqrt(dens);
    for (let z = oz; z < oz + CHUNK; z += tallStep) {
      for (let x = ox; x < ox + CHUNK; x += tallStep) {
        const jx = x + (rnd() - 0.5) * tallStep, jz = z + (rnd() - 0.5) * tallStep;
        if (this.kindAt(c, jx, jz) !== KIND.TALL) continue;
        const h = this.sampleHeight(c, jx, jz);
        tall.push(place(jx, h - 0.05, jz, rnd() * 6.28, 0.85 + rnd() * 0.4));
        tallCol.push(tmpColor.copy(biomeAt(jx, jz).tall).multiplyScalar(0.85 + rnd() * 0.3).clone());
      }
    }
    const tuftCount = Math.round(380 * dens);
    for (let t = 0; t < tuftCount; t++) {
      const x = ox + rnd() * CHUNK, z = oz + rnd() * CHUNK;
      if (this.kindAt(c, x, z) !== KIND.GRASS) continue;
      const b = biomeAt(x, z);
      const h = this.sampleHeight(c, x, z);
      tufts.push(place(x, h - 0.03, z, rnd() * 6.28, 0.8 + rnd() * 0.8));
      tuftCol.push(tmpColor.copy(b.colors.grass2).lerp(b.colors.grass, rnd()).multiplyScalar(1.05).clone());
    }
    const region = regionAt(ox + CHUNK / 2, oz + CHUNK / 2);
    const flowerCount = Math.round(170 * biomeAt(ox + CHUNK / 2, oz + CHUNK / 2).flowers * dens);
    for (let t = 0; t < flowerCount; t++) {
      // flowers grow in small clusters
      const cxp = ox + rnd() * CHUNK, czp = oz + rnd() * CHUNK;
      const colors = regionAt(cxp, czp).flowerColors || region.flowerColors;
      const fc = new THREE.Color(colors[Math.floor(rnd() * colors.length)]);
      for (let k = 0; k < 4; k++) {
        const x = cxp + (rnd() - 0.5) * 2.5, z = czp + (rnd() - 0.5) * 2.5;
        if (this.kindAt(c, x, z) !== KIND.GRASS) continue;
        flowers.push(place(x, this.sampleHeight(c, x, z) - 0.02, z, rnd() * 6.28, 0.8 + rnd() * 0.6));
        flowerCol.push(fc);
      }
    }
    const group = new THREE.Group();
    if (tall.length) group.add(instanced({ geometry: grass.tall, material: grass.material }, tall, false, tallCol));
    if (tufts.length) group.add(instanced({ geometry: grass.tuft, material: grass.material }, tufts, false, tuftCol));
    if (flowers.length) group.add(instanced(flowerAssets(), flowers, false, flowerCol));
    this.scene.add(group);
    c.near = group;
  }

  kindAt(c, x, z) {
    const i = Math.round((x - c.cx * CHUNK) / c.t.step), j = Math.round((z - c.cz * CHUNK) / c.t.step);
    const n = c.t.res + 1;
    if (i < 0 || j < 0 || i >= n || j >= n) return KIND.ROCK;
    return c.t.kind[j * n + i];
  }

  // bilinear height from the chunk's own grid (much cheaper than heightAt)
  sampleHeight(c, x, z) {
    const n = c.t.res + 1, st = c.t.step;
    const fx = Math.min(Math.max((x - c.cx * CHUNK) / st, 0), c.t.res - 1e-4), fz = Math.min(Math.max((z - c.cz * CHUNK) / st, 0), c.t.res - 1e-4);
    const i = Math.floor(fx), j = Math.floor(fz), tx = fx - i, tz = fz - j;
    const H = c.t.heights;
    const a = H[j * n + i], b = H[j * n + i + 1], d = H[(j + 1) * n + i], e = H[(j + 1) * n + i + 1];
    return (a * (1 - tx) + b * tx) * (1 - tz) + (d * (1 - tx) + e * tx) * tz;
  }

  isTallGrass(x, z) {
    const c = this.chunks.get(this.key(Math.floor(x / CHUNK), Math.floor(z / CHUNK)));
    if (!c || !c.t) return tallGrassAt(x, z);
    return this.kindAt(c, x, z) === KIND.TALL;
  }

  buildChunk(cx, cz, lod) {
    const k = this.key(cx, cz);
    let c = this.chunks.get(k);
    const res = lod === 0 ? 32 : 16;
    if (c && c.lod !== lod) {
      this.scene.remove(c.t.mesh);
      c.t.mesh.geometry.dispose();
      c.t = buildTerrain(cx, cz, res);
      c.lod = lod;
      this.scene.add(c.t.mesh);
      return;
    }
    c = { cx, cz, lod, t: buildTerrain(cx, cz, res) };
    this.scene.add(c.t.mesh);
    this.chunks.set(k, c);
    this.buildFar(c);
  }

  disposeGroup(g) {
    if (!g) return;
    this.scene.remove(g);
    g.children.forEach((m) => m.dispose && m.dispose());
  }

  // Builds missing chunks closest-first until the time budget is used.
  update(px, pz, budgetMs = 6) {
    const pcx = Math.floor(px / CHUNK), pcz = Math.floor(pz / CHUNK);
    const start = performance.now();
    const jobs = [];
    for (let dz = -this.radius; dz <= this.radius; dz++) {
      for (let dx = -this.radius; dx <= this.radius; dx++) {
        const d = Math.max(Math.abs(dx), Math.abs(dz));
        if (Math.hypot(dx, dz) > this.radius + 0.5) continue;
        const cx = pcx + dx, cz = pcz + dz;
        const c = this.chunks.get(this.key(cx, cz));
        const lod = d <= this.lod0Radius ? 0 : 1;
        if (!c || c.lod !== lod) jobs.push({ cx, cz, lod, d: Math.hypot(dx, dz), kind: 'terrain' });
        else if (d <= this.nearRadius && !c.near) jobs.push({ cx, cz, d: Math.hypot(dx, dz), kind: 'near' });
      }
    }
    jobs.sort((a, b) => a.d - b.d);
    for (const j of jobs) {
      if (performance.now() - start > budgetMs) break;
      if (j.kind === 'terrain') this.buildChunk(j.cx, j.cz, j.lod);
      else this.buildNear(this.chunks.get(this.key(j.cx, j.cz)));
    }
    // drop what is far away
    for (const [k, c] of this.chunks) {
      const d = Math.max(Math.abs(c.cx - pcx), Math.abs(c.cz - pcz));
      if (c.near && d > this.nearRadius + 1) { this.disposeGroup(c.near); c.near = null; }
      if (d > this.radius + 2) {
        this.scene.remove(c.t.mesh);
        c.t.mesh.geometry.dispose();
        this.disposeGroup(c.far);
        this.disposeGroup(c.near);
        this.chunks.delete(k);
      }
    }
    return jobs.length;
  }

  // Push a circle of radius r out of tree trunks and big rocks.
  collide(pos, r) {
    const pcx = Math.floor(pos.x / CHUNK), pcz = Math.floor(pos.z / CHUNK);
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      const c = this.chunks.get(this.key(pcx + dx, pcz + dz));
      if (!c || !c.trees) continue;
      for (const t of c.trees) {
        const ddx = pos.x - t.x, ddz = pos.z - t.z, d = Math.hypot(ddx, ddz), min = r + t.r;
        if (d < min && d > 1e-4) { pos.x = t.x + (ddx / d) * min; pos.z = t.z + (ddz / d) * min; }
      }
    }
  }
}

export { KIND, SEA_LEVEL };
