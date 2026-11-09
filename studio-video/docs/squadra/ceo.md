# CEO — giro 2: strategia internazionale (9 novembre 2026)

Decisione del titolare: il prodotto diventa internazionale. Lo sviluppo sta aggiungendo video in ogni lingua a
scrittura latina (latin-ext, numeri per lingua, testi dei modelli tradotti), editor in più lingue e l'attrezzo
"un video × N lingue" con il ruolo **localizzatore**. Arabo, ebraico e CJK restano fuori. Letti i rapporti di
marketing, legale, qa, designer, sviluppo e `docs/vendita/pagina.md`. Prezzi dei concorrenti, dimensioni dei
mercati e cambi sono **a memoria, da verificare** (niente rete esterna).

## 1. Cosa cambia rispetto alla prima versione

| Tiene | Cambia |
|---|---|
| Prima il **servizio** white-label, poi il software (da ≥10 agenzie paganti) | Il servizio si vende in **3 valute** (EUR, GBP, USD), solo B2B con partita IVA/VAT number |
| Cliente ideale: la **piccola web agency** | Resta il bersaglio in ogni mercato; in più due canali: agenzie con clienti **esportatori/turismo** e agenzie di **traduzione** come rivenditori |
| Pacchetti Prova / Agenzia 10 / Agenzia 30 | Nuovo extra **lingua aggiuntiva** e pacchetto **Export**; listino fisso per valuta |
| Canale 1 = video-campione sul sito dell'**agenzia stessa** (legale) | In Italia: LinkedIn → telefonata → email dopo il sì (legale §2). Nel Regno Unito l'email B2B a società è probabilmente lecita: il canale 1 lì rende di più |
| Niente testi, numeri o recensioni inventati | Vale **in ogni lingua**: la traduzione non può aggiungere né rafforzare affermazioni |
| Le 5 priorità (pipeline, niente testi inventati, vendita, approvazione, audio) | Restano, ma tutte "per N lingue"; la pipeline include il localizzatore e la cattura del sito nelle sue lingue |
| "Su lingue perdiamo, non inseguiamo" | Corretto: su **voce e avatar** perdiamo ancora; sul **testo a schermo localizzato, per 4 formati e N clienti** possiamo vincere |
| Partenza dall'Italia | **Confermata**, con il Regno Unito come secondo mercato dal mese 2 (test con soglie di stop) |

Già fatto dallo sviluppo dal giro 1: 9 bug gravi della QA, numeri italiani ("1.200", "24/7"), segnaposto `[[...]]`
che bloccano numeri e recensioni finti. Ancora aperto: "Novità", "In 3 parole?", "Provalo adesso" come testi di
riserva (`js/modelli.js:71-74`): tradotti in 10 lingue diventano 10 affermazioni inventate.

## 2. Mercati e ordine

**Scelta: si parte dall'Italia e si allarga, non da un mercato in inglese.** Il servizio si regge sulla persona
che rivede ogni video: in italiano il titolare lo fa da solo, in inglese serve un revisore fluente; le condizioni,
il DPA e la fatturazione sono già pensati per l'Italia; i primi 10 casi si chiudono più in fretta dove abbiamo
rete. Ma l'internazionale entra dal giorno 1 in due modi: video in più lingue per le agenzie italiane, e pagine
in inglese pronte per il test nel Regno Unito.

