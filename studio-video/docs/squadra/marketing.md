# Marketing — giro 2: Italia + lingue, Regno Unito (9 novembre 2026)

Allineato a `docs/squadra/ceo.md` (giro 2) e `docs/roadmap.md`: servizio
white-label per web agency, Italia subito (anche con clienti esportatori),
Regno Unito + Irlanda come test dal mese 2. Prezzi dei concorrenti,
directory, eventi e regole di contatto UK **non verificati** (niente rete
esterna): da controllare prima di usarli.

## 1. Cosa ho verificato (e quindi si può dire)

Chromium 1440×900, console pulita, e riga di comando.

| Si può dire | Prova |
|---|---|
| Dati di un cliente → promo 9:16 di 15 s | Generatore rapido, 1,4 s |
| Un progetto, 4 formati; MP4 dal browser | 15 s registrati in 15,3 s, 5,9 MB |
| Un modello × N marche | *Applica* nell'editor; `fotogrammi.js --marca` (Forno, Prenotalo) |
| Il sito vero nel video, tutorial col cursore | `docs/produzione/test-digitazione/provini/` |
| Nessun nostro marchio nei video | nessuna filigrana |
| **Stesso video in un'altra lingua** | `render/testi.js` estrai → tradotto a mano → applica: promo Prenotalo in EN e DE, stesse immagini e stile, durate allungate da sole (EN 15 → 16,5 s), parole tedesche lunghe dentro il 9:16 senza tagli |

**Da NON dire oggi**: voce, musica, link di approvazione (priorità 5 e 4);
"lo fai da solo nel software"; "dall'URL al video in automatico" (si dice
"agenti + controllo umano"); "traduzione garantita" (garantisce chi approva
la lingua o la revisione madrelingua a pagamento, partner ancora da trovare);
lingue non provate dalla QA (in pagina solo IT, EN, DE, FR, ES, PT, NL
dopo il suo collaudo). I testi di riserva "Novità / In 3 parole? / Provalo
adesso" esistono **anche tradotti** ("New / In three words? / Try it now",
`js/modelli.js:71-74`), e senza schermata compare un sito finto (lo segnala
`verifica.js`): nessun campione esce così, in nessuna lingua.

## 2. Posizionamento

| | Italia | Regno Unito / Irlanda |
|---|---|---|
| Per chi | web agency 2-10 persone, 20-100 PMI clienti | digital agency 2-15 persone che rivende già white-label (SEO, PPC, siti) |
| Dolore | "fammi anche un video": a mano mangia il margine, dire no regala il cliente | video brevi richiesti da tutti i clienti; farli in casa costa ore, darli fuori costa caro e lento |
| In più | i clienti esportatori vogliono lo stesso video in EN/DE/FR | prezzo fisso per video, 48 h, nessun nome nostro |
| Frase | **"Mandaci il link. Rivendi il video."** | **"Send the link. Sell the video."** |

**Perché noi e non Canva / CapCut / Animoto / Synthesia**: il materiale è il
sito (niente riprese); un modello diventa N video, uno per cliente; le
lingue sono testi a schermo adattati nei 4 formati, non doppiaggi; white-label
con una persona che controlla. Perdiamo su librerie, audio, voce e avatar:
lo diciamo nelle domande frequenti.

## 3. Nome (il CEO lo vuole inventato e provato in EN/DE/FR/ES)

Da controllare su EUIPO e UK IPO, domini e significati (non fatto).
1. **Moltiplo** — ora la prima scelta: "multiplo/múltiplo/multiple" si capisce
   in IT, ES, PT, FR, EN; dice il moltiplicatore (marche e lingue).
2. **Rullo** — corto, neutro all'estero (in spagnolo "rulo" = bigodino: da
   valutare). Facile al telefono.
3. **Dalsito** — solo per l'Italia: fuori non significa nulla. Scartato se
   il marchio deve essere unico.

## 4. Italia: primi 10 clienti e pacchetto lingue

