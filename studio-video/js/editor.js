/*
 * Editor di Studio Video: pannelli, anteprima, ritocchi a mano, generatore
 * rapido, esportazione. Tutto gira nel browser; il progetto si salva da solo
 * (IndexedDB).
 *
 * Ritocchi a mano: nell'anteprima in pausa si clicca un elemento (titolo,
 * pulsante, schermata...), lo si trascina, lo si ingrandisce dalla maniglia,
 * gli si cambia colore o lo si nasconde. Le regolazioni stanno in
 * scena.regola[id] e il motore le applica in anteprima e in esportazione.
 */
(function () {
  "use strict";

  const SV = window.StudioVideo;
  const $ = (sel) => document.querySelector(sel);

  // ---------------------------------------------------------------- stato

  const stato = {
    progetto: null,
    selezionata: 0,
    t: 0,
    inRiproduzione: false,
    posizionamento: false, // tutorial: clic sull'anteprima = nuovo passo
    risorse: new Map(),
    elementi: [], // riquadri dell'ultimo fotogramma disegnato
    elemento: null, // id dell'elemento selezionato
    sopra: null, // id dell'elemento sotto il mouse
    guide: { x: false, y: false },
    gesto: null, // trascinamento in corso
  };

  const tela = $("#tela");
  const ctx = tela.getContext("2d");
  const audio = new Audio();
  const ROSA = "#ff3e7f";

  function progettoIniziale() {
    return SV.MODELLI.presentazione.crea({
      nome: "Il mio sito",
      slogan: "La promessa del tuo sito in una frase",
      url: "https://iltuosito.it",
      vantaggi: "Primo vantaggio concreto\nSecondo vantaggio concreto\nTerzo vantaggio concreto",
      invito: "Visita il sito",
      tema: "limone",
    });
  }

  // ------------------------------------------------------------ campi scena

  // [chiave, tipo, etichetta, opzioni]
  const SCHEMI = {
    titolo: [
      ["etichetta", "testo", "Etichetta sopra il titolo (facoltativa)", { segnaposto: "Es. Novità" }],
      ["titolo", "area", "Titolo"],
      ["sottotitolo", "area", "Sottotitolo"],
      ["logo", "immagine", "Logo (vuoto = quello del marchio)", { conserva: true }],
    ],
    punti: [
      ["titolo", "testo", "Titolo"],
      ["punti", "righe", "Punti (uno per riga, massimo 6)"],
    ],
    schermata: [
      ["titolo", "area", "Titolo (vuoto = solo schermata, a tutto schermo)"],
      ["testo", "area", "Testo"],
      ["immagine", "immagine", "Schermata (ideale: pagina intera)"],
      ["dispositivo", "scelta", "Dispositivo", { browser: "Browser", telefono: "Telefono" }],
      ["scorri", "spunta", "Scorri la pagina dall'alto in basso"],
      ["url", "testo", "Indirizzo nella barra (vuoto = marchio)"],
    ],
    tutorial: [
      ["titolo", "testo", "Titolo"],
      ["immagine", "immagine", "Schermata su cui mostrare i passi"],
      ["zoom", "spunta", "Zoom che segue il cursore"],
      ["url", "testo", "Indirizzo nella barra (vuoto = marchio)"],
      ["passi", "passi", "Passi"],
    ],
    numeri: [
      ["titolo", "testo", "Titolo"],
      ["valori", "valori", "Numeri (massimo 4)"],
    ],
    citazione: [
      ["testo", "area", "Recensione"],
      ["autore", "testo", "Autore"],
      ["ruolo", "testo", "Ruolo o azienda"],
      ["stelle", "numero", "Stelle (0 = nessuna)", { min: 0, max: 5, step: 1 }],
    ],
    cta: [
      ["titolo", "area", "Titolo"],
      ["pulsante", "testo", "Testo del pulsante"],
      ["url", "testo", "Indirizzo (vuoto = marchio)"],
      ["logo", "immagine", "Logo (vuoto = quello del marchio)", { conserva: true }],
      ["clic", "spunta", "Il cursore clicca il pulsante"],
    ],
  };

  // ------------------------------------------------------------- utilità

  function elemento(tag, attributi = {}, figli = []) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attributi)) {
      if (k === "testo") e.textContent = v;
      else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
      else if (k === "classe") e.className = v;
      else if (v === true) e.setAttribute(k, "");
      else if (v !== false && v != null) e.setAttribute(k, v);
    }
    for (const f of [].concat(figli)) if (f) e.append(f);
    return e;
  }

  function mmss(sec) {
    const s = Math.max(0, sec);
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  }

  function nomeSicuro(testo) {
    return (testo || "video").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "video";
  }

  function scarica(blob, nome) {
    const a = elemento("a", { href: URL.createObjectURL(blob), download: nome });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 60000);
  }

  function leggiFile(file) {
    return new Promise((ok, ko) => {
      const r = new FileReader();
      r.onload = () => ok(r.result);
      r.onerror = () => ko(r.error);
      r.readAsDataURL(file);
    });
  }

  // Le schermate a pagina intera possono essere enormi: si riducono a una
  // larghezza ragionevole così il progetto resta leggero e fluido.
  async function leggiImmagine(file, conserva) {
    const url = await leggiFile(file);
    if (conserva || file.type === "image/svg+xml") return url;
    const img = new Image();
    img.src = url;
    await img.decode();
    const MAX = 2000;
    if (img.width <= MAX && file.size < 1.5e6) return url;
    const k = Math.min(1, MAX / img.width);
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * k);
    c.height = Math.min(30000, Math.round(img.height * k));
    c.getContext("2d").drawImage(img, 0, 0, c.width, Math.round(img.height * k));
    return c.toDataURL("image/jpeg", 0.9);
  }

  // ------------------------------------------------------ annulla / ripeti

  // Le istantanee sostituiscono le immagini (data URL lunghissime) con un
  // segnaposto: 50 passi di storia non pesano 50 volte le immagini.
  const deposito = new Map();
  const depositoInverso = new Map();
  function istantanea() {
    return JSON.stringify(stato.progetto, (k, v) => {
      if (typeof v === "string" && v.length > 2000 && v.startsWith("data:")) {
        if (!deposito.has(v)) {
          const id = `§img${deposito.size}§`;
          deposito.set(v, id);
          depositoInverso.set(id, v);
        }
        return deposito.get(v);
      }
      return v;
    });
  }
  function daIstantanea(testo) {
    return JSON.parse(testo, (k, v) => (typeof v === "string" && depositoInverso.has(v) ? depositoInverso.get(v) : v));
  }

  const storia = { indietro: [], avanti: [], ultimaChiave: null, ultimoMomento: 0 };

  function registraStoria(chiave) {
    const ora = Date.now();
    // le modifiche continue allo stesso campo diventano un solo passo
    if (chiave && chiave === storia.ultimaChiave && ora - storia.ultimoMomento < 1200) {
      storia.ultimoMomento = ora;
      return;
    }
    storia.indietro.push(istantanea());
    if (storia.indietro.length > 80) storia.indietro.shift();
    storia.avanti = [];
    storia.ultimaChiave = chiave;
    storia.ultimoMomento = ora;
    aggiornaPulsantiStoria();
  }

  function ripristina(da, verso) {
    if (!da.length) return;
    verso.push(istantanea());
    stato.progetto = daIstantanea(da.pop());
    storia.ultimaChiave = null;
    stato.selezionata = Math.min(stato.selezionata, stato.progetto.scene.length - 1);
    salvaPresto();
    mostraProgetto();
    mostraScene();
    mostraProprieta();
    aggiornaPulsantiStoria();
    SV.caricaRisorse(stato.progetto, stato.risorse).then(ridisegna);
  }
  const annulla = () => ripristina(storia.indietro, storia.avanti);
  const ripeti = () => ripristina(storia.avanti, storia.indietro);

  function aggiornaPulsantiStoria() {
    $("#annulla").disabled = !storia.indietro.length;
    $("#ripeti").disabled = !storia.avanti.length;
  }

  // ------------------------------------------------------ salvataggio auto

  let timerSalva = 0;
  function salvaPresto() {
    clearTimeout(timerSalva);
    timerSalva = setTimeout(() => {
      SV.archivio.scrivi(stato.progetto).catch((e) => console.warn("Salvataggio non riuscito", e));
    }, 500);
  }

  // ---------------------------------------------------------- disegno

  let richiesto = false;
  function ridisegna() {
    if (richiesto) return;
    richiesto = true;
    requestAnimationFrame(() => {
      richiesto = false;
      disegnaOra();
    });
  }

  function scenaSelezionata() {
    return stato.progetto.scene[stato.selezionata] || null;
  }

  function inPosizionamento() {
    const sc = scenaSelezionata();
    return stato.posizionamento && !stato.inRiproduzione && sc && sc.tipo === "tutorial";
  }

  // L'anteprima occupa il massimo spazio possibile senza deformarsi.
  function adattaCornice() {
    const palco = $(".palco");
    const cornice = $("#cornice-tela");
    const larga = palco.clientWidth - 48;
    const comandi = 150;
    const alta = window.innerWidth > 1100 ? palco.clientHeight - comandi : window.innerHeight * 0.7;
    const k = Math.min(larga / tela.width, Math.max(160, alta) / tela.height);
    cornice.style.width = `${Math.floor(tela.width * k)}px`;
    cornice.style.height = `${Math.floor(tela.height * k)}px`;
  }
  window.addEventListener("resize", adattaCornice);

  function disegnaOra({ pulito = false } = {}) {
    const progetto = stato.progetto;
    const { w, h } = SV.dimensioni(progetto);
    if (tela.width !== w || tela.height !== h) {
      tela.width = w;
      tela.height = h;
      adattaCornice();
    }
    const posa = inPosizionamento();
    stato.elementi = SV.disegna(ctx, progetto, stato.risorse, stato.t, { modifica: posa, registra: true });
    if (!pulito) {
      if (posa) disegnaSegniPassi();
      if (!stato.inRiproduzione) disegnaSelezione();
    }
    $("#suggerimento-tutorial").hidden = !posa || pulito;
    aggiornaTempo();
    aggiornaElementiPannello();
  }

  function geometriaSelezionata() {
    const sc = scenaSelezionata();
    const u = Math.min(tela.width, tela.height) / 100;
    const img = sc.immagine ? stato.risorse.get(sc.immagine) : null;
    return { sc, u, m: SV.geometriaTutorial(tela.width, tela.height, u, sc, img).m };
  }

  function disegnaSegniPassi() {
    const { sc, u, m } = geometriaSelezionata();
    (sc.passi || []).forEach((p, i) => {
      const x = m.vx + p.x * m.vw;
      const y = m.vy + p.y * m.vh;
      ctx.beginPath();
      ctx.arc(x, y, 3 * u, 0, Math.PI * 2);
      ctx.fillStyle = ROSA;
      ctx.fill();
      ctx.lineWidth = 0.45 * u;
      ctx.strokeStyle = "#111";
      ctx.stroke();
      ctx.fillStyle = "#fff";
      ctx.font = `800 ${Math.round(3 * u)}px "SV Bricolage", system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(i + 1), x, y + 0.1 * u);
    });
  }

  function pixelSchermo() {
    return tela.width / Math.max(1, tela.getBoundingClientRect().width);
  }

  function elementoDa(id) {
    return stato.elementi.find((e) => e.id === id) || null;
  }

  function maniglia(e) {
    const p = pixelSchermo();
    return { x: e.x + e.w, y: e.y + e.h, r: 9 * p };
  }

  function disegnaSelezione() {
    const p = pixelSchermo();
    ctx.save();
    const sopra = stato.sopra !== stato.elemento ? elementoDa(stato.sopra) : null;
    if (sopra && !sopra.nascosto) {
      ctx.setLineDash([6 * p, 4 * p]);
      ctx.lineWidth = 1.5 * p;
      ctx.strokeStyle = ROSA;
      ctx.strokeRect(sopra.x - 4 * p, sopra.y - 4 * p, sopra.w + 8 * p, sopra.h + 8 * p);
      ctx.setLineDash([]);
    }
    const sel = elementoDa(stato.elemento);
    if (sel && !sel.nascosto) {
      const x = sel.x - 5 * p;
      const y = sel.y - 5 * p;
      const w = sel.w + 10 * p;
      const h = sel.h + 10 * p;
      ctx.lineWidth = 2.5 * p;
      ctx.strokeStyle = ROSA;
      ctx.strokeRect(x, y, w, h);
      // etichetta col nome
      ctx.font = `700 ${Math.round(12 * p)}px "SV Bricolage", system-ui, sans-serif`;
      const tw = ctx.measureText(sel.nome).width + 14 * p;
      const ey = y - 22 * p < 0 ? y + h + 2 * p : y - 22 * p;
      ctx.fillStyle = ROSA;
      ctx.fillRect(x - 1.25 * p, ey, tw, 20 * p);
      ctx.fillStyle = "#fff";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(sel.nome, x + 6 * p, ey + 10.5 * p);
      // maniglia per ingrandire
      const mn = maniglia({ x, y, w, h });
      ctx.fillStyle = "#fff";
      ctx.fillRect(mn.x - mn.r, mn.y - mn.r, mn.r * 2, mn.r * 2);
      ctx.lineWidth = 2.5 * p;
      ctx.strokeRect(mn.x - mn.r, mn.y - mn.r, mn.r * 2, mn.r * 2);
    }
    // guide di centratura durante lo spostamento
    if (stato.gesto && stato.gesto.tipo === "sposta") {
      ctx.lineWidth = 1.5 * p;
      ctx.strokeStyle = "#2b45ff";
      ctx.setLineDash([8 * p, 6 * p]);
      if (stato.guide.x) {
        ctx.beginPath();
        ctx.moveTo(tela.width / 2, 0);
        ctx.lineTo(tela.width / 2, tela.height);
        ctx.stroke();
      }
      if (stato.guide.y) {
        ctx.beginPath();
        ctx.moveTo(0, tela.height / 2);
        ctx.lineTo(tela.width, tela.height / 2);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function aggiornaTempo() {
    const tot = SV.durataTotale(stato.progetto);
    $("#tempo").textContent = `${mmss(stato.t)} / ${mmss(tot)}`;
    if (!cursoreTempoAttivo) $("#cursore-tempo").value = String(tot ? Math.round((stato.t / tot) * 1000) : 0);
    const testina = $("#testina");
    if (testina) testina.style.left = `${tot ? (stato.t / tot) * 100 : 0}%`;
    const voce = SV.scenaA(stato.progetto, stato.t);
    document.querySelectorAll(".elenco-scene li").forEach((li, i) => li.classList.toggle("in-onda", Boolean(voce) && i === voce.indice));
  }

  // ------------------------------------------------------- riproduzione

  let inizioReale = 0;
  let inizioT = 0;

  function riproduci() {
    const tot = SV.durataTotale(stato.progetto);
    if (!tot) return;
    if (stato.t >= tot - 0.05) stato.t = 0;
    stato.inRiproduzione = true;
    stato.posizionamento = false;
    inizioReale = performance.now();
    inizioT = stato.t;
    $("#riproduci").textContent = "❚❚";
    $("#riproduci").setAttribute("aria-label", "Pausa");
    if (stato.progetto.musica) {
      audio.volume = Number(stato.progetto.volume ?? 0.8);
      audio.currentTime = stato.t;
      audio.play().catch(() => {});
    }
    requestAnimationFrame(passo);
  }

  function pausa() {
    stato.inRiproduzione = false;
    audio.pause();
    $("#riproduci").textContent = "▶";
    $("#riproduci").setAttribute("aria-label", "Riproduci");
    ridisegna();
  }

  function passo(ora) {
    if (!stato.inRiproduzione) return;
    const tot = SV.durataTotale(stato.progetto);
    stato.t = inizioT + (ora - inizioReale) / 1000;
    if (stato.t >= tot) {
      stato.t = tot;
      disegnaOra();
      pausa();
      return;
    }
    disegnaOra();
    requestAnimationFrame(passo);
  }

  function vaiA(t) {
    stato.t = Math.max(0, Math.min(t, SV.durataTotale(stato.progetto)));
    if (stato.inRiproduzione) {
      inizioReale = performance.now();
      inizioT = stato.t;
      if (stato.progetto.musica) audio.currentTime = stato.t;
    }
    ridisegna();
  }

  // ---------------------------------------------------- pannello progetto

  function riempiScelta(select, voci, valore) {
    select.replaceChildren(...Object.entries(voci).map(([k, v]) => elemento("option", { value: k, testo: typeof v === "string" ? v : v.nome })));
    if (valore != null) select.value = valore;
  }

  // Temi raggruppati per stile, così si vede che sono linguaggi diversi.
  function riempiTemi(select, valore) {
    const gruppi = Object.keys(SV.STILI).map((stile) => elemento("optgroup", { label: SV.STILI[stile] },
      Object.entries(SV.TEMI).filter(([, t]) => t.stile === stile).map(([k, t]) => elemento("option", { value: k, testo: t.nome }))));
    select.replaceChildren(...gruppi);
    if (valore) select.value = valore;
  }

  function mostraProgetto() {
    const p = stato.progetto;
    $("#nome-progetto").value = p.nome || "";
    riempiScelta($("#formato"), SV.FORMATI, p.formato);
    riempiTemi($("#tema"), p.tema);
    riempiScelta($("#carattere"), SV.CARATTERI, p.carattere || "auto");
    riempiScelta($("#transizione"), SV.TRANSIZIONI, p.transizione);
    riempiScelta($("#animazione"), SV.ANIMAZIONI, p.animazione || "auto");
    $("#accento").value = p.accento || SV.TEMI[p.tema]?.accento || "#ff3e7f";
    $("#marchio-nome").value = p.marchio?.nome || "";
    $("#marchio-url").value = p.marchio?.url || "";
    campoImmagine($("#marchio-logo"), p.marchio?.logo, (v) => modifica(() => (p.marchio.logo = v)), true);
    $("#volume").value = String(p.volume ?? 0.8);
    mostraMusica();
    if (SV.libreria) SV.libreria.mostraStato();
  }

  function mostraMusica() {
    const p = stato.progetto;
    $("#musica-nome").textContent = p.musica ? p.musicaNome || "Musica caricata" : "Nessuna musica";
    $("#musica-togli").hidden = !p.musica;
    audio.src = p.musica || "";
  }

  // Applica una modifica al progetto (con passo di storia).
  // struttura=true quando cambiano le scene; chiave = raggruppa le modifiche continue.
  function modifica(fn, { struttura = false, proprieta = false, chiave = null } = {}) {
    registraStoria(chiave);
    fn();
    salvaPresto();
    if (struttura) mostraScene();
    else aggiornaElencoLeggero();
    if (proprieta) mostraProprieta();
    SV.caricaRisorse(stato.progetto, stato.risorse).then(ridisegna);
    ridisegna();
  }

  // ------------------------------------------------------------- scene

  function riassunto(sc) {
    const testo = sc.titolo || sc.testo || (sc.punti && sc.punti[0]) || "";
    return String(testo).replace(/\s+/g, " ").trim() || "(senza titolo)";
  }

  function mostraScene() {
    const ol = $("#elenco-scene");
    const scene = stato.progetto.scene;
    ol.replaceChildren(...scene.map((sc, i) => {
      const tipo = SV.TIPI[sc.tipo] || { nome: sc.tipo, icona: "?" };
      const azione = (testo, titolo, fn, disab) => elemento("button", {
        type: "button", classe: "mini", title: titolo, "aria-label": titolo, disabled: disab,
        onclick: (e) => { e.stopPropagation(); fn(); },
      }, testo);
      return elemento("li", { classe: `tipo-${sc.tipo}${i === stato.selezionata ? " selezionata" : ""}`, onclick: () => seleziona(i) }, [
        elemento("span", { classe: "icona-scena", testo: tipo.icona }),
        elemento("span", { classe: "testo-scena" }, [
          elemento("strong", { testo: `${i + 1}. ${tipo.nome}` }),
          elemento("small", { classe: "riassunto", testo: riassunto(sc) }),
        ]),
        elemento("span", { classe: "durata-scena", testo: `${Number(sc.durata).toFixed(1).replace(".0", "")}s` }),
        elemento("span", { classe: "azioni-scena" }, [
          azione("↑", "Sposta su", () => sposta(i, -1), i === 0),
          azione("↓", "Sposta giù", () => sposta(i, 1), i === scene.length - 1),
          azione("⧉", "Duplica", () => duplica(i)),
          azione("✕", "Elimina", () => elimina(i), scene.length <= 1),
        ]),
      ]);
    }));
    mostraLineaTempo();
    aggiornaElencoLeggero();
  }

  function aggiornaElencoLeggero() {
    const scene = stato.progetto.scene;
    document.querySelectorAll(".elenco-scene li").forEach((li, i) => {
      if (!scene[i]) return;
      li.querySelector(".riassunto").textContent = riassunto(scene[i]);
      li.querySelector(".durata-scena").textContent = `${Number(scene[i].durata).toFixed(1).replace(".0", "")}s`;
    });
    $("#durata-totale").textContent = mmss(SV.durataTotale(stato.progetto));
    mostraLineaTempo();
  }

  function mostraLineaTempo() {
    const tot = SV.durataTotale(stato.progetto) || 1;
    const linea = $("#linea-tempo");
    linea.replaceChildren(
      ...SV.tempi(stato.progetto).map((v) => elemento("button", {
        type: "button",
        classe: `blocco tipo-${v.scena.tipo}${v.indice === stato.selezionata ? " selezionata" : ""}`,
        style: `flex-grow:${v.durata / tot}`,
        title: `${SV.TIPI[v.scena.tipo]?.nome || v.scena.tipo} · ${v.durata} s`,
        onclick: () => seleziona(v.indice),
      }, elemento("span", { testo: SV.TIPI[v.scena.tipo]?.icona || "" }))),
      elemento("div", { id: "testina", classe: "testina" }),
    );
    aggiornaTempo();
  }

  function seleziona(i) {
    const cambia = i !== stato.selezionata;
    stato.selezionata = Math.max(0, Math.min(i, stato.progetto.scene.length - 1));
    if (cambia) stato.elemento = null;
    if (stato.inRiproduzione) pausa();
    const v = SV.tempi(stato.progetto)[stato.selezionata];
    if (v) {
      if (v.scena.tipo === "tutorial") {
        stato.posizionamento = true;
        stato.t = v.inizio + 0.01;
      } else {
        stato.posizionamento = false;
        stato.t = v.inizio + Math.max(0, v.durata - 0.6);
      }
    }
    mostraScene();
    mostraProprieta();
    ridisegna();
  }

  function sposta(i, verso) {
    const j = i + verso;
    if (j < 0 || j >= stato.progetto.scene.length) return;
    modifica(() => {
      const s = stato.progetto.scene;
      [s[i], s[j]] = [s[j], s[i]];
    }, { struttura: true });
    seleziona(j);
  }

  function duplica(i) {
    modifica(() => stato.progetto.scene.splice(i + 1, 0, JSON.parse(JSON.stringify(stato.progetto.scene[i]))), { struttura: true });
    seleziona(i + 1);
  }

  function elimina(i) {
    if (stato.progetto.scene.length <= 1) return;
    modifica(() => stato.progetto.scene.splice(i, 1), { struttura: true });
    seleziona(Math.min(i, stato.progetto.scene.length - 1));
  }

  function aggiungi(tipo) {
    const i = stato.selezionata + 1;
    modifica(() => stato.progetto.scene.splice(i, 0, SV.TIPI[tipo].vuota()), { struttura: true });
    seleziona(i);
  }

  // ------------------------------------------------- regolazioni elementi

  function regola(id, crea = true) {
    const sc = scenaSelezionata();
    if (!sc) return {};
    if (!sc.regola) {
      if (!crea) return {};
      sc.regola = {};
    }
    if (!sc.regola[id] && crea) sc.regola[id] = {};
    return sc.regola[id] || {};
  }

  function pulisciRegola(id) {
    const sc = scenaSelezionata();
    if (!sc || !sc.regola || !sc.regola[id]) return;
    const r = sc.regola[id];
    for (const k of Object.keys(r)) if (r[k] === "" || r[k] == null || r[k] === false || (k === "scala" && r[k] === 1) || ((k === "dx" || k === "dy") && r[k] === 0)) delete r[k];
    if (!Object.keys(r).length) delete sc.regola[id];
    if (!Object.keys(sc.regola).length) delete sc.regola;
  }

  function selezionaElemento(id) {
    stato.elemento = id;
    mostraPannelloElemento();
    ridisegna();
  }

  // Pannello dell'elemento selezionato + elenco di tutti gli elementi della scena.
  function mostraPannelloElemento() {
    const box = $("#pannello-elemento");
    const el = elementoDa(stato.elemento);
    if (!el) {
      box.replaceChildren(elemento("p", { classe: "nota", testo: "Clicca un elemento nell'anteprima (in pausa) per spostarlo, ingrandirlo o ricolorarlo. Doppio clic = modifica il testo." }));
      return;
    }
    const r = regola(el.id, false);
    const tema = SV.temaDi(stato.progetto);
    const scala = Math.round((Number(r.scala) || 1) * 100);
    const campi = [
      elemento("div", { classe: "testa-elemento" }, [
        elemento("strong", { testo: el.nome }),
        elemento("button", { type: "button", classe: "mini", title: "Deseleziona", "aria-label": "Deseleziona", onclick: () => selezionaElemento(null) }, "✕"),
      ]),
      elemento("label", { classe: "campo" }, [
        elemento("span", { classe: "riga-etichetta" }, ["Dimensione ", elemento("output", { id: "uscita-scala", testo: `${scala}%` })]),
        elemento("input", {
          type: "range", min: 30, max: 300, step: 1, value: scala,
          oninput: (e) => {
            $("#uscita-scala").textContent = `${e.target.value}%`;
            modifica(() => {
              regola(el.id).scala = Number(e.target.value) / 100;
              pulisciRegola(el.id);
            }, { chiave: `scala-${el.id}` });
          },
        }),
      ]),
    ];
    if (el.colorabile) {
      campi.push(elemento("div", { classe: "campo" }, [
        "Colore",
        elemento("div", { classe: "riga-colore" }, [
          elemento("input", {
            type: "color", value: r.colore || tema.accento, "aria-label": "Colore dell'elemento",
            oninput: (e) => modifica(() => (regola(el.id).colore = e.target.value), { chiave: `colore-${el.id}` }),
          }),
          ...[...new Set([tema.testo, tema.accento, tema.tenue, "#ffffff", "#111111"].map((c) => c.toLowerCase()))].map((c) => elemento("button", {
            type: "button", classe: "campione", style: `background:${c}`, title: c, "aria-label": `Usa ${c}`,
            onclick: () => {
              modifica(() => (regola(el.id).colore = c));
              mostraPannelloElemento();
            },
          })),
          elemento("button", { type: "button", classe: "pulsante piccolo", onclick: () => { modifica(() => { delete regola(el.id).colore; pulisciRegola(el.id); }); mostraPannelloElemento(); } }, "Originale"),
        ]),
      ]));
    }
    campi.push(elemento("div", { classe: "azioni-elemento" }, [
      el.campo ? elemento("button", { type: "button", classe: "pulsante piccolo", onclick: () => vaiAlCampo(el.campo) }, "✎ Testo") : "",
      elemento("button", { type: "button", classe: "pulsante piccolo", onclick: () => { modifica(() => { const q = regola(el.id); delete q.dx; delete q.dy; pulisciRegola(el.id); }); } }, "Rimetti a posto"),
      elemento("button", { type: "button", classe: "pulsante piccolo", onclick: () => { modifica(() => { delete scenaSelezionata().regola?.[el.id]; pulisciRegola(el.id); }); mostraPannelloElemento(); } }, "Azzera tutto"),
      elemento("button", { type: "button", classe: "pulsante piccolo pericolo", onclick: () => nascondi(el.id, true) }, "Nascondi"),
    ]));
    campi.push(elemento("p", { classe: "nota", testo: "Frecce = sposta di poco (Maiusc = di più) · Canc = nascondi · Esc = deseleziona" }));
    box.replaceChildren(...campi);
  }

  function nascondi(id, si) {
    modifica(() => {
      regola(id).nascosto = si;
      pulisciRegola(id);
    });
    if (si && stato.elemento === id) stato.elemento = null;
    mostraPannelloElemento();
  }

  // Elenco compatto degli elementi della scena con l'occhio per mostrarli/nasconderli.
  let firmaElementi = "";
  function aggiornaElementiPannello() {
    const lista = $("#lista-elementi");
    if (!lista || stato.inRiproduzione) return;
    const firma = stato.elementi.map((e) => `${e.id}:${e.nascosto}`).join("|") + `#${stato.elemento}`;
    if (firma === firmaElementi) return;
    firmaElementi = firma;
    lista.replaceChildren(...stato.elementi.map((e) => elemento("li", { classe: `${e.id === stato.elemento ? "attivo" : ""}${e.nascosto ? " spento" : ""}` }, [
      elemento("button", { type: "button", classe: "nome-elemento", onclick: () => !e.nascosto && selezionaElemento(e.id), disabled: e.nascosto }, e.nome),
      elemento("button", {
        type: "button", classe: "mini", title: e.nascosto ? "Mostra" : "Nascondi", "aria-label": e.nascosto ? `Mostra ${e.nome}` : `Nascondi ${e.nome}`,
        onclick: () => nascondi(e.id, !e.nascosto),
      }, e.nascosto ? "◌" : "◉"),
    ])));
    if (stato.elemento && !elementoDa(stato.elemento)) stato.elemento = null;
  }

  function vaiAlCampo(chiave) {
    const campo = document.querySelector(`#proprieta [data-chiave="${chiave}"]`);
    if (!campo) return;
    campo.scrollIntoView({ block: "center", behavior: "smooth" });
    campo.focus();
    if (campo.select) campo.select();
    campo.classList.add("lampeggia");
    setTimeout(() => campo.classList.remove("lampeggia"), 900);
  }

  // --------------------------------------------------------- proprietà

  // Campo immagine: clic o trascinamento, anteprima e "Togli".
  function campoImmagine(contenitore, valore, alCambio, conserva) {
    const disegnaCampo = (v) => {
      const input = elemento("input", { type: "file", accept: "image/*", hidden: true });
      const carica = async (file) => {
        if (!file || !file.type.startsWith("image/")) return;
        try {
          const nuovo = await leggiImmagine(file, conserva);
          alCambio(nuovo);
          disegnaCampo(nuovo);
        } catch (e) {
          alert("Immagine non leggibile: prova con PNG o JPG.");
        }
      };
      input.addEventListener("change", () => carica(input.files[0]));
      const zona = elemento("button", { type: "button", classe: "zona-immagine", onclick: () => input.click() },
        v ? elemento("img", { src: v, alt: "" }) : elemento("span", { classe: "vuoto", testo: "Trascina qui o clicca per caricare" }));
      zona.addEventListener("dragover", (e) => { e.preventDefault(); zona.classList.add("sopra"); });
      zona.addEventListener("dragleave", () => zona.classList.remove("sopra"));
      zona.addEventListener("drop", (e) => { e.preventDefault(); zona.classList.remove("sopra"); carica(e.dataTransfer.files[0]); });
      const togli = v ? elemento("button", { type: "button", classe: "pulsante piccolo", onclick: () => { alCambio(""); disegnaCampo(""); } }, "Togli") : "";
      contenitore.replaceChildren(zona, input, togli);
    };
    disegnaCampo(valore);
  }

  function mostraProprieta() {
    const sc = scenaSelezionata();
    const box = $("#proprieta");
    if (!sc) {
      box.replaceChildren();
      return;
    }
    $("#titolo-proprieta").textContent = `${stato.selezionata + 1}. ${SV.TIPI[sc.tipo]?.nome || sc.tipo}`;
    const campi = [
      elemento("label", { classe: "campo" }, [
        "Durata (secondi)",
        elemento("input", {
          type: "number", min: 1, max: 60, step: 0.5, value: sc.durata,
          oninput: (e) => {
            const v = parseFloat(e.target.value);
            if (isFinite(v) && v >= 1) modifica(() => (sc.durata = v), { chiave: "durata" });
          },
        }),
      ]),
    ];
    for (const [k, tipo, etichetta, opz = {}] of SCHEMI[sc.tipo] || []) campi.push(creaCampo(sc, k, tipo, etichetta, opz));
    campi.push(elemento("p", { classe: "nota", testo: "Modello per tante marche? Nei testi scrivi {nome} {slogan} {invito} {sito} {vantaggio1}… (o {vantaggi} su una riga dei punti): applicando una marca diventano i suoi testi." }));
    box.replaceChildren(...campi);
    mostraStileScena();
    firmaElementi = "";
    mostraPannelloElemento();
  }

  // Stile della singola scena: animazione del testo e sfondo.
  function mostraStileScena() {
    const sc = scenaSelezionata();
    const box = $("#stile-scena");
    const sf = sc.sfondo || { tipo: "tema" };
    const anim = elemento("select", { onchange: (e) => modifica(() => { if (e.target.value === "auto") delete sc.animazione; else sc.animazione = e.target.value; }) });
    riempiScelta(anim, Object.assign({}, SV.ANIMAZIONI, { auto: "Quella del progetto" }), sc.animazione || "auto");
    const tipo = elemento("select", {
      onchange: (e) => {
        modifica(() => {
          if (e.target.value === "tema") delete sc.sfondo;
          else sc.sfondo = Object.assign({ colore: "#111111", velo: 0.45 }, sc.sfondo, { tipo: e.target.value });
        });
        mostraStileScena();
      },
    });
    riempiScelta(tipo, { tema: "Quello del tema", colore: "Colore pieno", immagine: "Foto / immagine" }, sf.tipo);
    const campi = [
      elemento("label", { classe: "campo" }, ["Animazione del testo", anim]),
      elemento("label", { classe: "campo" }, ["Sfondo della scena", tipo]),
    ];
    if (sf.tipo === "colore") {
      campi.push(elemento("label", { classe: "campo" }, ["Colore di sfondo", elemento("input", { type: "color", value: sf.colore || "#111111", oninput: (e) => modifica(() => (sc.sfondo.colore = e.target.value), { chiave: "sfondo-colore" }) })]));
    }
    if (sf.tipo === "immagine") {
      const zona = elemento("div", { classe: "immagine-campo" });
      campoImmagine(zona, sf.immagine, (v) => modifica(() => (sc.sfondo.immagine = v)));
      campi.push(elemento("div", { classe: "campo" }, ["Immagine (riempie tutto lo schermo)", zona]));
      campi.push(elemento("label", { classe: "campo" }, ["Velo scuro per leggere il testo", elemento("input", { type: "range", min: 0, max: 0.85, step: 0.05, value: sf.velo ?? 0.45, oninput: (e) => modifica(() => (sc.sfondo.velo = Number(e.target.value)), { chiave: "velo" }) })]));
    }
    box.replaceChildren(...campi);
  }

  function creaCampo(sc, k, tipo, etichetta, opz) {
    const imposta = (v) => modifica(() => (sc[k] = v), { chiave: `campo-${k}` });
    switch (tipo) {
      case "testo":
        return elemento("label", { classe: "campo" }, [etichetta, elemento("input", { type: "text", "data-chiave": k, value: sc[k] || "", placeholder: opz.segnaposto || "", oninput: (e) => imposta(e.target.value) })]);
      case "area": {
        const ta = elemento("textarea", { rows: 2, "data-chiave": k, oninput: (e) => imposta(e.target.value) });
        ta.value = sc[k] || "";
        return elemento("label", { classe: "campo" }, [etichetta, ta]);
      }
      case "righe": {
        const ta = elemento("textarea", { rows: 5, "data-chiave": k, oninput: (e) => imposta(e.target.value.split("\n")) });
        ta.value = (sc[k] || []).join("\n");
        return elemento("label", { classe: "campo" }, [etichetta, ta]);
      }
      case "numero":
        return elemento("label", { classe: "campo" }, [etichetta, elemento("input", { type: "number", min: opz.min, max: opz.max, step: opz.step, value: sc[k] ?? 0, oninput: (e) => imposta(Number(e.target.value)) })]);
      case "spunta":
        return elemento("label", { classe: "spunta" }, [elemento("input", { type: "checkbox", checked: sc[k] !== false && Boolean(sc[k] ?? true), onchange: (e) => imposta(e.target.checked) }), etichetta]);
      case "scelta": {
        const sel = elemento("select", { onchange: (e) => imposta(e.target.value) });
        riempiScelta(sel, opz, sc[k]);
        return elemento("label", { classe: "campo" }, [etichetta, sel]);
      }
      case "immagine": {
        const box = elemento("div", { classe: "immagine-campo" });
        campoImmagine(box, sc[k], (v) => modifica(() => (sc[k] = v)), opz.conserva);
        return elemento("div", { classe: "campo" }, [etichetta, box]);
      }
      case "passi":
        return campoPassi(sc);
      case "valori":
        return campoValori(sc);
      default:
        return elemento("div");
    }
  }

  function campoPassi(sc) {
    sc.passi = sc.passi || [];
    const righe = sc.passi.map((p, i) => elemento("div", { classe: "riga-passo" }, [
      elemento("span", { classe: "numero-passo", testo: String(i + 1) }),
      elemento("input", { type: "text", value: p.testo || "", "aria-label": `Testo del passo ${i + 1}`, oninput: (e) => modifica(() => (p.testo = e.target.value), { chiave: `passo-${i}` }) }),
      elemento("button", { type: "button", classe: "mini", title: "Elimina passo", "aria-label": "Elimina passo", onclick: () => modifica(() => sc.passi.splice(i, 1), { proprieta: true }) }, "✕"),
    ]));
    return elemento("div", { classe: "campo" }, [
      "Passi",
      elemento("p", { classe: "nota", testo: "Clicca sull'anteprima per aggiungere un passo nel punto giusto; trascina i cerchi numerati per spostarli." }),
      ...righe,
      elemento("button", {
        type: "button", classe: "pulsante piccolo",
        onclick: () => modifica(() => {
          const posizione = SV.passiPredefiniti(new Array(6).fill(""))[sc.passi.length % 6];
          sc.passi.push(Object.assign(posizione, { testo: `Passo ${sc.passi.length + 1}` }));
        }, { proprieta: true }),
      }, "+ Aggiungi passo"),
    ]);
  }

  function campoValori(sc) {
    sc.valori = sc.valori || [];
    const righe = sc.valori.map((v, i) => elemento("div", { classe: "riga-valore" }, [
      elemento("input", { type: "text", value: v.prefisso || "", placeholder: "€", title: "Prima del numero", oninput: (e) => modifica(() => (v.prefisso = e.target.value), { chiave: `pre-${i}` }) }),
      elemento("input", { type: "text", value: v.valore ?? "", placeholder: "1200", title: "Numero", "data-chiave": i === 0 ? "valori" : null, oninput: (e) => modifica(() => (v.valore = e.target.value), { chiave: `val-${i}` }) }),
      elemento("input", { type: "text", value: v.suffisso || "", placeholder: "+", title: "Dopo il numero", oninput: (e) => modifica(() => (v.suffisso = e.target.value), { chiave: `suf-${i}` }) }),
      elemento("button", { type: "button", classe: "mini", title: "Elimina", "aria-label": "Elimina numero", onclick: () => modifica(() => sc.valori.splice(i, 1), { proprieta: true }) }, "✕"),
      elemento("input", { type: "text", classe: "etichetta-valore", value: v.etichetta || "", placeholder: "Cosa misura (es. clienti)", oninput: (e) => modifica(() => (v.etichetta = e.target.value), { chiave: `eti-${i}` }) }),
    ]));
    return elemento("div", { classe: "campo" }, [
      "Numeri (prefisso · valore · suffisso)",
      ...righe,
      sc.valori.length < 4
        ? elemento("button", { type: "button", classe: "pulsante piccolo", onclick: () => modifica(() => sc.valori.push({ valore: "100", prefisso: "", suffisso: "%", etichetta: "" }), { proprieta: true }) }, "+ Aggiungi numero")
        : "",
    ]);
  }

  // ------------------------------------------ mouse sull'anteprima

  function puntoTela(e) {
    const r = tela.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * tela.width, y: ((e.clientY - r.top) / r.height) * tela.height };
  }

  function elementoSotto(p) {
    for (let i = stato.elementi.length - 1; i >= 0; i--) {
      const e = stato.elementi[i];
      const margine = 6 * pixelSchermo();
      if (!e.nascosto && p.x >= e.x - margine && p.x <= e.x + e.w + margine && p.y >= e.y - margine && p.y <= e.y + e.h + margine) return e;
    }
    return null;
  }

  function sullaManiglia(p) {
    const sel = elementoDa(stato.elemento);
    if (!sel || sel.nascosto) return false;
    const q = pixelSchermo();
    const m = maniglia({ x: sel.x - 5 * q, y: sel.y - 5 * q, w: sel.w + 10 * q, h: sel.h + 10 * q });
    return Math.abs(p.x - m.x) <= m.r * 1.6 && Math.abs(p.y - m.y) <= m.r * 1.6;
  }

  tela.addEventListener("pointerdown", (e) => {
    if (stato.inRiproduzione) {
      pausa();
      return;
    }
    const sc = scenaSelezionata();
    const p = puntoTela(e);
    // tutorial: dentro il browser si piazzano i passi
    if (sc && sc.tipo === "tutorial") {
      if (!inPosizionamento()) seleziona(stato.selezionata);
      const { u, m } = geometriaSelezionata();
      const dentro = p.x >= m.vx && p.x <= m.vx + m.vw && p.y >= m.vy && p.y <= m.vy + m.vh;
      if (dentro) {
        const vicino = (sc.passi || []).findIndex((q) => Math.hypot(m.vx + q.x * m.vw - p.x, m.vy + q.y * m.vh - p.y) < 3.2 * u);
        if (vicino >= 0) {
          registraStoria(null);
          stato.gesto = { tipo: "passo", indice: vicino };
          tela.setPointerCapture(e.pointerId);
          return;
        }
        modifica(() => sc.passi.push({ testo: `Passo ${sc.passi.length + 1}`, x: (p.x - m.vx) / m.vw, y: (p.y - m.vy) / m.vh }), { proprieta: true });
        const campi = document.querySelectorAll(".riga-passo input");
        const ultimo = campi[campi.length - 1];
        if (ultimo) {
          ultimo.focus();
          ultimo.select();
        }
        return;
      }
    }
    if (sullaManiglia(p)) {
      const sel = elementoDa(stato.elemento);
      registraStoria(null);
      const centro = { x: sel.x + sel.w / 2, y: sel.y + sel.h / 2 };
      stato.gesto = { tipo: "scala", id: sel.id, centro, distanza: Math.max(4, Math.hypot(p.x - centro.x, p.y - centro.y)), scala: Number(regola(sel.id, false).scala) || 1 };
      tela.setPointerCapture(e.pointerId);
      return;
    }
    const sotto = elementoSotto(p);
    if (!sotto) {
      selezionaElemento(null);
      return;
    }
    if (stato.elemento !== sotto.id) selezionaElemento(sotto.id);
    registraStoria(null);
    const r = regola(sotto.id, false);
    stato.gesto = {
      tipo: "sposta", id: sotto.id, da: p, mosso: false,
      dx: Number(r.dx) || 0, dy: Number(r.dy) || 0,
      centro: { x: sotto.x + sotto.w / 2, y: sotto.y + sotto.h / 2 },
    };
    tela.setPointerCapture(e.pointerId);
  });

  tela.addEventListener("pointermove", (e) => {
    const p = puntoTela(e);
    const g = stato.gesto;
    const u = Math.min(tela.width, tela.height) / 100;
    if (!g) {
      if (stato.inRiproduzione) return;
      const sotto = elementoSotto(p);
      const id = sotto ? sotto.id : null;
      tela.style.cursor = sullaManiglia(p) ? "nwse-resize" : sotto ? "move" : inPosizionamento() ? "crosshair" : "default";
      if (id !== stato.sopra) {
        stato.sopra = id;
        ridisegna();
      }
      return;
    }
    if (g.tipo === "passo") {
      const sc = scenaSelezionata();
      const { m } = geometriaSelezionata();
      const passo = sc.passi[g.indice];
      passo.x = Math.max(0, Math.min(1, (p.x - m.vx) / m.vw));
      passo.y = Math.max(0, Math.min(1, (p.y - m.vy) / m.vh));
      ridisegna();
      return;
    }
    const r = regola(g.id);
    if (g.tipo === "scala") {
      const d = Math.hypot(p.x - g.centro.x, p.y - g.centro.y);
      r.scala = Math.round(Math.max(0.3, Math.min(3, g.scala * (d / g.distanza))) * 100) / 100;
      ridisegna();
      return;
    }
    // sposta, con aggancio al centro dello schermo
    let ddx = (p.x - g.da.x) / u;
    let ddy = (p.y - g.da.y) / u;
    if (Math.abs(ddx) + Math.abs(ddy) > 0.3) g.mosso = true;
    const cx = g.centro.x + ddx * u;
    const cy = g.centro.y + ddy * u;
    stato.guide.x = Math.abs(cx - tela.width / 2) < 1.2 * u;
    stato.guide.y = Math.abs(cy - tela.height / 2) < 1.2 * u;
    if (stato.guide.x) ddx = (tela.width / 2 - g.centro.x) / u;
    if (stato.guide.y) ddy = (tela.height / 2 - g.centro.y) / u;
    r.dx = Math.round((g.dx + ddx) * 10) / 10;
    r.dy = Math.round((g.dy + ddy) * 10) / 10;
    ridisegna();
  });

  const fineGesto = () => {
    const g = stato.gesto;
    if (!g) return;
    stato.gesto = null;
    stato.guide = { x: false, y: false };
    if (g.id) pulisciRegola(g.id);
    if (g.tipo === "sposta" && !g.mosso) storia.indietro.pop(); // semplice clic: niente passo di storia
    aggiornaPulsantiStoria();
    salvaPresto();
    mostraPannelloElemento();
    ridisegna();
  };
  tela.addEventListener("pointerup", fineGesto);
  tela.addEventListener("pointercancel", fineGesto);
  tela.addEventListener("pointerleave", () => {
    if (!stato.gesto && stato.sopra) {
      stato.sopra = null;
      ridisegna();
    }
  });
  tela.addEventListener("dblclick", (e) => {
    const sotto = elementoSotto(puntoTela(e));
    if (sotto && sotto.campo) vaiAlCampo(sotto.campo);
  });

  // ---------------------------------------------------------- comandi

  let cursoreTempoAttivo = false;
  function collegaComandi() {
    $("#riproduci").addEventListener("click", () => (stato.inRiproduzione ? pausa() : riproduci()));
    const ct = $("#cursore-tempo");
    ct.addEventListener("input", () => {
      cursoreTempoAttivo = true;
      stato.posizionamento = false;
      vaiA((Number(ct.value) / 1000) * SV.durataTotale(stato.progetto));
    });
    ct.addEventListener("change", () => (cursoreTempoAttivo = false));
    $("#annulla").addEventListener("click", annulla);
    $("#ripeti").addEventListener("click", ripeti);

    document.addEventListener("keydown", (e) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "z" && !document.querySelector("dialog[open]")) {
        e.preventDefault();
        e.shiftKey ? ripeti() : annulla();
        return;
      }
      if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        ripeti();
        return;
      }
      if (e.target.closest("input, textarea, select, [contenteditable]") || document.querySelector("dialog[open]")) return;
      const sel = elementoDa(stato.elemento);
      if (sel && e.key.startsWith("Arrow")) {
        e.preventDefault();
        const passoU = e.shiftKey ? 2 : 0.5;
        modifica(() => {
          const r = regola(sel.id);
          if (e.key === "ArrowLeft") r.dx = (Number(r.dx) || 0) - passoU;
          if (e.key === "ArrowRight") r.dx = (Number(r.dx) || 0) + passoU;
          if (e.key === "ArrowUp") r.dy = (Number(r.dy) || 0) - passoU;
          if (e.key === "ArrowDown") r.dy = (Number(r.dy) || 0) + passoU;
          pulisciRegola(sel.id);
        }, { chiave: `frecce-${sel.id}` });
        return;
      }
      if (sel && (e.key === "Delete" || e.key === "Backspace")) {
        e.preventDefault();
        nascondi(sel.id, true);
        return;
      }
      if (e.key === "Escape") {
        selezionaElemento(null);
        return;
      }
      if (e.code === "Space") {
        e.preventDefault();
        stato.inRiproduzione ? pausa() : riproduci();
      } else if (e.key === "ArrowLeft") vaiA(stato.t - (e.shiftKey ? 1 : 1 / 30));
      else if (e.key === "ArrowRight") vaiA(stato.t + (e.shiftKey ? 1 : 1 / 30));
      else if (e.key === "Home") vaiA(0);
    });

    $("#nome-progetto").addEventListener("input", (e) => modifica(() => (stato.progetto.nome = e.target.value), { chiave: "nome" }));
    $("#formato").addEventListener("change", (e) => modifica(() => (stato.progetto.formato = e.target.value)));
    $("#tema").addEventListener("change", (e) => {
      modifica(() => {
        stato.progetto.tema = e.target.value;
        stato.progetto.accento = "";
      });
      $("#accento").value = SV.TEMI[e.target.value].accento;
    });
    $("#accento").addEventListener("input", (e) => modifica(() => (stato.progetto.accento = e.target.value), { chiave: "accento" }));
    $("#carattere").addEventListener("change", (e) => modifica(() => (stato.progetto.carattere = e.target.value)));
    $("#transizione").addEventListener("change", (e) => modifica(() => (stato.progetto.transizione = e.target.value)));
    $("#animazione").addEventListener("change", (e) => modifica(() => (stato.progetto.animazione = e.target.value)));
    $("#marchio-nome").addEventListener("input", (e) => modifica(() => (stato.progetto.marchio.nome = e.target.value), { chiave: "marchio-nome" }));
    $("#marchio-url").addEventListener("input", (e) => modifica(() => (stato.progetto.marchio.url = e.target.value), { chiave: "marchio-url" }));
    $("#volume").addEventListener("input", (e) => {
      modifica(() => (stato.progetto.volume = Number(e.target.value)), { chiave: "volume" });
      audio.volume = Number(e.target.value);
    });
    $("#musica-file").addEventListener("change", async (e) => {
      const f = e.target.files[0];
      if (!f) return;
      if (f.size > 25e6) {
        alert("File troppo grande (massimo 25 MB). Usa un MP3.");
        return;
      }
      const url = await leggiFile(f);
      modifica(() => {
        stato.progetto.musica = url;
        stato.progetto.musicaNome = f.name;
      });
      mostraMusica();
      e.target.value = "";
    });
    $("#musica-togli").addEventListener("click", () => {
      modifica(() => {
        stato.progetto.musica = "";
        stato.progetto.musicaNome = "";
      });
      mostraMusica();
    });

    riempiScelta($("#nuova-scena"), SV.TIPI);
    $("#aggiungi-scena").addEventListener("click", () => aggiungi($("#nuova-scena").value));

    $("#salva-file").addEventListener("click", () => {
      const blob = new Blob([JSON.stringify(stato.progetto, null, 2)], { type: "application/json" });
      scarica(blob, `${nomeSicuro(stato.progetto.nome)}.json`);
    });
    $("#apri-file").addEventListener("click", () => $("#file-progetto").click());
    $("#file-progetto").addEventListener("change", async (e) => {
      const f = e.target.files[0];
      e.target.value = "";
      if (!f) return;
      try {
        const p = JSON.parse(await f.text());
        if (!p || !Array.isArray(p.scene) || !p.scene.length) throw new Error("niente scene");
        registraStoria(null);
        carica(p);
      } catch (err) {
        alert("Questo file non è un progetto di Studio Video valido.");
      }
    });
    $("#copertina").addEventListener("click", () => {
      const prima = stato.posizionamento;
      stato.posizionamento = false;
      disegnaOra({ pulito: true });
      tela.toBlob((b) => scarica(b, `${nomeSicuro(stato.progetto.nome)}-copertina-${stato.progetto.formato.replace(":", "x")}.png`), "image/png");
      stato.posizionamento = prima;
      ridisegna();
    });
  }

  // ------------------------------------------------- generatore rapido

  const datiGeneratore = { immagine: "", logo: "" };

  // Elenco marche nel generatore (si aggiorna a ogni apertura).
  async function riempiMarcheGeneratore(scelta) {
    const marche = SV.libreria ? SV.cercaMarche(await SV.libreria.tutte(), "", "recenti") : [];
    const sel = $("#gen-marca");
    sel.replaceChildren(
      elemento("option", { value: "", testo: marche.length ? "— Nessuna, parto da zero —" : "— Nessuna marca salvata —" }),
      ...marche.map((m) => elemento("option", { value: m.id, testo: m.url ? `${m.nome} · ${m.url.replace(/^https?:\/\//, "")}` : m.nome })),
    );
    sel.value = scelta && marche.some((m) => m.id === scelta) ? scelta : "";
    $("#riga-gen-marca").classList.toggle("con-marca", Boolean(sel.value));
  }

  // Scegliendo una marca, il modulo si riempie con i suoi dati.
  function compilaDaMarca(id) {
    const m = id && SV.libreria ? SV.libreria.trova(id) : null;
    $("#riga-gen-marca").classList.toggle("con-marca", Boolean(m));
    if (!m) return;
    const f = $("#modulo-generatore");
    const d = SV.datiDaMarca(m);
    f.nome.value = d.nome;
    f.url.value = d.url;
    f.slogan.value = d.slogan;
    f.vantaggi.value = d.vantaggi;
    f.invito.value = d.invito;
    if (SV.TEMI[d.tema]) f.tema.value = d.tema;
    if (SV.CARATTERI[d.carattere]) f.carattere.value = d.carattere;
    if (SV.FORMATI[d.formato]) f.formato.value = d.formato;
    datiGeneratore.logo = d.logo;
    campoImmagine($("#gen-logo"), d.logo, (v) => (datiGeneratore.logo = v), true);
  }

  async function apriGeneratore(marcaId) {
    $("#generatore").returnValue = "";
    await riempiMarcheGeneratore(marcaId);
    if (marcaId) compilaDaMarca(marcaId);
    $("#generatore").showModal();
  }

  function preparaGeneratore() {
    const fs = $("#scelta-modello");
    fs.replaceChildren(
      elemento("legend", { testo: "Che video ti serve?" }),
      ...Object.entries(SV.MODELLI).map(([k, m], i) => elemento("label", { classe: `scheda-modello modello-${k}` }, [
        elemento("input", { type: "radio", name: "modello", value: k, checked: i === 0 }),
        elemento("strong", { testo: m.nome }),
        elemento("small", { testo: m.descrizione }),
      ])),
    );
    fs.addEventListener("change", () => {
      const tut = $("#modulo-generatore").modello.value === "tutorial";
      $("#etichetta-vantaggi").textContent = tut ? "Passi del tutorial (uno per riga, massimo 6)" : "Vantaggi (uno per riga, massimo 5)";
    });
    riempiScelta($("#gen-formato"), SV.FORMATI, "9:16");
    riempiTemi($("#gen-tema"), "limone");
    riempiScelta($("#gen-carattere"), SV.CARATTERI, "auto");
    campoImmagine($("#gen-immagine"), "", (v) => (datiGeneratore.immagine = v));
    campoImmagine($("#gen-logo"), "", (v) => (datiGeneratore.logo = v), true);

    $("#apri-generatore").addEventListener("click", () => apriGeneratore(stato.progetto.marcaId || ""));
    $("#gen-marca").addEventListener("change", (e) => compilaDaMarca(e.target.value));
    $("#generatore").addEventListener("close", () => {
      if ($("#generatore").returnValue !== "crea") return;
      const f = $("#modulo-generatore");
      const dati = {
        nome: f.nome.value.trim(),
        url: f.url.value.trim(),
        slogan: f.slogan.value.trim(),
        vantaggi: f.vantaggi.value,
        invito: f.invito.value.trim(),
        formato: f.formato.value,
        tema: f.tema.value,
        carattere: f.carattere.value,
        immagine: datiGeneratore.immagine,
        logo: datiGeneratore.logo,
      };
      registraStoria(null);
      const nuovo = SV.MODELLI[f.modello.value].crea(dati);
      const marca = f.marca.value && SV.libreria ? SV.libreria.trova(f.marca.value) : null;
      if (marca) {
        // look e ritocchi della marca; ciò che hai cambiato nel modulo vince
        SV.applicaMarca(nuovo, marca);
        nuovo.marchio = { nome: dati.nome || marca.nome, url: dati.url, logo: dati.logo };
        if (dati.tema !== marca.tema) {
          nuovo.tema = dati.tema;
          nuovo.accento = "";
        }
        if (dati.carattere !== marca.carattere) nuovo.carattere = dati.carattere;
        nuovo.formato = dati.formato;
        SV.libreria.segnaUso(marca.id);
      }
      carica(nuovo);
    });
  }

  // ------------------------------------------------------- esportazione

  function scegliFormatoVideo() {
    const candidati = [
      // MP4 solo se è davvero H.264: è l'unico che va ovunque (iPhone, WhatsApp, Instagram)
      ["video/mp4;codecs=avc1.640028,mp4a.40.2", "mp4"],
      ["video/mp4;codecs=avc1.4d0028,mp4a.40.2", "mp4"],
      ["video/mp4;codecs=avc1.42E01E,mp4a.40.2", "mp4"],
      ["video/mp4;codecs=avc1.640028", "mp4"],
      ["video/webm;codecs=vp9,opus", "webm"],
      ["video/webm;codecs=vp8,opus", "webm"],
      ["video/webm", "webm"],
    ];
    if (typeof MediaRecorder === "undefined") return null;
    for (const [mime, est] of candidati) if (MediaRecorder.isTypeSupported(mime)) return { mime, est };
    return null;
  }

  let annullaRegistrazione = null;

  async function registra(formato, alProgresso) {
    const progetto = Object.assign({}, stato.progetto, { formato });
    const scelta = scegliFormatoVideo();
    const durata = SV.durataTotale(progetto);
    const { w, h } = SV.dimensioni(progetto);
    tela.width = w;
    tela.height = h;
    adattaCornice();
    SV.disegna(ctx, progetto, stato.risorse, 0);

    const flusso = tela.captureStream(30);
    let contestoAudio = null;
    let elementoAudio = null;
    if (progetto.musica) {
      contestoAudio = new AudioContext();
      elementoAudio = new Audio(progetto.musica);
      const sorgente = contestoAudio.createMediaElementSource(elementoAudio);
      const guadagno = contestoAudio.createGain();
      const vol = Number(progetto.volume ?? 0.8);
      const dissolvi = Math.min(1.5, durata / 4);
      guadagno.gain.setValueAtTime(vol, contestoAudio.currentTime);
      guadagno.gain.setValueAtTime(vol, contestoAudio.currentTime + durata - dissolvi);
      guadagno.gain.linearRampToValueAtTime(0, contestoAudio.currentTime + durata);
      const destinazione = contestoAudio.createMediaStreamDestination();
      sorgente.connect(guadagno).connect(destinazione);
      destinazione.stream.getAudioTracks().forEach((tr) => flusso.addTrack(tr));
    }
    const registratore = new MediaRecorder(flusso, { mimeType: scelta.mime, videoBitsPerSecond: 12e6, audioBitsPerSecond: 192000 });
    const pezzi = [];
    registratore.ondataavailable = (e) => e.data.size && pezzi.push(e.data);
    const finito = new Promise((ok) => (registratore.onstop = ok));

    let annullato = false;
    annullaRegistrazione = () => (annullato = true);
    registratore.start(250);
    if (elementoAudio) await elementoAudio.play().catch(() => {});
    const inizio = performance.now();
    await new Promise((ok) => {
      const fotogramma = () => {
        const t = (performance.now() - inizio) / 1000;
        SV.disegna(ctx, progetto, stato.risorse, Math.min(t, durata));
        alProgresso(Math.min(1, t / durata));
        if (t >= durata + 0.1 || annullato) ok();
        else requestAnimationFrame(fotogramma);
      };
      requestAnimationFrame(fotogramma);
    });
    registratore.stop();
    await finito;
    if (elementoAudio) elementoAudio.pause();
    if (contestoAudio) contestoAudio.close();
    flusso.getTracks().forEach((tr) => tr.stop());
    annullaRegistrazione = null;
    if (annullato) return null;
    return { blob: new Blob(pezzi, { type: scelta.mime.split(";")[0] }), est: scelta.est };
  }

  function preparaEsportazione() {
    const fs = $("#scelta-formati");
    $("#apri-esporta").addEventListener("click", () => {
      if (stato.inRiproduzione) pausa();
      fs.replaceChildren(
        elemento("legend", { testo: "Formati" }),
        ...Object.entries(SV.FORMATI).map(([k, f]) => elemento("label", { classe: "spunta" }, [
          elemento("input", { type: "checkbox", name: "formato", value: k, checked: k === stato.progetto.formato }),
          f.nome,
        ])),
      );
      const scelta = scegliFormatoVideo();
      $("#nota-codec").textContent = scelta
        ? `Durata ${mmss(SV.durataTotale(stato.progetto))} per formato · file ${scelta.est.toUpperCase()}${scelta.est === "webm" ? " (questo browser non registra MP4: usa Chrome o Edge aggiornati, oppure il comando npm run render)" : ""}`
        : "Questo browser non può registrare video. Usa Chrome, Edge o Firefox aggiornati.";
      $("#avvia-esporta").disabled = !scelta;
      $("#risultati").replaceChildren();
      $("#avanzamento").hidden = true;
      $("#esporta").showModal();
    });

    $("#avvia-esporta").addEventListener("click", async () => {
      const formati = [...fs.querySelectorAll("input:checked")].map((i) => i.value);
      if (!formati.length) return;
      const pulsante = $("#avvia-esporta");
      pulsante.disabled = true;
      $("#chiudi-esporta").textContent = "Annulla";
      $("#avanzamento").hidden = false;
      for (const [n, formato] of formati.entries()) {
        const etichetta = `${formato} (${n + 1} di ${formati.length})`;
        const r = await registra(formato, (p) => {
          $("#barra-piena").style.width = `${Math.round(p * 100)}%`;
          $("#testo-avanzamento").textContent = `Registro ${etichetta}… ${Math.round(p * 100)}%`;
        });
        if (!r) break;
        const nome = `${nomeSicuro(stato.progetto.nome)}-${formato.replace(":", "x")}.${r.est}`;
        const url = URL.createObjectURL(r.blob);
        $("#risultati").append(elemento("li", {}, [
          elemento("a", { href: url, download: nome, classe: "pulsante piccolo principale", testo: `Scarica ${nome}` }),
          elemento("span", { classe: "tenue", testo: ` ${(r.blob.size / 1e6).toFixed(1)} MB` }),
        ]));
        scarica(r.blob, nome);
      }
      $("#testo-avanzamento").textContent = "Fatto.";
      $("#chiudi-esporta").textContent = "Chiudi";
      pulsante.disabled = false;
      ridisegna();
    });

    $("#esporta").addEventListener("close", () => {
      if (annullaRegistrazione) annullaRegistrazione();
      ridisegna();
    });
  }

  // ------------------------------------------- API per la libreria marche

  SV.editor = {
    progetto: () => stato.progetto,
    modifica,
    campoImmagine,
    elemento,
    scarica,
    nomeSicuro,
    apriGeneratore,
    aggiornaTutto() {
      mostraProgetto();
      mostraScene();
      mostraProprieta();
      SV.caricaRisorse(stato.progetto, stato.risorse).then(ridisegna);
    },
  };

  // ---------------------------------------------------------- avvio

  async function carica(progetto) {
    if (stato.inRiproduzione) pausa();
    const base = progettoIniziale();
    stato.progetto = Object.assign(base, progetto);
    stato.progetto.marchio = Object.assign({ nome: "", url: "", logo: "" }, progetto.marchio || {});
    if (!SV.TEMI[stato.progetto.tema]) stato.progetto.tema = "limone"; // progetti con temi vecchi
    if (!SV.CARATTERI[stato.progetto.carattere]) stato.progetto.carattere = "auto";
    stato.selezionata = 0;
    stato.elemento = null;
    stato.t = 0;
    mostraProgetto();
    mostraScene();
    await SV.caricaRisorse(stato.progetto, stato.risorse);
    seleziona(0);
    salvaPresto();
  }

  async function avvia() {
    collegaComandi();
    preparaGeneratore();
    preparaEsportazione();
    aggiornaPulsantiStoria();
    let salvato = null;
    try {
      salvato = await SV.archivio.leggi();
    } catch (e) {
      console.warn("Archivio non disponibile", e);
    }
    await SV.caricaFont();
    await document.fonts.ready;
    adattaCornice();
    await carica(salvato && Array.isArray(salvato.scene) && salvato.scene.length ? salvato : progettoIniziale());
  }

  avvia();
})();
