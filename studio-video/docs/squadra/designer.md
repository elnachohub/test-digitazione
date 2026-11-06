# Designer: giro di analisi

Data: 2026-11-06. Metodo: editor aperto con Playwright a 1440x900, 1100x800 e iPhone 13 (primo avvio, clic sul titolo
nel canvas, generatore, Marche con import di `esempi/marche.json`, esportazione, scena tutorial da
`esempi/tutorial.json`). Provini da `render/fotogrammi.js`: presentazione 16:9 e 9:16, modello-promo per le 3 marche
(anguria/pop, carta/editoriale, acido/griglia), tutorial (acido), più la presentazione in `tramonto` 9:16 per vedere
anche lo stile sfumato. Console senza errori in tutti i giri. Valori: `u` = 1% del lato corto (10,8 px in 1080x1920).

Giudizio generale: il linguaggio "banco di lavoro" regge ed è riconoscibile, e i 4 stili sono davvero diversi fra
loro. I problemi gravi sono di impaginazione (editor a 1100 px, finestre più alte dello schermo) e di formato
verticale nei video (zona sicura, spazi vuoti), cioè proprio il formato che il cliente paga.

## Editor

**E1. A 1100x800 l'anteprima finisce sotto la piega (grave).** Dove: primo avvio a 1100x800. Sotto la testata ci sono
circa 500 px di carta vuota, il canvas comincia a y=620 e play e linea del tempo stanno a y≈1067, fuori dallo schermo.
Il clic sul titolo non si può fare senza scorrere. Causa: `css/editor.css` righe 557-565. `body { height: auto }`
lascia crescere la riga della griglia fino all'altezza del pannello scene (`.palco` alto 1576 px) e il canvas resta
centrato in verticale. Proposta: nel blocco `@media (max-width:1100px)` mettere `.palco { align-self: start; position:
sticky; top: 0; height: calc(100vh - 104px); justify-content: center; }` (104 px è la testata su due righe). Riguarda
tutti i portatili da 11-13" e i tablet in orizzontale.

**E2. Il pulsante "Crea il video" del generatore è fuori dalla finestra (grave).** Dove: generatore a 1440x900. La
finestra è alta 828 px e "Crea il video" sta a y=870, nascosto: si vede solo la nota "Il progetto attuale viene
sostituito". Su iPhone si arriva al pulsante solo dopo 3 schermate di scorrimento. File: `css/editor.css` riga 502
(`.finestra`, `max-height: 92vh` senza piede fisso). Proposta: piede fisso per tutte le finestre: `.finestra .azioni {
position: sticky; bottom: -22px; background: var(--foglio); border-top: 2px dashed rgba(18,18,18,.25); padding: 12px
0; margin-top: 8px; }`. Per guadagnare spazio a 900 px: le 3 schede modello a 1 riga di descrizione
(`-webkit-line-clamp: 1`) e "Tema" e "Carattere" sulla stessa riga del formato.

**E3. Il testo bianco sui pulsanti rosa ha un contrasto di 3,36:1 (non va).** Dove: "Esporta video", "Salva il
progetto come marca", "Nuovo video", "Registra", il numero del pannello Ritocco. Testo da 12-14 px bianco su
`#ff3e7f`. File: `css/editor.css` riga 108 (`.pulsante.principale { color: #fff }`) e riga 162. Proposta, coerente con
l'inchiostro del linguaggio: testo `#121212` su rosa (5,57:1). In alternativa, se il testo resta bianco, rosa scurito
a `#d81b60` (4,95:1).

