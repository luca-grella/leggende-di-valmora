// Romance with the women of Valmora (adults only, opt-in from the menu).
// Each one lives in a town, has her own character and her own way to be won
// over (a gift, money, a battle, beating a champion, a collection of Velmon),
// wants the date at her favourite time of day, then invites you home.
// Every romance is a quest: 0 = win her over, 1 = the date, 2 = her house.

import * as THREE from 'three';
import { mulberry32 } from '../core/noise.js';
import { makeScooter } from '../world/scooter.js';
import { TOWNS, heightAt } from '../world/heightfield.js';
import { makeCharacter } from '../world/character.js';
import { findLand } from '../world/props.js';
import { bubble } from '../world/markers.js';
import { createMonster } from '../creatures/monster.js';

const town = (id) => TOWNS.find((t) => t.region.id === id);

const WHEN = {
  day: { text: 'di giorno (8-18)', ok: (h) => h >= 8 && h < 18 },
  sunset: { text: 'al tramonto (17-21)', ok: (h) => h >= 17 && h < 21 },
  night: { text: 'di notte (dopo le 20)', ok: (h) => h >= 20 || h < 5 },
};
const ITEM = { mela: 'una mela', vasofiori: 'un vaso di fiori', palla: 'una palla', libro: 'un libro (lo trovi nelle case)' };

