/*
 * Editor di Studio Video: pannelli, anteprima, generatore rapido, esportazione.
 * Tutto gira nel browser; il progetto si salva da solo (IndexedDB).
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
    trascina: -1,
  };

  const tela = $("#tela");
  const ctx = tela.getContext("2d");
  const audio = new Audio();

  function progettoIniziale() {
    return SV.MODELLI.presentazione.crea({
      nome: "Il mio sito",
      slogan: "La promessa del tuo sito in una frase",
      url: "https://iltuosito.it",
      vantaggi: "Primo vantaggio concreto\nSecondo vantaggio concreto\nTerzo vantaggio concreto",
      invito: "Visita il sito",
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

  function disegnaOra(progetto = stato.progetto) {
    const { w, h } = SV.dimensioni(progetto);
    if (tela.width !== w || tela.height !== h) {
      tela.width = w;
      tela.height = h;
      adattaCornice();
    }
    const posa = inPosizionamento();
    SV.disegna(ctx, progetto, stato.risorse, stato.t, { modifica: posa });
    if (posa) disegnaSegniPassi();
    $("#suggerimento-tutorial").hidden = !posa;
    aggiornaTempo();
  }

  // L'anteprima occupa il massimo spazio possibile senza deformarsi.
  function adattaCornice() {
    const palco = $(".palco");
    const cornice = $("#cornice-tela");
    const larga = palco.clientWidth - 40;
    const comandi = 120;
    const alta = window.innerWidth > 1100 ? palco.clientHeight - comandi : window.innerHeight * 0.7;
    const k = Math.min(larga / tela.width, Math.max(160, alta) / tela.height);
    cornice.style.width = `${Math.floor(tela.width * k)}px`;
    cornice.style.height = `${Math.floor(tela.height * k)}px`;
  }
  window.addEventListener("resize", adattaCornice);

  function geometriaSelezionata() {
    const sc = scenaSelezionata();
    const u = Math.min(tela.width, tela.height) / 100;
    const img = sc.immagine ? stato.risorse.get(sc.immagine) : null;
    return { sc, u, m: SV.geometriaTutorial(tela.width, tela.height, u, sc, img).m };
  }

  function disegnaSegniPassi() {
    const { sc, u, m } = geometriaSelezionata();
    const tema = SV.temaDi(stato.progetto);
    (sc.passi || []).forEach((p, i) => {
      const x = m.vx + p.x * m.vw;
      const y = m.vy + p.y * m.vh;
      ctx.beginPath();
      ctx.arc(x, y, 3 * u, 0, Math.PI * 2);
      ctx.fillStyle = tema.accento;
      ctx.shadowColor = "rgba(0,0,0,.35)";
      ctx.shadowBlur = u;
      ctx.fill();
      ctx.shadowColor = "transparent";
      ctx.lineWidth = 0.4 * u;
      ctx.strokeStyle = "#fff";
      ctx.stroke();
      ctx.fillStyle = SV.utili.testoSopra(tema.accento);
      ctx.font = `800 ${Math.round(3 * u)}px Inter, system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(i + 1), x, y + 0.1 * u);
    });
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

  function mostraProgetto() {
    const p = stato.progetto;
    $("#nome-progetto").value = p.nome || "";
    riempiScelta($("#formato"), SV.FORMATI, p.formato);
    riempiScelta($("#tema"), SV.TEMI, p.tema);
    riempiScelta($("#carattere"), SV.CARATTERI, p.carattere);
    riempiScelta($("#transizione"), SV.TRANSIZIONI, p.transizione);
    $("#accento").value = p.accento || SV.TEMI[p.tema]?.accento || "#7b93ff";
    $("#marchio-nome").value = p.marchio?.nome || "";
    $("#marchio-url").value = p.marchio?.url || "";
    campoImmagine($("#marchio-logo"), p.marchio?.logo, (v) => modifica(() => (p.marchio.logo = v)), true);
    $("#volume").value = String(p.volume ?? 0.8);
    mostraMusica();
  }

  function mostraMusica() {
    const p = stato.progetto;
    $("#musica-nome").textContent = p.musica ? p.musicaNome || "Musica caricata" : "Nessuna musica";
    $("#musica-togli").hidden = !p.musica;
    audio.src = p.musica || "";
  }

  // Applica una modifica al progetto. struttura=true quando cambiano le scene.
  function modifica(fn, { struttura = false, proprieta = false } = {}) {
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
      return elemento("li", { classe: i === stato.selezionata ? "selezionata" : "", onclick: () => seleziona(i) }, [
        elemento("span", { classe: "icona-scena", testo: tipo.icona }),
        elemento("span", { classe: "testo-scena" }, [
          elemento("strong", { testo: tipo.nome }),
          elemento("small", { classe: "riassunto", testo: riassunto(sc) }),
        ]),
        elemento("span", { classe: "durata-scena", testo: `${Number(sc.durata).toFixed(1).replace(".0", "")} s` }),
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

  // Aggiorna testi e durate senza ricostruire (non toglie il fuoco ai campi).
  function aggiornaElencoLeggero() {
    const scene = stato.progetto.scene;
    document.querySelectorAll(".elenco-scene li").forEach((li, i) => {
      if (!scene[i]) return;
      li.querySelector(".riassunto").textContent = riassunto(scene[i]);
      li.querySelector(".durata-scena").textContent = `${Number(scene[i].durata).toFixed(1).replace(".0", "")} s`;
    });
    $("#durata-totale").textContent = `${mmss(SV.durataTotale(stato.progetto))} totali`;
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
    stato.selezionata = Math.max(0, Math.min(i, stato.progetto.scene.length - 1));
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
    const s = stato.progetto.scene;
    const j = i + verso;
    if (j < 0 || j >= s.length) return;
    [s[i], s[j]] = [s[j], s[i]];
    stato.selezionata = j;
    modifica(() => {}, { struttura: true });
    seleziona(j);
  }

  function duplica(i) {
    const copia = JSON.parse(JSON.stringify(stato.progetto.scene[i]));
    stato.progetto.scene.splice(i + 1, 0, copia);
    modifica(() => {}, { struttura: true });
    seleziona(i + 1);
  }

  function elimina(i) {
    if (stato.progetto.scene.length <= 1) return;
    stato.progetto.scene.splice(i, 1);
    modifica(() => {}, { struttura: true });
    seleziona(Math.min(i, stato.progetto.scene.length - 1));
  }

  function aggiungi(tipo) {
    const nuova = SV.TIPI[tipo].vuota();
    const i = stato.selezionata + 1;
    stato.progetto.scene.splice(i, 0, nuova);
    modifica(() => {}, { struttura: true });
    seleziona(i);
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
            if (isFinite(v) && v >= 1) modifica(() => (sc.durata = v));
          },
        }),
      ]),
    ];
    for (const [k, tipo, etichetta, opz = {}] of SCHEMI[sc.tipo] || []) {
      campi.push(creaCampo(sc, k, tipo, etichetta, opz));
    }
    box.replaceChildren(...campi);
  }

  function creaCampo(sc, k, tipo, etichetta, opz) {
    const imposta = (v) => modifica(() => (sc[k] = v));
    switch (tipo) {
      case "testo":
        return elemento("label", { classe: "campo" }, [etichetta, elemento("input", { type: "text", value: sc[k] || "", placeholder: opz.segnaposto || "", oninput: (e) => imposta(e.target.value) })]);
      case "area": {
        const ta = elemento("textarea", { rows: 2, oninput: (e) => imposta(e.target.value) });
        ta.value = sc[k] || "";
        return elemento("label", { classe: "campo" }, [etichetta, ta]);
      }
      case "righe": {
        const ta = elemento("textarea", { rows: 5, oninput: (e) => imposta(e.target.value.split("\n")) });
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
        campoImmagine(box, sc[k], imposta, opz.conserva);
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
      elemento("input", { type: "text", value: p.testo || "", "aria-label": `Testo del passo ${i + 1}`, oninput: (e) => modifica(() => (p.testo = e.target.value)) }),
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
      elemento("input", { type: "text", value: v.prefisso || "", placeholder: "€", title: "Prima del numero", oninput: (e) => modifica(() => (v.prefisso = e.target.value)) }),
      elemento("input", { type: "text", value: v.valore ?? "", placeholder: "1200", title: "Numero", oninput: (e) => modifica(() => (v.valore = e.target.value)) }),
      elemento("input", { type: "text", value: v.suffisso || "", placeholder: "+", title: "Dopo il numero", oninput: (e) => modifica(() => (v.suffisso = e.target.value)) }),
      elemento("button", { type: "button", classe: "mini", title: "Elimina", "aria-label": "Elimina numero", onclick: () => modifica(() => sc.valori.splice(i, 1), { proprieta: true }) }, "✕"),
      elemento("input", { type: "text", classe: "etichetta-valore", value: v.etichetta || "", placeholder: "Cosa misura (es. clienti)", oninput: (e) => modifica(() => (v.etichetta = e.target.value)) }),
    ]));
    return elemento("div", { classe: "campo" }, [
      "Numeri (prefisso · valore · suffisso)",
      ...righe,
      sc.valori.length < 4
        ? elemento("button", { type: "button", classe: "pulsante piccolo", onclick: () => modifica(() => sc.valori.push({ valore: "100", prefisso: "", suffisso: "%", etichetta: "" }), { proprieta: true }) }, "+ Aggiungi numero")
        : "",
    ]);
  }

  // -------------------------------------------- clic e trascinamento passi

  function puntoTela(e) {
    const r = tela.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * tela.width, y: ((e.clientY - r.top) / r.height) * tela.height };
  }

  tela.addEventListener("pointerdown", (e) => {
    const sc = scenaSelezionata();
    if (!sc || sc.tipo !== "tutorial") {
      if (stato.inRiproduzione) pausa();
      else riproduci();
      return;
    }
    if (!inPosizionamento()) {
      // prima porta l'anteprima in posa ferma, poi i clic piazzano i passi
      seleziona(stato.selezionata);
      return;
    }
    const { u, m } = geometriaSelezionata();
    const p = puntoTela(e);
    const vicino = (sc.passi || []).findIndex((q) => Math.hypot(m.vx + q.x * m.vw - p.x, m.vy + q.y * m.vh - p.y) < 3 * u);
    if (vicino >= 0) {
      stato.trascina = vicino;
      tela.setPointerCapture(e.pointerId);
      return;
    }
    if (p.x < m.vx || p.x > m.vx + m.vw || p.y < m.vy || p.y > m.vy + m.vh) return;
    sc.passi = sc.passi || [];
    modifica(() => sc.passi.push({ testo: `Passo ${sc.passi.length + 1}`, x: (p.x - m.vx) / m.vw, y: (p.y - m.vy) / m.vh }), { proprieta: true });
    const campi = document.querySelectorAll(".riga-passo input");
    const ultimo = campi[campi.length - 1];
    if (ultimo) {
      ultimo.focus();
      ultimo.select();
    }
  });

  tela.addEventListener("pointermove", (e) => {
    if (stato.trascina < 0) return;
    const sc = scenaSelezionata();
    const { m } = geometriaSelezionata();
    const p = puntoTela(e);
    const passo = sc.passi[stato.trascina];
    passo.x = Math.max(0, Math.min(1, (p.x - m.vx) / m.vw));
    passo.y = Math.max(0, Math.min(1, (p.y - m.vy) / m.vh));
    ridisegna();
  });

  const fineTrascina = () => {
    if (stato.trascina >= 0) {
      stato.trascina = -1;
      salvaPresto();
    }
  };
  tela.addEventListener("pointerup", fineTrascina);
  tela.addEventListener("pointercancel", fineTrascina);

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

    document.addEventListener("keydown", (e) => {
      if (e.target.closest("input, textarea, select, [contenteditable]") || document.querySelector("dialog[open]")) return;
      if (e.code === "Space") {
        e.preventDefault();
        stato.inRiproduzione ? pausa() : riproduci();
      } else if (e.key === "ArrowLeft") vaiA(stato.t - (e.shiftKey ? 1 : 1 / 30));
      else if (e.key === "ArrowRight") vaiA(stato.t + (e.shiftKey ? 1 : 1 / 30));
      else if (e.key === "Home") vaiA(0);
    });

    $("#nome-progetto").addEventListener("input", (e) => modifica(() => (stato.progetto.nome = e.target.value)));
    $("#formato").addEventListener("change", (e) => modifica(() => (stato.progetto.formato = e.target.value)));
    $("#tema").addEventListener("change", (e) => {
      modifica(() => {
        stato.progetto.tema = e.target.value;
        stato.progetto.accento = "";
      });
      $("#accento").value = SV.TEMI[e.target.value].accento;
    });
    $("#accento").addEventListener("input", (e) => modifica(() => (stato.progetto.accento = e.target.value)));
    $("#carattere").addEventListener("change", (e) => modifica(() => (stato.progetto.carattere = e.target.value)));
    $("#transizione").addEventListener("change", (e) => modifica(() => (stato.progetto.transizione = e.target.value)));
    $("#marchio-nome").addEventListener("input", (e) => modifica(() => (stato.progetto.marchio.nome = e.target.value)));
    $("#marchio-url").addEventListener("input", (e) => modifica(() => (stato.progetto.marchio.url = e.target.value)));
    $("#volume").addEventListener("input", (e) => {
      modifica(() => (stato.progetto.volume = Number(e.target.value)));
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

    // file di progetto
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
        carica(p);
      } catch (err) {
        alert("Questo file non è un progetto di Studio Video valido.");
      }
    });
    $("#copertina").addEventListener("click", () => {
      const prima = stato.posizionamento;
      stato.posizionamento = false;
      disegnaOra();
      tela.toBlob((b) => scarica(b, `${nomeSicuro(stato.progetto.nome)}-copertina-${stato.progetto.formato.replace(":", "x")}.png`), "image/png");
      stato.posizionamento = prima;
      ridisegna();
    });
  }

  // ------------------------------------------------- generatore rapido

  const datiGeneratore = { immagine: "", logo: "" };

  function preparaGeneratore() {
    const fs = $("#scelta-modello");
    fs.replaceChildren(
      elemento("legend", { testo: "Che video ti serve?" }),
      ...Object.entries(SV.MODELLI).map(([k, m], i) => elemento("label", { classe: "scheda-modello" }, [
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
    riempiScelta($("#gen-tema"), SV.TEMI, "notte");
    riempiScelta($("#gen-carattere"), SV.CARATTERI, "moderno");
    campoImmagine($("#gen-immagine"), "", (v) => (datiGeneratore.immagine = v));
    campoImmagine($("#gen-logo"), "", (v) => (datiGeneratore.logo = v), true);

    $("#apri-generatore").addEventListener("click", () => {
      $("#generatore").returnValue = "";
      $("#generatore").showModal();
    });
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
      carica(SV.MODELLI[f.modello.value].crea(dati));
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

  // ---------------------------------------------------------- avvio

  async function carica(progetto) {
    if (stato.inRiproduzione) pausa();
    const base = progettoIniziale();
    stato.progetto = Object.assign(base, progetto);
    stato.progetto.marchio = Object.assign({ nome: "", url: "", logo: "" }, progetto.marchio || {});
    stato.selezionata = 0;
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
    let salvato = null;
    try {
      salvato = await SV.archivio.leggi();
    } catch (e) {
      console.warn("Archivio non disponibile", e);
    }
    await document.fonts.ready;
    adattaCornice();
    await carica(salvato && Array.isArray(salvato.scene) && salvato.scene.length ? salvato : progettoIniziale());
  }

  avvia();
})();