| # | Mercato | Quando | Perché | Freno |
|---|---|---|---|---|
| 1 | **Italia** (agenzie) | subito | lingua del titolare, rete, legale già analizzato; migliaia di agenzie piccole (da verificare) | prezzi medi più bassi; email a freddo non lecita |
| 1b | **Italia → export** (clienti delle agenzie che vendono all'estero: vino, cibo, arredo, moda, hotel) | subito | stesso cliente, scontrino più alto; il bisogno "stesso video in EN/DE/FR" è reale e ricorrente | la qualità delle lingue va garantita (§6) |
| 2 | **Regno Unito** | test dal mese 2, a regime dal mese 4 | mercato agenzie molto più grande dell'italiano e abituato al white-label in outsourcing; prezzi pagabili più alti; email B2B a società ammessa con opt-out (PECR, da verificare); B2B fuori UE = niente IVA italiana né OSS | concorrenza fitta (Canva, Animoto, studi "explainer" white-label); assistenza in inglese; marchio UK separato dall'UE |
| 2b | **Irlanda** | insieme al UK | stesse pagine in inglese, euro, IVA UE con inversione contabile | mercato piccolo: si prende senza campagna dedicata |
| 3 | **Alto Adige → DACH** | dal mese 6 | ponte naturale: agenzie italiane che lavorano in IT+DE, turismo; poi Germania/Austria, il più grande esportatore UE, prezzi alti | email a freddo vietata anche B2B in Germania (UWG, da verificare); serve tedesco nell'assistenza |
| 4 | Francia, Spagna, Paesi Bassi, nordici | dopo il mese 9 | stesso modello e pagine tradotte dal nostro stesso attrezzo | prezzi più bassi in Spagna; un mercato alla volta |
| — | **USA** | solo clienti in entrata, a listino USD | il mercato più grande; caso forte EN+ES (pubblico ispanico) | costo di acquisizione alto, concorrenza enorme, polizza RC spesso esclude gli USA, sales tax del software (fase 2). Campagna attiva solo col software self-service |

**Soglie del test UK**: si parte quando la pipeline sta sotto i 20 minuti umani a video e c'è un revisore
inglese a chiamata. 100 campioni in 6 settimane: se escono meno di 3 Prove pagate, si ferma il UK e il tempo
torna su Italia ed export. Se escono 3 abbonamenti entro il mese 4, il UK diventa campagna fissa.

## 3. Cliente ideale per mercato

- **Italia**: invariato. Web agency di 2-10 persone con 20-100 PMI clienti. Domanda nuova al primo contatto:
  "Quanti tuoi clienti vendono o ospitano clienti dall'estero?". Chi ne ha 5+ è il cliente migliore.
- **Regno Unito / Irlanda**: digital agency di 2-15 persone che rivende già servizi white-label (SEO, PPC,
  siti). Il "N lingue" conta meno (vendono in inglese); si vende il **modello × N clienti** e il **white-label a
  prezzo fisso**. Eccezione: e-commerce britannici che vendono nell'UE.
- **DACH (dal mese 6)**: agenzie in Alto Adige, poi agenzie di turismo ed export in Austria e Baviera.
- **Fuori bersaglio ovunque**: PMI dirette, freelance senza portafoglio, SaaS che vogliono avatar. Gli
  e-commerce con vendite in più paesi UE li accettiamo se arrivano da soli (listino pieno), non li cerchiamo:
  arrivano meglio tramite agenzie Shopify/WooCommerce.
- **Nuovo canale da provare**: agenzie di traduzione. Ricevono richieste di "video tradotti", non sanno
  montarli; noi diventiamo il loro fornitore white-label e loro garantiscono la lingua. 5 contatti nel trimestre.

## 4. Prezzi

**Logica: prezzo unico per valuta, non parità di potere d'acquisto.** Il costo di un video (agenti IA + minuti
umani) è uguale ovunque e i mercati a basso potere d'acquisto non sono un bersaglio. Listino fisso e
arrotondato in ogni valuta (cambio indicativo 1 € ≈ 0,87 £ ≈ 1,15 $, da verificare il giorno della
pubblicazione), rivisto una volta l'anno o se il cambio si muove di oltre il 10%. Tutto IVA esclusa, solo B2B.

| | EUR | GBP | USD |
|---|---|---|---|
| Prova (2 video su un sito, 4 formati, 48 h) | **149 €** | **£129** | **$169** |
| Agenzia 10 (10 video/mese) | **690 €/mese** | **£590/mese** | **$790/mese** |
| Agenzia 30 (30 video/mese, 48 h, campagne) | **1.490 €/mese** | **£1,290/mese** | **$1,690/mese** |
| **Lingua aggiuntiva** (per video, 4 formati, controllo automatico, 1 giro di modifiche) | **+39 €** | **+£35** | **+$45** |
| Revisione madrelingua professionale (EN, DE, FR, ES) | +29 €/lingua | +£25 | +$35 |
| **Pacchetto Export**: 1 video in 5 lingue | **199 €** | **£175** | **$229** |
| Tutorial fino a 60 s · giro di modifiche in più | +79 € · 29 € | +£69 · £25 | +$89 · $35 |

Voce narrante: in listino solo quando esiste (priorità 5), proposta +39 € la prima lingua, +19 € le altre.
Software fase 2 (non in pagina): Studio 29 €/£25/$32, **Agenzia 99 €/£85/$109** con lingue illimitate;
lo Studio fa 2 lingue per progetto. Le lingue diventano il motivo per salire di piano.

