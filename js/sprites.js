'use strict';
/* ============================================================
   sprites.js — grafica procedurale:
   - tile 16x16 stile GBA (con animazioni a 2 frame)
   - sprite personaggi 16x16 (template + recolor)
   - generatore sprite Velmon 32x32 (seed per specie)
   ============================================================ */

function mkCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  return [c, g];
}
function flipCanvas(src) {
  const [c, g] = mkCanvas(src.width, src.height);
  g.translate(src.width, 0); g.scale(-1, 1);
  g.drawImage(src, 0, 0);
  return c;
}

/* ============================================================
   TILES
   ============================================================ */
const Tiles = {
  cache: {},
  get(id, frame, color) {
    const key = id + '|' + (frame || 0) + '|' + (color || '');
    if (this.cache[key]) return this.cache[key];
    const [c, g] = mkCanvas(16, 16);
    const fn = TILE_DRAW[id];
    if (fn) fn(g, frame || 0, color);
    else { g.fillStyle = '#f0f'; g.fillRect(0, 0, 16, 16); }
    this.cache[key] = c;
    return c;
  },
};

function px(g, x, y, w, h, c) { g.fillStyle = c; g.fillRect(x, y, w, h); }
function speckle(g, seed, n, c, size) {
  const r = mulberry32(seed);
  for (let i = 0; i < n; i++) px(g, Math.floor(r() * 15), Math.floor(r() * 15), size || 1, size || 1, c);
}

function grassBase(g) {
  px(g, 0, 0, 16, 16, '#70b840');
  [[1,0],[5,1],[9,0],[13,1],[3,4],[7,5],[11,4],[1,8],[5,9],[9,8],[13,9],[3,12],[7,13],[11,12]].forEach(([x,y])=>px(g,x,y,1,2,'#90d050'));
  px(g, 0, 14, 16, 2, '#509030');
  speckle(g, 7, 4, '#509030', 1);
}
function caveBase(g) {
  px(g, 0, 0, 16, 16, '#907060');
  speckle(g, 11, 8, '#786050', 1);
  speckle(g, 31, 5, '#a88070', 1);
}
function intFloorBase(g) {
  px(g, 0, 0, 16, 16, '#dcc8a0');
  px(g, 0, 7, 16, 1, '#c0a880'); px(g, 0, 15, 16, 1, '#c0a880');
  px(g, 7, 0, 1, 7, '#c0a880'); px(g, 7, 8, 1, 7, '#c0a880');
  px(g, 1, 1, 6, 6, '#e0cca8'); px(g, 9, 1, 6, 6, '#d8c49c');
  px(g, 1, 9, 6, 6, '#d8c49c'); px(g, 9, 9, 6, 6, '#e0cca8');
}
function wallBase(g) {
  px(g, 0, 0, 16, 16, '#eee0c8');
  px(g, 0, 5, 16, 1, '#d4c0a0'); px(g, 0, 10, 16, 1, '#d4c0a0'); px(g, 0, 15, 16, 1, '#c0a888');
  px(g, 8, 0, 1, 5, '#d4c0a0'); px(g, 0, 6, 1, 4, '#d4c0a0'); px(g, 8, 11, 1, 4, '#d4c0a0');
  px(g, 0, 0, 16, 1, '#fef8ec');
}

