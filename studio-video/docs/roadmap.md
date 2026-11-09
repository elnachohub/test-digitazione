# Roadmap — giro 2 (9 novembre 2026)

Decisa dal CEO (`docs/squadra/ceo.md`, strategia internazionale). Massimo 5 priorità, in ordine di soldi.
Il prodotto scrive una specifica per ognuna in `docs/specifiche/`; lo sviluppatore le fa una alla volta;
la QA le collauda sui criteri qui sotto. Giorni di uno sviluppatore, stime da confermare con lo sviluppo.

**Contesto**: si vende il servizio white-label alle web agency, prima in Italia (con i loro clienti
esportatori), poi nel Regno Unito dal mese 2 (test), in EUR, GBP e USD. Lingue promesse all'inizio: IT, EN,
DE, FR, ES, PT, NL (solo scrittura latina; niente arabo, ebraico, CJK).

**Già in corso, fuori dal conto**: motore con latin-ext e numeri per lingua, testi dei modelli tradotti,
editor in più lingue, attrezzo "un video × N lingue", ruolo `localizzatore`. Le priorità 1-4 lo usano.

---

## 1. "URL → video in N lingue" con un comando — 8-10 giorni

**Perché (soldi)**: oggi ogni ordine costa ore di persona; il servizio sta in piedi solo sotto i 20 minuti
umani per video e 8 per ogni lingua in più. Serve anche per i video-campione del canale 1 (Italia e UK) e
rende vendibili l'extra lingua (+39 €) e il pacchetto Export (199 €).

**Cosa**: il regista lancia tutta la squadra (esploratore → sceneggiatore → art director → montatore →
revisore) e poi il localizzatore per le lingue chieste nel brief. L'esploratore cattura anche le versioni
linguistiche del sito (link `hreflang`, `/en/`, `/de/`...); dove non esistono lo annota in `sito.md` e il
localizzatore usa scene senza schermata o la cattura sorgente dichiarata. `consegna.md` elenca video ×
lingua × formato, con i minuti umani spesi.

**Fatto quando**: da un URL e un elenco di 3 lingue escono i 2 video della Prova in 4 formati × 3 lingue,
senza interventi a mano tra un ruolo e l'altro; minuti umani misurati e scritti in `consegna.md`; provato su 3
siti veri, di cui uno con versione inglese.

## 2. Niente di inventato, in nessuna lingua, e controllo per lingua — 3-4 giorni

**Perché (soldi)**: un giro di modifiche costa ~20 minuti; una traduzione che aggiunge un'affermazione o un
testo che esce dal formato in tedesco fa perdere l'agenzia (e crea un rischio legale nel paese del cliente).

**Cosa**:
- via i testi di riserva "Novità", "In 3 parole?", "Provalo adesso" e "Inizia ora" (`js/modelli.js:71-74`):
  campo vuoto `[[...]]` come per numeri e recensioni, in ogni lingua dei modelli tradotti;
- `render/verifica.js` controlla ogni lingua: testi rimasti nella lingua sorgente, testi che escono dal
  fotogramma nei 4 formati, numeri, valute e date nel formato del paese, maiuscole corrette per lingua (turco
  i/İ, tedesco ß), glifi mancanti nel font (niente quadratini), nomi di marca e prodotto non tradotti
  (glossario della marca);
- il localizzatore scrive per ogni lingua l'elenco delle affermazioni (numeri, "gratis", "garanzia",
  superlativi) e `verifica.js` blocca se non sono le stesse della sorgente.

**Fatto quando**: la QA prova un video per ognuna delle 7 lingue promesse in 4 formati e 4 stili, senza
quadratini né testi fuori schermo; un copione con un "il migliore" aggiunto in traduzione viene bloccato.

## 3. Vendere in 3 valute — 3-4 giorni + avvocato e commercialista

**Perché (soldi)**: la Prova deve comprarsi senza telefonate, anche dall'estero: obiettivo 30 Prove in Italia
e 15 nel UK in 120 giorni (≈ 4.470 € + £1,935). Senza fatture corrette all'estero non si incassa.

**Cosa**: pagina di vendita in italiano e inglese (`docs/vendita/`, il marketing scrive l'inglese), con il
piè di pagina del legale e "Solo per aziende con partita IVA / VAT number". Modulo d'ordine: URL, obiettivo,
logo, formati, **lingue**, partita IVA/VAT controllata, casella di garanzia e manleva del legale. Stripe
Payment Links per Prova, Agenzia 10, Agenzia 30, lingua aggiuntiva ed Export in EUR, GBP e USD (listino in
`ceo.md` §4). Fatture: IVA 22% in Italia, inversione contabile UE e UK, fuori campo USA (diciture dal
commercialista). Nessun server nostro.

**Fatto quando**: un'agenzia italiana, una irlandese e una britannica di prova comprano la Prova nella loro
valuta e ricevono conferma e fattura giusta; nessun acquisto possibile senza partita IVA/VAT number.
Costi esterni: avvocato per condizioni e DPA in inglese (1.000-2.500 €, da preventivare).

## 4. Consegna e approvazione white-label per lingua — 5-6 giorni

**Perché (soldi)**: è ciò che l'agenzia gira al suo cliente e regge i pacchetti da 690-1.490 €/mese. Con le
lingue sposta l'approvazione di ogni lingua su chi la conosce (cliente, importatore, revisore madrelingua),
come dicono le condizioni, e dimezza i tempi di approvazione.

**Cosa**: pagina statica senza il nostro marchio, con il logo dell'agenzia: anteprima per lingua × formato,
"Approva" / "Chiedi modifica" per singola lingua con nota, download dei file approvati. Link non indicizzato
che scade (regola del legale). Interfaccia nella lingua del cliente finale tra quelle dell'editor.

**Fatto quando**: un video in 3 lingue si approva lingua per lingua da telefono; una richiesta di modifica
arriva al regista con lingua, formato e testo; nessun nostro nome nella pagina e nei file.

## 5. Audio: voce in 5 lingue e musica con licenza — 6-7 giorni + 300-800 € licenze

**Perché (soldi)**: voce +39 € a video, +19 € per ogni lingua in più (~+15% di fatturato); toglie il primo
"no" contro Animoto, Canva e i tool di doppiaggio, e rende l'Export molto più forte (5 lingue parlate).

**Cosa**: voce sintetica con licenza commerciale in IT, EN, DE, FR, ES dal copione di ogni lingua; la durata
delle scene segue la voce (il localizzatore già adatta le durate); 15 brani con licenza di rivendita letta
dal legale prima dell'acquisto (uso per clienti terzi, pubblicità a pagamento, perpetua, niente Content ID);
prova di licenza conservata per ogni video. Mai voci che imitano persone reali.

**Fatto quando**: il promo da 15 s esce con voce e musica in 3 lingue, sincronizzato, volume normalizzato,
licenze archiviate; il marketing può scrivere "voce in 5 lingue" in pagina.

---

**Totale**: 25-31 giorni. Ordine di lavoro: 2 e 1 insieme (la 2 è piccola e serve subito ai campioni), poi 3,
4, 5. La 3 può partire in parallelo perché non tocca il motore.

**Rimandati** (dopo 10 agenzie paganti): account, marche nel cloud, software in abbonamento con piani a
lingue, render in serie sul server, OSS/Stripe Tax per clienti senza partita IVA, campagna attiva negli USA,
assistenza in tedesco (arriva con il mercato DACH, dal mese 6).
