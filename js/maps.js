'use strict';
/* ============================================================
   maps.js — il mondo di Valmora
   Tutte le mappe esterne sono larghe 24 tile.
   ============================================================ */

// tile extra: imbocco di grotta
TILE_DRAW.caveentry = function (g) {
  TILE_DRAW.mountain(g);
  g.fillStyle = '#181410'; g.fillRect(3, 5, 10, 11);
  g.fillStyle = '#181410'; g.fillRect(4, 3, 8, 2);
  g.fillStyle = '#2c241c'; g.fillRect(4, 5, 2, 9);
};

/* ---------- legenda tile ---------- */
const TD = {
  '.': { t: 'grass' },
  't': { t: 'tall', grass: true },
  'f': { t: 'flower' },
  'p': { t: 'path' },
  'T': { t: 'tree', solid: true },
  'w': { t: 'water', solid: true },
  'F': { t: 'fence', solid: true },
  'S': { t: 'sign', solid: true, sign: true },
  'L': { t: 'ledge', ledge: true },
  'M': { t: 'mountain', solid: true },
  'E': { t: 'caveentry' },
  'C': { t: 'cavewall', solid: true },
  'c': { t: 'cavefloor', cave: true },
  'y': { t: 'crystal', solid: true },
  'B': { t: 'wall', solid: true },
  'W': { t: 'window', solid: true },
  'r': { t: 'roof', solid: true },
  'D': { t: 'door' },
  '_': { t: 'intwall', solid: true },
  '=': { t: 'intfloor' },
  'b': { t: 'shelf', solid: true },
  'k': { t: 'counter', solid: true, counter: true },
  'q': { t: 'table', solid: true },
  'm': { t: 'mat' },
  'P': { t: 'pc', solid: true, pc: true },
  'h': { t: 'healer', solid: true, healer: true },
  'a': { t: 'arenafloor' },
  'x': { t: 'statue', solid: true },
};

const Rp = (s, n) => s.repeat(n);
const MAPS = {};

/* ============================================================
   BORGO QUERCIA
   ============================================================ */
MAPS.borgo = {
  name: 'Borgo Quercia', music: 'town', outdoor: true, theme: '#d86048',
  tiles: [
    Rp('T', 10) + 'ppp' + Rp('T', 11),
    'T' + Rp('.', 9) + 'ppp' + Rp('.', 10) + 'T',
    'T' + Rp('.', 22) + 'T',
    'T' + Rp('.', 2) + Rp('r', 6) + '.' + 'ppp' + Rp('.', 2) + Rp('r', 6) + Rp('.', 2) + 'T',
    'T' + Rp('.', 2) + Rp('r', 6) + '.' + 'ppp' + Rp('.', 2) + Rp('r', 6) + Rp('.', 2) + 'T',
    'T' + Rp('.', 2) + 'BWDWWB' + '.' + 'ppp' + Rp('.', 2) + 'BWWDWB' + Rp('.', 2) + 'T',
    'T' + Rp('.', 4) + 'p' + Rp('.', 4) + 'ppp' + Rp('.', 5) + 'p' + Rp('.', 4) + 'T',
    'T' + Rp('.', 9) + 'ppp' + Rp('.', 10) + 'T',
    'T' + Rp('.', 4) + 'S' + Rp('.', 4) + 'ppp' + Rp('.', 10) + 'T',
    'T' + Rp('.', 2) + 'ff' + Rp('.', 5) + 'ppp' + Rp('.', 5) + 'ff' + Rp('.', 3) + 'T',
    'T' + Rp('.', 9) + 'ppp' + Rp('.', 10) + 'T',
    'T' + Rp('.', 9) + 'ppp' + Rp('r', 8) + Rp('.', 2) + 'T',
    'T' + Rp('.', 9) + 'ppp' + Rp('r', 8) + Rp('.', 2) + 'T',
    'T' + Rp('.', 9) + 'ppp' + 'BWWDWWWB' + Rp('.', 2) + 'T',
    'T' + Rp('.', 9) + 'ppp' + '.' + Rp('.', 2) + 'p' + Rp('.', 6) + 'T',
    'T' + Rp('.', 2) + 'ww' + Rp('.', 5) + 'ppp' + Rp('.', 2) + 'S' + Rp('.', 7) + 'T',
    'T' + Rp('.', 2) + 'ww' + Rp('.', 5) + 'ppp' + Rp('.', 10) + 'T',
    'T' + Rp('.', 4) + 'ff' + Rp('.', 3) + 'ppp' + Rp('.', 3) + 'ff' + Rp('.', 5) + 'T',
    'T' + Rp('.', 22) + 'T',
    Rp('T', 24),
  ],
  warps: [
    { x: 10, y: 0, to: 'route1', tx: 11, ty: 26, dir: 'up' },
    { x: 11, y: 0, to: 'route1', tx: 11, ty: 26, dir: 'up' },
    { x: 12, y: 0, to: 'route1', tx: 11, ty: 26, dir: 'up' },
    { x: 5, y: 5, to: 'casa', tx: 4, ty: 6, dir: 'up' },
    { x: 18, y: 5, to: 'casadario', tx: 4, ty: 6, dir: 'up' },
    { x: 16, y: 13, to: 'lab', tx: 5, ty: 8, dir: 'up' },
  ],
  signs: { '5,8': 'BORGO QUERCIA\n"Dove ogni leggenda mette radici."', '15,15': 'LABORATORIO VELMON\nProf.ssa Quercia' },
  npcs: [
    { x: 6, y: 9, preset: 'boy', dir: 'down', move: 'wander', say: ['Anche tu ricevi oggi il tuo primo Velmon? Che invidia!'] },
    { x: 16, y: 17, preset: 'girl', dir: 'left', move: 'wander', say: ['L\'erba alta è piena di Velmon selvatici. Non entrarci senza il tuo!'] },
  ],
  objects: [],
  triggers: [
    { x: 10, y: 1, w: 3, cond: sv => !sv.flags.starter, script: [
      { say: ['PROF.SSA QUERCIA: Aspetta! Fermati!', 'È pericoloso andare nell\'erba alta senza un Velmon!', 'Passa dal mio laboratorio, è la casa grande qui a sud!'] },
      { step: 'down' },
    ] },
  ],
};

MAPS.casa = {
  name: 'Casa tua', music: 'town', interior: true,
  tiles: [
    '__________',
    '__________',
    '_=qq====b_',
    '_========_',
    '_========_',
    '_========_',
    '_========_',
    '____mm____',
  ],
  warps: [
    { x: 4, y: 7, to: 'borgo', tx: 5, ty: 6, dir: 'down' },
    { x: 5, y: 7, to: 'borgo', tx: 5, ty: 6, dir: 'down' },
  ],
  npcs: [
    { x: 2, y: 4, preset: 'mamma', dir: 'down', move: 'wander', say: sv => sv.flags.starter
      ? ['MAMMA: Che bel Velmon! Abbi cura di lui e... cambia le calze ogni giorno!', 'Riposati qui quando vuoi, tesoro.']
      : ['MAMMA: Tutti i grandi viaggi iniziano con un piccolo passo.', 'La Prof.ssa Quercia ti stava cercando!'], heal: 'home' },
  ],
  objects: [], triggers: [],
};

MAPS.casadario = {
  name: 'Casa di Dario', music: 'town', interior: true,
  tiles: [
    '__________',
    '__________',
    '_b=====qq_',
    '_========_',
    '_========_',
    '_========_',
    '_========_',
    '____mm____',
  ],
  warps: [
    { x: 4, y: 7, to: 'borgo', tx: 18, ty: 6, dir: 'down' },
    { x: 5, y: 7, to: 'borgo', tx: 18, ty: 6, dir: 'down' },
  ],
  npcs: [
    { x: 6, y: 4, preset: 'girl', dir: 'down', move: 'wander', say: (sv, npc, ow) => {
      if (!sv.flags.dario_sis) {
        sv.flags.dario_sis = true;
        ow.giveItem('pozione', 1);
        return ['Sono la sorella di Dario. Mio fratello corre sempre troppo...', 'Tieni, una POZIONE! Per il viaggio.'];
      }
      return ['Dario si allena giorno e notte. Chissà dove sarà adesso.'];
    } },
  ],
  objects: [], triggers: [],
};

MAPS.lab = {
  name: 'Laboratorio Velmon', music: 'town', interior: true,
  tiles: [
    '____________',
    '____________',
    '_bb==qq==bb_',
    '_==========_',
    '_==qqq=====_',
    '_==========_',
    '_==========_',
    '_==========_',
    '_==========_',
    '_____mm_____',
  ],
  warps: [
    { x: 5, y: 9, to: 'borgo', tx: 16, ty: 14, dir: 'down' },
    { x: 6, y: 9, to: 'borgo', tx: 16, ty: 14, dir: 'down' },
  ],
  npcs: [
    { x: 4, y: 3, preset: 'prof', dir: 'down', say: sv => {
      if (!sv.flags.starter) return ['PROF.SSA QUERCIA: Benvenuto! Studio i Velmon, le meravigliose creature di Valmora.', 'Sul tavolo ci sono tre Vortex: dentro ognuna c\'è un Velmon.', 'Scegline uno: sarà il tuo compagno di viaggio!'];
      if (!sv.flags.grifagna) return ['PROF.SSA QUERCIA: Sfida le Arene e riempi il Velmodex!', 'Ho sentito brutte voci sulla Banda Grifagna... fai attenzione nelle grotte.'];
      if (!sv.flags.champion) return ['PROF.SSA QUERCIA: Hai fermato la Banda Grifagna! Sei già una leggenda.', 'La Lega di Valmora ti aspetta oltre Rubinia!'];
      return ['PROF.SSA QUERCIA: Campione di Valmora! Il tuo Velmodex farà la storia.', 'Dicono che FOLGODRAGO dorma ancora nella Via della Vittoria...'];
    } },
    { x: 9, y: 6, preset: 'clerk', dir: 'left', move: 'wander', say: ['Gli assistenti come me catalogano i Velmon giorno e notte.', 'Il Velmodex si aggiorna da solo quando vedi o catturi un Velmon!'] },
    { x: 7, y: 5, preset: 'rival', dir: 'left', cond: sv => !sv.flags.rival1, say: ['DARIO: Io sono qui da ore! Nonna Quercia ha promesso un Velmon anche a me.', 'Scegli pure per primo... tanto io prenderò quello più forte!'] },
  ],
  objects: [
    { x: 3, y: 4, kind: 'sphere', species: 'fogliotto' },
    { x: 4, y: 4, kind: 'sphere', species: 'braciotto' },
    { x: 5, y: 4, kind: 'sphere', species: 'gocciolo' },
  ],
  triggers: [
    { x: 5, y: 8, w: 2, cond: sv => sv.flags.starter && !sv.flags.rival1, script: [
      { say: ['DARIO: Ehi! Non scappare!', 'Vediamo subito chi ha scelto meglio. Sfidami!'] },
      { flag: 'rival1' },
      { battle: { trainerName: 'DARIO', preset: 'rival', money: 500, rivalStage: 1,
        winText: ['DARIO: Tsk! Ho solo sbagliato il riscaldamento.', 'Ci rivedremo sul Sentiero, preparati!'] } },
      { say: ['PROF.SSA QUERCIA: Che energia, voi due!', 'Tieni: 5 VORTEX e il VELMODEX. Vai e diventa il Campione di Valmora!'] },
      { fn: ow => { ow.giveItem('vortex', 5); } },
    ] },
  ],
};