const TILE_DRAW = {
  grass(g) { grassBase(g); },
  tall(g, f) {
    grassBase(g);
    const o = f ? 1 : 0;
    const dark='#1e6020', mid='#3a9038', lt='#60c048';
    for (const bx of [1, 6, 11]) {
      px(g, bx+o, 3, 1, 10, dark); px(g, bx+2-o, 3, 1, 10, dark);
      px(g, bx+1, 1, 1, 12, mid);
      px(g, bx+1, 0, 1, 2, lt);
    }
    px(g, 0, 13, 16, 3, '#3a8030');
  },
  flower(g, f) {
    grassBase(g);
    const petal = f ? '#f86858' : '#f8a048';
    px(g, 6, 10, 2, 4, '#3c8830');             // stelo
    px(g, 5, 5, 2, 2, petal); px(g, 8, 5, 2, 2, petal);
    px(g, 5, 8, 2, 2, petal); px(g, 8, 8, 2, 2, petal);
    px(g, 6, 6, 3, 3, '#f8e048');              // centro
  },
  path(g) {
    px(g, 0, 0, 16, 16, '#dcc878');
    px(g, 0, 0, 16, 1, '#c8b460'); px(g, 0, 15, 16, 1, '#c8b460');
    px(g, 0, 7, 16, 1, '#c8b460');
    speckle(g, 13, 8, '#c4a858', 1);
    speckle(g, 27, 5, '#eed898', 1);
    speckle(g, 41, 4, '#c8b058', 1);
  },
  water(g, f) {
    px(g, 0, 0, 16, 16, '#3880d0');
    px(g, 0, 0, 16, 3, '#2870c0');
    px(g, 0, 13, 16, 3, '#2060a8');
    const o = f ? 5 : 0;
    const wl='#70b0f0', ws='#b0d8f8';
    px(g, (1+o)%16, 2, 5, 1, wl); px(g, (8+o)%16, 6, 4, 1, wl);
    px(g, (3+o)%16, 10, 6, 1, wl); px(g, (11+o)%16, 13, 5, 1, wl);
    if (!f) { px(g, 4, 1, 1, 1, ws); px(g, 13, 7, 1, 1, ws); }
    else     { px(g, 9, 4, 1, 1, ws); px(g, 2, 11, 1, 1, ws); }
  },
  tree(g) {
    px(g, 0, 11, 16, 5, '#70b840');
    speckle(g, 7, 3, '#509030', 1);
    px(g, 4, 12, 8, 4, '#386820');
    px(g, 6, 9, 4, 7, '#6c3c18');
    px(g, 7, 9, 1, 6, '#8c5428');
    px(g, 6, 9, 4, 1, '#8c5428');
    px(g, 1, 7, 14, 5, '#185018');
    px(g, 2, 5, 12, 6, '#185018');
    px(g, 2, 4, 12, 8, '#2c7028');
    px(g, 3, 3, 10, 8, '#2c7028');
    px(g, 5, 1, 6, 3, '#2c7028');
    px(g, 4, 3, 5, 3, '#48a030');
    px(g, 3, 5, 4, 3, '#48a030');
    px(g, 8, 4, 4, 2, '#3a9028');
    px(g, 6, 1, 4, 2, '#48a030');
  },
  fence(g) {
    grassBase(g);
    px(g, 0, 6, 16, 2, '#b08850'); px(g, 0, 6, 16, 1, '#d0a868');
    px(g, 1, 4, 2, 8, '#a07840'); px(g, 7, 4, 2, 8, '#a07840'); px(g, 13, 4, 2, 8, '#a07840');
    px(g, 1, 4, 2, 1, '#c89858'); px(g, 7, 4, 2, 1, '#c89858'); px(g, 13, 4, 2, 1, '#c89858');
  },
  sign(g) {
    grassBase(g);
    px(g, 7, 9, 2, 6, '#8a5a30');
    px(g, 2, 2, 12, 8, '#c8a058');
    px(g, 2, 2, 12, 1, '#e0c078'); px(g, 2, 9, 12, 1, '#8a6838');
    px(g, 4, 4, 8, 1, '#705030'); px(g, 4, 6, 8, 1, '#705030');
  },
  ledge(g) {
    grassBase(g);
    px(g, 0, 10, 16, 2, '#b89858');
    px(g, 0, 12, 16, 3, '#d8b878');
    px(g, 0, 10, 16, 1, '#8a6838');
    px(g, 2, 13, 2, 1, '#c0a060'); px(g, 9, 13, 3, 1, '#c0a060');
  },
  mountain(g) {
    px(g, 0, 0, 16, 16, '#a09060');
    px(g, 0, 0, 6, 16, '#888058');
    px(g, 10, 0, 6, 16, '#b0a068');
    px(g, 0, 0, 16, 1, '#c8b878');
    px(g, 0, 5, 16, 1, '#787050'); px(g, 0, 10, 16, 1, '#787050');
    px(g, 5, 0, 1, 5, '#787050'); px(g, 11, 6, 1, 4, '#b0a068');
    px(g, 7, 2, 3, 1, '#c4b878'); px(g, 12, 8, 3, 1, '#c0b070');
  },
  cavewall(g) {
    px(g, 0, 0, 16, 16, '#504038');
    px(g, 0, 0, 16, 2, '#685850');
    px(g, 0, 0, 1, 16, '#685850');
    px(g, 15, 0, 1, 16, '#382e28');
    px(g, 0, 7, 16, 1, '#302820'); px(g, 0, 13, 16, 1, '#302820');
    px(g, 4, 2, 1, 5, '#302820'); px(g, 10, 8, 1, 5, '#302820');
    px(g, 6, 3, 3, 1, '#685850'); px(g, 11, 10, 3, 1, '#5c4c40');
  },
  cavefloor(g) { caveBase(g); },
  crystal(g, f) {
    caveBase(g);
    px(g, 4, 6, 3, 8, '#48b8c8'); px(g, 8, 4, 3, 10, '#68d8e8'); px(g, 11, 8, 2, 6, '#48b8c8');
    px(g, 9, 4, 1, 4, '#b8f4f8');
    px(g, 3, 13, 11, 2, '#6a5a48');
    if (f) { px(g, 9, 5, 1, 1, '#ffffff'); px(g, 5, 8, 1, 1, '#ffffff'); }
  },
  wall(g) { wallBase(g); },
  window(g) {
    wallBase(g);
    px(g, 2, 3, 12, 9, '#806040');
    px(g, 3, 4, 10, 7, '#385888');
    px(g, 4, 5, 3, 2, '#7898c8');
    px(g, 7, 4, 1, 7, '#806040'); px(g, 3, 7, 10, 1, '#806040');
  },
  door(g) {
    wallBase(g);
    px(g, 2, 1, 12, 15, '#5c3c20');
    px(g, 3, 2, 10, 14, '#8a5a30');
    px(g, 4, 3, 8, 5, '#a87848');
    px(g, 11, 9, 1, 2, '#f0d088');
  },
  roof(g, f, color) {
    const base = color || '#d86040';
    px(g, 0, 0, 16, 16, base);
    g.globalAlpha = 0.3;
    px(g, 0, 5, 16, 1, '#000'); px(g, 0, 10, 16, 1, '#000'); px(g, 0, 15, 16, 1, '#000');
    g.globalAlpha = 0.15;
    px(g, 0, 2, 16, 1, '#000'); px(g, 0, 7, 16, 1, '#000'); px(g, 0, 12, 16, 1, '#000');
    g.globalAlpha = 0.4;
    px(g, 0, 0, 16, 2, '#fff');
    g.globalAlpha = 1;
  },
  intwall(g) {
    px(g, 0, 0, 16, 16, '#685848');
    px(g, 0, 0, 16, 2, '#786858');
    px(g, 0, 14, 16, 2, '#504438');
    px(g, 4, 2, 1, 12, '#5c4c40');
    px(g, 9, 2, 1, 12, '#5c4c40');
    px(g, 14, 2, 1, 12, '#5c4c40');
  },
  intfloor(g) { intFloorBase(g); },
  shelf(g) {
    px(g, 0, 0, 16, 16, '#7c5028');
    px(g, 1, 2, 14, 5, '#503418'); px(g, 1, 9, 14, 5, '#503418');
    const books = ['#c04040', '#4060c0', '#40a050', '#d0a030', '#8050a8'];
    for (let i = 0; i < 5; i++) {
      px(g, 2 + i * 3, 3, 2, 4, books[i]);
      px(g, 2 + i * 3, 10, 2, 4, books[(i + 2) % 5]);
    }
    px(g, 0, 0, 16, 1, '#9a6c38');
  },
  counter(g) {
    px(g, 0, 0, 16, 16, '#c0a878');
    px(g, 0, 0, 16, 6, '#e8e0d0');
    px(g, 0, 0, 16, 1, '#f8f4ec'); px(g, 0, 6, 16, 1, '#988050');
    px(g, 3, 9, 2, 4, '#a89060'); px(g, 11, 9, 2, 4, '#a89060');
  },
  table(g) {
    intFloorBase(g);
    px(g, 2, 3, 12, 9, '#b08048');
    px(g, 2, 3, 12, 2, '#d0a060');
    px(g, 3, 12, 2, 3, '#805828'); px(g, 11, 12, 2, 3, '#805828');
  },
  mat(g) {
    px(g, 0, 0, 16, 16, '#587038');
    px(g, 1, 1, 14, 14, '#80a058');
    px(g, 3, 3, 10, 10, '#587038');
    px(g, 5, 7, 6, 2, '#80a058');
  },
  pc(g) {
    px(g, 0, 0, 16, 16, '#685848');
    px(g, 2, 1, 12, 13, '#9098a8');
    px(g, 3, 2, 10, 7, '#283848');
    px(g, 4, 3, 8, 5, '#3878b8');
    px(g, 4, 3, 8, 1, '#68b8e8');
    px(g, 5, 10, 6, 2, '#c8d0d8');
    px(g, 2, 14, 12, 2, '#787888');
  },
  healer(g) {
    px(g, 0, 0, 16, 16, '#685848');
    px(g, 1, 2, 14, 12, '#e8e8f0');
    px(g, 1, 2, 14, 2, '#f8f8fc');
    px(g, 3, 6, 4, 4, '#d04848'); px(g, 4, 5, 2, 6, '#d04848'); px(g, 2, 7, 6, 2, '#d04848');
    px(g, 9, 6, 2, 2, '#a8b0c0'); px(g, 12, 6, 2, 2, '#a8b0c0');
    px(g, 9, 9, 2, 2, '#a8b0c0'); px(g, 12, 9, 2, 2, '#a8b0c0');
    px(g, 1, 14, 14, 2, '#b8b8c8');
  },
  arenafloor(g) {
    px(g, 0, 0, 16, 16, '#d8c890');
    px(g, 0, 7, 16, 1, '#b8a868'); px(g, 7, 0, 1, 16, '#b8a868');
    px(g, 0, 0, 16, 1, '#e8dcaa');
  },
  statue(g) {
    px(g, 0, 0, 16, 16, '#d8c890');
    px(g, 0, 7, 16, 1, '#b8a868'); px(g, 7, 0, 1, 16, '#b8a868');
    px(g, 3, 12, 10, 3, '#707078');
    px(g, 5, 4, 6, 8, '#909098');
    px(g, 4, 2, 8, 4, '#a0a0a8');
    px(g, 6, 3, 2, 2, '#c0c0c8');
    px(g, 3, 12, 10, 1, '#888890');
  },
};

