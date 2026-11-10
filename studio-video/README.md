# Studio Video

Crea in pochi minuti **video promozionali, presentazioni e tutorial** per siti
web, già impaginati per ogni formato: 16:9 (YouTube, sito), 9:16 (Reels,
TikTok, Shorts), 1:1 e 4:5 (feed). Niente server, niente abbonamenti: gira
nel browser, e un comando produce MP4 perfetti in serie.

## Cosa fa

- **Generatore rapido**: nome, slogan, 3 vantaggi, testo del pulsante →
  video già montato. Tre modelli:
  - *Pubblicità lampo* (~15 s): aggancio, vantaggi, schermata, invito.
  - *Presentazione del sito* (~30 s): titolo, schermata che scorre, punti di
    forza, numeri, recensione, invito.
  - *Tutorial d'uso* (~25 s): il cursore si muove e clicca i punti giusti
    della tua schermata, con zoom e fumetti numerati.
- **7 tipi di scena**: titolo, punti di forza, schermata (browser o telefono,
  con scorrimento della pagina intera), tutorial, numeri che contano,
  recensione con stelle, invito all'azione con pulsante cliccato.
- **Un progetto, tutti i formati**: l'impaginazione si adatta da sola.
- **4 linguaggi visivi** (non 4 sfumature dello stesso): *Pop* (colori pieni,
  contorni neri, ombre nette), *Editoriale* (carta, filetti, serif da
  rivista), *Griglia* (scuro tecnico, timecode, accento acido), *Sfumato*.
  9 temi, 7 caratteri inclusi, 5 animazioni del testo (scatto elastico,
  maschera, macchina da scrivere...), 3 transizioni, logo, musica.
- **Ritocco a mano di ogni dettaglio**: con l'anteprima in pausa clicchi un
  elemento (titolo, pulsante, schermata, numero...) e lo trascini (aggancio al
  centro), lo ingrandisci dalla maniglia, gli cambi colore o lo nascondi.
  Doppio clic = vai al suo testo. Frecce per spostamenti fini, Canc per
  nascondere, **Ctrl+Z / Ctrl+Maiusc+Z** per annullare e ripetere.
  Ogni scena può avere animazione e sfondo propri (colore o foto con velo).
  I ritocchi finiscono identici nel video esportato.
- **Database delle marche** (il kit di ogni cliente): sistemi un video come
  piace al cliente, premi *Salva come marca*, e da lì ogni nuovo video di
  quel cliente nasce con look, ritocchi, logo, slogan, vantaggi e pulsante già
  al loro posto. Ricerca, ordinamento, anteprime, duplica, note interne,
  import/export in `.json` (backup e passaggio tra computer).
- **Stampa unione**: nei testi di un modello scrivi `{nome}`, `{slogan}`,
  `{invito}`, `{sito}`, `{vantaggio1}`… (o `{vantaggi}` su una riga dei punti)
  e ogni marca ci mette i suoi.
- **Internazionale**:
  - video in 8 lingue (`it en es fr de pt nl pl`): numeri formattati per
    lingua (1.200 / 1,200 / 1 200), testi dei modelli già tradotti, caratteri
    con gli accenti dell'Europa centrale e dell'Est, cirillico e greco;
  - **moltiplicatore di lingue**: `render/testi.js` estrae i testi di un video
    in un foglio, si traducono (a mano, con un traduttore o con l'agente
    localizzatore) e si rimettono dentro: stesse immagini, stessi ritocchi,
    durate allungate da sole se la traduzione è più lunga;
  - interfaccia dell'editor in italiano e inglese (lingua scelta dal browser,
    cambiabile in alto); si aggiungono lingue con un dizionario.
  - Non ancora: lingue da destra a sinistra (arabo, ebraico) e ideogrammi.
- **Esporta** dal browser (MP4 su Chrome/Edge, altrimenti WebM) oppure da riga
  di comando (MP4 H.264 + AAC, fotogramma per fotogramma, compatibile ovunque).
- **Copertina PNG** dal fotogramma attuale (miniature YouTube, anteprime).
- Salvataggio automatico nel browser; progetti apribili/salvabili in `.json`.

## Usarlo

Doppio clic su `index.html`, oppure (consigliato) da un server locale:

```bash
cd studio-video
npm run avvia          # poi apri http://localhost:8000
```

Oppure pubblicalo su GitHub Pages / Netlify / qualsiasi hosting statico.

Consigli:
- Schermate: fai uno screenshot **a pagina intera** del sito (in Chrome:
  DevTools → Ctrl+Shift+P → "Capture full size screenshot"). Nella scena
  "Schermata" con *Scorri* attivo la pagina scorre dall'alto in basso.
