'use strict';
/* ============================================================
   main.js — titolo, intro, evoluzioni, sala d'onore, avvio
   ============================================================ */

function newGame(name) {
  Game.sv = {
    name, money: 3000, party: [], box: [], bag: { pozione: 1 },
    badges: [false, false, false, false], flags: {},
    dex: { seen: {}, caught: {} },
    opts: { textSpeed: 1, audio: Music.enabled },
    respawn: { map: 'casa', x: 4, y: 4, dir: 'down' },
    playSec: 0, starterChoice: null, pos: null,
  };
  Game.set('overworld', 'casa', 4, 4, 'down');
}

/* ============================================================
   SCHERMATA DEL TITOLO
   ============================================================ */
Game.states.title = {
  enter() {
    this.t = 0;
    this.phase = 'splash';
    this.save = loadSave();
    this.menuI = 0;
    UI.clear();
  },
  update() {
    this.t++;
    if (this.phase === 'splash') {
      if (Input.pressed('a') || Input.pressed('start')) {
        Music.play('title');
        Sfx.play('confirm');
        this.phase = 'menu';
        this.menuI = 0;
      }
      return;
    }
    const opts = this.save ? ['CONTINUA', 'NUOVA PARTITA'] : ['NUOVA PARTITA'];
    if (Input.pressed('up') || Input.pressed('down')) {
      this.menuI = (this.menuI + 1) % opts.length;
      Sfx.play('cursor');
    }
    if (Input.pressed('b')) { this.phase = 'splash'; Sfx.play('cancel'); return; }
    if (Input.pressed('a') || Input.pressed('start')) {
      Sfx.play('confirm');
      const choice = opts[this.menuI];
      if (choice === 'CONTINUA') {
        Game.fadeOut(() => {
          Game.sv = this.save;
          Music.setEnabled(Game.sv.opts.audio);
          const p = Game.sv.pos || { map: 'casa', x: 4, y: 4, dir: 'down' };
          Game.set('overworld', p.map, p.x, p.y, p.dir);
          Game.fadeIn();
        });
      } else {
        Game.fadeOut(() => { Game.set('intro'); Game.fadeIn(); });
      }
    }
  },
  draw() {
    // cielo
    const bands = ['#182848', '#28447c', '#3868a8', '#5088c8', '#70a8e0'];
    bands.forEach((c, i) => { cx.fillStyle = c; cx.fillRect(0, i * 22, VW, 22); });
    cx.fillStyle = '#88c0e8'; cx.fillRect(0, 110, VW, 50);
    // colline
    cx.fillStyle = '#2c6840';
    cx.beginPath(); cx.ellipse(40, 130, 90, 30, 0, 0, 7); cx.fill();
    cx.beginPath(); cx.ellipse(200, 135, 100, 34, 0, 0, 7); cx.fill();
    // drago leggendario
    const bob = Math.sin(this.t / 30) * 4;
    cx.drawImage(MonArt.gen('folgodrago'), 0, 0, 32, 32, 86, 46 + bob, 68, 68);
    // logo
    txtC('LEGGENDE DI', VW / 2 + 1, 17, { size: 12, c: '#203050' });
    txtC('LEGGENDE DI', VW / 2, 16, { size: 12, c: '#f8e858' });
    txtC('V A L M O R A', VW / 2 + 1, 31, { size: 16, c: '#203050' });
    txtC('V A L M O R A', VW / 2, 30, { size: 16, c: '#f8f8f8' });
    if (this.phase === 'splash') {
      if (Math.floor(this.t / 30) % 2 === 0) txtC('PREMI Z O INVIO', VW / 2, 124, { c: '#f8f8f8', shadow: '#203050' });
      txtC('Un\'avventura in stile retrò', VW / 2, 142, { size: 7, c: '#b8d0e8' });
    } else {
      const opts = this.save ? ['CONTINUA', 'NUOVA PARTITA'] : ['NUOVA PARTITA'];
      const h = opts.length * 14 + 10;
      drawBox(64, 116, 112, h);
      opts.forEach((o, k) => txt(o, 84, 122 + k * 14, { c: '#383838' }));
      drawCursor(72, 123 + this.menuI * 14);
    }
  },
};

/* ============================================================
   INTRO — la professoressa
   ============================================================ */