**E4. Su telefono la testata occupa il 28% dello schermo.** Dove: iPhone 13, primo avvio. Logo, poi una riga con solo
annulla/ripeti, poi 6 pulsanti su due righe: in tutto 190 pt su 664 prima dell'anteprima. Proposta (`@media
(max-width:720px)`): una sola riga alta 56 px con logo, annulla/ripeti e "Esporta" (testo nero su rosa). "Generatore"
e "Marche" restano a sinistra come pulsanti icona da 44x44 (✦, ★). Apri, Salva e Copertina vanno in un menu "⋯". Il
nome del progetto passa sotto, a 15 px.

**E5. Il suggerimento del tutorial copre l'anteprima e su telefono viene tagliato.** Dove: scena tutorial, a 1440 e su
iPhone. La striscia gialla "Clicca nel browser per aggiungere un passo · trascina..." sta sopra il fondo della
schermata, cioè proprio dove si clicca. Su iPhone diventa "· tr...". File: `css/editor.css` riga 345 (`.suggerimento`,
`bottom: 12px`, `white-space: nowrap`). Proposta: portarla fuori dal canvas, sopra i comandi (`position: static;
margin: 10px auto 0; white-space: normal; max-width: 640px`), e su telefono usare il testo corto "Tocca la schermata
per aggiungere un passo".

**E6. Tutorial e Invito all'azione hanno la stessa icona →.** Dove: lista scene e linea del tempo con `tutorial.json`:
il blocco arancione (tutorial) e quello rosa (cta) mostrano entrambi →. Proposta: per il tutorial usare l'icona del
cursore ↖ oppure "①". Il → resta alla cta.

**E7. Il campo "Schermata su cui mostrare i passi" sembra vuoto anche con l'immagine caricata.** Dove: scena tutorial
di `tutorial.json`. Il riquadro tratteggiato dice "Trascina qui o clicca per caricare" anche se nel video la schermata
c'è. Il cliente pensa di averla persa e la ricarica. Proposta: quando c'è l'immagine, mostrarla come miniatura
(altezza 72 px, `object-fit: cover`) con i pulsanti "Cambia" e "Togli". Vale per tutti i campi immagine
(`.zona-immagine`).

**E8. Finestra Marche: azioni piccole e ambigue.** Dove: Marche dopo l'import. ✎ ⧉ ⤓ × sono icone da ~12 px senza
etichetta, con "elimina" (×) attaccato a "scarica". Su iPhone i bersagli misurano ~22 pt. Non si capisce la differenza
fra "Nuovo video" e "Applica". Su iPhone il campo di ricerca è troncato ("Cerca per noı") perché condivide la riga con
l'ordinamento. Proposta: bersagli da almeno 36x36 px (44 su touch); × staccato a destra con `margin-left: auto`, in
rosso `#c2183f` e con conferma. Etichette più chiare: "Nuovo video" diventa "Nuovo video con questa marca", "Applica"
diventa "Applica al video aperto" (oppure un `title` e una riga di aiuto sotto i pulsanti). Sotto 720 px: ricerca al
100% su una riga e ordinamento sotto.

**E9. Testi di aiuto a 12 px grigi.** Dove: pannello Ritocco ("Clicca un elemento...", "Frecce = sposta..."),
etichette dei campi (`.campo`, `.nota`, riga 165 e riga 42). Il contrasto (5,6:1) va bene, ma a 12 px sul portatile si
legge a fatica. Proposta: 13 px e interlinea 1,45. Etichette `.campo` in `#121212` a 12,5 px peso 700: oggi grigie, si
confondono con i segnaposto.

