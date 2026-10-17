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
  siElimina: $("siElimina"), noElimina: $("noElimina"),
  tastiera: $("tastiera"),
  opzioniDurata: document.querySelectorAll("[data-durata]"),
  opzioniLivello: document.querySelectorAll("[data-livello]"),
};

/* ---------- Impostazioni (ricordate nel browser) ---------- */

const impostazioni = {
  lingua: "it", durata: 60, livello: "medio", punteggiatura: true, accenti: false,
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

/* Le impostazioni come le vedono frasi e record (accenti già "filtrati" per lingua). */
const opzioniEffettive = () => ({ ...impostazioni, accenti: accentiAttivi() });

function salvaImpostazioni() {
  try { archivio.setItem(CHIAVE_IMPOSTAZIONI, JSON.stringify(impostazioni)); } catch { /* idem */ }
}

/* Allinea i controlli della pagina alle impostazioni correnti. */
function mostraImpostazioni() {
  el.opzioniDurata.forEach((b) => b.classList.toggle("attiva", Number(b.dataset.durata) === impostazioni.durata));
  el.opzioniLivello.forEach((b) => b.classList.toggle("attiva", b.dataset.livello === impostazioni.livello));
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
  };
}
let stato = statoIniziale();

const durataMs = () => impostazioni.durata * 1000;
const trascorsoMs = () => (stato.inizio === null ? null : performance.now() - stato.inizio);

/* ---------- Testo da copiare ---------- */