// lines by personality
const MOOD = {
  dolce: {
    meet: ['Ciao! Non ti avevo mai visto da queste parti.', 'Hai un bel sorriso, lo sai?'],
    date: ['Sei venuto! Ero emozionata come una ragazzina.', 'Questo posto è il mio preferito. Volevo condividerlo con te.'],
    afterKiss: ['Oh... è stato bellissimo.'], invite: ['Ti va di accompagnarmi a casa? Non voglio salutarti adesso.'],
    home: ['Scusa il disordine... non aspettavo nessuno. Cioè, aspettavo te.'],
    undress: ['Sono un po\' nervosa...', 'Mi aiuti tu?', 'Non guardarmi così, arrossisco.', 'Vieni... il letto è di là.'],
    feet: {
      massage: ['Oh... che bello. Mi sento sciogliere come burro.', 'Hai le mani così delicate... potrei restare così per ore.'],
      kiss: ['Ma che tenero che sei... nessuno mi aveva mai coccolata così.', 'Mi fai sentire una principessa.'],
      lick: ['Ihih! Mi fai il solletico... ma è dolcissimo.', 'Sei pazzo... ma sei il mio pazzo.'],
    },
    guide: ['Vieni qui... lascia che ti mostri io.', 'Così... sei dolcissimo.'],
    bed: ['Stringimi forte.'], end: ['È stato... perfetto.', 'Resta. Mi piace addormentarmi così.'],
    after: ['Ciao amore! Passa da me quando vuoi, la porta è aperta.'],
  },
  audace: {
    meet: ['Ehi, bel tipo. Mi stavi fissando?', 'Non arrossire. Mi piace essere guardata.'],
    date: ['Puntuale. Mi piacciono gli uomini puntuali.', 'Niente giri di parole: mi piaci. E io ottengo sempre quello che voglio.'],
    afterKiss: ['Era solo l\'antipasto.'], invite: ['Casa mia. Adesso.'],
    home: ['Togliti le scarpe. E poi il resto, se hai coraggio.'],
    undress: ['Fa caldo, vero?', 'Lascia, faccio io.', 'Ti piace quello che vedi?', 'Il letto ci aspetta.'],
    feet: {
      massage: ['Tutto qui? Più forte, non sono di cristallo.', 'Mmh, ok, adesso ci siamo. Hai imparato in fretta.'],
      kiss: ['Ah, lo sapevo che eri il tipo. In ginocchio, allora.', 'Bravo ragazzo. Ancora, e con più convinzione.'],
      lick: ['Guarda guarda... ti piace proprio, eh? Non ti fermare.', 'Ahah! Che faccia che fai. Dai, voglio vedere quanto resisti.'],
    },
    guide: ['Mani a posto e occhi chiusi. Comando io.', 'Bravo ragazzo... vedi che quando ubbidisci è meglio?'],
    bed: ['Finalmente.'], end: ['Mmh... promosso a pieni voti.', 'Domani si replica. Non accetto un no.'],
    after: ['Sei ancora qui fuori? Lo sai dove abito. 😏'],
  },
  timida: {
    meet: ['Oh! S-scusa, non ti avevo visto...', 'Io... non parlo molto con gli sconosciuti.'],
    date: ['C-ciao... non pensavo venissi davvero.', 'Io... non sono brava con queste cose.'],
    afterKiss: ['Il mio primo bacio così...'], invite: ['Ti... ti andrebbe di venire da me? Solo se vuoi.'],
    home: ['Ecco... questa è casa mia. È piccola.'],
    undress: ['Spegniamo un po\' la luce?', 'Fai piano...', 'Ok... sono pronta.', 'Andiamo di là?'],
    feet: {
      massage: ['N-nessuno mi ha mai... oh. È bellissimo, in realtà.', 'Scusa se ho i piedi freddi... ah, adesso non più.'],
      kiss: ['C-cosa fai?! ...Oddio, sono tutta rossa.', 'È imbarazzante... ma non smettere, ok?'],
      lick: ['Ahahah! No, ti prego, soffro il solletico! ...Ahah, ancora!', 'Non riesco a smettere di ridere... sei terribile!'],
    },
    guide: ['N-non ridere, ok? ...Vieni più vicino.', 'Oh... non pensavo di avere tutto questo coraggio.'],
    bed: ['Sono felice che sia tu.'], end: ['Non dirlo a nessuno... o forse sì, dillo a tutti.', 'Resti fino a domattina?'],
    after: ['C-ciao... ripenso sempre a quella notte. Torna a trovarmi.'],
  },
  ironica: {
    meet: ['Ah, il famoso allenatore. Mi aspettavo uno più alto.', 'Scherzo. Più o meno.'],
    date: ['Guarda chi si vede. Pensavo ti fossi perso.', 'Allora, quale frase da rimorchio hai preparato?'],
    afterKiss: ['Ok, ammetto che questo non era male.'], invite: ['Ho del vino a casa. Ed è un vino molto convincente.'],
    home: ['Benvenuto. Le scarpe da quella parte, i complimenti da questa.'],
    undress: ['Ah, quindi era questo il piano.', 'Lascia, con quei bottoni sei negato.', 'Contento adesso?', 'Il letto è comodo, giuro.'],
    feet: {
      massage: ['Massaggiatore e allenatore. Un uomo dai mille talenti.', 'Se ti pago, vieni anche il martedì?'],
      kiss: ['Ah, siamo a questo punto della serata? Interessante.', 'Lo segno nel diario: "baciapiedi, ma carino".'],
      lick: ['Ok, questo non me l\'aspettavo. Voto: otto e mezzo.', 'Ahah! Fermo, fermo... no, scherzavo, continua.'],
    },
    guide: ['Ok, lezione numero uno. Prendi appunti.', 'Mmh... allievo promettente. Molto promettente.'],
    bed: ['Zitto e abbracciami.'], end: ['Devo ammetterlo: sei pieno di sorprese.', 'Se russi ti butto fuori. Scherzo. Forse.'],
    after: ['Ancora tu? ...Dai, entra. Ho aperto un\'altra bottiglia.'],
  },
};

const rand = (a) => a[Math.floor(Math.random() * a.length)];
const sample = (a, n) => [...a].sort(() => Math.random() - 0.5).slice(0, n);

// what she says depends on how close you two have become (bond = outings and nights together)
const BOND = [
  ['Mi piace passare il tempo con te.', 'Sai che ripenso spesso a te?', 'Sei diverso dagli altri, lo sai?'],
  ['Ormai ti cerco con gli occhi appena esco di casa.', 'Le mie amiche mi chiedono sempre di te.', 'Mi sei mancato, anche se ci siamo visti ieri.'],
  ['Lo sai che ti amo, vero, scemo?', 'Con te mi sento a casa, ovunque siamo.', 'Ogni volta è come la prima. Anzi, meglio.'],
];
const bondTier = (b) => (b >= 5 ? 2 : b >= 2 ? 1 : 0);

