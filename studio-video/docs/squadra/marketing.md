# Marketing — giro di analisi 1 (6 novembre 2026)

Allineato a `docs/squadra/ceo.md`: prima il **servizio white-label "video
fatti dagli agenti" per piccole web agency italiane**, poi il software.
Prezzi dei concorrenti **non verificati** (niente rete esterna): da
controllare sui loro siti prima di citarli; in pagina non li citiamo.

## 1. Cosa ho verificato (e cosa quindi si può dire)

Provato in Chromium 1440×900 (`127.0.0.1:8783`, console senza errori) e da
riga di comando.

| Si può dire | Prova |
|---|---|
| Dati di un cliente → promo 9:16 di 15 s montato | Generatore rapido: 1,4 s dal clic al video |
| Un progetto, 4 formati (16:9, 9:16, 1:1, 4:5) | finestra Esporta |
| MP4 dal browser | 15 s di video registrati in 15,3 s, 5,9 MB |
| Un modello × N marche | `{slogan}`, `{vantaggi}`… riempiti con *Applica* (Palestra Nova) e da `fotogrammi.js --marca` (Forno Bianchi, Prenotalo): stessi testi, tre look diversi |
| Il sito vero nel video, tutorial col cursore | `docs/produzione/test-digitazione/provini/tutorial-16x9-foglio.jpg`: catture reali, clic numerati |
| Nessun nostro marchio nei video | nessuna filigrana nei provini |

**Da NON dire oggi** (vero solo dopo le priorità del CEO):
- "Voce" o "musica inclusa": niente audio pronto (priorità 5); l'extra voce
  a 39 € resta fuori dalla pagina finché non esiste.
- "Link di approvazione": non esiste (priorità 4); si consegna un download.
- "Fai tutto da solo nel software": la serie gira solo da riga di comando;
  nel browser una marca alla volta; marche solo nel browser (IndexedDB).
- "Dall'URL al video in automatico": la squadra ha fatto cattura, copione e
  progetti del nostro sito, ma nessun giro completo con revisione. Si dice
  "agenti + controllo umano".
