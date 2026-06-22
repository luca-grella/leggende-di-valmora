'use strict';
/* ============================================================
   data.js — tipi, mosse, specie, oggetti, formule
   ============================================================ */

const DATA = {};

/* ---------- tipi ---------- */
DATA.TYPES = ['Normale', 'Fuoco', 'Acqua', 'Erba', 'Elettro', 'Roccia', 'Volante', 'Spettro'];
DATA.TYPE_COLORS = {
  Normale: '#a8a878', Fuoco: '#f08030', Acqua: '#6890f0', Erba: '#78c850',
  Elettro: '#e8c020', Roccia: '#b8a038', Volante: '#a890f0', Spettro: '#705898',
};
// efficacia: attaccante → difensore (default 1)
DATA.EFF = {
  Fuoco:   { Erba: 2, Acqua: 0.5, Fuoco: 0.5, Roccia: 0.5 },
  Acqua:   { Fuoco: 2, Roccia: 2, Erba: 0.5, Acqua: 0.5 },
  Erba:    { Acqua: 2, Roccia: 2, Fuoco: 0.5, Erba: 0.5, Volante: 0.5 },
  Elettro: { Acqua: 2, Volante: 2, Erba: 0.5, Roccia: 0.5, Elettro: 0.5 },
  Roccia:  { Fuoco: 2, Volante: 2, Roccia: 0.5 },
  Volante: { Erba: 2, Elettro: 0.5, Roccia: 0.5 },
  Spettro: { Spettro: 2, Normale: 0 },
  Normale: { Roccia: 0.5, Spettro: 0 },
};
DATA.eff = (att, def) => (DATA.EFF[att] && DATA.EFF[att][def] !== undefined) ? DATA.EFF[att][def] : 1;
// categoria fisica/speciale per tipo (stile prima generazione)
DATA.PHYS = { Normale: 1, Roccia: 1, Volante: 1 };

/* ---------- mosse ---------- */
/* p=potenza a=precisione pp=PP
   fx: { st:'brn|psn|par|slp', ch:probabilità% }           → stato sul bersaglio
   sta: { stat:'atk|def|spd|spc', d:±n, tgt:'s'|'e' }      → modifica statistiche
   crit: critico facile — drain: assorbe 50% del danno     */