**Sequenza (regola del legale)**: LinkedIn a mano → telefonata ("posso
mandarle un video fatto sul vostro sito?") → email solo dopo il sì; niente
WhatsApp a freddo. Messaggi in `docs/vendita/messaggi.md`.
- Lista: 150 agenzie in 3 settimane (Google Maps, LinkedIn, partner Shopify,
  WooCommerce, Google Partner, Clutch/Sortlist Italia) + **30 con clienti
  esportatori** (CEO).
- Campione sul sito dell'agenzia stessa. Altri canali: LinkedIn del titolare
  3 post a settimana, comunità WordPress, 20 contatti caldi.
- Attesa da misurare: 150 contatti → 15 risposte → 10 Prove → 3 abbonamenti.
- **Fondatori** (deciso dal CEO): Agenzia 10 −20% per 12 mesi alle prime 10;
  rimborso della Prova se il video non è pubblicabile per errori nostri.

**Come vendere le lingue** (+39 € a lingua, Export 199 € = 1 video in 5 lingue)
- **Domanda al primo contatto**: "Quanti vostri clienti vendono o ospitano
  clienti dall'estero?" Con 5 o più si parla di lingue prima che di prezzo.
- **Dove**: agenzie nelle zone di vino, cibo, arredo, moda e turismo (Langhe,
  Valpolicella, Franciacorta, Garda, Toscana, Brianza, Alto Adige).
- **Quando**: agganci di calendario: fiere di settore (es. Vinitaly in
  primavera), apertura delle prenotazioni estive, Natale per l'export.
- **Offerta d'ingresso**: alla Prova si aggiunge una lingua (149 + 39 €);
  l'Export a 199 € è il prodotto "prima della fiera".
- **Messaggio**: "Lo stesso video, nelle lingue dei clienti del tuo cliente.
  Tu lo rivendi a 70-120 € a lingua." Mai "traduzione perfetta": "testi
  adattati, approvati da chi conosce la lingua".
- **Agenzie di traduzione** come rivenditori: 5 contatti LinkedIn nel
  trimestre; loro garantiscono la lingua, noi facciamo il video.
  [Listino rivenditore: da decidere col CEO.]
- **Agenzie Shopify/WooCommerce** con negozi che vendono in più paesi UE.

## 5. Regno Unito + Irlanda: piano di test

**Prima del primo campione** (soglie CEO): pipeline sotto 20 minuti umani a
video, revisore inglese a chiamata, priorità 2 fatta, `page-en.md` online
con piè di pagina e termini in inglese del legale, Stripe in GBP, regola
contatti UK del legale.

**Canali**
1. **Email a società con video-campione** sul sito dell'agenzia (in UK
   probabilmente lecita verso società con opt-out, non verso ditte
   individuali e partnership: **da confermare con il legale**). Lista di 100
   da Clutch UK, Sortlist UK, DesignRush, Google Partners, partner Shopify e
   HubSpot UK; città: Manchester, Leeds, Bristol, Birmingham, Brighton,
   Glasgow, Dublino per l'Irlanda.
2. **LinkedIn a mano** in parallelo (stessi 100, mai automazione).
3. **Comunità di titolari d'agenzia** (es. Agency Hackers) ed eventi
   (es. brightonSEO): contenuto utile, non annunci. Da verificare.
- **Messaggio**: "Add short-form video to your white-label menu. Send us a
  client's link, get the videos in 4 formats in 48 hours, with no name but
  yours." Si dice che siamo in Italia: assistenza in inglese, per iscritto,
  in orario italiano (un'ora avanti al UK).
- **Offerta**: Trial £129 scalata dal primo mese entro 30 giorni; prime 5
  agenzie UK: Agency 10 −20% per 12 mesi (£472/mese) in cambio di citazione;
  rimborso della Trial se il video non è pubblicabile per errori nostri.
- **Lingue nel UK**: non il messaggio principale; solo per e-commerce che
  vendono nell'UE ("your client ships to France and Germany?").
- **Soglie**: 100 campioni in 6 settimane; meno di 3 Trial pagate = stop.
  Settimanale: campioni, risposte, Trial, minuti umani, minuti di revisore.

## 6. Video demo da fare CON il prodotto

1. **"Un modello, tre clienti"** (9:16): `npm run esempi:marche`, testi di
   riserva tolti e schermate vere. Per il UK, tre marche d'esempio inglesi.
2. **"Dal link al video: il nostro sito"** (16:9, ~40 s): tutorial di Test di
   digitazione fatto dalla squadra. "Il primo cliente siamo noi".
3. **"Rivendi un video in 4 clic"**: tutorial dell'editor (interfaccia anche
   in inglese per la versione UK).
4. **"Un video, cinque lingue"** (9:16): lo stesso promo in IT, EN, DE, FR,
   ES con `render/testi.js`, montati in fila. È la demo del pacchetto Export
   e la prova che le parole tedesche lunghe stanno nel formato.

## 7. Richieste

- **CEO**: nome; listino rivenditore per agenzie di traduzione.
- **Legale**: regola email UK (società / ditte individuali, opt-out),
  termini e piè di pagina in inglese, clausola "approvazione per lingua".
- **QA**: elenco finale delle lingue collaudate prima di pubblicarle.
- **Roadmap**: priorità 2 prima di ogni campione, in ogni lingua.
