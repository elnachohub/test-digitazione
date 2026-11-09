# Legale — giro 1 (6/11/2026), aggiornato il 9/11/2026 con i mercati esteri

Non sono un avvocato: segnalo rischi e soluzioni e dico quando serve un professionista. Base: fase 1 = servizio
white-label per web agency (B2B), fase 2 = software in abbonamento (`ceo.md`). Letti: font/OFL-*.txt, package.json,
render/cattura-sito.js e render.js, js/archivio.js, editor.js, modelli.js, marca.js, docs/vendita/*.

## Rischi in ordine di gravità

**1. Affermazioni non scritte dal cliente nei video** (alto; in parte risolto il 9/11)
Giro 1: il modello "Presentazione" metteva di default numeri e una recensione finti ("1200+ clienti soddisfatti",
"4.9/5", "Giulia R."). **Ora sono segnaposto `[[...]]`** (`js/modelli.js:23-24` e le altre lingue) e
`render/verifica.js:49` blocca la consegna se restano: bene. Restano i testi di riserva **"Novità"** e **"Provalo
adesso"** (`js/modelli.js:26` e i corrispondenti in EN/ES/FR/DE/PT/NL/PL; usati alle righe 184 e 187). "Novità"/"New"/
"Neu" è un'affermazione di fatto, e nel promo esce in ogni lingua se l'etichetta resta vuota. Il rischio resta anche
nei copioni scritti dall'IA. Base legale: pubblicità ingannevole verso i consumatori (Codice del Consumo artt. 20-23;
con l'Omnibus, D.Lgs. 26/2023, inventare recensioni o spacciarle per verificate è "in ogni caso ingannevole", art. 23
bb-bis/bb-ter; sanzioni AGCM fino a 10 mln €). La multa la prende il cliente finale, ma noi promettiamo "niente
inventato": l'agenzia ci chiede i danni (D.Lgs. 145/2007 tra imprese).
- Azione: priorità 2 della roadmap (via i testi di riserva, campo vuoto `[[...]]`). Ogni numero o recensione nel
  copione ha la fonte in `sito.md` e il revisore la controlla. Recensioni mai scritte da noi. Niente
  "eco/sostenibile/green" generici (dir. UE 2024/825, in vigore dal 27/9/2026; recepimento italiano da verificare).

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

## Mercati esteri (9/11/2026: Italia → UK + Irlanda dal mese 2 → DACH dal mese 6 → USA solo in entrata)

Valgono ovunque: il **GDPR si applica a noi** per ogni contatto, anche britannico o americano, perché siamo stabiliti
in Italia (art. 3.1). Servono la garanzia e la manleva dell'agenzia (rischio 3), la vendita solo B2B con VAT number
verificato e il pagamento anticipato. Le norme estere qui sotto le conosco meno di quelle italiane: dove scrivo
"verificare" serve un professionista del posto prima di partire.

### Regola contatti per paese (domanda: cosa è lecito)

| Paese | Email a freddo B2B | LinkedIn (a mano) | Telefono con operatore |
|---|---|---|---|
| **UK** | Lecita verso le **società** ("corporate subscribers": Ltd, LLP, PA), con mittente chiaro e opt-out (PECR reg. 22-23). **Non** verso ditte individuali e partnership: consenso | Rischio basso; l'ICO tratta i messaggi diretti come "electronic mail" e l'account è della persona: incerto | Lecito se il numero non è nel **CTPS/TPS**: controllare prima |
| **Irlanda** | Credo sia ammessa verso le società se il messaggio riguarda il ruolo e non c'è opposizione (S.I. 336/2011, reg. 13). **Non sono sicuro**: finché non lo verifica un legale irlandese, trattarla come l'Italia | Rischio basso | Ammesso salvo opposizione (verificare il registro nazionale) |
| **Germania** | **Vietata senza consenso preventivo esplicito, anche B2B** (UWG §7.2 n. 2). Rischio vero: **diffida (Abmahnung)** dei concorrenti, con spese a carico (spesso 1.000 €+) | Alcuni giudici trattano i messaggi XING/LinkedIn come email: rischio medio | B2B solo con consenso presunto concreto (§7.2 n. 1): rischioso |
| **Austria** | Vietata senza consenso, anche verso le società (TKG 2021 §174) | Rischio medio | Serve il consenso |
| **Svizzera** | Vietata la pubblicità **di massa** senza consenso (LCSl art. 3.1 lett. o); una sola email personalizzata probabilmente no. Incerto | Rischio basso | Lecito salvo l'asterisco "niente pubblicità" nell'elenco |
| **USA** | **CAN-SPAM** (opt-out, vale anche B2B): niente intestazioni o oggetti ingannevoli, il messaggio si dichiara pubblicitario, indirizzo postale, disiscrizione onorata entro 10 giorni lavorativi. Fino a ~53.000 $ **per email** | Lecito | Chiamate manuali a fissi aziendali lecite; cellulari, SMS e chiamate automatiche richiedono il consenso (**TCPA**, cause collettive costose): evitare |

- Azione: è la regola che il CEO chiede prima della prima email UK.
  - **UK**: email solo a indirizzi di società, controllate su Companies House; footer con dati aziendali e "reply STOP";
    lista di esclusione condivisa con l'Italia; controllo CTPS prima di telefonare.
  - **Irlanda**: per ora solo LinkedIn e telefono.
  - **DACH**: niente email né telefono a freddo; solo LinkedIn, contenuti, eventi e partner in Alto Adige.
  - **USA**: nessun contatto in uscita (come da roadmap); rispondere a chi scrive è sempre lecito.
- In UK cambia la legge: il **Data (Use and Access) Act 2025** porta le multe PECR al livello del UK GDPR (fino a
  17,5 mln £ / 4%) e riconosce il marketing diretto come legittimo interesse. Entra in vigore a fasi: verificare cosa
  vale al momento.
- **UK GDPR art. 27**: chi prospetta sistematicamente persone nel UK dall'estero deve probabilmente nominare un
  **rappresentante nel UK** (servizio da poche centinaia di £ l'anno). Da verificare con un solicitor.
- Svizzera: la nLPD richiede un rappresentante solo per trattamenti regolari e su larga scala, cioè non noi per ora.

### Testimonianze e affermazioni pubblicitarie (nei video dei clienti finali e nella nostra pagina)

- **UK**: il codice CAP, applicato dall'ASA, chiede prove documentali *prima* di pubblicare (regola 3.7), testimonianze
  vere e verificabili (3.45-3.52) e regole precise su "free" e sui confronti. Con il DMCCA 2024 (in vigore dal 6/4/2025)
  la CMA multa direttamente fino al 10% del fatturato mondiale, e recensioni false o con incentivo nascosto sono
  vietate in ogni caso. Verso le agenzie (B2B) valgono le BPR 2008.
- **Irlanda**: Consumer Protection Act 2022 (recepisce l'Omnibus) più il codice ASAI.
- **Germania**: UWG §5 (ingannevolezza), §5b c. 3 (informazioni su come si verificano le recensioni), allegato n.
  23b-c (recensioni false). I superlativi ("der Beste", "Nr. 1") richiedono la prova di un primato reale. Per i
  termini ambientali ambigui, come "klimaneutral", la spiegazione va nella pubblicità stessa (BGH I ZR 98/23, 2024).
  Claim di salute: HWG. Le diffide arrivano soprattutto dai concorrenti, molto più rapide di un'autorità.
- **Austria**: UWG con allegato analogo. **Svizzera**: LCSl art. 3 più la Commissione svizzera per la lealtà.
- **USA**: FTC Endorsement Guides (16 CFR 255, riviste nel 2023): un legame materiale va dichiarato. Dal 21/10/2024
  c'è la **Rule on Consumer Reviews and Testimonials** (16 CFR 465): vietate recensioni false (anche fatte con l'IA),
  comprate o di persone interne non dichiarate, con multe civili fino a ~53.000 $ per violazione. Le affermazioni
  vanno provate (FTC Act §5). Per l'uso di volti e nomi nella pubblicità ci sono le leggi statali sul right of
  publicity, più severe delle nostre: vale la regola "senza consenso si sfoca".
- **Per noi**: lo sconto fondatori (−20%) in cambio di citazioni va dichiarato accanto alla citazione in **tutti** i
  mercati (UK CAP, FTC 255.5, UWG). La pagina EN segue le stesse regole della pagina IT ("Business customers only").
- **Francia, se si promette il francese**: la loi Toubon impone il francese nella pubblicità rivolta al pubblico in
  Francia. Se il video francese mantiene slogan in inglese, servono la traduzione o il cliente lo approva sapendolo.

### IVA e tasse (da confermare col commercialista: io indico solo la logica)

- **UE B2B (Irlanda, Germania, Austria)**: luogo della prestazione = paese del cliente (art. 7-ter DPR 633/72).
  Fattura senza IVA, "inversione contabile", VAT number verificato su **VIES** e archiviato. In Italia: fattura
  elettronica via SDI con codice destinatario XXXXXXX ed elenchi Intrastat dei servizi (da confermare).
- **UK B2B**: stessa logica fuori UE: niente IVA italiana, il cliente applica il reverse charge britannico. Noi non
  ci registriamo in UK finché vendiamo solo ad aziende. Ci si registra **dal primo £** se vendiamo servizi digitali a
  consumatori o a chi non ha VAT number. Il VAT number si controlla col servizio HMRC.
- **Svizzera B2B**: il cliente paga l'imposta sui servizi acquistati dall'estero. Rischio di registrazione per noi
  basso alle soglie attuali (verificare).
- **USA**: per l'Italia l'operazione è fuori campo IVA. Si chiede il modulo **W-8BEN-E** al cliente se lo richiede. La
  **sales tax** è statale e scatta con il "nexus economico" (sentenza Wayfair 2018): di solito oltre 100.000 $ di
  vendite in uno Stato in un anno, e vale anche per chi vende dall'estero. I servizi fatti su misura spesso non sono
  tassati; il **SaaS** sì in circa metà degli Stati. Fase 1 inbound: in pratica nessun obbligo. Fase 2: monitorare
  per Stato con Stripe Tax; le agenzie che rivendono possono darci un certificato di rivendita.
- Tre valute: la fattura italiana indica anche il controvalore in € (cambio BCE del giorno, da confermare).

### Dati verso fornitori IA negli USA (vale per tutti i mercati)

- Se il fornitore è certificato **EU-US Data Privacy Framework** (verificare sul sito DPF, insieme a UK Extension e
  Swiss-US DPF), il trasferimento è coperto. Il DPF è stato confermato dal Tribunale UE nel 2025 (causa Latombe), ma
  può essere ancora impugnato.
- Piano B sempre pronto: **clausole contrattuali tipo 2021, modulo 3** (siamo sub-responsabili) più una breve
  valutazione d'impatto del trasferimento. Per i dati UK servono l'Addendum UK o l'IDTA.
- Nel DPA con le agenzie vanno elencati il fornitore IA, il paese e il meccanismo di trasferimento. Servono anche la
  conferma scritta che i dati non vengono usati per l'addestramento e una conservazione breve. Se il fornitore offre
  il trattamento in UE, conviene sceglierlo.
- **UK ↔ UE**: il UK considera adeguata l'UE e l'UE aveva prorogato e poi rinnovato l'adeguatezza del UK nel 2025.
  Verificare lo stato attuale. **Svizzera ↔ UE**: adeguatezza reciproca.

### Traduzioni che cambiano il senso (il rischio internazionale più grave, come dice il CEO)

Chi risponde verso il pubblico è il cliente finale, inserzionista nel suo paese. Chi risponde verso di lui è
l'agenzia, e l'agenzia si rivale su di noi. Una traduzione che aggiunge o rafforza un'affermazione ("garantito",
"gratis", "il migliore", "clinicamente", "senza rischi") crea una violazione **che nella lingua sorgente non c'era**:
quella è colpa nostra. In più cambiano le regole di settore: claim nutrizionali e salutistici (Reg. 1924/2006),
alcol (loi Evin in FR, regole UK e DE), cosmetici (Reg. 655/2013), finanza.
- Azione tecnica: la priorità 2 della roadmap. Elenco delle affermazioni per lingua identico alla sorgente; blocco se
  compare un superlativo, "gratis" o "garanzia" nuovi; glossario della marca con i nomi da non tradurre.
- Azione contrattuale:
  - la traduzione è fatta con l'IA e controllata, ed **è approvata lingua per lingua dall'agenzia o dal cliente**, che
    ne ha la responsabilità;
  - la "revisione madrelingua" a pagamento garantisce correttezza linguistica e fedeltà alla sorgente, **non la
    conformità alle leggi pubblicitarie del paese**: quella resta del cliente;
  - se l'errore è nostro (affermazione aggiunta o senso cambiato rispetto alla sorgente approvata), rifacciamo
    gratis e la responsabilità è limitata come al punto 10 delle condizioni;
  - i settori regolati (salute, alimenti con claim, alcol, finanza) li accettiamo in altre lingue solo con revisione
    madrelingua più una conferma scritta del cliente.

### Condizioni di servizio: aggiunte per l'estero

1. **Legge applicabile**: italiana (Reg. Roma I art. 3, libera scelta tra imprese), esclusa la Convenzione di Vienna
   sulla vendita internazionale (CISG). Con i clienti tedeschi, sotto legge tedesca il controllo delle condizioni
   generali (§307 BGB) sarebbe severo anche tra imprese: un motivo in più per la legge italiana.
2. **Foro**: tribunale della nostra sede, esclusivo.
   - UE: valido se accettato per iscritto o in forma elettronica durevole (Reg. 1215/2012 art. 25).
   - UK: riconosciuto in base alla Convenzione dell'Aja del 2005 sugli accordi di scelta del foro; dal 2025 il UK
     applica anche la Convenzione dell'Aja 2019 (verificare).
   - Svizzera: Convenzione di Lugano.
   - **USA**: nessun trattato. Meglio un **arbitrato** (Camera Arbitrale di Milano o ICC, sede Milano, lingua inglese,
     arbitro unico), eseguibile negli USA con la Convenzione di New York. Oppure, più semplice: solo pagamento
     anticipato, così non c'è credito da recuperare.
3. **Valuta**: EUR, GBP o USD fissati nell'ordine; commissioni bancarie e di cambio a carico di chi paga; prezzi IVA
   esclusa e al netto di ritenute (eventuali ritenute del paese del cliente sono a suo carico, con gross-up).
4. **Lingua del contratto**: versioni italiana e inglese; **prevale l'inglese** con i clienti esteri e l'italiano con
   quelli italiani. Assistenza in IT/EN (in tedesco dal mese 6), scritto nel contratto.
5. **Approvazione per lingua** e limiti della revisione madrelingua (sopra); glossario a carico del cliente.
6. **Conformità locale**: il cliente garantisce che il contenuto approvato rispetta le leggi pubblicitarie e di
   settore del paese in cui pubblica.
7. **Clausole vessatorie** (artt. 1341-1342 c.c.): sotto legge italiana valgono anche per i clienti esteri, quindi
   serve la stessa doppia accettazione nella versione inglese.
8. **Dati**: DPA in inglese con le clausole tipo/Addendum UK allegati e l'elenco dei sub-responsabili per paese.
9. **Sanzioni ed export**: niente clienti in paesi o liste sanzionati (UE, UK, OFAC): un controllo veloce del nome
   all'ordine.

### Marchio, assicurazione e altro fuori Italia

- Il marchio UE non copre UK e Svizzera. Servono il deposito **UK IPO** (online 170 £ la prima classe + 50 £ le
  successive) e, dal mese 6, quello **IPI svizzero**; oppure una domanda internazionale col sistema di Madrid basata
  sul marchio UE. USPTO solo quando gli USA diventano un mercato attivo. Il nome scelto va controllato anche per i
  significati in EN/DE/FR/ES (CEO §7).
- Polizza RC professionale/media: chiedere per iscritto l'estensione a UK, Irlanda e DACH. Gli **USA sono di solito
  esclusi**: finché lo sono, i clienti USA hanno un tetto di responsabilità più basso o non si accettano progetti
  regolati.
- Pagina "Legal notice" in inglese (e in tedesco dal mese 6): ragione sociale, sede, P.IVA/VAT, REA, contatti. Basta
  la legge italiana (D.Lgs. 70/2003, principio del paese d'origine), ma in Germania un'Impressum incompleta attira
  diffide.
- Musica (rischio 5): la licenza deve essere **mondiale**. Evitare i brani gestiti da PRS (UK), GEMA (DE), SUISA (CH)
  e ASCAP/BMI (USA).

### Professionisti locali: quando servono

- **UK** (prima della prima email, ~1-2 h): solicitor o consulente privacy per la regola PECR/CTPS, il DUAA e il
  rappresentante art. 27.
- **Irlanda** (prima di scrivere email): un'ora con un legale per la reg. 13 e il telefono.
- **Germania/Austria** (prima del mese 6): un Rechtsanwalt per Abmahnung, Impressum e pagina tedesca, più la verifica
  dei video tedeschi di settori regolati.
- **USA**: nessuno finché si lavora solo in entrata. Un avvocato prima di qualsiasi campagna (CAN-SPAM, TCPA,
  FTC) e un consulente per la sales tax prima del SaaS.
- **Commercialista italiano** (subito, priorità 3 della roadmap): diciture delle fatture estere, Intrastat, cambio,
  W-8BEN-E.
