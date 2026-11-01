// Turn-based battles played out in the open world: the two Velmon face each
// other where the encounter happened, the camera frames them and the HTML
// overlay shows HP, moves and messages.

import * as THREE from 'three';
import { heightAt } from '../world/heightfield.js';
import { SPECIES, MOVES, effectiveness, TYPE_COLORS } from '../creatures/species.js';
import { buildCreature } from '../creatures/model.js';
import { nameOf, stats, maxHp, gainXp, xpForLevel } from '../creatures/monster.js';
import { hpColor, typeBadges } from '../ui/hud.js';

const $ = (id) => document.getElementById(id);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const ease = (t) => t * t * (3 - 2 * t);

function makeBall() {
  const g = new THREE.Group();
  const top = new THREE.Mesh(new THREE.SphereGeometry(0.22, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xe23b3b, roughness: 0.3 }));
  const bot = new THREE.Mesh(new THREE.SphereGeometry(0.22, 18, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.3 }));
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.222, 0.025, 6, 24), new THREE.MeshStandardMaterial({ color: 0x222222 }));
  band.rotation.x = Math.PI / 2;
  const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.04, 12), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.2 }));
  btn.rotation.x = Math.PI / 2; btn.position.z = 0.215;
  g.add(top, bot, band, btn);
  g.traverse((o) => (o.castShadow = true));
  return g;
}

export class Battle {
  constructor(game) {
    this.game = game;
    this.active = false;
    this.skip = null;
    $('battle-msg').addEventListener('pointerdown', () => this.skip && this.skip());
    $('battle-actions').addEventListener('pointerdown', (e) => {
      const b = e.target.closest('button');
      if (b && this.pick) { e.stopPropagation(); this.pick(b.dataset.act); }
    });
  }

  // ---------- UI helpers ----------
  msg(text, ms = 1300) {
    $('battle-msg').hidden = false;
    $('battle-actions').hidden = true; $('battle-moves').hidden = true; $('battle-team').hidden = true;
    $('battle-msg').textContent = text;
    return new Promise((res) => {
      const t = setTimeout(done, ms);
      function done() { clearTimeout(t); res(); }
      this.skip = () => { this.skip = null; done(); };
    });
  }

  card(which, mon) {
    const el = document.querySelector(`#battle-ui .${which}`);
    const sp = SPECIES[mon.species], f = mon.hp / maxHp(mon);
    el.querySelector('.name').textContent = nameOf(mon);
    el.querySelector('.lv').textContent = `Lv ${mon.level}`;
    el.querySelector('.types').innerHTML = typeBadges(sp.types);
    const bar = el.querySelector('.hp i');
    bar.style.width = `${f * 100}%`;
    bar.style.background = hpColor(f);
    if (which === 'ally') {
      el.querySelector('.hptext').textContent = `${mon.hp} / ${maxHp(mon)} PS`;
      const lo = xpForLevel(mon.level), hi = xpForLevel(mon.level + 1);
      el.querySelector('.xp i').style.width = `${Math.min(100, ((mon.xp - lo) / (hi - lo)) * 100)}%`;
    }
  }

  chooseAction() {
    $('battle-msg').hidden = true;
    $('battle-actions').hidden = false;
    $('ball-count').textContent = `×${this.game.state.balls}`;
    return new Promise((res) => (this.pick = (a) => { this.pick = null; res(a); }));
  }

  chooseMove(mon) {
    const box = $('battle-moves');
    box.innerHTML = '';
    $('battle-actions').hidden = true;
    box.hidden = false;
    return new Promise((res) => {
      mon.moves.forEach((id) => {
        const mv = MOVES[id];
        const b = document.createElement('button');
        const eff = effectiveness(mv.type, SPECIES[this.foe.species].types);
        const note = eff === 0 ? 'Nessun effetto' : eff > 1 ? 'Superefficace' : eff < 1 ? 'Poco efficace' : '';
        b.innerHTML = `${mv.name}<small><span class="type" style="background:${TYPE_COLORS[mv.type]}">${mv.type}</span> Pot. ${mv.power} ${note ? '· ' + note : ''}</small>`;
        b.addEventListener('pointerdown', (e) => { e.stopPropagation(); res(id); });
        box.appendChild(b);
      });
      const back = document.createElement('button');
      back.className = 'back'; back.textContent = 'Indietro';
      back.addEventListener('pointerdown', (e) => { e.stopPropagation(); res(null); });
      box.appendChild(back);
      this.cancel = () => res(null);
    });
  }

