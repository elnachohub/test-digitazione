# Sito — Test di digitazione (esploratore)

Fonti: `sito/sito.json` (cattura del 2026-11-06 su `http://127.0.0.1:8790/index.html`),
le catture in `sito/` (guardate una per una), i testi dell'interfaccia in `testi.js`,
il `README.md` del test. Sito pubblico: `elnachohub.github.io/test-digitazione`.

## Cosa fa, per chi

**In una frase:** un test di velocità di scrittura sulla tastiera che fa copiare
"frasi di senso compiuto" in italiano o inglese, con un cronometro, e alla fine
mostra parole al minuto, precisione, un grafico e i tasti sbagliati.

**Per chi:** studenti, chi lavora al computer e chi vuole scrivere più veloce, in
italiano e in inglese (l'interfaccia cambia lingua con il mondo in alto a destra:
"Italiano / English").

## Vantaggi più forti (con le parole del sito)

1. **Si parte subito:** "Clicca qui e inizia a scrivere: il tempo parte al primo tasto."
   Durate "30 s · 60 s · 120 s", livelli "Facile · Medio · Difficile".
2. **Testi veri, non lettere a caso:** "Frasi di senso compiuto · tastiera QWERTY",
   in italiano e inglese; interruttori "Maiuscole e punteggiatura" e "Lettere accentate",
   tastiera "Italiana" o "Americana (US)".
3. **Risultato completo:** "parole/min", "battute/min", "precisione", "caratteri giusti",
   "record", più il grafico "Andamento della sfida" (Velocità, Errori, Fluidità secondo
   per secondo).
4. **Capisci dove sbagli:** "Errori per tipo", "Tasti più sbagliati", "Serie di parole
   senza errori" ("Un pallino per parola: verde se scritta senza nessun errore").
   Durante il test la tastiera sullo schermo evidenzia il prossimo tasto.
5. **Modalità Arcade (la sfida):** "Arcade: parti con 45 secondi. Ogni frase completata
   ti dà tempo, le frasi perfette di più." Con punti, moltiplicatore "×2 ×3 ×4" e serie.

Extra utili per il promo: profili per più persone sullo stesso browser e "Tabella sfida"
("I profili di questo browser, con le impostazioni attuali"): è una sfida tra chi usa
lo stesso computer, **non** una classifica online. Privacy, dal README: "Profili e
risultati restano solo nel tuo browser: il sito non ha un server e non raccoglie dati
personali."

## Prove vere

**Mancano.** Il sito non riporta numeri di utenti, recensioni, valutazioni o classifiche
mondiali. Le parole "gratis" e "senza registrazione" non sono scritte da nessuna parte
(né nel sito né nel README): non si vede nessun accesso o account, ma la frase non c'è.
Frase usabile e dimostrabile: "i tuoi risultati restano nel tuo browser" (README).
I numeri nelle catture (60 parole/min, 100%) sono di una nostra partita di prova
automatica: si possono mostrare come esempio di schermata, **mai** come prova o media.

## Colori, stile, tema

- **Accento del marchio:** `#d9622b` (arancione bruciato; unico candidato in
  `sito.json`, è anche `--accento` di `stile.css` e `theme_color` del manifest).
- Sfondo pagina `#f7f4ee` (crema), testo `#2b2a27`, schede bianche con bordo `#e2ddd3`,
  angoli arrotondati 12 px; caratteri di sistema senza grazie, testo da copiare in
  monospazio. Esiste anche un tema scuro automatico (`prefers-color-scheme`).