/* Aggiunge frasi in coda al modello e crea i relativi <span>. */
function allungaTesto(quantiCaratteri) {
  let aggiunta = "";
  while (aggiunta.length < quantiCaratteri) {
    // Lo spazio separa una frase dalla precedente (tranne all'inizio).
    const separatore = stato.modello.length + aggiunta.length > 0 ? " " : "";
    aggiunta += separatore + generaFrase(opzioniEffettive());
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
function scorriAlCursore() {
  const cursore = stato.span[stato.scritto.length];
  if (!cursore) return;
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
  const restanti = Math.max(0, impostazioni.durata - tempo / 1000);
  el.tempo.textContent = Math.ceil(restanti);
  el.ppm.textContent = ppm;
  el.bpm.textContent = bpm;
  el.precisione.textContent = precisione + "%";
  if (restanti <= 0) termina();
}

function tempoScaduto() {
  const t = trascorsoMs();
  return t !== null && t >= durataMs();
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
  el.eliminaProfilo.disabled = profili.profili.length <= 1;
}

/* Descrizione breve delle impostazioni di un test, per la cronologia. */
function descriviImpostazioni(i) {
  const parti = [`${i.durata} s`, t(i.livello), i.lingua.toUpperCase()];
  if (!i.punteggiatura) parti.push(t("tagMinuscole"));
  if (i.accenti) parti.push(t("tagAccenti"));
  return parti.join(" · ");
}

const formatoData = () => new Intl.DateTimeFormat(impostazioni.lingua, { dateStyle: "short", timeStyle: "short" });

/* Sezione punteggi: riepilogo, cronologia e tabella sfida per il profilo attivo. */
function mostraPunteggi() {
  const p = profilo();
  const modalita = modalitaCorrente();
  el.titoloPunteggi.textContent = t("punteggi", { nome: p.nome });
  el.totTest.textContent = p.storico.length;
  el.totRecord.textContent = migliore(p, modalita);
  el.totMedia.textContent = mediaRecente(p, modalita) ?? "—";

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
    riga.insertCell().textContent = descriviImpostazioni(test.impostazioni);
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
  const righe = classifica(profili, modalita);
  const corpoSfida = el.tabellaSfida.tBodies[0];
  corpoSfida.textContent = "";
  el.nessunaSfida.hidden = righe.length > 0;
  el.tabellaSfida.hidden = righe.length === 0;
  righe.forEach((r, i) => {
    const riga = corpoSfida.insertRow();
    if (r.id === p.id) riga.className = "tua-riga";
    riga.insertCell().textContent = i + 1;
    riga.insertCell().textContent = r.nome;
    riga.insertCell().textContent = r.ppm;
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
 * Porta tempo e testo in cima allo schermo. Sul telefono la tastiera a schermo
 * copre metà pagina: senza questo, il testo da copiare potrebbe finirci sotto.
 * Si aspetta che la tastiera finisca di aprirsi (la sua animazione dura ~300 ms).
 */
const ATTESA_TASTIERA = 300;
function mostraTestoSopraTastiera() {
  if (!eTouch()) return;
  setTimeout(() => el.statisticheVivo.scrollIntoView({ block: "start", behavior: "smooth" }), ATTESA_TASTIERA);
}

function avviaTimer() {
  stato.inizio = performance.now();
  // Modalità concentrazione: sul telefono, mentre scrivi, si nasconde tutto
  // tranne tempo, testo e "Ricomincia" (le regole sono in stile.css).
  document.body.classList.add("in-gioco");
  mostraTestoSopraTastiera();
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
  const salvato = salvaTest({
    data: Date.now(),
    modalita: modalitaCorrente(),
    impostazioni: { ...opzioniEffettive() },
    ppm, bpm, precisione,
    errori: { ...stato.errori },
    serie,
  });
  const record = migliore(profilo(), modalitaCorrente());

  // Anche i riquadri in alto mostrano i valori finali, non l'ultimo aggiornamento.
  el.tempo.textContent = "0";
  el.ppm.textContent = el.resPpm.textContent = ppm;
  el.bpm.textContent = el.resBpm.textContent = bpm;
  el.precisione.textContent = precisione + "%";
  el.resPrecisione.textContent = precisione + "%";
  el.resCaratteri.textContent = contaGiusti(stato.scritto, stato.modello);
  el.resRecord.textContent = record;
  mostraErrori();
  el.areaTesto.hidden = true;
  el.risultato.hidden = false;
  el.avvisoSalvataggio.hidden = salvato;
  // Il grafico si disegna dopo aver mostrato il risultato: gli serve la larghezza vera.
  disegnaGrafico(el.graficoRisultato, serie, t);
  mostraPunteggi();
  // Il fuoco va sul riquadro, NON sul bottone: altrimenti uno spazio o un Invio
  // digitati per inerzia lo premerebbero e il risultato sparirebbe.
  el.risultato.focus();
  // Per chi usa un lettore di schermo: un solo annuncio, a fine test.
  el.annuncio.textContent = t("annuncio", { ppm, prec: precisione });
}

/* Riporta tutto allo stato iniziale con frasi nuove. */
function ricomincia() {
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
  el.tempo.textContent = impostazioni.durata;
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
    if (nuovo[i] !== atteso) registraErrore(atteso, nuovo[i]);
  }

  stato.scritto = nuovo;
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

el.ingresso.addEventListener("input", suInput);
el.ingresso.addEventListener("compositionend", () => suInput());
el.ingresso.addEventListener("keydown", (e) => {
  if (e.key === "Escape") { ricomincia(); return; } // durante il test: ricomincia subito
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
el.areaTesto.addEventListener("click", () => el.ingresso.focus());
el.areaTesto.addEventListener("focusin", () => el.areaTesto.classList.add("a-fuoco"));
el.areaTesto.addEventListener("focusout", () => el.areaTesto.classList.remove("a-fuoco"));

el.ricomincia.addEventListener("click", ricomincia);
el.ricominciaTest.addEventListener("click", ricomincia);
// Toccare "Ricomincia" non deve togliere il fuoco al testo: la tastiera del
// telefono resta aperta e si può ripartire subito a scrivere.
el.ricominciaTest.addEventListener("pointerdown", (e) => e.preventDefault());
el.ingresso.addEventListener("focus", mostraTestoSopraTastiera);
// Quando la tastiera del telefono si apre o si chiude cambia l'area visibile.
if (window.visualViewport) {
  visualViewport.addEventListener("resize", () => { if (document.activeElement === el.ingresso) mostraTestoSopraTastiera(); });
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
    ricomincia();
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