DATA.MOVES = {
  graffio:       { n: 'Graffio', t: 'Normale', p: 40, a: 100, pp: 35 },
  azzanno:       { n: 'Azzanno', t: 'Normale', p: 60, a: 100, pp: 25 },
  schianto:      { n: 'Schianto', t: 'Normale', p: 80, a: 100, pp: 15 },
  iperschianto:  { n: 'Iperschianto', t: 'Normale', p: 110, a: 85, pp: 5 },
  ruggito:       { n: 'Ruggito', t: 'Normale', p: 0, a: 100, pp: 30, sta: { stat: 'atk', d: -1, tgt: 'e' } },
  fortifica:     { n: 'Fortifica', t: 'Normale', p: 0, a: 0, pp: 20, sta: { stat: 'def', d: 1, tgt: 's' } },
  carica:        { n: 'Carica', t: 'Normale', p: 0, a: 0, pp: 20, sta: { stat: 'atk', d: 1, tgt: 's' } },
  agilita:       { n: 'Agilità', t: 'Normale', p: 0, a: 0, pp: 15, sta: { stat: 'spd', d: 2, tgt: 's' } },
  favilla:       { n: 'Favilla', t: 'Fuoco', p: 40, a: 100, pp: 25, fx: { st: 'brn', ch: 10 } },
  zannaardente:  { n: 'Zanna Ardente', t: 'Fuoco', p: 65, a: 95, pp: 20, fx: { st: 'brn', ch: 10 } },
  lanciafiamme:  { n: 'Lanciafiamme', t: 'Fuoco', p: 90, a: 100, pp: 15, fx: { st: 'brn', ch: 10 } },
  fuocobomba:    { n: 'Fuocobomba', t: 'Fuoco', p: 110, a: 85, pp: 5, fx: { st: 'brn', ch: 30 } },
  pistolacqua:   { n: 'Pistolacqua', t: 'Acqua', p: 40, a: 100, pp: 25 },
  bollaraggio:   { n: 'Bollaraggio', t: 'Acqua', p: 65, a: 100, pp: 20, sta: { stat: 'spd', d: -1, tgt: 'e', ch: 30 } },
  ondata:        { n: 'Ondata', t: 'Acqua', p: 80, a: 100, pp: 15 },
  idropompa:     { n: 'Idropompa', t: 'Acqua', p: 110, a: 80, pp: 5 },
  frustata:      { n: 'Frustata', t: 'Erba', p: 45, a: 100, pp: 25 },
  foglielama:    { n: 'Foglielama', t: 'Erba', p: 70, a: 100, pp: 15, crit: true },
  assorbiseme:   { n: 'Assorbiseme', t: 'Erba', p: 50, a: 100, pp: 20, drain: true },
  petalodanza:   { n: 'Petalodanza', t: 'Erba', p: 105, a: 95, pp: 10 },
  spora:         { n: 'Spora', t: 'Erba', p: 0, a: 75, pp: 15, fx: { st: 'slp', ch: 100 } },
  tossina:       { n: 'Tossina', t: 'Erba', p: 0, a: 85, pp: 20, fx: { st: 'psn', ch: 100 } },
  scossa:        { n: 'Scossa', t: 'Elettro', p: 40, a: 100, pp: 30, fx: { st: 'par', ch: 10 } },
  fulmine:       { n: 'Fulmine', t: 'Elettro', p: 90, a: 100, pp: 15, fx: { st: 'par', ch: 10 } },
  tuono:         { n: 'Tuono', t: 'Elettro', p: 110, a: 70, pp: 10, fx: { st: 'par', ch: 30 } },
  tuononda:      { n: 'Tuononda', t: 'Elettro', p: 0, a: 90, pp: 20, fx: { st: 'par', ch: 100 } },
  sassata:       { n: 'Sassata', t: 'Roccia', p: 50, a: 90, pp: 20 },
  frana:         { n: 'Frana', t: 'Roccia', p: 85, a: 90, pp: 10 },
  rocciolama:    { n: 'Rocciolama', t: 'Roccia', p: 100, a: 80, pp: 5 },
  beccata:       { n: 'Beccata', t: 'Volante', p: 35, a: 100, pp: 35 },
  alacolpo:      { n: 'Alacolpo', t: 'Volante', p: 65, a: 100, pp: 20 },
  tornado:       { n: 'Tornado', t: 'Volante', p: 85, a: 100, pp: 15 },
  ombracolpo:    { n: 'Ombracolpo', t: 'Spettro', p: 50, a: 100, pp: 25 },
  sferaspettro:  { n: 'Sferaspettro', t: 'Spettro', p: 90, a: 100, pp: 15 },
  urlospettrale: { n: 'Urlo Spettrale', t: 'Spettro', p: 0, a: 100, pp: 20, sta: { stat: 'spc', d: -1, tgt: 'e' } },
  ipnosi:        { n: 'Ipnosi', t: 'Spettro', p: 0, a: 60, pp: 15, fx: { st: 'slp', ch: 100 } },
};

/* ---------- specie ----------
   base: hp atk def spc spd — catch: facilità cattura (alto = facile)
   exp: resa esperienza — evolve: {lv, to} — arch/seed/size: aspetto
   learn: [[livello, mossa], ...] — dex: descrizione */