/* ============================================================
   SENTIERO 1
   ============================================================ */
MAPS.route1 = {
  name: 'Sentiero 1', music: 'route', outdoor: true,
  tiles: [
    Rp('T', 10) + 'ppp' + Rp('T', 11),
    'T' + Rp('.', 9) + 'ppp' + Rp('.', 10) + 'T',
    'T' + Rp('.', 2) + 'ttt' + Rp('.', 4) + 'ppp' + Rp('.', 4) + 'ttt' + Rp('.', 3) + 'T',
    'T' + Rp('.', 2) + 'ttt' + Rp('.', 4) + 'ppp' + Rp('.', 4) + 'ttt' + Rp('.', 3) + 'T',
    'T' + Rp('.', 9) + 'ppp' + Rp('.', 10) + 'T',
    'T' + Rp('.', 4) + 'S' + Rp('.', 4) + 'ppp' + Rp('.', 10) + 'T',
    'T' + Rp('.', 9) + 'ppp' + Rp('.', 10) + 'T',
    'T' + Rp('L', 9) + 'ppp' + Rp('L', 10) + 'T',
    'T' + Rp('.', 9) + 'ppp' + Rp('.', 10) + 'T',
    'T' + Rp('.', 2) + 'tttt' + Rp('.', 3) + 'ppp' + Rp('.', 3) + 'tttt' + Rp('.', 3) + 'T',
    'T' + Rp('.', 2) + 'tttt' + Rp('.', 3) + 'ppp' + Rp('.', 3) + 'tttt' + Rp('.', 3) + 'T',
    'T' + Rp('.', 2) + 'tttt' + Rp('.', 3) + 'ppp' + Rp('.', 10) + 'T',
    'T' + Rp('.', 9) + 'ppp' + Rp('.', 10) + 'T',
    'T' + Rp('.', 9) + 'ppp' + Rp('.', 4) + 'f' + Rp('.', 5) + 'T',
    'T' + Rp('.', 9) + 'ppp' + Rp('.', 10) + 'T',
    'T' + Rp('L', 9) + 'ppp' + Rp('L', 10) + 'T',
    'T' + Rp('.', 9) + 'ppp' + Rp('.', 10) + 'T',
    'T' + Rp('.', 2) + 'ttttt' + Rp('.', 2) + 'ppp' + Rp('.', 2) + 'ttttt' + Rp('.', 3) + 'T',
    'T' + Rp('.', 2) + 'ttttt' + Rp('.', 2) + 'ppp' + Rp('.', 2) + 'ttttt' + Rp('.', 3) + 'T',
    'T' + Rp('.', 9) + 'ppp' + Rp('.', 10) + 'T',
    'T' + Rp('.', 9) + 'ppp' + Rp('.', 10) + 'T',
    'T' + Rp('.', 4) + 'ff' + Rp('.', 3) + 'ppp' + Rp('.', 4) + 'ff' + Rp('.', 4) + 'T',
    'T' + Rp('.', 9) + 'ppp' + Rp('.', 10) + 'T',
    'T' + Rp('.', 2) + 'ttt' + Rp('.', 4) + 'ppp' + Rp('.', 4) + 'ttt' + Rp('.', 3) + 'T',
    'T' + Rp('.', 2) + 'ttt' + Rp('.', 4) + 'ppp' + Rp('.', 4) + 'ttt' + Rp('.', 3) + 'T',
    'T' + Rp('.', 9) + 'ppp' + Rp('.', 10) + 'T',
    'T' + Rp('.', 9) + 'ppp' + Rp('.', 10) + 'T',
    Rp('T', 10) + 'ppp' + Rp('T', 11),
  ],
  warps: [
    { x: 10, y: 0, to: 'pietraviva', tx: 11, ty: 20, dir: 'up' },
    { x: 11, y: 0, to: 'pietraviva', tx: 11, ty: 20, dir: 'up' },
    { x: 12, y: 0, to: 'pietraviva', tx: 11, ty: 20, dir: 'up' },
    { x: 10, y: 27, to: 'borgo', tx: 11, ty: 1, dir: 'down' },
    { x: 11, y: 27, to: 'borgo', tx: 11, ty: 1, dir: 'down' },
    { x: 12, y: 27, to: 'borgo', tx: 11, ty: 1, dir: 'down' },
  ],
  signs: { '5,5': 'SENTIERO 1\nBorgo Quercia ↓  Pietraviva ↑' },
  npcs: [
    { x: 14, y: 5, preset: 'oldman', dir: 'down', move: 'wander', say: ['Cammina nell\'erba alta e i Velmon selvatici salteranno fuori!', 'Indebolisci un Velmon prima di lanciare il Vortex: avrai più fortuna.'] },
    { x: 6, y: 12, preset: 'boy', dir: 'right', trainer: { name: 'Bullo TONIO', flag: 'tr_r1_a', los: 4, money: 210,
      team: [['sorcetto', 7], ['passerotto', 7]],
      before: ['Ehi tu! Le mie creature sono imbattibili!'],
      win: ['Nooo! I miei piccoletti!'],
      after: ['Devo allenarmi di più nell\'erba alta...'] } },
    { x: 16, y: 19, preset: 'girl', dir: 'left', trainer: { name: 'Pestifera LIA', flag: 'tr_r1_b', los: 4, money: 240,
      team: [['brucolo', 8], ['funghetto', 8]],
      before: ['I Velmon del bosco sono i più carini! E pungono!'],
      win: ['Uffa! Tornate nel bosco!'],
      after: ['I tuoi Velmon sono più carini dei miei, lo ammetto.'] } },
  ],
  objects: [{ x: 2, y: 5, kind: 'item', item: 'pozione' }],
  triggers: [],
  enc: { rate: 0.13, list: [['sorcetto', 2, 4, 30], ['passerotto', 2, 4, 30], ['brucolo', 2, 4, 25], ['funghetto', 3, 4, 15]] },
};

/* ============================================================
   PIETRAVIVA (Arena 1 — Roccia)
   ============================================================ */
MAPS.pietraviva = {
  name: 'Pietraviva', music: 'town', outdoor: true, theme: '#b89858',
  tiles: [
    Rp('T', 10) + 'ppp' + Rp('T', 11),
    'T' + Rp('.', 9) + 'ppp' + Rp('.', 10) + 'T',
    'T' + Rp('.', 9) + 'ppp' + Rp('.', 10) + 'T',
    'T' + '.' + Rp('r', 8) + 'ppp' + Rp('.', 10) + 'T',
    'T' + '.' + Rp('r', 8) + 'ppp' + Rp('.', 10) + 'T',
    'T' + '.' + 'BWWDWWWB' + 'ppp' + Rp('.', 10) + 'T',
    'T' + Rp('.', 4) + 'p' + Rp('.', 4) + 'ppp' + Rp('.', 10) + 'T',
    'T' + Rp('.', 9) + 'ppp' + Rp('.', 10) + 'T',
    'T' + Rp('.', 9) + 'ppp' + '.' + Rp('r', 6) + Rp('.', 3) + 'T',
    'T' + Rp('.', 9) + 'ppp' + '.' + Rp('r', 6) + Rp('.', 3) + 'T',
    'T' + Rp('.', 9) + 'ppp' + '.' + 'BWDWWB' + Rp('.', 3) + 'T',
    'T' + Rp('.', 9) + 'ppp' + Rp('.', 3) + 'p' + Rp('.', 6) + 'T',
    'T' + Rp('.', 9) + 'ppp' + '.' + Rp('r', 6) + Rp('.', 3) + 'T',
    'T' + Rp('.', 9) + 'ppp' + '.' + Rp('r', 6) + Rp('.', 3) + 'T',
    'T' + Rp('.', 9) + 'ppp' + '.' + 'BWDWWB' + Rp('.', 3) + 'T',
    'T' + Rp('.', 9) + 'ppp' + Rp('.', 3) + 'p' + Rp('.', 6) + 'T',
    'T' + Rp('.', 2) + 'S' + Rp('.', 6) + 'ppp' + Rp('.', 10) + 'T',
    'T' + Rp('.', 2) + 'ff' + Rp('.', 5) + 'ppp' + Rp('.', 5) + 'ff' + Rp('.', 3) + 'T',
    'T' + Rp('.', 9) + 'ppp' + Rp('.', 10) + 'T',
    'T' + Rp('.', 9) + 'ppp' + Rp('.', 10) + 'T',
    'T' + Rp('.', 9) + 'ppp' + Rp('.', 10) + 'T',
    Rp('T', 10) + 'ppp' + Rp('T', 11),
  ],
  warps: [
    { x: 10, y: 0, to: 'route2', tx: 11, ty: 24, dir: 'up' },
    { x: 11, y: 0, to: 'route2', tx: 11, ty: 24, dir: 'up' },
    { x: 12, y: 0, to: 'route2', tx: 11, ty: 24, dir: 'up' },
    { x: 10, y: 21, to: 'route1', tx: 11, ty: 1, dir: 'down' },
    { x: 11, y: 21, to: 'route1', tx: 11, ty: 1, dir: 'down' },
    { x: 12, y: 21, to: 'route1', tx: 11, ty: 1, dir: 'down' },
    { x: 5, y: 5, to: 'arena1', tx: 6, ty: 10, dir: 'up' },
    { x: 16, y: 10, to: 'centro_pv', tx: 5, ty: 7, dir: 'up' },
    { x: 16, y: 14, to: 'emporio_pv', tx: 5, ty: 7, dir: 'up' },
  ],
  signs: { '3,16': 'PIETRAVIVA\n"La città scolpita nella roccia."' },
  npcs: [
    { x: 11, y: 1, preset: 'oldman', dir: 'down', cond: sv => !sv.badges[0],
      say: ['Il Sentiero 2 è franato di recente: troppo rischioso per un novellino!', 'Vinci il SIGILLO DI PIETRA all\'Arena e ti farò passare.'] },
    { x: 5, y: 12, preset: 'girl', dir: 'down', move: 'wander', say: ['Rocco sembra burbero, ma piange ai matrimoni. Non dirgli che te l\'ho detto!'] },
    { x: 15, y: 17, preset: 'boy', dir: 'left', move: 'wander', say: ['Al CENTRO DI CURA rimettono in forze i Velmon gratis!', 'E all\'EMPORIO trovi Pozioni e Vortex.'] },
  ],
  objects: [],
  triggers: [],
};