/* ============================================================
   SPRITE PERSONAGGI
   ============================================================ */
const CHAR_GRID = {
  down0: [
    '................',
    '.....oooooo.....',
    '....oCCCCCCo....',
    '...oCCCCCCCCo...',
    '..oCCCCCCCCCCo..',
    '..oHKKKKKKKKHo..',
    '..oHKEWKKEWKHo..',
    '..oKKKKEKKKKKo..',
    '...oKKKKKKKKo...',
    '....oooooooo....',
    '...oSSSSSSSSo...',
    '..oKSSSSSSSSKo..',
    '..oKSSSSSSSSKo..',
    '...oSSSSSSSSo...',
    '...oPPPooPPPo...',
    '...oFFo..oFFo...',
  ],
  down1: [
    '................',
    '.....oooooo.....',
    '....oCCCCCCo....',
    '...oCCCCCCCCo...',
    '..oCCCCCCCCCCo..',
    '..oHKKKKKKKKHo..',
    '..oHKEWKKEWKHo..',
    '..oKKKKEKKKKKo..',
    '...oKKKKKKKKo...',
    '....oooooooo....',
    '...oSSSSSSSSo...',
    '..oKSSSSSSSSKo..',
    '..oKSSSSSSSSKo..',
    '...oSSSSSSSSo...',
    '...oPPoooPPPo...',
    '....oFo..oFFo...',
  ],
  up0: [
    '................',
    '.....oooooo.....',
    '....oCCCCCCo....',
    '...oCCCCCCCCo...',
    '..oCCCCCCCCCCo..',
    '..oHHHHHHHHHHo..',
    '..oHHHHHHHHHHo..',
    '..oHHHHHHHHHHo..',
    '...oHHHHHHHHo...',
    '....oooooooo....',
    '...oSSSSSSSSo...',
    '..oKSSSSSSSSKo..',
    '..oKSSSSSSSSKo..',
    '...oSSSSSSSSo...',
    '...oPPPooPPPo...',
    '...oFFo..oFFo...',
  ],
  up1: [
    '................',
    '.....oooooo.....',
    '....oCCCCCCo....',
    '...oCCCCCCCCo...',
    '..oCCCCCCCCCCo..',
    '..oHHHHHHHHHHo..',
    '..oHHHHHHHHHHo..',
    '..oHHHHHHHHHHo..',
    '...oHHHHHHHHo...',
    '....oooooooo....',
    '...oSSSSSSSSo...',
    '..oKSSSSSSSSKo..',
    '..oKSSSSSSSSKo..',
    '...oSSSSSSSSo...',
    '...oPPoooPPPo...',
    '....oFo..oFFo...',
  ],
  side0: [
    '................',
    '.....oooooo.....',
    '....oCCCCCCo....',
    '...oCCCCCCCCo...',
    '..oCCCCCCCCCCo..',
    '..oKKKKKHHHHHo..',
    '..oKEWKKHHHHHo..',
    '..oKKEKKHHHHHo..',
    '...oKKKKHHHHo...',
    '....oooooooo....',
    '...oSSSSSSSSo...',
    '...oSSSSSSSSo...',
    '...oKSSSSSSSo...',
    '...oSSSSSSSSo...',
    '....oPPPPPPo....',
    '....oFFooFFo....',
  ],
  side1: [
    '................',
    '.....oooooo.....',
    '....oCCCCCCo....',
    '...oCCCCCCCCo...',
    '..oCCCCCCCCCCo..',
    '..oKKKKKHHHHHo..',
    '..oKEWKKHHHHHo..',
    '..oKKEKKHHHHHo..',
    '...oKKKKHHHHo...',
    '....oooooooo....',
    '...oSSSSSSSSo...',
    '...oSSSSSSSSo...',
    '...oKSSSSSSSo...',
    '...oSSSSSSSSo...',
    '...oPPoPPPPo....',
    '...oFo...oFFo...',
  ],
};