DATA.SPECIES = {
  fogliotto: {
    name: 'Fogliotto', type: 'Erba', base: { hp: 45, atk: 49, def: 49, spc: 65, spd: 45 },
    catch: 45, exp: 64, evolve: { lv: 16, to: 'ramarbo' }, arch: 'plant', seed: 101, size: 0.8,
    learn: [[1, 'graffio'], [1, 'ruggito'], [7, 'frustata'], [13, 'assorbiseme'], [20, 'foglielama'], [27, 'spora'], [34, 'petalodanza']],
    dex: 'Sulla sua schiena cresce una fogliolina che profuma di bosco dopo la pioggia.',
  },
  ramarbo: {
    name: 'Ramarbo', type: 'Erba', base: { hp: 60, atk: 62, def: 63, spc: 80, spd: 60 },
    catch: 45, exp: 142, evolve: { lv: 34, to: 'silvankor' }, arch: 'plant', seed: 102, size: 0.95,
    learn: [[1, 'graffio'], [1, 'frustata'], [20, 'foglielama'], [28, 'spora'], [36, 'petalodanza'], [42, 'iperschianto']],
    dex: 'I rami sulle sue spalle si irrobustiscono ogni volta che vince una lotta.',
  },
  silvankor: {
    name: 'Silvankor', type: 'Erba', base: { hp: 80, atk: 82, def: 83, spc: 100, spd: 80 },
    catch: 45, exp: 236, arch: 'dragon', seed: 103, size: 1.1,
    learn: [[1, 'frustata'], [1, 'foglielama'], [36, 'petalodanza'], [44, 'iperschianto']],
    dex: 'Si dice che un esemplare secolare vegli sul cuore della Foresta di Valmora.',
  },
  braciotto: {
    name: 'Braciotto', type: 'Fuoco', base: { hp: 39, atk: 52, def: 43, spc: 60, spd: 65 },
    catch: 45, exp: 62, evolve: { lv: 16, to: 'ardelupo' }, arch: 'beast', seed: 111, size: 0.8,
    learn: [[1, 'graffio'], [1, 'ruggito'], [7, 'favilla'], [13, 'azzanno'], [20, 'zannaardente'], [27, 'agilita'], [34, 'lanciafiamme'], [44, 'fuocobomba']],
    dex: 'Un cucciolo di lupo dal pelo tiepido. La sua coda sfrigola quando è felice.',
  },
  ardelupo: {
    name: 'Ardelupo', type: 'Fuoco', base: { hp: 58, atk: 64, def: 58, spc: 80, spd: 80 },
    catch: 45, exp: 142, evolve: { lv: 34, to: 'infernax' }, arch: 'beast', seed: 112, size: 0.95,
    learn: [[1, 'favilla'], [1, 'azzanno'], [20, 'zannaardente'], [28, 'agilita'], [36, 'lanciafiamme'], [44, 'fuocobomba']],
    dex: 'Corre più veloce del vento caldo. Le sue zampe lasciano impronte fumanti.',
  },
  infernax: {
    name: 'Infernax', type: 'Fuoco', base: { hp: 78, atk: 84, def: 78, spc: 109, spd: 100 },
    catch: 45, exp: 240, arch: 'dragon', seed: 113, size: 1.1,
    learn: [[1, 'zannaardente'], [1, 'lanciafiamme'], [36, 'lanciafiamme'], [46, 'fuocobomba']],
    dex: 'La sua criniera è una fiamma perenne che nessuna tempesta può spegnere.',
  },
  gocciolo: {
    name: 'Gocciolo', type: 'Acqua', base: { hp: 44, atk: 48, def: 65, spc: 50, spd: 43 },
    catch: 45, exp: 63, evolve: { lv: 16, to: 'ondrillo' }, arch: 'blob', seed: 121, size: 0.8,
    learn: [[1, 'graffio'], [1, 'ruggito'], [7, 'pistolacqua'], [13, 'azzanno'], [20, 'bollaraggio'], [27, 'fortifica'], [34, 'ondata'], [44, 'idropompa']],
    dex: 'Tiene sempre una goccia di rugiada sulla testa: è il suo portafortuna.',
  },
  ondrillo: {
    name: 'Ondrillo', type: 'Acqua', base: { hp: 59, atk: 63, def: 80, spc: 65, spd: 58 },
    catch: 45, exp: 142, evolve: { lv: 34, to: 'maremoto' }, arch: 'beast', seed: 122, size: 0.95,
    learn: [[1, 'pistolacqua'], [1, 'azzanno'], [20, 'bollaraggio'], [28, 'fortifica'], [36, 'ondata'], [44, 'idropompa']],
    dex: 'Nuota controcorrente nei fiumi di montagna per allenare le pinne.',
  },
  maremoto: {
    name: 'Maremoto', type: 'Acqua', base: { hp: 79, atk: 83, def: 100, spc: 85, spd: 78 },
    catch: 45, exp: 239, arch: 'dragon', seed: 123, size: 1.1,
    learn: [[1, 'bollaraggio'], [1, 'ondata'], [36, 'ondata'], [46, 'idropompa']],
    dex: 'Quando ruggisce, il mare risponde. I pescatori lo venerano da generazioni.',
  },
  sorcetto: {
    name: 'Sorcetto', type: 'Normale', base: { hp: 30, atk: 56, def: 35, spc: 25, spd: 72 },
    catch: 255, exp: 51, evolve: { lv: 18, to: 'sorcione' }, arch: 'blob', seed: 131, size: 0.7,
    learn: [[1, 'graffio'], [6, 'ruggito'], [10, 'azzanno'], [16, 'agilita'], [22, 'schianto']],
    dex: 'Rosicchia qualunque cosa. I suoi dentini crescono per tutta la vita.',
  },
  sorcione: {
    name: 'Sorcione', type: 'Normale', base: { hp: 55, atk: 81, def: 60, spc: 50, spd: 97 },
    catch: 127, exp: 145, arch: 'beast', seed: 132, size: 0.9,
    learn: [[1, 'azzanno'], [20, 'agilita'], [24, 'schianto'], [32, 'iperschianto']],
    dex: 'Le sue vibrisse percepiscono i pericoli. Difende il territorio con ferocia.',
  },
  passerotto: {
    name: 'Passerotto', type: 'Volante', base: { hp: 40, atk: 45, def: 40, spc: 35, spd: 56 },
    catch: 255, exp: 50, evolve: { lv: 18, to: 'falchetto' }, arch: 'bird', seed: 141, size: 0.7,
    learn: [[1, 'beccata'], [6, 'ruggito'], [11, 'alacolpo'], [18, 'agilita'], [26, 'tornado']],
    dex: 'Saltella sui sentieri in cerca di semi. Canta all\'alba senza mai stancarsi.',
  },
  falchetto: {
    name: 'Falchetto', type: 'Volante', base: { hp: 63, atk: 60, def: 55, spc: 50, spd: 86 },
    catch: 120, exp: 122, evolve: { lv: 36, to: 'aquilord' }, arch: 'bird', seed: 142, size: 0.9,
    learn: [[1, 'beccata'], [1, 'alacolpo'], [20, 'agilita'], [28, 'tornado']],
    dex: 'In picchiata supera ogni altro volatile della regione. Occhi infallibili.',
  },
  aquilord: {
    name: 'Aquilord', type: 'Volante', base: { hp: 83, atk: 80, def: 75, spc: 70, spd: 101 },
    catch: 60, exp: 211, arch: 'bird', seed: 143, size: 1.1,
    learn: [[1, 'alacolpo'], [1, 'tornado'], [40, 'iperschianto']],
    dex: 'Signore dei cieli di Valmora. Nidifica solo sulle vette più alte.',
  },
  brucolo: {
    name: 'Brucolo', type: 'Erba', base: { hp: 45, atk: 30, def: 35, spc: 20, spd: 45 },
    catch: 255, exp: 39, evolve: { lv: 9, to: 'crisalin' }, arch: 'serpent', seed: 151, size: 0.7,
    learn: [[1, 'graffio'], [5, 'tossina']],
    dex: 'Striscia tra le foglie cadute. Se spaventato emette una polvere amara.',
  },
  crisalin: {
    name: 'Crisalin', type: 'Erba', base: { hp: 50, atk: 20, def: 55, spc: 25, spd: 30 },
    catch: 120, exp: 72, evolve: { lv: 14, to: 'farfaluce' }, arch: 'rock', seed: 152, size: 0.7,
    learn: [[1, 'fortifica']],
    dex: 'Dentro il bozzolo sogna di volare. Il guscio è duro come pietra.',
  },
  farfaluce: {
    name: 'Farfaluce', type: 'Volante', base: { hp: 60, atk: 45, def: 50, spc: 90, spd: 70 },
    catch: 45, exp: 178, arch: 'bird', seed: 153, size: 0.95,
    learn: [[1, 'tornado'], [12, 'spora'], [16, 'assorbiseme'], [22, 'tornado'], [30, 'petalodanza']],
    dex: 'Le sue ali brillano di notte. La polvere che lascia cura le ferite lievi.',
  },
  sassolo: {
    name: 'Sassolo', type: 'Roccia', base: { hp: 40, atk: 80, def: 100, spc: 30, spd: 20 },
    catch: 255, exp: 60, evolve: { lv: 20, to: 'macignor' }, arch: 'rock', seed: 161, size: 0.75,
    learn: [[1, 'sassata'], [8, 'fortifica'], [19, 'frana'], [30, 'rocciolama']],
    dex: 'Sembra un sasso qualunque finché non apre gli occhi. Dorme per mesi.',
  },
  macignor: {
    name: 'Macignor', type: 'Roccia', base: { hp: 55, atk: 95, def: 115, spc: 45, spd: 35 },
    catch: 90, exp: 137, arch: 'rock', seed: 162, size: 1.05,
    learn: [[1, 'sassata'], [1, 'fortifica'], [24, 'frana'], [36, 'rocciolama']],
    dex: 'Rotola giù dalle montagne per spostarsi. I suoi pugni frantumano il granito.',
  },
  folgorino: {
    name: 'Folgorino', type: 'Elettro', base: { hp: 35, atk: 55, def: 40, spc: 50, spd: 90 },
    catch: 190, exp: 82, evolve: { lv: 22, to: 'tempestor' }, arch: 'beast', seed: 171, size: 0.75,
    learn: [[1, 'scossa'], [9, 'agilita'], [16, 'tuononda'], [24, 'fulmine'], [38, 'tuono']],
    dex: 'Accumula elettricità statica nel pelo. Toccarlo fa rizzare i capelli.',
  },
  tempestor: {
    name: 'Tempestor', type: 'Elettro', base: { hp: 60, atk: 75, def: 60, spc: 85, spd: 110 },
    catch: 75, exp: 175, arch: 'beast', seed: 172, size: 1.0,
    learn: [[1, 'scossa'], [1, 'tuononda'], [26, 'fulmine'], [40, 'tuono']],
    dex: 'Quando corre a piena velocità lascia dietro di sé una scia di scintille.',
  },
  pinnetta: {
    name: 'Pinnetta', type: 'Acqua', base: { hp: 40, atk: 45, def: 55, spc: 60, spd: 55 },
    catch: 190, exp: 66, evolve: { lv: 22, to: 'tritonda' }, arch: 'blob', seed: 181, size: 0.75,
    learn: [[1, 'pistolacqua'], [10, 'ruggito'], [18, 'bollaraggio'], [26, 'ondata']],
    dex: 'Vive negli stagni limpidi. La sua pinna dorsale spunta tra le ninfee.',
  },
  tritonda: {
    name: 'Tritonda', type: 'Acqua', base: { hp: 70, atk: 65, def: 75, spc: 85, spd: 70 },
    catch: 75, exp: 168, arch: 'ghost', seed: 182, size: 1.0,
    learn: [[1, 'pistolacqua'], [1, 'bollaraggio'], [28, 'ondata'], [40, 'idropompa']],
    dex: 'Danza sull\'acqua nelle notti di luna piena. Il suo canto placa le onde.',
  },
  ombrolo: {
    name: 'Ombrolo', type: 'Spettro', base: { hp: 30, atk: 35, def: 30, spc: 100, spd: 80 },
    catch: 190, exp: 95, evolve: { lv: 25, to: 'spettrux' }, arch: 'ghost', seed: 191, size: 0.75,
    learn: [[1, 'ombracolpo'], [12, 'urlospettrale'], [18, 'ipnosi'], [26, 'sferaspettro']],
    dex: 'Nasce dall\'ombra di un albero centenario. Adora fare scherzi innocui.',
  },
  spettrux: {
    name: 'Spettrux', type: 'Spettro', base: { hp: 60, atk: 65, def: 60, spc: 130, spd: 110 },
    catch: 60, exp: 190, arch: 'ghost', seed: 192, size: 1.05,
    learn: [[1, 'ombracolpo'], [1, 'ipnosi'], [29, 'sferaspettro'], [38, 'urlospettrale']],
    dex: 'Si nasconde nelle grotte buie. Chi incrocia il suo sguardo dimentica la strada.',
  },
  lavetta: {
    name: 'Lavetta', type: 'Fuoco', base: { hp: 50, atk: 70, def: 55, spc: 55, spd: 45 },
    catch: 190, exp: 78, evolve: { lv: 24, to: 'magmarok' }, arch: 'blob', seed: 201, size: 0.75,
    learn: [[1, 'favilla'], [12, 'fortifica'], [20, 'zannaardente'], [30, 'lanciafiamme'], [42, 'fuocobomba']],
    dex: 'Una salamandra che dorme nella cenere calda. Brilla nel buio delle grotte.',
  },
  magmarok: {
    name: 'Magmarok', type: 'Fuoco', base: { hp: 70, atk: 95, def: 85, spc: 80, spd: 55 },
    catch: 75, exp: 196, arch: 'rock', seed: 202, size: 1.05,
    learn: [[1, 'zannaardente'], [1, 'fortifica'], [32, 'lanciafiamme'], [36, 'frana'], [44, 'fuocobomba']],
    dex: 'Il suo corpo è roccia fusa raffreddata. Il cuore arde a mille gradi.',
  },
  cucciorso: {
    name: 'Cucciorso', type: 'Normale', base: { hp: 60, atk: 70, def: 50, spc: 45, spd: 40 },
    catch: 150, exp: 80, evolve: { lv: 23, to: 'grandorso' }, arch: 'beast', seed: 211, size: 0.8,
    learn: [[1, 'graffio'], [10, 'ruggito'], [17, 'azzanno'], [25, 'schianto'], [35, 'iperschianto']],
    dex: 'Si arrampica sugli alberi in cerca di miele. Tenero ma permaloso.',
  },
  grandorso: {
    name: 'Grandorso', type: 'Normale', base: { hp: 90, atk: 110, def: 75, spc: 60, spd: 55 },
    catch: 60, exp: 189, arch: 'beast', seed: 212, size: 1.15,
    learn: [[1, 'azzanno'], [1, 'ruggito'], [27, 'schianto'], [38, 'iperschianto']],
    dex: 'Si erge sulle zampe posteriori per intimidire. Un abbraccio da evitare.',
  },
  alacieca: {
    name: 'Alacieca', type: 'Volante', base: { hp: 35, atk: 40, def: 30, spc: 40, spd: 75 },
    catch: 255, exp: 49, evolve: { lv: 21, to: 'notturnix' }, arch: 'bird', seed: 221, size: 0.7,
    learn: [[1, 'beccata'], [12, 'ipnosi'], [20, 'alacolpo'], [30, 'tornado']],
    dex: 'Vive appeso al soffitto delle grotte. Vede col suono, non con gli occhi.',
  },
  notturnix: {
    name: 'Notturnix', type: 'Volante', base: { hp: 70, atk: 75, def: 65, spc: 70, spd: 95 },
    catch: 90, exp: 159, arch: 'bird', seed: 222, size: 1.0,
    learn: [[1, 'alacolpo'], [1, 'ipnosi'], [28, 'tornado'], [42, 'iperschianto']],
    dex: 'Pattuglia il cielo notturno in silenzio assoluto. Le sue ali non frusciano.',
  },
  funghetto: {
    name: 'Funghetto', type: 'Erba', base: { hp: 45, atk: 50, def: 55, spc: 65, spd: 30 },
    catch: 190, exp: 65, evolve: { lv: 21, to: 'fungone' }, arch: 'blob', seed: 231, size: 0.7,
    learn: [[1, 'frustata'], [8, 'spora'], [15, 'tossina'], [22, 'assorbiseme'], [32, 'petalodanza']],
    dex: 'Cresce dove il bosco è più umido. Il cappello cambia colore con le stagioni.',
  },
  fungone: {
    name: 'Fungone', type: 'Erba', base: { hp: 75, atk: 80, def: 85, spc: 95, spd: 40 },
    catch: 75, exp: 184, arch: 'plant', seed: 232, size: 1.05,
    learn: [[1, 'frustata'], [1, 'spora'], [24, 'assorbiseme'], [34, 'petalodanza']],
    dex: 'Le sue spore fanno dormire un Grandorso in tre secondi. Maneggiare con cura.',
  },
  gufospettro: {
    name: 'Gufospettro', type: 'Spettro', base: { hp: 75, atk: 70, def: 65, spc: 85, spd: 70 },
    catch: 45, exp: 174, arch: 'bird', seed: 241, size: 1.0,
    learn: [[1, 'beccata'], [14, 'ombracolpo'], [22, 'ipnosi'], [30, 'sferaspettro'], [38, 'tornado']],
    dex: 'Appare solo a chi si perde nel bosco di notte. Nessuno sa se aiuti o inganni.',
  },
  folgodrago: {
    name: 'Folgodrago', type: 'Elettro', base: { hp: 90, atk: 95, def: 85, spc: 115, spd: 110 },
    catch: 5, exp: 280, arch: 'dragon', seed: 251, size: 1.2,
    learn: [[1, 'scossa'], [1, 'fulmine'], [35, 'agilita'], [45, 'tuono'], [50, 'iperschianto']],
    dex: 'Il leggendario custode di Valmora. Si dice dorma nel cuore della montagna da mille anni.',
  },
};
DATA.DEX_ORDER = Object.keys(DATA.SPECIES);