/* ============================================================
   SENTIERO 2 + BOSCO OMBROSO
   ============================================================ */
MAPS.route2 = {
  name: 'Sentiero 2', music: 'route', outdoor: true,
  tiles: [
    Rp('T', 10) + 'ppp' + Rp('T', 11),
    'T' + Rp('.', 9) + 'ppp' + Rp('.', 10) + 'T',
    'T' + Rp('.', 2) + 'tttt' + Rp('.', 3) + 'ppp' + Rp('.', 3) + 'tttt' + Rp('.', 3) + 'T',
    'T' + Rp('.', 2) + 'tttt' + Rp('.', 3) + 'ppp' + Rp('.', 3) + 'tttt' + Rp('.', 3) + 'T',
    'T' + Rp('.', 9) + 'ppp' + Rp('.', 10) + 'T',
    'T' + Rp('.', 3) + 'S' + Rp('.', 5) + 'ppp' + Rp('.', 10) + 'T',
    'T' + Rp('.', 9) + 'ppp' + Rp('.', 10) + 'T',
    'T' + Rp('.', 2) + 'ttttt' + Rp('.', 2) + 'ppp' + Rp('.', 2) + 'ttttt' + Rp('.', 3) + 'T',
    'T' + Rp('.', 2) + 'ttttt' + Rp('.', 2) + 'ppp' + Rp('.', 2) + 'ttttt' + Rp('.', 3) + 'T',
    'T' + Rp('.', 2) + 'ttttt' + Rp('.', 2) + 'ppp' + Rp('.', 2) + 'ttttt' + Rp('.', 3) + 'T',
    'T' + Rp('.', 9) + 'ppp' + Rp('.', 10) + 'T',
    'T' + Rp('L', 9) + 'ppp' + Rp('L', 10) + 'T',
    'T' + Rp('.', 9) + 'ppp' + Rp('.', 10) + 'T',
    'T' + Rp('.', 2) + 'ff' + Rp('.', 5) + 'ppp' + Rp('.', 4) + 'ff' + Rp('.', 4) + 'T',
    'T' + Rp('.', 9) + 'ppp' + Rp('.', 10) + 'T',
    'T' + Rp('.', 2) + 'tttt' + Rp('.', 3) + 'ppp' + Rp('.', 3) + 'tttt' + Rp('.', 3) + 'T',
    'T' + Rp('.', 2) + 'tttt' + Rp('.', 3) + 'ppp' + Rp('.', 3) + 'tttt' + Rp('.', 3) + 'T',
    'T' + Rp('.', 2) + 'tttt' + Rp('.', 3) + 'ppp' + Rp('.', 3) + 'tttt' + Rp('.', 3) + 'T',
    'T' + Rp('.', 9) + 'ppp' + Rp('.', 10) + 'T',
    'T' + Rp('.', 9) + 'ppp' + Rp('.', 10) + 'T',
    'T' + Rp('.', 4) + 'f' + Rp('.', 4) + 'ppp' + Rp('.', 5) + 'f' + Rp('.', 4) + 'T',
    'T' + Rp('.', 9) + 'ppp' + Rp('.', 10) + 'T',
    'T' + Rp('.', 2) + 'ttt' + Rp('.', 4) + 'ppp' + Rp('.', 4) + 'ttt' + Rp('.', 3) + 'T',
    'T' + Rp('.', 2) + 'ttt' + Rp('.', 4) + 'ppp' + Rp('.', 4) + 'ttt' + Rp('.', 3) + 'T',
    'T' + Rp('.', 9) + 'ppp' + Rp('.', 10) + 'T',
    Rp('T', 10) + 'ppp' + Rp('T', 11),
  ],
  warps: [
    { x: 10, y: 0, to: 'bosco', tx: 11, ty: 18, dir: 'up' },
    { x: 11, y: 0, to: 'bosco', tx: 11, ty: 18, dir: 'up' },
    { x: 12, y: 0, to: 'bosco', tx: 11, ty: 18, dir: 'up' },
    { x: 10, y: 25, to: 'pietraviva', tx: 11, ty: 1, dir: 'down' },
    { x: 11, y: 25, to: 'pietraviva', tx: 11, ty: 1, dir: 'down' },
    { x: 12, y: 25, to: 'pietraviva', tx: 11, ty: 1, dir: 'down' },
  ],
  signs: { '4,5': 'SENTIERO 2\nBosco Ombroso ↑' },
  npcs: [
    { x: 6, y: 8, preset: 'boy', dir: 'right', trainer: { name: 'Esploratore GINO', flag: 'tr_r2_a', los: 4, money: 360,
      team: [['sorcetto', 12], ['cucciorso', 12]],
      before: ['Mi alleno per esplorare le grotte! Sei il mio riscaldamento!'],
      win: ['Ahi ahi ahi! Che batosta!'],
      after: ['Forse dovrei esplorare... un altro mestiere.'] } },
    { x: 16, y: 16, preset: 'girl', dir: 'left', trainer: { name: 'Giardiniera EVA', flag: 'tr_r2_b', los: 4, money: 390,
      team: [['pinnetta', 13], ['funghetto', 12]],
      before: ['Annaffio i miei Velmon ogni mattina. Crescono fortissimi!'],
      win: ['Oh no, appassiti!'],
      after: ['Ti regalerei un fiore, ma li ho finiti.'] } },
    { x: 14, y: 21, preset: 'hiker', dir: 'left', trainer: { name: 'Montanaro BEPPE', flag: 'tr_r2_c', los: 3, money: 420,
      team: [['sassolo', 13], ['sassolo', 14]],
      before: ['ROCCIA! Solo la ROCCIA conta quassù!'],
      win: ['Frantumato come ghiaia!'],
      after: ['La roccia insegna la pazienza, ragazzo.'] } },
  ],
  objects: [{ x: 20, y: 20, kind: 'item', item: 'vortex' }],
  triggers: [],
  enc: { rate: 0.13, list: [['sorcetto', 6, 9, 25], ['passerotto', 6, 9, 25], ['brucolo', 6, 8, 15], ['crisalin', 7, 9, 15], ['funghetto', 7, 9, 20]] },
};

MAPS.bosco = {
  name: 'Bosco Ombroso', music: 'forest', outdoor: true,
  tiles: [
    Rp('T', 10) + 'ppp' + Rp('T', 11),
    'T' + Rp('.', 9) + 'ppp' + Rp('.', 10) + 'T',
    'T' + 'TT' + Rp('.', 5) + 'tt' + 'ppp' + 'tt' + Rp('.', 3) + 'TTT' + Rp('.', 2) + 'T',
    'T' + Rp('.', 2) + 'TT' + Rp('.', 3) + 'tt' + 'ppp' + 'tt' + Rp('.', 2) + 'TT' + Rp('.', 4) + 'T',
    'T' + Rp('.', 9) + 'ppp' + Rp('.', 10) + 'T',
    'T' + Rp('.', 2) + 'tttt' + Rp('.', 3) + 'ppp' + 'TTTT' + Rp('.', 2) + 'tt' + Rp('.', 2) + 'T',
    'T' + Rp('.', 2) + 'tttt' + Rp('.', 3) + 'ppp' + Rp('.', 2) + 'tttt' + Rp('.', 4) + 'T',
    'T' + 'TTT' + Rp('.', 6) + 'ppp' + 'tt' + Rp('.', 2) + 'TTT' + Rp('.', 3) + 'T',
    'T' + Rp('.', 9) + 'ppp' + Rp('.', 10) + 'T',
    'T' + Rp('.', 2) + 'S' + Rp('.', 6) + 'ppp' + Rp('.', 2) + 'tttt' + Rp('.', 4) + 'T',
    'T' + Rp('.', 2) + 'tttt' + Rp('.', 3) + 'ppp' + 'TT' + Rp('.', 3) + 'tt' + Rp('.', 3) + 'T',
    'T' + Rp('.', 2) + 'tttt' + Rp('.', 3) + 'ppp' + Rp('.', 3) + 'tttt' + Rp('.', 3) + 'T',
    'T' + Rp('.', 9) + 'ppp' + Rp('.', 10) + 'T',
    'T' + 'TT' + Rp('.', 3) + 'tt' + Rp('.', 2) + 'ppp' + 'tt' + Rp('.', 4) + 'TT' + Rp('.', 2) + 'T',
    'T' + Rp('.', 9) + 'ppp' + Rp('.', 10) + 'T',
    'T' + Rp('.', 2) + 'tttt' + Rp('.', 3) + 'ppp' + Rp('.', 3) + 'tttt' + Rp('.', 3) + 'T',
    'T' + Rp('.', 2) + 'tttt' + Rp('.', 3) + 'ppp' + Rp('.', 3) + 'tttt' + Rp('.', 3) + 'T',
    'T' + Rp('.', 9) + 'ppp' + Rp('.', 10) + 'T',
    'T' + Rp('.', 9) + 'ppp' + Rp('.', 10) + 'T',
    Rp('T', 10) + 'ppp' + Rp('T', 11),
  ],
  warps: [
    { x: 10, y: 0, to: 'ondachiara', tx: 11, ty: 20, dir: 'up' },
    { x: 11, y: 0, to: 'ondachiara', tx: 11, ty: 20, dir: 'up' },
    { x: 12, y: 0, to: 'ondachiara', tx: 11, ty: 20, dir: 'up' },
    { x: 10, y: 19, to: 'route2', tx: 11, ty: 1, dir: 'down' },
    { x: 11, y: 19, to: 'route2', tx: 11, ty: 1, dir: 'down' },
    { x: 12, y: 19, to: 'route2', tx: 11, ty: 1, dir: 'down' },
  ],
  signs: { '3,9': 'BOSCO OMBROSO\n"Chi si perde qui, trova se stesso."' },
  npcs: [
    { x: 6, y: 6, preset: 'boy', dir: 'right', trainer: { name: 'Retino PIERO', flag: 'tr_bo_a', los: 4, money: 390,
      team: [['brucolo', 13], ['crisalin', 13]],
      before: ['Colleziono Velmon insetto da quando avevo tre anni!'],
      win: ['La mia collezione!'],
      after: ['Un giorno il mio Crisalin diventerà uno splendido Farfaluce.'] } },
    { x: 15, y: 15, preset: 'girl', dir: 'left', trainer: { name: 'Strega SELVAGGIA', flag: 'tr_bo_b', los: 3, money: 450,
      team: [['farfaluce', 15]],
      before: ['Il bosco sussurra il tuo nome... e ride!'],
      win: ['Gli spiriti oggi dormono...'],
      after: ['Hai mai visto un Gufospettro? Appare solo ai perduti.'] } },
    { x: 13, y: 1, preset: 'rival', dir: 'down', cond: sv => sv.flags.starter && !sv.flags.rival2,
      say: ['DARIO: Ti stavo aspettando!'] },
  ],
  objects: [
    { x: 2, y: 4, kind: 'item', item: 'antidoto' },
    { x: 21, y: 16, kind: 'item', item: 'superpozione' },
  ],
  triggers: [
    { x: 10, y: 2, w: 3, cond: sv => sv.flags.starter && !sv.flags.rival2, script: [
      { say: ['DARIO: Eccoti finalmente! Il mio Velmon è già super allenato.', 'Stavolta non avrai scuse!'] },
      { flag: 'rival2' },
      { battle: { trainerName: 'DARIO', preset: 'rival', money: 900, rivalStage: 2,
        winText: ['DARIO: Cosa?! Impossibile!', 'Mi serve solo più allenamento. Alla prossima non riderai!'] } },
    ] },
  ],
  enc: { rate: 0.14, list: [['brucolo', 12, 14, 20], ['crisalin', 12, 14, 20], ['funghetto', 12, 15, 25], ['ombrolo', 13, 15, 15], ['farfaluce', 14, 15, 10], ['gufospettro', 16, 16, 4]] },
};

