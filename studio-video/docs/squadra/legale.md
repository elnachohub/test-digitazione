# Legale — giro di analisi 1 (6 novembre 2026)

Non sono un avvocato: segnalo rischi e soluzioni e dico quando serve un professionista. Base: fase 1 = servizio
white-label per web agency (B2B), fase 2 = software in abbonamento (`ceo.md`). Letti: font/OFL-*.txt, package.json,
render/cattura-sito.js e render.js, js/archivio.js, editor.js, modelli.js, marca.js, docs/vendita/*.

## Rischi in ordine di gravità

**1. Numeri e recensioni finti già dentro il modello "Presentazione"** (alto, subito)
`js/modelli.js:21-22` mette di default "1200+ clienti soddisfatti", "4.9/5", "24h assistenza" e una recensione a 5
stelle di "Giulia R., Titolare, Studio Rossi"; `js/modelli.js:87-88` li inserisce in ogni presentazione, e la Prova
ne consegna una. Se uno passa, il cliente finale pubblica pubblicità ingannevole verso i consumatori (Codice del
Consumo artt. 20-23). Con l'Omnibus (D.Lgs. 26/2023) inventare recensioni, o spacciarle per reali senza verificarle,
è "in ogni caso ingannevole" (art. 23 bb-bis/bb-ter). Sanzioni AGCM fino a 10 mln €. Paga in prima battuta il
cliente finale, ma noi promettiamo "niente numeri o recensioni inventati": l'agenzia ci chiede i danni e la nostra
promessa diventa ingannevole verso di lei (D.Lgs. 145/2007). Stesso discorso per "Novità" fisso
(`js/modelli.js:69`) e per un copione IA che si inventa affermazioni.
- Azione: estendere la priorità 2 del CEO: scene Numeri e Recensione vuote di default, e `render/verifica.js`
  blocca la consegna se restano. Ogni numero o recensione del copione ha la sua fonte (URL o documento del cliente)
  in `sito.md`, e il revisore la controlla. Le recensioni non le scriviamo mai noi: nome dell'autore solo se
  autorizzato, altrimenti le iniziali. Niente "eco/sostenibile/green" generici: la dir. UE 2024/825 si applica dal
  27/9/2026 (recepimento italiano da verificare).

**2. Canale 1: email a freddo e WhatsApp** (alto, subito: risposta alla domanda 2)
- Email, SMS e WhatsApp di vendita richiedono il **consenso preventivo anche verso le aziende** (art. 130 Codice
  Privacy, esteso alle persone giuridiche nel 2012). Un indirizzo o un numero pubblicato sul sito non è consenso:
  lo dice il Garante (linee guida spam 4/7/2013), che considera marketing anche l'email che *chiede* il consenso.
  Il legittimo interesse B2B del GDPR non supera l'art. 130. Il soft spam (c. 4) vale solo per chi è già cliente.
- Quindi **l'email di `docs/vendita/messaggi.md` §1, inviata a freddo, tecnicamente non è lecita**. Il rischio
  pratico con 150 email personalizzate è basso-medio (serve un reclamo), ma un caso brucia il canale.
  **Il WhatsApp del §3 va tolto**: stesso articolo, e WhatsApp Business vuole comunque il consenso.
- **LinkedIn**: richiesta di collegamento e messaggio scritti a mano a profili professionali sono la strada più
  difendibile (nessuna decisione chiara del Garante: rischio basso). LinkedIn vieta l'automazione e lo scraping;
  anche la lista da Google Maps si fa a mano.
- **Telefonata con operatore** a un numero aziendale pubblicato: ammessa se il numero non è iscritto al Registro
  pubblico delle opposizioni (non sono sicuro di come il Registro tratti i numeri delle aziende: chiedilo
  all'avvocato). È il modo pulito per avere il consenso: "posso mandarle via email un video fatto sul vostro
  sito?" → sì → email. Annota data e nome.
- Per ogni canale la lista dei contatti è un trattamento GDPR (legittimo interesse): una breve valutazione scritta,
  l'informativa art. 14 linkata nel primo messaggio, la cancellazione al primo "no" e una lista di esclusione.
  Niente liste comprate, niente pixel di tracciamento nelle email.
- Azione: sequenza **LinkedIn → (telefonata) → email solo dopo il sì**; contenuti e comunità restano liberi. Se il
  CEO sceglie comunque l'email a freddo, la decide sapendo il rischio. Avvocato privacy: 1 ora prima di partire.

**3. Diritti nella catena white-label: siti, loghi, foto, persone** (alto: risposta alla domanda 1)
La catena è cliente finale → agenzia → noi. La cattura (`render/cattura-sito.js`, che accetta qualsiasi URL)
riproduce opere protette (testi, foto, grafica: L. 633/1941) e marchi, e nel video diventano pubblicità. È lecita
solo con il permesso del titolare del sito. Noi non lo conosciamo, quindi **l'agenzia lo garantisce per iscritto a
ogni ordine**. Punti critici dentro il sito "del cliente":
- foto di stock con licenza solo web: spesso escludono pubblicità e video, l'agenzia le verifica;
- volti di persone (staff, clienti): serve il consenso (art. 10 c.c., artt. 96-97 L. 633/41, GDPR); senza, li
  sfochiamo o li tagliamo;
- loghi di terzi (partner, "ci hanno scelto", "come visto su", i clienti nel portfolio dell'agenzia): fanno pensare
  a un'approvazione che non c'è (D.Lgs. 30/2005). Si tolgono;
- siti di concorrenti o di chiunque non sia il cliente: mai.
**Risposta al CEO**: un campione sul sito di un *cliente dell'agenzia*, mandato senza richiesta, usa sito e marchio
di un terzo che non ha dato il permesso per vendere il nostro servizio: **no**. Un campione sul **sito dell'agenzia
stessa**, mandato in privato all'agenzia, ha un rischio basso (lo vede solo il titolare del materiale): **sì**, a
queste condizioni: link non indicizzato che scade entro 30 giorni, senza i loghi dei suoi clienti né volti, mai
pubblicato (nemmeno su LinkedIn) senza un sì scritto. Per i post "prima e dopo" serve il permesso scritto del
**proprietario del sito**: quello dell'agenzia non basta.
- Azione: casella obbligatoria nel modulo d'ordine: "Sono incaricato dal titolare del sito e ho i diritti su testi,
  immagini, loghi e musica forniti o presenti nel sito; manlevo [NOME]". Il regista la controlla prima di lanciare
  l'esploratore. In `sito.md` l'esploratore annota volti, loghi di terzi e foto di stock che trova.

**4. Materiale dei clienti nel repository e dati al fornitore IA** (medio-alto)
`docs/produzione/<cliente>/` (brief, catture, logo, sito.json) è tracciato in git (`git ls-files`) su
`github.com/elnachohub/test-digitazione`, probabilmente pubblico (serve GitHub Pages). Per il nostro sito va bene;
per un'agenzia viola la riservatezza del white-label e, se ci sono persone, il GDPR. I ruoli per i dati personali
nel materiale (nomi nelle recensioni, foto dello staff, campo `note` delle marche, `js/marca.js:46`): il cliente
finale è **titolare**, l'agenzia **responsabile**, noi **sub-responsabili** (art. 28.4). Fornitore IA e hosting sono
nostri sub-responsabili: se sono negli USA servono il Data Privacy Framework o le clausole tipo; nei loro termini
commerciali/DPA vanno verificati conservazione e addestramento. Per i contatti e le fatture delle agenzie siamo
**titolari**.
- Azione: togliere `docs/produzione/` da git, o usare un repository privato, **prima del primo cliente vero**.
  Preparare un DPA standard allegato alle condizioni, con i sub-responsabili. Cancellare il materiale 90 giorni dopo
  la Prova, oppure 12 mesi dopo l'ultimo ordine per le marche in abbonamento.

**5. Musica e voce** (medio; alto con la priorità 5 del CEO)
Oggi solo brani dell'agenzia, coperti dalla garanzia del punto 3. La licenza dei brani da comprare deve dire per
iscritto: uso in video **per clienti terzi** con sublicenza ad agenzia e cliente finale; pubblicità anche a pagamento
sui social; perpetua per i video già fatti anche se l'abbonamento finisce; niente reclami Content ID (o modo di
toglierli). Niente repertorio SIAE/collecting. Musica IA: solo se il generatore concede i diritti commerciali (tutela
incerta). Voce sintetica: solo con licenza commerciale, mai imitazioni di persone reali.
- Azione: il legale legge la licenza prima dell'acquisto; per ogni video si conserva la prova di licenza.

**6. Marchio "Studio Video": non registrabile** (medio, costa di più ogni mese che passa)
Descrive il servizio: UIBM ed EUIPO lo rifiuterebbero (art. 13 CPI, art. 7.1 b-c RMUE) e non potremmo vietarlo a
nessuno. **Dalsito** è a sua volta descrittivo ("video dal sito"): rischio di rifiuto medio-alto (l'EUIPO valuta anche
l'italiano). **Moltiplo** e **Rullo** sono evocativi, più registrabili, ma parole comuni: possibili conflitti. Meglio
una parola inventata.
- Azione: ricerca su TMview, EUIPO eSearch, UIBM, registro imprese, domini e social; deposito UE classi 35, 41, 42
  (+9 se il software si scarica): 850 € 1 classe, +50 € la seconda, +150 € dalla terza. Consulente marchi per la
  ricerca (poche centinaia di €) prima di spendere in logo e dominio.

**7. AI Act e legge italiana sull'IA** (medio-basso, poco costoso)
Art. 50 Reg. 2024/1689 in vigore dal 2/8/2026 (il "Digital Omnibus" del 11/2025 prevede rinvii parziali: verificare).
50.2: chi fornisce un sistema IA che genera contenuti li marca in modo leggibile dalle macchine; vendendo "video fatti
da agenti IA" col nostro nome potremmo esserlo (forse ci copre l'esenzione "assistenza all'editing": incerto).
Rimedio: metadato/manifesto C2PA "creato con assistenza IA" senza il nostro nome (resta white-label). 50.4 (deepfake)
non si applica finché non simuliamo persone reali; 50.1: un agente che scrive alle agenzie dichiara di essere IA;
art. 4: formazione minima sull'IA, già obbligatoria. L. 132/2025: è protetto solo il frutto di lavoro umano, quindi
non promettiamo esclusive sui testi: cediamo "i diritti che esistono".

**8. ffmpeg, H.264 e AAC** (basso oggi, da rivedere in fase 2)
`render/render.js:124-128` usa libx264 e AAC: ffmpeg con x264 è GPL, ma usato sul nostro server come programma
separato non è distribuito, quindi nessun obbligo (in un installer servirebbero testo GPL e sorgenti, o la licenza
commerciale di x264). Brevetti (pool Via LA): i video gratuiti per l'utente non pagano sul contenuto; le royalty
toccano chi vende codificatori, con soglie esenti. Non so come trattino la codifica sul server per conto terzi: ai
nostri volumi il rischio è basso. Azione: nessuna in fase 1; prima del rendering in cloud, parere di un consulente
brevetti o AV1/Opus accanto all'MP4.

**9. Font OFL, Playwright, Chromium** (basso: in regola)
I 7 font sono OFL 1.1 **senza Reserved Font Name** (verificato): si vendono col software (non da soli), si convertono
in woff2; i video sono "documenti" esclusi dalla licenza, uso commerciale libero. Tenere licenze e copyright accanto
ai file anche con l'editor online. Playwright (Apache-2.0) e Chromium (BSD + terzi) sul nostro server: nessun
obbligo; `"license": "UNLICENSED"` va bene. In fase 2 pagina "Licenze di terze parti"; font in locale
(`css/font.css`), mai da Google Fonts.

**10. GDPR del software** (basso oggi, medio-alto in fase 2)
Oggi tutto in IndexedDB nel browser (`js/archivio.js`): non trattiamo i dati; niente banner (spazio tecnico richiesto
dall'utente, art. 122 Codice Privacy); informativa breve per gli IP dell'hosting. Fase 2: titolari per account e
pagamenti, responsabili per marche e progetti; DPA, registro, hosting **nell'UE** (Hetzner/OVH/Scaleway o regione UE
con DPF), cifratura, backup, violazioni notificate in 72 h, cancellazione a fine account, export (`.json` c'è già).
Come hosting, DSA: punto di contatto, segnalazioni (art. 16), regole nei termini. Analytics senza cookie; video demo
serviti da noi, non dal player di YouTube.

## Pagina di vendita (`docs/vendita/pagina.md`): cosa cambiare (domanda 3)

- Piè di pagina (art. 7 D.Lgs. 70/2003): ragione sociale, sede, P.IVA, REA, PEC o email, link a privacy, cookie e
  condizioni. Accanto al pulsante: **"Riservato a professionisti e aziende con P.IVA"**. Così "IVA esclusa" va bene
  e non scattano le regole per i consumatori (recesso di 14 giorni, prezzi IVA inclusa).
- "Niente numeri o recensioni inventati" e "una persona lo rivede": si scrivono solo dopo l'azione 1, e solo se la
  revisione umana c'è davvero su ogni video.
- Rimborso "se non si può pubblicare": definire per iscritto quando (errori nostri, non gusti).
- Citazioni delle agenzie fondatrici avute in cambio dello sconto: dichiararlo accanto ("con condizioni agevolate").
- FAQ diritti: "Testi, logo e immagini restano del tuo cliente. Ordinando ci confermi di avere il suo incarico e i
  diritti su ciò che ci mandi e che c'è sul sito; togliamo volti e loghi di terzi. Pagati, i video sono tuoi e del
  tuo cliente; modelli e motore restano nostri."
- FAQ dati: "Usiamo sito e materiale solo per i tuoi video, con fornitori vincolati da contratto. Siamo tuoi
  sub-responsabili (DPA allegato) e cancelliamo tutto entro [90 giorni / 12 mesi] o quando ce lo chiedi."

## Condizioni del servizio: punti essenziali (non è un contratto)

1. Rapporto B2B: video su ordine dell'agenzia; non contattiamo il suo cliente.
2. L'agenzia garantisce: incarico del cliente finale, diritti su sito, logo, foto, musica e dati, numeri e
   recensioni veri e documentabili; ci **manleva** dalle pretese di terzi.
3. Vietati: siti non autorizzati o di concorrenti, affermazioni che non si possono dimostrare. Settori regolati
   (farmaci, gioco, alcol, finanza) solo previo nostro sì.
4. Uso dell'IA dichiarato: agenti IA con revisione umana.
5. Chi approva e pubblica (agenzia e cliente finale) ha la responsabilità finale del contenuto.
6. Dopo il pagamento: cessione dei diritti economici sui video all'agenzia, trasferibili al cliente. Modelli, motore
   e stili restano nostri. Nessuna garanzia di tutela d'autore sulle parti fatte con l'IA.
7. White-label e riservatezza reciproca; i video nel nostro portfolio solo con un sì scritto.
8. Consegna 48/72 h da quando il materiale è completo. Un giro di modifiche, con la differenza tra modifica e
   rifacimento. Video non usati nel mese: [persi / spostati al mese dopo, decide il CEO].
9. Pagamento anticipato e fattura elettronica. Mensile con rinnovo automatico, disdetta con 30 giorni di preavviso.
   Aumenti di prezzo con 30 giorni di preavviso e diritto di recesso.
10. Responsabilità limitata a quanto pagato negli ultimi 3 mesi, salvo dolo o colpa grave (art. 1229 c.c.).
    Nessuna garanzia di risultati commerciali.
11. DPA art. 28 allegato. Sospensione per mancato pagamento o violazioni. Legge italiana, foro della nostra sede.
12. Clausole vessatorie (manleva, limiti di responsabilità, rinnovo tacito, foro): vanno approvate in modo specifico
    (artt. 1341-1342 c.c.). Online il semplice clic è contestato: firma elettronica o seconda accettazione
    separata. **Lo decide l'avvocato.**

## Quando serve un professionista

- **Avvocato** (indicativi 1.000-2.000 €, una tantum): condizioni, DPA e informative prima della prima Prova
  venduta; 1 ora sul canale 1 prima della prima email; la licenza musicale.
- **Consulente marchi**: ricerca e deposito, prima di scegliere il nome.
- **Commercialista**: forma giuridica, regime, fatturazione SDI, Stripe. IVA 22% alle agenzie italiane, inversione
  contabile per quelle UE (art. 7-ter). Se un giorno vendessimo ai consumatori UE, va chiarito se è un "servizio
  elettronico" (OSS), visto che le persone rivedono i video.
- **Broker**: RC professionale che copra anche la violazione involontaria di diritti di terzi (media liability).
