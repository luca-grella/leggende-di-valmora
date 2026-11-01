// Sea surface: a grid that follows the player, with moving waves, fresnel
// reflection of the sky colour and a sun glint. Semi-transparent so the
// sandy shallows show through near the coast.

import * as THREE from 'three';

export class Water {
  constructor(scene, size) {
    const geo = new THREE.PlaneGeometry(size * 2, size * 2, 96, 96);
    geo.rotateX(-Math.PI / 2);
    this.uniforms = {
      uTime: { value: 0 },
      uSunDir: { value: new THREE.Vector3(0, 1, 0) },
      uSunColor: { value: new THREE.Color(1, 1, 1) },
      uSky: { value: new THREE.Color(0x9cc7ea) },
      uDeep: { value: new THREE.Color(0x0f4d6e) },
      uShallow: { value: new THREE.Color(0x2aa5a8) },
      uFogColor: { value: new THREE.Color() },
      uFogNear: { value: 60 },
      uFogFar: { value: 400 },
      uNight: { value: 0 },
    };
    this.mesh = new THREE.Mesh(
      geo,
      new THREE.ShaderMaterial({
        uniforms: this.uniforms,
        transparent: true,
        depthWrite: false,
        vertexShader: /* glsl */ `
          uniform float uTime;
          varying vec3 vWorld;
          varying vec3 vNormal;
          float wave(vec2 p, vec2 d, float f, float s, float a) { return sin(dot(p, d) * f + uTime * s) * a; }
          void main() {
            vec4 w = modelMatrix * vec4(position, 1.0);
            vec2 p = w.xz;
            float h = wave(p, vec2(0.8, 0.6), 0.09, 1.1, 0.22) + wave(p, vec2(-0.5, 0.9), 0.17, 1.7, 0.1) + wave(p, vec2(0.2, -1.0), 0.31, 2.3, 0.05);
            float e = 0.5;
            float hx = wave(p + vec2(e, 0.0), vec2(0.8, 0.6), 0.09, 1.1, 0.22) + wave(p + vec2(e, 0.0), vec2(-0.5, 0.9), 0.17, 1.7, 0.1) + wave(p + vec2(e, 0.0), vec2(0.2, -1.0), 0.31, 2.3, 0.05);
            float hz = wave(p + vec2(0.0, e), vec2(0.8, 0.6), 0.09, 1.1, 0.22) + wave(p + vec2(0.0, e), vec2(-0.5, 0.9), 0.17, 1.7, 0.1) + wave(p + vec2(0.0, e), vec2(0.2, -1.0), 0.31, 2.3, 0.05);
            w.y += h;
            vNormal = normalize(vec3(h - hx, e, h - hz));
            vWorld = w.xyz;
            gl_Position = projectionMatrix * viewMatrix * w;
          }`,
        fragmentShader: /* glsl */ `
          uniform vec3 uSunDir, uSunColor, uSky, uDeep, uShallow, uFogColor;
          uniform float uFogNear, uFogFar, uNight, uTime;
          varying vec3 vWorld;
          varying vec3 vNormal;
          void main() {
            vec3 V = normalize(cameraPosition - vWorld);
            vec3 N = normalize(vNormal + vec3(sin(vWorld.x * 0.9 + uTime * 2.0) * 0.04, 0.0, cos(vWorld.z * 1.1 + uTime * 1.6) * 0.04));
            float fres = pow(1.0 - max(dot(N, V), 0.0), 4.0);
            vec3 base = mix(uShallow, uDeep, clamp(fres * 1.6 + 0.35, 0.0, 1.0));
            vec3 col = mix(base, uSky, fres * 0.8);
            vec3 H = normalize(uSunDir + V);
            float spec = pow(max(dot(N, H), 0.0), 180.0) * step(0.0, uSunDir.y);
            col += uSunColor * spec * 2.5;
            col *= mix(1.0, 0.25, uNight);
            float dist = length(cameraPosition - vWorld);
            float fog = smoothstep(uFogNear, uFogFar, dist);
            col = mix(col, uFogColor, fog);
            float alpha = mix(0.78, 0.95, fres);
            gl_FragColor = vec4(col, alpha);
            #include <colorspace_fragment>
          }`,
      })
    );
    this.mesh.renderOrder = 1;
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);
  }

  update(dt, center, sky, fog) {
    this.uniforms.uTime.value += dt;
    // snap to a 4 m grid so the wave pattern does not slide with the player
    this.mesh.position.set(Math.round(center.x / 4) * 4, 0, Math.round(center.z / 4) * 4);
    this.uniforms.uSunDir.value.copy(sky.sunDir);
    this.uniforms.uSunColor.value.copy(sky.sun.color).multiplyScalar(sky.sun.intensity / 2);
    this.uniforms.uSky.value.copy(fog.color).lerp(new THREE.Color(0xffffff), 0.15);
    this.uniforms.uFogColor.value.copy(fog.color);
    this.uniforms.uFogNear.value = fog.near;
    this.uniforms.uFogFar.value = fog.far;
    this.uniforms.uNight.value = sky.nightFactor;
  }
}