**E10. I segnaposto del generatore sembrano valori già compilati.** Dove: generatore, campo Vantaggi ("Agenda sempre
aggiornata / Promemoria...") e Indirizzo ("prenotalo.it"), senza "Es.". Proposta: prefisso "Es." ovunque e segnaposto
in `#a39c8c` corsivo, per distinguerli da un valore vero.

**E11. Esporta: il pulsante dice "Registra".** Dove: finestra Esporta. Il cliente ha premuto "Esporta video" e si
trova davanti "Registra", insieme a una nota tecnica (`npm run render`). Proposta: pulsante "Esporta 1 video · 0:28"
(il numero segue i formati scelti). Nota tecnica in un "Dettagli" chiuso. Avviso in giallo: "Tieni questa scheda
aperta: ci vuole quanto dura il video".

## Video

**V1. 9:16, scena Schermata con testo: titolo nella zona coperta e mezzo schermo vuoto (grave).** Dove: presentazione
9:16 a 8,4 s, editoriale e sfumato. Il titolo comincia a y≈180 px (9%), dentro il 12% in alto dove ci sono le icone.
Fra il sottotitolo (y≈440) e il browser (y≈900) ci sono 460 px vuoti, e il browser è largo solo 950 px, quindi si
legge male. Sotto restano altri 380 px vuoti. File: `js/motore.js` righe 1111-1114 (`testoBox.y = 8*u`, `h = H*0.24`).
Proposta: in verticale `testoBox = { y: H*0.13, h: H*0.18 }`, e il dispositivo parte subito sotto (`by = testoBox.y +
testoBox.h + 2*u`) e finisce a `H*0.80`. In 9:16 la scena dovrebbe proporre di default `dispositivo: "telefono"`: il
browser orizzontale in un video verticale spreca il 50% dell'area.

**V2. 9:16: il marchio in basso a sinistra sta nel 20% coperto e in Griglia tocca gli angoli.** Dove: tutti i provini
9:16 ("Prenotalo" a y≈96%), coperto da didascalia e nome utente. In 16:9 Griglia (tutorial a 11,4 s) la scritta parte
a x=35 px, sopra l'angolo verde disegnato a x=30. File: `js/motore.js` righe 1659-1661 (`x = 3.2*u`, `y = H - 3.2*u -
dim`) e `cornice()` riga 1635 (angoli a `3*u`). Proposta: in Griglia `x = 8*u`. In verticale `y = H*0.80 - 2*u - dim`,
oppure nasconderlo nelle scene titolo e cta, dove il nome c'è già. Dimensione 2,8u invece di 2,4u: oggi su telefono
sono 8 pt.

**V3. Macchina da scrivere: il testo centrato "balla" e il cursore copre le lettere (grave, Griglia).** Dove: tutorial
16:9 a 1,0 s: "senza t▮ele". Il blocco verde sta sopra la "e" e la riga parziale si ricentra a ogni lettera, quindi
scivola verso sinistra mentre si scrive. Succede in ogni titolo centrato dello stile Griglia (Palestra Nova,
tutorial). File: `js/motore.js` righe 319-331. `scrivi(parte)` disegna la parte con `textAlign` centrato, mentre il
cursore usa `x0` calcolato sulla riga intera. Proposta: disegnare la parte con `textAlign = "left"` a partire da `x0`
(lo stesso usato per il cursore). Così la riga cresce da sinistra a destra nella posizione finale.

**V4. Sfumato (Syne): titoli spezzati male, con parole orfane.** Dove: tramonto 9:16, cta "Pronto / a / iniziare?" (la
"a" da sola su una riga), "Cosa / ottieni", "I risultati / parlano". Syne 800 è molto largo e l'andata a capo è
"golosa". File: `js/motore.js` riga 228 (`aCapo`). Proposta: per i titoli, a capo bilanciato (a parità di numero di
righe, scegliere le interruzioni che rendono le righe di larghezza più simile) e nessuna riga di 1-2 lettere (si
attacca alla parola dopo). Per lo stile sfumato, `dimMax` dei titoli -12% oppure `letterSpacing: -0.02em`.

**V5. Stelle della recensione quasi invisibili in Editoriale (contrasto 1,24:1).** Dove: presentazione 16:9 e 9:16,
scena citazione: stelle `#ffc23d` su carta `#e8e2d4`. Inoltre stanno a 30 px dal testo, più vicine alla citazione che
alle virgolette. File: `js/motore.js` riga 1489 (colore fisso `#ffc23d` fuori dal pop). Proposta: in Editoriale stelle
in `tema.accento` (il rosso mattone) oppure in inchiostro; in Griglia e Sfumato si può tenere il giallo. Spazio
stelle→testo `3*u` (oggi ~1,5u), virgolette→stelle `2*u`.

**V6. 9:16: composizione sbilanciata in alto, metà inferiore vuota.** Dove: promo 9:16 delle 3 marche, scena punti a
7,0 s: titolo e 3 schede fra il 15% e il 35%, sotto il 60% dello schermo vuoto. Titolo editoriale a 1,2 s
(presentazione): blocco fra il 40% e il 60% su carta vuota. Proposta: in verticale centrare il gruppo nella zona
sicura (centro a `H*0.46`, cioè a metà fra 12% e 80%) e alzare i punti a `dim = 6,4u` (oggi 5,6u, riga 1034) con
schede più alte (padding 3u): su telefono il testo dei punti oggi corrisponde a circa 11 pt.

**V7. Pop: l'adesivo "NOVITÀ" tocca il titolo.** Dove: promo Prenotalo a 2,45 s: la base dell'adesivo verde coincide
con l'altezza delle maiuscole di "PRENOTAZIONI". File: `js/motore.js` scena titolo (righe 962-1020). Proposta: spazio
adesivo→titolo `2,5*u` in pop (con la rotazione del pop serve più aria degli altri stili).

**V8. Schermata a tutto schermo (telefono) sopra la testata editoriale.** Dove: promo Forno Bianchi a 8,7 s. Il
telefono parte a y=7u e copre il filetto e "FORNO BIANCHI 03/04". In tutte e 3 le marche il telefono occupa anche il
20% in basso. File: `js/motore.js` riga 1106 (`box = { y: 7*u, h: H - 14*u }`). Proposta: in 9:16 `box.y = H*0.10`,
`box.h = H*0.70`. In editoriale la cornice va disegnata dopo il dispositivo oppure il box va abbassato sotto `m +
4*u`.

**V9. Il cursore della cta compare fermo nella zona coperta in basso.** Dove: cta a 12,7 s (promo) e 25,7 s
(presentazione): il puntatore sta in basso a destra (82%, 88%) per tutta l'entrata, poi va al pulsante. Sembra un
mouse dimenticato. Proposta: far entrare il cursore con una dissolvenza (0→1 in 0,25 s) partendo da `(0.70, 0.70)`, e
solo dopo che il pulsante è comparso.

**V10. Il browser della Schermata 16:9 sborda dal margine dei filetti (Editoriale).** Dove: presentazione 16:9 a 8,4
s: il bordo destro del browser arriva a x=1877, mentre i filetti finiscono a x=1866. Proposta: in editoriale allineare
il box al margine `m` della cornice (`W - bx - m`).

Coerenza dei 4 stili: Pop, Editoriale e Griglia sono netti e riconoscibili. Lo Sfumato è il più debole: il carattere
largo rende i titoli più piccoli e spezzati (V4), e le schede trasparenti al 10% sul fondo viola si leggono poco nei
numeri. Proposta: scheda `rgba(255,255,255,0.16)` con bordo 0,28.

## Le 3 modifiche che farei per prime

1. **Zona sicura 9:16 nel motore** (V1, V2, V6, V8): testo e dispositivi fra `H*0.12` e `H*0.80`, gruppi centrati a
   `H*0.46`, marchio sopra l'80%. Riguarda tutti i video per Reels e TikTok, cioè la vendita principale.
2. **Macchina da scrivere allineata** (V3, `js/motore.js` 319-331): un errore visibile già nel primo secondo di ogni
   video Griglia e del tutorial d'esempio. Si corregge con una riga.
3. **Editor usabile su portatile** (E1 + E2): `.palco` fisso in alto sotto i 1100 px e piede fisso delle finestre con
   "Crea il video" sempre visibile. Senza queste due modifiche il primo flusso (generatore → anteprima) si blocca su
   schermi comuni. Subito dopo: testo nero sui pulsanti rosa (E3), è una sola regola CSS.

