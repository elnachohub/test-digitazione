# CEO — giro di analisi 1 (6 novembre 2026)

Scritto senza i rapporti di designer, qa, marketing e legale (giro in
parallelo). Le decisioni qui sotto valgono finché quei rapporti non portano
un fatto che le smentisce. Prezzi della concorrenza indicativi, a memoria:
il marketing li verifichi prima della pagina di vendita.

## 1. Il prodotto visto da chi paga

Provato nell'editor (Chromium, 1440×900) e da riga di comando.

**Cosa convince**: dal Generatore rapido esce in meno di un minuto un promo
9:16 di 15 s pulito, con uno stile vero; un progetto vale 4 formati;
l'esportazione nel browser dà un MP4 da 3,7 MB in ~20 s, console pulita; in
serie 3 marche × 1 modello = 3 MP4 1080×1920 in 67 s (costo per video ~0).
Cattura del sito + squadra di agenti = dall'URL al video senza girare nulla:
il vero prodotto è questo, non l'editor.

**Cosa farebbe chiedere il rimborso**
1. Testi fissi che il cliente non ha scritto: etichetta "Novità", titolo
   "In 3 parole?", chiusura "Provalo adesso" (`js/modelli.js:69-72`). Per un
   forno è sbagliato, e "Novità" è un'affermazione inventata.
2. Senza schermata la scena del sito mostra un telefono finto a blocchi
   grigi: se esportato, il cliente pubblica un sito che non esiste.
3. Niente audio pronto: nessuna voce, nessuna musica con licenza. Il
   concorrente più povero ce l'ha.
4. Dati solo nel browser (IndexedDB): pulisci la cache e perdi tutte le
   marche dei clienti. Per un'agenzia è inaccettabile.
5. Il rendering in serie richiede Node + ffmpeg + Playwright: nessun cliente
   pagante lo installerà. Oggi il moltiplicatore lo può usare solo chi lo ha
   scritto.
6. Nessun modo di far vedere/approvare il video al cliente finale.

Conclusione: come software da vendere è a metà; come **macchina interna per
un servizio** è già pronta al 70%. Si vende la seconda.

## 2. Cliente ideale (uno)

**La piccola web agency italiana (2-10 persone) che gestisce 20-100 siti e
social di PMI locali.**
- Ha già sito, logo e testi di ogni cliente: il nostro input è gratis.
- Ha il problema "un modello × N clienti" che nessun concorrente risolve.
- Rivende il video al cliente a 200-500 €: noi a 50-150 € le lasciamo margine.
- Compra in modo ricorrente (ogni mese servono contenuti social) e decide in
  una telefonata (titolare = chi compra).

Non partiamo da PMI dirette (comprano una volta, Canva costa 12 €), freelance
(budget minimo) o aziende SaaS (voce e avatar: terreno di Synthesia/HeyGen).

## 3. Modello di business: prima il servizio, poi il software

**Fase 1 (mesi 0-4): servizio "video fatti dagli agenti", white-label per
agenzie.** Fattura + bonifico/Stripe, nessun account né server da costruire.
Incassiamo subito, impariamo quali video si vendono, e ogni ordine migliora
modelli e agenti.

**Fase 2 (da mese 4, solo con ≥10 agenzie paganti): software in abbonamento**
con account, marche nel cloud e rendering in serie sul server. Lo vendiamo
prima alle agenzie già clienti del servizio (vendita già fatta).

Non vendiamo l'editor come file da scaricare: è HTML statico, copiabile in
un minuto, nessuna licenza è difendibile.

Costo per video (stima): agenti 3-8 € di API, rendering ~0, controllo umano
finale 15-20 min. A 69 € il margine lordo resta sopra il 65%.

## 4. Prezzi e pacchetti (IVA esclusa)

**Servizio (fase 1)**

| Pacchetto | Contenuto | Prezzo |
|---|---|---|
| Prova | 1 sito → 2 video (promo 15 s + presentazione 30 s), 4 formati, 1 giro di modifiche, 48 h | **149 €** una tantum |
| Agenzia 10 | 10 video/mese su clienti diversi, white-label, 72 h, 1 giro di modifiche | **690 €/mese** (69 €/video) |
| Agenzia 30 | 30 video/mese, priorità 48 h, marche salvate, rendering in serie stagionale incluso | **1.490 €/mese** (~50 €/video) |
| Extra | voce italiana +39 €/video · tutorial d'uso fino a 60 s +79 € · giro di modifiche in più 29 € | |

La Prova si scala dal primo mese di abbonamento se l'agenzia firma entro 30
giorni. Contratto mensile, disdetta con 30 giorni: niente annuali finché il
prodotto non è stabile.

**Software (fase 2, da confermare con i dati della fase 1)**: Gratis 0 €
(1 marca, filigrana) · Studio 29 €/mese (1 utente, 15 marche) · **Agenzia
99 €/mese** (3 utenti, marche illimitate, 300 video in serie nel cloud, link
di approvazione), il piano da spingere. Annuale = 10 mesi.

**Obiettivo a 90 giorni**: 8 agenzie in abbonamento (≈5.500 €/mese
ricorrenti) + 30 Prove (≈4.500 € una tantum).

## 5. Primi 3 canali di vendita

1. **Contatto diretto con video-campione** (il canale principale). Lista di
   300 web agency italiane (Google Maps, LinkedIn, Clutch). A ognuna mandiamo
   un promo 9:16 *già fatto sul sito di un suo cliente* + link alla Prova.
   Atteso: 300 contatti → ~10% risposte → 10 Prove → 3-4 abbonamenti al mese.
   Il nostro costo per campione è di pochi euro: nessun concorrente può farlo.