/* ============================================================
   ONDACHIARA (Arena 2 — Acqua)
   ============================================================ */
MAPS.ondachiara = {
  name: 'Ondachiara', music: 'town', outdoor: true, theme: '#4878d0',
  tiles: [
    Rp('T', 10) + 'ppp' + Rp('T', 11),
    'T' + Rp('.', 9) + 'ppp' + Rp('.', 10) + 'T',
    'T' + 'ww' + Rp('.', 7) + 'ppp' + Rp('.', 8) + 'ww' + 'T',
    'T' + '.' + Rp('r', 8) + 'ppp' + Rp('.', 6) + 'ww' + Rp('.', 2) + 'T',
    'T' + '.' + Rp('r', 8) + 'ppp' + Rp('.', 10) + 'T',
    'T' + '.' + 'BWWDWWWB' + 'ppp' + Rp('.', 10) + 'T',
    'T' + Rp('.', 4) + 'p' + Rp('.', 4) + 'ppp' + Rp('.', 10) + 'T',
    'T' + Rp('.', 9) + 'ppp' + Rp('.', 10) + 'T',
    'T' + Rp('.', 9) + 'ppp' + '.' + Rp('r', 6) + Rp('.', 3) + 'T',
    'T' + Rp('.', 9) + 'ppp' + '.' + Rp('r', 6) + Rp('.', 3) + 'T',
    'T' + Rp('.', 9) + 'ppp' + '.' + 'BWDWWB' + Rp('.', 3) + 'T',
    'T' + Rp('.', 9) + 'ppp' + Rp('.', 3) + 'p' + Rp('.', 6) + 'T',
    'T' + Rp('.', 9) + 'ppp' + '.' + Rp('r', 6) + Rp('.', 3) + 'T',
    'T' + Rp('.', 9) + 'ppp' + '.' + Rp('r', 6) + Rp('.', 3) + 'T',
    'T' + Rp('.', 9) + 'ppp' + '.' + 'BWDWWB' + Rp('.', 3) + 'T',
    'T' + Rp('.', 9) + 'ppp' + Rp('.', 3) + 'p' + Rp('.', 6) + 'T',
    'T' + Rp('.', 2) + 'S' + Rp('.', 6) + 'ppp' + Rp('.', 10) + 'T',
    'T' + 'www' + Rp('.', 6) + 'ppp' + Rp('.', 5) + 'www' + Rp('.', 2) + 'T',
    'T' + 'www' + Rp('.', 6) + 'ppp' + Rp('.', 5) + 'www' + Rp('.', 2) + 'T',
    'T' + Rp('.', 9) + 'ppp' + Rp('.', 10) + 'T',
    'T' + Rp('.', 9) + 'ppp' + Rp('.', 10) + 'T',
    Rp('T', 10) + 'ppp' + Rp('T', 11),
  ],
  warps: [
    { x: 10, y: 0, to: 'route3', tx: 11, ty: 24, dir: 'up' },
    { x: 11, y: 0, to: 'route3', tx: 11, ty: 24, dir: 'up' },
    { x: 12, y: 0, to: 'route3', tx: 11, ty: 24, dir: 'up' },
    { x: 10, y: 21, to: 'bosco', tx: 11, ty: 1, dir: 'down' },
    { x: 11, y: 21, to: 'bosco', tx: 11, ty: 1, dir: 'down' },
    { x: 12, y: 21, to: 'bosco', tx: 11, ty: 1, dir: 'down' },
    { x: 5, y: 5, to: 'arena2', tx: 6, ty: 10, dir: 'up' },
    { x: 16, y: 10, to: 'centro_oc', tx: 5, ty: 7, dir: 'up' },
    { x: 16, y: 14, to: 'emporio_oc', tx: 5, ty: 7, dir: 'up' },
  ],
  signs: { '3,16': 'ONDACHIARA\n"Dove il fiume incontra il cielo."' },
  npcs: [
    { x: 11, y: 1, preset: 'oldman', dir: 'down', cond: sv => !sv.badges[1],
      say: ['Il ponte sul Sentiero 3 è sorvegliato: troppe sparizioni ultimamente!', 'Con il SIGILLO DELL\'ONDA di Marina ti lasceranno passare.'] },
    { x: 4, y: 19, preset: 'oldman', dir: 'up', say: ['I Pinnetta abboccano solo all\'alba.', 'Una volta ne pescai uno GROSSO COSÌ! Poi mi svegliai.'] },
    { x: 15, y: 16, preset: 'girl', dir: 'down', move: 'wander', say: ['Marina nuota più veloce dei suoi Velmon!', 'La Banda Grifagna è stata avvistata verso la Grotta Cristallo...'] },
  ],
  objects: [],
  triggers: [],
};

/* ============================================================
   SENTIERO 3 + GROTTA CRISTALLO
   ============================================================ */
MAPS.route3 = {
  name: 'Sentiero 3', music: 'route', outdoor: true,
  tiles: [
    Rp('M', 24),
    'T' + Rp('M', 9) + 'M' + 'E' + 'M' + Rp('M', 10) + 'T',
    'T' + Rp('.', 9) + 'ppp' + Rp('.', 10) + 'T',
    'T' + Rp('.', 2) + 'tttt' + Rp('.', 3) + 'ppp' + Rp('.', 3) + 'tttt' + Rp('.', 3) + 'T',
    'T' + Rp('.', 2) + 'tttt' + Rp('.', 3) + 'ppp' + Rp('.', 3) + 'tttt' + Rp('.', 3) + 'T',
    'T' + Rp('.', 9) + 'ppp' + Rp('.', 10) + 'T',
    'T' + Rp('.', 3) + 'S' + Rp('.', 5) + 'ppp' + Rp('.', 10) + 'T',
    'T' + Rp('.', 2) + 'ttttt' + Rp('.', 2) + 'ppp' + Rp('.', 2) + 'ttttt' + Rp('.', 3) + 'T',
    'T' + Rp('.', 2) + 'ttttt' + Rp('.', 2) + 'ppp' + Rp('.', 2) + 'ttttt' + Rp('.', 3) + 'T',
    'T' + Rp('.', 9) + 'ppp' + Rp('.', 10) + 'T',
    'T' + Rp('L', 9) + 'ppp' + Rp('L', 10) + 'T',
    'T' + Rp('.', 9) + 'ppp' + Rp('.', 10) + 'T',
    'T' + Rp('.', 2) + 'tttt' + Rp('.', 3) + 'ppp' + Rp('.', 3) + 'tttt' + Rp('.', 3) + 'T',
    'T' + Rp('.', 2) + 'tttt' + Rp('.', 3) + 'ppp' + Rp('.', 3) + 'tttt' + Rp('.', 3) + 'T',
    'T' + Rp('.', 2) + 'tttt' + Rp('.', 3) + 'ppp' + Rp('.', 3) + 'tttt' + Rp('.', 3) + 'T',
    'T' + Rp('.', 9) + 'ppp' + Rp('.', 10) + 'T',
    'T' + Rp('.', 4) + 'ff' + Rp('.', 3) + 'ppp' + Rp('.', 4) + 'ff' + Rp('.', 4) + 'T',
    'T' + Rp('.', 9) + 'ppp' + Rp('.', 10) + 'T',
    'T' + Rp('.', 2) + 'tttt' + Rp('.', 3) + 'ppp' + Rp('.', 3) + 'tttt' + Rp('.', 3) + 'T',
    'T' + Rp('.', 2) + 'tttt' + Rp('.', 3) + 'ppp' + Rp('.', 3) + 'tttt' + Rp('.', 3) + 'T',
    'T' + Rp('.', 9) + 'ppp' + Rp('.', 10) + 'T',
    'T' + Rp('.', 9) + 'ppp' + Rp('.', 10) + 'T',
    'T' + Rp('.', 2) + 'ttt' + Rp('.', 4) + 'ppp' + Rp('.', 4) + 'ttt' + Rp('.', 3) + 'T',
    'T' + Rp('.', 2) + 'ttt' + Rp('.', 4) + 'ppp' + Rp('.', 4) + 'ttt' + Rp('.', 3) + 'T',
    'T' + Rp('.', 9) + 'ppp' + Rp('.', 10) + 'T',
    Rp('T', 10) + 'ppp' + Rp('T', 11),
  ],
  warps: [
    { x: 11, y: 1, to: 'grotta', tx: 11, ty: 19, dir: 'up' },
    { x: 10, y: 25, to: 'ondachiara', tx: 11, ty: 1, dir: 'down' },
    { x: 11, y: 25, to: 'ondachiara', tx: 11, ty: 1, dir: 'down' },
    { x: 12, y: 25, to: 'ondachiara', tx: 11, ty: 1, dir: 'down' },
  ],
  signs: { '4,6': 'SENTIERO 3\nGrotta Cristallo ↑' },
  npcs: [
    { x: 6, y: 9, preset: 'hiker', dir: 'right', trainer: { name: 'Montanaro UGO', flag: 'tr_r3_a', los: 4, money: 540,
      team: [['sassolo', 17], ['sassolo', 18]],
      before: ['Queste montagne le conosco sasso per sasso!'],
      win: ['Mi hai spianato!'],
      after: ['Nella Grotta si aggirano tipi loschi col mantello scuro...'] } },
    { x: 15, y: 13, preset: 'boy', dir: 'left', trainer: { name: 'Elettricista NINO', flag: 'tr_r3_b', los: 3, money: 570,
      team: [['folgorino', 18], ['pinnetta', 18]],
      before: ['Scossa in arrivo! ZZZAP!'],
      win: ['Sono rimasto a corto di corrente...'],
      after: ['I Folgorino si caricano durante i temporali.'] } },
    { x: 14, y: 20, preset: 'girl', dir: 'left', trainer: { name: 'Scout RITA', flag: 'tr_r3_c', los: 2, money: 570,
      team: [['cucciorso', 19], ['funghetto', 18]],
      before: ['Sempre pronta! Questo è il motto degli scout!'],
      win: ['Non ero pronta a QUESTO!'],
      after: ['Distintivo di sopravvivenza: non guadagnato.'] } },
  ],
  objects: [{ x: 2, y: 16, kind: 'item', item: 'superpozione' }],
  triggers: [],
  enc: { rate: 0.13, list: [['folgorino', 16, 19, 25], ['pinnetta', 16, 19, 25], ['cucciorso', 16, 19, 20], ['sorcione', 18, 20, 10], ['falchetto', 18, 20, 10]] },
};

