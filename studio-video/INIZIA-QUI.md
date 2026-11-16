# Inizia qui

**Studio Video** fa video promozionali, presentazioni e tutorial per siti web,
in 4 formati (Reels/TikTok, YouTube, quadrato, feed) e in 8 lingue. Questa
cartella contiene tutto: l'editor, la squadra di agenti che produce i video
dal link di un sito, gli attrezzi, i documenti di strategia. È tua.

Ci sono tre modi di usarlo. Comincia dal primo.

---

## 1. Fare un video a mano — 2 minuti, niente da installare

1. Fai **doppio clic su `index.html`** (si apre in Chrome o Edge).
2. In alto premi **✦ Generatore rapido**, scegli il tipo di video, scrivi il
   nome del sito, lo slogan, 3 vantaggi e il testo del pulsante, carica (se
   vuoi) una schermata del sito e il logo, premi **Crea il video**.
3. Ritocca: clicca un elemento nell'anteprima e lo sposti, lo ingrandisci, gli
   cambi colore. A sinistra scegli tema, lingua del video, formato.
4. **Esporta video ↗** → scegli i formati → **Registra**: escono gli MP4.

Tutto resta nel tuo browser (niente account, niente server). Con **★ Marche**
salvi il look di un cliente e i suoi prossimi video nascono già sistemati.

## 2. Far fare tutto alla squadra — il modo per cui è nato

Serve **Claude Code** sul tuo computer (l'app desktop o il terminale).

1. Apri **questa cartella** (`studio-video`) in Claude Code.
2. La prima volta scrivi: **«Installa quello che serve per Studio Video»**
   (Node.js, ffmpeg e il browser Chromium per Playwright: Claude ti guida).
3. Poi scrivi semplicemente, per esempio:
   **«Fai i video per https://www.tuosito.it in italiano e inglese»**

Claude usa il comando `/produci` e la squadra che sono già in questa cartella
(`.claude/skills/produci` e `.claude/agents`): esploratore → sceneggiatore →
art director → localizzatori → revisore. Alla fine ti dice dove guardare:

- `ordini/index.html` — il **cruscotto** di tutti gli ordini;
- `ordini/<cliente>/revisione.html` — tutti i video da guardare e approvare;
- `ordini/<cliente>/consegna-agenzia/` — la pagina da mandare all'agenzia o al
  cliente (con il SUO nome, non il tuo), se chiedi **«prepara la consegna per
  l'agenzia Rossi»**.

Sul tuo computer la rete è libera: la squadra può aprire qualsiasi sito.

Il giro completo con le immagini è in `docs/come-funziona.md`.

## 3. A riga di comando — per chi la usa

Requisiti: Node.js 18+, ffmpeg nel PATH, poi una volta sola:

```bash
npm install
npx playwright install chromium
```

```bash
npm run produci -- prepara https://sito.it --cliente "Nome" --lingue it,en
npm run produci -- finisci --cartella ordini/nome
npm run produci -- consegna --cartella ordini/nome --agenzia "Agenzia"
npm run produci -- esito --cartella ordini/nome --file esito.txt
npm run render -- progetto.json --tutti          # un progetto in tutti i formati
npm run render -- modello.json --marca marche.json  # un video per ogni marca
```

---

## Metterlo in un tuo repository GitHub

1. Su github.com: **New repository** → nome per esempio `studio-video`,
   **Private**, senza README → Create.
2. In Claude Code, dentro questa cartella: **«Carica questa cartella nel mio
   repository studio-video»**.

## Cosa c'è dentro

| Cartella / file | Cosa |
|---|---|
| `index.html`, `css/`, `js/`, `font/` | l'editor (gira nel browser, anche offline) |
| `render/` | gli attrezzi: produzione dal link, MP4, controlli, traduzioni, consegna, cruscotto |
| `.claude/agents/` | i 14 ruoli della squadra (produzione video + azienda) |
| `.claude/skills/produci/` | il comando `/produci` |
| `docs/` | strategia (CEO), legale, marketing, pagina di vendita, roadmap, specifiche, guida |
| `esempi/` | progetti e marche d'esempio |
| `test/` | collaudo automatico e un sito di prova bilingue |
| `CLAUDE.md` | le regole che seguono gli agenti |

## Cosa non fa ancora

- I video sono **muti** (voce e musica con licenza sono in roadmap).
- Lingue da destra a sinistra e ideogrammi non sono supportati.
- La squadra non è ancora stata provata su molti siti veri: i primi ordini
  vanno guardati con attenzione (cookie banner, popup, siti lenti).
- Prima di vendere: condizioni di servizio scritte da un avvocato
  (`docs/squadra/legale.md`) e un nome registrabile al posto di "Studio Video".