/* ---------- oggetti ---------- */
DATA.ITEMS = {
  pozione:        { n: 'Pozione', price: 300, heal: 20, desc: 'Ripristina 20 PS.' },
  superpozione:   { n: 'Superpozione', price: 700, heal: 50, desc: 'Ripristina 50 PS.' },
  iperpozione:    { n: 'Iperpozione', price: 1500, heal: 200, desc: 'Ripristina 200 PS.' },
  antidoto:       { n: 'Antidoto', price: 100, cure: 'psn', desc: 'Cura l\'avvelenamento.' },
  paracura:       { n: 'Paracura', price: 200, cure: 'par', desc: 'Cura la paralisi.' },
  sveglia:        { n: 'Sveglia', price: 250, cure: 'slp', desc: 'Sveglia un Velmon addormentato.' },
  curatutto:      { n: 'Curatutto', price: 600, cure: 'all', desc: 'Cura ogni problema di stato.' },
  revitalizzante: { n: 'Revitalizzante', price: 1500, revive: true, desc: 'Rianima un Velmon esausto a metà PS.' },
  vortex:         { n: 'Vortex', price: 200, ball: 1, desc: 'Sfera per catturare Velmon selvatici.' },
  granvortex:     { n: 'Granvortex', price: 600, ball: 1.5, desc: 'Sfera ad alte prestazioni.' },
  ultravortex:    { n: 'Ultravortex', price: 1200, ball: 2, desc: 'Sfera dalle prestazioni eccellenti.' },
  caramella:      { n: 'Caramella Rara', price: 0, candy: true, desc: 'Fa salire un Velmon di 1 livello.' },
};