- Tutorial: seleziona la scena, **clicca sull'anteprima** dove l'utente deve
  cliccare: nasce un passo. Trascina i cerchi numerati per spostarli.
- Musica: solo brani di cui hai i diritti (librerie royalty-free).

## MP4 da riga di comando (in serie)

Richiede Node 18+ e `ffmpeg` nel PATH.

```bash
cd studio-video
npm install                                  # installa Playwright
npx playwright install chromium              # solo la prima volta
npm run render -- mio-progetto.json --tutti  # 16:9, 9:16, 1:1, 4:5
npm run render -- a.json b.json c.json --formati 9:16 --musica brano.mp3 --uscita video/
```

**Un modello × tutte le marche** (il moltiplicatore): esporta le marche
dall'editor e lancia

```bash
npm run render -- modello.json --marca marche.json            # un video per marca
npm run render -- modello.json --marca marche.json --solo forno --tutti
npm run esempi:marche                                         # demo: 3 clienti, 3 video
```

**Dal link ai video** (un ordine intero, parte meccanica):

```bash
node render/produci.js prepara https://sito.it --cliente "Nome" --lingue it,en,de
#   bozze con i testi del sito in ogni lingua che ha una versione, fogli da tradurre per le altre
node render/produci.js finisci --cartella ordini/nome
#   controlli, provini, MP4 in 4 formati, revisione.html per approvare, consegna.md
```

In Claude Code il comando `/produci` fa lavorare la squadra di agenti tra i
due passaggi (testi, look, traduzioni, revisione). Poi:

```bash
node render/produci.js consegna --cartella ordini/nome --agenzia "Agenzia Srl"
#   pagina white-label per l'agenzia (video, formati, Approvato/Modifiche) + zip
node render/produci.js esito --cartella ordini/nome --file esito.txt
#   registra la risposta dell'agenzia; le modifiche tornano alla squadra
```

Il **cruscotto** di tutti gli ordini è `ordini/index.html`: fase, prossima
azione, video × lingua, valore, tempo macchina. Il giro completo, passo per
passo, è in `docs/come-funziona.md`.

**Un video × N lingue**:

```bash
node render/testi.js estrai promo.json --uscita testi-promo.json
# traduci il campo "testo" in testi-promo-en.json, poi:
node render/testi.js applica promo.json testi-promo-en.json --lingua en --uscita promo-en.json
npm run render -- promo.json promo-en.json --formati 9:16
```

Nel JSON le immagini possono essere data URL (come le salva l'editor),
indirizzi `https://` o percorsi di file relativi al JSON: così puoi generare
decine di video da modelli scritti a mano o da uno script.

## Struttura

```
studio-video/
├── index.html          editor
├── css/editor.css      interfaccia
├── css/font.css        caratteri inclusi
├── font/               file dei caratteri (licenza SIL OFL, vedi OFL-*.txt)
├── js/
│   ├── motore.js       disegna un fotogramma all'istante t (cuore di tutto)
│   ├── modelli.js      tipi di scena e generatori dei 3 modelli
│   ├── marca.js        logica delle marche e stampa unione (browser + Node)
│   ├── archivio.js     IndexedDB: progetto aperto + database marche (SV.marche)
│   ├── interfaccia.js  lingua dell'interfaccia (SV.t) · lingue-ui.js: dizionari
│   ├── editor.js       interfaccia
│   └── libreria.js     finestra delle marche
├── render/
│   ├── render.js       rendering MP4 con Playwright + ffmpeg
│   └── pagina.html     pagina usata da render.js
└── esempi/             progetti d'esempio (rigenerabili: npm run esempi)
```

Le marche passano solo da `SV.marche` (in `js/archivio.js`): per portarle su
un server con account basta un oggetto con gli stessi metodi che chiama le
API, senza toccare l'editor.

Il motore è una funzione pura del tempo: stesso progetto + stesso istante =
stessa immagine. Anteprima, esportazione dal browser e rendering MP4 usano lo
stesso codice, quindi ciò che vedi è ciò che esporti.

## Spostarlo in un repository tutto suo

La cartella è autonoma (nessun riferimento a file esterni). Due strade:

**Con la cronologia** (consigliata):

```bash
git clone https://github.com/elnachohub/test-digitazione.git
cd test-digitazione
git checkout studio-video
git subtree split --prefix=studio-video -b solo-studio-video
# crea su GitHub un repository vuoto, es. studio-video, poi:
git push https://github.com/<tuo-utente>/studio-video.git solo-studio-video:main
```

**Senza cronologia**: copia la cartella `studio-video/` nel nuovo repository
e fai il primo commit.

Poi elimina `studio-video/` da questo repository.
