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

// Adds photographic grain to a vertex-coloured material (keeps its colours):
// 'tree' puts bark on trunks and leafy grain on foliage, 'rock' puts stone on rocks.
export function photoDetail(material, kind) {
  const prev = material.onBeforeCompile.bind(material);
  const prevKey = material.customProgramCacheKey();
  material.onBeforeCompile = (sh, r) => {
    prev(sh, r);
    sh.uniforms.tA = { value: tex(kind === 'tree' ? 'bark_brown_02_diff' : 'aerial_rocks_02_diff') };
    sh.uniforms.tB = { value: tex('aerial_grass_rock_diff') };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vDP; varying vec3 vDN;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvDN = objectNormal;\n#ifdef USE_INSTANCING\nvDP = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;\n#else\nvDP = (modelMatrix * vec4(transformed, 1.0)).xyz;\n#endif');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vDP; varying vec3 vDN;\nuniform sampler2D tA, tB;')
      .replace('#include <color_fragment>', `#include <color_fragment>
{
  vec3 n = abs(normalize(vDN));
  ${kind === 'tree'
    ? `bool leaf = vColor.g > vColor.r * 1.05 && vColor.g > vColor.b;
  float l = leaf ? dot(texture2D(tB, (vDP.xz + vDP.y) / 2.5).rgb, vec3(0.33)) / 0.36
                 : dot(texture2D(tA, vec2(vDP.x + vDP.z, vDP.y) / 1.2).rgb, vec3(0.33)) / 0.3;`
    : `vec3 t = texture2D(tA, vDP.zy / 2.5).rgb * n.x + texture2D(tA, vDP.xz / 2.5).rgb * n.y + texture2D(tA, vDP.xy / 2.5).rgb * n.z;
  float l = dot(t, vec3(0.33)) / ((n.x + n.y + n.z) * 0.42);`}
  diffuseColor.rgb *= clamp(l, 0.5, 1.6);
}`);
  };
  material.customProgramCacheKey = () => `${prevKey}-photo-${kind}`;
  return material;
}
