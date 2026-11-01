// Pure functions that describe the world: height, colour, biome blend, towns,
// roads and tall-grass patches. Everything is deterministic from WORLD_SEED,
// so chunks can be rebuilt at any time and always match.

import * as THREE from 'three';
import { makeSimplex, fbm, ridged, clamp, lerp, smoothstep } from '../core/noise.js';
import { REGIONS, REGION_SIZE, WORLD_HALF, regionAt, regionCenter } from './regions.js';

export const WORLD_SEED = 1994;
export const SEA_LEVEL = 0;

const nContinent = makeSimplex(WORLD_SEED);
const nHills = makeSimplex(WORLD_SEED + 1);
const nRidge = makeSimplex(WORLD_SEED + 2);
const nPatch = makeSimplex(WORLD_SEED + 3);
const nColor = makeSimplex(WORLD_SEED + 4);

const NUM_KEYS = ['base', 'relief', 'mountains', 'ridgeFreq', 'snowLine'];
const COLOR_KEYS = ['grass', 'grass2', 'dirt', 'rock', 'sand', 'snow'];

const grid = {};
for (const r of REGIONS) {
  grid[`${r.gx},${r.gz}`] = {
    ...Object.fromEntries(NUM_KEYS.map((k) => [k, r[k]])),
    treeDensity: r.trees.density,
    flowers: r.flowers,
    colors: Object.fromEntries(COLOR_KEYS.map((k) => [k, new THREE.Color(r.palette[k])])),
    tall: new THREE.Color(r.tallGrass),
  };
}

const blended = {
  colors: Object.fromEntries(COLOR_KEYS.map((k) => [k, new THREE.Color()])),
  tall: new THREE.Color(),
};

// Biome parameters blended across region borders so nothing ends in a hard line.
export function biomeAt(x, z) {
  const u = clamp(x / REGION_SIZE, -1, 1);
  const v = clamp(z / REGION_SIZE, -1, 1);
  const i0 = Math.min(Math.floor(u), 0), j0 = Math.min(Math.floor(v), 0);
  const tu = smoothstep(0.3, 0.7, u - i0);
  const tv = smoothstep(0.3, 0.7, v - j0);
  const c00 = grid[`${i0},${j0}`], c10 = grid[`${i0 + 1},${j0}`];
  const c01 = grid[`${i0},${j0 + 1}`], c11 = grid[`${i0 + 1},${j0 + 1}`];
  const w00 = (1 - tu) * (1 - tv), w10 = tu * (1 - tv), w01 = (1 - tu) * tv, w11 = tu * tv;
  for (const k of NUM_KEYS) blended[k] = c00[k] * w00 + c10[k] * w10 + c01[k] * w01 + c11[k] * w11;
  blended.treeDensity = c00.treeDensity * w00 + c10.treeDensity * w10 + c01.treeDensity * w01 + c11.treeDensity * w11;
  blended.flowers = c00.flowers * w00 + c10.flowers * w10 + c01.flowers * w01 + c11.flowers * w11;
  for (const k of COLOR_KEYS) {
    const o = blended.colors[k];
    o.setRGB(0, 0, 0);
    o.r = c00.colors[k].r * w00 + c10.colors[k].r * w10 + c01.colors[k].r * w01 + c11.colors[k].r * w11;
    o.g = c00.colors[k].g * w00 + c10.colors[k].g * w10 + c01.colors[k].g * w01 + c11.colors[k].g * w11;
    o.b = c00.colors[k].b * w00 + c10.colors[k].b * w10 + c01.colors[k].b * w01 + c11.colors[k].b * w11;
  }
  const t = blended.tall;
  t.r = c00.tall.r * w00 + c10.tall.r * w10 + c01.tall.r * w01 + c11.tall.r * w11;
  t.g = c00.tall.g * w00 + c10.tall.g * w10 + c01.tall.g * w01 + c11.tall.g * w11;
  t.b = c00.tall.b * w00 + c10.tall.b * w10 + c01.tall.b * w01 + c11.tall.b * w11;
  return blended;
}

function rawHeight(x, z) {
  const b = biomeAt(x, z);
  const hills = fbm(nHills, x / 320, z / 320, 4) * b.relief;
  const detail = fbm(nHills, x / 55 + 100, z / 55 - 40, 3) * b.relief * 0.12;
  const mask = smoothstep(0.42, 0.78, (nContinent(x / 1400, z / 1400) + 1) / 2);
  const mount = Math.pow(ridged(nRidge, (x * b.ridgeFreq) / 900, (z * b.ridgeFreq) / 900, 5), 1.6) * b.mountains * mask;
  let h = b.base + hills + detail + mount;
  const edge = Math.max(Math.abs(x), Math.abs(z));
  h = lerp(h, -40, smoothstep(WORLD_HALF - 600, WORLD_HALF - 60, edge));
  return h;
}

// Towns sit at each region centre on a flattened plateau.
export const TOWNS = REGIONS.map((r) => {
  const c = regionCenter(r);
  const h = clamp(rawHeight(c.x, c.z), 3.5, 60);
  return { region: r, x: c.x, z: c.z, h, radius: r.town.big ? 120 : 75 };
});

// Roads connect neighbouring towns (a 3x3 grid gives 12 roads).
export const ROADS = [];
for (const a of TOWNS) {
  for (const b of TOWNS) {
    const dx = b.region.gx - a.region.gx, dz = b.region.gz - a.region.gz;
    if ((dx === 1 && dz === 0) || (dx === 0 && dz === 1)) ROADS.push({ a, b });
  }
}

