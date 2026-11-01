// Items in the bag: what they do, what they cost at the shop, and using them.

import { maxHp, nameOf } from './creatures/monster.js';

export const ITEMS = {
  sfera: { name: 'Sfera', icon: '🔴', price: 200, desc: 'Per catturare i Velmon selvatici.' },
  pozione: { name: 'Pozione', icon: '🧪', price: 300, heal: 50, desc: 'Ridà 50 PS a un Velmon.' },
  superpozione: { name: 'Superpozione', icon: '⚗️', price: 700, heal: 9999, desc: 'Ridà tutti i PS a un Velmon.' },
  ravviva: { name: 'Ravviva', icon: '💫', price: 1200, revive: true, desc: 'Rimette in piedi un Velmon esausto con metà PS.' },
};

// How many of an item the player has (Sfere are kept in state.balls).
export const count = (st, id) => (id === 'sfera' ? st.balls : st.bag?.[id] || 0);

export function add(st, id, n = 1) {
  if (id === 'sfera') st.balls += n;
  else { st.bag ??= {}; st.bag[id] = (st.bag[id] || 0) + n; }
}

export function canUse(id, mon) {
  const it = ITEMS[id];
  if (it.revive) return mon.hp <= 0;
  if (it.heal) return mon.hp > 0 && mon.hp < maxHp(mon);
  return false;
}

// Uses the item on a Velmon; returns the message to show, or null if it had no effect.
export function use(st, id, mon) {
  if (!count(st, id) || !canUse(id, mon)) return null;
  const it = ITEMS[id];
  st.bag[id] -= 1;
  if (it.revive) { mon.hp = Math.ceil(maxHp(mon) / 2); return `${nameOf(mon)} è di nuovo in forze!`; }
  const before = mon.hp;
  mon.hp = Math.min(maxHp(mon), mon.hp + it.heal);
  return `${nameOf(mon)} recupera ${mon.hp - before} PS.`;
}

// Lets the player pick an item and then a Velmon. Resolves with the message, or null if cancelled.
export async function useFromBag(game, battleOnly = false) {
  const st = game.state, hud = game.hud;
  const ids = Object.keys(ITEMS).filter((id) => id !== 'sfera' && count(st, id) > 0);
  if (!ids.length) { hud.toast('Lo zaino è vuoto: compra qualcosa in Bottega.', 2000); return null; }
  const i = await hud.choose('Zaino', [...ids.map((id) => ({ icon: ITEMS[id].icon, label: `${ITEMS[id].name} ×${count(st, id)}`, sub: ITEMS[id].desc })), { icon: '↩︎', label: 'Indietro' }]);
  if (i < 0 || i >= ids.length) return null;
  const id = ids[i];
  const party = st.party;
  const j = await hud.choose(`Usa ${ITEMS[id].name} su…`, [...party.map((m) => ({ icon: canUse(id, m) ? '✅' : '·', label: `${nameOf(m)} Lv${m.level}`, sub: `${m.hp}/${maxHp(m)} PS` })), { icon: '↩︎', label: 'Indietro' }]);
  if (j < 0 || j >= party.length) return null;
  const msg = use(st, id, party[j]);
  if (!msg) { hud.toast('Non avrebbe nessun effetto.', 1600); return null; }
  if (!battleOnly) { hud.toast(msg, 2000); hud.teamStrip(party); game.save(); }
  return msg;
}
