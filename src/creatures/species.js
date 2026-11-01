// Types, moves and the Velmon species. All names and creatures are original.

export const TYPES = ['Normale', 'Fuoco', 'Acqua', 'Erba', 'Elettro', 'Ghiaccio', 'Roccia', 'Terra', 'Volante', 'Coleottero', 'Spettro'];

export const TYPE_COLORS = {
  Normale: '#a8a77a', Fuoco: '#ee8130', Acqua: '#6390f0', Erba: '#7ac74c', Elettro: '#f7d02c', Ghiaccio: '#96d9d6',
  Roccia: '#b6a136', Terra: '#e2bf65', Volante: '#a98ff3', Coleottero: '#a6b91a', Spettro: '#735797',
};

// attacker -> { defender: multiplier }
const CHART = {
  Normale: { Roccia: 0.5, Spettro: 0 },
  Fuoco: { Erba: 2, Ghiaccio: 2, Coleottero: 2, Acqua: 0.5, Roccia: 0.5, Fuoco: 0.5 },
  Acqua: { Fuoco: 2, Roccia: 2, Terra: 2, Erba: 0.5, Acqua: 0.5 },
  Erba: { Acqua: 2, Roccia: 2, Terra: 2, Fuoco: 0.5, Erba: 0.5, Volante: 0.5, Coleottero: 0.5 },
  Elettro: { Acqua: 2, Volante: 2, Erba: 0.5, Elettro: 0.5, Terra: 0 },
  Ghiaccio: { Erba: 2, Terra: 2, Volante: 2, Fuoco: 0.5, Acqua: 0.5, Ghiaccio: 0.5 },
  Roccia: { Fuoco: 2, Ghiaccio: 2, Volante: 2, Coleottero: 2, Terra: 0.5 },
  Terra: { Fuoco: 2, Elettro: 2, Roccia: 2, Erba: 0.5, Coleottero: 0.5, Volante: 0 },
  Volante: { Erba: 2, Coleottero: 2, Elettro: 0.5, Roccia: 0.5 },
  Coleottero: { Erba: 2, Fuoco: 0.5, Volante: 0.5, Spettro: 0.5 },
  Spettro: { Spettro: 2, Normale: 0 },
};

export function effectiveness(moveType, defTypes) {
  return defTypes.reduce((m, t) => m * (CHART[moveType]?.[t] ?? 1), 1);
}

export const MOVES = {
  azione: { name: 'Azione', type: 'Normale', power: 40, acc: 100 },
  graffio: { name: 'Graffio', type: 'Normale', power: 40, acc: 100 },
  carica: { name: 'Carica Furiosa', type: 'Normale', power: 70, acc: 90 },
  braciere: { name: 'Braciere', type: 'Fuoco', power: 40, acc: 100 },
  vampata: { name: 'Vampata', type: 'Fuoco', power: 75, acc: 90 },
  pistolacqua: { name: 'Pistolacqua', type: 'Acqua', power: 40, acc: 100 },
  ondata: { name: 'Ondata', type: 'Acqua', power: 75, acc: 90 },
  fogliame: { name: 'Fogliame', type: 'Erba', power: 40, acc: 100 },
  frustaliana: { name: 'Frustaliana', type: 'Erba', power: 70, acc: 95 },
  scintilla: { name: 'Scintilla', type: 'Elettro', power: 40, acc: 100 },
  saetta: { name: 'Saetta', type: 'Elettro', power: 80, acc: 85 },
  nevischio: { name: 'Nevischio', type: 'Ghiaccio', power: 40, acc: 100 },
  gelata: { name: 'Gelata', type: 'Ghiaccio', power: 75, acc: 90 },
  sassata: { name: 'Sassata', type: 'Roccia', power: 45, acc: 95 },
  frana: { name: 'Frana', type: 'Roccia', power: 75, acc: 90 },
  fango: { name: 'Colpo di Fango', type: 'Terra', power: 40, acc: 100 },
  sisma: { name: 'Sisma', type: 'Terra', power: 85, acc: 90 },
  beccata: { name: 'Beccata', type: 'Volante', power: 35, acc: 100 },
  raffica: { name: 'Raffica', type: 'Volante', power: 65, acc: 95 },
  puntura: { name: 'Puntura', type: 'Coleottero', power: 35, acc: 100 },
  ronzio: { name: 'Ronzio', type: 'Coleottero', power: 65, acc: 95 },
  leccata: { name: 'Leccata', type: 'Spettro', power: 30, acc: 100 },
  ombrartiglio: { name: 'Ombrartiglio', type: 'Spettro', power: 70, acc: 95 },
};

