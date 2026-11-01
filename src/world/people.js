// Realistic people (Microsoft Rocketbox avatars, MIT licence, see
// public/people/LICENSE-Rocketbox.txt): loaded in the background after the
// game starts; characters near the camera switch to them, with motion
// captured idle, walk and run clips. Far away the light figures are kept.

import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { IS_MOBILE } from '../core/quality.js';

const AVATARS = {
  f: ['Female_Adult_01', 'Female_Adult_02', 'Female_Adult_03', 'Female_Adult_04'],
  m: ['Male_Adult_01', 'Male_Adult_02', 'Male_Adult_03', 'Male_Adult_04'],
};
const people = { f: [], m: [], clips: { f: {}, m: {} }, ready: false };
// where the camera is, and how close a character must be to look realistic
export const LOD = { x: 0, z: 0, near: IS_MOBILE ? 26 : 55, max: IS_MOBILE ? 8 : 20, count: 0, frame: 0 };
// people in use: characters that stop being animated (out of sight) give theirs back
const inUse = new Set();
export function track(entry) { inUse.add(entry); }
export function untrack(entry) { inUse.delete(entry); }
export function sweepPeople() {
  LOD.frame++;
  if (LOD.frame % 30) return;
  for (const e of [...inUse]) if (LOD.frame - e.lastFrame > 30) e.release();
}

export async function loadPeople() {
  // the FBX files point at .tga textures we do not ship: hand back a blank pixel instead
  const blank = 'data:image/gif;base64,R0lGODlhAQABAAAAACw=';
  const manager = new THREE.LoadingManager();
  manager.setURLModifier((u) => (/\.tga$/i.test(u) ? blank : u));
  const loader = new FBXLoader(manager);
  const tl = new THREE.TextureLoader();
  const tex = (n, ext = 'jpg') => { const t = tl.load(`people/${n}.${ext}`); t.colorSpace = THREE.SRGBColorSpace; return t; };
  for (const g of ['f', 'm']) {
    for (const k of ['idle', 'walk', 'run']) {
      const clip = (await loader.loadAsync(`people/${g}_${k}.fbx`)).animations[0];
      // walk and run move the hips forward: keep them in place, the game moves the character
      for (const tr of clip.tracks) {
        if (/^Bip01\.position$/.test(tr.name)) for (let i = 0; i < tr.values.length; i += 3) { tr.values[i] = tr.values[0]; tr.values[i + 2] = tr.values[2]; }
      }
      people.clips[g][k] = clip;
    }
    for (const name of AVATARS[g]) {
      const fbx = await loader.loadAsync(`people/${name}.fbx`);
      const mats = { body: tex(`${name}_body`), head: tex(`${name}_head`), opacity: tex(`${name}_opacity`, 'png') };
      fbx.traverse((o) => {
        if (!o.isMesh) return;
        o.castShadow = true;
        o.frustumCulled = false;
        const list = Array.isArray(o.material) ? o.material : [o.material];
        o.material = list.map((m) => {
          const key = /head/i.test(m.name) ? 'head' : /opacity/i.test(m.name) ? 'opacity' : 'body';
          return new THREE.MeshStandardMaterial({ map: mats[key], roughness: 0.75, ...(key === 'opacity' ? { alphaTest: 0.45, side: THREE.DoubleSide } : {}) });
        });
      });
      fbx.scale.setScalar(0.01); // centimetres to metres
      people[g].push(fbx);
    }
  }
  people.ready = true;
}

export const peopleReady = () => people.ready;

// a new animated person of that gender; seed picks which one
export function makePerson(g, seed) {
  const list = people[g];
  const obj = SkeletonUtils.clone(list[seed % list.length]);
  const mixer = new THREE.AnimationMixer(obj);
  const actions = Object.fromEntries(Object.entries(people.clips[g]).map(([k, c]) => [k, mixer.clipAction(c)]));
  actions.idle.play();
  return { obj, mixer, actions, cur: 'idle' };
}

// picks idle, walk or run from the speed and blends between them
export function drivePerson(p, dt, speed) {
  const want = speed < 0.25 ? 'idle' : speed < 4.5 ? 'walk' : 'run';
  if (want !== p.cur) {
    const next = p.actions[want];
    next.reset().play();
    p.actions[p.cur].crossFadeTo(next, 0.25, false);
    p.cur = want;
  }
  if (want === 'walk') p.actions.walk.timeScale = Math.max(0.6, speed / 1.35);
  if (want === 'run') p.actions.run.timeScale = Math.max(0.8, speed / 3.8);
  p.mixer.update(dt);
}
