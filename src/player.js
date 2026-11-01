// The trainer: third-person movement relative to the camera, jumping,
// collisions with trees, rocks and buildings, and the orbit camera.

import * as THREE from 'three';
import { heightAt } from './world/heightfield.js';
import { WORLD_HALF } from './world/regions.js';
import { makeCharacter } from './world/character.js';
import { clamp } from './core/noise.js';

const WALK = 5.2, RUN = 10.5, GRAVITY = 22, JUMP = 7.5, RADIUS = 0.45;
const SCOOTER = 22, SCOOTER_TURN = 2.6, SCOOTER_RADIUS = 0.8;
const SWIM_DEPTH = -1.15; // below this the trainer floats with the head above water

export class Player {
  constructor(scene, camera) {
    this.camera = camera;
    this.model = makeCharacter();
    scene.add(this.model);
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.vy = 0;
    this.grounded = true;
    this.swimming = false;
    this.facing = 0;
    this.camYaw = Math.PI;
    this.camPitch = 0.38;
    this.camDist = 7.5;
    this.speed = 0;
    this.moved = 0;
    this.camPos = new THREE.Vector3();
    this.vehicle = null; // the scooter being ridden: { model, ... }
  }

  faceTo(x, z) {
    this.facing = Math.atan2(x - this.pos.x, z - this.pos.z);
    this.sync();
  }

  mount(vehicle) {
    this.vehicle = vehicle;
    this.pos.set(vehicle.model.position.x, vehicle.model.position.y, vehicle.model.position.z);
    this.facing = vehicle.model.rotation.y;
    this.vel.set(0, 0, 0);
    this.model.userData.sitting = true;
    this.sync();
  }

  // Get off: the scooter stays where it is, the trainer steps to its left.
  dismount() {
    const v = this.vehicle;
    if (!v) return null;
    this.vehicle = null;
    this.model.userData.sitting = false;
    this.model.rotation.z = 0;
    v.model.rotation.z = 0;
    const sx = Math.cos(this.facing), sz = -Math.sin(this.facing);
    const x = this.pos.x + sx * 1.1, z = this.pos.z + sz * 1.1;
    if (heightAt(x, z) > SWIM_DEPTH) { this.pos.x = x; this.pos.z = z; }
    this.vel.set(0, 0, 0);
    this.sync();
    return v;
  }

  stopVehicle() {
    return this.dismount();
  }

  place(x, z, facing = 0) {
    this.pos.set(x, Math.max(heightAt(x, z), SWIM_DEPTH + 0.05), z);
    this.facing = facing;
    this.camYaw = facing + Math.PI;
    this.vel.set(0, 0, 0);
    this.sync();
    this.snapCamera();
  }

  sync() {
    this.model.position.copy(this.pos);
    this.model.rotation.y = this.facing;
  }

  update(dt, input, world, frozen) {
    if (this.vehicle) return this.ride(dt, input, world, frozen);
    const ax = frozen ? { x: 0, y: 0, mag: 0 } : input.axis();
    const yaw = this.camYaw;
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
    const rx = Math.cos(yaw), rz = -Math.sin(yaw);
    let dx = fx * ax.y + rx * ax.x, dz = fz * ax.y + rz * ax.x;
    const len = Math.hypot(dx, dz);
    const target = len > 0.01 ? (this.swimming ? WALK * 0.75 : input.running ? RUN : WALK) * Math.min(ax.mag, 1) : 0;
    if (len > 0.01) { dx /= len; dz /= len; }
    const acc = this.grounded ? 12 : 3;
    this.vel.x += (dx * target - this.vel.x) * Math.min(acc * dt, 1);
    this.vel.z += (dz * target - this.vel.z) * Math.min(acc * dt, 1);
    if (len > 0.01) {
      const want = Math.atan2(dx, dz);
      let d = want - this.facing;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      this.facing += d * Math.min(dt * 12, 1);
    }

    const old = this.pos.clone();
    this.pos.x += this.vel.x * dt;
    this.pos.z += this.vel.z * dt;
    world.chunks.collide(this.pos, RADIUS);
    world.towns.collide(this.pos, RADIUS);
    // stay inside the world and off cliffs that are too steep
    this.pos.x = clamp(this.pos.x, -WORLD_HALF + 120, WORLD_HALF - 120);
    this.pos.z = clamp(this.pos.z, -WORLD_HALF + 120, WORLD_HALF - 120);
    const h = heightAt(this.pos.x, this.pos.z);
    const step = Math.hypot(this.pos.x - old.x, this.pos.z - old.z);
    const rise = h - heightAt(old.x, old.z);
    if (this.grounded && !this.swimming && step > 0.001 && rise / step > 1.6) {
      this.pos.x = old.x; this.pos.z = old.z;
      this.vel.x *= 0.2; this.vel.z *= 0.2;
    }

    // deep water: swim at the surface, slower, no jumping
    this.swimming = h < SWIM_DEPTH;
    if (this.swimming) {
      this.pos.y = SWIM_DEPTH + 0.05 + Math.sin(performance.now() / 400) * 0.06;
      this.vy = 0;
      this.grounded = true;
    } else {
      if (!frozen && this.grounded && input.pressed('jump')) { this.vy = JUMP; this.grounded = false; }
      this.vy -= GRAVITY * dt;
      this.pos.y += this.vy * dt;
      const ground = heightAt(this.pos.x, this.pos.z);
      if (this.pos.y <= ground) { this.pos.y = ground; this.vy = 0; this.grounded = true; }
      else if (this.grounded && this.pos.y - ground < 0.6 && this.vy <= 0) { this.pos.y = ground; this.vy = 0; } // stick to slopes
      else this.grounded = false;
    }

    this.speed = Math.hypot(this.vel.x, this.vel.z);
    this.moved = Math.hypot(this.pos.x - old.x, this.pos.z - old.z);
    this.sync();
    this.model.userData.animate(dt, this.grounded ? this.speed : 0);

    // camera input
    if (!frozen) {
      this.camYaw -= input.cam.dx * 0.006;
      this.camPitch = clamp(this.camPitch + input.cam.dy * 0.004, -0.15, 1.2);
      this.camDist = clamp(this.camDist + input.cam.zoom * 0.8, 3.5, 16);
    }
  }

