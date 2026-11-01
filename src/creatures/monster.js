// A single Velmon: level, experience, stats, moves and current HP.

import { SPECIES, MOVES } from './species.js';

export const MAX_LEVEL = 100;
export const xpForLevel = (l) => l * l * l;

export function statsFor(speciesId, level) {
  const b = SPECIES[speciesId].base;
  const st = (v) => Math.floor((v * 2 * level) / 100) + 5;
  return { hp: Math.floor((b.hp * 2 * level) / 100) + level + 10, atk: st(b.atk), def: st(b.def), spd: st(b.spd) };
}

export function movesAt(speciesId, level) {
  const learned = SPECIES[speciesId].learn.filter(([l]) => l <= level).map(([, m]) => m);
  return [...new Set(learned)].slice(-4);
}

export function createMonster(speciesId, level, nickname = null) {
  const s = statsFor(speciesId, level);
  return { id: crypto.randomUUID ? crypto.randomUUID() : String(Math.random()), species: speciesId, nickname, level, xp: xpForLevel(level), hp: s.hp, moves: movesAt(speciesId, level) };
}

export const nameOf = (m) => m.nickname || SPECIES[m.species].name;
export const stats = (m) => statsFor(m.species, m.level);
export const maxHp = (m) => stats(m).hp;

// Adds experience and returns the list of events (level ups, new moves).
export function gainXp(m, amount) {
  const events = [];
  m.xp += amount;
  while (m.level < MAX_LEVEL && m.xp >= xpForLevel(m.level + 1)) {
    const before = maxHp(m);
    m.level += 1;
    m.hp += maxHp(m) - before;
    events.push({ kind: 'level', level: m.level });
    for (const [l, mv] of SPECIES[m.species].learn) {
      if (l === m.level && !m.moves.includes(mv)) {
        if (m.moves.length >= 4) m.moves.shift();
        m.moves.push(mv);
        events.push({ kind: 'move', move: MOVES[mv].name });
      }
    }
  }
  return events;
}

export function heal(m) {
  m.hp = maxHp(m);
}

// The species this Velmon is ready to evolve into, or null.
export function pendingEvolution(m) {
  const e = SPECIES[m.species].evo;
  return e && m.level >= e.level && m.hp > 0 ? e.to : null;
}

// Turns the Velmon into its evolved form: stats grow (the HP lost so far is
// kept) and it learns the new species' moves up to its level that it lacks.
export function evolve(m, to) {
  const lost = maxHp(m) - m.hp;
  m.species = to;
  m.hp = Math.max(1, maxHp(m) - lost);
  const learned = [];
  for (const [l, mv] of SPECIES[to].learn) {
    if (l <= m.level && !m.moves.includes(mv) && learned.length < 2) {
      if (m.moves.length >= 4) m.moves.shift();
      m.moves.push(mv);
      learned.push(MOVES[mv].name);
    }
  }
  return learned;
}
