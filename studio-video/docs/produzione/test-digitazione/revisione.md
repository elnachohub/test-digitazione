# Revisione — Test di digitazione (revisore)

Fonti: `brief.md`, `sito.md`, `copione.md`, `regia-visiva.md`, `montaggio.md`,
`promo.json`, `tutorial.json` e i due MP4 in `video/`. Ho guardato uno per uno
i fotogrammi estratti dagli MP4 (non dai provini): almeno uno per scena, il gancio
a 0,2 / 0,5 / 1,0 / 2,5 s, tutti i clic del tutorial e due sequenze a 0,4 s di
passo sulle scene tutorial, per vedere quanto resta a schermo ogni fumetto.

| Video | Esito |
|---|---|
| `promo` · 9:16 · `video/test-di-digitazione-promo-9x16.mp4` | **APPROVATO** |
| `tutorial` · 16:9 · `video/test-di-digitazione-tutorial-16x9.mp4` | **DA RIFARE** (una nota, si corregge in pochi minuti) |

## Controlli tecnici

| | promo | tutorial |
|---|---|---|
| `node render/verifica.js` | 4 scene, 19,5 s: "tutto a posto" | 7 scene, 39,9 s: "tutto a posto" |
| Durata (ffprobe) | 19,50 s (brief 15–20) | 39,93 s (brief 25–40) |
| Risoluzione | 1080×1920 | 1920×1080 |
| Codec | h264, yuv420p, 30 fps, 585 fotogrammi | h264, yuv420p, 30 fps, 1198 fotogrammi |
| Audio | nessuna traccia (giusto, il brief non vuole musica) | nessuna traccia |

---

## Promo 9:16: APPROVATO

- **Gancio:** a 0,5 s si legge già "Quanto sei", a 1,0 s c'è la domanda intera
  "Quanto sei veloce sulla tastiera?" con il logo e l'etichetta SFIDA. Fermo e
  leggibile fino a 2,5 s. È una sfida e non il nome del sito, come chiede il brief.