const CHAR_PRESETS = {
  player:  { cap: '#d83028', hair: '#503020', skin: '#f8c898', shirt: '#2860c0', pants: '#283858' },
  rival:   { hair: '#282830', skin: '#f8c898', shirt: '#c03028', pants: '#604028' },
  prof:    { hair: '#a8a8a8', skin: '#f8c898', shirt: '#f0f0f0', pants: '#888888' },
  mamma:   { hair: '#a85820', skin: '#f8c898', shirt: '#e85890', pants: '#f0e0c8' },
  nurse:   { hair: '#f088a8', skin: '#f8d8b8', shirt: '#f8f0f0', pants: '#f8f0f0' },
  clerk:   { hair: '#404040', skin: '#f8c898', shirt: '#3878c8', pants: '#283858' },
  boy:     { hair: '#804818', skin: '#f8c898', shirt: '#48a048', pants: '#3858a8' },
  girl:    { hair: '#a06828', skin: '#f8d8b8', shirt: '#e8a838', pants: '#c04848' },
  oldman:  { hair: '#c8c8c8', skin: '#e8b888', shirt: '#787878', pants: '#505050' },
  hiker:   { hair: '#583818', skin: '#e8b888', shirt: '#a86838', pants: '#604830' },
  grunt:   { cap: '#282838', hair: '#282838', skin: '#e8c8a8', shirt: '#383850', pants: '#282838' },
  falco:   { hair: '#101018', skin: '#e8c8a8', shirt: '#581838', pants: '#282830' },
  rocco:   { hair: '#704018', skin: '#e8b888', shirt: '#a88858', pants: '#806040' },
  marina:  { hair: '#3878d8', skin: '#f8d8b8', shirt: '#58a8e8', pants: '#f0f0f8' },
  elettra: { hair: '#e8d048', skin: '#f8d8b8', shirt: '#f8e858', pants: '#404040' },
  ignis:   { hair: '#c83818', skin: '#e8b888', shirt: '#e86838', pants: '#583028' },
  maestro: { hair: '#d8d8e8', skin: '#e8c8a8', shirt: '#684898', pants: '#382858' },
};

const Chars = {
  cache: {},
  build(preset) {
    const p = CHAR_PRESETS[preset];
    const colors = {
      o: '#2a2a32', C: p.cap || p.hair, H: p.hair, K: p.skin,
      E: '#202028', S: p.shirt, P: p.pants, F: '#181820', W: '#f8f8fc',
    };
    const draw = grid => {
      const [c, g] = mkCanvas(16, 16);
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
        const ch = grid[y][x];
        if (ch !== '.') { g.fillStyle = colors[ch] || '#f0f'; g.fillRect(x, y, 1, 1); }
      }
      return c;
    };
    const dn0 = draw(CHAR_GRID.down0), dn1 = draw(CHAR_GRID.down1);
    const up0 = draw(CHAR_GRID.up0), up1 = draw(CHAR_GRID.up1);
    const sd0 = draw(CHAR_GRID.side0), sd1 = draw(CHAR_GRID.side1);
    return {
      down: [dn0, dn1, dn0, flipCanvas(dn1)],
      up: [up0, up1, up0, flipCanvas(up1)],
      left: [sd0, sd1, sd0, sd1],
      right: [flipCanvas(sd0), flipCanvas(sd1), flipCanvas(sd0), flipCanvas(sd1)],
    };
  },
  get(preset) {
    if (!this.cache[preset]) this.cache[preset] = this.build(preset);
    return this.cache[preset];
  },
  draw(g, preset, dir, step, x, y) {
    const fr = this.get(preset)[dir];
    g.drawImage(fr[step % 4], Math.round(x), Math.round(y));
  },
};

/* sfera oggetto a terra / sfera di cattura */
function drawBallSprite(g, x, y, s) {
  s = s || 8;
  const h = s / 2;
  g.fillStyle = '#202028'; g.fillRect(x, y + h - 1, s, 2);
  g.fillStyle = '#e04838'; g.fillRect(x + 1, y, s - 2, h); g.fillRect(x, y + 1, s, h - 1);
  g.fillStyle = '#f8f8f8'; g.fillRect(x + 1, y + h + 1, s - 2, h - 1); g.fillRect(x, y + h + 1, s, h - 2);
  g.fillStyle = '#f8f8f8'; g.fillRect(x + h - 1, y + h - 1, 2, 2);
  g.fillStyle = '#ffb0a0'; g.fillRect(x + 1, y + 1, 2, 1);
}

/* ============================================================
   GENERATORE SPRITE VELMON — strutturato per archetipo
   ============================================================ */
const TYPE_PAL = {
  Normale: ['#5a4a32', '#a89058', '#d8c8a0', '#f0e0c0'],
  Fuoco:   ['#7a2008', '#e05020', '#f89048', '#f8d058'],
  Acqua:   ['#1c3c78', '#3078d0', '#70b0f0', '#b0e0f8'],
  Erba:    ['#1c5c28', '#40a048', '#80cc60', '#c8e890'],
  Elettro: ['#806008', '#e8c020', '#f8e860', '#fff8b0'],
  Roccia:  ['#4c3c28', '#90784c', '#c0a878', '#e0d0a8'],
  Volante: ['#404878', '#8088c0', '#b8c0e8', '#e8e8f8'],
  Spettro: ['#2c1c48', '#604088', '#9870c8', '#d0b0f0'],
};

