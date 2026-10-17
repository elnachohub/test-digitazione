/*
 * Pagina del test di digitazione: eventi, disegno, timer.
 * I calcoli stanno in logica.js, le frasi in frasi.js, i testi dell'interfaccia
 * in testi.js, i profili in profili.js, il grafico in grafico.js.
 *
 * Come funziona, in breve:
 * - il testo da copiare è una lista di frasi casuali che si allunga da sola
 *   mentre scrivi, così non finisce mai prima del tempo;
 * - un campo di testo nascosto riceve tutto quello che digiti: il suo valore
 *   È il testo scritto, e lo confrontiamo carattere per carattere col modello;
 * - il tempo parte al primo tasto, non al caricamento della pagina;
 * - a fine test si riparte SOLO con Tab (o col bottone): chi sta ancora
 *   scrivendo non deve far sparire il risultato per sbaglio.
 *
 * Due modalità: "classica" (durata fissa, livello scelto) e "arcade" (si parte
 * con poco tempo e lo si guadagna completando frasi; punti con moltiplicatore
 * per le serie di parole perfette; le frasi diventano più difficili). Le regole
 * e i numeri dell'arcade stanno in logica.js (ARCADE).
 */

/* ---------- Costanti ---------- */

// Quando mancano meno di questi caratteri alla fine del testo, aggiungiamo frasi.
const MARGINE_TESTO = 120;

// Ogni quanto aggiornare timer e statistiche (ms). 100 ms è fluido ma leggero.
const INTERVALLO_AGGIORNAMENTO = 100;

// Quanto resta illuminato un tasto premuto sulla tastiera disegnata (ms).
const DURATA_LAMPO_TASTO = 150;

// Quanti tasti mostrare nella classifica dei "più sbagliati".
const TASTI_IN_CLASSIFICA = 5;

// Righe della cronologia mostrate: le più recenti. Lo storico completo resta salvato.
const RIGHE_CRONOLOGIA = 20;

// Quanto restano visibili i "+3 s" e "+50" dell'arcade (ms), uguale all'animazione in stile.css.
const DURATA_POPUP = 1100;
// Sotto questi secondi la barra del tempo diventa rossa e pulsa.
const SECONDI_ALLARME = 5;

// Dopo quanto tempo senza tasti il cursore ricomincia a lampeggiare (ms).
const PAUSA_CURSORE = 600;
// Durata del "conteggio" dei numeri che salgono (punti, risultato) (ms).
const DURATA_CONTEGGIO = 450;
// Quanti coriandoli per una frase perfetta: abbastanza per festeggiare, pochi per non coprire il testo.
const CORIANDOLI = 14;

/* Chi ha chiesto al sistema di ridurre i movimenti non vede animazioni. */
const movimentoRidotto = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

// Dove ricordare le impostazioni scelte tra una visita e l'altra.
const CHIAVE_IMPOSTAZIONI = "impostazioni-digitazione";

/* ---------- Riferimenti agli elementi della pagina ---------- */

const $ = (id) => document.getElementById(id);
const el = {
  testo: $("testo"), ingresso: $("ingresso"), areaTesto: $("areaTesto"),
  suggerimento: $("suggerimento"), annuncio: $("annuncio"), notaUs: $("notaUs"),
  tempo: $("tempo"), ppm: $("ppm"), bpm: $("bpm"), precisione: $("precisione"),
  risultato: $("risultato"), resPpm: $("resPpm"), resBpm: $("resBpm"),
  resPrecisione: $("resPrecisione"), resCaratteri: $("resCaratteri"), resRecord: $("resRecord"),
  resErrLettera: $("resErrLettera"), resErrMaiuscola: $("resErrMaiuscola"),
  resErrAccento: $("resErrAccento"), resErrSpazio: $("resErrSpazio"),
  rigaAccento: $("rigaAccento"), classifica: $("classifica"), ricomincia: $("ricomincia"),
  punteggiatura: $("punteggiatura"), accenti: $("accenti"), layout: $("layout"),
  lingua: $("lingua"), etichettaAccenti: $("etichettaAccenti"),
  profilo: $("profilo"), nuovoProfilo: $("nuovoProfilo"), eliminaProfilo: $("eliminaProfilo"),
  formProfilo: $("formProfilo"), nomeProfilo: $("nomeProfilo"), annullaProfilo: $("annullaProfilo"),
  erroreNome: $("erroreNome"), avvisoSalvataggio: $("avvisoSalvataggio"),
  graficoRisultato: $("graficoRisultato"), titoloPunteggi: $("titoloPunteggi"),
  totTest: $("totTest"), totRecord: $("totRecord"), totMedia: $("totMedia"),
  nessunTest: $("nessunTest"), tabellaStorico: $("tabellaStorico"),
  nessunaSfida: $("nessunaSfida"), tabellaSfida: $("tabellaSfida"),
  pannelloStorico: $("pannelloStorico"), titoloStorico: $("titoloStorico"),
  chiudiStorico: $("chiudiStorico"), graficoStorico: $("graficoStorico"),
  statisticheVivo: $("statisticheVivo"), ricominciaTest: $("ricominciaTest"),
  confermaElimina: $("confermaElimina"), testoConferma: $("testoConferma"),
  resSerieMax: $("resSerieMax"), resPerfette: $("resPerfette"), resPercPerfette: $("resPercPerfette"),
  strisciaParole: $("strisciaParole"),
  siElimina: $("siElimina"), noElimina: $("noElimina"),
  tastiera: $("tastiera"),
  hudArcade: $("hudArcade"), barraTempo: $("barraTempo"), arcPunti: $("arcPunti"),
  arcMolt: $("arcMolt"), arcSerie: $("arcSerie"), arcFrasi: $("arcFrasi"), popupZona: $("popupZona"),
  risultatoArcade: $("risultatoArcade"), resPunteggio: $("resPunteggio"), resFrasi: $("resFrasi"),
  resFrasiPerfette: $("resFrasiPerfette"), resDurataArcade: $("resDurataArcade"), resSerieArcade: $("resSerieArcade"),
  arcLivello: $("arcLivello"),
  legendaArcade: $("legendaArcade"), righeLegenda: $("righeLegenda"), avatarProfilo: $("avatarProfilo"),
  gruppoDurata: $("gruppoDurata"), gruppoLivello: $("gruppoLivello"), thValoreSfida: $("thValoreSfida"),
  opzioniModalita: document.querySelectorAll("[data-modalita]"),
  opzioniDurata: document.querySelectorAll("[data-durata]"),
  opzioniLivello: document.querySelectorAll("[data-livello]"),
};

/* ---------- Impostazioni (ricordate nel browser) ---------- */

const impostazioni = {
  modalita: "classica", lingua: "it", durata: 60,
  legendaChiusa: false, // la legenda arcade resta chiusa se l'utente l'ha chiusa livello: "medio", punteggiatura: true, accenti: false,
  // Predefinita italiana: chi attiva le lettere accentate ha quasi sempre
  // una tastiera italiana, dove "è", "à"... hanno un tasto proprio.
  layout: "it",
};

/*
 * Archivio del browser. In navigazione privata o con i dati bloccati anche solo
 * LEGGERE localStorage può dare errore: in quel caso usiamo un archivio in
 * memoria, così la pagina funziona (ma non ricorda nulla alla chiusura).
 */
const archivio = (() => {
  try { localStorage.getItem("prova"); return localStorage; } catch {
    const dati = new Map();
    return {
      getItem: (k) => (dati.has(k) ? dati.get(k) : null), setItem: (k, v) => dati.set(k, String(v)),
      key: (i) => [...dati.keys()][i] ?? null, get length() { return dati.size; },
    };
  }
})();

/* Traduce nella lingua scelta (vedi testi.js). */
const t = (chiave, valori) => traduci(impostazioni.lingua, chiave, valori);