- **Tema Studio Video più vicino: `carta`** (sfondo `#f2ebdd` crema, accento `#d6461f`)
  con `"accento": "#d9622b"`. Il carattere `editoriale` di carta è più da rivista del
  sito: per il tono giocoso proverei `"carattere": "grottesco"` o `"pulito"` (scelta
  dell'art director).
- **Logo:** copiato in `sito/logo.png` (icona 512×512: tasto crema con "a" e cursore
  arancione su fondo `#d9622b`). Nel JSON: `"logo": "sito/logo.png"`.

## Catture disponibili (tutte in `sito/`)

| File | Misura | Cosa mostra |
|---|---|---|
| `computer-schermo.jpg` | 1440×900 | prima visita, nessun clic (vedi rischio 1: livello non evidenziato) |
| `computer-pagina.jpg` | 1440×1369 | pagina intera su computer, con "Punteggi di Giocatore 1" vuoti |
| `telefono-pagina.jpg` | 1170×4431 | pagina intera su telefono (senza tastiera disegnata) |
| `stato-1-scelte.jpg` | 1440×900 | Classica + **30 s** + **Facile** scelti, testo pronto, "Clicca qui e inizia a scrivere" |
| `stato-2-scrittura.jpg` | 1440×900 | test in corso: 22 secondi, 59 parole/min, 99%; testo scritto in nero, tasto "t" evidenziato, un errore di spazio in giallo |
| `stato-3-risultati.jpg` | 1440×900 | "Risultato": 60 parole/min, 304 battute/min, 100%, 151 caratteri giusti, record 60 + grafico |
| `stato-4-grafico.jpg` | 1440×900 | grafico "Andamento della sfida", "Errori per tipo", "Tasti più sbagliati", serie, "Nuova partita" |
| `logo.png` | 512×512 | icona del sito |

Gli stati 1-4 vengono dalla stessa partita (Classica, 30 s, Facile, maiuscole spente,
tastiera italiana), quindi testo e numeri sono coerenti tra loro. Script:
`/tmp/claude-0/-home-user-test-digitazione/261a504a-6831-58fc-9788-a92cfa78f0c8/scratchpad/esploratore/stati.js`
(viewport 1440×900, JPEG 85, non a pagina intera).

## Percorso del tutorial (passi con coordinate)

Coordinate `x`,`y` = centro dell'elemento in frazioni dell'immagine 1440×900,
misurate con `getBoundingClientRect()` / `innerWidth`, `innerHeight` nella stessa
sessione delle catture. Una scena `tutorial` = una sola immagine, quindi il percorso
è diviso in 3-4 scene (≥ 2,5 s a passo).

**Scena A — scegli (`sito/stato-1-scelte.jpg`)**

| Passo | Testo suggerito | x | y |
|---|---|---|---|
| 1 | Scegli la durata: 30 secondi | 0.311 | 0.270 |
| 2 | Scegli il livello: Facile | 0.475 | 0.270 |
| 3 | Clicca sul testo e inizia a scrivere | 0.500 | 0.645 |

Altri punti della stessa immagine: Classica 0.150,0.270 · Arcade 0.228,0.270 ·
60 s 0.355,0.270 · 120 s 0.401,0.270 · Medio 0.529,0.270 · Difficile 0.587,0.270 ·
lingua (mondo) 0.872,0.050 · scritta "Clicca qui e inizia a scrivere" 0.500,0.744.

**Scena B — scrivi (`sito/stato-2-scrittura.jpg`)** (la pagina scorre da sola e
inquadra testo e tastiera quando cominci)

| Passo | Testo suggerito | x | y |
|---|---|---|---|
| 1 | Il tempo parte al primo tasto | 0.193 | 0.043 |
| 2 | La velocità cresce mentre scrivi | 0.398 | 0.043 |
| 3 | La tastiera ti indica il prossimo tasto | 0.418 | 0.460 |

Altri punti: precisione 0.807,0.043 · cursore nel testo ~0.743,0.167 · errore di
spazio in giallo ~0.315,0.167 · area del testo 0.500,0.352.

**Scena C — risultati (`sito/stato-3-risultati.jpg`)**

| Passo | Testo suggerito | x | y |
|---|---|---|---|
| 1 | Le tue parole al minuto | 0.186 | 0.130 |
| 2 | Precisione e record | 0.500 | 0.130 |
| 3 | Il grafico secondo per secondo | 0.500 | 0.465 |

Altri punti: record 0.814,0.130 · titolo "Risultato" 0.500,0.057.

**Scena D (facoltativa) — dove sbagli e rigioca (`sito/stato-4-grafico.jpg`)**

| Passo | Testo suggerito | x | y |
|---|---|---|---|
| 1 | Vedi i tasti che sbagli | 0.500 | 0.623 |
| 2 | Le parole perfette di fila | 0.500 | 0.774 |
| 3 | Nuova partita: batti il record | 0.500 | 0.873 |

(Per il passo 1 si può puntare proprio a "Tasti più sbagliati": ~0.550,0.598.)

Durata indicativa: 4 scene × 3 passi × 2,5-3 s ≈ 30-36 s, dentro i 25-40 s del brief.

## Quali catture per quali scene

- **Promo 9:16:** scena `schermata` con `dispositivo: "telefono"` e
  `telefono-pagina.jpg` con `scorri: true` (pagina vera da telefono); in alternativa
  `stato-3-risultati.jpg` per mostrare il "60 parole/min" come esempio di risultato
  (senza dire che è una media o un record di qualcuno). Logo `sito/logo.png` in apertura
  e nella `cta`.
- **Tutorial 16:9:** scene `tutorial` A-D come sopra (stato-1 → stato-4). Una scena
  `schermata` `browser` con `computer-pagina.jpg` e `scorri: true` può servire come
  panoramica iniziale. **Non** usare `computer-schermo.jpg` per i passi (rischio 1).
- **Vantaggi (`punti`):** testi presi dalla sezione Vantaggi; nessun numero inventato.

## Rischi

1. **Difetto del sito alla prima visita** (visibile in `computer-schermo.jpg` e
   `computer-pagina.jpg`): nessun livello è evidenziato e l'interruttore "Maiuscole e
   punteggiatura" sembra spento, ma le frasi hanno maiuscole e punti. Causa in
   `app.js` riga 101: un commento `//` "inghiotte" `livello: "medio", punteggiatura: true,
   accenti: false`. Non tocca a noi correggerlo (sito del titolare): da segnalare. Per
   le catture degli stati ho cliccato Facile e acceso/spento l'interruttore, così
   schermata e testo sono coerenti (minuscole, interruttore spento).
2. **Stato 2 con un errore voluto:** lo spazio dopo "nuota" è evidenziato in giallo
   (errore minore). Utile per spiegare gli errori, ma va detto nel testo o ignorato.
3. **Numeri delle catture = nostra partita automatica**, non dati del cliente.
4. **Nessuna parola "gratis" / "senza registrazione"** nel sito: non usarle come
   citazione (vedi Prove vere).
5. **Telefono:** su mobile non c'è la tastiera disegnata e compare il pulsante
   "Ricomincia" solo al tocco; la cattura telefono è lunga (4431 px), serve `scorri`.
6. **Lingua:** l'interfaccia è in italiano nelle catture; esiste tutta in inglese
   ("Typing test", "Meaningful sentences · QWERTY keyboard") ma non ho catture in
   inglese. Nessun popup né pagine vuote; "Ancora nessun test: inizia a scrivere!"
   compare nei punteggi prima del primo test.
7. **Tema scuro automatico:** chi ha il sistema scuro vede il sito scuro, diverso
   dalle catture (chiare).