Decisioni chieste dal marketing: **fondatori** −20% su Agenzia 10 per 12 mesi alle prime 10 agenzie italiane e
alle prime 5 UK, dichiarato accanto alle citazioni; **rimborso della Prova** sì, se il video non è pubblicabile
per errori nostri (non per gusti); video non usati spostati al mese dopo (massimo uno); kit marche salvati
anche in Agenzia 10; Agenzia 30 con 4 campagne l'anno su tutti i clienti; file di progetto non consegnato.

## 5. "Un video × N lingue": cosa vendiamo, a chi, quanto vale

**La promessa**: "Lo stesso video, nelle lingue dei clienti di tuo cliente, nei 4 formati, in 48 ore." Non
doppiaggio di una persona che parla (HeyGen, Rask, ElevenLabs lo fanno meglio, prezzi da verificare): video di
marketing con **testi a schermo adattati** (accorciati per stare nelle durate, numeri e valute del paese) e,
dove il sito ha le sue versioni (`/en/`, `/de/`), **le catture del sito in quella lingua**. Canva traduce i
testi di un disegno (da verificare nei piani attuali), ma non adatta durate, 4 formati, catture e 20 clienti in
serie, e non controlla che la traduzione non inventi nulla.

**A chi, in ordine**: (1) agenzie italiane con clienti esportatori e turismo: è il nostro primo argomento contro
Canva in Italia; (2) agenzie Shopify/WooCommerce con negozi che vendono in più paesi UE; (3) agenzie di
traduzione come rivenditori; (4) app e servizi che lanciano un tutorial in più mercati (tutorial col cursore in
5 lingue: nessuno lo fa in serie).

**Quanto vale per il cliente**: rifare a mano un video da 15 s in un'altra lingua e 4 formati costa 1-2 ore di
montaggio più la traduzione: 80-150 € di lavoro. A 39 € l'agenzia rivende la lingua a 70-120 €.
**Quanto vale per noi**: costo stimato per lingua 3-6 € (IA + 5-8 minuti umani di controllo), margine ~85%.
Se il 25% degli ordini italiani aggiunge in media 2 lingue, il fatturato per ordine sale di circa il 28%.
Obiettivo: lingue ed Export al **15% del fatturato a 90 giorni**, 25% a 6 mesi.

**Chi garantisce la lingua**: la traduzione esce da IA + localizzatore + controlli automatici; l'approvazione
per lingua spetta all'agenzia o al cliente finale (di solito il suo importatore o distributore la legge),
scritto nelle condizioni. Chi vuole la nostra garanzia compra la revisione madrelingua (partner o freelance).

## 6. Le 5 priorità del prossimo giro (dettagli in `docs/roadmap.md`)

| # | Cosa | Guadagno atteso | Costo |
|---|---|---|---|
| 1 | **"URL → video in N lingue" con un comando**: regista + localizzatore, cattura delle versioni linguistiche del sito, `consegna.md` per lingua | ≤20 min umani per il primo video, ≤8 per ogni lingua in più: rende vendibili pacchetti ed Export | 8-10 gg |
| 2 | **Niente inventato, in nessuna lingua, e controllo per lingua**: via i testi di riserva, `verifica.js` per lingua (testi rimasti in sorgente, testi che escono dal formato, numeri/valute, maiuscole locali, affermazioni identiche alla sorgente) | meno giri di modifiche; nessuna figuraccia in tedesco che fa perdere l'agenzia | 3-4 gg |
| 3 | **Vendere in 3 valute**: pagina IT + EN, modulo d'ordine (lingue, partita IVA/VAT controllata), Stripe in EUR/GBP/USD, fatture con inversione contabile | 30 Prove IT + 15 UK in 120 gg ≈ 6.700 € una tantum | 3-4 gg + avvocato |
| 4 | **Consegna e approvazione white-label per lingua**: lingua × formato, "Approva"/"Chiedi modifica" per lingua, nota per il revisore madrelingua | regge 690-1.490 €/mese; sposta l'approvazione della lingua su chi la conosce | 5-6 gg |
| 5 | **Audio**: voce sintetica in IT, EN, DE, FR, ES dal copione, durate guidate dalla voce, 15 brani con licenza | voce +39 €/+19 € a lingua (~+15%); toglie il primo "no" contro Animoto e i tool di doppiaggio | 6-7 gg + licenze |