/* Applica la lingua a tutti i testi della pagina marcati con data-t*. */
function applicaTesti() {
  document.documentElement.lang = impostazioni.lingua;
  document.title = t("titolo");
  document.querySelectorAll("[data-t]").forEach((e) => { e.textContent = t(e.dataset.t); });
  // Solo testi nostri (con <kbd>), mai dati dell'utente: per questo innerHTML è sicuro qui.
  document.querySelectorAll("[data-t-html]").forEach((e) => { e.innerHTML = t(e.dataset.tHtml); });
  document.querySelectorAll("[data-t-placeholder]").forEach((e) => { e.placeholder = t(e.dataset.tPlaceholder); });
  document.querySelectorAll("[data-t-aria]").forEach((e) => { e.setAttribute("aria-label", t(e.dataset.tAria)); });
}

function caricaImpostazioni() {
  try {
    Object.assign(impostazioni, JSON.parse(archivio.getItem(CHIAVE_IMPOSTAZIONI)) || {});
  } catch { /* archivio bloccato o dato rovinato: restano le predefinite */ }
}

/*
 * Gli accenti valgono solo per l'italiano: le frasi inglesi non ne hanno.
 * La scelta dell'utente resta salvata, così tornando all'italiano la ritrova.
 */
const accentiAttivi = () => impostazioni.lingua === "it" && impostazioni.accenti;
const eArcade = () => impostazioni.modalita === "arcade";

/* Le impostazioni come le vedono frasi e record (accenti già "filtrati" per lingua). */
const opzioniEffettive = () => ({ ...impostazioni, accenti: accentiAttivi() });

function salvaImpostazioni() {
  try { archivio.setItem(CHIAVE_IMPOSTAZIONI, JSON.stringify(impostazioni)); } catch { /* idem */ }
}

/* Allinea i controlli della pagina alle impostazioni correnti. */
function mostraImpostazioni() {
  // Opzione scelta: in rilievo (classe "attiva") e annunciata dai lettori di schermo (aria-pressed).
  const scegli = (b, scelto) => { b.classList.toggle("attiva", scelto); b.setAttribute("aria-pressed", String(scelto)); };
  el.opzioniModalita.forEach((b) => scegli(b, b.dataset.modalita === impostazioni.modalita));
  // In arcade durata e livello li decide il gioco: i loro controlli spariscono.
  el.gruppoDurata.hidden = el.gruppoLivello.hidden = eArcade();
  el.hudArcade.hidden = !eArcade();
  el.opzioniDurata.forEach((b) => scegli(b, Number(b.dataset.durata) === impostazioni.durata));
  el.opzioniLivello.forEach((b) => scegli(b, b.dataset.livello === impostazioni.livello));
  el.punteggiatura.checked = impostazioni.punteggiatura;
  el.accenti.checked = impostazioni.accenti;
  el.layout.value = impostazioni.layout;
  el.lingua.value = impostazioni.lingua;
  // In inglese il filtro accenti non ha senso: lo spegniamo visivamente.
  el.accenti.disabled = impostazioni.lingua !== "it";
  el.etichettaAccenti.classList.toggle("disattivo", el.accenti.disabled);
  el.etichettaAccenti.title = el.accenti.disabled ? t("soloItaliano") : "";
  // Su tastiera americana le lettere accentate non hanno un tasto: lo diciamo.
  el.notaUs.hidden = !(accentiAttivi() && impostazioni.layout === "us");
  el.rigaAccento.hidden = !accentiAttivi();
  // Lingua del testo: un lettore di schermo lo pronuncia con la voce giusta.
  el.testo.lang = impostazioni.lingua;
  etichettaTastiera();
  applicaTesti();
  // Dopo applicaTesti: il suggerimento cambia con la modalità.
  // Il numero dei secondi viene dalle regole (ARCADE), non è scritto nel testo.
  el.suggerimento.textContent = eArcade()
    ? t("suggerimentoArcade", { secondi: ARCADE.TEMPO_INIZIALE / 1000 })
    : t("suggerimento");
  disegnaLegenda();
  el.thValoreSfida.textContent = t(eArcade() ? "punti" : "paroleMin");
}

/* ---------- Stato del test ---------- */

function statoIniziale() {
  return {
    modello: "",         // il testo da copiare
    span: [],            // un <span> per ogni carattere del modello
    scritto: "",         // quello che l'utente ha scritto finora
    inizio: null,        // istante del primo tasto (performance.now)
    timer: null,
    finito: false,
    tastiPremuti: 0,     // ogni carattere inserito, anche se poi cancellato
    // Errori per tipo (vedi classificaErrore). Contano anche quelli poi corretti.
    errori: { lettera: 0, maiuscola: 0, accento: 0, spazio: 0 },
    erroriPerTasto: {},  // tasto (vedi tastoDellErrore) → quante volte sbagliato
    // Registro di ogni carattere inserito: { t: ms dal primo tasto, giusto }.
    // Serve al grafico per ricostruire velocità, errori e fluidità secondo per secondo.
    battute: [],
    // Posizioni del testo dove è stato premuto almeno un tasto sbagliato, anche
    // se poi corretto: servono a dire quali parole sono state scritte "perfette".
    posizioniErrate: new Set(),

    // --- Solo arcade ---
    frasi: [],               // { inizio, fine } di ogni frase nel modello
    prossimaFrase: 0,        // prima frase non ancora premiata
    prossimaParola: 0,       // posizione dove inizia la prima parola non ancora contata
    scadenza: null,          // istante (performance.now) in cui finisce il tempo
    punteggio: 0,
    serie: 0,                // parole perfette di fila (decide il moltiplicatore)
    serieMax: 0,
    frasiCompletate: 0,
    frasiPerfette: 0,
    // Posizioni già pagate in punti: cancellare e riscrivere non fa guadagnare di più.
    posizioniPagate: new Set(),
  };
}
let stato = statoIniziale();

/*
 * Durata della partita in ms. Classica: quella scelta. Arcade: dal primo tasto
 * alla scadenza attuale, che si allunga a ogni frase completata.
 */
const durataMs = () => {
  if (!eArcade()) return impostazioni.durata * 1000;
  return stato.scadenza === null ? ARCADE.TEMPO_INIZIALE : stato.scadenza - stato.inizio;
};
const trascorsoMs = () => (stato.inizio === null ? null : performance.now() - stato.inizio);

/* ---------- Testo da copiare ---------- */

/* Aggiunge frasi in coda al modello e crea i relativi <span>. */
function allungaTesto(quantiCaratteri) {
  let aggiunta = "";
  while (aggiunta.length < quantiCaratteri) {
    // Lo spazio separa una frase dalla precedente (tranne all'inizio).
    const separatore = stato.modello.length + aggiunta.length > 0 ? " " : "";
    // In arcade il livello è estratto in modo semi-casuale: la tendenza sale con
    // il numero della frase, ma ci sono sorprese (vedi livelloArcade).
    const livello = eArcade() ? livelloArcade(stato.frasi.length) : impostazioni.livello;
    const frase = generaFrase({ ...opzioniEffettive(), livello });
    const inizio = stato.modello.length + aggiunta.length + separatore.length;
    stato.frasi.push({ inizio, fine: inizio + frase.length, livello });
    aggiunta += separatore + frase;
  }
  const frammento = document.createDocumentFragment();
  for (const carattere of aggiunta) {
    const s = document.createElement("span");
    s.textContent = carattere;
    if (carattere === " ") s.classList.add("spazio");
    stato.span.push(s);
    frammento.appendChild(s);
  }
  stato.modello += aggiunta;
  el.testo.appendChild(frammento);
}

