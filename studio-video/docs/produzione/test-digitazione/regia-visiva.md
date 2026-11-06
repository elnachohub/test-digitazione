# Regia visiva — Test di digitazione (art director)

Progetti: `promo.json` (9:16, 19 s) e `tutorial.json` (16:9, 39 s). Testi,
durate, immagini e coordinate dei passi sono quelli di `copione.md`.
`verifica.js`: zero errori e zero avvisi su entrambi.

## Scelte e perché

- **Tema `carta` + accento `#d9622b`**: crema e arancione bruciato sono i
  colori veri del sito (`#f7f4ee`, `--accento`) e del logo; le catture chiare
  si fondono con lo sfondo invece di staccare come su un tema pop o scuro.
- **Carattere `grottesco`** (Bricolage) invece di `editoriale` (Fraunces): il
  sito usa caratteri senza grazie e il tono è giocoso; il grazie di carta
  sarebbe da rivista. `pulito` (Inter) era più fedele ma più freddo.
- **Animazione**: `sali` per tutto, `scatto` sulle aperture (gancio leggibile
  subito). Transizione `dissolvenza`, calma, adatta alle schermate.
- **Logo `sito/logo.png`** in apertura e nelle cta: icona piena arancione con
  il tasto crema, si legge bene sul crema anche piccola.
- Stesse scelte nei due video: la marca è la stessa a colpo d'occhio.

## Problemi risolti

- **Telefono che scorreva troppo in fretta** (4431 px in ~1,3 s di
  scorrimento): creata `sito/telefono-pagina-corta.jpg` (prime 2980 px, fino a
  "Punteggi di Giocatore 1"), come chiedeva il copione. Ora lo scorrimento è
  lento e la scena si apre proprio su "Classica / Arcade".
- **Promo, zona sicura**: il titolo della schermata partiva al 9,5% (dentro il
  12% alto): `regola.titolo.dy = 5`. Telefono `scala 0.94, dy -10` per
  avvicinarlo al titolo e alzarne il fondo.
- **Tutorial, titoli sul filetto**: la cornice di carta disegna intestazione e
  filetto in alto proprio dove sta il titolo del tutorial, che ci finiva
  sopra. `regola.titolo = { dy 3.8, scala 0.72 }` in tutte e 4 le scene: ora
  sta pulito tra il filetto e il browser.
- **Passi controllati sui clic** (`--tempi` 4.82, 7.12, 9.42, 12.82, 15.12,
  17.42, 20.63, 22.58, 25.63, 27.58): ogni clic cade sull'elemento giusto
  (30 s, Facile, testo, 22 secondi, 59 parole/min, tasto "t", 60 parole/min,
  grafico, "spazio 1 volta", Nuova partita). Fumetti leggibili.

## Cosa resta

- **Promo, scena telefono**: il fondo del telefono arriva all'~88% dell'altezza,
  dentro il 20% basso. Lì c'è solo la cattura (timer e riquadro del testo),
  nessun testo nostro: accettato per non rimpicciolire troppo lo schermo.
- **Tutorial, filetto in basso sopra il browser**: la cornice di carta traccia
  il filetto inferiore (H − 5u) sopra il bordo basso del browser (che arriva a
  H − 3,5u). Linea sottile, ma passa sopra la cattura. Con `regola` non si
  sposta il browser del tutorial (solo `titolo`): da segnalare allo
  sviluppatore (cornice sotto il contenuto o riquadro del tutorial che rispetti
  i margini editoriali).
- **Titoli del tutorial piccoli** (~45 px su 1080) per lo stesso motivo: si
  leggono, ma con la correzione sopra potrebbero tornare a grandezza piena.
- Nella scena "2. Scrivi" lo spazio giallo dopo "nuota" si vede ma non viene
  nominato (rischio 2 dell'esploratore): non distrae.
