# QA: rapporto del giro di analisi (6 novembre 2026)

Tutto provato davvero: editor in Chromium (Playwright, contesto pulito con
IndexedDB vuoto) su `http://127.0.0.1:8782`, attrezzi da riga di comando,
MP4 controllati con `ffprobe`. Ogni bug ha i passi per riprodurlo. Quelli
segnati con **[test]** sono anche in `node test/collaudo.js --bug`: lì
falliscono finché nessuno li corregge.

**Totale: 0 bloccanti, 9 gravi, 16 minori.**

Il percorso principale funziona: generatore, scene, ritocchi, tutorial,
marche, apri/salva, ricarica, formati, esportazione dal browser (MP4 H.264) e
`render.js` (H.264, durata e risoluzione giuste). Durante questo percorso la
console è rimasta pulita. I problemi stanno nei dati reali dei clienti
(numeri, vantaggi, 6 punti, testi lunghi), nei JSON scritti a mano dalla
squadra e in qualche scorciatoia da tastiera.

---

## Gravi

### G1. Il generatore toglie i numeri all'inizio dei vantaggi e dei passi **[test]**
- Passi: Generatore rapido → Vantaggi: `24 ore su 24` / `100% biologico` / `3 mesi gratis` → Crea.
- Atteso: tre punti uguali a quelli scritti.
- Ottenuto: `ore su 24`, `% biologico`, `mesi gratis`. Con il modello Tutorial succede lo stesso ai passi: una riga come `1` sparisce.
- Sospetto: `js/modelli.js:38`. La regex `^[-•*\d.)\s]+`, pensata per togliere gli elenchi puntati, mangia anche le cifre.
- Proposta: togliere solo i veri marcatori di elenco (`^\s*(?:[-•*]|\d+[.)])\s+`).

### G2. Invio in un campo del generatore o della scheda marca equivale ad «Annulla» **[test]**
- Passi: Generatore rapido → scrivi il nome → premi Invio. Oppure: ★ Salva come marca → scrivi il nome → Invio.
- Atteso: il video viene creato e la marca viene salvata.
- Ottenuto: la finestra si chiude con `returnValue = "annulla"`. Non viene creato né salvato niente, e non compare nessun messaggio.
- Sospetto: `index.html:143` e `index.html:194`. Il primo pulsante submit del form è «Annulla», e l'invio implicito usa quello.
- Proposta: mettere per primo nel DOM il pulsante principale (e ordinarli con il CSS), oppure intercettare `submit` con `e.submitter`.

### G3. Con 6 punti (il massimo ammesso) la scena esce dallo schermo in 16:9 e 1:1 **[test]**
- Passi: scena «Punti di forza» → 6 righe brevi (`Uno` … `Sei`) → formato 16:9 o 1:1.
- Atteso: titolo e 6 schede dentro il fotogramma.
- Ottenuto: il titolo è tagliato in alto e la sesta scheda in basso. Il nome del marchio in basso a sinistra copre la sesta scheda. Succede nell'anteprima, quindi anche nell'MP4.
- Sospetto: `js/motore.js:1036-1043`. Ogni scheda è alta almeno `raggio*2 + pad*2` (12,4 u): con 6 schede si superano i 100 u della tela e il ciclo che rimpicciolisce il testo non può rimediare.
- Proposta: ridurre `raggio`, `pad` e `gap` insieme a `dim`, oppure usare due colonne quando i punti sono più di 4 nei formati orizzontali.

### G4. La scena Numeri mostra un altro numero: «1.200» diventa «1,200», «24/7» diventa «24» **[test]**
- Passi: scena Numeri → valore `1.200` (come si scrive in italiano) e valore `24/7`.
- Atteso: «1.200» e «24/7».
- Ottenuto: «1,200» (che in italiano si legge 1,2) e «24».
- Sospetto: `js/motore.js:1426-1428`. Con `parseFloat` il punto diventa separatore decimale e tutto quello che segue la prima parte numerica si perde.
- Proposta: se il valore non è un numero puro (`/^\d+([.,]\d+)?$/`), mostrarlo così com'è senza contatore; trattare il punto seguito da 3 cifre come separatore delle migliaia.