// dates you can invite her to once you are together
const OUTINGS = {
  osteria: {
    title: '🍝 Cena in osteria', lines: ['Questo posto fa la pasta migliore di Valmora.', 'Brindiamo... a noi due?', 'Smettila di guardarmi così, ci vedono tutti!', 'Hai un po\' di sugo sul mento. Lascia, faccio io.', 'Il cameriere ci guarda e sorride. Avrà capito tutto.'],
    only: ['Baciala', 'Accarezzale i capelli', 'Sussurrale qualcosa all\'orecchio'],
    extra: [
      { icon: '🦶', label: 'Fai piedino sotto al tavolo', lines: ['Ehi... cosa fai lì sotto? Continua, ma fai finta di niente.', 'Se il cameriere se ne accorge, giuro che rido.', 'Sei un disastro. Un disastro adorabile.'] },
      { icon: '🍷', label: 'Versale del vino', lines: ['Grazie... vuoi farmi ubriacare?', 'Un goccio solo. Va bene, due.'] },
      { icon: '🍰', label: 'Ordina un dolce da dividere', lines: ['Un cucchiaio per uno. ...Ok, l\'ultimo è mio.', 'Sei dolce quasi quanto questa torta.'] },
    ],
  },
  scooter: {
    title: '🛵 Giro in scooter', lines: ['Più veloce! No, più piano! ...Più veloce!', 'Mi tengo stretta, eh. Non farti strane idee.', 'Da qui sopra Valmora sembra un altro mondo.', 'Se cadiamo è colpa tua, sappilo.'],
    only: ['Sussurrale qualcosa all\'orecchio'],
    extra: [
      { icon: '🤗', label: 'Lasciati abbracciare da dietro', lines: ['Sei caldo... posso restare così fino a casa?', 'Senti il mio cuore? Batte forte per la velocità. Solo per quella.'] },
      { icon: '🌅', label: 'Fermati a guardare il panorama', lines: ['Che spettacolo... grazie per avermi portata qui.', 'Quando sono con te tutto sembra più bello.'] },
    ],
  },
  bagno: {
    title: '🌊 Bagno di notte', swim: true, lines: ['L\'acqua è gelida! ...Scaldami tu.', 'Le stelle si riflettono nell\'acqua, guarda.', 'Chi arriva ultimo alla riva offre la cena!', 'Non schizzarmi! ...Ok, guerra!'],
    only: ['Baciala', 'Baciale il collo', 'Accarezzale i capelli', 'Stringila a te'],
    extra: [
      { icon: '💦', label: 'Schizzala', lines: ['Ah! Ora te la faccio pagare!', 'Sei un bambino! ...Prendi questo!'] },
      { icon: '🫂', label: 'Prendila in braccio nell\'acqua', lines: ['Ehi! Mettimi giù! ...No, aspetta, resta così.', 'Mi sento leggera come una piuma.'] },
    ],
  },
  picnic: {
    title: '🧺 Pic-nic', lines: ['Ho preparato tutto io. Assaggia!', 'Sdraiamoci a guardare le nuvole.', 'Quella nuvola sembra un Lanuvo, vero?', 'Che silenzio... si sentono solo gli uccellini.'],
    only: ['Baciala', 'Accarezzale le gambe', 'Massaggiale i piedi', 'Accarezzale i capelli'],
    extra: [
      { icon: '🍓', label: 'Imboccala con una fragola', lines: ['Mmh... dolcissima. Ne voglio un\'altra.', 'Ora tocca a me imboccare te.'] },
      { icon: '😴', label: 'Appoggia la testa sulle sue gambe', lines: ['Comodo? Ti accarezzo i capelli io, stavolta.', 'Potrei restare così tutto il pomeriggio.'] },
    ],
  },
};

