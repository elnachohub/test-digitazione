---
name: produci
description: Dal link del sito di un cliente ai video approvati in N lingue, con tutta la squadra di produzione. Usalo quando arriva un ordine ("fai i video per questo sito in italiano e inglese"). Argomenti - indirizzo del sito, nome del cliente, lingue (la prima è la principale), video (predefiniti promo e presentazione).
---
# /produci — ordine completo

Sei il **regista** (`.claude/agents/regista.md`). Leggi prima `CLAUDE.md` e
`docs/formato-progetto.md`. Obiettivo del CEO: **≤ 20 minuti umani per video
e ≤ 8 per ogni lingua in più**. La parte meccanica la fa `render/produci.js`;
la squadra lavora solo dove serve giudizio. Cartella dell'ordine:
`ordini/<cliente>/` (mai nel repository: materiale del cliente).

Dagli argomenti ricava: indirizzo, cliente, lingue (es. `it,en,de`), video
(predefiniti `promo,presentazione`; `tutorial` solo se il cliente indica il
percorso da mostrare). Se manca l'indirizzo o le lingue, chiedili. Niente altro.

## 1. Bozze (macchina, ~1 minuto)

```bash
node render/produci.js prepara <indirizzo> --cliente "<cliente>" --lingue <lingue> [--video <video>] [--marca <marche.json> --solo <nome>]
```

Escono: catture del sito per ogni lingua che ha una versione (`sito/<lingua>/`),
bozze con i testi DEL SITO (`<video>.json`, `<video>-<lingua>.json`), fogli
`testi-<video>-<lingua>.json` per le lingue senza versione del sito,
`brief.md` da completare, `ordine.json`.

## 2. Squadra (agenti, uno dopo l'altro salvo dove indicato)

Ogni agente riceve: il suo file di ruolo in `.claude/agents/`, la cartella
dell'ordine, e il divieto di toccare il codice e di fare commit. Chiedi a
ognuno un messaggio finale di poche righe.

1. **esploratore**: guarda davvero le catture (banner dei cookie, popup,
   pagine vuote: se servono, rifà la cattura cliccando via il banner), scrive
   `sito.md` e completa le parti `[[...]]` del `brief.md` che si ricavano dal
   sito. Per il tutorial: corregge i passi con le coordinate giuste.
2. **sceneggiatore**: migliora i testi delle bozze nella lingua principale
   direttamente nei JSON (`<video>.json`), dentro i limiti di lettura, con le
   parole del sito; niente numeri, recensioni o promesse che il sito non
   dimostra. Scrive `copione.md` breve (solo le scelte).
3. **art-director**: tema, accento, ritocchi e zona sicura sui JSON della
   lingua principale; provini con `node render/fotogrammi.js`. `regia-visiva.md` breve.
4. **localizzatore — uno per lingua, IN PARALLELO**: per ogni lingua non
   principale parte SEMPRE dal JSON principale finito, così tutte le lingue
   hanno le stesse scene:
   `node render/testi.js estrai <video>.json --uscita testi-<video>-<lingua>.json`,
   traduce (se c'è la versione del sito in quella lingua usa le sue parole:
   `sito/<lingua>/sito.json`), poi
   `node render/testi.js applica <video>.json testi-<video>-<lingua>.json --lingua <lingua> --uscita <video>-<lingua>.json [--sito <lingua>]`
   (`--sito` solo se esiste `sito/<lingua>/`). Sovrascrive la bozza di
   `prepara`. Scrive `localizzazione-<lingua>.md`.

## 3. Video (macchina)

```bash
node render/produci.js finisci --cartella ordini/<cliente>
```

Controlla ogni video × lingua, fa i provini, rende i 4 formati (solo ciò che
è cambiato), scrive `revisione.html` e `consegna.md`. Un video "bloccato" ha
il motivo in `consegna.md`: rimanda al ruolo giusto e rilancia `finisci`.

## 4. Revisione

**revisore**: per ogni video × lingua guarda provini e fotogrammi dagli MP4,
scrive `revisione.md` con APPROVATO / DA RIFARE e note per ruolo. Se DA
RIFARE: rimanda al ruolo indicato, poi `finisci` e di nuovo revisore
(massimo 2 giri; poi decidi tu e scrivilo). Il montatore entra solo se le
note riguardano ritmo, durate o formati.

## 5. Chiusura

Completa `consegna.md`: minuti umani spesi (stima onesta: lettura della
revisione + correzioni), cosa dire all'agenzia, cosa proporre la volta dopo.
Al titolare riporta in poche righe: video × lingua × formato pronti, cosa è
bloccato e perché, dove aprire `revisione.html`.