### G5. Un semplice clic di selezione cancella «Ripeti» **[test]**
- Passi: aggiungi una scena → Annulla (Ripeti si attiva) → clicca il titolo nell'anteprima per selezionarlo.
- Atteso: Ripeti resta disponibile.
- Ottenuto: Ripeti si disattiva e la modifica annullata non si recupera più. Succede anche cliccando un cerchio numerato del tutorial senza trascinarlo, o premendo la maniglia senza muoverla.
- Sospetto: `js/editor.js:963` (e `934`, `951`). `registraStoria(null)` svuota `storia.avanti` già sul pointerdown; `fineGesto` (`js/editor.js:1025`) toglie l'istantanea solo per «sposta» e non ripristina il ripeti.
- Proposta: salvare l'istantanea sul pointerdown ma registrarla nella storia solo al primo movimento reale.

### G6. `render.js` e `fotogrammi.js` ignorano `sfondo.immagine` con percorso relativo **[test]**
- Passi: scena con `"sfondo": { "tipo": "immagine", "immagine": "rosso.png", "velo": 0 }` e `rosso.png` accanto al JSON → `node render/render.js progetto.json`.
- Atteso: lo sfondo rosso nel video (`docs/formato-progetto.md` dice che `sfondo.immagine` può essere relativo al JSON, e `verifica.js` lo considera valido).
- Ottenuto: lo sfondo resta quello del tema, senza nessun avviso. Con la stessa immagine scritta come data URL funziona (pixel centrale 253,0,0 contro 36,62,242).
- Sospetto: `render/render.js:68-72`. `incorporaImmagini` converte `marchio.logo`, `immagine` e `logo`, ma non `sfondo.immagine`. La stessa funzione serve anche a `fotogrammi.js`.
- Proposta: aggiungere `if (s.sfondo && s.sfondo.immagine) s.sfondo.immagine = converti(s.sfondo.immagine);`.

### G7. `render.js` sovrascrive i video di progetti con lo stesso nome (anche `npm run esempi:video`) **[test]**
- Passi: `node render/render.js a.json b.json --formati 9:16`, con due progetti che hanno lo stesso `"nome"`.
- Atteso: due MP4.
- Ottenuto: un solo file (`corto-9x16.mp4`). Il secondo sovrascrive il primo, ma il comando scrive «2 video pronti». `esempi/promo.json`, `presentazione.json` e `tutorial.json` hanno tutti `"nome": "Prenotalo"`: `npm run esempi:video` (3 progetti × 4 formati) lascia 4 file invece di 12.
- Sospetto: `render/render.js:95-98` (`nomeFile` usa solo `progetto.nome`).
- Proposta: usare il nome del file JSON (come già succede con `--marca`), oppure aggiungere un suffisso se il file è già stato scritto in questa esecuzione.

### G8. Un JSON scritto a mano con un tipo sbagliato manda in errore editor, motore e `verifica.js` **[test]**
La squadra di produzione scrive i progetti a mano, quindi capiterà.
- Passi: Apri un progetto con `"punti": "una stringa"`, `"pulsante": 42`, `"autore": 7` oppure `"valori": [ {…}, null ]`.
- Atteso: il campo viene accettato (convertito in testo) o segnalato con un messaggio chiaro.
- Ottenuto:
  - editor: eccezioni `(sc[k] || []).join is not a function` (`js/editor.js:830`) e `Cannot read properties of null (reading 'prefisso')` (`js/editor.js:880`). Il pannello resta quello della scena precedente;
  - motore: `(sc.punti || []).filter is not a function` (`js/motore.js:1025`), `(sc.pulsante || "").trim is not a function` (`js/motore.js:1534`), stesso errore con `autore` e `ruolo` (`js/motore.js:1466-1467`);
  - `verifica.js` si ferma con lo stack trace `(sc.punti || []).forEach is not a function` (`render/verifica.js:62`) proprio sul file che dovrebbe controllare.
- Proposta: una `normalizzaProgetto()` condivisa (in `modelli.js`, che gira anche in Node), chiamata da `carica()`, `prepara()` e `verifica.js`: converte in stringa i testi, in array le liste e scarta i `null`.

