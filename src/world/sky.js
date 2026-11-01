// Sky dome, sun and moon lights, stars, fog and the day/night clock.

import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { clamp, smoothstep, lerp } from '../core/noise.js';

export const DAY_LENGTH = 20 * 60; // seconds of real time for a full day

const DAY_FOG = new THREE.Color(0xbfd8ee);
const DUSK_FOG = new THREE.Color(0xe8a27a);
const NIGHT_FOG = new THREE.Color(0x0b1424);

export class SkySystem {
  constructor(scene, quality) {
    this.scene = scene;
    this.time = 9.5; // hours, 0..24

    this.sky = new Sky();
    this.sky.scale.setScalar(9000);
    const u = this.sky.material.uniforms;
    u.turbidity.value = 2.4;
    u.rayleigh.value = 2;
    u.mieCoefficient.value = 0.004;
    u.mieDirectionalG.value = 0.82;
    scene.add(this.sky);

    this.sun = new THREE.DirectionalLight(0xffffff, 3);
    this.sun.castShadow = true;
    const s = quality.shadowSize;
    this.sun.shadow.mapSize.set(s, s);
    const cam = this.sun.shadow.camera;
    cam.left = -70; cam.right = 70; cam.top = 70; cam.bottom = -70;
    cam.near = 1; cam.far = 400;
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.6;
    scene.add(this.sun, this.sun.target);

    this.moon = new THREE.DirectionalLight(0x8fa8ff, 0);
    scene.add(this.moon, this.moon.target);

    this.hemi = new THREE.HemisphereLight(0xcfe6ff, 0x5a6b3a, 1.2);
    scene.add(this.hemi);

    scene.fog = new THREE.Fog(DAY_FOG.clone(), 60, quality.viewDistance);
    this.fogFar = quality.viewDistance;

    // stars
    const n = 1500, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const th = Math.random() * Math.PI * 2, ph = Math.acos(Math.random() * 0.95);
      pos[i * 3] = Math.sin(ph) * Math.cos(th) * 4000;
      pos[i * 3 + 1] = Math.cos(ph) * 4000;
      pos[i * 3 + 2] = Math.sin(ph) * Math.sin(th) * 4000;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false });
    this.stars = new THREE.Points(g, this.starMat);
    scene.add(this.stars);

    this.sunDir = new THREE.Vector3();
    this.nightFactor = 0;
  }

  // 0 at noon .. 1 at midnight, smooth
  update(dt, center) {
    this.time = (this.time + (dt * 24) / DAY_LENGTH) % 24;
    const ang = ((this.time - 6) / 24) * Math.PI * 2; // sunrise at 6, sunset at 18
    this.sunDir.set(Math.cos(ang) * 0.85, Math.sin(ang), 0.45).normalize();
    const elev = this.sunDir.y;

    this.sky.material.uniforms.sunPosition.value.copy(this.sunDir);
    this.sky.position.copy(center);
    this.stars.position.copy(center);

    const day = smoothstep(-0.12, 0.18, elev);
    const dusk = clamp(1 - Math.abs(elev) / 0.25, 0, 1) * (elev > -0.15 ? 1 : 0);
    this.nightFactor = 1 - day;

    this.sun.position.copy(center).addScaledVector(this.sunDir, 200);
    this.sun.target.position.copy(center);
    this.sun.intensity = 2.1 * smoothstep(-0.02, 0.2, elev);
    this.sun.color.setRGB(1, lerp(0.62, 0.96, smoothstep(0, 0.35, elev)), lerp(0.42, 0.9, smoothstep(0, 0.35, elev)));
    this.sun.castShadow = elev > 0.02;

    const moonDir = this.sunDir.clone().negate();
    this.moon.position.copy(center).addScaledVector(moonDir, 200);
    this.moon.target.position.copy(center);
    this.moon.intensity = 0.55 * (1 - day);

    this.hemi.intensity = lerp(0.22, 0.45, day); // the environment map adds the rest
    this.hemi.color.setRGB(lerp(0.25, 0.8, day), lerp(0.32, 0.9, day), lerp(0.55, 1, day));

    const fog = this.scene.fog.color;
    fog.copy(NIGHT_FOG).lerp(DAY_FOG, day).lerp(DUSK_FOG, dusk * 0.55);
    this.scene.background = null;

    this.starMat.opacity = smoothstep(0.1, 0.8, this.nightFactor);
    this.sky.material.uniforms.rayleigh.value = lerp(0.3, 2, day);
  }

  // Image-based lighting: the current sky is baked into an environment map so
  // materials pick up its colour from every direction (re-baked as time passes).
  updateEnv(renderer) {
    if (!this.pmrem) {
      this.pmrem = new THREE.PMREMGenerator(renderer);
      this.envScene = new THREE.Scene();
      this.envSky = new Sky();
      this.envSky.scale.setScalar(900);
      this.envScene.add(this.envSky);
    }
    const d = this.nightFactor;
    if (this.envBaked != null && Math.abs(this.envBaked - d) < 0.04 && Math.abs((this.envT ?? -9) - this.time) < 0.5) return;
    this.envBaked = d; this.envT = this.time;
    const src = this.sky.material.uniforms, dst = this.envSky.material.uniforms;
    for (const k of ['turbidity', 'rayleigh', 'mieCoefficient', 'mieDirectionalG']) dst[k].value = src[k].value;
    dst.sunPosition.value.copy(src.sunPosition.value);
    const rt = this.pmrem.fromScene(this.envScene, 0.02, 1, 2000);
    this.envRT?.dispose();
    this.envRT = rt;
    this.scene.environment = rt.texture;
    // the Sky shader is HDR and very bright: only a touch of it, or everything washes out
    this.scene.environmentIntensity = 0.012 + 0.03 * (1 - d);
  }

  get clockText() {
    const h = Math.floor(this.time), m = Math.floor((this.time - h) * 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  get isNight() {
    return this.nightFactor > 0.6;
  }
}
