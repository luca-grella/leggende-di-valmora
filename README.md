# Leggende di Valmora

Un RPG monster-collector browser-based ispirato a **Pokémon FireRed**, sviluppato interamente in JavaScript vanilla senza dipendenze esterne. Gira a risoluzione GBA nativa (240×160) scalata via Canvas 2D, con grafica pixel art procedurale, sistema di battaglia a turni, mappa esplorabile e supporto mobile con joystick touch.

**Gioca online:** https://luca-grella.github.io/leggende-di-valmora/

---

## Architettura tecnica

### Stack

| Layer | Tecnologia |
|---|---|
| Rendering | Canvas 2D API, risoluzione 240×160 × SCALE (devicePixelRatio-aware) |
| Audio | Web Audio API (oscillatori procedurali, nessun file audio esterno) |
| Grafica | Pixel art completamente procedurale (nessun file immagine) |
| Persistenza | `localStorage` (salvataggio automatico) |
| Deploy | GitHub Pages (static, zero server) |

### Struttura file

```
index.html          Entry point, HTML shell, CSS, joystick touch JS
js/
  engine.js         Core: canvas, game loop (RAF), input, fade, font, UI box
  audio.js          Sintetizzatore audio procedurale (SFX + musica chiptune)
  sprites.js        Generatore grafica: tile 16×16, sprite personaggi, MonArt
  data.js           Database specie Velmon, mosse, oggetti, formule stats
  maps.js           Definizione mappe (tile grid, NPC, warp, oggetti, eventi)
  ui.js             Sistema UI a stack (dialogo, menu, sacca, squadra)
  menus.js          Schermate: titolo, nuova partita, dex, HoF, evoluzione
  battle.js         Motore di battaglia a turni, AI nemica, animazioni
  overworld.js      Motore esplorazione: movimento, NPC, warp, incontri selvatici
  main.js           Boot, stati di gioco, salvataggio/caricamento
```

### Game loop

Il loop principale (`mainLoop` in `engine.js`) gira a 60 fps via `requestAnimationFrame`. Ogni frame:

1. **Update** — lo stato attivo (`Game.state`) o il top della UI stack chiama `update()`
2. **Draw** — `cx.setTransform(SCALE,0,0,SCALE,0,0)` scala tutto lo spazio 240×160 alle dimensioni fisiche del canvas; `imageSmoothingEnabled = false` per pixel croccanti
3. **Fade** — overlay nero con alpha interpolata, usato per transizioni tra stati
4. **Input** — snapshot di `held` vs `prev` per distinguere pressed vs held

### Sistema di rendering della grafica

Tutta la grafica è generata proceduralmente in JavaScript al primo utilizzo e poi cachata in canvas offscreen:

- **Tile 16×16** (`TILE_DRAW` in `sprites.js`): funzioni disegnano l'erba con blade-tip highlights, alberi a 3 layer di fogliame (ombra/medio/highlight), acqua con onde animate, edifici con pattern mattoni e tegole
- **Sprite personaggi** (`CHAR_GRID`): template 16×16 pixel art con palette sostituibile (cap, hair, skin, shirt, pants, shoes); 6 frame direzionali (down0/1, up0/1, side0/1) con flip orizzontale automatico
- **MonArt** (`MonArt.gen`): generatore di sprite Velmon 64×64 seed-based, 8 archetipi (blob, beast, bird, serpent, rock, ghost, plant, dragon), palette per tipo
- **SCALE**: `Math.ceil(devicePixelRatio × displayScale)` da 2 a 8 — i pixel del canvas fisico corrispondono sempre a pixel interi logici, senza blur

### Motore di battaglia

La battaglia usa una **coda di eventi** (`this.q`): ogni azione (mossa, animazione HP, messaggio, faint, cattura) inserisce token nella coda. Il loop consuma un token per frame, aspettando A per avanzare i messaggi. Questo garantisce che effetti visivi e testo siano sempre sincronizzati.

Flusso per il turno:
```
doTurn() → calcola ordine (velocità) → buildMoveItems() → insertQ()
         → checkFaint() → se player faint → afterPlayerFaint()
         → se party vuoto → finish('lose') → onBattleLost()
         → altrimenti → forceSwitch (PartyScreen)
```

### Sistema audio

`audio.js` usa Web Audio API per generare suoni in tempo reale con oscillatori. La musica è una sequenza di note (array di `[freq, durata]`) suonata in loop. I SFX (conferma, cursore, livello, faint) sono forme d'onda brevi generate on-the-fly.

### Input

Unificato tra tastiera e touch:
- **Tastiera**: `ArrowKeys / WASD` per direzioni, `Z/Space` = A, `X` = B, `Enter` = START
- **Touch**: joystick analogico sinistro (touch drag con zona morta 12 px), pulsanti A/B/START a destra