MAPS.grotta = {
  name: 'Grotta Cristallo', music: 'cave', cave: true,
  tiles: [
    Rp('C', 24),
    Rp('C', 10) + 'ccc' + Rp('C', 11),
    'CC' + Rp('c', 8) + 'ccc' + Rp('c', 9) + 'CC',
    'CC' + Rp('c', 20) + 'CC',
    'CC' + 'yy' + Rp('c', 16) + 'yy' + 'CC',
    'CC' + Rp('c', 20) + 'CC',
    'CC' + Rp('c', 4) + 'CCCC' + Rp('c', 8) + 'y' + Rp('c', 3) + 'CC',
    'CC' + Rp('c', 4) + 'CCCC' + Rp('c', 12) + 'CC',
    'CC' + Rp('c', 20) + 'CC',
    'CC' + 'y' + Rp('c', 12) + 'CCC' + Rp('c', 4) + 'CC',
    'CC' + Rp('c', 13) + 'CCC' + Rp('c', 4) + 'CC',
    'CC' + Rp('c', 20) + 'CC',
    'CC' + Rp('c', 6) + 'yy' + Rp('c', 12) + 'CC',
    'CC' + Rp('c', 20) + 'CC',
    'CC' + 'CCCC' + Rp('c', 12) + 'CCCC' + 'CC',
    'CC' + 'CCCC' + Rp('c', 5) + 'y' + Rp('c', 6) + 'CCCC' + 'CC',
    'CC' + Rp('c', 20) + 'CC',
    'CC' + Rp('c', 8) + 'y' + Rp('c', 11) + 'CC',
    'CC' + Rp('c', 20) + 'CC',
    'CC' + Rp('c', 20) + 'CC',
    Rp('C', 10) + 'ccc' + Rp('C', 11),
    Rp('C', 24),
  ],
  warps: [
    { x: 10, y: 1, to: 'collefolgore', tx: 11, ty: 20, dir: 'up' },
    { x: 11, y: 1, to: 'collefolgore', tx: 11, ty: 20, dir: 'up' },
    { x: 12, y: 1, to: 'collefolgore', tx: 11, ty: 20, dir: 'up' },
    { x: 10, y: 20, to: 'route3', tx: 11, ty: 2, dir: 'down' },
    { x: 11, y: 20, to: 'route3', tx: 11, ty: 2, dir: 'down' },
    { x: 12, y: 20, to: 'route3', tx: 11, ty: 2, dir: 'down' },
  ],
  signs: {},
  npcs: [
    { x: 3, y: 17, preset: 'clerk', dir: 'right', say: sv => sv.flags.grifagna
      ? ['RICERCATORE: Li hai cacciati! I Cristalli Cantanti sono salvi!', 'Ascolta... senti anche tu? La grotta canta di nuovo.']
      : ['RICERCATORE: La Banda Grifagna sta strappando via i Cristalli Cantanti!', 'Il loro capo blocca il passaggio a nord. Qualcuno deve fermarlo!'] },
    { x: 4, y: 5, preset: 'grunt', dir: 'right', trainer: { name: 'Recluta Grifagna', flag: 'tr_gr_a', los: 5, money: 600,
      team: [['alacieca', 18], ['ombrolo', 19]],
      before: ['Fermo lì! Questi cristalli sono proprietà della Banda Grifagna!'],
      win: ['Il capo non sarà contento...'],
      after: ['Falco ci paga bene, ma comincio ad avere dei dubbi...'] } },
    { x: 16, y: 12, preset: 'grunt', dir: 'left', trainer: { name: 'Recluta Grifagna', flag: 'tr_gr_b', los: 4, money: 620,
      team: [['sassolo', 19], ['lavetta', 20]],
      before: ['Un moccioso? Qui? Sparisci o ti faccio sparire io!'],
      win: ['Maledizione! Era solo un moccioso!'],
      after: ['Ho firmato per i soldi, non per le botte.'] } },
    { x: 11, y: 2, preset: 'falco', dir: 'down', cond: sv => !sv.flags.grifagna,
      trainer: { name: 'Capo FALCO', flag: 'grifagna', los: 3, money: 2500, boss: true,
        team: [['alacieca', 22], ['ombrolo', 23], ['notturnix', 25]],
        before: ['Io sono FALCO, l\'artiglio della Banda Grifagna!', 'Con questi cristalli controlleremo tutti i Velmon di Valmora!', 'Sparisci, o ti strappo via le ali!'],
        win: ['Cosa?! Spennato da un ragazzino?!', 'La Banda Grifagna si ritira... ma ricorda questo nome!'],
        after: [''] } },
  ],
  objects: [
    { x: 3, y: 3, kind: 'item', item: 'granvortex' },
    { x: 20, y: 17, kind: 'item', item: 'caramella' },
  ],
  triggers: [],
  enc: { rate: 0.1, all: true, list: [['alacieca', 14, 18, 35], ['sassolo', 14, 18, 30], ['ombrolo', 15, 18, 20], ['lavetta', 16, 19, 15]] },
};

/* ============================================================
   COLLEFOLGORE (Arena 3 — Elettro)
   ============================================================ */
MAPS.collefolgore = {
  name: 'Collefolgore', music: 'town', outdoor: true, theme: '#d8b830',
  tiles: [
    Rp('T', 10) + 'ppp' + Rp('T', 11),
    'T' + Rp('.', 9) + 'ppp' + Rp('.', 10) + 'T',
    'T' + Rp('.', 9) + 'ppp' + Rp('.', 10) + 'T',
    'T' + '.' + Rp('r', 8) + 'ppp' + Rp('.', 10) + 'T',
    'T' + '.' + Rp('r', 8) + 'ppp' + Rp('.', 10) + 'T',
    'T' + '.' + 'BWWDWWWB' + 'ppp' + Rp('.', 10) + 'T',
    'T' + Rp('.', 4) + 'p' + Rp('.', 4) + 'ppp' + Rp('.', 10) + 'T',
    'T' + Rp('.', 9) + 'ppp' + Rp('.', 10) + 'T',
    'T' + Rp('.', 9) + 'ppp' + '.' + Rp('r', 6) + Rp('.', 3) + 'T',
    'T' + Rp('.', 9) + 'ppp' + '.' + Rp('r', 6) + Rp('.', 3) + 'T',
    'T' + Rp('.', 9) + 'ppp' + '.' + 'BWDWWB' + Rp('.', 3) + 'T',
    'T' + Rp('.', 9) + 'ppp' + Rp('.', 3) + 'p' + Rp('.', 6) + 'T',
    'T' + Rp('.', 9) + 'ppp' + '.' + Rp('r', 6) + Rp('.', 3) + 'T',
    'T' + Rp('.', 9) + 'ppp' + '.' + Rp('r', 6) + Rp('.', 3) + 'T',
    'T' + Rp('.', 9) + 'ppp' + '.' + 'BWDWWB' + Rp('.', 3) + 'T',
    'T' + Rp('.', 9) + 'ppp' + Rp('.', 3) + 'p' + Rp('.', 6) + 'T',
    'T' + Rp('.', 2) + 'S' + Rp('.', 6) + 'ppp' + Rp('.', 10) + 'T',
    'T' + Rp('.', 2) + 'ff' + Rp('.', 5) + 'ppp' + Rp('.', 5) + 'ff' + Rp('.', 3) + 'T',
    'T' + Rp('.', 9) + 'ppp' + Rp('.', 10) + 'T',
    'T' + Rp('.', 9) + 'ppp' + Rp('.', 10) + 'T',
    'T' + Rp('.', 9) + 'ppp' + Rp('.', 10) + 'T',
    Rp('T', 10) + 'ppp' + Rp('T', 11),
  ],
  warps: [
    { x: 10, y: 0, to: 'route4', tx: 11, ty: 24, dir: 'up' },
    { x: 11, y: 0, to: 'route4', tx: 11, ty: 24, dir: 'up' },
    { x: 12, y: 0, to: 'route4', tx: 11, ty: 24, dir: 'up' },
    { x: 10, y: 21, to: 'grotta', tx: 11, ty: 2, dir: 'down' },
    { x: 11, y: 21, to: 'grotta', tx: 11, ty: 2, dir: 'down' },
    { x: 12, y: 21, to: 'grotta', tx: 11, ty: 2, dir: 'down' },
    { x: 5, y: 5, to: 'arena3', tx: 6, ty: 10, dir: 'up' },
    { x: 16, y: 10, to: 'centro_cf', tx: 5, ty: 7, dir: 'up' },
    { x: 16, y: 14, to: 'emporio_cf', tx: 5, ty: 7, dir: 'up' },
  ],
  signs: { '3,16': 'COLLEFOLGORE\n"La città che non dorme: troppa corrente!"' },
  npcs: [
    { x: 11, y: 1, preset: 'oldman', dir: 'down', cond: sv => !sv.badges[2],
      say: ['Il Sentiero Ardente scotta sotto le scarpe!', 'Senza il SIGILLO DEL FULMINE non posso lasciarti passare.'] },
    { x: 15, y: 18, preset: 'boy', dir: 'down', move: 'wander', say: ['Elettra è velocissima! Dicono che i suoi Velmon paralizzino chiunque.', 'Hai fermato tu quelli della Banda Grifagna? Sei un mito!'] },
  ],
  objects: [],
  triggers: [
    { x: 5, y: 6, cond: sv => !sv.flags.rival3, script: [
      { say: ['DARIO: Guarda guarda chi si vede!', 'Ho già il Sigillo di Elettra. Tu invece sei ancora qui a gironzolare!', 'Ti faccio vedere io la differenza tra noi due!'] },
      { flag: 'rival3' },
      { battle: { trainerName: 'DARIO', preset: 'rival', money: 1700, rivalStage: 3,
        winText: ['DARIO: Ancora?! Ma come fai?!', '...Devo ripensare tutto. Ci vediamo alla Lega, se mai ci arrivi!'] } },
    ] },
  ],
};