// who, where, her character and her way to be won over
const GIRLS = [
  { id: 'sofia', name: 'Sofia', town: 'aurora', at: [-12, 4], mood: 'dolce', task: { type: 'gift', item: 'mela' }, when: 'day', look: { skin: 0xf1c7a3, hair: 0xe0c07a, shirt: 0xf48fb1, pants: 0xffffff }, under: 0xf8bbd0 },
  { id: 'elisa', name: 'Elisa', town: 'aurora', at: [10, 6], mood: 'audace', task: { type: 'battle', team: ['tizzone', 'voltino'] }, when: 'sunset', look: { skin: 0xe0ac69, hair: 0x2b1b10, shirt: 0xd32f2f, pants: 0x212121 }, under: 0x111111 },
  { id: 'bianca', name: 'Bianca', town: 'aurora', at: [3, -10], mood: 'ironica', task: { type: 'champion', town: 'aurora' }, when: 'night', look: { skin: 0xf6d5c0, hair: 0x111111, shirt: 0xffffff, pants: 0x37474f }, under: 0xffffff },
  { id: 'greta', name: 'Greta', town: 'aurora', at: [-6, 13], mood: 'timida', task: { type: 'money', amount: 300 }, when: 'day', look: { skin: 0xf1c7a3, hair: 0xc0392b, shirt: 0x7ac74c, pants: 0x5d4037 }, under: 0x81c784 },
  { id: 'viola', name: 'Viola', town: 'fiorita', at: [-9, 5], mood: 'dolce', task: { type: 'gift', item: 'vasofiori' }, when: 'sunset', look: { skin: 0xe8b88a, hair: 0x4a148c, shirt: 0x9c27b0, pants: 0xe1bee7 }, under: 0x7b1fa2 },
  { id: 'ilaria', name: 'Ilaria', town: 'giada', at: [-7, -6], mood: 'timida', task: { type: 'gift', item: 'libro' }, when: 'day', look: { skin: 0xf1c7a3, hair: 0x8d5524, shirt: 0x558b2f, pants: 0x795548 }, under: 0xdcedc8 },
  { id: 'vanessa', name: 'Vanessa', town: 'fulgida', at: [12, -8], mood: 'audace', task: { type: 'money', amount: 1000 }, when: 'night', look: { skin: 0xf6d5c0, hair: 0xf5d76e, shirt: 0x111111, pants: 0x111111 }, under: 0xc62828 },
  { id: 'nina', name: 'Nina', town: 'fulgida', at: [-14, 6], mood: 'ironica', task: { type: 'battle', team: ['fulminax', 'ratolux', 'vampistro'] }, when: 'night', look: { skin: 0xc68642, hair: 0x1a237e, shirt: 0x3949ab, pants: 0x212121 }, under: 0x3949ab },
  { id: 'perla', name: 'Perla', town: 'corallo', at: [9, 7], mood: 'dolce', task: { type: 'gift', item: 'palla' }, when: 'day', look: { skin: 0xe0ac69, hair: 0xffffff, shirt: 0x4dd0e1, pants: 0xfff59d }, under: 0x4dd0e1 },
  { id: 'lucia', name: 'Lucia', town: 'solari', at: [-8, -7], mood: 'audace', task: { type: 'caught', n: 12 }, when: 'sunset', look: { skin: 0x8d5524, hair: 0x111111, shirt: 0xff9800, pants: 0xfff3e0 }, under: 0xff7043 },
  { id: 'carmen', name: 'Carmen', town: 'ramato', at: [8, -9], mood: 'audace', task: { type: 'battle', team: ['desertauro', 'leonardente'] }, when: 'sunset', look: { skin: 0xc68642, hair: 0x2b1b10, shirt: 0xb71c1c, pants: 0x3e2723 }, under: 0x111111 },
  { id: 'morgana', name: 'Morgana', town: 'nebbia', at: [-10, -5], mood: 'ironica', task: { type: 'gift', item: 'libro' }, when: 'night', look: { skin: 0xf6e3d6, hair: 0x311b92, shirt: 0x212121, pants: 0x4a148c }, under: 0x4a148c },
  { id: 'stella', name: 'Stella', town: 'gelidi', at: [11, 4], mood: 'timida', task: { type: 'champion', town: 'gelidi' }, when: 'night', look: { skin: 0xf6e3d6, hair: 0xb0bec5, shirt: 0x90caf9, pants: 0xeceff1 }, under: 0xe3f2fd },
];

