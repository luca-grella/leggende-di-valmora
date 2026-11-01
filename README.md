# Leggende di Valmora

Un gioco di esplorazione e cattura di creature in 3D, nel browser, giocabile anche da iPhone.
Mondo aperto con nove regioni, giorno e notte, erba alta, lotte a turni e cattura dei Velmon.
Creature, regioni e nomi sono tutti originali.

**Gioca:** https://luca-grella.github.io/leggende-di-valmora/

La vecchia versione 2D (stile GBA) è salvata nel tag [`v1-2d`](../../tree/v1-2d).

## Cosa c'è

- **Mondo aperto di circa 6 × 6 km**, generato a pezzi da 64 m mentre cammini, diviso in nove regioni
  con paesaggio, colori, alberi e Velmon propri:

  | | | |
  |---|---|---|
  | Picchi Gelidi · *Borgo Cristallo* | Brughiera di Nebbia · *Castelfosco* | Selva di Giada · *Borgo Muschio* |
  | Costa Fiorita · *Villa Petalo* | **Valle Aurora** · *Borgo Alba* (inizio) | Piana Fulgida · *Città Fulgida* |
  | Altopiano Ramato · *Rocca Ramata* | Arcipelago Corallo · *Porto Corallo* | Isole Solari · *Baia del Sole* |

- Strade che collegano i paesi, mare con onde, isole raggiungibili a nuoto.
- **Ciclo giorno/notte** di 20 minuti: di notte si accendono finestre e lampioni ed escono più Velmon di tipo Spettro.
- Ogni paese ha un **Centro Cura** (cura la squadra e ricarica le Sfere) e abitanti con cui parlare.
- **44 specie di Velmon** in 11 tipi (20 di base e 24 forme evolute), con tabella delle efficacie, mosse imparate salendo di livello ed esperienza.
- **Evoluzioni**: raggiunto il livello giusto, a fine lotta il Velmon si evolve con un'animazione.
- **Lotte a turni** nel punto dell'incontro, **cattura con le Sfere**, squadra di 6 e Box per gli altri.
- **Allenatori**: due su ogni strada (ti vedono, compare "!" e vengono a sfidarti) e un campione in ogni paese.
  Vincere dà monete ed esperienza; perdere costa monete. Chi hai battuto resta battuto.
- **Vita da strada** a Città Fulgida (Er Faina) e Porto Corallo (Zio Murena): consegne a tempo, colpi alle
  bancarelle, corse clandestine a cerchi, lotte clandestine con scommessa. Livello **ricercato** fino a 3 stelle:
  le guardie ti inseguono e, se ti prendono, si lotta. **Scooter** da rubare e **Spara-vernice** che stordisce le guardie.
- **Case visitabili**: si entra in ogni casa di ogni paese. Dentro ci sono mobili, abitanti con cui parlare e
  cassetti, armadi e frighi da frugare (monete, Sfere, Pozioni… ma se il padrone di casa ti vede chiama le guardie).
  Nascondersi in casa fa perdere le tracce alle guardie.
- **Bottega** in ogni paese (l'edificio con l'insegna, di fronte al Centro Cura): Sfere, Pozioni, Superpozioni, Ravviva.
  **Zaino** dal menu Squadra o durante le lotte.
- **Oggetti da prendere e lanciare** (vasi, mele, palle, libri, casse): colpire una guardia la lascia stordita.
- **Storia**: Capitolo 1 "L'ombra dell'Eclissi" (Campione di Borgo Alba → Prof.ssa Quercia → Dott. Ginepro a Villa
  Petalo → accampamento dell'Eclissi) e Capitolo 2 "Il magazzino dell'Eclissi" (Er Faina → magazzino a sud di Città
  Fulgida → Comandante Notte → Prof.ssa Quercia), che svela il Velmon leggendario Aurorante. **Missioni secondarie**: il Topolux di Nonna Rosa, Pane caldo, Re della strada,
  Cacciatore di tesori, Collezionista e, se attivate le scene per adulti, "Una sera a Porto Corallo" con Marina.
  Diario 📜 Missioni nel menu Squadra; l'obiettivo seguito appare in basso e sulla mappa.
- **Mondo più pieno**: accampamenti con campeggiatori, rovine, 35 forzieri nascosti, cartelli stradali, viaggiatori sulle strade.
- **Contenuti per adulti** (18+): si sceglie all'avvio e si cambia dal menu Squadra. Niente nudità esplicita.
- Salvataggio automatico nel browser e pulsante **💾 Salva** nel menu Squadra.

## Comandi

| | Tastiera e mouse | Telefono |
|---|---|---|
| Camminare | WASD o frecce | trascina il dito nella metà sinistra |
| Correre | Shift (o R per bloccare la corsa) | pulsante Corri, o joystick spinto fino in fondo |
| Saltare | Spazio | pulsante ⤒ |
| Ruotare la camera | trascina col mouse, rotella per lo zoom | trascina nella metà destra |
| Parlare, entrare, confermare | E o Invio | pulsante A |
| Squadra | P o Tab | ☰ |
| Mappa | M | 🗺 |
| Spara-vernice | F | 🎯 |
| Salire/scendere dallo scooter, entrare/uscire, prendere/lanciare | E | A |
| Indietro | Esc | ✕ |

## Come è fatto

- [Three.js](https://threejs.org/) + [Vite](https://vitejs.dev/), JavaScript senza framework. Tutta la grafica è
  generata dal codice: nessun modello o texture esterni.
- `src/world/`: regioni, generazione del terreno (`heightfield.js`), pezzi di mondo con due livelli di dettaglio
  (`terrain.js`), alberi ed erba con vento (`vegetation.js`), cielo e giorno/notte (`sky.js`), mare (`water.js`), paesi (`towns.js`),
  allenatori (`trainers.js`), missioni, guardie e ricercato (`crime.js`), scooter (`scooter.js`), segnalini 3D (`markers.js`),
  interni delle case e Bottega (`interiors.js`), oggetti da lanciare (`grab.js`); oggetti dello zaino in `src/items.js`;
  accampamenti, rovine, forzieri e viaggiatori (`props.js`); storia, missioni e scene (`src/story/quests.js`).
- `src/creatures/`: specie, tipi e mosse (`species.js`), modelli 3D dei Velmon (`model.js`), statistiche ed esperienza (`monster.js`).
- `src/battle/battle.js`: lotte e cattura. `src/ui/hud.js`: interfaccia. `src/player.js`: movimento e camera.
- Su telefono il gioco usa automaticamente un profilo più leggero (distanza visiva, ombre, densità dell'erba).

```bash
npm install
npm run dev      # sviluppo su http://localhost:5173
npm run build    # versione finale in dist/
```

Ogni push su `master` pubblica il gioco su GitHub Pages (`.github/workflows/deploy.yml`).

## Prossimi passi

- Capitolo 3 (il santuario di Aurorante sui Picchi Gelidi) e oltre; altre missioni secondarie e relazioni.
- Grafica ancora più curata (modelli più dettagliati, animazioni, effetti).
- Palestre, la Lega di Valmora e Velmon leggendari; traghetti e cavalcature.