---

## Descrizione funzionale (walkthrough)

### Schermata titolo
Il gioco si apre con la schermata titolo animata: uno sprite Velmon rotante, il logo e la promessa di un'avventura retrò. Premi **A / Z / Invio** per iniziare.

### Nuova partita
1. Inserisci il nome del protagonista
2. Il Professore ti introduce al mondo dei Velmon
3. Scegli il tuo **Velmon iniziale** tra i tre starter (Fuoco / Acqua / Erba)
4. Parti dal tuo paese natale (**Borgo**)

### Esplorazione overworld
- Muoviti con frecce/joystick nelle mappe tile-based
- **Interagisci** con NPC (tasto A davanti a loro) per dialoghi e sfide
- **Entra negli edifici** camminando sulle porte
- Nell'erba alta ci sono **incontri selvatici** casuali
- Premi **START** per aprire il menu (squadra, sacca, salva, dex)

### Sistema di battaglia
La battaglia è a turni stile Gen-I:
- **LOTTA** — scegli una delle 4 mosse; ogni mossa ha PP, tipo e potere
- **SACCA** — usa pozioni e Valmball per catturare Velmon selvatici
- **SQUADRA** — cambia il Velmon in campo
- **FUGA** — solo in battaglie selvatiche

Le statistiche (ATK, DEF, SPD, SPC, HP) scalano col livello; l'efficacia per tipo applica resistenze e debolezze (Fuoco > Erba > Acqua > Fuoco, ecc.).

### Progressione
- Sconfiggi i **4 Campioni** delle varie zone per ottenere i badge
- Con i badge aumenta l'obbedienza dei Velmon di alto livello
- Completa il **Valmordex** catturando le specie selvatiche
- Batti il **Campione finale** per entrare nella Hall of Fame

### Salvataggio
Il gioco salva automaticamente su `localStorage` a ogni cambio mappa. Il pulsante START → Salva forza il salvataggio manuale. Al successivo caricamento il titolo propone "Continua".

---

## Potenziali miglioramenti (next release)

### Gameplay
- [ ] **Sistema evolutivo completo** — attualmente le evoluzioni avvengono solo tramite level-up; mancano evoluzioni per scambio o oggetto
- [ ] **Mosse status più impattanti** — confusione, sonno e paralisi esistono ma non hanno animazioni dedicate
- [ ] **NPC wandering AI** — gli NPC si muovono casualmente ma non seguono percorsi predefiniti (route patrol)
- [ ] **Safari Zone / area cattura speciale** — zona con regole diverse (step limit, bait/rock)
- [ ] **Sistema oggetti espanso** — TM/MV per insegnare mosse extra, pietre evolutive, oggetti equipaggiabili
- [ ] **Trading tra giocatori** — via WebSocket o URL-share per scambiare Velmon

### Tecnico
- [ ] **Service Worker / offline PWA** — il gioco funziona già senza backend, ma manca il manifest PWA per installarlo come app su iPhone dalla homescreen
- [ ] **Salvataggio cloud** — sincronizzazione save tramite localStorage-to-server o GitHub Gist
- [ ] **Sprite true 32×32 con animazione** — i Velmon attuali sono 64×64 statici; aggiungere 2-frame idle animation
- [ ] **Mappe più grandi con tilemap editor** — attualmente le mappe sono array hardcoded; un editor visuale JSON semplificherebbe l'espansione
- [ ] **Localizzazione** — struttura messaggi già centralizzata, pronta per EN/ES/FR
- [ ] **Leaderboard** — tempo completamento, Velmon catturati, passi, inviati a un backend minimale

### Grafica / UX
- [ ] **Animazioni battaglia più ricche** — flash di tipo colorato al colpo, shake dello sprite al danno
- [ ] **Effetti meteo overworld** — pioggia (rafforza Acqua), sole (rafforza Fuoco), nebbia nelle grotte
- [ ] **Transizione warp animata** — spirale o iris-wipe invece del semplice fade nero
- [ ] **Ritratti NPC nei dialoghi** — piccola icona viso accanto al testo per i personaggi principali
- [ ] **Mappa del mondo** — schermata overview con le zone sbloccate evidenziate

### Mobile
- [ ] **Vibrazione haptica** — `navigator.vibrate()` su colpo critico, cattura, level-up
- [ ] **Installabile come PWA** — aggiungere `manifest.json` e Service Worker per l'icona sulla homescreen
- [ ] **Landscape lock** — forzare orientamento orizzontale su iPhone con Screen Orientation API

---

## Licenza

Progetto personale / educational. Nessuna affiliazione con Nintendo o Game Freak.