/* ============================================================
   SENTIERO ARDENTE + RUBINIA (Arena 4 — Fuoco)
   ============================================================ */
MAPS.route4 = {
  name: 'Sentiero Ardente', music: 'route', outdoor: true,
  tiles: [
    Rp('T', 10) + 'ppp' + Rp('T', 11),
    'T' + Rp('.', 9) + 'ppp' + Rp('.', 10) + 'T',
    'T' + 'MM' + Rp('.', 7) + 'ppp' + Rp('.', 8) + 'MM' + 'T',
    'T' + Rp('.', 2) + 'ttt' + Rp('.', 4) + 'ppp' + Rp('.', 4) + 'ttt' + Rp('.', 3) + 'T',
    'T' + Rp('.', 2) + 'ttt' + Rp('.', 4) + 'ppp' + Rp('.', 4) + 'ttt' + Rp('.', 3) + 'T',
    'T' + Rp('.', 9) + 'ppp' + Rp('.', 10) + 'T',
    'T' + 'MMM' + Rp('.', 6) + 'ppp' + Rp('.', 7) + 'MMM' + 'T',
    'T' + Rp('.', 3) + 'S' + Rp('.', 5) + 'ppp' + Rp('.', 10) + 'T',
    'T' + Rp('.', 2) + 'tttt' + Rp('.', 3) + 'ppp' + Rp('.', 3) + 'tttt' + Rp('.', 3) + 'T',
    'T' + Rp('.', 2) + 'tttt' + Rp('.', 3) + 'ppp' + Rp('.', 3) + 'tttt' + Rp('.', 3) + 'T',
    'T' + Rp('L', 9) + 'ppp' + Rp('L', 10) + 'T',
    'T' + Rp('.', 9) + 'ppp' + Rp('.', 10) + 'T',
    'T' + 'MM' + Rp('.', 2) + 'ttt' + Rp('.', 2) + 'ppp' + Rp('.', 3) + 'ttt' + Rp('.', 2) + 'MM' + 'T',
    'T' + 'MM' + Rp('.', 2) + 'ttt' + Rp('.', 2) + 'ppp' + Rp('.', 3) + 'ttt' + Rp('.', 2) + 'MM' + 'T',
    'T' + Rp('.', 9) + 'ppp' + Rp('.', 10) + 'T',
    'T' + Rp('.', 2) + 'tttt' + Rp('.', 3) + 'ppp' + Rp('.', 3) + 'tttt' + Rp('.', 3) + 'T',
    'T' + Rp('.', 2) + 'tttt' + Rp('.', 3) + 'ppp' + Rp('.', 3) + 'tttt' + Rp('.', 3) + 'T',
    'T' + Rp('.', 9) + 'ppp' + Rp('.', 10) + 'T',
    'T' + 'MMMM' + Rp('.', 5) + 'ppp' + Rp('.', 6) + 'MMMM' + 'T',
    'T' + Rp('.', 9) + 'ppp' + Rp('.', 10) + 'T',
    'T' + Rp('.', 2) + 'ttt' + Rp('.', 4) + 'ppp' + Rp('.', 4) + 'ttt' + Rp('.', 3) + 'T',
    'T' + Rp('.', 2) + 'ttt' + Rp('.', 4) + 'ppp' + Rp('.', 4) + 'ttt' + Rp('.', 3) + 'T',
    'T' + Rp('.', 9) + 'ppp' + Rp('.', 10) + 'T',
    'T' + Rp('.', 4) + 'ff' + Rp('.', 3) + 'ppp' + Rp('.', 4) + 'ff' + Rp('.', 4) + 'T',
    'T' + Rp('.', 9) + 'ppp' + Rp('.', 10) + 'T',
    Rp('T', 10) + 'ppp' + Rp('T', 11),
  ],
  warps: [
    { x: 10, y: 0, to: 'rubinia', tx: 11, ty: 18, dir: 'up' },
    { x: 11, y: 0, to: 'rubinia', tx: 11, ty: 18, dir: 'up' },
    { x: 12, y: 0, to: 'rubinia', tx: 11, ty: 18, dir: 'up' },
    { x: 10, y: 25, to: 'collefolgore', tx: 11, ty: 1, dir: 'down' },
    { x: 11, y: 25, to: 'collefolgore', tx: 11, ty: 1, dir: 'down' },
    { x: 12, y: 25, to: 'collefolgore', tx: 11, ty: 1, dir: 'down' },
  ],
  signs: { '4,7': 'SENTIERO ARDENTE\nIl terreno qui è caldo anche d\'inverno.' },
  npcs: [
    { x: 6, y: 8, preset: 'hiker', dir: 'right', trainer: { name: 'Vulcanologo ENZO', flag: 'tr_r4_a', los: 4, money: 810,
      team: [['macignor', 27], ['sassolo', 26]],
      before: ['Studio il magma da trent\'anni. E tu, cosa studi?'],
      win: ['Eruzione... fallita!'],
      after: ['Sotto questo sentiero scorre un fiume di lava, lo sapevi?'] } },
    { x: 15, y: 15, preset: 'girl', dir: 'left', trainer: { name: 'Ballerina FIAMMA', flag: 'tr_r4_b', los: 4, money: 840,
      team: [['tritonda', 28]],
      before: ['Danzo col fuoco! Ma in battaglia porto l\'acqua, sorpresa!'],
      win: ['Che scivolone!'],
      after: ['L\'acqua spegne il fuoco. Saggezza da ballerina.'] } },
    { x: 14, y: 21, preset: 'boy', dir: 'left', trainer: { name: 'Recluta SPENTA', flag: 'tr_r4_c', los: 2, money: 840,
      team: [['sorcione', 28], ['cucciorso', 27]],
      before: ['Ex Banda Grifagna! Ora mi alleno onestamente... più o meno!'],
      win: ['Nemmeno da onesto vinco mai!'],
      after: ['Falco è sparito dopo la Grotta. Meglio così.'] } },
  ],
  objects: [
    { x: 2, y: 17, kind: 'item', item: 'iperpozione' },
    { x: 21, y: 3, kind: 'item', item: 'caramella' },
  ],
  triggers: [],
  enc: { rate: 0.13, list: [['lavetta', 20, 24, 30], ['cucciorso', 20, 23, 20], ['folgorino', 20, 24, 20], ['sorcione', 21, 24, 15], ['falchetto', 21, 24, 15]] },
};

MAPS.rubinia = {
  name: 'Rubinia', music: 'town', outdoor: true, theme: '#c83030',
  tiles: [
    Rp('T', 10) + 'ppp' + Rp('T', 11),
    'T' + Rp('.', 9) + 'ppp' + Rp('.', 10) + 'T',
    'T' + Rp('.', 9) + 'ppp' + Rp('.', 10) + 'T',
    'T' + '.' + Rp('r', 8) + 'ppp' + Rp('.', 10) + 'T',
    'T' + '.' + Rp('r', 8) + 'ppp' + Rp('.', 10) + 'T',
    'T' + '.' + 'BWWDWWWB' + 'ppp' + Rp('.', 10) + 'T',
    'T' + Rp('.', 4) + 'p' + Rp('.', 4) + 'ppp' + Rp('.', 10) + 'T',
    'T' + Rp('.', 9) + 'ppp' + Rp('.', 10) + 'T',
    'T' + Rp('.', 9) + 'ppp' + '.' + Rp('r', 6) + Rp('.', 3) + 'T',
    'T' + Rp('.', 9) + 'ppp' + '.' + Rp('r', 6) + Rp('.', 3) + 'T',
    'T' + Rp('.', 9) + 'ppp' + '.' + 'BWDWWB' + Rp('.', 3) + 'T',
    'T' + Rp('.', 9) + 'ppp' + Rp('.', 3) + 'p' + Rp('.', 6) + 'T',
    'T' + Rp('.', 9) + 'ppp' + '.' + Rp('r', 6) + Rp('.', 3) + 'T',
    'T' + Rp('.', 9) + 'ppp' + '.' + Rp('r', 6) + Rp('.', 3) + 'T',
    'T' + Rp('.', 9) + 'ppp' + '.' + 'BWDWWB' + Rp('.', 3) + 'T',
    'T' + Rp('.', 9) + 'ppp' + Rp('.', 3) + 'p' + Rp('.', 6) + 'T',
    'T' + Rp('.', 2) + 'S' + Rp('.', 6) + 'ppp' + Rp('.', 10) + 'T',
    'T' + Rp('.', 2) + 'ff' + Rp('.', 5) + 'ppp' + Rp('.', 5) + 'ff' + Rp('.', 3) + 'T',
    'T' + Rp('.', 9) + 'ppp' + Rp('.', 10) + 'T',
    Rp('T', 10) + 'ppp' + Rp('T', 11),
  ],
  warps: [
    { x: 10, y: 0, to: 'viavittoria', tx: 11, ty: 22, dir: 'up' },
    { x: 11, y: 0, to: 'viavittoria', tx: 11, ty: 22, dir: 'up' },
    { x: 12, y: 0, to: 'viavittoria', tx: 11, ty: 22, dir: 'up' },
    { x: 10, y: 19, to: 'route4', tx: 11, ty: 1, dir: 'down' },
    { x: 11, y: 19, to: 'route4', tx: 11, ty: 1, dir: 'down' },
    { x: 12, y: 19, to: 'route4', tx: 11, ty: 1, dir: 'down' },
    { x: 5, y: 5, to: 'arena4', tx: 6, ty: 10, dir: 'up' },
    { x: 16, y: 10, to: 'centro_rb', tx: 5, ty: 7, dir: 'up' },
    { x: 16, y: 14, to: 'emporio_rb', tx: 5, ty: 7, dir: 'up' },
  ],
  signs: { '3,16': 'RUBINIA\n"L\'ultima città prima della gloria."' },
  npcs: [
    { x: 11, y: 1, preset: 'oldman', dir: 'down', cond: sv => !sv.badges[3],
      say: ['Oltre c\'è la VIA DELLA VITTORIA, l\'anticamera della Lega di Valmora.', 'Solo chi ha tutti e QUATTRO i Sigilli può passare. Regola della Lega!'] },
    { x: 5, y: 18, preset: 'girl', dir: 'up', move: 'wander', say: ['Ignis forgia spade quando non lotta. Il suo Magmarok è l\'incudine!'] },
    { x: 15, y: 18, preset: 'oldman', dir: 'down', say: ['Quattro Maestri e poi il Campione: questo ti aspetta alla Lega.', 'Nessuno della tua età ce l\'ha mai fatta. Nessuno.'] },
  ],
  objects: [],
  triggers: [],
};

