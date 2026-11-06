# Copione — Test di digitazione (sceneggiatore)

Fonti: `brief.md`, `sito.md`, catture in `sito/` guardate una per una.
Tono: giocoso e sfidante ("quanto sei veloce?"), mai scolastico. Una sola
azione: **aprire il sito e fare un test adesso**.

**Come ho calcolato le durate.** Parole = pezzi separati da spazi (come
`render/verifica.js`, quindi anche "1." conta come parola). Lettura = 0,8 s +
1 s ogni 3,5 parole, arrotondata per eccesso. Nelle scene `tutorial` la durata
è il valore più alto tra lettura (titolo + tutti i passi) e 2,5 s × passi,
sempre arrotondato per eccesso. Nella `cta` conto titolo + pulsante.

**Cosa non c'è, di proposito.** Nessun numero di utenti, nessuna recensione,
nessuna classifica mondiale, niente "gratis" né "senza registrazione" (il sito
non lo scrive: vedi `sito.md`, Prove vere). Nessuna scena `numeri` o
`citazione`: i 60 parole/min delle catture sono una nostra partita di prova e
compaiono solo come schermata d'esempio, mai nei testi.

Marchio per entrambi i video: `"nome": "Test di digitazione"`,
`"url": "elnachohub.github.io/test-digitazione"`, `"logo": "sito/logo.png"`.
Tema e carattere li sceglie l'art director (proposta in `sito.md`: `carta`
con accento `#d9622b`). Musica: nessuna (brief).

---

## Video 1 — `promo` · 9:16 · 19 s

| # | Tipo | Durata | Testi esatti | Immagine | Nota per l'art director |
|---|---|---|---|---|---|
| 1 | `titolo` | 3 s | etichetta: **Sfida** · titolo: **Quanto sei veloce sulla tastiera?** (1 + 5 = 6 parole → 2,51 s → 3 s) | logo `sito/logo.png` | Gancio: la domanda deve essere leggibile già al primo secondo, animazione rapida (`scatto` o `sali`). Tutto il testo fuori dal 12% in alto e dal 20% in basso (zona sicura). |
| 2 | `punti` | 8 s | titolo: **Mettiti alla prova** · punti: **Il tempo parte al primo tasto** / **Frasi di senso compiuto, in italiano o inglese** / **Parole al minuto, precisione, tasti più sbagliati** (3 + 6 + 8 + 7 = 24 parole → 7,66 s → 8 s) | — | Tre punti in entrata uno alla volta. Sono parole del sito ("il tempo parte al primo tasto", "Frasi di senso compiuto", "parole/min", "precisione", "Tasti più sbagliati"). Se serve spazio, spostare il blocco con `regola.titolo.dy` per restare nella zona sicura. |
| 3 | `schermata` | 4 s | titolo: **Classica o Arcade: scegli la tua sfida** · testo: vuoto (6 parole → 2,51 s → 3 s di lettura, + 1 s perché la pagina lunga scorra) | `sito/telefono-pagina.jpg`, `dispositivo: "telefono"`, `scorri: true`, `url: "elnachohub.github.io/test-digitazione"` | La cattura parte dall'alto, dove si vedono davvero "Classica" e "Arcade": il titolo deve coincidere con quell'inizio. La pagina è alta 4431 px: se in 4 s scorre troppo in fretta, meglio fermare lo scorrimento a metà (fino a "Punteggi di Giocatore 1") che allungare la scena. Sul telefono il sito non disegna la tastiera: non scrivere nulla che la nomini. |
| 4 | `cta` | 4 s | titolo: **Apri il sito e fai il test adesso** · pulsante: **Inizia il test** · url: **elnachohub.github.io/test-digitazione** (8 + 3 = 11 parole → 3,94 s → 4 s) | logo `sito/logo.png` | `clic: true`. Il sito deve restare leggibile per tutta la scena, sopra il 20% in basso. Pulsante nel colore d'accento `#d9622b`. |

Totale: 3 + 8 + 4 + 4 = **19 s** (brief: 15–20 s).

---

