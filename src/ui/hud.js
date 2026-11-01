// Everything drawn in HTML over the 3D view: place/clock, minimap and world
// map, dialogue box, multiple-choice menus, team panel, banners and toasts.

import { heightAt, groundColor, TOWNS, slopeAt } from '../world/heightfield.js';
import { WORLD_HALF } from '../world/regions.js';
import { SPECIES, TYPE_COLORS } from '../creatures/species.js';
import { nameOf, maxHp } from '../creatures/monster.js';
import * as THREE from 'three';

const $ = (id) => document.getElementById(id);

export function hpColor(f) {
  return f > 0.5 ? 'var(--hp-high)' : f > 0.2 ? 'var(--hp-mid)' : 'var(--hp-low)';
}

export function typeBadges(types) {
  return types.map((t) => `<span class="type" style="background:${TYPE_COLORS[t]}">${t}</span>`).join('');
}

export class Hud {
  constructor() {
    this.modal = false;
    this.queue = null;
    this.mapImg = null;
    this.mapSize = 256;
    $('dialog').addEventListener('pointerdown', () => this.advance());
    document.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('pointerdown', (e) => { e.stopPropagation(); this.closePanels(); }));
  }

  // Renders the world map once (heights → colours). Yields so the loader can animate.
  async buildMap(progress) {
    const N = this.mapSize;
    const cv = document.createElement('canvas');
    cv.width = cv.height = N;
    const ctx = cv.getContext('2d');
    const img = ctx.createImageData(N, N);
    const c = new THREE.Color();
    for (let j = 0; j < N; j++) {
      for (let i = 0; i < N; i++) {
        const x = (i / N) * 2 * WORLD_HALF - WORLD_HALF, z = (j / N) * 2 * WORLD_HALF - WORLD_HALF;
        const h = heightAt(x, z);
        if (h < 0) c.setRGB(0.12, 0.42, 0.62).lerp(new THREE.Color(0.05, 0.2, 0.38), Math.min(-h / 30, 1));
        else groundColor(x, z, h, h > 30 ? slopeAt(x, z) : 0.2, c);
        const k = (j * N + i) * 4;
        img.data[k] = c.r * 255; img.data[k + 1] = c.g * 255; img.data[k + 2] = c.b * 255; img.data[k + 3] = 255;
      }
      if (j % 8 === 0) { progress(j / N); await new Promise((r) => { const c = new MessageChannel(); c.port1.onmessage = r; c.port2.postMessage(0); }); }
    }
    ctx.putImageData(img, 0, 0);
    this.mapImg = cv;
  }

  toMap(x, z, size) {
    return [((x + WORLD_HALF) / (2 * WORLD_HALF)) * size, ((z + WORLD_HALF) / (2 * WORLD_HALF)) * size];
  }

  // marks: [{ x, z, color, small, edge }] — edge marks stick to the rim when far away
  drawMinimap(px, pz, yaw, marks = []) {
    const cv = $('minimap'), ctx = cv.getContext('2d');
    const W = cv.width, span = 900; // metres shown across
    const s = this.mapSize / (2 * WORLD_HALF);
    ctx.save();
    ctx.clearRect(0, 0, W, W);
    ctx.beginPath(); ctx.arc(W / 2, W / 2, W / 2, 0, Math.PI * 2); ctx.clip();
    ctx.imageSmoothingEnabled = true;
    const sx = (px - span / 2 + WORLD_HALF) * s, sz = (pz - span / 2 + WORLD_HALF) * s;
    ctx.drawImage(this.mapImg, sx, sz, span * s, span * s, 0, 0, W, W);
    for (const t of TOWNS) {
      const x = ((t.x - px) / span) * W + W / 2, y = ((t.z - pz) / span) * W + W / 2;
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#d0533c'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
    for (const m of marks) {
      let x = ((m.x - px) / span) * W, y = ((m.z - pz) / span) * W;
      const r = Math.hypot(x, y), max = W / 2 - 8;
      if (r > max) { if (!m.edge) continue; x *= max / r; y *= max / r; }
      ctx.fillStyle = m.color; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x + W / 2, y + W / 2, m.small ? 4 : 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
    ctx.translate(W / 2, W / 2);
    ctx.rotate(-yaw + Math.PI);
    ctx.fillStyle = '#e8573c'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(7, 8); ctx.lineTo(0, 4); ctx.lineTo(-7, 8); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  showBigMap(px, pz, marks = []) {
    const cv = $('bigmap-canvas'), ctx = cv.getContext('2d'), W = cv.width;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.mapImg, 0, 0, W, W);
    ctx.font = '700 15px system-ui'; ctx.textAlign = 'center';
    for (const t of TOWNS) {
      const [x, y] = this.toMap(t.x, t.z, W);
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#d0533c'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.fillStyle = '#fff';
      ctx.strokeText(t.region.town.name, x, y - 14); ctx.fillText(t.region.town.name, x, y - 14);
      ctx.font = '600 12px system-ui';
      ctx.strokeText(t.region.name, x, y + 24); ctx.fillStyle = '#ffe08a'; ctx.fillText(t.region.name, x, y + 24);
      ctx.font = '700 15px system-ui';
    }
    for (const m of marks) {
      const [mx, my] = this.toMap(m.x, m.z, W);
      ctx.fillStyle = m.color; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(mx, my, m.small ? 4 : 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
    const [x, y] = this.toMap(px, pz, W);
    ctx.fillStyle = '#e8573c'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    $('bigmap').hidden = false;
    this.modal = true;
  }

  setPlace(region, clock) {
    const rn = $('region-name');
    if (rn.textContent !== region) rn.textContent = region;
    $('clock').textContent = clock;
  }

  banner(sub, title) {
    const b = $('banner');
    b.hidden = true; void b.offsetWidth;
    $('banner-sub').textContent = sub; $('banner-title').textContent = title;
    b.hidden = false;
    clearTimeout(this.bannerT);
    this.bannerT = setTimeout(() => (b.hidden = true), 3300);
  }

  toast(text, ms = 2200) {
    const t = $('toast');
    t.textContent = text; t.hidden = false;
    clearTimeout(this.toastT);
    this.toastT = setTimeout(() => (t.hidden = true), ms);
  }

  setMoney(n) {
    $('money').textContent = `💰 ${n.toLocaleString('it-IT')}`;
  }

  setWanted(n, fading = false) {
    const el = $('wanted');
    const txt = '★'.repeat(n) + '☆'.repeat(3 - n);
    if (el.textContent !== txt) el.textContent = txt;
    el.hidden = !n;
    el.classList.toggle('fading', fading);
    $('siren').hidden = !n;
  }

  // the current job: { title, goal, timer, urgent, dist } or null
  mission(m) {
    $('mission').hidden = !m;
    if (!m) return;
    $('mission-title').textContent = m.title;
    $('mission-goal').textContent = m.dist != null ? `${m.goal} · ${m.dist} m` : m.goal;
    const t = $('mission-timer');
    t.textContent = m.timer;
    t.classList.toggle('urgent', !!m.urgent);
  }

  showFire(on) {
    $('btn-fire').hidden = !on;
  }

  hint(text) {
    const h = $('hint');
    if (!text) { h.hidden = true; return; }
    if (h.textContent !== text) h.textContent = text;
    h.hidden = false;
  }

  teamStrip(party) {
    $('team-strip').innerHTML = party.map((m) => {
      const f = m.hp / maxHp(m);
      return `<div class="mini"><b>${nameOf(m)}</b> Lv${m.level}<div class="hp"><i style="width:${f * 100}%;background:${hpColor(f)}"></i></div></div>`;
    }).join('');
  }

  // Dialogue: resolves when the last line has been read.
  say(name, lines) {
    return new Promise((resolve) => {
      this.modal = true;
      this.queue = { name, lines: [...lines], resolve };
      $('dialog').hidden = false;
      $('dialog-name').textContent = name || '';
      this.nextLine();
    });
  }

  nextLine() {
    const q = this.queue;
    if (!q.lines.length) {
      $('dialog').hidden = true;
      this.queue = null;
      this.modal = false;
      q.resolve();
      return;
    }
    const full = q.lines.shift();
    const el = $('dialog-text');
    let i = 0;
    q.typing = true;
    clearInterval(this.typeT);
    this.typeT = setInterval(() => {
      i += 2;
      el.textContent = full.slice(0, i);
      if (i >= full.length) { clearInterval(this.typeT); q.typing = false; }
    }, 16);
    q.full = full;
  }

  advance() {
    const q = this.queue;
    if (!q) return;
    if (q.typing) { clearInterval(this.typeT); $('dialog-text').textContent = q.full; q.typing = false; return; }
    this.nextLine();
  }

  choose(title, options, cancellable = false) {
    return new Promise((resolve) => {
      this.modal = true;
      $('choice-title').textContent = title;
      const list = $('choice-list');
      list.innerHTML = '';
      options.forEach((o, i) => {
        const b = document.createElement('button');
        b.className = 'opt';
        b.innerHTML = typeof o === 'string' ? o : `${o.icon ? `<span style="font-size:26px">${o.icon}</span>` : ''}<span><b>${o.label}</b>${o.sub ? `<small>${o.sub}</small>` : ''}</span>`;
        b.addEventListener('pointerdown', (e) => { e.stopPropagation(); done(i); });
        list.appendChild(b);
      });
      const done = (i) => {
        $('choice').hidden = true;
        this.modal = false;
        this.choiceCancel = null;
        resolve(i);
      };
      this.choiceCancel = cancellable ? () => done(-1) : null;
      $('choice').hidden = false;
    });
  }

  showMenu(game) {
    const party = game.state.party;
    const el = $('menu-party');
    el.innerHTML = '';
    party.forEach((m, i) => {
      const sp = SPECIES[m.species], f = m.hp / maxHp(m);
      const b = document.createElement('button');
      b.className = `mon${i === 0 ? ' lead' : ''}`;
      b.innerHTML = `<span><b>${nameOf(m)}</b> <span class="sub">Lv ${m.level}</span><br>${typeBadges(sp.types)}</span><span class="sub">${m.hp}/${maxHp(m)} PS${i === 0 ? '<br>In testa' : ''}</span><div class="hp"><i style="width:${f * 100}%;background:${hpColor(f)}"></i></div>`;
      b.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        if (i === 0) return;
        party.unshift(party.splice(i, 1)[0]);
        game.save();
        this.showMenu(game);
      });
      el.appendChild(b);
    });
    const st = game.state, total = Object.keys(SPECIES).length;
    const champs = Object.keys(st.beaten).filter((k) => k.startsWith('town-')).length;
    $('menu-foot').innerHTML = `💰 Monete: <b>${st.money.toLocaleString('it-IT')}</b> · Sfere: <b>${st.balls}</b> · Box: <b>${st.box.length}</b><br>`
      + `Diario: <b>${Object.keys(st.seen).length}</b> visti, <b>${Object.keys(st.caught).length}</b> catturati su <b>${total}</b><br>`
      + `Allenatori battuti: <b>${Object.keys(st.beaten).length}</b> (campioni <b>${champs}</b>/9) · Lavoretti loschi: <b>${st.crimes || 0}</b>${st.blaster ? ' · 🎯 Spara-vernice' : ''}<br>`
      + 'Tocca un Velmon per metterlo in testa alla squadra.';
    $('menu').hidden = false;
    this.modal = true;
  }

  closePanels() {
    const open = !$('menu').hidden || !$('bigmap').hidden;
    $('menu').hidden = true;
    $('bigmap').hidden = true;
    if (open) this.modal = false;
    return open;
  }

  // keyboard handling for whatever modal is open
  update(input) {
    if (this.queue && (input.pressed('a') || input.pressed('jump'))) this.advance();
    else if (this.choiceCancel && input.pressed('b')) this.choiceCancel();
    else if ((input.pressed('b') || input.pressed('menu') || input.pressed('map')) && this.closePanels()) input.edges.clear();
  }
}
