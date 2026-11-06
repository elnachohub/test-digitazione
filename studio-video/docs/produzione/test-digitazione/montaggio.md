# Montaggio — Test di digitazione (montatore)

Lavoro fatto sulla versione di `tutorial.json` senza i ritocchi ai titoli,
dopo la correzione del motore (commit 5ff1121). Nei provini del tutorial il
browser ora resta sopra il filetto in basso, e i titoli sono a grandezza piena
e non toccano il filetto in alto. I due punti della lista "Cosa resta" di
`regia-visiva.md` sono risolti.

## Cosa ho cambiato e perché

| Video | Scena | Prima → dopo | Perché |
|---|---|---|---|
| promo | 4 `cta` | 4 → **4,5 s** | Lettura 3,94 s più 0,5 s di chiusura. Prima, dopo il clic (a 2,1 s) restava poco tempo sul sito. Totale 19,5 s (limite 20). |
| tutorial | 4 `tutorial` "3. Guarda il risultato" | 5 → **5,5 s** | Con 2 passi il motore dava 1,95 s a passo: il fumetto restava a schermo circa 1 s e il secondo partiva insieme allo zoom indietro. Ora 2,2 s a passo (fumetto circa 1,2 s), quasi come le scene da 3 passi (2,3 s). |
| tutorial | 5 `tutorial` "4. Capisci dove sbagli" | 5 → **5,5 s** | Stesso motivo. |
| tutorial | 6 `punti` | 6 → **5,7 s** | Lettura 5,66 s (copione). Sono 3 punti di riepilogo di cose già viste, quindi bastano. Recupero 0,3 s per stare nei 40 s. |
| tutorial | 7 `cta` | 4 → **4,2 s** | Lettura 3,66 s più 0,5 s di chiusura. |

Tutorial: da 39 a **39,9 s** (limite 40). Non ho toccato gli altri tempi.
Promo: apertura 3 s (il titolo si legge già a 1 s), punti 8 s (lettura
7,66 s), telefono 4 s (lo scorrimento finisce verso 14 s, poi resta fermo su
"Punteggi di Giocatore 1"). Tutorial: apertura 3 s, scene da 3 passi 8 s.
Transizione: `dissolvenza` in tutte e due, la lascio così.

## Formati

- **Promo 9:16 e tutorial 16:9**: tengono. Il testo resta nella zona sicura e
  i clic cadono sugli elementi giusti. Ho riguardato i clic con `--tempi`:
  4.82, 7.12, 9.42, 12.82, 15.12, 17.42, 20.77, 22.97, 26.27, 28.47
  (`provini/tutorial-16x9-clic-foglio.jpg`).
- **Promo 4:5, non resa.** Nella scena 3 il telefono copre le lettere che
  scendono sotto la riga nella seconda riga del titolo, "scegli la tua sfida"
  (`provini/promo-4x5-14.45s.jpg`, `-12.20s.jpg`). Il motivo è che
  `regola.dispositivo` (dy −10) e `regola.titolo` (dy +5) sono pensati per la
  zona sicura del 9:16. In 4:5 avvicinano troppo i due elementi. Le altre
  scene in 4:5 vanno bene. Per farla servirebbe un JSON dedicato senza quei
  ritocchi: non l'ho forzata.

## Musica

Nessuna, come chiede il brief. Gli MP4 non hanno traccia audio.

## Controlli

- `node render/verifica.js`: promo (19,5 s) e tutorial (39,9 s) senza errori
  e senza avvisi.
- `ffprobe`:
  - promo: h264, yuv420p, 1080×1920, 30 fps, 585 fotogrammi, 19,50 s.
  - tutorial: h264, yuv420p, 1920×1080, 30 fps, 1198 fotogrammi, 39,93 s.
    C'è un fotogramma in più per l'arrotondamento: resta sotto i 40 s.
- Ho estratto fotogrammi dagli MP4 con `ffmpeg -ss`:
  - promo a 1.05, 10.45, 14.45 e 18.95 s;
  - tutorial a 2.45, 10.45, 22.97, 28.47, 35.15 e 39.35 s.

  Li ho confrontati con i provini agli stessi istanti e coincidono.

## File prodotti

- `video/test-di-digitazione-promo-9x16.mp4`: 19,5 s, 1080×1920 (ignorato da git).
- `video/test-di-digitazione-tutorial-16x9.mp4`: 39,9 s, 1920×1080 (ignorato da git).
- `provini/`: rifatti sulle durate nuove: fogli `promo-9x16`, `promo-4x5`,
  `tutorial-16x9` e `tutorial-16x9-clic`.
- `promo.json`, `tutorial.json`: solo le durate qui sopra.