/* ============================================================
   VIA DELLA VITTORIA + CITTADELLA DELLA LEGA
   ============================================================ */
MAPS.viavittoria = {
  name: 'Via della Vittoria', music: 'cave', cave: true,
  tiles: [
    Rp('C', 10) + 'ccc' + Rp('C', 11),
    'CC' + Rp('c', 20) + 'CC',
    'CC' + Rp('c', 20) + 'CC',
    'CC' + 'yy' + Rp('c', 16) + 'yy' + 'CC',
    'CC' + Rp('c', 20) + 'CC',
    'CC' + Rp('c', 4) + 'CCCCC' + Rp('c', 7) + 'CCCC' + 'CC',
    'CC' + Rp('c', 4) + 'CCCCC' + Rp('c', 11) + 'CC',
    'CC' + Rp('c', 20) + 'CC',
    'CC' + Rp('c', 8) + 'y' + Rp('c', 11) + 'CC',
    'CC' + Rp('c', 20) + 'CC',
    'CC' + 'CCCC' + Rp('c', 16) + 'CC',
    'CC' + 'CCCC' + Rp('c', 5) + 'CCC' + Rp('c', 8) + 'CC',
    'CC' + Rp('c', 20) + 'CC',
    'CC' + Rp('c', 6) + 'yy' + Rp('c', 12) + 'CC',
    'CC' + Rp('c', 20) + 'CC',
    'CC' + Rp('c', 20) + 'CC',
    'CC' + 'yy' + Rp('c', 16) + 'yy' + 'CC',
    'CC' + Rp('c', 20) + 'CC',
    'CC' + Rp('c', 20) + 'CC',
    'CC' + 'y' + Rp('c', 18) + 'y' + 'CC',
    'CC' + Rp('c', 20) + 'CC',
    'CC' + Rp('c', 20) + 'CC',
    'CC' + Rp('c', 20) + 'CC',
    Rp('C', 10) + 'ccc' + Rp('C', 11),
  ],
  warps: [
    { x: 10, y: 0, to: 'cittadella', tx: 7, ty: 25, dir: 'up' },
    { x: 11, y: 0, to: 'cittadella', tx: 7, ty: 25, dir: 'up' },
    { x: 12, y: 0, to: 'cittadella', tx: 7, ty: 25, dir: 'up' },
    { x: 10, y: 23, to: 'rubinia', tx: 11, ty: 1, dir: 'down' },
    { x: 11, y: 23, to: 'rubinia', tx: 11, ty: 1, dir: 'down' },
    { x: 12, y: 23, to: 'rubinia', tx: 11, ty: 1, dir: 'down' },
  ],
  signs: {},
  npcs: [
    { x: 6, y: 7, preset: 'hiker', dir: 'right', trainer: { name: 'Veterano BRUTO', flag: 'tr_vv_a', los: 4, money: 1020,
      team: [['macignor', 33], ['magmarok', 34]],
      before: ['Ho visto cento sfidanti tornare indietro in lacrime!'],
      win: ['Centouno... il primo che passa.'],
      after: ['La Lega ti mangerà vivo, ragazzino. Ma in bocca al lupo.'] } },
    { x: 15, y: 12, preset: 'girl', dir: 'left', trainer: { name: 'Eletta VERA', flag: 'tr_vv_b', los: 4, money: 1050,
      team: [['tritonda', 34], ['fungone', 33]],
      before: ['Quasi battei i Maestri, l\'anno scorso. QUASI.'],
      win: ['Anche tu... più forte di me?!'],
      after: ['Occhio alla Maestra Morgana: i suoi spettri ipnotizzano.'] } },
  ],
  objects: [
    { x: 3, y: 4, kind: 'item', item: 'ultravortex' },
    { x: 19, y: 16, kind: 'item', item: 'revitalizzante' },
    { x: 12, y: 21, kind: 'item', item: 'caramella' },
    { x: 4, y: 17, kind: 'mon', species: 'folgodrago', lv: 50, flag: 'folgodrago',
      say: ['...GRAOOO!', 'Il leggendario FOLGODRAGO si è svegliato!'] },
  ],
  triggers: [],
  enc: { rate: 0.1, all: true, list: [['alacieca', 28, 31, 30], ['macignor', 29, 32, 25], ['lavetta', 29, 32, 20], ['spettrux', 30, 32, 15], ['magmarok', 31, 33, 10]] },
};

MAPS.cittadella = {
  name: 'Cittadella della Lega', music: 'league', interior: true,
  tiles: [
    Rp('_', 16),
    '_' + Rp('a', 14) + '_',
    '_' + Rp('a', 14) + '_',
    '_' + Rp('a', 14) + '_',
    '_' + Rp('a', 14) + '_',
    '_' + 'xxxxxx' + 'aa' + 'xxxxxx' + '_',
    '_' + Rp('a', 14) + '_',
    '_' + Rp('a', 14) + '_',
    '_' + 'xxxxxx' + 'aa' + 'xxxxxx' + '_',
    '_' + Rp('a', 14) + '_',
    '_' + 'aa' + 'x' + Rp('a', 8) + 'x' + 'aa' + '_',
    '_' + Rp('a', 14) + '_',
    '_' + Rp('a', 14) + '_',
    '_' + 'xxxxxx' + 'aa' + 'xxxxxx' + '_',
    '_' + Rp('a', 14) + '_',
    '_' + 'aa' + 'x' + Rp('a', 8) + 'x' + 'aa' + '_',
    '_' + Rp('a', 14) + '_',
    '_' + Rp('a', 14) + '_',
    '_' + 'xxxxxx' + 'aa' + 'xxxxxx' + '_',
    '_' + Rp('a', 14) + '_',
    '_' + 'aa' + 'x' + Rp('a', 8) + 'x' + 'aa' + '_',
    '_' + Rp('a', 14) + '_',
    '_' + Rp('a', 14) + '_',
    '_' + 'xxxxxx' + 'aa' + 'xxxxxx' + '_',
    '_' + Rp('a', 14) + '_',
    '_' + Rp('a', 14) + '_',
    '_' + Rp('a', 6) + 'mm' + Rp('a', 6) + '_',
    Rp('_', 16),
  ],
  warps: [
    { x: 7, y: 26, to: 'viavittoria', tx: 11, ty: 1, dir: 'down' },
    { x: 8, y: 26, to: 'viavittoria', tx: 11, ty: 1, dir: 'down' },
  ],
  signs: {},
  npcs: [
    { x: 3, y: 25, preset: 'nurse', dir: 'right', heal: true,
      say: ['Benvenuto alla Cittadella della Lega!'] },
    { x: 7, y: 22, preset: 'maestro', dir: 'down', name: 'ALISEO' },
    { x: 7, y: 17, preset: 'maestro', dir: 'down', name: 'SILVANO' },
    { x: 7, y: 12, preset: 'maestro', dir: 'down', name: 'MORGANA' },
    { x: 7, y: 7, preset: 'maestro', dir: 'down', name: 'TIBERIO' },
    { x: 7, y: 2, preset: 'rival', dir: 'down', name: 'DARIO' },
  ],
  objects: [],
  triggers: [
    { x: 7, y: 23, w: 2, cond: sv => !sv.flags.lega1, script: [
      { say: ['ALISEO, Maestro del Cielo: Benvenuto, sfidante.', 'I miei Velmon cavalcano i venti. Vediamo se sai volare anche tu!'] },
      { flag: 'lega1' },
      { battle: { trainerName: 'Maestro ALISEO', preset: 'maestro', money: 4100, boss: true,
        team: [['falchetto', 38], ['farfaluce', 39], ['aquilord', 41]],
        winText: ['ALISEO: Voli più alto dei miei uccelli. Procedi, sfidante.'] } },
    ] },
    { x: 7, y: 18, w: 2, cond: sv => !sv.flags.lega2, script: [
      { say: ['SILVANO, Maestro della Foresta: La natura non perdona gli arroganti.', 'Le mie radici sono profonde. Provaci pure!'] },
      { flag: 'lega2' },
      { battle: { trainerName: 'Maestro SILVANO', preset: 'maestro', money: 4200, boss: true,
        team: [['fungone', 40], ['farfaluce', 40], ['silvankor', 42]],
        winText: ['SILVANO: Anche la quercia più antica si inchina al vento nuovo. Vai.'] } },
    ] },
    { x: 7, y: 13, w: 2, cond: sv => !sv.flags.lega3, script: [
      { say: ['MORGANA, Maestra delle Ombre: Che spavento... per te.', 'I miei spettri ti aspettano nei tuoi sogni!'] },
      { flag: 'lega3' },
      { battle: { trainerName: 'Maestra MORGANA', preset: 'maestro', money: 4300, boss: true,
        team: [['spettrux', 41], ['gufospettro', 42], ['spettrux', 43]],
        winText: ['MORGANA: La tua luce acceca le mie ombre... Avanza, piccola stella.'] } },
    ] },
    { x: 7, y: 8, w: 2, cond: sv => !sv.flags.lega4, script: [
      { say: ['TIBERIO, Maestro della Forza: Niente trucchi, niente magie.', 'Solo muscoli, sudore e cuore. IL MIO È PIÙ GRANDE!'] },
      { flag: 'lega4' },
      { battle: { trainerName: 'Maestro TIBERIO', preset: 'maestro', money: 4400, boss: true,
        team: [['sorcione', 42], ['macignor', 43], ['grandorso', 44]],
        winText: ['TIBERIO: CHE CUORE! Vai, il Campione ti aspetta.'] } },
    ] },
    { x: 6, y: 4, w: 4, cond: sv => !sv.flags.champion, script: [
      { say: ['DARIO: ...Lo sapevo che saresti arrivato fin qui.', 'Ho battuto i quattro Maestri prima di te. Sono io il Campione di Valmora!', 'Tutto è iniziato in quel laboratorio... e finisce qui. DAI IL MASSIMO!'] },
      { battle: { trainerName: 'Campione DARIO', preset: 'rival', money: 10000, boss: true, champion: true, rivalStage: 4,
        winText: ['DARIO: ...Ho perso? HO PERSO!', 'No, è giusto così. Sei sempre stato un passo avanti.', 'Congratulazioni... Campione di Valmora.'] } },
    ] },
  ],
};