In corso e fuori dal conto delle 5: motore e editor multilingua, attrezzo N lingue, ruolo localizzatore.
Rimandati dopo 10 agenzie paganti: account, marche nel cloud, software in abbonamento, render sul server.

## 7. Rischi

Dal giro 1, ancora validi: video tutti uguali (disdetta >10%/mese = allarme); servizio che non scala oltre 30
minuti umani a video; diritti su siti, loghi, volti e musica (garanzia e manleva dell'agenzia a ogni ordine);
"dal sito al video" copiato dai giganti; dati dei clienti tracciati in git (`docs/produzione/` va tolto prima del
primo cliente vero); costo del fornitore IA (prezzo sempre ≥5 volte il costo per video).

**Nuovi con l'internazionale**
1. **Traduzioni sbagliate o affermazioni che cambiano** (il più grave). "Gratis", "garanzia", "il migliore",
   claim di salute o ambientali hanno regole diverse in ogni paese (UK: codice CAP/ASA; USA: FTC; UE: dir.
   2024/825). Rimedio: priorità 2, approvazione per lingua scritta nelle condizioni, revisione madrelingua a
   pagamento, glossario della marca (nomi e prodotti non tradotti). Allarme se oltre il 10% delle lingue torna
   con correzioni.
2. **Fisco UE e IVA.** Solo B2B: partita IVA verificata su VIES, inversione contabile e, in Italia, elenchi
   Intrastat dei servizi (da verificare col commercialista). **Niente OSS finché non vendiamo a consumatori**: se
   in fase 2 il software si vende a chi non ha partita IVA, scatta l'IVA del paese del cliente (OSS sopra 10.000 €
   UE, da verificare) e nel UK la registrazione IVA dal primo euro. Rimedio: al checkout il VAT number è
   obbligatorio; Stripe Tax valutato in fase 2.
3. **Valuta.** Incassi in GBP/USD, costi IA in USD, costi umani in EUR. Rimedio: listino fisso per valuta, saldi
   tenuti in valuta, revisione annuale o a ±10%; commissioni di conversione Stripe (~1-2%, da verificare) già
   dentro il margine.
4. **Assistenza in più lingue.** Video in tutte le lingue latine, assistenza solo in **italiano e inglese**, in
   orario italiano, per iscritto. Lo diciamo in pagina. Il tedesco arriva con il mercato DACH, non prima.
5. **Contatto a freddo con regole diverse.** Italia e Germania: serve consenso anche B2B; UK: email a società con
   opt-out (non a ditte individuali); USA: CAN-SPAM con opt-out. Il legale scrive una regola per paese prima
   della prima email UK.
6. **Caratteri e lingue "latine" difficili.** Vietnamita (accenti sovrapposti), turco (i/İ nelle maiuscole dello
   stile Pop), tedesco (parole lunghe, +30% di testo), polacco e rumeno (ș, ț): un font OFL senza un glifo stampa
   un quadratino nel video. Rimedio: la QA prova un video per lingua coperta; promettiamo in pagina solo le lingue
   provate (EN, DE, FR, ES, PT, NL all'inizio).
7. **Legale e marchio fuori Italia.** Il nome va scelto inventato e controllato in EN/DE/FR/ES (nessun
   significato imbarazzante), depositato su EUIPO **e** UK IPO (separato dalla Brexit). Polizza RC: chiedere
   l'estensione a UK e verificare l'esclusione USA. Condizioni in inglese con legge italiana e pagamento
   anticipato (niente crediti da recuperare all'estero). Adeguatezza UK per i dati: da verificare.
8. **Dispersione.** Tre mercati e tante lingue con una persona sola: si apre un mercato nuovo solo quando il
   precedente rispetta le soglie (§2) e i minuti umani per video non salgono.

## Prossimo passo

Sviluppo: priorità 1 e 2 insieme (la 2 è piccola e serve a tutti i campioni). Marketing: pagina e messaggi in
inglese per il UK, lista di 100 agenzie UK e di 30 agenzie italiane con clienti esportatori. Legale: regola
contatti per il UK, condizioni e DPA in inglese, clausola "approvazione per lingua". QA: un video per ognuna delle
6 lingue promesse, nei 4 formati e nei 4 stili.