### G9. Se il rendering si interrompe, resta un MP4 troncato che sembra buono
- Passi: `node render/render.js ps.json`, dove la seconda scena ha `"pulsante": 42` (vedi G8).
- Atteso: nessun file, oppure il file cancellato, e un errore chiaro con il nome della scena.
- Ottenuto: il comando esce con codice 1 e uno stack trace della pagina, ma su disco resta `ps-1x1.mp4`: H.264 valido, lungo 1,0 s invece di 2,0 s, che si apre senza problemi. Nella produzione in serie un video a metà può finire al cliente.
- Sospetto: `render/render.js:142-150` (nessun `try`: se `fotogramma` fallisce, ffmpeg chiude il file con quello che ha). Anche `render/render.js:171`: gli errori della pagina vengono solo stampati.
- Proposta: in caso di errore, chiudere ffmpeg e cancellare `destinazione`; scrivere su `*.tmp.mp4` e rinominare solo alla fine.

---

## Minori

### M1. Tutorial: dopo il clic che crea un passo, il cursore non va nel campo del testo
- Passi: scena Tutorial → clic nel browser dell'anteprima → scrivi `Clicca qui`.
- Atteso: il testo va nel nuovo passo (il codice prova a fare `focus()`).
- Ottenuto: il focus resta sul `body`. Il testo si perde e lo Spazio avvia la riproduzione.
- Sospetto: `js/editor.js:939-945`. Il `focus()` arriva durante il pointerdown e subito dopo il mousedown predefinito sposta il focus sul body.
- Proposta: `e.preventDefault()` nel pointerdown del tutorial, oppure `focus()` dentro `setTimeout(…, 0)`.

### M2. Ctrl+Z dentro un campo di testo annulla a livello di progetto e toglie il focus
- Passi: scrivi nel Titolo e premi Ctrl+Z senza uscire dal campo.
- Atteso: annulla le ultime lettere e il campo resta attivo.
- Ottenuto: torna all'istantanea precedente dell'intero gruppo di modifiche, il pannello viene ridisegnato e il cursore esce dal campo.
- Sospetto: `js/editor.js:1061` (Ctrl+Z gestito prima del controllo su `input, textarea`).
- Proposta: nei campi di testo lasciare l'annulla nativo; usare quello del progetto solo fuori dai campi o con i pulsanti.

### M3. Un solo «Annulla» annulla modifiche fatte su scene diverse
- Passi: Durata della scena 1 = 7 → seleziona la scena 2 → Durata = 8 (entro 1,2 s) → Annulla.
- Atteso: torna indietro solo la scena 2.
- Ottenuto: tornano indietro tutte e due.
- Sospetto: `js/editor.js:772` e `:819` (chiavi `durata`, `campo-<k>` senza indice di scena) con `js/editor.js:185`.
- Proposta: nella chiave mettere anche l'indice della scena.

### M4. Ctrl+Y funziona anche con una finestra aperta
- Passi: aggiungi una scena → Annulla → apri «Marche» → Ctrl+Y.
- Atteso: niente (Ctrl+Z con una finestra aperta è già bloccato).
- Ottenuto: la scena ricompare dietro la finestra.
- Sospetto: `js/editor.js:1066` (manca il controllo `dialog[open]`).

### M5. Import marche: le marche senza `id` si duplicano a ogni import, e un progetto viene accettato come marca
- Passi: Marche → Importa due volte `{"nome":"Bar Sport","tema":"cobalto"}`. Poi importa `esempi/presentazione.json`.
- Atteso: la seconda volta «0 nuove, 1 aggiornata»; un progetto rifiutato.
- Ottenuto: due «Bar Sport». Il progetto diventa una marca «Prenotalo» senza nessun avviso.
- Sospetto: `js/marca.js:39` (nuovo id a ogni lettura) e `js/marca.js:184` (accetta qualsiasi oggetto con `nome` o `tema`).
- Proposta: ritrovare le marche senza id per nome e sito; rifiutare gli oggetti che hanno `scene` come array.

### M6. Progetti vecchi o scritti a mano: «NaNs» nell'elenco e menu vuoti
- Passi: Apri un progetto con una scena senza `durata`, `"animazione": "rimbalzo"` e `"transizione": "spirale"`.
- Atteso: durata predefinita mostrata (il motore usa 3 s) e menu riportati ai valori predefiniti, come già succede per tema e carattere.
- Ottenuto: l'elenco mostra «NaNs»; i menu Animazione e Transizione restano vuoti e i valori sbagliati rimangono salvati nel progetto.
- Sospetto: `js/editor.js:518` e `:536`; `js/editor.js:1431-1432` normalizza solo tema e carattere.

