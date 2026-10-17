/*
 * Grafico dell'andamento del test: velocità, errori e fluidità nel tempo.
 *
 * Perché tre fasce e non tre linee sulla stessa scala: le tre misure hanno
 * unità diverse (parole/min, errori/min, percentuale). Su un unico asse la
 * linea più piccola diventerebbe piatta e illeggibile; con due assi verticali
 * si leggerebbero valori sbagliati. Tre fasce impilate condividono l'asse del
 * tempo e un solo mirino: si vede subito "in quel secondo ho rallentato E
 * sbagliato di più".
 *
 * Linee curve "monotone": morbide, ma senza inventare picchi o valli che nei
 * dati non ci sono (una curva qualsiasi supererebbe i punti reali). I dati
 * stessi sono già smussati con una media "a campana" (vedi serieDelTest).
 *
 * Stile ispirato ai grafici di 10FastFingers: area sfumata sotto ogni linea,
 * linee spesse e arrotondate, griglia leggerissima, linee che si "disegnano"
 * all'apertura, il picco di velocità segnato e la media accanto a ogni titolo.
 *
 * Colori: tre tinte verificate per chi non distingue bene i colori, in chiaro
 * e in scuro (variabili --serie-* in stile.css). La legenda e il riquadro dei
 * valori fanno sì che il colore non sia mai l'unico modo di capire.
 */

const SERIE = [
  { chiave: "ppm", nome: "velocita", unita: "unitaVelocita", colore: "var(--serie-velocita)" },
  { chiave: "errori", nome: "errori", unita: "unitaErrori", colore: "var(--serie-errori)" },
  { chiave: "fluidita", nome: "fluidita", unita: "%", colore: "var(--serie-fluidita)" },
];

// Misure del disegno in pixel.
const MARGINE = { sinistra: 40, destra: 14, sopra: 4 };
const ALTEZZA_FASCIA = 76;
const SPAZIO_TITOLO = 30; // sopra ogni fascia: il suo nome, staccato dalla fascia precedente
const ALTEZZA_ASSE_X = 24;
const SVG_NS = "http://www.w3.org/2000/svg";
// Durata dell'animazione che "disegna" le linee all'apertura (ms).
const DURATA_DISEGNO = 900;
// Ogni grafico ha i suoi id per le sfumature: in pagina ce ne possono essere due.
let contatoreGrafici = 0;

/* Massimo "tondo" per l'asse: 47 parole/min → 60. Mai sotto `minimo`. */
function massimoTondo(valore, passo, minimo) {
  return Math.max(minimo, Math.ceil(valore / passo) * passo);
}

/*
 * Percorso SVG di una curva monotona tra punti [x, y] (metodo Fritsch–Carlson,
 * lo stesso di "monotoneX" in d3): le tangenti si annullano dove la pendenza
 * cambia segno, così la curva non oltrepassa mai i punti vicini.
 */
function percorsoMonotono(p) {
  if (p.length === 1) return `M${p[0][0]},${p[0][1]}`;
  if (p.length === 2) return `M${p[0][0]},${p[0][1]}L${p[1][0]},${p[1][1]}`;
  const n = p.length;
  const dx = [], m = [];
  for (let i = 0; i < n - 1; i++) {
    dx[i] = p[i + 1][0] - p[i][0];
    m[i] = (p[i + 1][1] - p[i][1]) / dx[i];
  }
  const tg = [m[0]];
  for (let i = 1; i < n - 1; i++) {
    tg[i] = m[i - 1] * m[i] <= 0 ? 0
      : (3 * (dx[i - 1] + dx[i])) / ((2 * dx[i] + dx[i - 1]) / m[i - 1] + (dx[i] + 2 * dx[i - 1]) / m[i]);
  }
  tg[n - 1] = m[n - 2];
  let d = `M${p[0][0]},${p[0][1]}`;
  for (let i = 0; i < n - 1; i++) {
    const terzo = dx[i] / 3;
    d += `C${p[i][0] + terzo},${p[i][1] + tg[i] * terzo},${p[i + 1][0] - terzo},${p[i + 1][1] - tg[i + 1] * terzo},${p[i + 1][0]},${p[i + 1][1]}`;
  }
  return d;
}

