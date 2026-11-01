// Trainers to battle: two along every road and a champion in every town.
// They look around, spot the player inside their field of view, show a "!",
// walk up and challenge them. Beaten trainers are remembered in the save.

import { mulberry32 } from '../core/noise.js';
import { TOWNS, ROADS, roadPoint, heightAt } from './heightfield.js';
import { regionAt } from './regions.js';
import { makeCharacter } from './character.js';
import { bubble } from './markers.js';
import { SPECIES } from '../creatures/species.js';
import { createMonster } from '../creatures/monster.js';

const CLASSES = [
  { cls: 'Escursionista', shirt: 0x8d6e63, hat: 0x5d4037 },
  { cls: 'Ragazza Pic-nic', shirt: 0xf48fb1, hat: null },
  { cls: 'Pescatore', shirt: 0x26a69a, hat: 0xffca28 },
  { cls: 'Studente', shirt: 0x5c6bc0, hat: null },
  { cls: 'Ciclista', shirt: 0xffeb3b, hat: 0x212121 },
  { cls: 'Ranger', shirt: 0x558b2f, hat: 0x33691e },
  { cls: 'Montanara', shirt: 0xd32f2f, hat: 0xeceff1 },
  { cls: 'Velista', shirt: 0xffffff, hat: 0x1565c0 },
];
const NAMES = ['Marco', 'Giulia', 'Sara', 'Paolo', 'Elena', 'Dario', 'Chiara', 'Ivo', 'Marta', 'Nico', 'Irene', 'Bruno', 'Alice', 'Teo', 'Greta', 'Ugo', 'Viola', 'Ettore', 'Nora', 'Piero', 'Lia', 'Gino', 'Rita', 'Sandro'];
const BEFORE = ['Ehi tu! Ci siamo guardati negli occhi: si lotta!', 'Mi alleno su questa strada da settimane. Fatti sotto!', 'Scommetto che i miei Velmon sono più forti dei tuoi!', 'Non si passa senza una lotta!', 'Finalmente qualcuno con cui lottare!'];
const AFTER = ['Accidenti, sei fortissimo!', 'Devo allenarmi ancora...', 'Bella lotta! La prossima volta vinco io.', 'Va bene, va bene, hai vinto tu.'];

const SIGHT = 13, CONE = 0.6, WALK = 3;

// High-level trainers use the evolved forms of their species.
function formFor(id, level) {
  while (SPECIES[id].evo && level >= SPECIES[id].evo.level + 2) id = SPECIES[id].evo.to;
  return id;
}

function makeTeam(rnd, spawns, lo, hi, size) {
  const ids = Object.keys(spawns);
  const team = [];
  for (let i = 0; i < size; i++) {
    const level = lo + Math.floor(rnd() * (hi - lo + 1));
    team.push([formFor(ids[Math.floor(rnd() * ids.length)], level), level]);
  }
  return team;
}

function rosterData() {
  const list = [];
  const rnd = mulberry32(4242);
  let n = 0;
  ROADS.forEach((road, i) => {
    for (const [k, t] of [[0, 0.3], [1, 0.68]]) {
      const p = roadPoint(road, t);
      const side = k ? 1 : -1;
      const x = p.x - p.dz * 2.6 * side, z = p.z + p.dx * 2.6 * side;
      const r = regionAt(x, z);
      const c = CLASSES[Math.floor(rnd() * CLASSES.length)];
      const team = makeTeam(rnd, r.spawns, r.levels[0], r.levels[1], 1 + Math.floor(rnd() * 3));
      const top = Math.max(...team.map(([, l]) => l));
      list.push({
        id: `road-${i}-${k}`, name: `${c.cls} ${NAMES[n++ % NAMES.length]}`, look: c, x, z,
        facing: Math.atan2(p.dz * side, -p.dx * side), // looking across the road
        team, reward: 40 * top, before: BEFORE[Math.floor(rnd() * BEFORE.length)], after: AFTER[Math.floor(rnd() * AFTER.length)],
      });
    }
  });
  for (const t of TOWNS) {
    const r = t.region;
    const hi = r.levels[1] + 2;
    const team = makeTeam(rnd, r.spawns, hi - 2, hi, r.start ? 2 : 3);
    list.push({
      id: `town-${r.id}`, name: `Campione di ${r.town.name}`, champion: true,
      look: { shirt: 0x1d1d1d, hat: 0xffc93c, pants: 0x7b1fa2 }, x: t.x - 5, z: t.z + 11, facing: Math.atan2(5, -11),
      team, reward: 120 * hi,
      before: `Sono il campione di ${r.town.name}. Nessuno mi ha mai battuto qui! Vediamo cosa sai fare.`,
      after: `Incredibile... Da oggi il campione di ${r.town.name} sei tu!`,
    });
  }
  return list;
}