- Il generatore mette testi fissi non scritti dal cliente ("Novità", "In 3
  parole?", "Provalo adesso", `js/modelli.js:69-72`) e, senza schermata, un
  telefono finto. **Nessun demo o campione esce così**: ritocco a mano
  finché non arriva la priorità 2.

## 2. Posizionamento

**Per chi**: titolare di una web agency italiana da 2-10 persone (o di un
freelance con 15+ clienti) che gestisce siti e social di PMI locali.

**Dolore**: i clienti chiedono "fammi anche un video per i social". Farlo a
mano (Canva/CapCut, screenshot, revisioni) mangia il margine; dire di no
regala il cliente a chi lo fa. E serve ogni mese, per tutti i clienti.

**Promessa**: ci mandi il link del sito del cliente, ricevi i video pronti
nei 4 formati, senza il nostro nome, da rivendere col tuo.

**Perché noi**

| Alternativa | Cosa le manca per l'agenzia |
|---|---|
| Canva | lo fai tu, cliente per cliente; il sito vero non scorre da solo nel video |
| CapCut | serve materiale girato; nessun archivio di marche dei clienti |
| Animoto | un video alla volta, pensato per chi ha foto e clip proprie |
| Synthesia / HeyGen | avatar parlanti; non mostrano il sito del cliente |

Il nostro vantaggio: **il materiale è il sito** (niente riprese), **un modello
diventa N video, uno per cliente**, **white-label**, **in italiano, con una
persona che controlla**. Dove perdiamo (librerie, audio, lingue) non lo
nascondiamo: lo diciamo nelle domande frequenti.

**Frase da ricordare**: **"Mandaci il link. Rivendi il video."**

## 3. Nome: tre proposte al posto di "Studio Video"

Da controllare tutti su UIBM/EUIPO e domini `.it`/`.com` (non fatto: niente
rete). Il nome lo vede l'agenzia, non il suo cliente (white-label).

1. **Dalsito** — dice da dove parte il video e che non serve girare nulla;
   buono per la ricerca ("video dal sito"). Preferito per la fase 1.
2. **Moltiplo** — il punto forte (un modello × tutte le marche); adatto al
   software della fase 2. Parola comune: serve un logo forte.
3. **Rullo** — pellicola e "macchina che va", produzione in serie; una
   parola, facile da dire al telefono.

## 4. Primi 10 clienti paganti (10 agenzie che pagano almeno la Prova, 3 in abbonamento)

**Messaggio**: "Ti mando un video già fatto sul tuo sito. Se ti piace, lo
facciamo per i tuoi clienti, col tuo marchio."

**Canale n. 1 — contatto diretto con video-campione** (come il CEO).
- Lista: 150 agenzie in 3 settimane da Google Maps ("web agency", "agenzia
  comunicazione" in 10 capoluoghi del Nord e Centro), LinkedIn ("titolare"
  + "web agency"), elenchi partner pubblici di Shopify, WooCommerce e Google
  Partner, Clutch e Sortlist Italia.
- Campione **sul sito dell'agenzia stessa**, non di un suo cliente: è più
  personale, l'agenzia è il destinatario e si evita il problema dei diritti
  sul sito di un terzo (il CEO l'ha girato al legale). Promo 9:16 da 15-20 s.
- Ritmo: 10 campioni a settimana finché la priorità 1 non abbassa i minuti
  umani, poi 30. Email → LinkedIn dopo 3 giorni → telefonata se apre.
- Attesa (ipotesi da misurare): 150 contatti → 15 risposte → 10 Prove → 3
  abbonamenti.

**Canale 2 — LinkedIn del titolare**: 3 post a settimana con i video veri;
chi riceve il campione trova un profilo credibile.
**Canale 3 — comunità**: meetup e gruppi WordPress italiani, WordCamp,
gruppi Facebook di freelance e agenzie: un contenuto utile, non un annuncio.
**Canale 4 — rete del titolare**: 20 contatti caldi per i primi 2-3 casi.

**Offerta di lancio "Agenzia fondatrice"** (proposta, decide il CEO):
- Prova 149 € scalata dal primo mese se si abbona entro 30 giorni (CEO).
- Ai primi 10: prezzo Agenzia 10 bloccato 12 mesi [sconto da decidere col
  CEO], in cambio di permesso di citarli e 20 minuti di intervista.
- Prova "soddisfatti o rifatta": se dopo il giro di modifiche il video non
  si può pubblicare, rimborso dei 149 € (proposta, decide il CEO).

Ogni settimana: campioni, risposte, Prove, minuti umani a video, abbonamenti.

## 5. Tre video demo da fare CON il prodotto

1. **"Un modello, tre clienti"** (9:16, 3 × 15 s): `npm run esempi:marche`
   (Forno Bianchi, Prenotalo, Palestra Nova: stessi testi, tre look), dopo
   aver tolto a mano i testi fissi e messo schermate vere. In fila nel post,
   il moltiplicatore si capisce in 3 secondi. Marche dichiarate d'esempio.
2. **"Dal link al video: il nostro sito"** (16:9, ~40 s): il tutorial di
   Test di digitazione fatto dalla squadra (`docs/produzione/test-digitazione/
   tutorial.json`, catture vere, cursore che clicca). "Il primo cliente siamo noi".
3. **"Rivendi un video in 4 clic"** (16:9, ≤ 60 s, tutorial d'uso): catture
   dell'editor, *Generatore rapido* → *Marche* → *Applica* → *Esporta*.
   Mostra che il video si ritocca e cambia formato da un menu.

## 6. Richieste

- **CEO**: nome, sconto fondatori, rimborso Prova; extra voce fuori listino.
- **Legale**: email a freddo B2B, WhatsApp a numeri aziendali, campione sul
  sito dell'agenzia, privacy del modulo d'ordine.
- **Roadmap**: per il marketing la priorità 2 viene prima: senza, ogni
  campione richiede ritocchi a mano.