/* Aggiorna il colore dei caratteri tra due posizioni (estremi inclusi). */
function coloraIntervallo(da, a) {
  for (let i = Math.max(0, da); i <= a && i < stato.span.length; i++) {
    const s = stato.span[i];
    s.classList.remove("giusto", "sbagliato", "minore", "cursore");
    if (i < stato.scritto.length) {
      const atteso = stato.modello[i];
      const scritto = stato.scritto[i];
      if (scritto === atteso) s.classList.add("giusto");
      else s.classList.add(eMinore(atteso, scritto) ? "minore" : "sbagliato");
    }
  }
  const cursore = stato.span[stato.scritto.length];
  if (cursore) cursore.classList.add("cursore");
}

/*
 * Fa scorrere il testo così la riga del cursore resta la seconda visibile:
 * vedi sempre la riga appena scritta sopra e quella che arriva sotto.
 */
/*
 * Cursore che scorre: invece di accendere un bordo sulla lettera (che "salta"),
 * un'unica stanghetta si sposta con una transizione breve sulla lettera da
 * scrivere. Lampeggia solo quando sei fermo, come in un editor.
 */
const caret = document.createElement("span");
caret.className = "caret";
caret.setAttribute("aria-hidden", "true");
let timerCaret = null;

function posizionaCaret() {
  const lettera = stato.span[stato.scritto.length];
  if (!lettera) return;
  if (!caret.isConnected) el.testo.appendChild(caret);
  caret.style.height = `${lettera.offsetHeight}px`;
  caret.style.transform = `translate(${lettera.offsetLeft}px, ${lettera.offsetTop}px)`;
  caret.classList.remove("fermo");
  clearTimeout(timerCaret);
  timerCaret = setTimeout(() => caret.classList.add("fermo"), PAUSA_CURSORE);
}

/* Piccola scossa del riquadro su una lettera sbagliata (non sugli errori minori). */
function scuoti() {
  if (movimentoRidotto()) return;
  el.areaTesto.classList.remove("scossa");
  void el.areaTesto.offsetWidth; // fa ripartire l'animazione anche se era già in corso
  el.areaTesto.classList.add("scossa");
}

/* Fa ripartire un'animazione CSS legata a una classe. */
function lampo(elemento, classe) {
  if (movimentoRidotto()) return;
  elemento.classList.remove(classe);
  void elemento.offsetWidth;
  elemento.classList.add(classe);
}

/*
 * Numero che "conta" fino al valore nuovo invece di cambiare di colpo.
 * Una sola animazione per elemento: se ne arriva una nuova, la vecchia si ferma.
 */
const conteggi = new WeakMap();
function animaNumero(elemento, valore, formato = (n) => String(n)) {
  const da = Number(elemento.dataset.valore ?? 0);
  elemento.dataset.valore = valore;
  cancelAnimationFrame(conteggi.get(elemento));
  if (movimentoRidotto() || da === valore) { elemento.textContent = formato(valore); return; }
  const inizio = performance.now();
  const passo = (adesso) => {
    const p = Math.min(1, (adesso - inizio) / DURATA_CONTEGGIO);
    const facilita = 1 - (1 - p) ** 3; // parte veloce, rallenta alla fine
    elemento.textContent = formato(Math.round(da + (valore - da) * facilita));
    if (p < 1) conteggi.set(elemento, requestAnimationFrame(passo));
  };
  conteggi.set(elemento, requestAnimationFrame(passo));
  // Rete di sicurezza: se il browser non anima (scheda in pausa, risparmio
  // energetico), il numero giusto compare comunque a fine conteggio.
  setTimeout(() => { if (Number(elemento.dataset.valore) === valore) elemento.textContent = formato(valore); }, DURATA_CONTEGGIO + 50);
}

function scorriAlCursore() {
  const cursore = stato.span[stato.scritto.length];
  if (!cursore) return;
  posizionaCaret();
  // Si scorre sempre di righe INTERE: l'altezza di riga (non quella della
  // lettera, che è più bassa) dice quanto è alta ogni riga. Con il testo
  // grande, usare l'altezza della lettera lasciava righe tagliate a metà.
  const altezzaRiga = parseFloat(getComputedStyle(el.testo).lineHeight);
  const riga = Math.floor(cursore.offsetTop / altezzaRiga);
  const spostamento = Math.max(0, riga - 1) * altezzaRiga;
  el.testo.style.transform = `translateY(${-spostamento}px)`;
}

/* ---------- Statistiche ---------- */

function statistiche() {
  return calcolaStatistiche({
    giusti: contaGiusti(stato.scritto, stato.modello),
    tastiPremuti: stato.tastiPremuti,
    errori: stato.errori,
    trascorsoMs: trascorsoMs(),
    durataMs: durataMs(),
  });
}

function aggiornaStatistiche() {
  const { tempo, ppm, bpm, precisione } = statistiche();
  const restanti = Math.max(0, (durataMs() - tempo) / 1000);
  el.tempo.textContent = Math.ceil(restanti);
  if (eArcade()) aggiornaBarraTempo(restanti);
  el.ppm.textContent = ppm;
  el.bpm.textContent = bpm;
  el.precisione.textContent = precisione + "%";
  if (restanti <= 0) termina();
}

function tempoScaduto() {
  const t = trascorsoMs();
  return t !== null && t >= durataMs();
}

/* ---------- Modalità arcade ---------- */

/*
 * Legenda delle regole. I numeri arrivano da ARCADE (logica.js), non sono
 * scritti nei testi: se si cambiano le regole, la legenda resta giusta da sola.
 * Ogni riga ha un'etichetta colorata come le scritte che compaiono in partita
 * ("+3 s" verde, "+50" arancio, "×2" blu, errore rosso).
 */
/* Nomi al plurale dei livelli, per la legenda ("20% medie"). */
const PLURALI = { facile: "plFacile", medio: "plMedio", difficile: "plDifficile" };

/* "80% facili, 20% medie": le probabilità di una fase dell'arcade, a parole. */
function descriviFase(fase) {
  const p = ARCADE.PROBABILITA_LIVELLI[fase];
  return ["facile", "medio", "difficile"]
    .filter((l) => p[l] > 0)
    .map((l) => `${Math.round(p[l] * 100)}% ${t(PLURALI[l])}`)
    .join(", ");
}

function disegnaLegenda() {
  const s = (ms) => Math.round(ms / 1000);
  const righe = [
    ["tempo", `${s(ARCADE.TEMPO_INIZIALE)} s`, "legTempoTitolo", "legTempo", { inizio: s(ARCADE.TEMPO_INIZIALE), massimo: s(ARCADE.TEMPO_MASSIMO) }],
    ["tempo", "+s", "legFraseTitolo", "legFrase", { caratteri: ARCADE.CARATTERI_PER_SECONDO }],
    ["tempo", `+${s(ARCADE.BONUS_FRASE_PERFETTA)} s`, "legPerfettaTitolo", "legPerfetta", { bonus: s(ARCADE.BONUS_FRASE_PERFETTA), punti: ARCADE.PUNTI_FRASE_PERFETTA }],
    ["punti", "+1", "legCarattereTitolo", "legCarattere", {}],
    ["molt", "×2", "legSerieTitolo", "legSerie", { s1: ARCADE.SOGLIE_SERIE[0], s2: ARCADE.SOGLIE_SERIE[1], s3: ARCADE.SOGLIE_SERIE[2] }],
    ["errore", "×1", "legErroriTitolo", "legErrori", {}],
    ["livello", "?", "legLivelliTitolo", "legLivelli", {
      f: ARCADE.FRASI_FACILI, f1: ARCADE.FRASI_FACILI + 1, m: ARCADE.FRASI_MEDIE, m1: ARCADE.FRASI_MEDIE + 1,
      a: descriviFase(0), b: descriviFase(1), c: descriviFase(2),
    }],
  ];
  el.righeLegenda.textContent = "";
  for (const [tipo, esempio, titolo, testo, valori] of righe) {
    const dt = document.createElement("dt");
    const chip = document.createElement("span");
    chip.className = `chip ${tipo}`;
    chip.textContent = esempio;
    dt.append(chip, t(titolo));
    const dd = document.createElement("dd");
    dd.textContent = t(testo, valori);
    el.righeLegenda.append(dt, dd);
  }
}