function taskText(g) {
  const t = g.task;
  if (t.type === 'gift') return `Porta a ${g.name} ${ITEM[t.item]}, tenendolo in mano`;
  if (t.type === 'money') return `Fai un regalo di 💰 ${t.amount} a ${g.name}`;
  if (t.type === 'battle') return `Batti ${g.name} in una lotta tra Velmon`;
  if (t.type === 'champion') return `Sconfiggi il Campione di ${town(t.town).region.town.name} per far colpo su ${g.name}`;
  return `Cattura ${t.n} specie diverse di Velmon per stupire ${g.name}`;
}
function askLine(g) {
  const t = g.task;
  if (t.type === 'gift') return `Sai cosa mi farebbe piacere? ${ITEM[t.item].replace(' (lo trovi nelle case)', '')[0].toUpperCase()}${ITEM[t.item].replace(' (lo trovi nelle case)', '').slice(1)}. Portamelo e ne riparliamo.`;
  if (t.type === 'money') return `Una ragazza come me ha i suoi vizi... diciamo ${t.amount} monete per un vestito nuovo?`;
  if (t.type === 'battle') return 'Esco solo con chi mi batte a una lotta tra Velmon. Quando vuoi.';
  if (t.type === 'champion') return `Il Campione di ${town(t.town).region.town.name}... battilo e avrai la mia attenzione.`;
  return `Mi piacciono gli allenatori seri. Torna quando avrai catturato ${t.n} specie diverse.`;
}

export class Romance {
  constructor(game) {
    this.game = game;
    const rnd = mulberry32(6969);
    const used = new Set(['corallo-2']);
    this.girls = GIRLS.map((g) => {
      const t = town(g.town);
      const x = t.x + g.at[0], z = t.z + g.at[1];
      const obj = makeCharacter({ hat: null, backpack: null, longHair: true, ...g.look });
      obj.position.set(x, heightAt(x, z), z);
      obj.rotation.y = Math.atan2(t.x - x, t.z - z);
      const mark = bubble('❤', '#ff3d68');
      mark.scale.setScalar(0.6);
      mark.visible = false;
      obj.add(mark);
      game.scene.add(obj);
      const spot = findLand(rnd, t.x, t.z, 170) || { x: t.x + 80, z: t.z };
      const house = game.towns.houses.find((h) => h.town === t && !h.shop && !used.has(h.id) && h.id !== `${g.town}-5`);
      used.add(house.id);
      house.reserved = true;
      const lines = MOOD[g.mood];
      const girl = { ...g, x, z, obj, mark, spot, house, t, qid: `rom_${g.id}`, scene: { name: g.name, look: g.look, under: g.under, ...lines } };
      // back at her place: a different welcome every time
      girl.scene.homeLines = () => [rand(['Eccoti. Ti aspettavo.', 'Chiudi la porta, svelto.', 'Ho acceso qualche candela... ti piace?', 'Speravo proprio che passassi.']), rand(BOND[bondTier(this.st.bond?.[g.id] || 0)])];
      const W = WHEN[g.when];
      game.quests.Q[girl.qid] = {
        title: `❤️ ${g.name}`, adult: true,
        steps: [
          { text: taskText(g), at: () => ({ x: obj.position.x, z: obj.position.z }), done: g.task.type === 'champion' ? (s) => s.beaten[`town-${g.task.town}`] : g.task.type === 'caught' ? (s) => Object.keys(s.caught).length >= g.task.n : undefined },
          { text: `Appuntamento con ${g.name} ${W.text}: raggiungi il posto segnato`, at: () => spot },
          { text: `Vai a casa di ${g.name}, a ${t.region.town.name}`, at: () => house.door },
        ],
        reward: {},
      };
      return girl;
    });
  }