### M7. Modifiche perse se si ricarica o si chiude entro mezzo secondo
- Passi: scrivi nel nome del progetto e ricarica subito (entro 0,5 s).
- Atteso: il nome nuovo.
- Ottenuto: torna l'ultimo nome salvato.
- Sospetto: `js/editor.js:221-226` (salvataggio ritardato senza `pagehide`/`beforeunload`).
- Proposta: salvare subito su `pagehide` e `visibilitychange`.

### M8. Un pulsante CTA lungo esce dallo schermo in 9:16
- Passi: CTA, pulsante `Prenota adesso la tua prova gratuita oggi`, formato 9:16.
- Atteso: testo che va a capo o si rimpicciolisce.
- Ottenuto: il pulsante è più largo della tela e il testo è tagliato a sinistra e a destra. Lo stesso vale per un indirizzo lungo sotto il pulsante.
- Sospetto: `js/motore.js:1537` (larghezza = testo misurato, senza limite).

### M9. Durata e stelle accettano valori fuori dai limiti
- Passi: Durata = `200`; Stelle = `-3`.
- Atteso: 60 s al massimo (l'input ha `max=60`); stelle tra 0 e 5.
- Ottenuto: durata 200 s (video di 3:44) e `stelle: -3` salvato nel progetto.
- Sospetto: `js/editor.js:772` e `:834`.

### M10. `render.js`: messaggi poco chiari quando qualcosa manca
- `--musica nonce.mp3` → stack trace `Error: ffmpeg è uscito con codice 254` (promessa rifiutata senza gestore, `render/render.js:135-150`). Nessun controllo che il file esista.
- Progetto con `"scene": []` → `Output file does not contain any stream … codice 234`.
- JSON rotto → `Errore: Expected property name… position 32` senza dire quale file.
- Proposta: controllare prima i file e le scene; nei messaggi indicare il nome del file.

### M11. `verifica.js` si ferma con lo stack trace invece di segnalare l'errore
- File inesistente, JSON rotto o tipi sbagliati (G8) → stack trace di Node (`render/verifica.js:28`, `:62`). Il codice di uscita 1 è giusto, ma il messaggio non dice al revisore cosa sistemare.

### M12. `fotogrammi.js` accetta un formato non valido e nomina i file a sproposito
- `--formato 3:2` → disegna in 16:9 ma scrive `corto-3x2-foglio.jpg`, con codice di uscita 0. `--tempi abc` → «0 provini», codice di uscita 0.
- Sospetto: `render/fotogrammi.js:51` e `:145` (nessuna validazione, al contrario di `render.js:52`).

### M13. `cattura-sito.js`: pagina da telefono senza limite d'altezza e testi dei cliccabili sbagliati
- Su una pagina alta 15.000 px: `computer-pagina.jpg` viene limitata a 1440×9000, mentre `telefono-pagina.jpg` esce 2940×46731 (troppo grande per l'editor, che taglia a 30.000 px).
- Sul sito di prova (`127.0.0.1:8790`): le caselle di spunta hanno come testo `"on"`; le `select` hanno tutte le opzioni attaccate (`"Italiano English"`, `"Italiana Americana (US)"`).
- Sospetto: `render/cattura-sito.js:108` (manca il `clip`) e `:52` (`e.value` delle checkbox, `innerText` delle select).

### M14. «+ Aggiungi passo» mette il nuovo passo sopra uno già esistente
- Passi: tutorial con 3 passi → elimina il primo → «+ Aggiungi passo».
- Ottenuto: il nuovo passo ha x 0,3 e y 0,62, cioè sopra il passo «Conferma con un clic».
- Sospetto: `js/editor.js:870` (posizione scelta in base al numero di passi).

### M15. Il generatore ricorda la schermata e i testi della volta precedente
- Passi: Generatore con una schermata caricata → Crea → Annulla (Ctrl+Z) → riapri il generatore.
- Ottenuto: la schermata del cliente precedente è ancora lì e finisce nel prossimo video se nessuno se ne accorge. Lo stesso succede scegliendo una marca e poi «Nessuna»: logo e testi della marca restano nel modulo.
- Sospetto: `js/editor.js:1178` (`datiGeneratore` non viene mai azzerato) e `:1193-1209`.

### M16. Nell'editor, un JSON della squadra con immagini relative non mostra le immagini
- Passi: Apri un progetto con `"logo": "logo.png"`.
- Ottenuto: errori 404 in console e immagini sostituite dal segnaposto. `docs/formato-progetto.md` dice che «l'editor lo apre con Apri» e consiglia proprio i percorsi relativi.
- Proposta: dopo l'apertura, avvisare quali immagini mancano e chiedere di trascinarle (oppure documentare il limite).

---

## Cosa ho coperto

- **Editor, schermo 1440×900**:
  - generatore con i 3 modelli, formati e temi, nome vuoto, Annulla, Invio, immagine 2400×12000 (ridotta a 2000×10000), dati presi da una marca;
  - scene: aggiungi tutti e 7 i tipi, sposta (anche oltre i limiti), duplica, elimina fino a una;
  - ritocco a mano: clic, trascinamento con aggancio, maniglia, campioni e selettore di colore, frecce con e senza Maiusc, Canc, Esc, occhio, «Rimetti a posto», «Azzera tutto», cursore della dimensione;
  - annulla e ripeti, da pulsanti e da tastiera, dopo ogni azione;
  - tutorial: clic per creare un passo, trascinamento di un passo, elimina e aggiungi dal pannello;
  - marche: salva come marca, aggiorna, scollega, applica, ricerca (nome e note), i 4 ordinamenti, duplica, esporta tutte e una sola, importa `esempi/marche.json` due volte, elimina, nuovo video da marca con contatore degli usi;
  - file: JSON rotto, senza scene, con tema `notte`, carattere, animazione e transizione inesistenti, tipi sbagliati, salva;
  - persistenza dopo la ricarica (anche con l'immagine grande);
  - cambio formato con annulla;
  - esportazione dal browser di 2,5 s in 16:9 e 9:16 (MP4 H.264 da 2,6 s, risoluzioni giuste), annullamento durante la registrazione, copertina PNG;
  - casi limite: testo lunghissimo senza spazi, emoji e accenti, 6 e 8 punti, pulsante e indirizzo lunghi.
- **Finestra da 700 px e iPhone 13**: niente scorrimento orizzontale, nessun comando fuori dallo schermo, generatore usabile, il tocco seleziona un elemento.
- **Riga di comando**:
  - `verifica.js`: su tutti gli esempi, con `--marca`, con file inesistente, JSON rotto e tipi sbagliati;
  - `fotogrammi.js`: con `--marca` e `--solo`, `--tempi` (anche fuori durata e non numerici), formato non valido, 0 scene;
  - `render.js`: un formato, `--tutti` con `--marca esempi/marche.json` (12 MP4 H.264 da 3,000 s, risoluzioni 1920×1080, 1080×1920, 1080×1080, 1080×1350), `--musica` (traccia AAC tagliata alla durata del video), musica più corta del video, file inesistenti, JSON rotti, formato non valido, `--solo` senza risultati, 0 scene, progetti con lo stesso nome, `sfondo.immagine` relativo;
  - `cattura-sito.js`: su `http://127.0.0.1:8790/index.html` e su una pagina locale alta 15.000 px.
- **Console**: ascoltati `pageerror` ed errori di console in ogni prova.
- **`test/collaudo.js`**: 13 flussi principali, tutti superati (circa 40 s, MP4 compresi). Con `--bug`, i bug G1-G8 risultano ancora aperti (8 su 8).

## Cosa non ho coperto

- Firefox e Safari (esportazione WebM, fallback MP4) e un iPhone vero: ho usato solo l'emulazione di Chromium, con il tocco e senza trascinamento.
- Musica nell'esportazione dal browser: ho registrato solo video senza audio.
- Due schede aperte insieme (IndexedDB condiviso, `onversionchange`) e spazio esaurito in IndexedDB.
- Progetti lunghi (oltre 60 s, molte immagini) per prestazioni e memoria; libreria con più di 48 marche («Mostra altre»).
- `cattura-sito.js` su siti esterni veri (rete, cookie banner, tempi di caricamento).
- Accessibilità (lettore di schermo, ordine del tab) e trascinamento di file da Esplora risorse e Finder sulle zone immagine.