Game.states.intro = {
  enter() {
    this.t = 0;
    say([
      'Salve! Benvenuto nel mondo dei VELMON!',
      'Io sono la Prof.ssa QUERCIA. Tutti qui mi chiamano "la nonna dei Velmon".',
      'Questo mondo è abitato da creature straordinarie: i VELMON, gli spiriti viventi di Valmora.',
      'C\'è chi lotta al loro fianco, chi li studia, chi li cresce come amici.',
      'Io faccio tutte e tre le cose, con il doppio dell\'entusiasmo!',
      'Ma prima di cominciare... dimmi: come ti chiami?',
    ], () => {
      const names = ['LUCA', 'MARCO', 'GAIA', 'NOA'];
      ask(names, i => {
        const name = names[Math.max(0, i)];
        say([
          name + '! Che bel nome, profuma di avventura.',
          'Il tuo vicino DARIO parte oggi anche lui. Quel ragazzo è... vivace, ecco.',
          name + ', la tua storia sta per cominciare!',
          'Ti aspetto al laboratorio. Il mondo dei VELMON ti aspetta!',
        ], () => {
          Game.fadeOut(() => { newGame(name); Game.fadeIn(); });
        });
      }, { canCancel: false, x: 24, y: 28 });
    });
  },
  update() { this.t++; },
  draw() {
    cx.fillStyle = '#203048'; cx.fillRect(0, 0, VW, VH);
    cx.fillStyle = '#28405c'; cx.fillRect(0, 96, VW, 64);
    // professoressa ingrandita
    const fr = Chars.get('prof').down[0];
    cx.drawImage(fr, 0, 0, 16, 16, VW / 2 - 28, 24, 56, 56);
    // un velmon di esempio che saltella
    const bob = Math.floor(this.t / 24) % 2;
    cx.drawImage(MonArt.gen('sorcetto'), 0, 0, 32, 32, VW / 2 + 34, 56 + bob * 2, 32, 32);
    txtC('~ Prof.ssa Quercia ~', VW / 2, 86, { size: 7, c: '#a8c0d8' });
  },
};

/* ============================================================
   EVOLUZIONE
   ============================================================ */
Game.states.evolve = {
  enter(list, done) {
    this.list = list;
    this.doneCb = done;
    this.i = 0;
    this.phase = 'idle';
    this.t = 0;
    Music.play('victory');
    this.startOne();
  },
  startOne() {
    if (this.i >= this.list.length) {
      const d = this.doneCb; this.doneCb = null;
      if (d) d();
      return;
    }
    this.cur = this.list[this.i];
    say(['Cosa...?', monName(this.cur.mon) + ' sta per evolversi!'], () => {
      this.phase = 'anim'; this.t = 0;
    });
  },
  update() {
    if (this.phase !== 'anim') return;
    this.t++;
    if (Input.pressed('b')) {
      this.phase = 'idle';
      Sfx.play('cancel');
      say(['Eh?', monName(this.cur.mon) + ' ha smesso di evolversi!'], () => {
        this.i++; this.startOne();
      });
      return;
    }
    if (this.t > 200) {
      this.phase = 'idle';
      const oldName = monName(this.cur.mon);
      this.cur.mon.sp = this.cur.to;
      Game.sv.dex.seen[this.cur.to] = 1;
      Game.sv.dex.caught[this.cur.to] = 1;
      Sfx.play('badge');
      say(['Congratulazioni!', oldName + ' si è evoluto in ' + monName(this.cur.mon) + '!'], () => {
        this.i++; this.startOne();
      });
    }
  },
  draw() {
    cx.fillStyle = '#101828'; cx.fillRect(0, 0, VW, VH);
    if (!this.cur) return;
    let spId;
    if (this.phase === 'anim') {
      const speed = Math.max(5, 30 - Math.floor(this.t / 8));
      const flip = Math.floor(this.t / speed) % 2 === 1;
      spId = flip ? this.cur.to : this.cur.mon.sp;
      if (this.t > 160) { cx.fillStyle = 'rgba(255,255,255,' + (0.3 + 0.3 * Math.sin(this.t / 4)) + ')'; cx.fillRect(0, 0, VW, VH); }
    } else {
      spId = this.cur.mon.sp;
    }
    cx.drawImage(MonArt.gen(spId), 0, 0, 32, 32, VW / 2 - 40, 24, 80, 80);
    if (this.phase === 'anim') txtC('(B per annullare)', VW / 2, 112, { size: 7, c: '#8898b8' });
  },
};

/* ============================================================
   SALA D'ONORE + TITOLI DI CODA
   ============================================================ */
