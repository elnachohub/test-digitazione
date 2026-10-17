/*
 * Calcoli puri del test di digitazione: niente pagina, niente orologio.
 *
 * Perché un file a parte: queste funzioni ricevono dati e restituiscono numeri,
 * quindi si possono verificare con test automatici (cartella test/) senza aprire
 * un browser. app.js le usa e si occupa solo di pagina ed eventi.
 */

// Convenzione standard dei test di digitazione: una "parola" vale 5 caratteri,
// spazi compresi. Così il punteggio non dipende dalla lunghezza delle parole.
const CARATTERI_PER_PAROLA = 5;

// Sotto questo tempo le parole/minuto esploderebbero (2 caratteri in 0,1 s =
// 240 ppm): fino a 1 s dividiamo per 1 s, così il numero resta credibile.
const TEMPO_MINIMO_CALCOLO = 1000;

// Peso di un errore "minore" (maiuscola, accento o spazio sbagliati) sulla
// precisione: metà di un errore vero. Hai capito la parola, hai sbagliato un
// dettaglio: penalizzarlo come una lettera sbagliata sarebbe ingiusto, ma
// ignorarlo del tutto insegnerebbe a trascurarlo.
const PESO_ERRORE_MINORE = 0.5;

/* Toglie gli accenti: "è" → "e". NFD separa la lettera dal suo segno diacritico. */
function senzaAccenti(c) {
  return c.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/*
 * Che tipo di errore è? Tre tipi sono "minori":
 * - maiuscola: lettera giusta ma maiuscola/minuscola sbagliata ("a" invece di "A");
 * - accento: lettera giusta ma accento sbagliato o mancante ("e" invece di "è");
 * - spazio: spazio dove serviva una lettera, o lettera dove serviva lo spazio.
 * Tutto il resto è un errore di lettera, quello che pesa di più.
 */
function classificaErrore(atteso, scritto) {
  const a = atteso.toLowerCase();
  const s = scritto.toLowerCase();
  if (a === s) return "maiuscola";
  if (senzaAccenti(a) === senzaAccenti(s)) return "accento";
  if (atteso === " " || scritto === " ") return "spazio";
  return "lettera";
}

function eMinore(atteso, scritto) {
  return classificaErrore(atteso, scritto) !== "lettera";
}

/*
 * A quale tasto attribuire l'errore nella classifica e nella mappa di calore.
 * Errore di spazio → la barra spaziatrice, anche se al posto giusto c'era una
 * lettera: hai sbagliato il momento in cui premere lo spazio, non la lettera.
 * Altrimenti il tasto della lettera attesa ("A" e "a" sono lo stesso tasto).
 */
function tastoDellErrore(atteso, scritto) {
  if (classificaErrore(atteso, scritto) === "spazio") return " ";
  return atteso.toLowerCase();
}

/* Caratteri scritti giusti nella posizione giusta (quelli che contano). */
function contaGiusti(scritto, modello) {
  let giusti = 0;
  for (let i = 0; i < scritto.length; i++) {
    if (scritto[i] === modello[i]) giusti++;
  }
  return giusti;
}

/*
 * Statistiche del test.
 * trascorsoMs: tempo dal primo tasto (null se il test non è iniziato).
 * durataMs: durata del test. Il tempo viene LIMITATO alla durata: se il browser
 *   rallenta il timer (scheda in secondo piano), i conti si fanno comunque sui
 *   secondi del test e non su quelli passati davvero.
 */
function calcolaStatistiche({ giusti, tastiPremuti, errori, trascorsoMs, durataMs }) {
  const iniziato = trascorsoMs !== null;
  const tempo = iniziato ? Math.min(trascorsoMs, durataMs) : 0;
  const minuti = Math.max(tempo, TEMPO_MINIMO_CALCOLO) / 60000;
  const ppm = iniziato ? Math.round(giusti / CARATTERI_PER_PAROLA / minuti) : 0;
  // Battute al minuto: TUTTI i tasti carattere premuti, errori compresi
  // (esclusa la cancellazione). Misura quanto si muovono le dita, mentre le
  // parole/minuto misurano quanto testo giusto produci.
  const bpm = iniziato ? Math.round(tastiPremuti / minuti) : 0;
  // La precisione conta anche gli errori poi corretti: misura quanto sei pulito,
  // non solo il risultato finale.
  const minori = errori.maiuscola + errori.accento + errori.spazio;
  const penalita = errori.lettera + PESO_ERRORE_MINORE * minori;
  const precisione = tastiPremuti === 0
    ? 100
    : Math.max(0, Math.round(100 * (tastiPremuti - penalita) / tastiPremuti));
  return { tempo, ppm, bpm, precisione };
}

/* Un record per ogni combinazione di impostazioni (lingua compresa): senza maiuscole è più facile,
 * mischiare i record renderebbe il confronto ingiusto. */
function chiaveRecord({ modalita = "classica", lingua = "it", durata, livello, punteggiatura, accenti }) {
  // Arcade: durata e livello non si scelgono (cambiano durante la partita).
  if (modalita === "arcade") return `record-digitazione-v2-arcade-${lingua}-p${+punteggiatura}-a${+accenti}`;
  // Per l'italiano la chiave resta quella di prima: i record già fatti non si perdono.
  const suffissoLingua = lingua === "it" ? "" : `-${lingua}`;
  return `record-digitazione-v2-${durata}-${livello}-p${+punteggiatura}-a${+accenti}${suffissoLingua}`;
}

/* ---------- Da carattere a tasti, per i due layout QWERTY ---------- */

// Tasti che cambiano tra tastiera americana e italiana (codice fisico → carattere).
// Le lettere sono uguali; cambiano apostrofo e lettere accentate.
const TASTI_SPECIALI = {
  us: { "'": ["Quote"] },
  it: {
    "'": ["Minus"], "è": ["BracketLeft"], "é": ["BracketLeft", "ShiftLeft"],
    "à": ["Quote"], "ò": ["Semicolon"], "ù": ["Backslash"], "ì": ["Equal"],
  },
};

// Lettere della mano sinistra: per le maiuscole si usa lo Shift della mano
// opposta, come insegnano i corsi di dattilografia.
const MANO_SINISTRA = new Set("qwertasdfgzxcvb12345");

/*
 * Tasti da premere per scrivere `c` con il layout dato ("it" o "us").
 * Restituisce [] se il carattere non ha un tasto proprio (es. "è" su tastiera US,
 * dove serve una combinazione come Option+` seguita dalla vocale).
 */
function tastiPerCarattere(c, layout) {
  if (c === " ") return ["Space"];
  if (c === ".") return ["Period"];
  if (c === ",") return ["Comma"];
  const speciale = TASTI_SPECIALI[layout][c];
  if (speciale) return speciale;
  const minuscola = c.toLowerCase();
  if (!/^[a-z]$/.test(minuscola)) return [];
  const codice = "Key" + minuscola.toUpperCase();
  if (c === minuscola) return [codice];
  return [codice, MANO_SINISTRA.has(minuscola) ? "ShiftRight" : "ShiftLeft"];
}

/* ---------- Ingresso dal campo di testo ---------- */

/*
 * Confronta il testo di prima con quello nuovo e dice da dove cambia.
 * Perché non basta guardare "cosa è stato aggiunto in coda": le tastiere dei
 * telefoni (correttore, suggerimenti) possono sostituire un pezzo di parola già
 * scritto. Partendo dal primo carattere diverso, colori e conteggi restano giusti
 * qualunque cosa faccia la tastiera.
 * Restituisce { comune: quanti caratteri iniziali sono uguali }.
 */
function differenzaInput(prima, nuovo) {
  const massimo = Math.min(prima.length, nuovo.length);
  let comune = 0;
  while (comune < massimo && prima[comune] === nuovo[comune]) comune++;
  return { comune };
}

// Segni dei "tasti morti" (Mac, tastiere internazionali): compaiono per un
// attimo prima della lettera accentata ("`" e poi "e" → "è") e non sono tasti sbagliati.
const SEGNI_PROVVISORI = /^[`´¨^~ˆ˜]$/;

/*
 * Va ignorato questo evento di input? Solo se è una composizione fatta di un
 * solo segno provvisorio. Le tastiere Android (es. Gboard) mandano invece OGNI
 * parola come composizione: se le ignorassimo tutte, le lettere comparirebbero
 * solo a fine parola e i tempi di ogni tasto sarebbero sbagliati.
 */
function eSegnoProvvisorio(evento) {
  return Boolean(evento && evento.isComposing && typeof evento.data === "string" && SEGNI_PROVVISORI.test(evento.data));
}

/* ---------- Serie di parole senza errori ---------- */

/*
 * Divide il testo scritto in parole e dice quali sono "perfette".
 * Una parola è perfetta se in NESSUNA delle sue posizioni è mai stato premuto
 * un tasto sbagliato (anche se poi corretto) e se quello che resta scritto è
 * giusto. Lo spazio dopo la parola fa parte della parola: finire una parola
 * troppo presto o troppo tardi è un errore di quella parola.
 * Contano solo le parole completate (scritte fino in fondo, spazio compreso,
 * oppure l'ultima parola del testo se è finito lì).
 *
 * modello: il testo da copiare; scritto: il testo scritto;
 * posizioniErrate: insieme (Set) delle posizioni dove c'è stato almeno un errore.
 * Restituisce { sequenza: [true/false per ogni parola], perfette, totale, serieMax }.
 */
function serieParole(modello, scritto, posizioniErrate) {
  const sequenza = [];
  let inizio = 0;
  while (inizio < modello.length) {
    let fine = modello.indexOf(" ", inizio);
    // La parola comprende il suo spazio finale (se c'è).
    fine = fine === -1 ? modello.length : fine + 1;
    if (scritto.length < fine) break; // parola non ancora completata
    let perfetta = true;
    for (let i = inizio; i < fine; i++) {
      if (posizioniErrate.has(i) || scritto[i] !== modello[i]) { perfetta = false; break; }
    }
    sequenza.push(perfetta);
    inizio = fine;
  }
  let serieMax = 0, corrente = 0;
  for (const p of sequenza) {
    corrente = p ? corrente + 1 : 0;
    serieMax = Math.max(serieMax, corrente);
  }
  return { sequenza, perfette: sequenza.filter(Boolean).length, totale: sequenza.length, serieMax };
}

/* ---------- Modalità arcade ---------- */

/*
 * Regole dell'arcade. Tutti i numeri del gioco stanno qui, così si possono
 * bilanciare in un posto solo (e i test li controllano).
 *
 * Bilanciamento: una frase media (~60 caratteri) dà 6 s, 9 s se perfetta.
 * A 40 parole/min (200 caratteri/min) per scriverla servono ~18 s: si perde
 * tempo e la partita dura un paio di minuti. A 80 parole/min servono ~9 s:
 * chi scrive bene e pulito resta in equilibrio finché le frasi difficili,
 * più lunghe, non lo rallentano. L'abilità decide quanto dura la partita.
 */
const ARCADE = {
  // Tempo iniziale: 45 s (17/10/2026, prima 30 s: troppo poco per ambientarsi).
  TEMPO_INIZIALE: 45000,
  // Il tempo accumulato non supera 60 s: anche chi va fortissimo resta sotto pressione.
  TEMPO_MASSIMO: 60000,
  // Ogni frase completata vale 1 s ogni 10 caratteri (minimo 1 s).
  CARATTERI_PER_SECONDO: 10,
  BONUS_FRASE_PERFETTA: 3000,
  PUNTI_FRASE_PERFETTA: 50,
  // Parole perfette di fila per passare a ×2, ×3, ×4. Abbassate da 10/25/50
  // (17/10/2026): ×4 richiedeva ~7 frasi senza errori, quasi irraggiungibile.
  // Ora ×2 arriva già nella prima frase e ×4 dopo due o tre frasi pulite.
  SOGLIE_SERIE: [5, 12, 20],
  // Fasi della partita: fino alla frase FRASI_FACILI si scalda, fino a
  // FRASI_MEDIE si fa sul serio, poi si spinge.
  FRASI_FACILI: 4,
  FRASI_MEDIE: 12,
  // Difficoltà semi-casuale: in ogni fase ogni frase è estratta con queste
  // probabilità (facile, medio, difficile). La tendenza sale, ma ci sono sorprese.
  PROBABILITA_LIVELLI: [
    { facile: 0.8, medio: 0.2, difficile: 0 },     // frasi 1–4: riscaldamento
    { facile: 0.2, medio: 0.65, difficile: 0.15 }, // frasi 5–12
    { facile: 0, medio: 0.35, difficile: 0.65 },   // dalla 13ª
  ],
};

/* Moltiplicatore dei punti per una serie di parole perfette di fila (×1…×4). */
function moltiplicatore(serie) {
  return 1 + ARCADE.SOGLIE_SERIE.filter((soglia) => serie >= soglia).length;
}

/*
 * Serie dopo un errore: una lettera sbagliata la azzera; un errore minore
 * (maiuscola, accento, spazio) la fa scendere di un gradino del moltiplicatore.
 */
function serieDopoErrore(serie, tipo) {
  if (tipo === "lettera") return 0;
  const gradini = [0, ...ARCADE.SOGLIE_SERIE];
  const livello = moltiplicatore(serie) - 1; // 0 = ×1
  return livello === 0 ? 0 : gradini[livello - 1];
}

/* Premio per una frase completata: millisecondi guadagnati e punti bonus. */
function premioFrase(lunghezza, perfetta, molt) {
  const base = Math.max(1, Math.round(lunghezza / ARCADE.CARATTERI_PER_SECONDO)) * 1000;
  return {
    ms: base + (perfetta ? ARCADE.BONUS_FRASE_PERFETTA : 0),
    punti: perfetta ? ARCADE.PUNTI_FRASE_PERFETTA * molt : 0,
  };
}

/* Nuova scadenza dopo un guadagno di tempo, senza superare il tetto. */
function nuovaScadenza(scadenza, adesso, guadagnoMs) {
  return Math.min(scadenza + guadagnoMs, adesso + ARCADE.TEMPO_MASSIMO);
}

/* Fase della partita per la n-esima frase (0 = la prima): 0, 1 o 2. */
function faseArcade(indiceFrase) {
  if (indiceFrase < ARCADE.FRASI_FACILI) return 0;
  if (indiceFrase < ARCADE.FRASI_MEDIE) return 1;
  return 2;
}

/*
 * Livello della n-esima frase, estratto a caso con le probabilità della sua fase.
 * La prima frase è sempre facile: si parte tranquilli.
 * caso: generatore in [0, 1); sostituibile nei test per risultati ripetibili.
 */
function livelloArcade(indiceFrase, caso = Math.random) {
  if (indiceFrase === 0) return "facile";
  const probabilita = ARCADE.PROBABILITA_LIVELLI[faseArcade(indiceFrase)];
  let estratto = caso();
  for (const livello of ["facile", "medio", "difficile"]) {
    if (estratto < probabilita[livello]) return livello;
    estratto -= probabilita[livello];
  }
  return "difficile"; // arrotondamenti: le probabilità sommano a 1
}

/* ---------- Andamento nel tempo (per il grafico) ---------- */

/*
 * Come si ottengono curve morbide ma fedeli.
 * Prima ogni punto contava i tasti in una finestra rigida di 5 secondi: bastava
 * un tasto che entrava o usciva dalla finestra per far "scattare" la linea.
 * Ora ogni tasto pesa secondo una campana (gaussiana) centrata sul secondo
 * del punto: i tasti vicini pesano tanto, quelli lontani sfumano. Le linee
 * diventano sinuose senza inventare niente: è una media pesata dei tasti veri.
 *
 * SIGMA_GRAFICO = larghezza della campana. 1 s: curve morbide, ma un errore
 * fatto al 7° secondo quasi non si vede al 4° (a 3 sigma il peso è ~1%).
 */
const SIGMA_GRAFICO = 1000;
// Un punto al secondo: 60 punti in un test da 60 s, una linea leggibile.
const PASSO_GRAFICO = 1000;
// Sotto questo numero di intervalli tra tasti la fluidità non è affidabile.
const INTERVALLI_MINIMI = 3;

/*
 * Fluidità = quanto è regolare il ritmo dei tasti, da 0 a 100.
 * Si misura con il coefficiente di variazione degli intervalli tra un tasto e
 * l'altro (deviazione standard ÷ media): ritmo costante → CV vicino a 0 →
 * fluidità vicino a 100. Pause ed esitazioni allargano gli intervalli e la
 * fanno scendere, anche se la velocità media resta alta.
 * `pesi` (facoltativi): quanto conta ogni intervallo (vedi serieDelTest).
 * Restituisce null se ci sono troppo pochi intervalli per dirlo.
 */
function fluidita(intervalli, pesi = intervalli.map(() => 1)) {
  const totale = pesi.reduce((a, b) => a + b, 0);
  // Intervalli "efficaci": con pesi tutti uguali a 1 è semplicemente il loro numero.
  const efficaci = totale === 0 ? 0 : totale ** 2 / pesi.reduce((a, b) => a + b * b, 0);
  if (efficaci < INTERVALLI_MINIMI - 1e-9 || totale < INTERVALLI_MINIMI - 1e-9) return null;
  const media = intervalli.reduce((a, x, i) => a + x * pesi[i], 0) / totale;
  if (media === 0) return 100;
  const varianza = intervalli.reduce((a, x, i) => a + pesi[i] * (x - media) ** 2, 0) / totale;
  const cv = Math.sqrt(varianza) / media;
  return Math.round(Math.max(0, Math.min(100, 100 * (1 - cv))));
}

/* Funzione d'errore (approssimazione di Abramowitz–Stegun 7.1.26, errore < 2e-7). */
function erf(x) {
  const segno = Math.sign(x);
  const a = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * a);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-a * a);
  return segno * y;
}

/*
 * Trasforma il registro dei tasti del test in punti per il grafico.
 * battute: [{ t: ms dal primo tasto, giusto: bool }] in ordine di tempo.
 * Ogni punto: secondo, velocità (parole/min), errori/min, fluidità (0–100 o null).
 *
 * Ai bordi del test (primi e ultimi istanti) metà campana cadrebbe fuori dal
 * tempo di gioco: dividiamo per la parte di campana che sta DENTRO il test,
 * altrimenti inizio e fine sembrerebbero sempre più lenti del vero.
 */
function serieDelTest(battute, durataMs, passo = PASSO_GRAFICO, sigma = SIGMA_GRAFICO) {
  const peso = (d) => Math.exp(-(d * d) / (2 * sigma * sigma));
  // Area della campana (in ms) tra 0 e la fine del test, centrata in t.
  const dentro = (t) => sigma * Math.sqrt(Math.PI / 2) * (erf((durataMs - t) / (sigma * Math.SQRT2)) - erf((0 - t) / (sigma * Math.SQRT2)));
  const punti = [];
  for (let t = passo; t <= durataMs; t += passo) {
    let giuste = 0, sbagliate = 0;
    for (const b of battute) {
      const w = peso(t - b.t);
      if (b.giusto) giuste += w; else sbagliate += w;
    }
    // Tasti al millisecondo × 60000 = tasti al minuto.
    const alMinuto = 60000 / dentro(t);
    const intervalli = [], pesi = [];
    for (let i = 1; i < battute.length; i++) {
      intervalli.push(battute[i].t - battute[i - 1].t);
      pesi.push(peso(t - (battute[i].t + battute[i - 1].t) / 2)); // pesa il centro dell'intervallo
    }
    punti.push({
      secondo: t / 1000,
      ppm: Math.round((giuste * alMinuto) / CARATTERI_PER_PAROLA),
      errori: Math.round(sbagliate * alMinuto),
      fluidita: fluidita(intervalli, pesi),
    });
  }
  return punti;
}

if (typeof module !== "undefined") {
  module.exports = {
    classificaErrore, eMinore, tastoDellErrore, contaGiusti, calcolaStatistiche,
    chiaveRecord, tastiPerCarattere, senzaAccenti, PESO_ERRORE_MINORE,
    fluidita, serieDelTest, differenzaInput, eSegnoProvvisorio, serieParole,
    ARCADE, moltiplicatore, serieDopoErrore, premioFrase, nuovaScadenza, livelloArcade, faseArcade,
  };
}
