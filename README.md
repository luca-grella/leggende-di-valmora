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
- **19 specie di Velmon** in 11 tipi, con tabella delle efficacie, mosse imparate salendo di livello ed esperienza.
- **Lotte a turni** nel punto dell'incontro, **cattura con le Sfere**, squadra di 6 e Box per gli altri.
- Salvataggio automatico nel browser.

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
| Indietro | Esc | ✕ |

## Come è fatto

- [Three.js](https://threejs.org/) + [Vite](https://vitejs.dev/), JavaScript senza framework. Tutta la grafica è
  generata dal codice: nessun modello o texture esterni.
- `src/world/`: regioni, generazione del terreno (`heightfield.js`), pezzi di mondo con due livelli di dettaglio
  (`terrain.js`), alberi ed erba con vento (`vegetation.js`), cielo e giorno/notte (`sky.js`), mare (`water.js`), paesi (`towns.js`).
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

- Evoluzioni, più specie per regione e Velmon leggendari.
- Allenatori da sfidare, palestre e la Lega di Valmora a Città Fulgida.
- Negozi, oggetti, soldi e una storia per ogni regione.
- Mezzi per attraversare il mondo più in fretta (bici, cavalcature, traghetti).
- Attività "da grandi" nelle città: missioni losche, contrabbando, inseguimenti.
- Interni degli edifici, grotte e dungeon.