/* Barra del tempo: piena = tempo massimo accumulabile. Rossa e pulsante negli ultimi secondi. */
function aggiornaBarraTempo(restanti) {
  el.barraTempo.style.width = `${Math.min(100, (restanti * 1000 * 100) / ARCADE.TEMPO_MASSIMO)}%`;
  el.barraTempo.classList.toggle("allarme", stato.inizio !== null && restanti <= SECONDI_ALLARME);
}

/* Punti, moltiplicatore e frasi in alto. */
function aggiornaHud() {
  const molt = moltiplicatore(stato.serie);
  animaNumero(el.arcPunti, stato.punteggio);
  el.arcMolt.textContent = `×${molt}`;
  el.arcFrasi.textContent = stato.frasiCompletate;
  const soglia = ARCADE.SOGLIE_SERIE.find((s) => s > stato.serie);
  el.arcSerie.textContent = soglia === undefined
    ? t("serieAlMassimo", { n: stato.serie })
    : t("serieVerso", { n: stato.serie, m: molt + 1, soglia });
  el.arcMolt.classList.toggle("acceso", molt > 1);
  // Difficoltà della frase in corso: cambia colore, e "salta" quando cambia.
  const livello = stato.frasi[stato.prossimaFrase]?.livello;
  if (livello && el.arcLivello.dataset.livello !== livello) {
    el.arcLivello.dataset.livello = livello;
    el.arcLivello.textContent = t(livello);
    lampo(el.arcLivello, "cambia");
  }
}

/*
 * Coriandoli per una frase perfetta: piccoli pezzi che partono dalla barra
 * arcade in direzioni a caso. Solo CSS (variabili per direzione e rotazione),
 * nessuna libreria; si tolgono da soli a fine animazione.
 */
function coriandoli() {
  if (movimentoRidotto()) return;
  const colori = ["var(--accento)", "var(--ok)", "var(--serie-velocita)", "var(--minore)"];
  for (let i = 0; i < CORIANDOLI; i++) {
    const c = document.createElement("span");
    c.className = "coriandolo";
    const angolo = (Math.PI * 2 * i) / CORIANDOLI + Math.random() * 0.5;
    const distanza = 40 + Math.random() * 50;
    c.style.setProperty("--dx", `${Math.cos(angolo) * distanza}px`);
    c.style.setProperty("--dy", `${Math.sin(angolo) * distanza - 20}px`);
    c.style.setProperty("--giro", `${Math.round(Math.random() * 540 - 270)}deg`);
    c.style.background = colori[i % colori.length];
    el.popupZona.appendChild(c);
    setTimeout(() => c.remove(), 900);
  }
}

/* Scritta che compare e svanisce ("+6 s", "+50", "×2!"). */
function popup(testo, tipo) {
  const p = document.createElement("span");
  p.className = `popup ${tipo}`;
  p.textContent = testo;
  el.popupZona.appendChild(p);
  setTimeout(() => p.remove(), DURATA_POPUP);
}

/*
 * Conta le parole appena completate. Una parola perfetta allunga la serie;
 * quelle con errori l'hanno già accorciata al momento dell'errore. Si conta
 * una parola solo quando è scritta giusta: con un errore ancora sul testo si
 * aspetta che venga corretto.
 */
function controllaParole() {
  const { modello, scritto } = stato;
  while (stato.prossimaParola < modello.length) {
    const inizio = stato.prossimaParola;
    let fine = modello.indexOf(" ", inizio);
    fine = fine === -1 ? modello.length : fine + 1;
    if (scritto.length < fine || scritto.slice(inizio, fine) !== modello.slice(inizio, fine)) break;
    let perfetta = true;
    for (let i = inizio; i < fine; i++) if (stato.posizioniErrate.has(i)) { perfetta = false; break; }
    if (perfetta) {
      const prima = moltiplicatore(stato.serie);
      stato.serie++;
      stato.serieMax = Math.max(stato.serieMax, stato.serie);
      const dopo = moltiplicatore(stato.serie);
      if (dopo > prima) { popup(`×${dopo}!`, "molt"); lampo(el.arcMolt, "balzo"); lampo(el.hudArcade, "lampo-molt"); }
    }
    stato.prossimaParola = fine;
  }
}

/*
 * Premia le frasi appena completate (scritte giuste fino al punto finale):
 * tempo in più e, se perfette, punti bonus. Una frase con errori ancora sul
 * testo non dà niente finché non viene corretta: scrivere a caso non fa
 * guadagnare tempo.
 */
function controllaFrasi() {
  const { modello, scritto } = stato;
  while (stato.prossimaFrase < stato.frasi.length) {
    const { inizio, fine } = stato.frasi[stato.prossimaFrase];
    if (scritto.length < fine || scritto.slice(inizio, fine) !== modello.slice(inizio, fine)) break;
    let perfetta = true;
    for (let i = inizio; i < fine; i++) if (stato.posizioniErrate.has(i)) { perfetta = false; break; }
    const premio = premioFrase(fine - inizio, perfetta, moltiplicatore(stato.serie));
    stato.scadenza = nuovaScadenza(stato.scadenza, performance.now(), premio.ms);
    stato.punteggio += premio.punti;
    stato.frasiCompletate++;
    if (perfetta) stato.frasiPerfette++;
    popup(`+${Math.round(premio.ms / 1000)} s`, "tempo");
    if (premio.punti) popup(`+${premio.punti}`, "punti");
    lampo(el.barraTempo, "guadagno");
    lampo(el.areaTesto, perfetta ? "frase-perfetta" : "frase-ok");
    if (perfetta) coriandoli();
    stato.prossimaFrase++;
  }
}

/* ---------- Profili, record e punteggi ---------- */

let profili = null; // caricati all'avvio (vedi fondo del file)
const profilo = () => profiloAttivo(profili);
const modalitaCorrente = () => chiaveRecord(opzioniEffettive());

/* Riempie il menu dei profili e abilita "Elimina" solo se ne resta almeno un altro. */
function mostraProfili() {
  el.profilo.textContent = "";
  for (const p of profili.profili) {
    const o = document.createElement("option");
    o.value = p.id;
    o.textContent = p.nome; // nome scelto dall'utente: sempre come testo
    el.profilo.appendChild(o);
  }
  el.profilo.value = profilo().id;
  // Iniziale del nome nel cerchio (Array.from: conta bene anche le lettere accentate ed emoji).
  el.avatarProfilo.textContent = (Array.from(profilo().nome)[0] || "?").toUpperCase();
  el.eliminaProfilo.disabled = profili.profili.length <= 1;
}

/* Descrizione breve delle impostazioni di un test, per la cronologia. */
function descriviImpostazioni(i, test) {
  const parti = i.modalita === "arcade"
    ? [t("arcade"), t("puntiBreve", { n: test?.punteggio ?? 0 }), i.lingua.toUpperCase()]
    : [`${i.durata} s`, t(i.livello), i.lingua.toUpperCase()];
  if (!i.punteggiatura) parti.push(t("tagMinuscole"));
  if (i.accenti) parti.push(t("tagAccenti"));
  return parti.join(" · ");
}

const formatoData = () => new Intl.DateTimeFormat(impostazioni.lingua, { dateStyle: "short", timeStyle: "short" });