const CREDIT_LINES = [
  'LEGGENDE DI VALMORA', '', 'Una leggenda scritta da te', '',
  '~ SVILUPPO ~', 'Claude & Luca', '',
  '~ MONDO E STORIA ~', 'La regione di Valmora', 'I quattro Custodi', 'La Banda Grifagna', '',
  '~ MUSICA ~', 'Chiptune Orchestra di Borgo Quercia', '',
  '~ RINGRAZIAMENTI ~', 'La Prof.ssa Quercia', 'Tutti i Velmon catturati', 'E quelli lasciati liberi', '',
  'I Velmon sono creature originali.', 'Nessun Velmon è stato maltrattato', 'durante lo sviluppo.', '',
  '~ FINE ~', '', 'Ma Folgodrago ti aspetta ancora...',
];
Game.states.hof = {
  enter() {
    Game.sv.flags.champion = true;
    healParty();
    Game.sv.respawn = { map: 'casa', x: 4, y: 4, dir: 'down' };
    // salvataggio automatico della vittoria
    Game.sv.pos = { map: 'borgo', x: 11, y: 7, dir: 'down' };
    try { localStorage.setItem('valmora_save', JSON.stringify(Game.sv)); } catch (e) { /* niente */ }
    Music.play('credits');
    this.t = 0;
    this.phase = 'fame';
    this.leaving = false;
    UI.clear();
  },
  update() {
    this.t++;
    if (this.phase === 'fame') {
      if (this.t > 420 || (this.t > 60 && Input.pressed('a'))) { this.phase = 'credits'; this.t = 0; }
      return;
    }
    const total = CREDIT_LINES.length * 16 + VH + 40;
    if (!this.leaving && (this.t > total || (this.t > 180 && Input.pressed('start')))) {
      this.leaving = true;
      Game.fadeOut(() => {
        Game.set('overworld', 'borgo', 11, 7, 'down');
        Game.fadeIn();
        say(['Sei tornato a Borgo Quercia da CAMPIONE!',
          'La Prof.ssa Quercia vorrà di sicuro vederti.',
          'E dicono che FOLGODRAGO dorma ancora nella Via della Vittoria...']);
      });
    }
  },
  draw() {
    cx.fillStyle = '#101828'; cx.fillRect(0, 0, VW, VH);
    if (this.phase === 'fame') {
      txtC('SALA D\'ONORE', VW / 2, 12, { size: 12, c: '#f8e858', shadow: '#604818' });
      txtC(Game.sv.name + ' — Campione di Valmora', VW / 2, 30, { c: '#f8f8f8' });
      Game.sv.party.forEach((mon, k) => {
        const x = 24 + (k % 3) * 70, y = 48 + Math.floor(k / 3) * 50;
        cx.drawImage(MonArt.gen(mon.sp), 0, 0, 32, 32, x, y, 36, 36);
        txtC(monName(mon), x + 18, y + 37, { size: 6, c: '#b8c8e0' });
      });
      if (Math.floor(this.t / 30) % 2 === 0) txtC('Z per continuare', VW / 2, 148, { size: 7, c: '#8898b8' });
    } else {
      CREDIT_LINES.forEach((line, k) => {
        const y = VH + k * 16 - this.t;
        if (y > -16 && y < VH + 8) {
          txtC(line, VW / 2, y, { c: line.startsWith('~') ? '#f8e858' : '#e8e8e8', size: line === 'LEGGENDE DI VALMORA' ? 10 : 8 });
        }
      });
    }
  },
};

/* ============================================================
   AVVIO + agganci per il collaudo
   ============================================================ */
window.__test = {
  newGame(starter) {
    newGame('TEST');
    if (starter) {
      Game.sv.flags.starter = true;
      Game.sv.starterChoice = starter;
      Game.sv.flags.rival1 = true;
      Game.sv.party.push(DATA.makeMon(starter, 20));
      Game.sv.dex.seen[starter] = 1; Game.sv.dex.caught[starter] = 1;
      Overworld.giveItem('vortex', 10);
      Overworld.giveItem('pozione', 5);
    }
  },
  warp(m, x, y) { Overworld.enter(m, x, y, 'down'); },
  battle(sp, lv) { Game.set('battle', { kind: 'wild', sp, lv: lv || 10, env: 'field' }); },
  give(id, n) { Overworld.giveItem(id, n || 1); },
  badge(i) { Game.sv.badges[i] = true; },
  flag(f) { Game.sv.flags[f] = true; },
  state() { return Game.state; },
  sv() { return Game.sv; },
};

(function boot() {
  initCanvas();
  Input.init();
  Game.set('title');
  requestAnimationFrame(mainLoop);
})();