/* helper pittorici interni */
function _el(g,cx,cy,rx,ry,col){g.fillStyle=col;g.beginPath();g.ellipse(cx,cy,rx,ry,0,0,Math.PI*2);g.fill();}
function _els(g,cx,cy,rx,ry,col,lw){g.strokeStyle=col;g.lineWidth=lw||1.5;g.beginPath();g.ellipse(cx,cy,rx,ry,0,0,Math.PI*2);g.stroke();}
function _poly(g,pts,col){g.fillStyle=col;g.beginPath();g.moveTo(pts[0],pts[1]);for(let i=2;i<pts.length;i+=2)g.lineTo(pts[i],pts[i+1]);g.closePath();g.fill();}
function _polys(g,pts,col,lw){g.strokeStyle=col;g.lineWidth=lw||1.5;g.beginPath();g.moveTo(pts[0],pts[1]);for(let i=2;i<pts.length;i+=2)g.lineTo(pts[i],pts[i+1]);g.closePath();g.stroke();}
function _velEyes(g,lx,rx,ey,sz){
  sz=sz||2.5;
  _el(g,lx,ey,sz,sz,'#f8f8f8'); _el(g,rx,ey,sz,sz,'#f8f8f8');
  _el(g,lx+0.4,ey+0.4,sz*0.6,sz*0.6,'#101018'); _el(g,rx+0.4,ey+0.4,sz*0.6,sz*0.6,'#101018');
  _el(g,lx-0.5,ey-0.5,sz*0.3,sz*0.3,'#ffffff'); _el(g,rx-0.5,ey-0.5,sz*0.3,sz*0.3,'#ffffff');
}

function _archBlob(g,pal,r){
  const v=Math.floor(r()*3);
  const O='#181820';
  // Leaf ears
  const earCol=['#3a8c38','#28703a','#488040'][v];
  const earLt=['#70c860','#58b048','#80c870'][v];
  _poly(g,[14,22,10,6,20,18],earCol); _polys(g,[14,22,10,6,20,18],O,1.5);
  _poly(g,[50,22,54,6,44,18],earCol); _polys(g,[50,22,54,6,44,18],O,1.5);
  _poly(g,[15,22,11,9,19,19],earLt); _poly(g,[49,22,53,9,45,19],earLt);
  // Shadow body
  _el(g,32,40,22,20,pal[0]);
  // Main body
  _el(g,31,38,22,20,pal[1]);
  // Belly highlight
  _el(g,24,32,13,11,pal[2]);
  _el(g,21,29,7,6,pal[3]);
  // Small stubby arms
  _el(g,10,40,7,5,pal[0]); _els(g,10,40,7,5,O,1.5);
  _el(g,9,39,7,5,pal[1]);
  _el(g,54,40,7,5,pal[0]); _els(g,54,40,7,5,O,1.5);
  _el(g,55,39,7,5,pal[1]);
  // Small round feet
  _el(g,24,58,7,5,pal[0]); _el(g,24,57,7,4,pal[1]);
  _el(g,40,58,7,5,pal[0]); _el(g,40,57,7,4,pal[1]);
  // Blush
  g.globalAlpha=0.4; _el(g,20,42,6,4,'#f07070'); _el(g,44,42,6,4,'#f07070'); g.globalAlpha=1;
  // Eyes — large expressive
  _velEyes(g,23,41,33,6);
  // Outline body
  _els(g,31,38,22,20,O,2);
  // Mouth
  g.strokeStyle=O; g.lineWidth=1.5;
  if(v===0){
    g.beginPath(); g.arc(32,47,6,0.1,Math.PI-0.1); g.stroke();
    g.fillStyle='#f8f8f8'; g.fillRect(29,47,3,3); g.fillRect(35,47,3,3);
  }else if(v===1){
    g.beginPath(); g.arc(32,47,5,0.15,Math.PI-0.15); g.stroke();
  }else{
    g.beginPath(); g.moveTo(27,46); g.lineTo(37,46); g.stroke();
  }
  // Feature on top
  const fv=v;
  if(fv===0){ _el(g,32,12,7,6,'#e85870'); _els(g,32,12,7,6,O,1.5); _el(g,32,12,4,3,'#f8e040'); }
  else if(fv===1){ _el(g,32,11,6,5,'#e87030'); _els(g,32,11,6,5,O,1.5); }
  else{ _el(g,32,10,8,6,earCol); _els(g,32,10,8,6,O,1.5); _el(g,32,10,4,3,earLt); }
}