2. **LinkedIn del titolare**: 3 post a settimana "dal sito al video", prima e
   dopo su siti veri (con permesso). Scalda le risposte al canale 1.
3. **Passaparola tra agenzie**: 1 mese di Agenzia 10 gratis a chi ne porta
   un'altra che paga. Le agenzie si conoscono tra loro (gruppi WordPress,
   WordCamp, community di freelance).

Niente pubblicità a pagamento finché un abbonamento non costa meno di 300 €
da acquisire con il canale 1.

## 6. Confronto onesto

| | Dove perdiamo | Dove vinciamo |
|---|---|---|
| **Canva** (~12 €/mese) | libreria infinita di modelli, foto, musica; collaborazione; marchio noto; prezzo | schermata del sito che scorre e tutorial col cursore; 4 formati da un progetto; un modello × N marche; il video lo facciamo noi |
| **CapCut** (gratis/~10 €) | montaggio di riprese, sottotitoli e voce automatici, effetti, gratis | non serve girare nulla: il materiale è il sito; formato agenzia (marche, serie, white-label) |
| **Animoto** (~15-40 €/mese) | foto e musica con licenza incluse, prodotto maturo | serie su più marche, tutorial, italiano, servizio chiavi in mano |
| **Synthesia / HeyGen** (~25-90 €/mese) | voce e avatar in decine di lingue, spiegazioni parlate | niente avatar finti; video di marketing del sito, non talking head; costo per video in serie |

Sappiamo che esistono già strumenti "URL → video" con IA (es. Pictory,
InVideo, Creatify): la funzione da sola non ci difende. Ci difende la
combinazione **agenzia italiana + serie su N marche + white-label +
controllo umano**. Su librerie, audio e lingue perdiamo e perderemo:
non inseguiamo, compriamo o integriamo il minimo indispensabile.

## 7. Le 5 cose da costruire per prime (proposta per `docs/roadmap.md`)

Ordinate per soldi; giorni di uno sviluppatore, da confermare con sviluppo.

| # | Cosa | Guadagno atteso | Costo |
|---|---|---|---|
| 1 | **"URL → 2 video" con un comando**: il regista lancia tutta la squadra (cattura, copione, verifica, 4 formati, `consegna.md`), max 20 min umani a ordine. Serve anche per i video-campione del canale 1 | rende vendibili tutti i pacchetti: senza, ogni ordine costa ore | 6-8 gg |
| 2 | **Niente testi o immagini inventati**: via "Novità", "In 3 parole?", "Provalo adesso" fissi (`js/modelli.js:69-72`); la schermata finta non si esporta; `render/verifica.js` blocca segnaposto e `{campi}` vuoti | meno giri di modifiche (~20 min l'uno) e nessun cliente perso per un video imbarazzante | 2 gg |
| 3 | **Pagina di vendita + ordine + pagamento** con Stripe Payment Links e un modulo (URL, obiettivo, logo, formati), senza server nostro | la Prova si compra senza telefonate: 30 Prove in 90 gg ≈ 4.500 € | 2-3 gg |
| 4 | **Pagina di consegna e approvazione white-label**: anteprima, "Approva" / "Chiedi modifica", download dei 4 formati | è ciò che l'agenzia gira al suo cliente; dimezza i tempi di approvazione e regge i pacchetti da 690-1.490 €/mese | 4-5 gg |
| 5 | **Audio pronto**: voce italiana sintetica dal copione + 10-15 brani con licenza di rivendita (approvata dal legale) | extra voce 39 €/video (~+15% di fatturato); toglie il primo "no" contro Canva/Animoto | 5-6 gg + 200-500 € licenze |

Totale ~20-24 giorni. **Rimandati** a dopo 10 agenzie paganti: account,
marche nel cloud, abbonamento software, render in serie sul server
(15-25 giorni). Prima si dimostra che il video si vende.

## 8. Rischi che possono ammazzare il progetto

1. **Video "da modello"**: se i promo si somigliano tutti, l'agenzia disdice
   al secondo mese. Revisore e controllo umano obbligatori; allarme se la
   disdetta mensile supera il 10%.
2. **Il servizio non scala**: oltre 30 min di persona a video il titolare si
   satura a ~100 video/mese e il margine sparisce. Misuriamo i minuti umani
   per ordine da subito.
3. **Diritti e affermazioni false**: musica senza licenza, loghi o foto di
   terzi, numeri e recensioni inventati. Una contestazione brucia il canale.
   Il contratto fa garantire all'agenzia i diritti sul materiale.
4. **I giganti aggiungono "dal sito al video"**: il software da solo diventa
   una funzione gratuita. Per questo si parte da servizio e relazione.
5. **Dati**: oggi le marche vivono nel browser; con il server arrivano GDPR,
   nomina a responsabile del trattamento, sicurezza. Da progettare prima.
6. **Costo e dipendenza dal fornitore di IA**: se il costo agenti per video
   triplica, il pacchetto da 50 €/video salta. Prezzo minimo sempre sopra 5
   volte il costo per video, controllato ogni mese.

## Prossimo passo

Quando arrivano i rapporti di designer, qa, marketing e legale: confermo o
correggo queste 5 priorità e le scrivo in `docs/roadmap.md`. Il legale deve
dire subito se il canale 1 (video sul sito di un terzo mandato senza
richiesta) è lecito così o va fatto solo su siti pubblici con disclaimer.