/* Sezione punteggi: riepilogo, cronologia e tabella sfida per il profilo attivo. */
function mostraPunteggi() {
  const p = profilo();
  const modalita = modalitaCorrente();
  // Arcade: si confrontano i punti; classica: la velocità.
  const campo = eArcade() ? "punteggio" : "ppm";
  el.titoloPunteggi.textContent = t("punteggi", { nome: p.nome });
  el.totTest.textContent = p.storico.length;
  el.totRecord.textContent = migliore(p, modalita, campo);
  el.totMedia.textContent = mediaRecente(p, modalita, 10, campo) ?? "—";

  // Cronologia: dal più recente.
  const corpo = el.tabellaStorico.tBodies[0];
  corpo.textContent = "";
  const recenti = p.storico.slice(-RIGHE_CRONOLOGIA).reverse();
  el.nessunTest.hidden = recenti.length > 0;
  el.tabellaStorico.hidden = recenti.length === 0;
  const formato = formatoData();
  for (const test of recenti) {
    const riga = corpo.insertRow();
    riga.insertCell().textContent = formato.format(test.data);
    riga.insertCell().textContent = descriviImpostazioni(test.impostazioni, test);
    riga.insertCell().textContent = test.ppm;
    riga.insertCell().textContent = test.precisione + "%";
    const cella = riga.insertCell();
    if (test.serie && test.serie.length > 1) {
      const b = document.createElement("button");
      b.className = "opzione piccola";
      b.textContent = t("vediGrafico");
      b.addEventListener("click", () => apriGraficoStorico(test));
      cella.appendChild(b);
    }
  }

  // Tabella sfida: solo profili con risultati nelle impostazioni attuali.
  const righe = classifica(profili, modalita, campo);
  const corpoSfida = el.tabellaSfida.tBodies[0];
  corpoSfida.textContent = "";
  el.nessunaSfida.hidden = righe.length > 0;
  el.tabellaSfida.hidden = righe.length === 0;
  righe.forEach((r, i) => {
    const riga = corpoSfida.insertRow();
    if (r.id === p.id) riga.className = "tua-riga";
    riga.insertCell().textContent = i + 1;
    riga.insertCell().textContent = r.nome;
    riga.insertCell().textContent = r.valore;
    riga.insertCell().textContent = r.precisione ? r.precisione + "%" : "—";
  });
}