export class Trainers {
  constructor(scene) {
    this.scene = scene;
    this.list = rosterData().map((d) => {
      const obj = makeCharacter({ shirt: d.look.shirt, pants: d.look.pants ?? 0x37474f, hat: d.look.hat ?? null, hatBrim: 0x222222, backpack: d.champion ? null : 0x795548 });
      obj.position.set(d.x, heightAt(d.x, d.z), d.z);
      obj.rotation.y = d.facing;
      const b = bubble('!');
      b.visible = false;
      obj.add(b);
      scene.add(obj);
      return { ...d, obj, bubble: b, state: 'idle', look0: Math.random() * 10 };
    });
    this.t = 0;
  }

  monsters(tr) {
    return tr.team.map(([id, l]) => createMonster(id, l));
  }

  update(dt, game) {
    this.t += dt;
    const P = game.player.pos;
    const free = !game.busy && !game.hud.modal && !game.battle.active && game.state.started && game.state.party.some((m) => m.hp > 0) && !game.crime?.wanted;
    for (const tr of this.list) {
      const o = tr.obj;
      const dx = P.x - o.position.x, dz = P.z - o.position.z, d = Math.hypot(dx, dz);
      o.visible = d < 260;
      if (!o.visible) continue;
      const beaten = game.state.beaten[tr.id];
      if (tr.state === 'approach') {
        if (d > 1.8) {
          o.position.x += (dx / d) * WALK * dt; o.position.z += (dz / d) * WALK * dt;
          o.position.y = heightAt(o.position.x, o.position.z);
          o.rotation.y = Math.atan2(dx, dz);
          o.userData.animate(dt, WALK);
        } else { o.userData.animate(dt, 0); tr.arrived?.(); }
      } else if (tr.state === 'return') {
        const hx = tr.x - o.position.x, hz = tr.z - o.position.z, hd = Math.hypot(hx, hz);
        if (hd > 0.3) {
          o.position.x += (hx / hd) * 2 * dt; o.position.z += (hz / hd) * 2 * dt;
          o.position.y = heightAt(o.position.x, o.position.z);
          o.rotation.y = Math.atan2(hx, hz);
          o.userData.animate(dt, 2);
        } else { tr.state = 'idle'; o.userData.animate(dt, 0); }
      } else if (tr.state === 'idle') {
        o.userData.animate(dt, 0);
        if (beaten) {
          if (d < 6) turnTo(o, Math.atan2(dx, dz), dt);
          continue;
        }
        // look around, left and right of the base direction; champions wait to be challenged
        if (tr.champion) { if (d < 8) turnTo(o, Math.atan2(dx, dz), dt); continue; }
        turnTo(o, tr.facing + Math.sin(this.t * 0.35 + tr.look0) * 0.7, dt * 0.6);
        if (!free || game.busy || d > SIGHT) continue;
        let a = Math.atan2(dx, dz) - o.rotation.y;
        a = Math.atan2(Math.sin(a), Math.cos(a));
        if (Math.abs(a) < CONE || d < 3.5) this.challenge(tr, game, true);
      }
    }
  }

  // The trainer spotted the player (or the player talked to them): "!", walk up, battle.
  async challenge(tr, game, spotted) {
    game.busy = true;
    tr.state = 'approach';
    game.player.stopVehicle?.();
    if (spotted) {
      tr.bubble.visible = true;
      game.hud.toast('!', 700);
      await new Promise((res) => {
        tr.arrived = res;
        setTimeout(res, 9000); // never get stuck if something blocks the way
      });
      tr.arrived = null;
      tr.bubble.visible = false;
    }
    tr.state = 'battle';
    const o = tr.obj, P = game.player.pos;
    o.lookAt(P.x, o.position.y, P.z);
    game.player.faceTo(o.position.x, o.position.z);
    await game.hud.say(tr.name, [tr.before]);
    const outcome = await game.battle.start(null, { trainer: { name: tr.name, team: this.monsters(tr), reward: tr.reward, fine: Math.round(tr.reward / 2), obj: o } });
    if (outcome === 'win') {
      game.state.beaten[tr.id] = true;
      game.save();
      game.busy = true;
      o.lookAt(game.player.pos.x, o.position.y, game.player.pos.z);
      await game.hud.say(tr.name, [tr.after]);
    }
    tr.state = 'return';
    game.busy = false;
  }

  nearest(pos) {
    let best = null;
    for (const tr of this.list) {
      if (tr.state !== 'idle') continue;
      const d = Math.hypot(pos.x - tr.obj.position.x, pos.z - tr.obj.position.z);
      if (d < 2.4 && (!best || d < best.d)) best = { kind: 'trainer', tr, d };
    }
    return best;
  }

  async talk(tr, game) {
    if (!game.state.beaten[tr.id] && game.state.party.some((m) => m.hp > 0)) return this.challenge(tr, game, false);
    game.busy = true;
    tr.obj.lookAt(game.player.pos.x, tr.obj.position.y, game.player.pos.z);
    await game.hud.say(tr.name, [game.state.beaten[tr.id] ? tr.after : 'La tua squadra è esausta! Prima passa da un Centro Cura.']);
    game.busy = false;
  }
}

function turnTo(o, want, k) {
  let d = want - o.rotation.y;
  d = Math.atan2(Math.sin(d), Math.cos(d));
  o.rotation.y += d * Math.min(k * 3, 1);
}