// model: parameters for the procedural 3D model (see model.js)
export const SPECIES = {
  germoglio: {
    name: 'Germoglio', types: ['Erba'], base: { hp: 45, atk: 49, def: 49, spd: 45 }, rate: 45, xp: 64,
    learn: [[1, 'azione'], [1, 'fogliame'], [9, 'graffio'], [16, 'frustaliana'], [24, 'carica']],
    model: { body: 0x7ccf7a, belly: 0xd8f5c4, shape: 'quad', size: 0.75, ears: 'leaf', tail: 'leaf', extra: 'sprout', eye: 0x1b3d1b },
    desc: 'Sulla schiena porta un germoglio che cresce con lui.',
  },
  tizzone: {
    name: 'Tizzone', types: ['Fuoco'], base: { hp: 39, atk: 52, def: 43, spd: 65 }, rate: 45, xp: 64,
    learn: [[1, 'graffio'], [1, 'braciere'], [9, 'azione'], [16, 'vampata'], [24, 'carica']],
    model: { body: 0xf08a3c, belly: 0xffe0a3, shape: 'biped', size: 0.75, ears: 'pointy', tail: 'flame', eye: 0x2b1406 },
    desc: 'La fiamma sulla coda dice come si sente.',
  },
  ondina: {
    name: 'Ondina', types: ['Acqua'], base: { hp: 44, atk: 48, def: 65, spd: 43 }, rate: 45, xp: 64,
    learn: [[1, 'azione'], [1, 'pistolacqua'], [9, 'graffio'], [16, 'ondata'], [24, 'carica']],
    model: { body: 0x5aa9e6, belly: 0xe5f4ff, shape: 'biped', size: 0.72, ears: 'fin', tail: 'fin', extra: 'shell', eye: 0x0d2235 },
    desc: 'Nuota più veloce di qualsiasi pesce della baia.',
  },
  pulcino: {
    name: 'Pulcino', types: ['Normale', 'Volante'], base: { hp: 40, atk: 45, def: 40, spd: 56 }, rate: 230, xp: 50,
    learn: [[1, 'azione'], [5, 'beccata'], [15, 'raffica'], [25, 'carica']],
    model: { body: 0xc89a5b, belly: 0xf3dfb8, shape: 'bird', size: 0.5, wings: true, tail: 'feather', beak: 0xf2b134, eye: 0x1d1d1d },
    desc: 'Si alza in volo al primo rumore.',
  },
  topolux: {
    name: 'Topolux', types: ['Normale'], base: { hp: 30, atk: 56, def: 35, spd: 72 }, rate: 255, xp: 51,
    learn: [[1, 'azione'], [4, 'graffio'], [14, 'carica']],
    model: { body: 0xa58bc2, belly: 0xefe6f7, shape: 'quad', size: 0.45, ears: 'round', tail: 'thin', eye: 0x1d1d1d },
    desc: 'Rosicchia qualunque cosa, anche le pietre.',
  },
  lanuvo: {
    name: 'Lanuvo', types: ['Normale'], base: { hp: 60, atk: 40, def: 55, spd: 35 }, rate: 200, xp: 60,
    learn: [[1, 'azione'], [10, 'carica']],
    model: { body: 0xf5f1e6, belly: 0xf5f1e6, shape: 'fluffy', size: 0.7, ears: 'round', horns: 0x8a6d4b, eye: 0x222222 },
    desc: 'Il suo vello è morbido come una nuvola.',
  },
  grillo: {
    name: 'Grillino', types: ['Coleottero'], base: { hp: 40, atk: 50, def: 45, spd: 60 }, rate: 255, xp: 52,
    learn: [[1, 'puntura'], [8, 'azione'], [16, 'ronzio']],
    model: { body: 0x8bbf3a, belly: 0xd9ec9c, shape: 'bug', size: 0.45, wings: true, antennae: true, eye: 0x111111 },
    desc: 'Canta tutta la notte nell\'erba alta.',
  },
  fogliolo: {
    name: 'Fogliolo', types: ['Erba'], base: { hp: 50, atk: 45, def: 55, spd: 40 }, rate: 190, xp: 60,
    learn: [[1, 'azione'], [6, 'fogliame'], [18, 'frustaliana']],
    model: { body: 0x4f9a46, belly: 0xb5e08a, shape: 'blob', size: 0.6, extra: 'leafhat', eye: 0x10240e },
    desc: 'Di giorno sembra un cespuglio qualunque.',
  },
  scoiattolo: {
    name: 'Scoiattolo', types: ['Normale'], base: { hp: 45, atk: 55, def: 40, spd: 75 }, rate: 190, xp: 58,
    learn: [[1, 'graffio'], [10, 'azione'], [20, 'carica']],
    model: { body: 0xb5652d, belly: 0xf1d3b0, shape: 'quad', size: 0.5, ears: 'pointy', tail: 'fluffy', eye: 0x1d1d1d },
    desc: 'Nasconde bacche in cento posti diversi.',
  },
  farfallina: {
    name: 'Farfallina', types: ['Coleottero', 'Volante'], base: { hp: 45, atk: 40, def: 45, spd: 70 }, rate: 190, xp: 60,
    learn: [[1, 'puntura'], [10, 'raffica'], [20, 'ronzio']],
    model: { body: 0x3b3b5c, belly: 0x3b3b5c, shape: 'butterfly', size: 0.55, wings: 0xff8fc8, antennae: true, eye: 0xffffff },
    desc: 'Le sue ali spargono una polvere luccicante.',
  },
  pipistro: {
    name: 'Pipistro', types: ['Spettro', 'Volante'], base: { hp: 45, atk: 55, def: 40, spd: 70 }, rate: 190, xp: 60,
    learn: [[1, 'leccata'], [8, 'beccata'], [18, 'ombrartiglio'], [26, 'raffica']],
    model: { body: 0x4b3a68, belly: 0x9c8cc0, shape: 'bat', size: 0.5, wings: 0x2e2442, ears: 'pointy', eye: 0xffd23f },
    desc: 'Esce solo quando cala il buio.',
  },
  ombrale: {
    name: 'Ombrale', types: ['Spettro'], base: { hp: 40, atk: 60, def: 45, spd: 65 }, rate: 120, xp: 70,
    learn: [[1, 'leccata'], [12, 'ombrartiglio'], [26, 'carica']],
    model: { body: 0x6c4fa0, belly: 0x9f86d1, shape: 'ghost', size: 0.7, eye: 0xfff176, glow: 0x7e57c2 },
    desc: 'Vaga tra le rovine avvolto nella nebbia.',
  },
  voltino: {
    name: 'Voltino', types: ['Elettro'], base: { hp: 40, atk: 55, def: 40, spd: 85 }, rate: 150, xp: 65,
    learn: [[1, 'scintilla'], [8, 'azione'], [18, 'saetta']],
    model: { body: 0xf7d02c, belly: 0xfff4b0, shape: 'quad', size: 0.5, ears: 'long', tail: 'bolt', eye: 0x2a2205, cheeks: 0xff5d5d },
    desc: 'Accumula elettricità nella coda a saetta.',
  },
  roccione: {
    name: 'Roccione', types: ['Roccia', 'Terra'], base: { hp: 55, atk: 70, def: 90, spd: 25 }, rate: 150, xp: 75,
    learn: [[1, 'azione'], [6, 'sassata'], [16, 'fango'], [26, 'frana'], [34, 'sisma']],
    model: { body: 0x8d8473, belly: 0xb8ae9b, shape: 'rock', size: 0.8, eye: 0x1d1d1d },
    desc: 'Dorme per mesi immobile sui pendii.',
  },
  sabbiolo: {
    name: 'Sabbiolo', types: ['Terra'], base: { hp: 50, atk: 70, def: 70, spd: 40 }, rate: 150, xp: 70,
    learn: [[1, 'graffio'], [8, 'fango'], [20, 'sassata'], [30, 'sisma']],
    model: { body: 0xd9a95b, belly: 0xf3dcab, shape: 'quad', size: 0.6, ears: 'long', tail: 'thin', extra: 'spikes', eye: 0x2a1a05 },
    desc: 'Scava tane profonde sotto le dune.',
  },
  fiammello: {
    name: 'Fiammello', types: ['Fuoco'], base: { hp: 50, atk: 75, def: 50, spd: 70 }, rate: 120, xp: 80,
    learn: [[1, 'braciere'], [12, 'graffio'], [24, 'vampata'], [34, 'carica']],
    model: { body: 0xd8432f, belly: 0xffc36b, shape: 'quad', size: 0.7, ears: 'pointy', tail: 'flame', extra: 'mane', eye: 0x1d1d1d },
    desc: 'Vive vicino ai crateri del vulcano.',
  },
  goccino: {
    name: 'Goccino', types: ['Acqua'], base: { hp: 50, atk: 45, def: 50, spd: 55 }, rate: 190, xp: 60,
    learn: [[1, 'pistolacqua'], [10, 'azione'], [22, 'ondata']],
    model: { body: 0x47b5e6, belly: 0xc9f0ff, shape: 'blob', size: 0.55, tail: 'fin', eye: 0x0b2333, glossy: true },
    desc: 'Sembra una goccia gigante che rimbalza.',
  },
  granchio: {
    name: 'Granchietto', types: ['Acqua', 'Roccia'], base: { hp: 45, atk: 75, def: 85, spd: 40 }, rate: 170, xp: 68,
    learn: [[1, 'pistolacqua'], [8, 'sassata'], [20, 'ondata'], [30, 'frana']],
    model: { body: 0xe25d4b, belly: 0xffc2a8, shape: 'crab', size: 0.55, eye: 0x111111 },
    desc: 'Le sue chele spezzano le conchiglie.',
  },
  nevino: {
    name: 'Nevino', types: ['Ghiaccio'], base: { hp: 55, atk: 55, def: 60, spd: 50 }, rate: 150, xp: 70,
    learn: [[1, 'nevischio'], [12, 'azione'], [24, 'gelata']],
    model: { body: 0xeaf6ff, belly: 0xffffff, shape: 'fluffy', size: 0.65, ears: 'round', extra: 'scarf', eye: 0x1d3557 },
    desc: 'Rotola giù dai pendii come una palla di neve.',
  },
  brinella: {
    name: 'Brinella', types: ['Ghiaccio', 'Volante'], base: { hp: 50, atk: 60, def: 50, spd: 80 }, rate: 120, xp: 78,
    learn: [[1, 'nevischio'], [10, 'beccata'], [22, 'gelata'], [32, 'raffica']],
    model: { body: 0x9fd8f0, belly: 0xffffff, shape: 'bird', size: 0.6, wings: true, tail: 'feather', beak: 0x5b7c99, eye: 0x0d2235, crest: 0xffffff },
    desc: 'Le sue piume brillano come cristalli.',
  },
};

export const STARTERS = ['germoglio', 'tizzone', 'ondina'];