function apriGraficoStorico(test) {
  el.titoloStorico.textContent = t("graficoDel", { data: formatoData().format(test.data) });
  el.pannelloStorico.hidden = false;
  disegnaGrafico(el.graficoStorico, test.serie, t);
  el.pannelloStorico.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

/* Registra il test appena finito nel profilo attivo. Restituisce false se non si è potuto salvare. */
function salvaTest(test) {
  registraTest(profilo(), test);
  return salvaProfili(archivio, profili);
}

/* ---------- Statistiche sugli errori ---------- */

function registraErrore(atteso, scritto) {
  stato.errori[classificaErrore(atteso, scritto)]++;
  const tasto = tastoDellErrore(atteso, scritto);
  stato.erroriPerTasto[tasto] = (stato.erroriPerTasto[tasto] || 0) + 1;
}

/* Nome leggibile di un carattere nella classifica. */
function nomeTasto(c) {
  return c === " " ? t("spazio") : c;
}

/* Riempie il riquadro errori del risultato e colora la tastiera. */
function mostraErrori() {
  el.resErrLettera.textContent = stato.errori.lettera;
  el.resErrMaiuscola.textContent = stato.errori.maiuscola;
  el.resErrAccento.textContent = stato.errori.accento;
  el.resErrSpazio.textContent = stato.errori.spazio;

  const ordinati = Object.entries(stato.erroriPerTasto).sort((a, b) => b[1] - a[1]);
  el.classifica.textContent = "";
  if (ordinati.length === 0) {
    const li = document.createElement("li");
    li.className = "vuota";
    li.textContent = t("nessunErrore");
    el.classifica.appendChild(li);
  }
  for (const [carattere, volte] of ordinati.slice(0, TASTI_IN_CLASSIFICA)) {
    const li = document.createElement("li");
    const k = document.createElement("kbd");
    k.textContent = nomeTasto(carattere);
    li.append(k, ` ${volte} ${volte === 1 ? t("volta") : t("volte")}`);
    el.classifica.appendChild(li);
  }

  // Mappa di calore: più il tasto è rosso, più l'hai sbagliato. L'intensità è
  // relativa al tasto peggiore, così la mappa si legge anche con pochi errori.
  const massimo = ordinati.length ? ordinati[0][1] : 0;
  for (const t of Object.values(tasti)) t.classList.remove("prossimo"); // il test è finito
  for (const [carattere, volte] of ordinati) {
    const [codice] = tastiPerCarattere(carattere, impostazioni.layout);
    const t = tasti[codice];
    if (!t) continue;
    t.classList.add("caldo");
    t.style.setProperty("--intensita", (volte / massimo).toFixed(2));
    t.title = `${volte} errori`;
  }
}

/* Sottosezione "serie di parole senza errori": numeri e striscia di pallini. */
function mostraSerieParole({ sequenza, perfette, totale, serieMax }) {
  el.resSerieMax.textContent = serieMax;
  el.resPerfette.textContent = t("paroleSu", { perfette, totale });
  el.resPercPerfette.textContent = totale ? Math.round((100 * perfette) / totale) + "%" : "—";

  // Dove inizia la serie più lunga, per evidenziarla.
  let inizioMax = -1, corrente = 0;
  sequenza.forEach((p, i) => {
    corrente = p ? corrente + 1 : 0;
    if (serieMax > 0 && corrente === serieMax && inizioMax === -1) inizioMax = i - serieMax + 1;
  });
  // Le parole del testo nello stesso ordine della sequenza (separate da uno spazio).
  const testi = stato.modello.split(" ");
  el.strisciaParole.textContent = "";
  el.strisciaParole.setAttribute("role", "img");
  el.strisciaParole.setAttribute("aria-label", t("ariaStriscia", { perfette, totale, serie: serieMax }));
  sequenza.forEach((perfetta, i) => {
    const punto = document.createElement("span");
    punto.className = "punto-parola " + (perfetta ? "perfetta" : "imperfetta");
    if (i >= inizioMax && i < inizioMax + serieMax) punto.classList.add("serie-max");
    punto.title = testi[i] || ""; // passando col mouse si vede la parola
    el.strisciaParole.appendChild(punto);
  });
}

function pulisciMappaErrori() {
  for (const t of Object.values(tasti)) {
    t.classList.remove("caldo");
    t.style.removeProperty("--intensita");
    t.removeAttribute("title");
  }
}

/* ---------- Ciclo di vita del test ---------- */

/* Dispositivo touch (telefono, tablet): niente tastiera fisica, c'è quella a schermo. */
const eTouch = () => matchMedia("(hover: none) and (pointer: coarse)").matches;

/*
 * Inquadra la zona di gioco: tempo, barra arcade, testo e (sul computer) la
 * tastiera disegnata, tutti visibili insieme senza doverli cercare.
 *
 * Sul telefono si usa la parte di schermo che la tastiera a schermo lascia
 * libera (visualViewport): la tastiera si apre con un'animazione di ~300 ms,
 * quindi si aspetta che finisca e si ricalcola quando cambia l'area visibile.
 * Se la zona non ci sta tutta, la priorità va al testo da copiare.
 */
const ATTESA_TASTIERA = 300;
// Spazio lasciato libero sopra la zona di gioco, per non attaccarla al bordo (px).
const MARGINE_VISTA = 10;

/*
 * Come scorrere: morbido sul computer; immediato su touch (mentre la tastiera
 * del telefono si apre, il browser fa i suoi spostamenti e uno scorrimento
 * morbido viene interrotto o non parte) e per chi chiede movimento ridotto.
 */
const modoScorrimento = () => (movimentoRidotto() || eTouch() ? "auto" : "smooth");

function inquadraGioco() {
  if (el.areaTesto.hidden) return;
  const vista = window.visualViewport;
  const altezza = vista ? vista.height : innerHeight;
  const spostamentoVista = vista ? vista.offsetTop : 0; // iOS: l'area visibile può essere spostata
  const r = (e) => e.getBoundingClientRect();
  const alto = r(el.statisticheVivo).top;
  const conTastiera = el.tastiera.offsetParent !== null && getComputedStyle(el.tastiera).display !== "none";
  const basso = conTastiera ? r(el.tastiera).bottom : r(el.areaTesto).bottom;
  const ciSta = basso - alto <= altezza - 2 * MARGINE_VISTA;
  let delta;
  if (ciSta) {
    // Ci sta tutto: si parte dal tempo.
    delta = alto - spostamentoVista - MARGINE_VISTA;
  } else {
    // Non ci sta: il fondo (tastiera o testo) va sul fondo dello schermo, così
    // sopra si vede il più possibile (tempo, barra arcade). Se però così il
    // testo resterebbe tagliato in alto, si porta il testo in cima.
    delta = basso - (spostamentoVista + altezza - MARGINE_VISTA);
    if (r(el.areaTesto).top - delta < spostamentoVista + MARGINE_VISTA) {
      delta = r(el.areaTesto).top - spostamentoVista - MARGINE_VISTA;
    }
  }
  if (Math.abs(delta) < 2) return; // già a posto
  window.scrollBy({ top: delta, behavior: modoScorrimento() });
}

/* Chiude la legenda arcade senza cambiare la preferenza dell'utente: si sta per giocare. */
function chiudiLegendaPerGiocare() {
  if (eArcade()) el.legendaArcade.open = false;
}

/* Il giocatore ha scelto di cominciare (clic o tocco sul testo): niente da cercare. */
function preparaPerScrivere() {
  chiudiLegendaPerGiocare();
  if (eTouch()) setTimeout(inquadraGioco, ATTESA_TASTIERA);
  else inquadraGioco();
}

function avviaTimer() {
  stato.inizio = performance.now();
  if (eArcade()) stato.scadenza = stato.inizio + ARCADE.TEMPO_INIZIALE;
  // Si gioca: la legenda si chiude per non distrarre (la preferenza non cambia).
  chiudiLegendaPerGiocare();
  // Modalità concentrazione (telefono E computer): mentre scrivi spariscono
  // titolo, profilo, impostazioni e punteggi (regole in stile.css). La pagina
  // si accorcia, quindi si reinquadra subito la zona di gioco (leggere le
  // posizioni obbliga il browser a ricalcolare l'impaginazione: niente attese).
  document.body.classList.add("in-gioco");
  inquadraGioco();
  stato.timer = setInterval(aggiornaStatistiche, INTERVALLO_AGGIORNAMENTO);
  el.suggerimento.hidden = true;
}

function termina() {
  if (stato.finito) return;
  stato.finito = true;
  clearInterval(stato.timer);
  document.body.classList.remove("in-gioco");

  const { ppm, bpm, precisione } = statistiche();
  const serie = serieDelTest(stato.battute, durataMs());
  const parole = serieParole(stato.modello, stato.scritto, stato.posizioniErrate);
  const salvato = salvaTest({
    data: Date.now(),
    modalita: modalitaCorrente(),
    impostazioni: { ...opzioniEffettive() },
    ppm, bpm, precisione,
    errori: { ...stato.errori },
    serie,
    // Riassunto delle serie (senza la striscia completa, per non appesantire lo storico).
    parole: { perfette: parole.perfette, totale: parole.totale, serieMax: parole.serieMax },
    ...(eArcade() ? {
      punteggio: stato.punteggio,
      arcade: {
        frasi: stato.frasiCompletate, perfette: stato.frasiPerfette,
        secondi: Math.round(durataMs() / 1000), serieMax: stato.serieMax,
      },
    } : {}),
  });
  const record = migliore(profilo(), modalitaCorrente(), eArcade() ? "punteggio" : "ppm");
  el.risultatoArcade.hidden = !eArcade();
  if (eArcade()) {
    el.resPunteggio.dataset.valore = 0;
    animaNumero(el.resPunteggio, stato.punteggio);
    el.resFrasi.textContent = stato.frasiCompletate;
    el.resFrasiPerfette.textContent = stato.frasiPerfette;
    el.resDurataArcade.textContent = Math.round(durataMs() / 1000);
    el.resSerieArcade.textContent = stato.serieMax;
    aggiornaBarraTempo(0);
  }

  // Anche i riquadri in alto mostrano i valori finali, non l'ultimo aggiornamento.
  el.tempo.textContent = "0";
  el.ppm.textContent = el.resPpm.textContent = ppm;
  el.bpm.textContent = el.resBpm.textContent = bpm;
  el.precisione.textContent = precisione + "%";
  el.resPrecisione.textContent = precisione + "%";
  el.resCaratteri.textContent = contaGiusti(stato.scritto, stato.modello);
  el.resRecord.textContent = record;
  mostraErrori();
  mostraSerieParole(parole);
  el.areaTesto.hidden = true;
  el.risultato.hidden = false;
  el.avvisoSalvataggio.hidden = salvato;
  // I numeri principali contano da zero; i blocchi del risultato entrano uno dopo l'altro.
  for (const [elemento, valore, formato] of [
    [el.resPpm, ppm], [el.resBpm, bpm], [el.resPrecisione, precisione, (n) => n + "%"],
    [el.resCaratteri, contaGiusti(stato.scritto, stato.modello)], [el.resRecord, record],
  ]) { elemento.dataset.valore = 0; animaNumero(elemento, valore, formato); }
  lampo(el.risultato, "entra");
  // Il grafico si disegna dopo aver mostrato il risultato: gli serve la larghezza vera.
  disegnaGrafico(el.graficoRisultato, serie, t);
  mostraPunteggi();
  // Il fuoco va sul riquadro, NON sul bottone: altrimenti uno spazio o un Invio
  // digitati per inerzia lo premerebbero e il risultato sparirebbe.
  // preventScroll: lo scorrimento lo decidiamo noi, per mostrare il risultato dall'inizio.
  el.risultato.focus({ preventScroll: true });
  window.scrollBy({ top: el.risultato.getBoundingClientRect().top - MARGINE_VISTA, behavior: modoScorrimento() });
  // Per chi usa un lettore di schermo: un solo annuncio, a fine test.
  el.annuncio.textContent = eArcade()
    ? t("annuncioArcade", { punti: stato.punteggio, frasi: stato.frasiCompletate })
    : t("annuncio", { ppm, prec: precisione });
}

/*
 * Riporta tutto allo stato iniziale con frasi nuove.
 * perGiocare = true quando è il giocatore a chiedere una nuova partita (Tab,
 * Esc, bottoni): allora la vista si reinquadra sulla zona di gioco. Un cambio
 * di impostazione invece non sposta la pagina (stai usando le impostazioni).
 */
function ricomincia(perGiocare = false) {
  clearInterval(stato.timer);
  document.body.classList.remove("in-gioco");
  stato = statoIniziale();
  pulisciMappaErrori();
  el.testo.textContent = "";
  el.testo.style.transform = "";
  el.ingresso.value = "";
  el.annuncio.textContent = "";
  allungaTesto(MARGINE_TESTO * 3);
  coloraIntervallo(0, 0);
  el.testo.appendChild(caret);
  posizionaCaret(); // offsetLeft/offsetTop fanno impaginare il testo appena aggiunto
  el.tempo.textContent = durataMs() / 1000;
  el.popupZona.textContent = "";
  // A partita ferma la legenda si riapre, a meno che l'utente l'abbia chiusa lui
  // o che stia già per scrivere (nuova partita con Tab: il cursore è nel testo).
  el.legendaArcade.open = !impostazioni.legendaChiusa && !perGiocare;
  el.arcPunti.dataset.valore = 0;
  delete el.arcLivello.dataset.livello; // così l'etichetta si ridisegna con la nuova partita
  aggiornaHud();
  aggiornaBarraTempo(ARCADE.TEMPO_INIZIALE / 1000);
  el.ppm.textContent = "0";
  el.bpm.textContent = "0";
  el.precisione.textContent = "100%";
  el.risultato.hidden = true;
  el.areaTesto.hidden = false;
  el.suggerimento.hidden = false;
  evidenziaProssimoTasto();
  // Sul computer si può scrivere subito. Sul telefono no: aprire la tastiera a
  // schermo da soli coprirebbe metà pagina e farebbe scorrere tutto; si apre
  // quando tocchi il testo (o resta aperta se lo era già).
  if (!eTouch()) el.ingresso.focus();
  // Nuova partita mentre si sta giocando (Tab o "Ricomincia"): i pannelli sono
  // ricomparsi e la pagina si è allungata: si rimette a posto la vista.
  if (perGiocare) inquadraGioco();
}

/* ---------- Ingresso dei tasti ---------- */

function suInput(evento) {
  // Tasti morti (es. Option+` e poi "e" su Mac): il segno provvisorio "`" non
  // è un tasto sbagliato, aspettiamo la lettera (vedi eSegnoProvvisorio).
  if (eSegnoProvvisorio(evento)) return;
  if (stato.finito) return;
  // Il timer controlla la scadenza ogni 100 ms: un tasto arrivato dopo lo
  // scadere ma prima del controllo non deve contare.
  if (tempoScaduto()) { termina(); return; }

  let nuovo = el.ingresso.value;
  // Non si può scrivere oltre la fine del modello (in pratica non succede,
  // perché il testo si allunga prima, ma meglio non rompere i confronti).
  if (nuovo.length > stato.modello.length) nuovo = nuovo.slice(0, stato.modello.length);

  const prima = stato.scritto;
  if (stato.inizio === null && nuovo.length > 0) avviaTimer();

  // Contiamo i caratteri nuovi a partire dal primo cambiato (vedi differenzaInput):
  // di solito è l'ultimo tasto, ma la tastiera del telefono può riscrivere una parola.
  const { comune } = differenzaInput(prima, nuovo);
  for (let i = comune; i < nuovo.length; i++) {
    stato.tastiPremuti++;
    const atteso = stato.modello[i];
    stato.battute.push({ t: performance.now() - stato.inizio, giusto: nuovo[i] === atteso });
    if (nuovo[i] !== atteso) {
      registraErrore(atteso, nuovo[i]);
      stato.posizioniErrate.add(i);
      const tipo = classificaErrore(atteso, nuovo[i]);
      if (tipo === "lettera") scuoti();
      // Arcade: l'errore accorcia subito la serie (azzerata o un gradino giù).
      if (eArcade()) {
        const primaMolt = moltiplicatore(stato.serie);
        stato.serie = serieDopoErrore(stato.serie, tipo);
        if (moltiplicatore(stato.serie) < primaMolt) lampo(el.arcMolt, "rotto");
      }
    } else if (eArcade() && !stato.posizioniPagate.has(i)) {
      // Ogni carattere giusto vale 1 punto per il moltiplicatore, una volta sola.
      stato.posizioniPagate.add(i);
      stato.punteggio += moltiplicatore(stato.serie);
    }
  }

  stato.scritto = nuovo;
  if (eArcade()) { controllaParole(); controllaFrasi(); aggiornaHud(); }
  // Ricoloriamo solo la zona cambiata: con testi lunghi resta veloce.
  coloraIntervallo(comune - 1, Math.max(prima.length, nuovo.length));

  if (stato.modello.length - nuovo.length < MARGINE_TESTO) allungaTesto(MARGINE_TESTO * 2);

  scorriAlCursore();
  evidenziaProssimoTasto();
  aggiornaStatistiche();
}

/* Il cursore deve restare sempre in fondo: niente frecce per saltare avanti. */
function tieniCursoreInFondo() {
  const fine = el.ingresso.value.length;
  el.ingresso.setSelectionRange(fine, fine);
}

/* ---------- Tastiera QWERTY disegnata ---------- */

// Righe della tastiera (etichette americane). Ogni tasto: [codice, etichetta, larghezza].
const RIGHE = [
  [["Digit1", "1"], ["Digit2", "2"], ["Digit3", "3"], ["Digit4", "4"], ["Digit5", "5"],
   ["Digit6", "6"], ["Digit7", "7"], ["Digit8", "8"], ["Digit9", "9"], ["Digit0", "0"],
   ["Minus", "-"], ["Equal", "="], ["Backspace", "⌫", 2]],
  [["Tab", "Tab", 1.5], ..."qwertyuiop".split("").map((c) => ["Key" + c.toUpperCase(), c]),
   ["BracketLeft", "["], ["BracketRight", "]"], ["Backslash", "\\", 1.5]],
  [["CapsLock", "Caps", 1.75], ..."asdfghjkl".split("").map((c) => ["Key" + c.toUpperCase(), c]),
   ["Semicolon", ";"], ["Quote", "'"], ["Enter", "Invio", 2.25]],
  [["ShiftLeft", "Shift", 2.25], ..."zxcvbnm".split("").map((c) => ["Key" + c.toUpperCase(), c]),
   ["Comma", ","], ["Period", "."], ["Slash", "/"], ["ShiftRight", "Shift", 2.75]],
  [["Space", "", 8]],
];

// Sulla tastiera italiana questi tasti fisici portano altri caratteri.
const ETICHETTE_IT = {
  Minus: "'", Equal: "ì", BracketLeft: "è", BracketRight: "+",
  Semicolon: "ò", Quote: "à", Backslash: "ù", Slash: "-",
};

const tasti = {};     // codice → elemento del tasto
const etichetteUs = {}; // codice → etichetta americana, per tornare indietro

function disegnaTastiera() {
  for (const riga of RIGHE) {
    const r = document.createElement("div");
    r.className = "riga";
    for (const [codice, etichetta, larghezza = 1] of riga) {
      const t = document.createElement("div");
      t.className = "tasto";
      t.textContent = etichetta;
      t.style.flexGrow = larghezza;
      tasti[codice] = t;
      etichetteUs[codice] = etichetta;
      r.appendChild(t);
    }
    el.tastiera.appendChild(r);
  }
}

/* Mostra le etichette del layout scelto (italiano o americano). */
function etichettaTastiera() {
  for (const codice of Object.keys(tasti)) {
    const it = impostazioni.layout === "it" ? ETICHETTE_IT[codice] : undefined;
    tasti[codice].textContent = it ?? etichetteUs[codice];
  }
}

function evidenziaProssimoTasto() {
  for (const t of Object.values(tasti)) t.classList.remove("prossimo");
  // Se l'ultimo carattere è sbagliato, il prossimo tasto "giusto" è cancellare.
  const ultimo = stato.scritto.length - 1;
  const errore = ultimo >= 0 && stato.scritto[ultimo] !== stato.modello[ultimo];
  const prossimo = stato.modello[stato.scritto.length] || "";
  const codici = errore ? ["Backspace"] : tastiPerCarattere(prossimo, impostazioni.layout);
  for (const codice of codici) tasti[codice]?.classList.add("prossimo");
}

/* Breve lampo sul tasto premuto: verde se giusto, giallo se errore minore, rosso se errore. */
function lampeggia(evento) {
  const t = tasti[evento.code];
  if (!t) return;
  const atteso = stato.modello[stato.scritto.length];
  let classe = "premuto";
  if (evento.key.length === 1 && atteso && evento.key !== atteso) {
    classe = eMinore(atteso, evento.key) ? "premuto-minore" : "premuto-errore";
  }
  t.classList.add(classe);
  setTimeout(() => t.classList.remove(classe), DURATA_LAMPO_TASTO);
}

/* ---------- Collegamento degli eventi ---------- */

const nuovaPartita = () => ricomincia(true);
el.ingresso.addEventListener("input", suInput);
el.ingresso.addEventListener("compositionend", () => suInput());
el.ingresso.addEventListener("keydown", (e) => {
  if (e.key === "Escape") { nuovaPartita(); return; } // durante il test: ricomincia subito
  // Frecce/Home/Fine sposterebbero il cursore in mezzo al testo scritto.
  if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(e.key)) e.preventDefault();
  lampeggia(e);
});
el.ingresso.addEventListener("select", tieniCursoreInFondo);
el.ingresso.addEventListener("click", tieniCursoreInFondo);
// Incollare o trascinare dentro del testo renderebbe il test inutile.
el.ingresso.addEventListener("paste", (e) => e.preventDefault());
el.ingresso.addEventListener("drop", (e) => e.preventDefault());