/* Crea un elemento SVG con i suoi attributi. */
function svg(tag, attributi = {}, genitore) {
  const e = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attributi)) e.setAttribute(k, v);
  if (genitore) genitore.appendChild(e);
  return e;
}

/* Valore leggibile nel riquadro: "—" quando la misura non c'è (es. fluidità con pochi tasti). */
function formatta(valore, unita) {
  if (valore === null || valore === undefined) return "—";
  return unita === "%" ? `${valore}%` : `${valore}`;
}

/*
 * Disegna il grafico nel contenitore.
 * punti: [{ secondo, ppm, errori, fluidita }] (vedi serieDelTest in logica.js)
 * t: funzione di traduzione (chiave, valori) → testo.
 */
function disegnaGrafico(contenitore, punti, t) {
  // Un ridisegno precedente lascia un osservatore attivo: lo fermiamo.
  if (contenitore._osservatore) contenitore._osservatore.disconnect();
  contenitore.textContent = "";

  if (!punti || punti.length < 2) {
    const p = document.createElement("p");
    p.className = "nota";
    p.textContent = t("graficoVuoto");
    contenitore.appendChild(p);
    return;
  }

  // Legenda: sempre presente con più serie, così il colore non è l'unico indizio.
  const legenda = document.createElement("ul");
  legenda.className = "legenda";
  for (const s of SERIE) {
    const li = document.createElement("li");
    const campione = document.createElement("span");
    campione.className = "campione";
    campione.style.background = s.colore;
    li.append(campione, `${t(s.nome)} (${s.unita === "%" ? "%" : t(s.unita)})`);
    legenda.appendChild(li);
  }

  const area = document.createElement("div");
  area.className = "area-grafico";
  area.tabIndex = 0;
  area.setAttribute("role", "img");
  area.setAttribute("aria-label", t("ariaGrafico"));
  const riquadro = document.createElement("div");
  riquadro.className = "riquadro-valori";
  riquadro.hidden = true;

  const nota = document.createElement("p");
  nota.className = "nota";
  nota.textContent = t("spiegaGrafico");

  contenitore.append(legenda, area, nota, tabellaDati(punti, t));

  // Disegno vero e proprio: dipende dalla larghezza, quindi si rifà se cambia.
  let indice = null; // secondo selezionato dal mirino
  let geometria = null;
  const uid = ++contatoreGrafici;
  // L'animazione solo alla prima apertura (non a ogni ridimensionamento) e mai
  // per chi ha chiesto al sistema di ridurre i movimenti.
  let daAnimare = !matchMedia("(prefers-reduced-motion: reduce)").matches;

  function disegna() {
    const larghezza = Math.max(280, area.clientWidth || 600);
    const altezza = MARGINE.sopra + SERIE.length * (SPAZIO_TITOLO + ALTEZZA_FASCIA) + ALTEZZA_ASSE_X;
    area.textContent = "";
    const radice = svg("svg", { width: larghezza, height: altezza, viewBox: `0 0 ${larghezza} ${altezza}` }, area);
    area.appendChild(riquadro);

    // Sfumature verticali: colore della serie in alto, trasparente in basso.
    const defs = svg("defs", {}, radice);
    for (const s of SERIE) {
      const g = svg("linearGradient", { id: `sfumatura-${uid}-${s.chiave}`, x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
      svg("stop", { offset: "0%", "stop-color": s.colore, "stop-opacity": 0.32 }, g);
      svg("stop", { offset: "100%", "stop-color": s.colore, "stop-opacity": 0 }, g);
    }
    const linee = []; // per l'animazione

    const fine = punti[punti.length - 1].secondo;
    const x = (secondo) => MARGINE.sinistra + (secondo / fine) * (larghezza - MARGINE.sinistra - MARGINE.destra);

    const fasce = SERIE.map((s, i) => {
      const cima = MARGINE.sopra + i * (SPAZIO_TITOLO + ALTEZZA_FASCIA) + SPAZIO_TITOLO;
      const valori = punti.map((p) => p[s.chiave]).filter((v) => v !== null);
      const massimo = s.unita === "%" ? 100
        : s.chiave === "ppm" ? massimoTondo(Math.max(0, ...valori), 20, 20)
          : massimoTondo(Math.max(0, ...valori), 10, 10);
      const y = (v) => cima + ALTEZZA_FASCIA - (v / massimo) * ALTEZZA_FASCIA;

      // Titolo della fascia con pallino colorato (etichetta diretta) e, a destra, la media.
      svg("circle", { cx: MARGINE.sinistra + 5, cy: cima - 12, r: 5, fill: s.colore }, radice);
      const titolo = svg("text", { x: MARGINE.sinistra + 16, y: cima - 8, class: "titolo-fascia" }, radice);
      titolo.textContent = `${t(s.nome)} · ${s.unita === "%" ? "%" : t(s.unita)}`;
      if (valori.length) {
        const media = Math.round(valori.reduce((a, b) => a + b, 0) / valori.length);
        const testoMedia = svg("text", { x: larghezza - MARGINE.destra, y: cima - 8, class: "media-fascia", "text-anchor": "end" }, radice);
        testoMedia.textContent = `${t("media")} ${formatta(media, s.unita)}`;
      }
      // Griglia leggerissima: zero, metà e massimo.
      for (const v of [0, massimo / 2, massimo]) {
        svg("line", { x1: MARGINE.sinistra, x2: larghezza - MARGINE.destra, y1: y(v), y2: y(v), class: v === 0 ? "base" : "griglia" }, radice);
        const etichetta = svg("text", { x: MARGINE.sinistra - 8, y: y(v) + 4, class: "etichetta-asse", "text-anchor": "end" }, radice);
        etichetta.textContent = Math.round(v);
      }

      // La linea si interrompe dove la misura manca (null), invece di inventarla.
      let tratto = [];
      const tratti = [];
      for (const p of punti) {
        if (p[s.chiave] === null) { if (tratto.length) tratti.push(tratto); tratto = []; continue; }
        tratto.push([x(p.secondo), y(p[s.chiave])]);
      }
      if (tratto.length) tratti.push(tratto);
      const base = y(0);
      for (const tr of tratti) {
        if (tr.length === 1) { svg("circle", { cx: tr[0][0], cy: tr[0][1], r: 2.5, fill: s.colore }, radice); continue; }
        const curva = percorsoMonotono(tr);
        // Area sfumata: la stessa curva, chiusa verso lo zero della fascia.
        svg("path", {
          d: `${curva}L${tr[tr.length - 1][0]},${base}L${tr[0][0]},${base}Z`,
          fill: `url(#sfumatura-${uid}-${s.chiave})`, class: "area-serie",
        }, radice);
        linee.push(svg("path", { d: curva, class: "linea", stroke: s.colore }, radice));
      }

      // Picco di velocità: un solo valore segnato, il più interessante (niente numeri su ogni punto).
      if (s.chiave === "ppm" && valori.length) {
        const picco = punti.reduce((m, p) => (p.ppm !== null && p.ppm > m.ppm ? p : m), punti[0]);
        const px = x(picco.secondo), py = y(picco.ppm);
        svg("circle", { cx: px, cy: py, r: 4.5, fill: s.colore, class: "pallino-picco" }, radice);
        // L'etichetta non deve uscire dai bordi: si allinea verso l'interno.
        const ancora = px < MARGINE.sinistra + 50 ? "start" : px > larghezza - MARGINE.destra - 50 ? "end" : "middle";
        const etichetta = svg("text", { x: px, y: py - 10, class: "etichetta-picco", "text-anchor": ancora }, radice);
        etichetta.textContent = `${t("picco")} ${picco.ppm}`;
      }
      return { serie: s, y, cima };
    });

    // Asse del tempo: una tacca ogni 10 s (ogni 20 s per i test lunghi).
    const passoTacche = fine > 60 ? 20 : 10;
    const baseX = MARGINE.sopra + SERIE.length * (SPAZIO_TITOLO + ALTEZZA_FASCIA);
    for (let sec = 0; sec <= fine; sec += passoTacche) {
      // La prima tacca si allinea a sinistra: centrata finirebbe sopra lo "0" dell'asse verticale.
      const ancora = sec === 0 ? "start" : "middle";
      const e = svg("text", { x: x(sec), y: baseX + 18, class: "etichetta-asse", "text-anchor": ancora }, radice);
      e.textContent = `${sec} s`;
    }

    // Mirino: linea verticale su tutte le fasce + un punto su ogni linea.
    const mirino = svg("g", { class: "mirino", visibility: "hidden" }, radice);
    const lineaMirino = svg("line", { y1: MARGINE.sopra + SPAZIO_TITOLO, y2: baseX, class: "linea-mirino" }, mirino);
    const pallini = fasce.map((f) => svg("circle", { r: 5.5, fill: f.serie.colore, class: "pallino-mirino" }, mirino));

    // Bersaglio invisibile grande quanto il grafico: si punta al secondo, non alla linea.
    const bersaglio = svg("rect", {
      x: MARGINE.sinistra, y: 0, width: larghezza - MARGINE.sinistra - MARGINE.destra, height: baseX, fill: "transparent",
    }, radice);

    geometria = { x, fasce, mirino, lineaMirino, pallini, larghezza, fine };
    // Col dito: si tocca o si trascina in orizzontale (lo scorrimento verticale resta alla pagina).
    const punta = (e) => {
      const r = radice.getBoundingClientRect();
      const sec = ((e.clientX - r.left - MARGINE.sinistra) / (larghezza - MARGINE.sinistra - MARGINE.destra)) * fine;
      // Il punto più vicino al secondo puntato.
      let migliore = 0;
      punti.forEach((p, i) => { if (Math.abs(p.secondo - sec) < Math.abs(punti[migliore].secondo - sec)) migliore = i; });
      mostra(migliore);
    };
    bersaglio.addEventListener("pointermove", punta);
    bersaglio.addEventListener("pointerdown", punta);
    // Col dito il riquadro resta visibile dopo aver alzato il dito, finché non tocchi altrove.
    bersaglio.addEventListener("pointerleave", (e) => { if (e.pointerType !== "touch") nascondi(); });
    if (indice !== null) mostra(indice);

    // Le linee si "disegnano" da sinistra a destra: si nasconde il tratto con un
    // trattino lungo quanto la linea, poi lo si fa scorrere via.
    if (daAnimare) {
      daAnimare = false;
      for (const l of linee) {
        const lunghezza = l.getTotalLength();
        l.style.strokeDasharray = `${lunghezza}`;
        l.style.strokeDashoffset = `${lunghezza}`;
      }
      radice.classList.add("in-apertura");
      requestAnimationFrame(() => requestAnimationFrame(() => {
        for (const l of linee) {
          l.style.transition = `stroke-dashoffset ${DURATA_DISEGNO}ms cubic-bezier(.4,0,.2,1)`;
          l.style.strokeDashoffset = "0";
        }
        radice.classList.remove("in-apertura");
      }));
    }
  }

  function mostra(i) {
    indice = i;
    const { x, fasce, mirino, lineaMirino, pallini, larghezza } = geometria;
    const p = punti[i];
    const px = x(p.secondo);
    mirino.setAttribute("visibility", "visible");
    lineaMirino.setAttribute("x1", px);
    lineaMirino.setAttribute("x2", px);
    fasce.forEach((f, k) => {
      const v = p[f.serie.chiave];
      pallini[k].setAttribute("visibility", v === null ? "hidden" : "visible");
      if (v !== null) { pallini[k].setAttribute("cx", px); pallini[k].setAttribute("cy", f.y(v)); }
    });

    // Riquadro con TUTTE le serie in quel secondo; i nomi entrano come testo, mai come HTML.
    riquadro.textContent = "";
    const testa = document.createElement("strong");
    testa.textContent = `${p.secondo} s`;
    riquadro.appendChild(testa);
    for (const s of SERIE) {
      const riga = document.createElement("div");
      const campione = document.createElement("span");
      campione.className = "campione";
      campione.style.background = s.colore;
      const valore = document.createElement("b");
      valore.textContent = formatta(p[s.chiave], s.unita);
      riga.append(campione, `${t(s.nome)} `, valore);
      riquadro.appendChild(riga);
    }
    riquadro.hidden = false;
    // Il riquadro sta dal lato opposto al mirino, così non copre la zona puntata.
    const aSinistra = px > larghezza / 2;
    riquadro.style.left = aSinistra ? "" : `${px + 12}px`;
    riquadro.style.right = aSinistra ? `${larghezza - px + 12}px` : "";
  }

  function nascondi() {
    if (document.activeElement === area) return; // da tastiera resta visibile
    indice = null;
    geometria.mirino.setAttribute("visibility", "hidden");
    riquadro.hidden = true;
  }

  // Da tastiera: frecce per scorrere i secondi, Home/Fine per gli estremi.
  area.addEventListener("keydown", (e) => {
    const mosse = { ArrowLeft: -1, ArrowRight: 1, Home: -Infinity, End: Infinity };
    if (!(e.key in mosse)) return;
    e.preventDefault();
    const partenza = indice ?? (mosse[e.key] > 0 ? -1 : punti.length);
    mostra(Math.max(0, Math.min(punti.length - 1, partenza + mosse[e.key])));
  });
  area.addEventListener("focus", () => { if (indice === null) mostra(0); });
  area.addEventListener("blur", () => { indice = null; geometria.mirino.setAttribute("visibility", "hidden"); riquadro.hidden = true; });

  disegna();
  if (typeof ResizeObserver !== "undefined") {
    let ultimaLarghezza = area.clientWidth;
    contenitore._osservatore = new ResizeObserver(() => {
      if (area.clientWidth !== ultimaLarghezza) { ultimaLarghezza = area.clientWidth; disegna(); }
    });
    contenitore._osservatore.observe(area);
  }
}

/* Tabella con tutti i valori: per chi non può o non vuole leggere il grafico. */
function tabellaDati(punti, t) {
  const dettagli = document.createElement("details");
  dettagli.className = "dati-grafico";
  const sommario = document.createElement("summary");
  sommario.textContent = t("tabellaDati");
  const tabella = document.createElement("table");
  const intestazione = tabella.createTHead().insertRow();
  for (const titolo of [t("secondo"), ...SERIE.map((s) => `${t(s.nome)} (${s.unita === "%" ? "%" : t(s.unita)})`)]) {
    const th = document.createElement("th");
    th.textContent = titolo;
    intestazione.appendChild(th);
  }
  const corpo = tabella.createTBody();
  for (const p of punti) {
    const riga = corpo.insertRow();
    riga.insertCell().textContent = p.secondo;
    for (const s of SERIE) riga.insertCell().textContent = formatta(p[s.chiave], s.unita);
  }
  dettagli.append(sommario, tabella);
  return dettagli;
}

if (typeof module !== "undefined") module.exports = { percorsoMonotono, massimoTondo };
