# Specifica 01 — Dal link del sito ai video in N lingue

Priorità 1 della roadmap (giro 2). Stato: **costruita e collaudata con tutta la squadra sul sito di prova (ordine Lume: 3 lingue × 2 video × 4 formati, 6/6 approvati al giro 2); manca il collaudo su 3 siti veri** (in questo ambiente la rete esterna è bloccata).

## Problema

Un ordine costava ore di persona. Il servizio regge solo con ≤ 20 minuti umani per video e ≤ 8 per ogni lingua in più (CEO).

## Cosa fa

1. `render/produci.js prepara <url> --cliente X --lingue it,en,de` (~10 s con 2 versioni del sito):
   - cattura il sito e le sue versioni linguistiche (`<link hreflang>`, selettori "English"/"DE", percorsi `/en/`), logo compreso;
   - bozze per ogni lingua con versione del sito, con i testi del sito in quella lingua: nome, slogan (h1), vantaggi (titoli di sezione), titolo dei punti (la sezione "Perché sceglierci" del sito), pulsante del sito, colore del marchio, tema chiaro/scuro;
   - pagine lunghe ritagliate per non scorrere troppo in fretta; durate dal tempo di lettura;
   - niente scene "numeri" e "citazione" (dati non ricavabili dal sito), niente "Novità" né "Provalo adesso" di riserva: in chiusura il nome del cliente sopra il suo pulsante;
   - per le lingue senza versione del sito: fogli `testi-*.json` per il localizzatore.
2. La squadra lavora con `/produci` (`.claude/skills/produci/SKILL.md`): esploratore → sceneggiatore → art director → localizzatori in parallelo → revisore.
3. `render/produci.js finisci`: verifica, provini, rendering dei 4 formati solo per ciò che è cambiato, `revisione.html` (tutti i video × lingue in una pagina, con caselle di approvazione) e `consegna.md` (tabella video × lingua × formato, tempi macchina, minuti umani da compilare).
4. `render/testi.js applica --sito <lingua>`: le catture passano a quelle della versione del sito nella stessa lingua.

## Criteri di accettazione

1. Da un URL con versione inglese e `--lingue it,en,de`: bozze it ed en con testi del sito, foglio de, nessun errore di `verifica.js`. ✅ (sito di prova `test/sito-prova/`)
2. `finisci` produce i MP4 di ogni video × lingua pronta, `revisione.html`, `consegna.md`; il tedesco risulta "da tradurre" finché manca. ✅
6. Ordine completo con la squadra senza interventi a mano tra un ruolo e l'altro (solo 2 decisioni del regista). ✅ 0 minuti umani nella prova; su ordine vero stimati 10-15 per la lettura di `revisione.html`.
3. Un secondo `finisci` senza modifiche non rende di nuovo. ✅
4. Nessun testo inventato: niente numeri, recensioni, "Novità", "Provalo adesso" nelle bozze. ✅
5. Tre siti veri (uno con versione inglese), minuti umani misurati in `consegna.md`. ⏳ serve un ambiente con rete.

## Limiti noti

- Le bozze usano i titoli del sito: su siti con titoli vaghi i vantaggi saranno deboli (li migliora lo sceneggiatore).
- Il tutorial automatico usa i pulsanti del primo schermo: va sempre verificato dall'esploratore.
- Le lingue senza versione del sito mostrano catture nella lingua principale (da dichiarare all'agenzia).