  // Scooter driving: the stick says where to go (relative to the camera), the
  // scooter steers towards it at a limited rate and accelerates along its nose.
  ride(dt, input, world, frozen) {
    const ax = frozen ? { x: 0, y: 0, mag: 0 } : input.axis();
    const yaw = this.camYaw;
    const dx = -Math.sin(yaw) * ax.y + Math.cos(yaw) * ax.x, dz = -Math.cos(yaw) * ax.y - Math.sin(yaw) * ax.x;
    let steer = 0;
    if (ax.mag > 0.1) {
      let d = Math.atan2(dx, dz) - this.facing;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      steer = clamp(d * 2, -1, 1);
      this.facing += clamp(d, -SCOOTER_TURN * dt, SCOOTER_TURN * dt);
      // pulling the stick backwards brakes instead of spinning around
      this.speed += ((Math.abs(d) > 2.4 ? 0 : SCOOTER * Math.min(ax.mag, 1)) - this.speed) * Math.min(dt * (Math.abs(d) > 2.4 ? 3 : 1.3), 1);
    } else this.speed += (0 - this.speed) * Math.min(dt * 1.6, 1);
    const old = this.pos.clone();
    this.pos.x += Math.sin(this.facing) * this.speed * dt;
    this.pos.z += Math.cos(this.facing) * this.speed * dt;
    world.chunks.collide(this.pos, SCOOTER_RADIUS);
    world.towns.collide(this.pos, SCOOTER_RADIUS);
    this.pos.x = clamp(this.pos.x, -WORLD_HALF + 120, WORLD_HALF - 120);
    this.pos.z = clamp(this.pos.z, -WORLD_HALF + 120, WORLD_HALF - 120);
    const step = Math.hypot(this.pos.x - old.x, this.pos.z - old.z);
    const h = heightAt(this.pos.x, this.pos.z);
    if (h < -0.4) { // scooters do not float
      this.pos.x = old.x; this.pos.z = old.z; this.speed = 0;
      if (!this.splashT || performance.now() - this.splashT > 3000) { this.splashT = performance.now(); world.hud.toast('Lo scooter non galleggia! Scendi (A) per nuotare.'); }
    } else if (step > 0.001 && (h - heightAt(old.x, old.z)) / step > 1.2) { this.pos.x = old.x; this.pos.z = old.z; this.speed *= 0.3; }
    else if (step < this.speed * dt * 0.5) this.speed *= 0.9; // bumped into something
    this.moved = Math.hypot(this.pos.x - old.x, this.pos.z - old.z);
    this.pos.y = Math.max(heightAt(this.pos.x, this.pos.z), -0.4);
    this.grounded = true; this.swimming = false; this.vy = 0;
    this.vel.set(Math.sin(this.facing) * this.speed, 0, Math.cos(this.facing) * this.speed);
    this.sync();
    const lean = -steer * Math.min(this.speed / SCOOTER, 1) * 0.3;
    const v = this.vehicle.model;
    v.position.copy(this.pos);
    v.rotation.set(0, this.facing, 0);
    v.rotation.z = THREE.MathUtils.lerp(v.rotation.z, lean, 0.15);
    this.model.rotation.z = v.rotation.z;
    this.model.position.y += 0.18;
    this.model.position.x -= Math.sin(this.facing) * 0.25; this.model.position.z -= Math.cos(this.facing) * 0.25;
    this.model.userData.animate(dt, 0);
    if (!frozen) {
      this.camYaw -= input.cam.dx * 0.006;
      this.camPitch = clamp(this.camPitch + input.cam.dy * 0.004, -0.15, 1.2);
      this.camDist = clamp(this.camDist + input.cam.zoom * 0.8, 3.5, 16);
      // the camera slowly swings behind the scooter while driving
      if (this.speed > 4 && !input.cam.dx) {
        let d = this.facing + Math.PI - this.camYaw;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        this.camYaw += d * Math.min(dt * 1.2, 1);
      }
    }
  }

  cameraTarget() {
    return new THREE.Vector3(this.pos.x, this.pos.y + 1.6, this.pos.z);
  }

  desiredCamera() {
    const t = this.cameraTarget();
    const cp = Math.cos(this.camPitch);
    const p = new THREE.Vector3(t.x + Math.sin(this.camYaw) * cp * this.camDist, t.y + Math.sin(this.camPitch) * this.camDist, t.z + Math.cos(this.camYaw) * cp * this.camDist);
    const g = Math.max(heightAt(p.x, p.z), 0.3) + 0.7; // never below ground or the sea surface
    if (p.y < g) p.y = g;
    return p;
  }

  snapCamera() {
    this.camPos.copy(this.desiredCamera());
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.cameraTarget());
  }

  updateCamera(dt) {
    this.camPos.lerp(this.desiredCamera(), Math.min(dt * 10, 1));
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.cameraTarget());
  }
}
