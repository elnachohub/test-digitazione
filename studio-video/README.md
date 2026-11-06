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
- **Temi, colore d'accento, 4 caratteri, 3 transizioni, logo, musica**.
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

Nel JSON le immagini possono essere data URL (come le salva l'editor),
indirizzi `https://` o percorsi di file relativi al JSON: così puoi generare
decine di video da modelli scritti a mano o da uno script.

## Struttura

```
studio-video/
├── index.html          editor
├── css/editor.css
├── js/
│   ├── motore.js       disegna un fotogramma all'istante t (cuore di tutto)
│   ├── modelli.js      tipi di scena e generatori dei 3 modelli
│   ├── archivio.js     salvataggio automatico (IndexedDB)
│   └── editor.js       interfaccia
├── render/
│   ├── render.js       rendering MP4 con Playwright + ffmpeg
│   └── pagina.html     pagina usata da render.js
└── esempi/             progetti d'esempio (rigenerabili: npm run esempi)
```

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
