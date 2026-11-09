# Studio Video — istruzioni per chi ci lavora (persone e agenti)

Software per creare video promozionali, presentazioni e tutorial per siti web,
da vendere a chi gestisce siti e clienti. Leggi `README.md` per le funzioni.

## Regole tecniche

- Codice e documenti interni in italiano: nomi, funzioni, commenti.
- Il PRODOTTO è internazionale:
  - interfaccia: le frasi scritte nel codice sono in italiano e passano da
    `SV.t("…")` (o da `elemento()` nell'editor, che traduce da solo); i
    dizionari sono in `js/lingue-ui.js`. Ogni frase nuova va tradotta:
    `node test/stringhe-ui.js` fallisce se manca una traduzione. Lingue
    dell'interfaccia = lingue in cui diamo assistenza (oggi it, en);
  - video: campo `lingua` del progetto (8 lingue in `SV.LINGUE`), testi dei
    modelli per lingua in `SV.TESTI` (`js/modelli.js`), numeri formattati
    dal motore secondo la lingua. Scrittura latina, cirillica o greca;
    destra-sinistra e ideogrammi non supportati.
- Editor senza dipendenze né build: HTML + CSS + JavaScript puro nel browser.
- `js/motore.js` è una funzione pura del tempo (stesso progetto + stesso t =
  stessa immagine). Anteprima, esportazione e MP4 usano lo stesso codice:
  non rompere questa proprietà.
- `js/marca.js` e `js/modelli.js` devono girare anche in Node (`render/render.js`).
- Le marche si toccano solo tramite `SV.marche` (`js/archivio.js`): è il punto
  da sostituire quando arriverà il server.
- Controlli rapidi prima di consegnare:
  - `node --check js/*.js render/render.js`
  - `npm run esempi` (rigenera gli esempi senza errori)
  - `npm run esempi:marche` (3 MP4 da un modello × 3 marche)
  - `node test/collaudo.js` (flussi principali, interfaccia in italiano)
  - `node test/stringhe-ui.js` (nessuna frase dell'interfaccia senza traduzione)
  - aprire l'editor con `npm run avvia` e provarlo nel browser (Playwright va
    bene: `require('playwright')`), console senza errori.

## Squadra di produzione video (quella che si vende)

Dal sito del cliente al video approvato. Ruoli in `.claude/agents/`, manuale
tecnico in `docs/formato-progetto.md`, lavoro in `docs/produzione/<cliente>/`.

| Ruolo | Consegna |
|---|---|
| `regista` | `brief.md`, coordina, `consegna.md` |
| `esploratore` | `sito/` (catture + `sito.json`), `sito.md` |
| `sceneggiatore` | `copione.md` |
| `art-director` | `<video>.json`, `provini/`, `regia-visiva.md` |
| `montatore` | ritmo e formati, `video/*.mp4`, `montaggio.md` |
| `localizzatore` | `<video>-<lingua>.json` dai fogli `testi-*.json`, `localizzazione.md` |
| `revisore` | `revisione.md`: APPROVATO o DA RIFARE con note |

Ordine fisso: regista → esploratore → sceneggiatore → art director →
montatore → revisore (→ ritorno al ruolo indicato, massimo 2 giri).
Più lingue: il video si chiude prima nella lingua principale del brief;
poi il localizzatore fa le altre lingue, il montatore le rende e il
revisore le approva una per una (madrelingua o revisione comprata dal cliente).
Attrezzi: `render/cattura-sito.js`, `render/verifica.js`,
`render/fotogrammi.js`, `render/testi.js`, `render/render.js`. Gli MP4 non vanno nel repository.

## Squadra dell'azienda

I ruoli sono in `.claude/agents/`. Ognuno ha un campo e non invade quello
degli altri.

| Ruolo | Fa | Scrive in |
|---|---|---|
| `ceo` | strategia, prezzi, priorità, decide la roadmap | `docs/squadra/ceo.md`, `docs/roadmap.md` |
| `prodotto` | trasforma le decisioni in specifiche con criteri di accettazione | `docs/specifiche/` |
| `designer` | interfaccia dell'editor e stili dei video | `docs/squadra/designer.md`; codice solo se incaricato |
| `sviluppatore` | implementa le specifiche, unico che modifica il codice condiviso | codice + `docs/squadra/sviluppo.md` |
| `qa` | collauda tutto nel browser vero, caccia bug, scrive test | `docs/squadra/qa.md`, `test/` |
| `marketing` | posizionamento, testi, pagina di vendita, video demo | `docs/squadra/marketing.md`, `docs/vendita/` |
| `legale` | licenze, diritti musica e immagini, privacy, contratti clienti | `docs/squadra/legale.md` |

### Come si lavora

1. **Giro di analisi**: designer, qa, marketing, legale e ceo lavorano in
   parallelo e consegnano il proprio rapporto. Nessuno modifica il codice.
2. **Decisione**: il ceo legge i rapporti e aggiorna `docs/roadmap.md` con le
   priorità (massimo 5 per giro, ognuna con il perché in termini di soldi).
3. **Specifiche**: il prodotto scrive una specifica per ogni priorità.
4. **Sviluppo**: lo sviluppatore implementa una specifica alla volta, con i
   controlli rapidi qui sopra.
5. **Collaudo**: la qa verifica i criteri di accettazione; se falliscono si
   torna al punto 4.

Rapporti brevi e concreti: problemi ordinati per gravità, con file e riga,
e una proposta per ognuno. Niente riassunti di ciò che il codice già dice.
