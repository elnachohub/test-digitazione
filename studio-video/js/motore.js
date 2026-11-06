/*
 * Motore di Studio Video: disegna UN fotogramma del video all'istante t.
 *
 * È una funzione pura rispetto al tempo: stesso progetto + stesso t = stessa
 * immagine. Per questo lo stesso codice serve a tre cose:
 *   - l'anteprima nell'editor (index.html);
 *   - l'esportazione dal browser (registrazione del canvas);
 *   - il rendering MP4 da riga di comando (render/render.js), fotogramma per
 *     fotogramma, senza scatti.
 *
 * Ritocchi a mano: ogni elemento disegnato (titolo, pulsante, schermata...)
 * passa da elemento(), che applica le regolazioni salvate nella scena
 * (sc.regola[id] = { dx, dy, scala, colore, nascosto }) e, se richiesto,
 * annota il riquadro occupato: così l'editor sa cosa c'è sotto il mouse.
 */
(function (globale) {
  "use strict";

  const SV = (globale.StudioVideo = globale.StudioVideo || {});

  // ---------------------------------------------------------------- costanti

  const FORMATI = {
    "16:9": { w: 1920, h: 1080, nome: "16:9 orizzontale — YouTube, sito, LinkedIn" },
    "9:16": { w: 1080, h: 1920, nome: "9:16 verticale — Reels, TikTok, Shorts, Storie" },
    "1:1": { w: 1080, h: 1080, nome: "1:1 quadrato — feed social" },
    "4:5": { w: 1080, h: 1350, nome: "4:5 ritratto — feed Instagram e Facebook" },
  };

  // Quattro linguaggi visivi diversi, non quattro sfumature dello stesso.
  const STILI = {
    pop: "Pop — colori pieni, contorni neri, ombre nette",
    editoriale: "Editoriale — carta, filetti, tipografia da rivista",
    griglia: "Griglia — scuro tecnico, linee, accento acido",
    sfumato: "Sfumato — gradienti morbidi e luci",
  };

  // scheda = riempimento dei riquadri; testoScheda = testo dentro i riquadri;
  // bordo = inchiostro di contorni e ombre nette (stile pop).
  const TEMI = {
    limone: { nome: "Limone · pop", stile: "pop", carattere: "pesante", sfondo1: "#ffe24a", sfondo2: "#ffd21f", accento: "#ff3e7f", testo: "#121212", tenue: "#4a4020", scheda: "#ffffff", testoScheda: "#121212", bordo: "#121212" },
    cobalto: { nome: "Cobalto · pop", stile: "pop", carattere: "grottesco", sfondo1: "#2b45ff", sfondo2: "#1f37e6", accento: "#ffe24a", testo: "#ffffff", tenue: "#d5dbff", scheda: "#ffffff", testoScheda: "#121212", bordo: "#0b0b0b" },
    anguria: { nome: "Anguria · pop", stile: "pop", carattere: "manifesto", sfondo1: "#ff6250", sfondo2: "#ff4f3c", accento: "#9dffc6", testo: "#1a0b08", tenue: "#4d1a12", scheda: "#fff7f2", testoScheda: "#1a0b08", bordo: "#1a0b08" },
    carta: { nome: "Carta · editoriale", stile: "editoriale", carattere: "editoriale", sfondo1: "#f2ebdd", sfondo2: "#ebe2cf", accento: "#d6461f", testo: "#1d1a16", tenue: "#6b6155", scheda: "rgba(255,255,255,0.45)", testoScheda: "#1d1a16", bordo: "#1d1a16" },
    inchiostro: { nome: "Inchiostro · editoriale", stile: "editoriale", carattere: "editoriale", sfondo1: "#161513", sfondo2: "#1c1a17", accento: "#e9b949", testo: "#f2ebdd", tenue: "#a39a8b", scheda: "rgba(255,255,255,0.03)", testoScheda: "#f2ebdd", bordo: "#f2ebdd" },
    acido: { nome: "Acido · griglia", stile: "griglia", carattere: "tecnico", sfondo1: "#08090c", sfondo2: "#0e1116", accento: "#c8ff2e", testo: "#f4f4f0", tenue: "#9aa0a6", scheda: "rgba(255,255,255,0.04)", testoScheda: "#f4f4f0", bordo: "#c8ff2e" },
    laser: { nome: "Laser · griglia", stile: "griglia", carattere: "largo", sfondo1: "#0b0614", sfondo2: "#120a22", accento: "#ff4fd8", testo: "#ffffff", tenue: "#b8a8d6", scheda: "rgba(255,255,255,0.04)", testoScheda: "#ffffff", bordo: "#ff4fd8" },
    tramonto: { nome: "Tramonto · sfumato", stile: "sfumato", carattere: "largo", sfondo1: "#2a0f3d", sfondo2: "#a8324a", accento: "#ffc35a", testo: "#ffffff", tenue: "#f4cdd6", scheda: "rgba(255,255,255,0.10)", testoScheda: "#ffffff", bordo: "rgba(255,255,255,0.18)" },
    oceano: { nome: "Oceano · sfumato", stile: "sfumato", carattere: "grottesco", sfondo1: "#022c43", sfondo2: "#05606b", accento: "#3ee6c1", testo: "#ffffff", tenue: "#b5e3ea", scheda: "rgba(255,255,255,0.09)", testoScheda: "#ffffff", bordo: "rgba(255,255,255,0.16)" },
  };

  // Ogni carattere: famiglia dei titoli + famiglia del testo corrente.
  const CARATTERI = {
    auto: { nome: "Quello del tema" },
    pesante: { nome: "Pesante (Archivo Black)", titoli: '"SV Archivo", "Arial Black", sans-serif', peso: 400, testo: '"SV Inter", system-ui, sans-serif' },
    manifesto: { nome: "Manifesto (Anton, maiuscolo)", titoli: '"SV Anton", Impact, sans-serif', peso: 400, maiuscolo: true, testo: '"SV Inter", system-ui, sans-serif' },
    grottesco: { nome: "Grottesco (Bricolage)", titoli: '"SV Bricolage", system-ui, sans-serif', peso: 800, testo: '"SV Bricolage", system-ui, sans-serif' },
    editoriale: { nome: "Editoriale (Fraunces)", titoli: '"SV Fraunces", Georgia, serif', peso: 800, testo: '"SV Fraunces", Georgia, serif' },
    tecnico: { nome: "Tecnico (Space Grotesk)", titoli: '"SV Space", monospace', peso: 700, testo: '"SV Space", monospace' },
    largo: { nome: "Largo (Syne)", titoli: '"SV Syne", system-ui, sans-serif', peso: 800, testo: '"SV Inter", system-ui, sans-serif' },
    pulito: { nome: "Pulito (Inter)", titoli: '"SV Inter", system-ui, sans-serif', peso: 800, testo: '"SV Inter", system-ui, sans-serif' },
  };

  const TRANSIZIONI = { dissolvenza: "Dissolvenza", scorrimento: "Scorrimento", zoom: "Zoom" };

  const ANIMAZIONI = {
    auto: "Quella dello stile",
    sali: "Sale dal basso",
    scatto: "Scatto elastico",
    maschera: "Svelata da una maschera",
    macchina: "Macchina da scrivere",
    nessuna: "Nessuna (solo dissolvenza)",
  };
  const ANIMAZIONE_DI_STILE = { pop: "scatto", editoriale: "maschera", griglia: "macchina", sfumato: "sali" };

  const USCITA = 0.45; // secondi di uscita alla fine di ogni scena

  // ------------------------------------------------------------- matematica

  const limita = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const mescola = (a, b, p) => a + (b - a) * p;
  const fase = (t, inizio, durata) => limita((t - inizio) / Math.max(durata, 1e-6));
  const facile = {
    fuori: (p) => 1 - Math.pow(1 - p, 3),
    dentro: (p) => p * p * p,
    dentroFuori: (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2),
    molla: (p) => {
      const c1 = 1.70158;
      const c3 = c1 + 1;
      return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2);
    },
  };

  // ----------------------------------------------------------------- colori

  function rgb(colore) {
    const c = String(colore || "").trim();
    let m = /^#([0-9a-f]{3})$/i.exec(c);
    if (m) return m[1].split("").map((x) => parseInt(x + x, 16));
    m = /^#([0-9a-f]{6})$/i.exec(c);
    if (m) return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16));
    m = /^rgba?\(([^)]+)\)$/i.exec(c);
    if (m) return m[1].split(",").slice(0, 3).map((x) => parseFloat(x));
    return [128, 128, 128];
  }
  const rgba = (colore, a) => {
    const [r, g, b] = rgb(colore);
    return `rgba(${r},${g},${b},${a})`;
  };
  function luminanza(colore) {
    const [r, g, b] = rgb(colore).map((v) => {
      const x = v / 255;
      return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }
  const testoSopra = (colore) => (luminanza(colore) > 0.45 ? "#111111" : "#ffffff");

  // ------------------------------------------------------------- progetto

  function temaDi(progetto) {
    const base = TEMI[progetto.tema] || TEMI.limone;
    const tema = Object.assign({}, base);
    if (progetto.accento) tema.accento = progetto.accento;
    const car = CARATTERI[progetto.carattere] && progetto.carattere !== "auto" ? CARATTERI[progetto.carattere] : CARATTERI[base.carattere];
    tema.famigliaTitoli = car.titoli;
    tema.famiglia = car.testo;
    tema.pesoTitoli = car.peso;
    tema.maiuscolo = Boolean(car.maiuscolo);
    tema.chiaro = luminanza(tema.sfondo1) > 0.5;
    return tema;
  }

  function dimensioni(progetto) {
    return FORMATI[progetto.formato] || FORMATI["16:9"];
  }

  function tempi(progetto) {
    let t = 0;
    return (progetto.scene || []).map((scena, indice) => {
      const durata = Math.max(1, Number(scena.durata) || 3);
      const voce = { scena, indice, inizio: t, durata };
      t += durata;
      return voce;
    });
  }

  function durataTotale(progetto) {
    return tempi(progetto).reduce((s, v) => s + v.durata, 0);
  }

  function scenaA(progetto, t) {
    const lista = tempi(progetto);
    if (!lista.length) return null;
    for (const v of lista) if (t < v.inizio + v.durata) return v;
    return lista[lista.length - 1];
  }

  function sorgentiImmagini(progetto) {
    const s = new Set();
    if (progetto.marchio && progetto.marchio.logo) s.add(progetto.marchio.logo);
    for (const sc of progetto.scene || []) {
      if (sc.immagine) s.add(sc.immagine);
      if (sc.logo) s.add(sc.logo);
      if (sc.sfondo && sc.sfondo.immagine) s.add(sc.sfondo.immagine);
    }
    return [...s];
  }

  async function caricaRisorse(progetto, cache) {
    const mappa = cache || new Map();
    await Promise.all(
      sorgentiImmagini(progetto).map(async (src) => {
        if (mappa.has(src)) return;
        try {
          const img = new Image();
          if (/^https?:/i.test(src)) img.crossOrigin = "anonymous";
          img.src = src;
          await img.decode();
          mappa.set(src, img);
        } catch (e) {
          mappa.set(src, null); // immagine rotta: si usa il segnaposto
        }
      }),
    );
    return mappa;
  }

  // I font sono file del progetto: vanno caricati prima di disegnare.
  async function caricaFont() {
    if (typeof document === "undefined" || !document.fonts) return;
    const prove = [];
    for (const c of Object.values(CARATTERI)) {
      if (!c.titoli) continue;
      prove.push(`${c.peso} 40px ${c.titoli}`, `500 40px ${c.testo}`, `600 40px ${c.testo}`, `800 40px ${c.testo}`);
    }
    prove.push('italic 600 40px "SV Fraunces"', '700 40px "SV Space"');
    await Promise.all([...new Set(prove)].map((f) => document.fonts.load(f).catch(() => null)));
  }

  // ----------------------------------------------------------- disegno base

  // peso "T" = carattere dei titoli del tema.
  function font(tema, dim, peso = 500, corsivo = false) {
    const titolo = peso === "T";
    return `${corsivo ? "italic " : ""}${titolo ? tema.pesoTitoli : peso} ${Math.round(dim)}px ${titolo ? tema.famigliaTitoli : tema.famiglia}`;
  }

  function rettangoloTondo(ctx, x, y, w, h, r) {
    const rr = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  function conAlfa(ctx, a, fn) {
    if (a <= 0.001) return;
    ctx.save();
    ctx.globalAlpha *= limita(a);
    fn();
    ctx.restore();
  }

  function aCapo(ctx, testo, larghezzaMax) {
    const righe = [];
    for (const paragrafo of String(testo == null ? "" : testo).split("\n")) {
      const parole = paragrafo.split(/\s+/).filter(Boolean);
      let riga = "";
      for (const parola of parole) {
        const prova = riga ? riga + " " + parola : parola;
        if (riga && ctx.measureText(prova).width > larghezzaMax) {
          righe.push(riga);
          riga = parola;
        } else riga = prova;
      }
      righe.push(riga);
    }
    return righe;
  }

  // Trova la dimensione più grande che fa stare il testo nel riquadro.
  function adatta(ctx, tema, testo, larghezzaMax, altezzaMax, dimMax, dimMin, peso, interlinea = 1.15, corsivo = false) {
    const t = peso === "T" && tema.maiuscolo ? String(testo || "").toUpperCase() : testo;
    const inter = peso === "T" && tema.maiuscolo ? interlinea * 0.95 : interlinea;
    let dim = dimMax;
    for (;;) {
      ctx.font = font(tema, dim, peso, corsivo);
      const righe = aCapo(ctx, t, larghezzaMax);
      const larghe = righe.map((r) => ctx.measureText(r).width);
      const larga = larghe.some((w) => w > larghezzaMax);
      const alta = righe.length * dim * inter;
      if ((alta <= altezzaMax && !larga) || dim <= dimMin) {
        return { dim, righe, altezza: alta, interlinea: inter, peso, corsivo, larghezza: Math.max(0, ...larghe) };
      }
      dim = Math.max(dimMin, dim * 0.92);
    }
  }

  // Riquadro occupato da un blocco di testo (serve all'editor per selezionarlo).
  function boxBlocco(blocco, x, y, allinea) {
    const w = blocco.larghezza;
    const bx = allinea === "center" ? x - w / 2 : allinea === "right" ? x - w : x;
    return { x: bx, y, w, h: blocco.altezza };
  }

  /**
   * Scrive un blocco già misurato con adatta(), animando riga per riga.
   * anim = { s, inizio } oppure null (nessuna animazione).
   */
  function scriviBlocco(ctx, tema, blocco, x, y, colore, allinea = "left", anim = null) {
    ctx.textAlign = allinea;
    ctx.textBaseline = "top";
    let primaDi = 0;
    const tipo = anim ? anim.s.animazione : "nessuna";
    blocco.righe.forEach((riga, i) => {
      const yy = y + i * blocco.dim * blocco.interlinea;
      const scrivi = (testo = riga) => {
        ctx.font = font(tema, blocco.dim, blocco.peso, blocco.corsivo);
        ctx.fillStyle = colore;
        ctx.textAlign = allinea;
        ctx.textBaseline = "top";
        ctx.fillText(testo, x, yy);
      };
      const precedenti = primaDi;
      primaDi += riga.length + 1;
      if (!anim) return scrivi();
      const t = anim.s.t;
      const inizio = anim.inizio;
      const u = anim.s.u;
      if (tipo === "nessuna") {
        conAlfa(ctx, fase(t, inizio, 0.35), () => scrivi());
      } else if (tipo === "scatto") {
        const p = facile.molla(fase(t, inizio + i * 0.09, 0.55));
        conAlfa(ctx, fase(t, inizio + i * 0.09, 0.15), () => {
          ctx.save();
          const cx = allinea === "center" ? x : allinea === "right" ? x - blocco.larghezza / 2 : x + blocco.larghezza / 2;
          const cy = yy + blocco.dim / 2;
          ctx.translate(cx, cy);
          ctx.rotate((1 - p) * -0.06);
          ctx.scale(0.4 + 0.6 * p, 0.4 + 0.6 * p);
          ctx.translate(-cx, -cy);
          scrivi();
          ctx.restore();
        });
      } else if (tipo === "maschera") {
        const p = facile.fuori(fase(t, inizio + i * 0.11, 0.7));
        if (p <= 0) return;
        ctx.save();
        ctx.beginPath();
        ctx.rect(x - anim.s.W * 2, yy - blocco.dim * 0.15, anim.s.W * 4, blocco.dim * blocco.interlinea + blocco.dim * 0.15);
        ctx.clip();
        ctx.translate(0, (1 - p) * blocco.dim * 1.15);
        scrivi();
        ctx.restore();
      } else if (tipo === "macchina") {
        const visibili = Math.floor((t - inizio) * 34) - precedenti;
        if (visibili <= 0) return;
        const parte = riga.slice(0, visibili);
        scrivi(parte);
        const ultima = i === blocco.righe.length - 1;
        const finito = inizio + primaDi / 34;
        if (visibili < riga.length || (ultima && t < finito + 1.6 && Math.floor(t * 2.5) % 2 === 0)) {
          ctx.font = font(tema, blocco.dim, blocco.peso, blocco.corsivo);
          const w = ctx.measureText(parte).width;
          const larghezzaRiga = ctx.measureText(riga).width;
          const x0 = allinea === "center" ? x - larghezzaRiga / 2 : allinea === "right" ? x - larghezzaRiga : x;
          ctx.fillStyle = anim.s.tema.accento;
          ctx.fillRect(x0 + w + blocco.dim * 0.06, yy + blocco.dim * 0.08, blocco.dim * 0.45, blocco.dim * 0.9);
        }
      } else {
        // sali
        const p = facile.fuori(fase(t, inizio + i * 0.12, 0.7));
        conAlfa(ctx, p, () => {
          ctx.save();
          ctx.translate(0, (1 - p) * 5 * u);
          scrivi();
          ctx.restore();
        });
      }
    });
  }

  function disegnaCopertura(ctx, img, x, y, w, h, allineaAlto = false) {
    const s = Math.max(w / img.width, h / img.height);
    const iw = img.width * s;
    const ih = img.height * s;
    ctx.drawImage(img, x + (w - iw) / 2, allineaAlto ? y : y + (h - ih) / 2, iw, ih);
  }

  function disegnaContenuto(ctx, img, x, y, w, h) {
    const s = Math.min(w / img.width, h / img.height);
    const iw = img.width * s;
    const ih = img.height * s;
    ctx.drawImage(img, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih);
    return { x: x + (w - iw) / 2, y: y + (h - ih) / 2, w: iw, h: ih };
  }

  function ombra(ctx, u, forza = 1) {
    ctx.shadowColor = `rgba(0,0,0,${0.28 * forza})`;
    ctx.shadowBlur = 4 * u * forza;
    ctx.shadowOffsetY = 1.6 * u * forza;
  }
  function senzaOmbra(ctx) {
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  }

  // ----------------------------------------------------- ritocchi a mano

  /**
   * Disegna un elemento applicando le regolazioni manuali della scena.
   * box = riquadro naturale dell'elemento; fn(r) disegna (r = regolazioni).
   */
  function elemento(ctx, s, id, nome, box, fn, opzioni = {}) {
    const r = (s.sc.regola && s.sc.regola[id]) || {};
    const k = Number(r.scala) > 0 ? Number(r.scala) : 1;
    const dx = (Number(r.dx) || 0) * s.u;
    const dy = (Number(r.dy) || 0) * s.u;
    const cx = box.x + box.w / 2;
    const cy = box.y + box.h / 2;
    if (s.elementi) {
      s.elementi.push({
        id, nome, colorabile: opzioni.colorabile !== false, campo: opzioni.campo || null,
        nascosto: Boolean(r.nascosto),
        x: cx + dx - (box.w * k) / 2, y: cy + dy - (box.h * k) / 2, w: box.w * k, h: box.h * k,
      });
    }
    if (r.nascosto) return;
    ctx.save();
    ctx.translate(cx + dx, cy + dy);
    if (k !== 1) ctx.scale(k, k);
    ctx.translate(-cx, -cy);
    fn(r);
    ctx.restore();
  }

  // Dove finisce un punto dell'elemento dopo le regolazioni (es. il pulsante per il cursore).
  function puntoRegolato(s, id, box, px, py) {
    const r = (s.sc.regola && s.sc.regola[id]) || {};
    const k = Number(r.scala) > 0 ? Number(r.scala) : 1;
    const cx = box.x + box.w / 2;
    const cy = box.y + box.h / 2;
    return { x: cx + (Number(r.dx) || 0) * s.u + (px - cx) * k, y: cy + (Number(r.dy) || 0) * s.u + (py - cy) * k };
  }

  // ------------------------------------------------------------ stili

  const cacheMotivi = new Map();
  function motivo(ctx, chiave, lato, disegnaTessera) {
    if (!cacheMotivi.has(chiave)) {
      const c = typeof OffscreenCanvas !== "undefined" ? new OffscreenCanvas(lato, lato) : Object.assign(document.createElement("canvas"), { width: lato, height: lato });
      disegnaTessera(c.getContext("2d"), lato);
      cacheMotivi.set(chiave, c);
    }
    return ctx.createPattern(cacheMotivi.get(chiave), "repeat");
  }

  // Sfondo continuo fra le scene, diverso per ogni stile.
  function sfondo(ctx, W, H, tema, t) {
    const u = Math.min(W, H) / 100;
    const M = Math.max(W, H);
    if (tema.stile === "pop") {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, tema.sfondo1);
      g.addColorStop(1, tema.sfondo2);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      const passo = Math.round(3.4 * u);
      ctx.fillStyle = motivo(ctx, `punti-${passo}-${tema.bordo}`, passo, (c, l) => {
        c.fillStyle = rgba(tema.bordo, 0.13);
        c.beginPath();
        c.arc(l / 2, l / 2, l * 0.075, 0, Math.PI * 2);
        c.fill();
      });
      ctx.fillRect(0, 0, W, H);
      // forme decorative negli angoli, con ombra netta
      const ox = 0.9 * u;
      const cx = W + 4 * u + Math.sin(t * 0.5) * 2 * u;
      const cy = -2 * u + Math.cos(t * 0.4) * 2 * u;
      const r = 26 * u;
      ctx.fillStyle = tema.bordo;
      ctx.beginPath();
      ctx.arc(cx - r * 0.5 + ox, cy + r * 0.5 + ox, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = tema.accento;
      ctx.beginPath();
      ctx.arc(cx - r * 0.5, cy + r * 0.5, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 0.45 * u;
      ctx.strokeStyle = tema.bordo;
      ctx.stroke();
      ctx.save();
      ctx.translate(W - 1 * u, H - 1 * u);
      ctx.rotate(t * 0.15 + 0.3);
      ctx.lineWidth = 0.6 * u;
      ctx.strokeStyle = tema.bordo;
      rettangoloTondo(ctx, -11 * u, -11 * u, 22 * u, 22 * u, 3 * u);
      ctx.stroke();
      ctx.restore();
      return;
    }
    if (tema.stile === "editoriale") {
      ctx.fillStyle = tema.sfondo1;
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = motivo(ctx, `grana-${tema.chiaro}`, 180, (c, l) => {
        const dati = c.createImageData(l, l);
        let seme = 7;
        for (let i = 0; i < dati.data.length; i += 4) {
          seme = (seme * 16807) % 2147483647;
          const v = (seme / 2147483647) * 255;
          dati.data[i] = dati.data[i + 1] = dati.data[i + 2] = v;
          dati.data[i + 3] = tema.chiaro ? 16 : 12;
        }
        c.putImageData(dati, 0, 0);
      });
      ctx.fillRect(0, 0, W, H);
      return;
    }
    if (tema.stile === "griglia") {
      ctx.fillStyle = tema.sfondo1;
      ctx.fillRect(0, 0, W, H);
      const cx = W * (0.5 + 0.35 * Math.sin(t * 0.23));
      const cy = H * (0.5 + 0.35 * Math.cos(t * 0.19));
      const rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, M * 0.55);
      rg.addColorStop(0, rgba(tema.accento, 0.13));
      rg.addColorStop(1, rgba(tema.accento, 0));
      ctx.fillStyle = rg;
      ctx.fillRect(0, 0, W, H);
      const passo = 6 * u;
      const scorre = (t * 1.2 * u) % passo;
      ctx.strokeStyle = rgba(tema.testo, 0.07);
      ctx.lineWidth = Math.max(1, 0.1 * u);
      ctx.beginPath();
      for (let x = -passo + scorre; x < W + passo; x += passo) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
      }
      for (let y = -passo + scorre; y < H + passo; y += passo) {
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
      }
      ctx.stroke();
      return;
    }
    // sfumato
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, tema.sfondo1);
    g.addColorStop(1, tema.sfondo2);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 3; i++) {
      const cx = W * (0.5 + 0.42 * Math.sin(t * 0.19 + i * 2.1));
      const cy = H * (0.5 + 0.42 * Math.cos(t * 0.15 + i * 1.7));
      const r = M * (0.38 + 0.07 * i);
      const rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      const colore = i === 1 ? tema.sfondo2 : tema.accento;
      rg.addColorStop(0, rgba(colore, tema.chiaro ? 0.22 : 0.26));
      rg.addColorStop(1, rgba(colore, 0));
      ctx.fillStyle = rg;
      ctx.fillRect(0, 0, W, H);
    }
  }

  // Sfondo personalizzato della singola scena (colore pieno o foto con velo).
  function sfondoScena(ctx, s, sc, alfa) {
    const sf = sc.sfondo;
    if (!sf || !sf.tipo || sf.tipo === "tema" || alfa <= 0) return;
    conAlfa(ctx, alfa, () => {
      if (sf.tipo === "colore") {
        ctx.fillStyle = sf.colore || "#111111";
        ctx.fillRect(0, 0, s.W, s.H);
        return;
      }
      const img = s.img(sf.immagine);
      if (!img) return;
      const z = 1 + 0.06 * facile.dentroFuori(fase(s.t, 0, s.d));
      ctx.save();
      ctx.translate(s.W / 2, s.H / 2);
      ctx.scale(z, z);
      ctx.translate(-s.W / 2, -s.H / 2);
      disegnaCopertura(ctx, img, 0, 0, s.W, s.H);
      ctx.restore();
      const velo = sf.velo == null ? 0.45 : Number(sf.velo);
      if (velo > 0) {
        ctx.fillStyle = `rgba(0,0,0,${velo})`;
        ctx.fillRect(0, 0, s.W, s.H);
      }
    });
  }

  // Riquadro (schede, numeri) nello stile del tema.
  function riquadro(ctx, s, x, y, w, h, raggio) {
    const { u, tema } = s;
    if (tema.stile === "pop") {
      const o = 0.9 * u;
      ctx.fillStyle = tema.bordo;
      rettangoloTondo(ctx, x + o, y + o, w, h, raggio * 0.6);
      ctx.fill();
      ctx.fillStyle = tema.scheda;
      rettangoloTondo(ctx, x, y, w, h, raggio * 0.6);
      ctx.fill();
      ctx.lineWidth = 0.38 * u;
      ctx.strokeStyle = tema.bordo;
      ctx.stroke();
    } else if (tema.stile === "editoriale") {
      ctx.fillStyle = tema.scheda;
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = tema.bordo;
      ctx.fillRect(x, y, w, Math.max(1, 0.18 * u));
      ctx.fillRect(x, y + h - Math.max(1, 0.08 * u), w, Math.max(1, 0.08 * u));
    } else if (tema.stile === "griglia") {
      ctx.fillStyle = tema.scheda;
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = rgba(tema.bordo, 0.35);
      ctx.lineWidth = Math.max(1, 0.12 * u);
      ctx.strokeRect(x, y, w, h);
      angoli(ctx, x, y, w, h, 1.6 * u, tema.accento, 0.3 * u);
    } else {
      ctx.fillStyle = tema.scheda;
      rettangoloTondo(ctx, x, y, w, h, raggio);
      ctx.fill();
      ctx.strokeStyle = tema.bordo;
      ctx.lineWidth = Math.max(1, 0.15 * u);
      ctx.stroke();
    }
  }

  function angoli(ctx, x, y, w, h, l, colore, spessore) {
    ctx.save();
    ctx.strokeStyle = colore;
    ctx.lineWidth = spessore;
    ctx.lineCap = "square";
    ctx.beginPath();
    for (const [ax, ay, sx, sy] of [[x, y, 1, 1], [x + w, y, -1, 1], [x, y + h, 1, -1], [x + w, y + h, -1, -1]]) {
      ctx.moveTo(ax, ay + sy * l);
      ctx.lineTo(ax, ay);
      ctx.lineTo(ax + sx * l, ay);
    }
    ctx.stroke();
    ctx.restore();
  }

  // Pulsante pieno nello stile del tema, centrato in (0, 0).
  function formaPulsante(ctx, s, w, h, colore) {
    const { u, tema } = s;
    if (tema.stile === "pop") {
      const o = 0.9 * u;
      ctx.fillStyle = tema.bordo;
      rettangoloTondo(ctx, -w / 2 + o, -h / 2 + o, w, h, h / 2);
      ctx.fill();
      ctx.fillStyle = colore;
      rettangoloTondo(ctx, -w / 2, -h / 2, w, h, h / 2);
      ctx.fill();
      ctx.lineWidth = 0.4 * u;
      ctx.strokeStyle = tema.bordo;
      ctx.stroke();
    } else if (tema.stile === "editoriale") {
      ctx.fillStyle = colore;
      ctx.fillRect(-w / 2, -h / 2, w, h);
    } else if (tema.stile === "griglia") {
      ctx.save();
      ctx.shadowColor = rgba(colore, 0.6);
      ctx.shadowBlur = 3 * u;
      ctx.fillStyle = colore;
      rettangoloTondo(ctx, -w / 2, -h / 2, w, h, 0.6 * u);
      ctx.fill();
      ctx.restore();
    } else {
      ombra(ctx, u, 0.9);
      ctx.fillStyle = colore;
      rettangoloTondo(ctx, -w / 2, -h / 2, w, h, h / 2);
      ctx.fill();
      senzaOmbra(ctx);
    }
  }

  // Corpo di un dispositivo (browser o telefono) con l'ombra dello stile.
  function cornicePiena(ctx, s, x, y, w, h, r, riempimento) {
    const { u, tema } = s;
    if (tema.stile === "pop") {
      const o = 1.3 * u;
      ctx.fillStyle = tema.bordo;
      rettangoloTondo(ctx, x + o, y + o, w, h, r);
      ctx.fill();
      ctx.fillStyle = riempimento;
      rettangoloTondo(ctx, x, y, w, h, r);
      ctx.fill();
    } else if (tema.stile === "griglia") {
      ctx.save();
      ctx.shadowColor = rgba(tema.accento, 0.35);
      ctx.shadowBlur = 5 * u;
      ctx.fillStyle = riempimento;
      rettangoloTondo(ctx, x, y, w, h, r);
      ctx.fill();
      ctx.restore();
    } else if (tema.stile === "editoriale") {
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.18)";
      ctx.shadowBlur = 1.6 * u;
      ctx.shadowOffsetY = 0.6 * u;
      ctx.fillStyle = riempimento;
      rettangoloTondo(ctx, x, y, w, h, r * 0.4);
      ctx.fill();
      ctx.restore();
    } else {
      ctx.save();
      ombra(ctx, u, 1.2);
      ctx.fillStyle = riempimento;
      rettangoloTondo(ctx, x, y, w, h, r);
      ctx.fill();
      ctx.restore();
    }
  }

  function contornoPop(ctx, s, x, y, w, h, r) {
    if (s.tema.stile !== "pop") return;
    ctx.lineWidth = 0.4 * s.u;
    ctx.strokeStyle = s.tema.bordo;
    rettangoloTondo(ctx, x, y, w, h, r);
    ctx.stroke();
  }

  function segnoSpunta(ctx, cx, cy, r, colore) {
    ctx.save();
    ctx.strokeStyle = colore;
    ctx.lineWidth = r * 0.26;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.45, cy + r * 0.02);
    ctx.lineTo(cx - r * 0.12, cy + r * 0.34);
    ctx.lineTo(cx + r * 0.48, cy - r * 0.32);
    ctx.stroke();
    ctx.restore();
  }

  function stella(ctx, cx, cy, r, colore, contorno) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const rr = i % 2 === 0 ? r : r * 0.45;
      ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fillStyle = colore;
    ctx.fill();
    if (contorno) {
      ctx.lineWidth = r * 0.16;
      ctx.lineJoin = "round";
      ctx.strokeStyle = contorno;
      ctx.stroke();
    }
  }

  // Freccia del mouse. (x, y) = punta.
  function cursore(ctx, x, y, dim, premuto = 0) {
    ctx.save();
    ctx.translate(x, y);
    const s = dim * (1 - 0.15 * premuto);
    ctx.scale(s / 24, s / 24);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, 22);
    ctx.lineTo(5.6, 16.8);
    ctx.lineTo(9.4, 25.2);
    ctx.lineTo(13, 23.6);
    ctx.lineTo(9.3, 15.4);
    ctx.lineTo(16.6, 15.4);
    ctx.closePath();
    ctx.shadowColor = "rgba(0,0,0,0.35)";
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 2;
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = "#111111";
    ctx.lineJoin = "round";
    ctx.stroke();
    ctx.restore();
  }

  // Sito finto, usato quando la scena non ha ancora un'immagine.
  function sitoFinto(ctx, x, y, w, h, tema, telefono = false) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x, y, w, h);
    const k = telefono ? w / 40 : w / 100;
    const grigio = "#e8ebf2";
    const scuro = "#c9cfdc";
    ctx.fillStyle = "#f6f7fb";
    ctx.fillRect(x, y, w, 9 * k);
    ctx.fillStyle = tema.accento;
    rettangoloTondo(ctx, x + 3 * k, y + 2.5 * k, 4 * k, 4 * k, k);
    ctx.fill();
    ctx.fillStyle = scuro;
    rettangoloTondo(ctx, x + 8.5 * k, y + 3.6 * k, 14 * k, 1.8 * k, k);
    ctx.fill();
    if (!telefono) {
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = grigio;
        rettangoloTondo(ctx, x + w - (52 - i * 11) * k, y + 3.8 * k, 8 * k, 1.4 * k, k);
        ctx.fill();
      }
    }
    const hy = y + 15 * k;
    const larg = telefono ? w - 6 * k : w * 0.46;
    ctx.fillStyle = "#1c2236";
    rettangoloTondo(ctx, x + 3 * k, hy, larg, 4.2 * k, k);
    ctx.fill();
    rettangoloTondo(ctx, x + 3 * k, hy + 6 * k, larg * 0.75, 4.2 * k, k);
    ctx.fill();
    ctx.fillStyle = scuro;
    for (let i = 0; i < 3; i++) {
      rettangoloTondo(ctx, x + 3 * k, hy + (14 + i * 3) * k, larg * (0.95 - i * 0.12), 1.5 * k, k);
      ctx.fill();
    }
    ctx.fillStyle = tema.accento;
    rettangoloTondo(ctx, x + 3 * k, hy + 25 * k, (telefono ? 18 : 14) * k, 5 * k, 2.5 * k);
    ctx.fill();
    if (!telefono) {
      const g = ctx.createLinearGradient(x + w * 0.55, hy, x + w * 0.95, hy + 30 * k);
      g.addColorStop(0, rgba(tema.accento, 0.85));
      g.addColorStop(1, rgba(tema.accento, 0.35));
      ctx.fillStyle = g;
      rettangoloTondo(ctx, x + w * 0.55, hy - 2 * k, w * 0.41, 34 * k, 2 * k);
      ctx.fill();
    }
    const sy = hy + (telefono ? 35 : 40) * k;
    const n = telefono ? 1 : 3;
    const gap = 3 * k;
    const cw = (w - 6 * k - gap * (n - 1)) / n;
    for (let r = 0; r < (telefono ? 4 : 2); r++) {
      for (let i = 0; i < n; i++) {
        const cx = x + 3 * k + i * (cw + gap);
        const cy = sy + r * (telefono ? 22 : 26) * k;
        ctx.fillStyle = "#f3f5fa";
        rettangoloTondo(ctx, cx, cy, cw, (telefono ? 19 : 22) * k, 1.5 * k);
        ctx.fill();
        ctx.fillStyle = rgba(tema.accento, 0.5);
        rettangoloTondo(ctx, cx + 2 * k, cy + 2 * k, 5 * k, 5 * k, k);
        ctx.fill();
        ctx.fillStyle = scuro;
        rettangoloTondo(ctx, cx + 2 * k, cy + 9.5 * k, cw * 0.7, 1.6 * k, k);
        ctx.fill();
        ctx.fillStyle = grigio;
        rettangoloTondo(ctx, cx + 2 * k, cy + 13 * k, cw * 0.55, 1.4 * k, k);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  // ------------------------------------------------------------ dispositivi

  function misuraBrowser(bx, by, bw, bh, aspetto) {
    let w = bw;
    let barra = w * 0.045;
    let h = w / aspetto + barra;
    if (h > bh) {
      w = bh / (1 / aspetto + 0.045);
      barra = w * 0.045;
      h = bh;
    }
    const x = bx + (bw - w) / 2;
    const y = by + (bh - h) / 2;
    return { x, y, w, h, barra, vx: x, vy: y + barra, vw: w, vh: h - barra };
  }

  function disegnaBrowser(ctx, m, s, indirizzo) {
    const { tema } = s;
    const r = m.barra * 0.45;
    const pop = tema.stile === "pop";
    ctx.save();
    cornicePiena(ctx, s, m.x, m.y, m.w, m.h, r, "#ffffff");
    ctx.save();
    rettangoloTondo(ctx, m.x, m.y, m.w, m.h, r);
    ctx.clip();
    ctx.fillStyle = pop ? tema.accento : "#eef0f5";
    ctx.fillRect(m.x, m.y, m.w, m.barra);
    if (pop) {
      ctx.fillStyle = tema.bordo;
      ctx.fillRect(m.x, m.y + m.barra - 0.2 * s.u, m.w, 0.4 * s.u);
    }
    ctx.restore();
    const colori = pop ? [tema.bordo, tema.bordo, tema.bordo] : ["#ff5f57", "#febc2e", "#28c840"];
    colori.forEach((c, i) => {
      ctx.beginPath();
      ctx.arc(m.x + m.barra * (0.55 + i * 0.42), m.y + m.barra / 2, m.barra * 0.13, 0, Math.PI * 2);
      ctx.fillStyle = c;
      ctx.fill();
    });
    const ax = m.x + m.barra * 1.9;
    const aw = Math.min(m.w * 0.55, m.w - m.barra * 2.6);
    ctx.fillStyle = "#ffffff";
    rettangoloTondo(ctx, ax, m.y + m.barra * 0.2, aw, m.barra * 0.6, m.barra * 0.3);
    ctx.fill();
    if (pop) {
      ctx.lineWidth = 0.25 * s.u;
      ctx.strokeStyle = tema.bordo;
      ctx.stroke();
    }
    if (indirizzo) {
      ctx.font = `600 ${Math.round(m.barra * 0.3)}px ${tema.famiglia}`;
      ctx.fillStyle = "#5b6275";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      let testo = String(indirizzo).replace(/^https?:\/\//, "");
      while (testo.length > 3 && ctx.measureText(testo).width > aw - m.barra * 0.5) testo = testo.slice(0, -2);
      ctx.fillText(testo, ax + m.barra * 0.28, m.y + m.barra / 2 + 1);
    }
    ctx.restore();
  }

  function misuraTelefono(bx, by, bw, bh) {
    const aspetto = 9 / 19.5;
    let h = bh;
    let w = h * aspetto;
    if (w > bw) {
      w = bw;
      h = w / aspetto;
    }
    const x = bx + (bw - w) / 2;
    const y = by + (bh - h) / 2;
    const bordo = w * 0.045;
    return { x, y, w, h, bordo, vx: x + bordo, vy: y + bordo, vw: w - 2 * bordo, vh: h - 2 * bordo, raggio: w * 0.15 };
  }

  function isolaTelefono(ctx, m) {
    ctx.fillStyle = "#111318";
    const iw = m.w * 0.3;
    rettangoloTondo(ctx, m.x + (m.w - iw) / 2, m.vy + m.vh * 0.012, iw, m.vh * 0.032, m.vh * 0.016);
    ctx.fill();
  }

  // Etichetta sopra il titolo: adesivo (pop), filetto (editoriale), cornice (griglia).
  function etichetta(ctx, s, testo, cx, y, h, p) {
    const { u, tema } = s;
    ctx.font = font(tema, h * 0.46, 800);
    const t = String(testo).toUpperCase();
    const tw = ctx.measureText(t).width + h * 1.1;
    ctx.save();
    ctx.translate(cx, y + h / 2 + (1 - p) * 2 * u);
    if (tema.stile === "pop") {
      ctx.rotate(-0.06 * p);
      ctx.fillStyle = tema.bordo;
      rettangoloTondo(ctx, -tw / 2 + 0.6 * u, -h / 2 + 0.6 * u, tw, h, h * 0.2);
      ctx.fill();
      ctx.fillStyle = tema.accento;
      rettangoloTondo(ctx, -tw / 2, -h / 2, tw, h, h * 0.2);
      ctx.fill();
      ctx.lineWidth = 0.3 * u;
      ctx.strokeStyle = tema.bordo;
      ctx.stroke();
      ctx.fillStyle = testoSopra(tema.accento);
    } else if (tema.stile === "editoriale") {
      ctx.fillStyle = tema.accento;
      ctx.fillRect(-tw / 2, h / 2 - 0.25 * u, tw, 0.25 * u);
    } else if (tema.stile === "griglia") {
      ctx.strokeStyle = tema.accento;
      ctx.lineWidth = 0.2 * u;
      ctx.strokeRect(-tw / 2, -h / 2, tw, h);
    } else {
      ctx.fillStyle = rgba(tema.accento, 0.2);
      rettangoloTondo(ctx, -tw / 2, -h / 2, tw, h, h / 2);
      ctx.fill();
    }
    if (tema.stile !== "pop") ctx.fillStyle = tema.accento;
    ctx.font = font(tema, h * 0.46, 800);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(t, 0, h * 0.04);
    ctx.restore();
    return tw;
  }

  // ---------------------------------------------------------------- scene

  const SCENE = {};

  function bloccoLogo(ctx, s, logo, cx, y, dim, inizio) {
    elemento(ctx, s, "logo", "Logo", { x: cx - dim / 2, y, w: dim, h: dim }, () => {
      const p = facile.molla(fase(s.t, inizio, 0.7));
      conAlfa(ctx, fase(s.t, inizio, 0.3), () => {
        ctx.save();
        ctx.translate(cx, y + dim / 2);
        ctx.scale(0.6 + 0.4 * p, 0.6 + 0.4 * p);
        disegnaContenuto(ctx, logo, -dim / 2, -dim / 2, dim, dim);
        ctx.restore();
      });
    }, { colorabile: false });
  }

  SCENE.titolo = function (ctx, sc, s) {
    const { W, H, u, t, tema } = s;
    const larg = W * (s.verticale ? 0.86 : 0.8);
    const logo = s.img(sc.logo || (s.progetto.marchio && s.progetto.marchio.logo));
    const dimLogo = (s.verticale ? 22 : 17) * u;
    const tit = adatta(ctx, tema, sc.titolo || "", larg, H * 0.4, (s.verticale ? 14 : 15) * u, 4 * u, "T", 1.04);
    const sot = sc.sottotitolo ? adatta(ctx, tema, sc.sottotitolo, larg * 0.9, H * 0.2, (s.verticale ? 5.4 : 5) * u, 2.4 * u, 500, 1.3) : null;
    const etichettaH = sc.etichetta ? 6.4 * u : 0;
    const gap = 3.2 * u;
    let tot = tit.altezza + 4 * u;
    if (logo) tot += dimLogo + gap;
    if (etichettaH) tot += etichettaH + gap;
    if (sot) tot += sot.altezza + gap;
    let y = (H - tot) / 2;
    const cx = W / 2;

    if (logo) {
      bloccoLogo(ctx, s, logo, cx, y, dimLogo, 0);
      y += dimLogo + gap;
    }
    if (etichettaH) {
      ctx.font = font(tema, etichettaH * 0.46, 800);
      const tw = ctx.measureText(String(sc.etichetta).toUpperCase()).width + etichettaH * 1.1;
      const yy = y;
      elemento(ctx, s, "etichetta", "Etichetta", { x: cx - tw / 2, y: yy, w: tw, h: etichettaH }, () => {
        const p = facile.molla(fase(t, 0.1, 0.6));
        conAlfa(ctx, fase(t, 0.1, 0.25), () => etichetta(ctx, s, sc.etichetta, cx, yy, etichettaH, p));
      }, { campo: "etichetta", colorabile: false });
      y += etichettaH + gap;
    }
    const yt = y;
    elemento(ctx, s, "titolo", "Titolo", boxBlocco(tit, cx, yt, "center"), (r) => {
      scriviBlocco(ctx, tema, tit, cx, yt, r.colore || tema.testo, "center", { s, inizio: 0.15 });
    }, { campo: "titolo" });
    y += tit.altezza + 1.6 * u;
    const yl = y;
    elemento(ctx, s, "linea", "Linea d'accento", { x: cx - 9 * u, y: yl, w: 18 * u, h: 0.9 * u }, (r) => {
      const pl = facile.fuori(fase(t, 0.55, 0.7));
      if (pl <= 0) return;
      ctx.fillStyle = r.colore || tema.accento;
      if (tema.stile === "editoriale") ctx.fillRect(cx - 14 * u * pl, yl + 0.3 * u, 28 * u * pl, 0.3 * u);
      else {
        rettangoloTondo(ctx, cx - 9 * u * pl, yl, 18 * u * pl, 0.9 * u, tema.stile === "griglia" ? 0 : 0.45 * u);
        ctx.fill();
      }
    });
    y += 2.4 * u + gap;
    if (sot) {
      const ys = y;
      elemento(ctx, s, "sottotitolo", "Sottotitolo", boxBlocco(sot, cx, ys, "center"), (r) => {
        const p = facile.fuori(fase(t, 0.7, 0.7));
        conAlfa(ctx, p, () => {
          ctx.save();
          ctx.translate(0, (1 - p) * 3 * u);
          scriviBlocco(ctx, tema, sot, cx, ys, r.colore || tema.tenue, "center");
          ctx.restore();
        });
      }, { campo: "sottotitolo" });
    }
  };

  SCENE.punti = function (ctx, sc, s) {
    const { W, H, u, t, d, tema } = s;
    const punti = (sc.punti || []).filter((p) => String(p).trim()).slice(0, 6);
    const larg = Math.min(W * 0.86, 140 * u);
    const x0 = (W - larg) / 2;
    const tit = adatta(ctx, tema, sc.titolo || "", larg, H * 0.2, (s.verticale ? 10 : 9.5) * u, 3.5 * u, "T", 1.05);
    const gap = 2.6 * u;
    const pad = 3 * u;
    const raggio = 3.2 * u;
    const testoW = larg - pad * 3 - raggio * 2;
    const spazio = H * 0.86 - tit.altezza - 6 * u;
    let dim = (s.verticale ? 5.6 : 5.2) * u;
    let schede;
    for (;;) {
      ctx.font = font(tema, dim, 600);
      schede = punti.map((p) => aCapo(ctx, p, testoW));
      const alt = schede.reduce((a, r) => a + Math.max(raggio * 2, r.length * dim * 1.25) + pad * 2, 0) + gap * (punti.length - 1);
      if (alt <= spazio || dim <= 2.2 * u) break;
      dim *= 0.93;
    }
    const altezze = schede.map((r) => Math.max(raggio * 2, r.length * dim * 1.25) + pad * 2);
    const totale = tit.altezza + 6 * u + altezze.reduce((a, b) => a + b, 0) + gap * (punti.length - 1);
    let y = (H - totale) / 2;

    const yt = y;
    elemento(ctx, s, "titolo", "Titolo", boxBlocco(tit, W / 2, yt, "center"), (r) => {
      scriviBlocco(ctx, tema, tit, W / 2, yt, r.colore || tema.testo, "center", { s, inizio: 0 });
    }, { campo: "titolo" });
    y += tit.altezza + 6 * u;

    const sfasa = Math.min(0.55, Math.max(0.2, (d - 1.6) / Math.max(1, punti.length)));
    schede.forEach((righe, i) => {
      const h = altezze[i];
      const yy = y;
      elemento(ctx, s, `punto${i}`, `Punto ${i + 1}`, { x: x0, y: yy, w: larg, h }, (r) => {
        const p = facile.fuori(fase(t, 0.45 + i * sfasa, 0.6));
        const pc = facile.molla(fase(t, 0.6 + i * sfasa, 0.5));
        conAlfa(ctx, p, () => {
          ctx.save();
          ctx.translate((1 - p) * 8 * u, 0);
          riquadro(ctx, s, x0, yy, larg, h, 2 * u);
          const cx = x0 + pad + raggio;
          const cy = yy + h / 2;
          if (tema.stile === "editoriale" || tema.stile === "griglia") {
            ctx.font = tema.stile === "editoriale" ? font(tema, raggio * 1.5, "T") : font(tema, raggio * 1.1, 800);
            ctx.fillStyle = tema.accento;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(String(i + 1).padStart(2, "0"), cx, cy);
          } else {
            ctx.beginPath();
            ctx.arc(cx, cy, raggio * pc, 0, Math.PI * 2);
            ctx.fillStyle = tema.accento;
            ctx.fill();
            if (tema.stile === "pop") {
              ctx.lineWidth = 0.35 * u;
              ctx.strokeStyle = tema.bordo;
              ctx.stroke();
            }
            if (pc > 0.5) segnoSpunta(ctx, cx, cy, raggio * pc, testoSopra(tema.accento));
          }
          ctx.font = font(tema, dim, 600);
          ctx.fillStyle = r.colore || tema.testoScheda;
          ctx.textAlign = "left";
          ctx.textBaseline = "top";
          const ty = yy + (h - righe.length * dim * 1.25) / 2 + dim * 0.1;
          righe.forEach((rr, k) => ctx.fillText(rr, cx + raggio + pad, ty + k * dim * 1.25));
          ctx.restore();
        });
      }, { campo: "punti" });
      y += h + gap;
    });
  };

  SCENE.schermata = function (ctx, sc, s) {
    const { W, H, u, t, d, tema } = s;
    const img = s.img(sc.immagine);
    const telefono = sc.dispositivo === "telefono";
    const orizzontale = W >= H * 1.2;
    const haTesto = Boolean((sc.titolo || "").trim() || (sc.testo || "").trim());
    let testoBox;
    let box;
    if (!haTesto) {
      box = { x: 6 * u, y: 7 * u, w: W - 12 * u, h: H - 14 * u };
    } else if (orizzontale) {
      testoBox = { x: 7 * u, y: 10 * u, w: W * (telefono ? 0.42 : 0.3), h: H - 20 * u };
      const bx = testoBox.x + testoBox.w + 4 * u;
      box = { x: bx, y: 6 * u, w: W - bx - 4 * u, h: H - 12 * u };
    } else {
      testoBox = { x: 7 * u, y: 8 * u, w: W - 14 * u, h: H * 0.24 };
      const by = testoBox.y + testoBox.h + 4 * u;
      box = { x: 6 * u, y: by, w: W - 12 * u, h: H - by - 7 * u };
    }

    if (testoBox) {
      const allinea = orizzontale ? "left" : "center";
      const tx = orizzontale ? testoBox.x : W / 2;
      const tit = adatta(ctx, tema, sc.titolo || "", testoBox.w, testoBox.h * 0.55, (orizzontale ? 8 : 8.5) * u, 3.2 * u, "T", 1.05);
      const tes = (sc.testo || "").trim() ? adatta(ctx, tema, sc.testo, testoBox.w, testoBox.h * 0.42, 4.2 * u, 2.2 * u, 500, 1.35) : null;
      const tot = tit.altezza + (tes ? 2.6 * u + tes.altezza : 0);
      let y = testoBox.y + (testoBox.h - tot) / 2;
      const y1 = y;
      elemento(ctx, s, "titolo", "Titolo", boxBlocco(tit, tx, y1, allinea), (r) => {
        scriviBlocco(ctx, tema, tit, tx, y1, r.colore || tema.testo, allinea, { s, inizio: 0.1 });
      }, { campo: "titolo" });
      y += tit.altezza + 2.6 * u;
      if (tes) {
        const y2 = y;
        elemento(ctx, s, "testo", "Testo", boxBlocco(tes, tx, y2, allinea), (r) => {
          const p2 = facile.fuori(fase(t, 0.45, 0.7));
          conAlfa(ctx, p2, () => {
            ctx.save();
            ctx.translate(orizzontale ? (p2 - 1) * 5 * u : 0, orizzontale ? 0 : (1 - p2) * 3 * u);
            scriviBlocco(ctx, tema, tes, tx, y2, r.colore || tema.tenue, allinea);
            ctx.restore();
          });
        }, { campo: "testo" });
      }
    }

    const m = telefono ? misuraTelefono(box.x, box.y, box.w, box.h) : misuraBrowser(box.x, box.y, box.w, box.h, 16 / 10);
    elemento(ctx, s, "dispositivo", telefono ? "Telefono" : "Browser", { x: m.x, y: m.y, w: m.w, h: m.h }, () => {
      const pe = facile.fuori(fase(t, 0.2, 0.9));
      const p = fase(t, 0.9, d - 1.8);
      conAlfa(ctx, fase(t, 0.2, 0.5), () => {
        ctx.save();
        const cx = m.x + m.w / 2;
        const cy = m.y + m.h / 2;
        ctx.translate(cx, cy + (1 - pe) * 6 * u);
        const k = 0.92 + 0.08 * pe;
        ctx.scale(k, k);
        ctx.rotate((1 - pe) * (tema.stile === "pop" ? 0.05 : 0));
        ctx.translate(-cx, -cy);
        if (telefono) cornicePiena(ctx, s, m.x, m.y, m.w, m.h, m.raggio, "#111318");
        else disegnaBrowser(ctx, m, s, sc.url || (s.progetto.marchio && s.progetto.marchio.url));
        ctx.save();
        if (telefono) rettangoloTondo(ctx, m.vx, m.vy, m.vw, m.vh, m.raggio * 0.8);
        else rettangoloTondo(ctx, m.vx, m.vy - m.barra, m.vw, m.vh + m.barra, m.barra * 0.45);
        ctx.clip();
        if (!telefono) {
          ctx.beginPath();
          ctx.rect(m.vx, m.vy, m.vw, m.vh);
          ctx.clip();
        }
        if (img) {
          const scala = m.vw / img.width;
          const ih = img.height * scala;
          if (sc.scorri && ih > m.vh * 1.05) {
            const dy = facile.dentroFuori(p) * (ih - m.vh);
            ctx.drawImage(img, m.vx, m.vy - dy, m.vw, ih);
          } else {
            const z = 1 + 0.06 * facile.dentroFuori(p);
            const zx = m.vx + m.vw / 2;
            const zy = m.vy + m.vh / 2;
            ctx.translate(zx, zy);
            ctx.scale(z, z);
            ctx.translate(-zx, -zy);
            disegnaCopertura(ctx, img, m.vx, m.vy, m.vw, m.vh, true);
          }
        } else {
          sitoFinto(ctx, m.vx, m.vy, m.vw, m.vh, tema, telefono);
        }
        ctx.restore();
        if (telefono) isolaTelefono(ctx, m);
        contornoPop(ctx, s, m.x, m.y, m.w, m.h, telefono ? m.raggio : m.barra * 0.45);
        ctx.restore();
      });
    }, { colorabile: false });
  };

  // Geometria della scena tutorial: serve anche all'editor per piazzare i passi.
  // stile = stile del tema: l'editoriale ha filetti in alto e in basso da non coprire.
  function geometriaTutorial(W, H, u, sc, img, stile) {
    const verticale = H > W * 1.1;
    const haTitolo = Boolean((sc.titolo || "").trim());
    const sopra = stile === "editoriale" ? 6 * u : 0;
    const sotto = stile === "editoriale" ? 3 * u : 0;
    const alto = (haTitolo ? (verticale ? H * 0.16 : 12 * u) : 3 * u) + sopra;
    const box = { x: 4 * u, y: alto + 1.5 * u, w: W - 8 * u, h: H - alto - 5 * u - sotto };
    const aspetto = img ? img.width / img.height : 16 / 10;
    const m = misuraBrowser(box.x, box.y, box.w, box.h, aspetto);
    const titolo = { x: 6 * u, y: 3 * u + sopra, w: W - 12 * u, h: alto - 3 * u - sopra };
    if (verticale) {
      const gruppo = titolo.h + 2 * u + m.h;
      const y0 = (H - gruppo) / 2;
      const dy = y0 + titolo.h + 2 * u - m.y;
      titolo.y = y0;
      m.y += dy;
      m.vy += dy;
    }
    return { m, titolo };
  }

  function passiTutorial(sc) {
    return (sc.passi || []).filter((p) => p && isFinite(p.x) && isFinite(p.y));
  }

  const INIZIO_TUTORIAL = 0.6;
  function statoTutorial(sc, t, d) {
    const passi = passiTutorial(sc);
    const n = passi.length;
    if (!n) return { passi, n, k: -1 };
    const slot = Math.max(0.8, (d - INIZIO_TUTORIAL - 0.5) / n);
    const k = limita(Math.floor((t - INIZIO_TUTORIAL) / slot), 0, n - 1);
    const q = limita((t - INIZIO_TUTORIAL - k * slot) / slot, 0, 1.0001);
    const da = k === 0 ? { x: 0.82, y: 0.88 } : passi[k - 1];
    const a = passi[k];
    const mv = t < INIZIO_TUTORIAL ? 0 : facile.dentroFuori(limita(q / 0.35));
    return {
      passi, n, k, q, slot,
      pos: { x: mescola(da.x, a.x, mv), y: mescola(da.y, a.y, mv) },
      click: t < INIZIO_TUTORIAL ? -1 : (q - 0.38) / 0.3,
    };
  }

  SCENE.tutorial = function (ctx, sc, s) {
    const { W, H, u, d, tema } = s;
    let t = s.t;
    const img = s.img(sc.immagine);
    const g = geometriaTutorial(W, H, u, sc, img, tema.stile);
    const m = g.m;
    if (s.modifica) t = 99; // posa ferma per l'editor: niente zoom né cursore
    const st = s.modifica ? { n: 0 } : statoTutorial(sc, t, d);

    if ((sc.titolo || "").trim()) {
      const tit = adatta(ctx, tema, sc.titolo, g.titolo.w, g.titolo.h, (s.verticale ? 7 : 6) * u, 3 * u, "T", 1.05);
      const ty = g.titolo.y + (g.titolo.h - tit.altezza) / 2;
      elemento(ctx, s, "titolo", "Titolo", boxBlocco(tit, W / 2, ty, "center"), (r) => {
        scriviBlocco(ctx, tema, tit, W / 2, ty, r.colore || tema.testo, "center", s.modifica ? null : { s, inizio: 0 });
      }, { campo: "titolo" });
    }

    let scala = 1;
    let centro = { x: 0.5, y: 0.5 };
    if (sc.zoom && st.n) {
      const z = facile.dentroFuori(fase(t, INIZIO_TUTORIAL * 0.5, 0.9)) * (1 - facile.dentroFuori(fase(t, d - 1.1, 0.7)));
      scala = 1 + 0.7 * z;
      centro = { x: mescola(0.5, st.pos.x, z), y: mescola(0.5, st.pos.y, z) };
      const mezzo = 0.5 / scala;
      centro.x = limita(centro.x, mezzo, 1 - mezzo);
      centro.y = limita(centro.y, mezzo, 1 - mezzo);
    }
    const aSchermo = (px, py) => ({
      x: m.vx + m.vw / 2 + (px - centro.x) * m.vw * scala,
      y: m.vy + m.vh / 2 + (py - centro.y) * m.vh * scala,
    });

    const pe = facile.fuori(fase(t, 0.1, 0.8));
    conAlfa(ctx, fase(t, 0.1, 0.4), () => {
      ctx.save();
      ctx.translate(0, (1 - pe) * 5 * u);
      disegnaBrowser(ctx, m, s, sc.url || (s.progetto.marchio && s.progetto.marchio.url));
      ctx.save();
      rettangoloTondo(ctx, m.vx, m.vy - m.barra, m.vw, m.vh + m.barra, m.barra * 0.45);
      ctx.clip();
      ctx.beginPath();
      ctx.rect(m.vx, m.vy, m.vw, m.vh);
      ctx.clip();
      ctx.translate(m.vx + m.vw / 2, m.vy + m.vh / 2);
      ctx.scale(scala, scala);
      ctx.translate(-centro.x * m.vw, -centro.y * m.vh);
      if (img) ctx.drawImage(img, 0, 0, m.vw, m.vh);
      else sitoFinto(ctx, 0, 0, m.vw, m.vh, tema, false);
      ctx.restore();
      contornoPop(ctx, s, m.x, m.y, m.w, m.h, m.barra * 0.45);
      ctx.restore();
    });

    if (!st.n) return;
    const a = st.passi[st.k];
    const pa = aSchermo(a.x, a.y);
    const pc = aSchermo(st.pos.x, st.pos.y);

    if (st.click > 0) {
      const pr = facile.fuori(limita(st.click));
      const r = (3 + 2.5 * pr) * u;
      ctx.save();
      ctx.globalAlpha *= (1 - limita(st.click)) * 0.9;
      ctx.beginPath();
      ctx.arc(pa.x, pa.y, r, 0, Math.PI * 2);
      ctx.fillStyle = rgba(tema.accento, 0.4);
      ctx.fill();
      ctx.restore();
      const pulsa = 1 + 0.08 * Math.sin(t * 6);
      conAlfa(ctx, limita(st.click * 2), () => {
        ctx.beginPath();
        ctx.arc(pa.x, pa.y, 2.6 * u * pulsa, 0, Math.PI * 2);
        ctx.lineWidth = 0.5 * u;
        ctx.strokeStyle = tema.stile === "pop" ? tema.bordo : tema.accento;
        ctx.stroke();
      });
    }

    const pf = facile.fuori(fase(st.q, 0.45, 0.2));
    if (t >= INIZIO_TUTORIAL && pf > 0 && (a.testo || "").trim()) {
      const larghMax = s.verticale ? W * 0.7 : Math.min(W * 0.34, 70 * u);
      const dim = (s.verticale ? 3.8 : 3.4) * u;
      ctx.font = font(tema, dim, 600);
      const righe = aCapo(ctx, a.testo, larghMax - 9 * u).slice(0, 4);
      const tw = Math.max(...righe.map((r) => ctx.measureText(r).width));
      const bw = tw + 10.5 * u;
      const bh = righe.length * dim * 1.3 + 3.6 * u;
      let bx = pa.x + 3.5 * u;
      let by = pa.y + 3.5 * u;
      if (bx + bw > W - 2 * u) bx = pa.x - 3.5 * u - bw;
      if (by + bh > H - 2 * u) by = pa.y - 3.5 * u - bh;
      bx = limita(bx, 2 * u, W - 2 * u - bw);
      by = limita(by, 2 * u, H - 2 * u - bh);
      conAlfa(ctx, pf, () => {
        ctx.save();
        const ox = bx + (pa.x > bx ? bw : 0);
        const oy = by + (pa.y > by ? bh : 0);
        ctx.translate(ox, oy);
        ctx.scale(0.85 + 0.15 * pf, 0.85 + 0.15 * pf);
        ctx.translate(-ox, -oy);
        const pop = tema.stile === "pop";
        if (pop) {
          ctx.fillStyle = tema.bordo;
          rettangoloTondo(ctx, bx + 0.8 * u, by + 0.8 * u, bw, bh, 1.2 * u);
          ctx.fill();
        } else ombra(ctx, u, 0.8);
        ctx.fillStyle = "#ffffff";
        rettangoloTondo(ctx, bx, by, bw, bh, pop ? 1.2 * u : 1.6 * u);
        ctx.fill();
        senzaOmbra(ctx);
        if (pop) {
          ctx.lineWidth = 0.35 * u;
          ctx.strokeStyle = tema.bordo;
          ctx.stroke();
        }
        ctx.fillStyle = tema.accento;
        const nr = 2.2 * u;
        ctx.beginPath();
        ctx.arc(bx + 1.8 * u + nr, by + bh / 2, nr, 0, Math.PI * 2);
        ctx.fill();
        if (pop) {
          ctx.lineWidth = 0.25 * u;
          ctx.stroke();
        }
        ctx.fillStyle = testoSopra(tema.accento);
        ctx.font = font(tema, 2.4 * u, 800);
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(st.k + 1), bx + 1.8 * u + nr, by + bh / 2 + 0.1 * u);
        ctx.fillStyle = "#151a2c";
        ctx.font = font(tema, dim, 600);
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        righe.forEach((r, i) => ctx.fillText(r, bx + 8.4 * u, by + 1.8 * u + i * dim * 1.3 + dim * 0.08));
        ctx.restore();
      });
    }

    const premuto = st.click > 0 && st.click < 0.5 ? Math.sin(limita(st.click * 2) * Math.PI) : 0;
    conAlfa(ctx, fase(t, 0.2, 0.4), () => cursore(ctx, pc.x, pc.y, (s.verticale ? 5 : 4.2) * u, premuto));
  };

  function formattaNumero(v, decimali) {
    return Number(v).toLocaleString("it-IT", { minimumFractionDigits: decimali, maximumFractionDigits: decimali });
  }

  SCENE.numeri = function (ctx, sc, s) {
    const { W, H, u, t, tema } = s;
    const valori = (sc.valori || []).filter((v) => v && String(v.valore).trim() !== "").slice(0, 4);
    const tit = (sc.titolo || "").trim() ? adatta(ctx, tema, sc.titolo, W * 0.84, H * 0.18, 9 * u, 3.4 * u, "T", 1.05) : null;
    const colonna = s.verticale || (valori.length > 2 && W < H * 1.2);
    const n = Math.max(1, valori.length);
    const gap = 3 * u;
    let cw;
    let ch;
    if (colonna && s.verticale) {
      cw = W * 0.8;
      ch = Math.min(26 * u, (H * 0.68 - gap * (n - 1)) / n);
    } else if (colonna) {
      cw = (W * 0.84 - gap) / 2;
      ch = Math.min(30 * u, (H * 0.62 - gap) / 2);
    } else {
      cw = Math.min(58 * u, (W * 0.88 - gap * (n - 1)) / n);
      ch = 40 * u;
    }
    const perRiga = colonna && !s.verticale ? 2 : colonna ? 1 : n;
    const righe = Math.ceil(n / perRiga);
    const altGriglia = righe * ch + (righe - 1) * gap;
    const totale = (tit ? tit.altezza + 6 * u : 0) + altGriglia;
    let y = (H - totale) / 2;
    if (tit) {
      const yt = y;
      elemento(ctx, s, "titolo", "Titolo", boxBlocco(tit, W / 2, yt, "center"), (r) => {
        scriviBlocco(ctx, tema, tit, W / 2, yt, r.colore || tema.testo, "center", { s, inizio: 0 });
      }, { campo: "titolo" });
      y += tit.altezza + 6 * u;
    }
    valori.forEach((v, i) => {
      const rr = Math.floor(i / perRiga);
      const c = i % perRiga;
      const inRiga = Math.min(perRiga, n - rr * perRiga);
      const rigaW = inRiga * cw + (inRiga - 1) * gap;
      const x = (W - rigaW) / 2 + c * (cw + gap);
      const yy = y + rr * (ch + gap);
      elemento(ctx, s, `numero${i}`, `Numero ${i + 1}`, { x, y: yy, w: cw, h: ch }, (r) => {
        const inizio = 0.3 + i * 0.2;
        const p = facile.fuori(fase(t, inizio, 0.6));
        const conta = facile.fuori(fase(t, inizio + 0.1, 1.5));
        const numero = parseFloat(String(v.valore).replace(",", "."));
        const decimali = (String(v.valore).split(/[.,]/)[1] || "").length;
        const mostra = isFinite(numero) ? formattaNumero(numero * conta, decimali) : String(v.valore);
        conAlfa(ctx, p, () => {
          ctx.save();
          ctx.translate(0, (1 - p) * 5 * u);
          riquadro(ctx, s, x, yy, cw, ch, 2.4 * u);
          const testo = `${v.prefisso || ""}${mostra}${v.suffisso || ""}`;
          const finale = `${v.prefisso || ""}${isFinite(numero) ? formattaNumero(numero, decimali) : v.valore}${v.suffisso || ""}`;
          let dim = Math.min(ch * 0.42, 16 * u);
          ctx.font = font(tema, dim, "T");
          while (ctx.measureText(finale).width > cw * 0.84 && dim > 3 * u) {
            dim *= 0.93;
            ctx.font = font(tema, dim, "T");
          }
          const pop = tema.stile === "pop";
          ctx.fillStyle = r.colore || (pop ? tema.testoScheda : tema.accento);
          ctx.textAlign = "center";
          ctx.textBaseline = "alphabetic";
          const etich = (v.etichetta || "").trim();
          const ny = etich ? yy + ch * 0.52 : yy + ch / 2 + dim * 0.36;
          ctx.fillText(testo, x + cw / 2, ny);
          if (etich) {
            const b = adatta(ctx, tema, etich, cw * 0.86, ch * 0.3, 4 * u, 1.8 * u, 600, 1.2);
            scriviBlocco(ctx, tema, b, x + cw / 2, ny + ch * 0.1, pop ? tema.testoScheda : tema.tenue, "center");
          }
          ctx.restore();
        });
      }, { campo: "valori" });
    });
  };

  SCENE.citazione = function (ctx, sc, s) {
    const { W, H, u, t, tema } = s;
    const larg = W * (s.verticale ? 0.84 : 0.7);
    const corsivo = tema.famiglia.includes("Fraunces");
    const testo = adatta(ctx, tema, `${sc.testo || ""}`, larg, H * 0.42, 6.6 * u, 2.8 * u, 600, 1.3, corsivo);
    const stelle = limita(Math.round(Number(sc.stelle) || 0), 0, 5);
    const virgH = 14 * u;
    const stelleH = stelle ? 6 * u : 0;
    const autore = (sc.autore || "").trim();
    const ruolo = (sc.ruolo || "").trim();
    const autH = (autore ? 5 * u : 0) + (ruolo ? 3.6 * u : 0);
    const tot = virgH + stelleH + testo.altezza + 5 * u + autH;
    let y = (H - tot) / 2;
    const cx = W / 2;
    const yv = y;
    elemento(ctx, s, "virgolette", "Virgolette", { x: cx - 7 * u, y: yv, w: 14 * u, h: virgH }, (r) => {
      const pv = facile.molla(fase(t, 0, 0.7));
      conAlfa(ctx, fase(t, 0, 0.3), () => {
        ctx.save();
        ctx.font = `800 ${Math.max(1, Math.round(24 * u * pv))}px "SV Fraunces", Georgia, serif`;
        ctx.fillStyle = r.colore || tema.accento;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText("“", cx, yv - 2 * u);
        ctx.restore();
      });
    });
    y += virgH;
    if (stelle) {
      const ys = y;
      elemento(ctx, s, "stelle", "Stelle", { x: cx - stelle * 2.7 * u, y: ys, w: stelle * 5.4 * u, h: 4.4 * u }, (r) => {
        for (let i = 0; i < stelle; i++) {
          const p = facile.molla(fase(t, 0.3 + i * 0.12, 0.45));
          if (p <= 0) continue;
          stella(ctx, cx + (i - (stelle - 1) / 2) * 5.4 * u, ys + 2 * u, 2.2 * u * p, r.colore || (tema.stile === "pop" ? tema.accento : "#ffc23d"), tema.stile === "pop" ? tema.bordo : null);
        }
      });
      y += stelleH;
    }
    const yt = y;
    elemento(ctx, s, "testo", "Recensione", boxBlocco(testo, cx, yt, "center"), (r) => {
      scriviBlocco(ctx, tema, testo, cx, yt, r.colore || tema.testo, "center", { s, inizio: 0.35 });
    }, { campo: "testo" });
    y += testo.altezza + 5 * u;
    if (autore || ruolo) {
      ctx.font = font(tema, 3.8 * u, 800);
      const wa = Math.max(ctx.measureText(autore).width, 30 * u);
      const ya = y;
      elemento(ctx, s, "autore", "Autore", { x: cx - wa / 2, y: ya, w: wa, h: autH }, (r) => {
        const pa = facile.fuori(fase(t, 0.8, 0.6));
        conAlfa(ctx, pa, () => {
          let yy = ya;
          ctx.textAlign = "center";
          ctx.textBaseline = "top";
          if (autore) {
            ctx.font = font(tema, 3.8 * u, 800);
            ctx.fillStyle = r.colore || tema.testo;
            ctx.fillText(autore, cx, yy);
            yy += 5 * u;
          }
          if (ruolo) {
            ctx.font = font(tema, 3 * u, 500);
            ctx.fillStyle = tema.tenue;
            ctx.fillText(ruolo, cx, yy);
          }
        });
      }, { campo: "autore" });
    }
  };

  SCENE.cta = function (ctx, sc, s) {
    const { W, H, u, t, tema } = s;
    const larg = W * (s.verticale ? 0.86 : 0.78);
    const logo = s.img(sc.logo || (s.progetto.marchio && s.progetto.marchio.logo));
    const dimLogo = (s.verticale ? 16 : 13) * u;
    const tit = adatta(ctx, tema, sc.titolo || "", larg, H * 0.34, (s.verticale ? 13 : 14) * u, 3.6 * u, "T", 1.04);
    const testoPuls = (sc.pulsante || "").trim();
    const dimP = (s.verticale ? 5 : 4.6) * u;
    ctx.font = font(tema, dimP, 800);
    const pw = testoPuls ? ctx.measureText(testoPuls).width + dimP * 3.2 : 0;
    const ph = testoPuls ? dimP * 2.6 : 0;
    const url = (sc.url || (s.progetto.marchio && s.progetto.marchio.url) || "").replace(/^https?:\/\//, "").replace(/\/$/, "");
    const gap = 4 * u;
    let tot = tit.altezza;
    if (logo) tot += dimLogo + gap;
    if (ph) tot += ph + gap;
    if (url) tot += 4.4 * u + gap;
    let y = (H - tot) / 2;
    const cx = W / 2;
    if (logo) {
      bloccoLogo(ctx, s, logo, cx, y, dimLogo, 0);
      y += dimLogo + gap;
    }
    const yt = y;
    elemento(ctx, s, "titolo", "Titolo", boxBlocco(tit, cx, yt, "center"), (r) => {
      scriviBlocco(ctx, tema, tit, cx, yt, r.colore || tema.testo, "center", { s, inizio: 0.1 });
    }, { campo: "titolo" });
    y += tit.altezza + gap;
    let bersaglio = null;
    if (ph) {
      const py = y;
      const boxP = { x: cx - pw / 2, y: py, w: pw, h: ph };
      elemento(ctx, s, "pulsante", "Pulsante", boxP, (r) => {
        const p = facile.molla(fase(t, 0.5, 0.6));
        const clic = fase(t, 1.75, 0.35);
        const premi = clic > 0 && clic < 1 ? Math.sin(clic * Math.PI) : 0;
        const pulsa = 1 + 0.035 * Math.sin(Math.max(0, t - 1.1) * 4.2) * fase(t, 1.1, 0.3) - 0.06 * premi;
        const colore = r.colore || tema.accento;
        conAlfa(ctx, fase(t, 0.5, 0.25), () => {
          ctx.save();
          ctx.translate(cx, py + ph / 2);
          ctx.scale(p * pulsa, p * pulsa);
          formaPulsante(ctx, s, pw, ph, colore);
          ctx.font = font(tema, dimP, 800);
          ctx.fillStyle = testoSopra(colore);
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(testoPuls, 0, dimP * 0.05);
          ctx.restore();
        });
        if (clic > 0) {
          conAlfa(ctx, (1 - clic) * 0.6, () => {
            ctx.strokeStyle = tema.stile === "pop" ? tema.bordo : colore;
            ctx.lineWidth = 0.6 * u;
            rettangoloTondo(ctx, cx - pw / 2 - clic * 3 * u, py - clic * 3 * u, pw + clic * 6 * u, ph + clic * 6 * u, ph);
            ctx.stroke();
          });
        }
      }, { campo: "pulsante" });
      bersaglio = puntoRegolato(s, "pulsante", boxP, cx + pw * 0.34, py + ph / 2 + ph * 0.22);
      y += ph + gap;
    }
    if (url) {
      ctx.font = font(tema, 4 * u, 600);
      const uw = ctx.measureText(url).width;
      const yu = y;
      elemento(ctx, s, "url", "Indirizzo", { x: cx - uw / 2, y: yu, w: uw, h: 4.4 * u }, (r) => {
        const p = facile.fuori(fase(t, 0.8, 0.6));
        conAlfa(ctx, p, () => {
          ctx.font = font(tema, 4 * u, 600);
          ctx.fillStyle = r.colore || tema.tenue;
          ctx.textAlign = "center";
          ctx.textBaseline = "top";
          ctx.fillText(url, cx, yu);
        });
      }, { campo: "url" });
    }
    const rp = (sc.regola && sc.regola.pulsante) || {};
    if (bersaglio && sc.clic !== false && !rp.nascosto) {
      const arrivo = facile.dentroFuori(fase(t, 1.0, 0.75));
      const premuto = Math.sin(fase(t, 1.75, 0.3) * Math.PI);
      const da = { x: W * 0.8, y: H * 0.95 };
      conAlfa(ctx, fase(t, 0.9, 0.3), () =>
        cursore(ctx, mescola(da.x, bersaglio.x, arrivo), mescola(da.y, bersaglio.y, arrivo), (s.verticale ? 5.5 : 4.5) * u, premuto),
      );
    }
  };

  // ------------------------------------------------------------ fotogramma

  // Cornice dello stile sopra il contenuto (filetti editoriali, mirini tecnici).
  // Restituisce true se mostra già il nome del marchio.
  function cornice(ctx, progetto, s, indice, totale, tAssoluto) {
    const { W, H, u, tema } = s;
    const nome = ((progetto.marchio && progetto.marchio.nome) || "").trim();
    if (tema.stile === "editoriale") {
      const m = 5 * u;
      ctx.fillStyle = tema.bordo;
      ctx.fillRect(m, m + 3.2 * u, W - 2 * m, Math.max(1, 0.14 * u));
      ctx.fillRect(m, H - m, W - 2 * m, Math.max(1, 0.14 * u));
      ctx.font = font(tema, 2.2 * u, 600);
      ctx.fillStyle = tema.testo;
      ctx.textBaseline = "alphabetic";
      ctx.textAlign = "left";
      ctx.fillText(nome.toUpperCase(), m, m + 2.4 * u);
      ctx.textAlign = "right";
      ctx.fillText(`${String(indice + 1).padStart(2, "0")} / ${String(totale).padStart(2, "0")}`, W - m, m + 2.4 * u);
      return true;
    }
    if (tema.stile === "griglia") {
      angoli(ctx, 3 * u, 3 * u, W - 6 * u, H - 6 * u, 4 * u, tema.accento, 0.35 * u);
      const sec = Math.floor(tAssoluto);
      const fr = Math.floor((tAssoluto % 1) * 30);
      const codice = `00:${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}:${String(fr).padStart(2, "0")}`;
      ctx.font = `700 ${Math.round(2 * u)}px "SV Space", monospace`;
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillStyle = rgba(tema.testo, 0.75);
      ctx.fillText(codice, W - 6 * u, 6 * u);
      if (Math.floor(tAssoluto * 2) % 2 === 0) {
        ctx.beginPath();
        ctx.arc(W - 6 * u - ctx.measureText(codice).width - 2 * u, 6 * u, 0.7 * u, 0, Math.PI * 2);
        ctx.fillStyle = tema.accento;
        ctx.fill();
      }
    }
    return false;
  }

  function marchio(ctx, progetto, s, alfa) {
    const m = progetto.marchio || {};
    const nome = (m.nome || "").trim();
    const logo = s.img(m.logo);
    if (!nome && !logo) return;
    const { u, tema } = s;
    const dim = 4.2 * u;
    const x = 3.2 * u;
    const y = s.H - 3.2 * u - dim;
    conAlfa(ctx, alfa * 0.9, () => {
      let xx = x;
      if (logo) {
        disegnaContenuto(ctx, logo, xx, y, dim, dim);
        xx += dim + 1.2 * u;
      }
      if (nome) {
        ctx.font = font(tema, 2.4 * u, 800);
        ctx.fillStyle = tema.testo;
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(nome, xx, y + dim / 2);
      }
    });
  }

  function contesto(ctx, progetto, risorse, voce, t, tema, opzioni) {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;
    const sc = voce.scena;
    const scelta = sc.animazione && sc.animazione !== "auto" ? sc.animazione
      : progetto.animazione && progetto.animazione !== "auto" ? progetto.animazione
        : ANIMAZIONE_DI_STILE[tema.stile];
    return {
      W, H,
      u: Math.min(W, H) / 100,
      verticale: H > W * 1.1,
      t: t - voce.inizio,
      d: voce.durata,
      tema,
      progetto,
      sc,
      animazione: ANIMAZIONI[scelta] && scelta !== "auto" ? scelta : "sali",
      img: (src) => (src && risorse ? risorse.get(src) || null : null),
      modifica: Boolean(opzioni && opzioni.modifica),
      elementi: opzioni && opzioni.registra ? [] : null,
    };
  }

  /**
   * Disegna il fotogramma all'istante t (secondi) sul contesto 2D.
   * opzioni.registra = true → restituisce gli elementi disegnati con i loro riquadri.
   * opzioni.modifica = true → posa ferma per piazzare i passi del tutorial.
   */
  function disegna(ctx, progetto, risorse, t, opzioni) {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;
    const tema = temaDi(progetto);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    sfondo(ctx, W, H, tema, t);
    const voce = scenaA(progetto, t);
    if (!voce) {
      ctx.restore();
      return [];
    }
    const s = contesto(ctx, progetto, risorse, voce, t, tema, opzioni);
    const fn = SCENE[voce.scena.tipo];
    const ultima = voce.indice === progetto.scene.length - 1;
    // uscita: l'ultima scena resta ferma fino alla fine (niente nero finale)
    const pu = ultima ? 0 : facile.dentro(fase(s.t, s.d - USCITA, USCITA));
    sfondoScena(ctx, s, voce.scena, (voce.indice === 0 ? 1 : fase(s.t, 0, 0.35)) * (1 - pu));
    ctx.save();
    ctx.globalAlpha = 1 - pu;
    const stile = progetto.transizione || "dissolvenza";
    if (pu > 0 && stile === "scorrimento") ctx.translate(-pu * W * 0.12, 0);
    if (pu > 0 && stile === "zoom") {
      const k = 1 + 0.12 * pu;
      ctx.translate(W / 2, H / 2);
      ctx.scale(k, k);
      ctx.translate(-W / 2, -H / 2);
    }
    if (pu > 0 && stile === "dissolvenza") ctx.translate(0, -pu * 2 * s.u);
    if (fn) fn(ctx, voce.scena, s);
    ctx.restore();
    const conNome = cornice(ctx, progetto, s, voce.indice, progetto.scene.length, t);
    const tipo = voce.scena.tipo;
    if (!conNome && tipo !== "titolo" && tipo !== "cta") {
      marchio(ctx, progetto, s, Math.min(fase(s.t, 0.2, 0.5), 1 - pu));
    }
    ctx.restore();
    return s.elementi || [];
  }

  Object.assign(SV, {
    FORMATI, TEMI, STILI, CARATTERI, TRANSIZIONI, ANIMAZIONI, SCENE,
    temaDi, dimensioni, tempi, durataTotale, scenaA,
    sorgentiImmagini, caricaRisorse, caricaFont, disegna,
    geometriaTutorial, statoTutorial,
    utili: { limita, fase, facile, rgba, testoSopra },
  });
})(typeof window !== "undefined" ? window : globalThis);