function _archBeast(g,pal,r){
  const v=Math.floor(r()*3);
  const O='#181820';
  // TAIL (drawn first, behind body)
  const tails=[[8,38,4,26,8,12],[8,38,2,28,6,14],[8,40,6,28,10,16]];
  const [tx0,ty0,tcx,tcy,tx1,ty1]=tails[v];
  g.strokeStyle=pal[0]; g.lineWidth=9; g.lineCap='round';
  g.beginPath(); g.moveTo(tx0,ty0); g.quadraticCurveTo(tcx,tcy,tx1,ty1); g.stroke();
  g.strokeStyle=pal[1]; g.lineWidth=6;
  g.beginPath(); g.moveTo(tx0,ty0); g.quadraticCurveTo(tcx,tcy,tx1,ty1); g.stroke();
  g.strokeStyle=O; g.lineWidth=1.5;
  g.beginPath(); g.moveTo(tx0,ty0); g.quadraticCurveTo(tcx,tcy,tx1,ty1); g.stroke();
  _el(g,tx1,ty1,5,5,pal[3]); _els(g,tx1,ty1,5,5,O,1.5);
  // BACK LEGS
  px(g,10,44,9,16,pal[0]); px(g,10,43,9,15,pal[1]);
  px(g,44,44,9,16,pal[0]); px(g,44,43,9,15,pal[1]);
  _el(g,14,60,8,4,pal[0]); _el(g,14,59,8,4,pal[1]);
  _el(g,48,60,8,4,pal[0]); _el(g,48,59,8,4,pal[1]);
  // BODY
  _el(g,32,40,22,17,pal[0]); _el(g,31,38,22,17,pal[1]);
  _el(g,24,30,13,10,pal[2]); _el(g,21,27,6,5,pal[3]);
  // fur stripes
  g.strokeStyle=pal[0]; g.lineWidth=1.5;
  for(let s=0;s<3;s++){ g.beginPath(); g.moveTo(20+s*5,28); g.lineTo(18+s*5,42); g.stroke(); }
  // FRONT LEGS
  px(g,22,46,8,14,pal[0]); px(g,22,45,8,13,pal[1]);
  px(g,36,46,8,14,pal[0]); px(g,36,45,8,13,pal[1]);
  _el(g,26,60,7,4,pal[0]); _el(g,26,59,7,3,pal[1]);
  _el(g,40,60,7,4,pal[0]); _el(g,40,59,7,3,pal[1]);
  // NECK
  px(g,39,26,8,12,pal[1]); px(g,40,26,6,11,pal[2]);
  // EARS (behind head)
  _poly(g,[36,14,40,4,46,12],pal[1]); _polys(g,[36,14,40,4,46,12],O,1.5); _poly(g,[38,13,41,7,44,12],pal[2]);
  _poly(g,[52,14,56,4,60,12],pal[1]); _polys(g,[52,14,56,4,60,12],O,1.5); _poly(g,[53,13,56,7,58,12],pal[2]);
  // HEAD
  _el(g,48,22,16,14,pal[0]); _el(g,47,20,16,14,pal[1]);
  _el(g,40,15,9,8,pal[2]); _el(g,37,13,5,4,pal[3]);
  // Eye
  _el(g,41,19,5,5,'#f8f8f0'); _el(g,42,20,3.5,3.5,O); _el(g,40,17,1.5,1.5,'#fff');
  // Nose
  _el(g,55,22,3,2,'#302028'); _el(g,54,21,3,2,'#504048');
  // Mouth
  g.strokeStyle=O; g.lineWidth=1.5;
  g.beginPath(); g.moveTo(52,24); g.lineTo(58,22); g.stroke();
  // Outline head & body
  _els(g,47,20,16,14,O,2); _els(g,31,38,22,17,O,2);
}

function _archBird(g,pal,r){
  const v=Math.floor(r()*3);
  const bk=v===0?'#e8c020':v===1?'#f89048':'#f0b830';
  // wings
  _el(g,13,34,16,10,pal[0]); _el(g,12,32,15,10,pal[1]);
  _el(g,51,34,16,10,pal[0]); _el(g,52,32,15,10,pal[1]);
  _poly(g,[2,36,8,26,14,38],pal[2]); _polys(g,[2,36,8,26,14,38],'#181820',1);
  _poly(g,[62,36,56,26,50,38],pal[2]); _polys(g,[62,36,56,26,50,38],'#181820',1);
  // body
  _el(g,32,39,18,16,pal[0]); _el(g,31,37,18,16,pal[1]); _el(g,25,31,10,9,pal[2]);
  // tail feathers
  _poly(g,[22,50,15,62,26,54],pal[2]); _polys(g,[22,50,15,62,26,54],'#181820',1);
  _poly(g,[42,50,49,62,38,54],pal[2]); _polys(g,[42,50,49,62,38,54],'#181820',1);
  // head
  _el(g,32,18,14,13,pal[0]); _el(g,31,17,14,13,pal[1]); _el(g,25,13,8,7,pal[2]);
  if(v===0){ _poly(g,[27,8,32,2,37,8],pal[3]); _polys(g,[27,8,32,2,37,8],'#181820',1); }
  else if(v===1){ _poly(g,[25,9,29,3,32,9],pal[2]); _poly(g,[30,8,34,2,37,8],pal[1]); }
  else{ _el(g,32,8,5,4,pal[2]); }
  // beak
  _poly(g,[27,20,37,20,32,28],bk); _polys(g,[27,20,37,20,32,28],'#181820',1.5);
  _el(g,31,22,2,1.5,'#181820');
  _velEyes(g,24,40,15,3.5);
  // feet
  g.strokeStyle=bk; g.lineWidth=2.5; g.lineCap='round';
  g.beginPath(); g.moveTo(25,52); g.lineTo(25,60); g.moveTo(25,60); g.lineTo(18,63); g.moveTo(25,60); g.lineTo(28,64); g.stroke();
  g.beginPath(); g.moveTo(39,52); g.lineTo(39,60); g.moveTo(39,60); g.lineTo(33,63); g.moveTo(39,60); g.lineTo(43,64); g.stroke();
  g.strokeStyle='#181820'; g.lineWidth=1.5;
  g.beginPath(); g.moveTo(25,52); g.lineTo(25,60); g.moveTo(25,60); g.lineTo(18,63); g.moveTo(25,60); g.lineTo(28,64); g.stroke();
  g.beginPath(); g.moveTo(39,52); g.lineTo(39,60); g.moveTo(39,60); g.lineTo(33,63); g.moveTo(39,60); g.lineTo(43,64); g.stroke();
  g.strokeStyle='#181820'; g.lineWidth=2;
  g.beginPath(); g.ellipse(31,37,18,16,0,0,Math.PI*2); g.stroke();
  g.beginPath(); g.ellipse(31,17,14,13,0,0,Math.PI*2); g.stroke();
  _els(g,12,32,15,10,'#181820',1.5); _els(g,52,32,15,10,'#181820',1.5);
}