- **Zona sicura** (12% in alto = 230 px, 20% in basso = sotto 1536 px): titolo del
  gancio da 515 a ~1330 px; "Mettiti alla prova" e i tre punti da ~530 a ~1440 px;
  il titolo della schermata parte a ~280 px (14,6%); pulsante e indirizzo della cta
  a ~1390 px (72%). Nel 12% in alto c'è solo la testatina del tema ("TEST DI
  DIGITAZIONE", "01 / 04"), che è decorazione. Nel 20% in basso entra solo il fondo
  del telefono (fino all'88%), cioè la cattura, senza testo nostro: va bene.
- **Leggibilità:** titoli grandi, punti di ~50 px su 1080, indirizzo nella cta di
  ~40 px e scuro su crema: si leggono sul telefono. Niente di tagliato o sovrapposto.
- **Testi:** nessun refuso, accenti giusti ("più"), italiano naturale. I tre punti
  usano le parole del sito e si possono dimostrare (il tempo parte al primo tasto,
  frasi di senso compiuto in italiano o inglese, parole al minuto, precisione e
  tasti più sbagliati). "Classica o Arcade" è proprio la parte di pagina inquadrata
  all'inizio dello scorrimento.
- **Marca:** tema crema, accento #d9622b su etichetta, filetti, numeri e pulsante,
  logo vero in apertura e in chiusura. Coerente con il sito.
- **Invito:** "Apri il sito e fai il test adesso" + pulsante "Inizia il test", con il
  clic del cursore a ~16,8 s, e l'indirizzo `elnachohub.github.io/test-digitazione`
  leggibile fino all'ultimo fotogramma (19,4 s). È l'azione unica che chiede il brief.
- **Promesse:** niente numeri di utenti, recensioni, classifiche, "gratis" o
  "senza registrazione". Nessun numero delle nostre partite di prova nei testi.

Osservazioni che non bloccano (per la prossima versione, se c'è tempo):

1. Scena 3, 11,3–12,0 s: nel telefono la "isola" nera copre metà del nome
   "Test di digitazione" in cima alla pagina, finché lo scorrimento non lo porta via.
   Il nome si vede comunque in testatina e nel logo. *Art director:* far partire la
   cattura `telefono-pagina-corta.jpg` qualche decina di pixel più in basso, oppure
   lasciare un margine sopra lo schermo.
2. Scena 3: nella cattura del telefono nessun livello (Facile/Medio/Difficile) è
   evidenziato. È il difetto del sito alla prima visita (`sito.md`, rischio 1), non un
   errore del video. Va segnalato al titolare, come già detto dall'esploratore.

---

## Tutorial 16:9: DA RIFARE

Tutto il resto va bene, e lo scrivo così si tocca solo ciò che serve:

- **Gancio:** "Quanto sei veloce? Ecco come scoprirlo" è intero e leggibile a 1,0 s
  e ancora a 2,5 s.
- **Clic sui punti giusti** (fotogrammi a 4,82 / 7,12 / 9,42 / 12,82 / 15,12 /
  17,42 / 20,77 / 22,97 / 26,27 / 28,47 s): "30 s", "Facile", testo da copiare,
  contatore "22 secondi", "59 parole/min", tasto "t" evidenziato, "60 parole/min",
  grafico "Andamento della sfida", "spazio 1 volta" sotto "Tasti più sbagliati",
  pulsante "Nuova partita". Ogni fumetto corrisponde all'elemento cliccato.
- **Ingombri:** titoli a grandezza piena, puliti tra il filetto in alto e il browser;
  il browser resta sopra il filetto in basso; i fumetti non escono dal quadro.
- **Testi, marca, invito, promesse:** nessun refuso, accenti giusti ("più",
  "velocità"). Colori e logo coerenti con il promo. La cta "Ora tocca a te: quanto
  sei veloce?" + "Fai il test" con l'indirizzo leggibile fino a 39,8 s. I numeri
  60 / 304 / 100% compaiono solo dentro le catture, mai nei testi nostri.

### Note

1. **Scena 6 (`punti`), da 30,0 s a 35,7 s, titolo "In tre passi".** Il video ha
   appena mostrato quattro passi numerati: "1. Scegli la sfida", "2. Scrivi",
   "3. Guarda il risultato", "4. Capisci dove sbagli" (l'ultimo è finito a 30 s). Il
   riepilogo che arriva subito dopo dice "In tre passi". Chi guarda un tutorial nota
   la contraddizione, e un tutorial che si contraddice sui propri numeri sembra fatto
   in fretta: danneggia la credibilità del cliente proprio nel video che deve
   insegnare. È nato nel copione (`copione.md`, scene 2–6).
   - **Chi interviene:** sceneggiatore (testo), poi montatore (nuovo MP4).
   - **Correzione proposta:** cambiare solo il titolo della scena 6 da "In tre passi"
     a **"Ricapitolando"** e lasciare i tre punti così come sono. "Guarda velocità
     ed errori" riassume già i passi 3 e 4. Il titolo passa da 3 parole a 1, quindi
     la lettura scende a ~5,1 s e i 5,7 s bastano: la durata totale non cambia
     (39,9 s). Non consiglio "In quattro passi" con un quarto punto, perché porterebbe
     il video oltre i 40 s del brief. Dopo la modifica: `verifica.js`, nuovo render
     16:9 e un fotogramma a ~33 s per conferma.

Osservazioni che non bloccano (non chiedo di rifare per queste):

2. **Fumetti dei passi non finali brevi** (scene 2–5). Il motore li mostra pieni
   per circa 1,2–1,3 s: 0,55 × lo spazio di un passo, cioè 2,2–2,3 s. Le frasi sono
   di 4–6 parole, e la regola di lettura dello studio ne chiederebbe ~2 s. Si leggono
   perché il cursore e l'elemento cliccato dicono già la stessa cosa, e in un
   tutorial su YouTube si può mettere in pausa. Resta però il punto più debole del
   ritmo. *Montatore/sviluppatore, prossima versione:* allungare il fumetto nel motore
   (comparsa da q 0,45 a ~0,3), oppure dare +0,5 s alle scene 4 e 5 se si recupera
   tempo altrove.
3. **Scena 4, 20,77 s:** il fumetto dice "Parole al minuto e precisione", ma il
   cursore indica solo "60 parole/min" (la precisione 100% si vede subito a destra,
   nello stesso zoom). Si capisce lo stesso. Se lo sceneggiatore tocca comunque il
   testo per la nota 1, può accorciare il fumetto in "Le tue parole al minuto"
   (testo originale di `sito.md`), senza toccare le coordinate.
4. **Inizio scena 2, ~3,6–4,2 s:** lo zoom parte dall'angolo in basso a destra e
   passa sul testo da copiare prima di arrivare a "30 s". È un movimento del motore
   (il cursore parte sempre da 0,82 / 0,88), dura mezzo secondo e non confonde.
   Solo da segnalare allo sviluppatore.