/* ============================================================
   FABBRICHE DI INTERNI: Centri, Empori, Arene
   ============================================================ */
function mkCentro(id, town, tx, ty) {
  MAPS[id] = {
    name: 'Centro di Cura', music: 'town', interior: true, isCentro: true,
    tiles: [
      '____________',
      '____________',
      '_=h======PP_',
      '_=kkkk=====_',
      '_==========_',
      '_==========_',
      '_==========_',
      '_==========_',
      '_____mm_____',
    ],
    warps: [
      { x: 5, y: 8, to: town, tx, ty, dir: 'down' },
      { x: 6, y: 8, to: town, tx, ty, dir: 'down' },
    ],
    signs: {},
    npcs: [
      { x: 3, y: 2, preset: 'nurse', dir: 'down', heal: true, say: ['Benvenuto al Centro di Cura!'] },
      { x: 8, y: 6, preset: 'boy', dir: 'left', move: 'wander', say: ['Il PC custodisce i Velmon che non porti con te.', 'Comodo, no?'] },
    ],
    objects: [], triggers: [],
  };
}
function mkEmporio(id, town, tx, ty, stock) {
  MAPS[id] = {
    name: 'Emporio', music: 'town', interior: true,
    tiles: [
      '____________',
      '____________',
      '_bb======bb_',
      '_==========_',
      '_kkk=======_',
      '_==========_',
      '_==========_',
      '_==========_',
      '_____mm_____',
    ],
    warps: [
      { x: 5, y: 8, to: town, tx, ty, dir: 'down' },
      { x: 6, y: 8, to: town, tx, ty, dir: 'down' },
    ],
    signs: {},
    npcs: [
      { x: 2, y: 3, preset: 'clerk', dir: 'down', shop: stock },
      { x: 8, y: 5, preset: 'girl', dir: 'down', move: 'wander', say: ['I Granvortex catturano molto meglio dei Vortex normali!'] },
    ],
    objects: [], triggers: [],
  };
}
function mkArena(id, town, tx, ty, leader) {
  MAPS[id] = {
    name: 'Arena', music: 'league', interior: true,
    tiles: [
      '_____________',
      '_____________',
      '_aaaaaaaaaaa_',
      '_aaaaaaaaaaa_',
      '_aaxaaaaaxaa_',
      '_aaaaaaaaaaa_',
      '_aaaaaaaaaaa_',
      '_aaxaaaaaxaa_',
      '_aaaaaaaaaaa_',
      '_aaaaaaaaaaa_',
      '_aaaaaaaaaaa_',
      '_____mm______',
    ],
    warps: [
      { x: 5, y: 11, to: town, tx, ty, dir: 'down' },
      { x: 6, y: 11, to: town, tx, ty, dir: 'down' },
    ],
    signs: {},
    npcs: leader,
    objects: [], triggers: [],
  };
}

mkCentro('centro_pv', 'pietraviva', 16, 11);
mkCentro('centro_oc', 'ondachiara', 16, 11);
mkCentro('centro_cf', 'collefolgore', 16, 11);
mkCentro('centro_rb', 'rubinia', 16, 11);

mkEmporio('emporio_pv', 'pietraviva', 16, 15, ['pozione', 'antidoto', 'paracura', 'vortex']);
mkEmporio('emporio_oc', 'ondachiara', 16, 15, ['pozione', 'superpozione', 'antidoto', 'paracura', 'sveglia', 'vortex', 'granvortex']);
mkEmporio('emporio_cf', 'collefolgore', 16, 15, ['superpozione', 'iperpozione', 'curatutto', 'vortex', 'granvortex', 'ultravortex', 'revitalizzante']);
mkEmporio('emporio_rb', 'rubinia', 16, 15, ['superpozione', 'iperpozione', 'curatutto', 'granvortex', 'ultravortex', 'revitalizzante']);

mkArena('arena1', 'pietraviva', 5, 6, [
  { x: 6, y: 2, preset: 'rocco', dir: 'down', trainer: { name: 'Custode ROCCO', flag: 'arena1', los: 3, money: 1500, boss: true, badge: 0,
    team: [['sassolo', 12], ['macignor', 14]],
    before: ['Io sono ROCCO, Custode di Pietraviva!', 'La mia difesa è dura come il granito. Spaccala, se ci riesci!'],
    win: ['Mi hai... sgretolato!', 'Prendi il SIGILLO DI PIETRA. Te lo sei meritato.'],
    after: ['Con quel Sigillo, il vecchio sul sentiero a nord ti lascerà passare.'] } },
  { x: 4, y: 7, preset: 'hiker', dir: 'right', trainer: { name: 'Allievo TERRY', flag: 'tr_a1', los: 3, money: 330,
    team: [['sassolo', 11]],
    before: ['Prima di Rocco... devi superare ME!'],
    win: ['Rocco, perdonami!'],
    after: ['Rocco usa Fortifica: colpiscilo con mosse speciali!'] } },
]);
mkArena('arena2', 'ondachiara', 5, 6, [
  { x: 6, y: 2, preset: 'marina', dir: 'down', trainer: { name: 'Custode MARINA', flag: 'arena2', los: 3, money: 2100, boss: true, badge: 1,
    team: [['pinnetta', 18], ['tritonda', 21]],
    before: ['Sono MARINA, e questa è la mia marea!', 'Spero tu sappia nuotare!'],
    win: ['Glub... sono rimasta a galla per un soffio... anzi no!', 'Il SIGILLO DELL\'ONDA è tuo!'],
    after: ['Il fiume a nord è di nuovo sicuro, grazie a te.'] } },
  { x: 8, y: 7, preset: 'girl', dir: 'left', trainer: { name: 'Nuotatrice ONDINA', flag: 'tr_a2', los: 3, money: 510,
    team: [['pinnetta', 17]],
    before: ['L\'acqua è fredda... per chi perde!'],
    win: ['Brrr! Congelata!'],
    after: ['Marina colpisce per prima: paralizzala se puoi!'] } },
]);
mkArena('arena3', 'collefolgore', 5, 6, [
  { x: 6, y: 2, preset: 'elettra', dir: 'down', trainer: { name: 'Custode ELETTRA', flag: 'arena3', los: 3, money: 2900, boss: true, badge: 2,
    team: [['folgorino', 25], ['tempestor', 28]],
    before: ['ELETTRA! Più veloce del lampo, più forte del tuono!', 'Cerca di starmi dietro!'],
    win: ['Corto... circuito...!', 'Il SIGILLO DEL FULMINE è tuo, fulmine di guerra!'],
    after: ['Il Sentiero Ardente è duro: porta tante Pozioni!'] } },
  { x: 4, y: 7, preset: 'boy', dir: 'right', trainer: { name: 'Allievo VOLT', flag: 'tr_a3', los: 3, money: 720,
    team: [['folgorino', 24]],
    before: ['ZZZT! Scarica di benvenuto!'],
    win: ['Batterie esaurite!'],
    after: ['I Velmon di Roccia non temono i fulmini di Elettra.'] } },
]);
mkArena('arena4', 'rubinia', 5, 6, [
  { x: 6, y: 2, preset: 'ignis', dir: 'down', trainer: { name: 'Custode IGNIS', flag: 'arena4', los: 3, money: 3700, boss: true, badge: 3,
    team: [['lavetta', 31], ['ardelupo', 32], ['magmarok', 34]],
    before: ['Io sono IGNIS. La mia fucina non si spegne MAI!', 'Mostrami un metallo che non si piega!'],
    win: ['Temprato... alla perfezione!', 'Il SIGILLO DELLA BRACE è tuo. La Lega ti aspetta!'],
    after: ['Quattro Sigilli! Ora la Via della Vittoria è aperta per te.'] } },
  { x: 8, y: 7, preset: 'hiker', dir: 'left', trainer: { name: 'Fabbro VULCANO', flag: 'tr_a4', los: 3, money: 930,
    team: [['lavetta', 30], ['magmarok', 31]],
    before: ['Il ferro si batte finché è caldo. E IO SONO CALDISSIMO!'],
    win: ['Mi sono... raffreddato.'],
    after: ['Ignis tiene il pezzo forte per ultimo. Risparmia energie!'] } },
]);

/* ---------- squadre del rivale (dipendono dallo starter) ---------- */
function rivalTeam(stage, sv) {
  const mine = sv.starterChoice || 'braciotto';
  const his = DATA.RIVAL_STARTER[mine];
  if (stage === 1) return [[his, 5]];
  if (stage === 2) return [['passerotto', 14], [his, 16]];
  if (stage === 3) return [['falchetto', 27], ['cucciorso', 26], [his, 29]];
  // campione
  return [['aquilord', 44], ['tempestor', 44], ['magmarok', 45], ['grandorso', 45], [DATA.RIVAL_FINAL[his], 47]];
}

/* ---------- validazione mappe (log in console) ---------- */
(function validateMaps() {
  for (const id in MAPS) {
    const m = MAPS[id];
    const w = m.tiles[0].length;
    m.w = w; m.h = m.tiles.length;
    m.tiles.forEach((row, i) => {
      if (row.length !== w) console.error(`MAPPA ${id} riga ${i}: larghezza ${row.length} != ${w}`);
      for (const ch of row) if (!TD[ch]) console.error(`MAPPA ${id} riga ${i}: tile sconosciuto "${ch}"`);
    });
    (m.warps || []).forEach(wp => {
      if (!MAPS[wp.to]) console.error(`MAPPA ${id}: warp verso mappa inesistente "${wp.to}"`);
    });
  }
})();
