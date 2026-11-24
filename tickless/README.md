# Tickless — assistenza clienti che si risolve da sola

Piattaforma di customer service per aziende digitali (SaaS, e-commerce, app),
pensata per il mercato internazionale: widget di chat da incollare su qualsiasi
sito, bot che risponde in 6 lingue, troubleshooter guidati, passaggio a un
operatore con riepilogo automatico, console per il team e analytics con il
risparmio in dollari.

> "Tickless" è un nome di lavoro: prima del lancio verificare marchio e dominio.

## Provalo subito (senza server)

Apri `demo.html` (il sito di un'azienda inventata, *Acme Cloud*) e in un'altra
scheda `console.html`. Scrivi nel widget come cliente, rispondi dalla console
come operatore: si sincronizzano in tempo reale. In questa modalità i dati
restano nel browser.

- `index.html` — landing page (inglese) con calcolatore ROI e prezzi
- `demo.html` — sito demo con il widget installato
- `console.html` — console del team

## Cosa c'è dentro

| Strumento | Dove |
|---|---|
| Motore di risposta locale (BM25 + glossario multilingue, gratis) | `core.js` |
| Risposte AI con Claude solo quando il motore locale è incerto (modalità ibrida) | `server/ai.mjs` |
| Troubleshooter guidati con editor visuale e anteprima | console → Troubleshooters |
| Passaggio all'operatore con riepilogo (intento, umore, cosa ha provato il bot, n. ordine) | `core.js` → `handoffSummary` |
| Rilevamento frustrazione in 6 lingue → escalation urgente | `core.js` → `sentiment` |
| Content gap: domande senza risposta raggruppate, articolo in un clic (bozza AI) | console → Knowledge |
| Modalità incidente: banner nel widget + il bot collega le domande correlate | console → Status |
| Agent assist: risposta suggerita, riassunto, traduci-e-invia, rifinitura, macro con `/` | console → Inbox |
| Anteprima di ciò che il cliente sta scrivendo | console → Inbox |
| Mascheramento automatico di carte e password | `core.js` → `redactPII` |
| Messaggi proattivi per pagina (pricing, billing…) | console → Widget & bot |
| Debugger del bot: vedi come legge un messaggio e cosa risponde | console → Knowledge → Test the bot |
| Analytics: risoluzione automatica, CSAT, primo tempo di risposta, SLA, heatmap, risparmio | console → Overview |

## Modalità server (team reale + AI)

Un solo processo Node, nessun database da gestire (i dati sono file JSON in `server/data/`).

```bash
cd tickless/server
npm install
export ANTHROPIC_API_KEY=sk-ant-...        # facoltativo: risposte AI + agent assist
export TICKLESS_ADMIN_TOKEN=un-segreto-lungo
npm start                                   # → http://localhost:8787/console.html
```

Snippet per il sito del cliente (se il widget è servito dal server Tickless
trova da solo l'API):

```html
<script src="https://IL-TUO-SERVER/widget.js" async></script>
```

Variabili: `PORT`, `TICKLESS_ADMIN_TOKEN`, `TICKLESS_DATA` (cartella dati),
`TICKLESS_SEED=empty` (parti senza dati demo), `TICKLESS_ALLOWED_ORIGINS`,
`TICKLESS_MODEL` (default `claude-opus-5-5`), `TICKLESS_EFFORT` (default `low`).

Sicurezza già fatta: ogni visitatore ha una chiave segreta e vede solo le sue
conversazioni; le note interne non lasciano mai il server; ogni operazione del
widget è validata (niente modifiche a impostazioni, knowledge base o chat
altrui); limiti di frequenza su operazioni e AI.

## Limiti attuali (da fare prima di vendere)

- Un solo workspace per server: per il SaaS multi-cliente serve un database
  (Postgres) e un workspace per azienda.
- Login operatori con token unico: servono account, ruoli e SSO.
- Canali: solo chat web. Email in arrivo e WhatsApp sono il prossimo passo.
- Fatturazione (Stripe) e onboarding self-service non ci sono ancora.
- Le risposte AI sono state verificate contro un finto server API, non contro
  Claude reale: va fatto un giro di test con una chiave vera.