  get st() { return this.game.state; }

  nearest(pos) {
    if (this.game.player.indoor) return null;
    let best = null;
    for (const g of this.girls) {
      if (!g.obj.visible) continue;
      const d = Math.hypot(pos.x - g.obj.position.x, pos.z - g.obj.position.z);
      if (d < 2.3 && (!best || d < best.d)) best = { kind: 'girl', g, d, hint: `A · Parla con ${g.name}` };
    }
    return best;
  }

  async talk(g) {
    const game = this.game, st = this.st, hud = game.hud, Q = game.quests;
    game.busy = true;
    g.obj.lookAt(game.player.pos.x, g.obj.position.y, game.player.pos.z);
    const q = st.quests[g.qid];
    if (!st.adult) {
      await hud.say(g.name, ['Ciao! Bella giornata, vero?']);
    } else if (q == null) {
      await hud.say(g.name, [...g.scene.meet, askLine(g)]);
      Q.start(g.qid);
      Q.check();
    } else if (q === 0) {
      const t = g.task;
      if (t.type === 'gift' && game.grab.held?.kind === t.item) {
        const it = game.grab.held;
        game.grab.drop();
        game.scene.remove(it.obj);
        game.grab.items.splice(game.grab.items.indexOf(it), 1);
        await hud.say(g.name, ['Per me? Che pensiero carino...', `Allora è deciso: appuntamento ${WHEN[g.when].text}. Ti ho segnato il posto sulla mappa.`]);
        Q.advance(g.qid);
      } else if (t.type === 'money') {
        const i = st.money >= t.amount ? await hud.choose(`Regalare 💰 ${t.amount} a ${g.name}?`, [{ icon: '💰', label: `Sì, ecco ${t.amount} monete` }, { icon: '✋', label: 'Non ora' }]) : -1;
        if (i === 0) {
          st.money -= t.amount; hud.setMoney(st.money);
          await hud.say(g.name, ['Oh, che generoso! Me lo ricorderò...', `Vediamoci ${WHEN[g.when].text}. Il posto te l'ho segnato sulla mappa.`]);
          Q.advance(g.qid);
        } else if (i < 0) await hud.say(g.name, [`Torna quando avrai almeno ${t.amount} monete, tesoro.`]);
      } else if (t.type === 'battle') {
        if (!st.party.some((m) => m.hp > 0)) { await hud.say(g.name, ['Con la squadra a pezzi? Passa dal Centro Cura, poi ne riparliamo.']); game.busy = false; return; }
        const top = Math.max(...st.party.map((m) => m.level));
        const team = t.team.map((id) => createMonster(id, Math.max(6, top - 1)));
        const out = await game.battle.start(null, { trainer: { name: g.name, team, reward: 0, fine: 0, obj: g.obj } });
        g.obj.position.set(g.x, heightAt(g.x, g.z), g.z);
        game.busy = true;
        if (out === 'win') { await hud.say(g.name, ['Accidenti... mi hai battuta. E io mantengo le promesse.', `Appuntamento ${WHEN[g.when].text}. Il posto è sulla tua mappa.`]); Q.advance(g.qid); }
      } else await hud.say(g.name, [askLine(g)]);
    } else if (q === 1) await hud.say(g.name, [`Ci vediamo ${WHEN[g.when].text}, al posto che ti ho segnato. Non tardare.`]);
    else if (q === 2) await hud.say(g.name, ['Che fai ancora qui fuori? Ti aspetto a casa mia...']);
    else {
      // together: invite her out, or just say hello
      const b = st.bond?.[g.id] || 0;
      await hud.say(g.name, [rand(g.scene.after), rand(BOND[bondTier(b)])]);
      const keys = Object.keys(OUTINGS);
      const i = await hud.choose(`${g.name} · intesa ${'❤'.repeat(Math.min(5, 1 + Math.floor(b / 2)))}`, [...keys.map((k) => ({ icon: OUTINGS[k].title.split(' ')[0], label: `Invitala: ${OUTINGS[k].title.slice(OUTINGS[k].title.indexOf(' ') + 1)}` })), { icon: '🏠', label: 'Passo da te più tardi', sub: 'Entra a casa sua quando vuoi.' }, { icon: '👋', label: 'Solo un saluto' }]);
      if (i >= 0 && i < keys.length) { await this.outing(g, keys[i]); return; }
      if (i === keys.length) await hud.say(g.name, [rand(['Ti aspetto. Non farmi aspettare troppo.', 'Lascio la porta socchiusa...', 'Porta il tuo sorriso migliore.'])]);
    }
    game.busy = false;
  }