function _archSerpent(g,pal,r){
  const v=Math.floor(r()*3);
  const paths=[
    [[32,58],[8,52,8,28,20,20],[32,12,48,16,44,28],[40,36,32,32,36,24]],
    [[32,58],[52,50,56,30,44,20],[32,10,16,16,20,28],[24,38,36,36,32,24]],
    [[16,58],[8,40,12,24,24,16],[36,8,52,16,48,32],[44,44,28,44,32,32]],
  ];
  const path=paths[v];
  const drawPath=(xo,yo,sw,sc)=>{
    g.strokeStyle=sc; g.lineWidth=sw; g.lineCap='round';
    g.beginPath(); g.moveTo(path[0][0]+xo,path[0][1]+yo);
    for(let i=1;i<path.length;i++) g.bezierCurveTo(path[i][0]+xo,path[i][1]+yo,path[i][2]+xo,path[i][3]+yo,path[i][4]+xo,path[i][5]+yo);
    g.stroke();
  };
  drawPath(2,2,16,pal[0]); drawPath(0,0,16,pal[1]); drawPath(0,0,6,pal[2]); drawPath(0,0,3,'#181820');
  const hpos=[[36,20],[32,20],[32,28]];
  const hx=hpos[v][0], hy=hpos[v][1];
  _el(g,hx,hy,14,11,pal[0]); _el(g,hx-1,hy-1,14,11,pal[1]); _el(g,hx-4,hy-4,8,6,pal[2]);
  _velEyes(g,hx-6,hx+6,hy-2,4.5);
  g.strokeStyle='#d03030'; g.lineWidth=2; g.lineCap='round';
  g.beginPath(); g.moveTo(hx,hy+9); g.lineTo(hx,hy+16); g.moveTo(hx,hy+16); g.lineTo(hx-5,hy+21); g.moveTo(hx,hy+16); g.lineTo(hx+5,hy+21); g.stroke();
  _els(g,hx-1,hy-1,14,11,'#181820',2);
}

function _archRock(g,pal,r){
  const v=Math.floor(r()*3);
  const cc=r()<0.5?pal[3]:pal[2];
  _poly(g,[16,58,8,36,16,16,36,8,52,20,56,44,48,58],pal[0]);
  _poly(g,[14,56,6,34,14,14,34,6,50,18,54,42,46,56],pal[1]);
  _poly(g,[16,24,16,14,30,8,36,8,28,16,20,24],pal[2]);
  _poly(g,[18,22,18,14,28,9,32,9,26,16],pal[3]);
  g.strokeStyle=pal[0]; g.lineWidth=1.5;
  g.beginPath(); g.moveTo(26,28); g.lineTo(20,42); g.moveTo(38,24); g.lineTo(44,40); g.moveTo(24,42); g.lineTo(36,50); g.stroke();
  const crystals=[[40,10,44,4,48,12,46,14],[36,6,40,0,44,8,42,10],[44,8,48,2,52,10,50,12]];
  _poly(g,crystals[v],cc); _polys(g,crystals[v],'#181820',1.5);
  _velEyes(g,24,40,30,4);
  g.strokeStyle='#181820'; g.lineWidth=2.5;
  g.beginPath(); g.moveTo(18,24); g.lineTo(28,28); g.stroke();
  g.beginPath(); g.moveTo(46,24); g.lineTo(36,28); g.stroke();
  _polys(g,[14,56,6,34,14,14,34,6,50,18,54,42,46,56],'#181820',2);
}

function _archGhost(g,pal,r){
  const v=Math.floor(r()*3);
  // skirt first (body drawn on top)
  const waves=[
    [14,68,18,60,22,52,24,60,28,68,32,60,36,52,38,60,42,68,46,60,50,52,56,60],
    [14,70,20,58,24,50,26,60,30,70,34,60,38,50,42,60,46,70,50,58,54,60,56,60],
    [12,66,18,56,22,48,26,58,30,66,34,58,38,48,42,58,46,66,50,60,54,64,56,60],
  ];
  g.fillStyle=pal[1]; g.beginPath(); g.moveTo(8,44); g.lineTo(8,52);
  const wv=waves[v]; for(let i=0;i<wv.length;i+=4) g.quadraticCurveTo(wv[i],wv[i+1],wv[i+2],wv[i+3]);
  g.lineTo(56,44); g.closePath(); g.fill();
  // body (covers skirt top)
  _el(g,33,29,25,23,pal[0]); _el(g,32,28,25,23,pal[1]);
  _el(g,25,21,14,12,pal[2]); _el(g,22,19,7,6,pal[3]);
  // wispy arms (v=0)
  if(v===0){
    g.strokeStyle=pal[1]; g.lineWidth=5; g.lineCap='round';
    g.beginPath(); g.moveTo(9,32); g.quadraticCurveTo(4,24,8,18); g.stroke();
    g.beginPath(); g.moveTo(55,32); g.quadraticCurveTo(60,24,56,18); g.stroke();
    g.strokeStyle='#181820'; g.lineWidth=1.5;
    g.beginPath(); g.moveTo(9,32); g.quadraticCurveTo(4,24,8,18); g.stroke();
    g.beginPath(); g.moveTo(55,32); g.quadraticCurveTo(60,24,56,18); g.stroke();
  }
  // spectral eyes
  _el(g,22,28,8,9,pal[0]); _el(g,42,28,8,9,pal[0]);
  _el(g,22,28,6,7,'#181820'); _el(g,42,28,6,7,'#181820');
  _el(g,20,26,2.5,3,'#cc88ff'); _el(g,40,26,2.5,3,'#cc88ff');
  _els(g,32,28,25,23,'#181820',2);
}