  chooseTeam(force = false) {
    const box = $('battle-team');
    box.innerHTML = '';
    $('battle-actions').hidden = true; $('battle-msg').hidden = true;
    box.hidden = false;
    const party = this.game.state.party;
    return new Promise((res) => {
      party.forEach((m, i) => {
        const b = document.createElement('button');
        b.disabled = m.hp <= 0 || m === this.ally;
        b.style.opacity = b.disabled ? 0.45 : 1;
        b.innerHTML = `${nameOf(m)} Lv${m.level}<small>${m.hp}/${maxHp(m)} PS${m === this.ally ? ' · in campo' : ''}</small>`;
        b.addEventListener('pointerdown', (e) => { e.stopPropagation(); if (!b.disabled) res(i); });
        box.appendChild(b);
      });
      if (!force) {
        const back = document.createElement('button');
        back.className = 'back'; back.textContent = 'Indietro';
        back.addEventListener('pointerdown', (e) => { e.stopPropagation(); res(-1); });
        box.appendChild(back);
        this.cancel = () => res(-1);
      }
    });
  }

  // ---------- 3D staging ----------
  stage() {
    const { player, scene } = this.game;
    const yaw = player.facing;
    this.fwd = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
    this.right = new THREE.Vector3(this.fwd.z, 0, -this.fwd.x);
    const P = player.pos.clone();
    this.origin = P;
    const allyPos = P.clone().addScaledVector(this.fwd, 2.4).addScaledVector(this.right, -1.7);
    const foePos = P.clone().addScaledVector(this.fwd, 8.5).addScaledVector(this.right, 1.3);
    allyPos.y = heightAt(allyPos.x, allyPos.z);
    foePos.y = heightAt(foePos.x, foePos.z);
    this.allyPos = allyPos; this.foePos = foePos;
    player.model.visible = false; // the trainer steps out of the shot
    this.foeModel = buildCreature(this.foe.species);
    this.foeModel.scale.multiplyScalar(1.5); // battle scale: easier to read at a distance
    this.foeModel.position.copy(foePos);
    this.foeModel.lookAt(allyPos.x, foePos.y, allyPos.z);
    scene.add(this.foeModel);
    this.ring = new THREE.Mesh(new THREE.RingGeometry(1.2, 1.5, 40), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, depthWrite: false }));
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.position.copy(foePos).y += 0.08;
    scene.add(this.ring);
  }

  sendOut(mon) {
    if (this.allyModel) this.game.scene.remove(this.allyModel);
    this.ally = mon;
    this.allyModel = buildCreature(mon.species);
    this.allyModel.position.copy(this.allyPos);
    this.allyModel.lookAt(this.foePos.x, this.allyPos.y, this.foePos.z);
    this.allyTarget = this.allyModel.scale.x;
    this.allyModel.scale.setScalar(0.01);
    this.game.scene.add(this.allyModel);
    this.anim(350, (t) => this.allyModel.scale.setScalar(this.allyTarget * ease(t)));
    this.card('ally', mon);
  }

  anim(ms, fn) {
    return new Promise((res) => {
      const start = performance.now();
      const step = () => {
        const t = Math.min((performance.now() - start) / ms, 1);
        fn(t);
        if (t < 1) requestAnimationFrame(step); else res();
      };
      requestAnimationFrame(step);
    });
  }

  async lunge(model, target) {
    const from = model.position.clone();
    const dir = target.clone().sub(from).setY(0).normalize();
    await this.anim(380, (t) => {
      const k = Math.sin(t * Math.PI);
      model.position.copy(from).addScaledVector(dir, k * 2.2);
      model.position.y = from.y + k * 0.6;
    });
  }

  async hit(model) {
    const base = model.position.clone();
    const mats = [];
    model.traverse((o) => { if (o.material && o.material.emissive) mats.push([o.material, o.material.emissive.getHex(), o.material.emissiveIntensity]); });
    await this.anim(420, (t) => {
      model.position.x = base.x + Math.sin(t * 40) * 0.12 * (1 - t);
      const on = Math.floor(t * 8) % 2 === 0;
      mats.forEach(([m]) => { m.emissive.setHex(on ? 0xffffff : 0x000000); m.emissiveIntensity = on ? 0.7 : 0; });
    });
    model.position.copy(base);
    mats.forEach(([m, hex, i]) => { m.emissive.setHex(hex); m.emissiveIntensity = i; });
  }

  async faintAnim(model) {
    const y = model.position.y, s = model.scale.x;
    await this.anim(500, (t) => { model.position.y = y - t * 0.8; model.scale.setScalar(s * (1 - t * 0.7)); });
    model.visible = false;
  }

  // ---------- rules ----------
  damage(att, def, moveId) {
    const mv = MOVES[moveId];
    if (Math.random() * 100 > mv.acc) return { miss: true };
    const A = stats(att).atk, D = stats(def).def;
    const atypes = SPECIES[att.species].types, dtypes = SPECIES[def.species].types;
    const eff = effectiveness(mv.type, dtypes);
    const stab = atypes.includes(mv.type) ? 1.5 : 1;
    const crit = Math.random() < 1 / 16 ? 1.5 : 1;
    const base = (((2 * att.level) / 5 + 2) * mv.power * (A / D)) / 50 + 2;
    const dmg = eff === 0 ? 0 : Math.max(1, Math.floor(base * stab * eff * crit * (0.85 + Math.random() * 0.15)));
    return { dmg, eff, crit: crit > 1 };
  }

  foeMove() {
    const opts = this.foe.moves.map((id) => ({ id, w: MOVES[id].power * effectiveness(MOVES[id].type, SPECIES[this.ally.species].types) + 10 }));
    let r = Math.random() * opts.reduce((s, o) => s + o.w, 0);
    for (const o of opts) { r -= o.w; if (r <= 0) return o.id; }
    return opts[0].id;
  }

  async attack(attacker, defender, moveId, attModel, defModel, defSide) {
    await this.msg(`${defSide === 'foe' ? '' : 'Il selvatico '}${nameOf(attacker)} usa ${MOVES[moveId].name}!`, 900);
    await this.lunge(attModel, defModel.position);
    const r = this.damage(attacker, defender, moveId);
    if (r.miss) { await this.msg('Ma manca il bersaglio!', 1000); return; }
    if (r.dmg > 0) await this.hit(defModel);
    defender.hp = Math.max(0, defender.hp - r.dmg);
    this.card(defSide, defender);
    if (r.crit) await this.msg('Brutto colpo!', 900);
    if (r.eff === 0) await this.msg(`Non ha effetto su ${nameOf(defender)}...`, 1100);
    else if (r.eff > 1) await this.msg('È superefficace!', 1000);
    else if (r.eff < 1) await this.msg('Non è molto efficace...', 1000);
  }

  async tryCatch() {
    const st = this.game.state;
    if (st.balls <= 0) { await this.msg('Non hai più Sfere! Ricaricale in un Centro Cura.', 1500); return 'none'; }
    st.balls -= 1;
    await this.msg(`Lanci una Sfera!`, 500);
    const ball = makeBall();
    const from = this.origin.clone().add(new THREE.Vector3(0, 1.6, 0)).addScaledVector(this.right, 0.5);
    const to = this.foePos.clone().add(new THREE.Vector3(0, 1.0, 0));
    this.game.scene.add(ball);
    await this.anim(650, (t) => {
      ball.position.lerpVectors(from, to, t);
      ball.position.y += Math.sin(t * Math.PI) * 3;
      ball.rotation.x = t * 12;
    });
    const s = this.foeModel.scale.x;
    await this.anim(300, (t) => this.foeModel.scale.setScalar(s * (1 - t)));
    this.foeModel.visible = false;
    const groundY = heightAt(to.x, to.z) + 0.22;
    await this.anim(350, (t) => { ball.position.y = to.y + (groundY - to.y) * t * t; ball.rotation.x = 0; });
    const sp = SPECIES[this.foe.species];
    const f = this.foe.hp / maxHp(this.foe);
    const p = Math.min(0.95, Math.max(0.04, ((3 - 2 * f) / 3) * (sp.rate / 255) * 1.35));
    const caught = Math.random() < p;
    const shakes = caught ? 3 : Math.floor(Math.random() * 3);
    for (let i = 0; i < shakes; i++) {
      await this.anim(520, (t) => (ball.rotation.z = Math.sin(t * Math.PI * 2) * 0.45));
      await wait(220);
    }
    if (caught) {
      ball.children[3].material = ball.children[3].material.clone();
      ball.children[3].material.emissive.setHex(0xffd23f); ball.children[3].material.emissiveIntensity = 1.5;
      await this.msg(`Preso! ${sp.name} è stato catturato!`, 1700);
      this.game.scene.remove(ball);
      this.game.addCaught(this.foe);
      return true;
    }
    this.game.scene.remove(ball);
    this.foeModel.visible = true;
    await this.anim(300, (t) => this.foeModel.scale.setScalar(s * t));
    await this.msg(['Oh no! Si è liberato!', 'Ci eri quasi!', 'Argh! Mancava poco!'][shakes] || 'Si è liberato!', 1200);
    return false;
  }

  firstUsable() {
    return this.game.state.party.find((m) => m.hp > 0);
  }

  // ---------- main flow ----------
  async start(foe) {
    const game = this.game;
    this.active = true;
    this.foe = foe;
    game.state.seen[foe.species] = true;
    $('flash').classList.remove('on'); void $('flash').offsetWidth; $('flash').classList.add('on');
    await wait(700);
    this.stage();
    $('battle-ui').hidden = false;
    document.querySelector('#battle-ui .foe').hidden = false;
    this.card('foe', foe);
    game.hudVisible(false);
    await this.msg(`Un ${SPECIES[foe.species].name} selvatico (Lv ${foe.level}) ti sbarra la strada!`, 1700);
    this.sendOut(this.firstUsable());
    await this.msg(`Vai, ${nameOf(this.ally)}!`, 900);

    let outcome = null;
    while (!outcome) {
      const act = await this.chooseAction();
      if (act === 'fight') {
        const mv = await this.chooseMove(this.ally);
        this.cancel = null;
        if (!mv) continue;
        const allyFirst = stats(this.ally).spd >= stats(foe).spd;
        const order = allyFirst ? ['ally', 'foe'] : ['foe', 'ally'];
        for (const who of order) {
          if (this.ally.hp <= 0 || foe.hp <= 0) break;
          if (who === 'ally') await this.attack(this.ally, foe, mv, this.allyModel, this.foeModel, 'foe');
          else await this.attack(foe, this.ally, this.foeMove(), this.foeModel, this.allyModel, 'ally');
        }
      } else if (act === 'catch') {
        const res = await this.tryCatch();
        if (res === true) { outcome = 'caught'; break; }
        if (res === false) await this.attack(foe, this.ally, this.foeMove(), this.foeModel, this.allyModel, 'ally');
      } else if (act === 'team') {
        const i = await this.chooseTeam();
        this.cancel = null;
        if (i < 0) continue;
        await this.msg(`Torna, ${nameOf(this.ally)}!`, 700);
        this.sendOut(game.state.party[i]);
        await this.msg(`Vai, ${nameOf(this.ally)}!`, 800);
        await this.attack(foe, this.ally, this.foeMove(), this.foeModel, this.allyModel, 'ally');
      } else if (act === 'run') {
        const ok = stats(this.ally).spd >= stats(foe).spd || Math.random() < 0.7;
        if (ok) { await this.msg('Sei scappato senza problemi!', 1100); outcome = 'run'; break; }
        await this.msg('Non riesci a scappare!', 1000);
        await this.attack(foe, this.ally, this.foeMove(), this.foeModel, this.allyModel, 'ally');
      }

      if (foe.hp <= 0) {
        await this.faintAnim(this.foeModel);
        await this.msg(`Il ${SPECIES[foe.species].name} selvatico è esausto!`, 1200);
        const xp = Math.floor((SPECIES[foe.species].xp * foe.level) / 7);
        const events = gainXp(this.ally, xp);
        this.card('ally', this.ally);
        await this.msg(`${nameOf(this.ally)} guadagna ${xp} Punti Esperienza!`, 1300);
        for (const e of events) {
          if (e.kind === 'level') { this.card('ally', this.ally); await this.msg(`${nameOf(this.ally)} sale al livello ${e.level}!`, 1400); }
          if (e.kind === 'move') await this.msg(`${nameOf(this.ally)} impara ${e.move}!`, 1400);
        }
        outcome = 'win';
      } else if (this.ally.hp <= 0) {
        await this.faintAnim(this.allyModel);
        await this.msg(`${nameOf(this.ally)} è esausto!`, 1200);
        if (!this.firstUsable()) {
          await this.msg('Non hai più Velmon in grado di lottare...', 1500);
          await this.msg('Corri al Centro Cura più vicino!', 1300);
          outcome = 'lose';
        } else {
          const i = await this.chooseTeam(true);
          this.sendOut(game.state.party[i]);
          await this.msg(`Vai, ${nameOf(this.ally)}!`, 800);
        }
      }
    }
    this.end(outcome);
  }

  end(outcome) {
    const game = this.game;
    for (const o of [this.foeModel, this.allyModel, this.ring]) if (o) game.scene.remove(o);
    this.allyModel = null;
    game.player.model.visible = true;
    $('battle-ui').hidden = true;
    this.active = false;
    game.hudVisible(true);
    game.afterBattle(outcome);
  }

  // camera framing while the battle runs
  updateCamera(camera, time) {
    if (!this.active || !this.allyPos) return;
    const look = this.allyPos.clone().lerp(this.foePos, 0.6);
    const cam = this.origin.clone()
      .addScaledVector(this.fwd, -2.4)
      .addScaledVector(this.right, -0.4 + Math.sin(time * 0.25) * 0.3)
      .add(new THREE.Vector3(0, 3.0, 0));
    cam.y = Math.max(cam.y, heightAt(cam.x, cam.z) + 1.2);
    camera.position.lerp(cam, 0.08);
    camera.lookAt(look.x, look.y + 1.0, look.z);
    this.allyModel?.userData.animate(1 / 60);
    this.foeModel?.userData.animate(1 / 60);
  }

  update(input) {
    if (!this.active) return;
    if ((input.pressed('a') || input.pressed('jump')) && this.skip) this.skip();
    if (input.pressed('b') && this.cancel) { const c = this.cancel; this.cancel = null; c(); }
  }
}