/*
 * Se la finestra cambia misura (ridimensionamento, zoom, rotazione del telefono)
 * le righe vanno a capo in punti diversi: ricalcoliamo lo scorrimento, altrimenti
 * la riga che stai scrivendo finirebbe fuori dal riquadro visibile.
 */
if (typeof ResizeObserver !== "undefined") {
  new ResizeObserver(() => scorriAlCursore()).observe(el.areaTesto);
} else {
  window.addEventListener("resize", scorriAlCursore);
}

// Cliccando sul riquadro del testo si torna a scrivere.
el.areaTesto.addEventListener("click", () => { el.ingresso.focus(); preparaPerScrivere(); });
el.areaTesto.addEventListener("focusin", () => el.areaTesto.classList.add("a-fuoco"));
el.areaTesto.addEventListener("focusout", () => el.areaTesto.classList.remove("a-fuoco"));

el.ricomincia.addEventListener("click", nuovaPartita);
el.ricominciaTest.addEventListener("click", nuovaPartita);
// Toccare "Ricomincia" non deve togliere il fuoco al testo: la tastiera del
// telefono resta aperta e si può ripartire subito a scrivere.
el.ricominciaTest.addEventListener("pointerdown", (e) => e.preventDefault());
// Solo un clic o un tocco del giocatore sposta la vista (vedi preparaPerScrivere):
// il cursore messo nel testo all'apertura del sito non deve far scorrere la pagina.
// Quando la tastiera del telefono si apre o si chiude cambia l'area visibile.
if (window.visualViewport) {
  visualViewport.addEventListener("resize", () => {
    if (document.activeElement === el.ingresso && eTouch()) setTimeout(inquadraGioco, ATTESA_TASTIERA);
  });
}