function _archPlant(g,pal,r){
  const v=Math.floor(r()*3);
  const ld=v===0?'#3a8c38':v===1?'#28703a':'#488040';
  const ll=v===0?'#70c860':v===1?'#58b048':'#80c870';
  _poly(g,[16,32,8,8,24,24],ld); _polys(g,[16,32,8,8,24,24],'#181820',1.5);
  _poly(g,[48,32,56,8,40,24],ld); _polys(g,[48,32,56,8,40,24],'#181820',1.5);
  _poly(g,[26,28,32,4,38,28],ll); _polys(g,[26,28,32,4,38,28],'#181820',1.5);
  g.strokeStyle=ld; g.lineWidth=1;
  g.beginPath(); g.moveTo(32,28); g.lineTo(32,6); g.stroke();
  g.beginPath(); g.moveTo(14,26); g.lineTo(10,10); g.stroke();
  g.beginPath(); g.moveTo(50,26); g.lineTo(54,10); g.stroke();
  _el(g,32,44,20,18,pal[0]); _el(g,31,42,20,18,pal[1]); _el(g,24,35,12,11,pal[2]); _el(g,21,33,6,5,pal[3]);
  g.strokeStyle=ld; g.lineWidth=2.5; g.lineCap='round';
  g.beginPath(); g.moveTo(20,58); g.quadraticCurveTo(16,61,14,64); g.stroke();
  g.beginPath(); g.moveTo(27,61); g.quadraticCurveTo(25,62,24,64); g.stroke();
  g.beginPath(); g.moveTo(37,61); g.quadraticCurveTo(39,62,40,64); g.stroke();
  g.beginPath(); g.moveTo(44,58); g.quadraticCurveTo(48,61,50,64); g.stroke();
  _velEyes(g,24,40,40,5);
  g.strokeStyle='#181820'; g.lineWidth=2;
  g.beginPath(); g.arc(32,48,7,0.1,Math.PI-0.1); g.stroke();
  g.beginPath(); g.ellipse(31,42,20,18,0,0,Math.PI*2); g.stroke();
  if(v===0){ _el(g,32,10,7,6,'#e85870'); _els(g,32,10,7,6,'#181820',1.5); _el(g,32,10,4,3,'#f8e040'); }
  else if(v===1){ _el(g,32,10,6,5,'#e87030'); _els(g,32,10,6,5,'#181820',1.5); _el(g,32,10,3,2.5,'#f8c020'); }
  else{ _el(g,32,8,8,6,pal[2]); _els(g,32,8,8,6,'#181820',1.5); _el(g,32,8,4,3,pal[3]); }
}

function _archDragon(g,pal,r){
  const v=Math.floor(r()*3);
  _poly(g,[14,28,4,8,20,16,28,36],pal[2]); _polys(g,[14,28,4,8,20,16,28,36],'#181820',1.5);
  _poly(g,[50,28,60,8,44,16,36,36],pal[2]); _polys(g,[50,28,60,8,44,16,36,36],'#181820',1.5);
  g.strokeStyle=pal[1]; g.lineWidth=1;
  g.beginPath(); g.moveTo(20,28); g.lineTo(6,10); g.moveTo(23,32); g.lineTo(12,14); g.stroke();
  g.beginPath(); g.moveTo(44,28); g.lineTo(58,10); g.moveTo(41,32); g.lineTo(52,14); g.stroke();
  const tc=[[20,50,8,54,4,62,8,64],[20,50,6,56,2,62,6,64],[20,50,8,58,4,64,8,64]][v];
  g.strokeStyle=pal[1]; g.lineWidth=10; g.lineCap='round';
  g.beginPath(); g.moveTo(tc[0],tc[1]); g.bezierCurveTo(tc[2],tc[3],tc[4],tc[5],tc[6],tc[7]); g.stroke();
  g.strokeStyle='#181820'; g.lineWidth=2;
  g.beginPath(); g.moveTo(tc[0],tc[1]); g.bezierCurveTo(tc[2],tc[3],tc[4],tc[5],tc[6],tc[7]); g.stroke();
  _poly(g,[tc[6]-4,tc[7]-2,tc[6]+4,tc[7]-6,tc[6]+2,tc[7]+4],pal[0]);
  _el(g,32,42,21,18,pal[0]); _el(g,31,40,21,18,pal[1]); _el(g,24,33,13,11,pal[2]); _el(g,21,30,6,5,pal[3]);
  g.strokeStyle=pal[0]; g.lineWidth=1;
  g.beginPath(); g.arc(32,44,13,0.2,Math.PI-0.2); g.stroke();
  g.beginPath(); g.arc(32,49,9,0.2,Math.PI-0.2); g.stroke();
  px(g,27,22,10,16,pal[1]); px(g,29,22,6,16,pal[2]);
  _el(g,32,16,16,14,pal[0]); _el(g,31,15,16,14,pal[1]); _el(g,25,11,9,7,pal[2]);
  _poly(g,[22,10,18,2,26,8],pal[0]); _polys(g,[22,10,18,2,26,8],'#181820',1.5);
  _poly(g,[42,10,46,2,38,8],pal[0]); _polys(g,[42,10,46,2,38,8],'#181820',1.5);
  _velEyes(g,24,40,14,3.5);
  _el(g,28,20,2.5,2,pal[0]); _el(g,36,20,2.5,2,pal[0]);
  g.strokeStyle='#181820'; g.lineWidth=2;
  g.beginPath(); g.ellipse(31,15,16,14,0,0,Math.PI*2); g.stroke();
  g.beginPath(); g.ellipse(31,40,21,18,0,0,Math.PI*2); g.stroke();
}

const MON_DRAW = {
  blob:_archBlob, beast:_archBeast, bird:_archBird, serpent:_archSerpent,
  rock:_archRock, ghost:_archGhost, plant:_archPlant, dragon:_archDragon,
};

const MonArt = {
  cache: {},
  gen(spId) {
    if (this.cache[spId]) return this.cache[spId];
    const sp = DATA.SPECIES[spId];
    const r = mulberry32(sp.seed * 9973 + 17);
    const pal = TYPE_PAL[sp.type] || TYPE_PAL.Normale;
    const [c, g] = mkCanvas(64, 64);
    g.imageSmoothingEnabled = false;
    (MON_DRAW[sp.arch] || MON_DRAW.blob)(g, pal, r);
    this.cache[spId] = c;
    return c;
  },
  drawFront(g, spId, x, y, bob) {
    const c = this.gen(spId);
    const dy = bob ? Math.floor(Game.frame / 24) % 2 : 0;
    g.imageSmoothingEnabled = false;
    g.drawImage(c, x, y + dy, 64, 64);
  },
  drawBack(g, spId, x, y) {
    const c = this.gen(spId);
    g.save();
    g.imageSmoothingEnabled = false;
    g.translate(x + 72, y); g.scale(-1, 1);
    g.drawImage(c, 0, 14, 64, 48, 0, 0, 72, 54);
    g.restore();
  },
  drawIcon(g, spId, x, y, size) {
    g.imageSmoothingEnabled = false;
    g.drawImage(this.gen(spId), x, y, size || 16, size || 16);
  },
};