  // a date with props, the camera on the two of you, chat and choices; the bond grows
  async outing(g, kind) {
    const game = this.game, hud = game.hud, P = game.player, st = this.st, O = OUTINGS[kind];
    game.busy = true;
    const spot = kind === 'osteria' ? { x: g.t.x + 6, z: g.t.z - 6 } : kind === 'bagno' ? (g.beach ??= game.quests.findBeach(mulberry32(g.x | 0), g.t) || g.spot) : g.spot;
    const y = heightAt(spot.x, spot.z);
    const props = new THREE.Group();
    props.position.set(spot.x, y, spot.z);
    const wood = new THREE.MeshStandardMaterial({ color: 0x8a6240, roughness: 0.8 });
    const box = (w, h, d, m, x, yy, z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, yy, z); o.castShadow = o.receiveShadow = true; props.add(o); return o; };
    let me, her, extraModels;
    const homeBefore = g.obj.position.clone();
    if (kind === 'osteria') {
      box(1.2, 0.06, 0.8, wood, 0, 0.75, 0); box(1.22, 0.02, 0.82, new THREE.MeshStandardMaterial({ color: 0xc62828 }), 0, 0.79, 0);
      for (const [lx, lz] of [[-0.5, -0.3], [0.5, -0.3], [-0.5, 0.3], [0.5, 0.3]]) box(0.05, 0.75, 0.05, wood, lx, 0.37, lz);
      box(0.06, 0.2, 0.06, new THREE.MeshStandardMaterial({ color: 0xfff3e0 }), 0, 0.9, 0);
      box(0.03, 0.05, 0.03, new THREE.MeshStandardMaterial({ color: 0xffb347, emissive: 0xff8c1a, emissiveIntensity: 3 }), 0, 1.03, 0);
      for (const s of [-1, 1]) box(0.45, 0.05, 0.45, wood, s * 0.95, 0.45, 0);
    } else if (kind === 'picnic') {
      box(2.2, 0.02, 1.6, new THREE.MeshStandardMaterial({ color: 0xd32f2f, roughness: 1 }), 0, 0.02, 0);
      box(0.4, 0.3, 0.28, new THREE.MeshStandardMaterial({ color: 0xa47148, roughness: 1 }), 0, 0.17, -0.5);
    } else if (kind === 'scooter') {
      const sc = makeScooter(0xf2c14e); props.add(sc);
    }
    game.scene.add(props);
    // stand-ins for the two of you (the real models keep following the game), in swimwear for a swim
    me = O.swim ? makeCharacter({ shirt: 0xf1c7a3, pants: 0x1565c0, hat: null, backpack: null }) : makeCharacter();
    her = makeCharacter({ hat: null, backpack: null, longHair: true, ...g.look, ...(O.swim ? { shirt: g.look.skin, pants: g.under, top: g.under } : {}) });
    extraModels = [me, her];
    for (const c of extraModels) game.scene.add(c);
    P.model.visible = false; g.obj.visible = false; g.out = true;
    const place = (o, x, z, ry, dy = 0) => { o.position.set(spot.x + x, y + dy, spot.z + z); o.rotation.set(0, ry, 0); };
    if (kind === 'scooter') { place(me, 0, -0.05, 0, 0.18); place(her, 0, -0.45, 0, 0.2); me.userData.sitting = her.userData.sitting = true; me.userData.animate(0, 0); her.userData.animate(0, 0); }
    else if (kind === 'osteria') { place(me, -0.95, 0, Math.PI / 2, -0.42); place(her, 0.95, 0, -Math.PI / 2, -0.42); me.userData.sitting = her.userData.sitting = true; }
    else if (kind === 'bagno') { place(me, -0.45, 0, Math.PI / 2, -0.5); place(her, 0.45, 0, -Math.PI / 2, -0.5); }
    else { place(me, -0.45, 0.2, Math.PI / 2, -0.83); place(her, 0.45, 0.2, -Math.PI / 2, -0.83); me.userData.sitting = her.userData.sitting = true; } // sitting on the blanket
    me.userData.animate(0, 0); her.userData.animate(0, 0);
    const look = new THREE.Vector3(spot.x, y + 1.1, spot.z);
    game.cine = { pos: new THREE.Vector3(spot.x + 2.4, y + 2.0, spot.z + 2.6), look };
    if (kind === 'picnic') { me.position.y = her.position.y = y; } // on their feet on the blanket, the scene seats them as needed
    const b = st.bond?.[g.id] || 0;
    await hud.say(g.name, [rand(g.scene.date), ...sample(O.lines, 2), rand(BOND[bondTier(b)])]);
    await game.quests.intimacy(her, 2, g.name, g.scene.guide, g.scene.feet, O.extra, O.only, { me, stage: kind === 'osteria' || kind === 'scooter' ? 'seat' : 'stand' });
    await hud.say(g.name, [rand(['Che bella serata...', 'Rifacciamolo presto, promesso?', 'Non volevo che finisse.', 'Mi hai fatta sentire speciale.']), rand(g.scene.invite)]);
    st.bond ??= {};
    st.bond[g.id] = b + 1;
    hud.toast(`❤ Intesa con ${g.name}: ${st.bond[g.id]}`, 2000);
    // tidy up
    game.scene.remove(props);
    for (const c of extraModels) game.scene.remove(c);
    P.model.visible = true; g.obj.visible = true; g.out = false;
    g.obj.position.copy(homeBefore); g.obj.rotation.set(0, Math.atan2(g.t.x - g.x, g.t.z - g.z), 0);
    P.place(spot.x - 1.5, spot.z + 1.5, 0);
    game.cine = null;
    game.save();
    game.busy = false;
  }

  onEnterHouse(house, room) {
    const g = this.girls.find((x) => x.house === house);
    const q = g && this.st.quests[g.qid];
    if (g && this.st.adult && (q === 2 || q === 'done')) this.game.quests.bedroomScene(room, g.scene, g.qid);
  }

  update(dt) {
    const game = this.game, P = game.player.pos, st = this.st;
    this.t = (this.t || 0) + dt;
    for (const g of this.girls) {
      const o = g.obj;
      if (g.out || o.userData.out) { o.visible = false; continue; }
      o.visible = !game.player.indoor && Math.abs(P.x - o.position.x) < 260 && Math.abs(P.z - o.position.z) < 260;
      if (!o.visible) continue;
      o.userData.animate(dt, 0);
      const q = st.quests?.[g.qid];
      g.mark.visible = !!st.adult && (q == null || q === 0);
      g.mark.position.y = 2.25 + Math.sin(this.t * 3) * 0.06;
    }
    // dates start when you reach the spot at the right time of day
    if (game.busy || game.battle.active || !st.adult) return;
    for (const g of this.girls) {
      if (st.quests?.[g.qid] !== 1) continue;
      if (WHEN[g.when].ok(game.sky.time) && Math.hypot(P.x - g.spot.x, P.z - g.spot.z) < 6) {
        game.quests.dateScene(g.scene, g.spot, g.obj).then(() => game.quests.advance(g.qid));
        return;
      }
    }
  }
}

export const ROMANCE_COUNT = GIRLS.length;