## Video 2 — `tutorial` · 16:9 · 39 s

Le coordinate `x`,`y` vengono da `sito.md` (frazioni dell'immagine 1440×900,
misurate dall'esploratore). Ho controllato su ogni cattura che il punto cada
sull'elemento nominato nel passo.

| # | Tipo | Durata | Testi esatti | Immagine | Nota per l'art director |
|---|---|---|---|---|---|
| 1 | `titolo` | 3 s | etichetta: **Tutorial** · titolo: **Quanto sei veloce? Ecco come scoprirlo** (1 + 6 = 7 parole → 2,80 s → 3 s) | logo `sito/logo.png` | Apertura con la domanda di sfida, non con il nome. Niente sottotitolo: la scena deve restare entro 3 s. |
| 2 | `tutorial` | 8 s | titolo: **1. Scegli la sfida** · passi (sotto) (4 + 5 + 4 + 7 = 20 parole → 6,51 s; 3 passi × 2,5 = 7,5 s → 8 s) | `sito/stato-1-scelte.jpg`, `zoom: true` | Si vedono già scelti Classica, 30 s, Facile, interruttori spenti e "Clicca qui e inizia a scrivere: il tempo parte al primo tasto.": coerente con i passi. |
| 3 | `tutorial` | 8 s | titolo: **2. Scrivi** · passi (sotto) (2 + 6 + 5 + 7 = 20 parole → 6,51 s; 3 × 2,5 = 7,5 s → 8 s) | `sito/stato-2-scrittura.jpg`, `zoom: true` | Nella cattura lo spazio dopo "nuota" è giallo (errore minore voluto). Non lo nomino: se lo zoom lo mette troppo in evidenza, centrare lo zoom sui contatori e sulla tastiera. |
| 4 | `tutorial` | 5 s | titolo: **3. Guarda il risultato** · passi (sotto) (4 + 5 + 5 = 14 parole → 4,80 s; 2 × 2,5 = 5 s → 5 s) | `sito/stato-3-risultati.jpg`, `zoom: true` | I numeri (60 parole/min, 100%) sono di una nostra partita: si vedono nella schermata ma non vanno ripresi in nessun titolo o sovrimpressione. |
| 5 | `tutorial` | 5 s | titolo: **4. Capisci dove sbagli** · passi (sotto) (4 + 5 + 5 = 14 parole → 4,80 s; 2 × 2,5 = 5 s → 5 s) | `sito/stato-4-grafico.jpg`, `zoom: true` | Ultimo passo sul pulsante arancione "Nuova partita": il clic del cursore chiude il percorso e porta alla chiusura. |
| 6 | `punti` | 6 s | titolo: **Ricapitolando** · punti: **Scegli durata e livello** / **Scrivi: il tempo parte da solo** / **Guarda velocità ed errori** (3 + 4 + 6 + 4 = 17 parole → 5,66 s → 6 s) | — | Riepilogo, una riga per passo appena visto. Punti in entrata uno alla volta, ritmo regolare. |
| 7 | `cta` | 4 s | titolo: **Ora tocca a te: quanto sei veloce?** · pulsante: **Fai il test** · url: **elnachohub.github.io/test-digitazione** (7 + 3 = 10 parole → 3,66 s → 4 s) | logo `sito/logo.png` | `clic: true`. Riprende la domanda dell'apertura e chiude il cerchio. Sito ben leggibile. |

Totale: 3 + 8 + 8 + 5 + 5 + 6 + 4 = **39 s** (brief: 25–40 s).

### Passi dei tutorial (testi e coordinate)

**Scena 2 — `sito/stato-1-scelte.jpg`**

| Passo | Testo | x | y | Dove punta |
|---|---|---|---|---|
| 1 | Scegli la durata: 30 secondi | 0.311 | 0.270 | pulsante "30 s" |
| 2 | Scegli il livello: Facile | 0.475 | 0.270 | pulsante "Facile" |
| 3 | Clicca sul testo e inizia a scrivere | 0.500 | 0.645 | riquadro del testo da copiare |

**Scena 3 — `sito/stato-2-scrittura.jpg`**

| Passo | Testo | x | y | Dove punta |
|---|---|---|---|---|
| 1 | Il tempo parte al primo tasto | 0.193 | 0.043 | contatore "22 secondi" |
| 2 | Parole al minuto in diretta | 0.398 | 0.043 | contatore "59 parole/min" |
| 3 | La tastiera ti indica il prossimo tasto | 0.418 | 0.460 | tasto "t" evidenziato |

**Scena 4 — `sito/stato-3-risultati.jpg`**

| Passo | Testo | x | y | Dove punta |
|---|---|---|---|---|
| 1 | Parole al minuto e precisione | 0.186 | 0.130 | riquadro "parole/min" |
| 2 | Il grafico secondo per secondo | 0.500 | 0.465 | grafico "Andamento della sfida" |

**Scena 5 — `sito/stato-4-grafico.jpg`**

| Passo | Testo | x | y | Dove punta |
|---|---|---|---|---|
| 1 | Ecco i tasti più sbagliati | 0.550 | 0.598 | "Tasti più sbagliati: spazio 1 volta" |
| 2 | Nuova partita: batti il record | 0.500 | 0.873 | pulsante "Nuova partita" |

Passi rimasti fuori per stare nei 40 s (recuperarne uno porta il video a circa
42 s, oltre il brief: solo se il regista lo accetta): "Precisione e record" (stato-3, 0.500,0.130) e "Le parole perfette
di fila" (stato-4, 0.500,0.774). Ogni passo in più vale +2,5 s.

---

## Varianti (il cliente sceglie)

### Promo — gancio (scena 1, `titolo`, 3 s)

| | Etichetta | Titolo | Parole → durata |
|---|---|---|---|
| A (nel copione) | Sfida | Quanto sei veloce sulla tastiera? | 6 → 3 s |
| B | Sfida | Quante parole scrivi in 30 secondi? | 7 → 3 s |
| C | Sfida | Le tue dita sono davvero veloci? | 7 → 3 s |

(B usa la durata "30 s" che il sito offre davvero.)

### Promo — invito (scena 4, `cta`, 4 s)

| | Titolo | Pulsante | Parole → durata |
|---|---|---|---|
| A (nel copione) | Apri il sito e fai il test adesso | Inizia il test | 11 → 4 s |
| B | Il tempo parte al primo tasto | Mettiti alla prova | 9 → 4 s |
| C | Quanto sei veloce? Scoprilo adesso | Fai il test | 8 → 4 s |

### Tutorial — gancio (scena 1, `titolo`, 3 s)

| | Etichetta | Titolo | Parole → durata |
|---|---|---|---|
| A (nel copione) | Tutorial | Quanto sei veloce? Ecco come scoprirlo | 7 → 3 s |
| B | Tutorial | Primo test? Ecco come si fa | 7 → 3 s |
| C | Tutorial | Scegli, scrivi, scopri quanto sei veloce | 7 → 3 s |

### Tutorial — invito (scena 7, `cta`, 4 s)

| | Titolo | Pulsante | Parole → durata |
|---|---|---|---|
| A (nel copione) | Ora tocca a te: quanto sei veloce? | Fai il test | 10 → 4 s |
| B | Clicca qui e inizia a scrivere | Apri il test | 9 → 4 s |
| C | Scegli la sfida e batti il record | Inizia a scrivere | 10 → 4 s |

(B del tutorial riprende quasi alla lettera la frase del sito "Clicca qui e
inizia a scrivere".)

---

## Note per i ruoli successivi

- **Lingua:** il pubblico è anche inglese, ma tutte le catture sono in
  italiano; questi copioni sono solo in italiano. Una versione inglese
  richiede catture nuove (interfaccia "English").
- **Difetto del sito** (`sito.md`, rischio 1): nessuna scena usa
  `computer-schermo.jpg` o `computer-pagina.jpg`, quindi nel video non si vede.
- **Tema scuro:** chi ha il sistema scuro vede il sito scuro; le catture sono
  chiare. Nessun testo parla di colori, quindi non c'è contraddizione.