/* ---------- formule ---------- */
DATA.expForLv = lv => lv * lv * lv;
DATA.stats = mon => {
  const sp = DATA.SPECIES[mon.sp], lv = mon.lv;
  const f = b => Math.floor(b * 2 * lv / 100) + 5;
  return {
    maxhp: Math.floor(sp.base.hp * 2 * lv / 100) + lv + 10,
    atk: f(sp.base.atk), def: f(sp.base.def),
    spc: f(sp.base.spc), spd: f(sp.base.spd),
  };
};
DATA.movesAtLevel = (spId, lv) => {
  const learn = DATA.SPECIES[spId].learn.filter(e => e[0] <= lv).map(e => e[1]);
  const uniq = [...new Set(learn)];
  return uniq.slice(-4);
};
DATA.makeMon = (spId, lv) => {
  const mon = {
    sp: spId, lv, xp: DATA.expForLv(lv),
    status: null, slp: 0,
    moves: DATA.movesAtLevel(spId, lv).map(id => ({ id, pp: DATA.MOVES[id].pp })),
  };
  mon.hp = DATA.stats(mon).maxhp;
  return mon;
};
DATA.statusLabel = { psn: 'VLN', par: 'PAR', slp: 'SON', brn: 'BRC' };
DATA.statusColor = { psn: '#a040a0', par: '#f8b830', slp: '#8890a0', brn: '#f08030' };
DATA.stageMult = s => s >= 0 ? (2 + s) / 2 : 2 / (2 - s);

/* contro-starter del rivale */
DATA.RIVAL_STARTER = { braciotto: 'gocciolo', gocciolo: 'fogliotto', fogliotto: 'braciotto' };
DATA.RIVAL_FINAL = { gocciolo: 'maremoto', fogliotto: 'silvankor', braciotto: 'infernax' };
