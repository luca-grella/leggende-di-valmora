// The nine regions of Valmora, laid out on a 3x3 grid. Each one is an original
// place loosely inspired by a classic monster-collector region.

export const REGION_SIZE = 2048;
export const WORLD_HALF = REGION_SIZE * 1.5; // the world spans -3072..3072 on both axes

export const REGIONS = [
  {
    id: 'gelidi', name: 'Picchi Gelidi', gx: -1, gz: -1,
    desc: 'Montagne innevate e laghi ghiacciati',
    base: 26, relief: 22, mountains: 210, ridgeFreq: 1.3,
    palette: { grass: 0xc9d6d2, grass2: 0x9fb5a6, dirt: 0x8d8173, rock: 0x7b7f88, sand: 0xcfc8b8, snow: 0xf4f7fb },
    snowLine: 34, trees: { type: 'snowpine', density: 0.55 }, flowers: 0.05, flowerColors: [0xdde8ff, 0xb8c9ff],
    tallGrass: 0x8fae98, levels: [22, 32],
    spawns: { nevino: 4, brinella: 3, roccione: 2, ombrale: 1 },
    town: { name: 'Borgo Cristallo', wall: 0xe8e4dc, roof: 0x4a6fa5 },
  },
  {
    id: 'nebbia', name: 'Brughiera di Nebbia', gx: 0, gz: -1,
    desc: 'Colline ondulate, nebbia e vecchi castelli',
    base: 14, relief: 30, mountains: 25, ridgeFreq: 0.8,
    palette: { grass: 0x5e7d4a, grass2: 0x7c8f55, dirt: 0x6e5a44, rock: 0x6b6b66, sand: 0xbdb59a, snow: 0xeeeeee },
    snowLine: 999, trees: { type: 'broad', density: 0.25 }, flowers: 0.35, flowerColors: [0x9b6fc9, 0xc58bd6, 0xe9e2f2],
    tallGrass: 0x6f8f4f, levels: [14, 22],
    spawns: { ombrale: 3, lanuvo: 3, pipistro: 3, grillo: 2 },
    town: { name: 'Castelfosco', wall: 0xb7ab98, roof: 0x5b3e36 },
  },
  {
    id: 'giada', name: 'Selva di Giada', gx: 1, gz: -1,
    desc: 'Foreste antiche e templi nascosti',
    base: 12, relief: 18, mountains: 60, ridgeFreq: 1.0,
    palette: { grass: 0x3f7a3a, grass2: 0x5c8f3e, dirt: 0x6b5236, rock: 0x6f6e64, sand: 0xc9bb8f, snow: 0xeeeeee },
    snowLine: 999, trees: { type: 'broad', density: 1.25 }, flowers: 0.2, flowerColors: [0xffd166, 0xff8fab],
    tallGrass: 0x4f8f3a, levels: [10, 18],
    spawns: { fogliolo: 3, grillo: 4, scoiattolo: 3, pipistro: 1 },
    town: { name: 'Borgo Muschio', wall: 0xd9c7a3, roof: 0x3d6b3d },
  },
  {
    id: 'fiorita', name: 'Costa Fiorita', gx: -1, gz: 0,
    desc: 'Campi di fiori, vigneti e scogliere sul mare',
    base: 10, relief: 16, mountains: 12, ridgeFreq: 0.7,
    palette: { grass: 0x78a44c, grass2: 0x9bbd57, dirt: 0x8a6d4b, rock: 0x948b7d, sand: 0xe7d7a8, snow: 0xeeeeee },
    snowLine: 999, trees: { type: 'cypress', density: 0.35 }, flowers: 1.0, flowerColors: [0xff6b9a, 0xffd23f, 0xb388ff, 0xffffff, 0xff9f43],
    tallGrass: 0x86b24f, levels: [6, 12],
    spawns: { farfallina: 4, lanuvo: 2, fogliolo: 2, pulcino: 2 },
    town: { name: 'Villa Petalo', wall: 0xf3e6cf, roof: 0xc0573e },
  },
  {
    id: 'aurora', name: 'Valle Aurora', gx: 0, gz: 0,
    desc: 'La valle dove inizia ogni avventura',
    base: 9, relief: 14, mountains: 18, ridgeFreq: 0.9,
    palette: { grass: 0x6aa84f, grass2: 0x8cc152, dirt: 0x8b6b43, rock: 0x8a877d, sand: 0xe3d3a1, snow: 0xeeeeee },
    snowLine: 999, trees: { type: 'broad', density: 0.45 }, flowers: 0.3, flowerColors: [0xffffff, 0xffe066, 0xff8fa3],
    tallGrass: 0x6fb24a, levels: [2, 6],
    spawns: { pulcino: 4, topolux: 3, lanuvo: 3, grillo: 2 },
    town: { name: 'Borgo Alba', wall: 0xf1ead8, roof: 0xd0533c },
    start: true,
  },
  {
    id: 'fulgida', name: 'Piana Fulgida', gx: 1, gz: 0,
    desc: 'Pianure sconfinate e la grande città di luce',
    base: 8, relief: 8, mountains: 10, ridgeFreq: 0.6,
    palette: { grass: 0x7fa356, grass2: 0x9db45e, dirt: 0x7d6a55, rock: 0x8c8c8c, sand: 0xd9cfa8, snow: 0xeeeeee },
    snowLine: 999, trees: { type: 'broad', density: 0.18 }, flowers: 0.15, flowerColors: [0xffffff, 0xffd23f],
    tallGrass: 0x8bb056, levels: [14, 20],
    spawns: { topolux: 3, voltino: 4, pipistro: 2, roccione: 1 },
    town: { name: 'Città Fulgida', wall: 0xdfe3e8, roof: 0x3b4d61, big: true },
  },
  {
    id: 'ramato', name: 'Altopiano Ramato', gx: -1, gz: 1,
    desc: 'Canyon rossi, mesa e deserto',
    base: 18, relief: 14, mountains: 90, ridgeFreq: 1.6,
    palette: { grass: 0xb08a4f, grass2: 0xc49a5a, dirt: 0xa0603a, rock: 0xb4552d, sand: 0xe0b77a, snow: 0xeeeeee },
    snowLine: 999, trees: { type: 'cactus', density: 0.3 }, flowers: 0.05, flowerColors: [0xff5d5d, 0xffb84d],
    tallGrass: 0xb59a52, levels: [26, 36],
    spawns: { sabbiolo: 4, roccione: 3, fiammello: 2, voltino: 1 },
    town: { name: 'Rocca Ramata', wall: 0xe0b98a, roof: 0x9c4a2a },
  },
  {
    id: 'corallo', name: 'Arcipelago Corallo', gx: 0, gz: 1,
    desc: 'Isole, lagune e barriere coralline',
    base: -14, relief: 26, mountains: 30, ridgeFreq: 1.1,
    palette: { grass: 0x5fae5a, grass2: 0x7cc06a, dirt: 0x8a7350, rock: 0x7f7a70, sand: 0xf1e2b3, snow: 0xeeeeee },
    snowLine: 999, trees: { type: 'palm', density: 0.6 }, flowers: 0.25, flowerColors: [0xff6f91, 0xffc75f],
    tallGrass: 0x6cb85c, levels: [18, 26],
    spawns: { goccino: 4, granchio: 3, pulcino: 2, farfallina: 1 },
    town: { name: 'Porto Corallo', wall: 0xfaf3e3, roof: 0x2f8fb3 },
  },
  {
    id: 'solari', name: 'Isole Solari', gx: 1, gz: 1,
    desc: 'Tropici, vulcani e spiagge infinite',
    base: -6, relief: 30, mountains: 120, ridgeFreq: 1.2,
    palette: { grass: 0x48a248, grass2: 0x6cbf4a, dirt: 0x6f4f3a, rock: 0x4c4440, sand: 0xf5e6b8, snow: 0xeeeeee },
    snowLine: 999, trees: { type: 'palm', density: 0.9 }, flowers: 0.5, flowerColors: [0xff3d68, 0xffa600, 0xffffff],
    tallGrass: 0x55b04a, levels: [30, 40],
    spawns: { fiammello: 3, goccino: 2, granchio: 2, scoiattolo: 2, voltino: 1 },
    town: { name: 'Baia del Sole', wall: 0xfff4dc, roof: 0xe07a2f },
  },
];

export function regionAt(x, z) {
  const gx = Math.max(-1, Math.min(1, Math.round(x / REGION_SIZE)));
  const gz = Math.max(-1, Math.min(1, Math.round(z / REGION_SIZE)));
  return REGIONS.find((r) => r.gx === gx && r.gz === gz);
}

export function regionCenter(r) {
  return { x: r.gx * REGION_SIZE, z: r.gz * REGION_SIZE };
}