// A point on a road at parameter t (0 = town a, 1 = town b), following the
// same wobble that roadInfo uses, plus the road direction there.
export function roadPoint({ a, b }, t) {
  const vx = b.x - a.x, vz = b.z - a.z, L = Math.hypot(vx, vz);
  const at = (u) => {
    const wob = Math.sin(u * Math.PI * 3 + a.x * 0.001) * 60 * Math.sin(u * Math.PI);
    return { x: a.x + vx * u + (-vz / L) * wob, z: a.z + vz * u + (vx / L) * wob };
  };
  const p = at(t), q = at(Math.min(t + 0.002, 1)), o = at(Math.max(t - 0.002, 0));
  const dx = q.x - o.x, dz = q.z - o.z, d = Math.hypot(dx, dz);
  return { x: p.x, z: p.z, dx: dx / d, dz: dz / d };
}

function roadInfo(x, z) {
  let best = Infinity, bestH = 0;
  for (const { a, b } of ROADS) {
    const vx = b.x - a.x, vz = b.z - a.z;
    const t = clamp(((x - a.x) * vx + (z - a.z) * vz) / (vx * vx + vz * vz), 0, 1);
    // gentle wobble so roads are not ruler-straight
    const wob = Math.sin(t * Math.PI * 3 + a.x * 0.001) * 60 * Math.sin(t * Math.PI);
    const px = a.x + vx * t + (-vz / Math.hypot(vx, vz)) * wob;
    const pz = a.z + vz * t + (vx / Math.hypot(vx, vz)) * wob;
    const d = Math.hypot(x - px, z - pz);
    if (d < best) { best = d; bestH = lerp(a.h, b.h, t); }
  }
  return { d: best, h: bestH };
}

export function townAt(x, z) {
  for (const t of TOWNS) if (Math.hypot(x - t.x, z - t.z) < t.radius + 60) return t;
  return null;
}

export function heightAt(x, z) {
  let h = rawHeight(x, z);
  const r = roadInfo(x, z);
  if (r.d < 14) {
    // roads hug the terrain but are smoothed, and become causeways over water
    const target = Math.max(lerp(h, r.h, 0.35), 1.2);
    h = lerp(h, target, smoothstep(14, 4, r.d) * (h < 1.2 ? 1 : 0.6));
  }
  for (const t of TOWNS) {
    const d = Math.hypot(x - t.x, z - t.z);
    if (d < t.radius + 70) h = lerp(h, t.h, smoothstep(t.radius + 70, t.radius, d));
  }
  return h;
}

export function slopeAt(x, z) {
  const e = 1.5;
  const dx = heightAt(x + e, z) - heightAt(x - e, z);
  const dz = heightAt(x, z + e) - heightAt(x, z - e);
  return Math.hypot(dx, dz) / (2 * e);
}

export function isRoad(x, z) {
  return roadInfo(x, z).d < 4.2;
}

export function tallGrassAt(x, z, h = heightAt(x, z)) {
  if (h < 1.6) return false;
  if (townAt(x, z) && Math.hypot(x - townAt(x, z).x, z - townAt(x, z).z) < townAt(x, z).radius + 25) return false;
  const b = biomeAt(x, z);
  if (h > b.snowLine + 30) return false; // high peaks stay bare
  const n = nPatch(x / 38, z / 38) * 0.75 + nPatch(x / 9, z / 9) * 0.25;
  if (n < 0.38) return false;
  return roadInfo(x, z).d > 7;
}

const tmp = new THREE.Color();
// Vertex colour of the ground.
export function groundColor(x, z, h, slope, out) {
  const b = biomeAt(x, z);
  const c = b.colors;
  const n = nColor(x / 25, z / 25) * 0.5 + 0.5;
  const n2 = nColor(x / 4 + 50, z / 4) * 0.5 + 0.5;
  out.copy(c.grass).lerp(c.grass2, n);
  if (nColor(x / 70 - 30, z / 70) > 0.55) out.lerp(c.dirt, 0.45);
  if (tallGrassAt(x, z, h)) out.lerp(tmp.copy(b.tall).multiplyScalar(0.72), 0.75);
  if (isRoad(x, z) && h > 0.6) out.copy(c.dirt).lerp(tmp.setRGB(0.85, 0.78, 0.62), 0.35);
  const t = townAt(x, z);
  if (t) {
    const d = Math.hypot(x - t.x, z - t.z);
    if (d < t.radius * 0.55) out.lerp(tmp.setRGB(0.56, 0.5, 0.43).multiplyScalar(0.85 + n2 * 0.3), smoothstep(t.radius * 0.55, t.radius * 0.4, d) * 0.9);
  }
  if (h < 1.4) out.copy(c.sand).lerp(c.grass, smoothstep(0.6, 1.4, h) * 0.5);
  if (h < -0.4) out.copy(c.sand).multiplyScalar(0.75);
  if (slope > 0.7) out.lerp(c.rock, smoothstep(0.7, 1.15, slope));
  const snow = b.snowLine + nColor(x / 30, z / 30) * 8;
  if (h > snow) out.lerp(c.snow, smoothstep(snow, snow + 6, h) * (slope > 1.2 ? 0.6 : 1));
  out.multiplyScalar(0.92 + n2 * 0.12);
  return out;
}

export { regionAt };