/*
 * Tab = nuova partita. Lo intercettiamo solo mentre scrivi o sul risultato:
 * sui controlli delle impostazioni, dei profili e dei punteggi Tab continua a
 * spostarsi da uno all'altro, così la pagina resta usabile da tastiera.
 */
document.addEventListener("keydown", (e) => {
  if (e.key !== "Tab") return;
  const attivo = document.activeElement;
  const sulRisultato = stato.finito && (el.risultato.contains(attivo) || attivo === document.body);
  if (attivo === el.ingresso || sulRisultato) {
    e.preventDefault();
    nuovaPartita();
  }
});

/* Ogni cambio di impostazione salva, aggiorna i controlli e riparte con frasi nuove. */
function cambia(modifica) {
  modifica();
  salvaImpostazioni();
  mostraImpostazioni();
  mostraPunteggi(); // record e sfida dipendono dalle impostazioni (e i testi dalla lingua)
  el.pannelloStorico.hidden = true;
  ricomincia();
}

/* ---------- Gestione dei profili ---------- */

el.profilo.addEventListener("change", () => {
  profili.attivo = el.profilo.value;
  salvaProfili(archivio, profili);
  el.pannelloStorico.hidden = true;
  mostraPunteggi();
  ricomincia();
});

el.nuovoProfilo.addEventListener("click", () => {
  el.formProfilo.hidden = false;
  el.erroreNome.textContent = "";
  el.nomeProfilo.value = "";
  el.nomeProfilo.focus();
});

el.annullaProfilo.addEventListener("click", () => { el.formProfilo.hidden = true; });

el.formProfilo.addEventListener("submit", (e) => {
  e.preventDefault();
  const esito = creaProfilo(profili, el.nomeProfilo.value);
  if (esito.errore) { el.erroreNome.textContent = t("erroreNome." + esito.errore); return; }
  salvaProfili(archivio, profili);
  el.formProfilo.hidden = true;
  mostraProfili();
  mostraPunteggi();
  ricomincia();
});

/*
 * Cancellazione definitiva di tutti i risultati: chiediamo sempre conferma,
 * dentro la pagina (confirm() del browser non funziona dove la pagina è
 * incorporata). Il fuoco va su "Annulla": un Invio distratto non cancella nulla.
 */
el.eliminaProfilo.addEventListener("click", () => {
  el.testoConferma.textContent = t("confermaElimina", { nome: profilo().nome });
  el.confermaElimina.hidden = false;
  el.noElimina.focus();
});
el.noElimina.addEventListener("click", () => { el.confermaElimina.hidden = true; });
el.siElimina.addEventListener("click", () => {
  el.confermaElimina.hidden = true;
  eliminaProfilo(profili, profilo().id);
  salvaProfili(archivio, profili);
  mostraProfili();
  mostraPunteggi();
  ricomincia();
});

el.chiudiStorico.addEventListener("click", () => { el.pannelloStorico.hidden = true; });
// Solo un clic dell'utente sulla legenda cambia la preferenza (le aperture e
// chiusure automatiche a inizio e fine partita no). Il clic arriva prima che
// la legenda cambi stato: leggiamo lo stato nuovo un attimo dopo.
el.legendaArcade.querySelector("summary").addEventListener("click", () => {
  setTimeout(() => { impostazioni.legendaChiusa = !el.legendaArcade.open; salvaImpostazioni(); });
});
el.opzioniModalita.forEach((b) => b.addEventListener("click", () => cambia(() => { impostazioni.modalita = b.dataset.modalita; })));
el.opzioniDurata.forEach((b) => b.addEventListener("click", () => cambia(() => { impostazioni.durata = Number(b.dataset.durata); })));
el.opzioniLivello.forEach((b) => b.addEventListener("click", () => cambia(() => { impostazioni.livello = b.dataset.livello; })));
el.punteggiatura.addEventListener("change", () => cambia(() => { impostazioni.punteggiatura = el.punteggiatura.checked; }));
el.accenti.addEventListener("change", () => cambia(() => { impostazioni.accenti = el.accenti.checked; }));
el.lingua.addEventListener("change", () => cambia(() => { impostazioni.lingua = el.lingua.value; }));
el.layout.addEventListener("change", () => cambia(() => { impostazioni.layout = el.layout.value; }));

/*
 * Funzionamento senza rete e installazione sul telefono (vedi sw.js).
 * Solo da http(s): aprendo il file direttamente dal disco non è disponibile.
 */
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  navigator.serviceWorker.register("sw.js").catch(() => { /* senza: la pagina funziona lo stesso */ });
}

caricaImpostazioni();
// Alla prima visita il profilo predefinito prende il nome nella lingua scelta.
profili = caricaProfili(archivio, t("nomePredefinito"));
salvaProfili(archivio, profili);
disegnaTastiera();
mostraImpostazioni();
mostraProfili();
mostraPunteggi();
ricomincia();
