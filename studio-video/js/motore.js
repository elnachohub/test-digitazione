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
 * Nessuna dipendenza: si appoggia solo alle API standard del Canvas 2D.
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

  // "scheda" = colore delle schede e dei riquadri sopra lo sfondo.
  const TEMI = {
    notte: { nome: "Notte", sfondo1: "#0b1020", sfondo2: "#1d2a5c", accento: "#7b93ff", testo: "#ffffff", tenue: "#b8c2e8", scheda: "rgba(255,255,255,0.08)", bordo: "rgba(255,255,255,0.14)" },
    tramonto: { nome: "Tramonto", sfondo1: "#2a0f3d", sfondo2: "#a8324a", accento: "#ffc35a", testo: "#ffffff", tenue: "#f4cdd6", scheda: "rgba(255,255,255,0.10)", bordo: "rgba(255,255,255,0.18)" },
    carbone: { nome: "Carbone", sfondo1: "#0d0d0d", sfondo2: "#262626", accento: "#f5c518", testo: "#ffffff", tenue: "#bdbdbd", scheda: "rgba(255,255,255,0.07)", bordo: "rgba(255,255,255,0.13)" },
    oceano: { nome: "Oceano", sfondo1: "#022c43", sfondo2: "#055c6b", accento: "#3ee6c1", testo: "#ffffff", tenue: "#b5e3ea", scheda: "rgba(255,255,255,0.09)", bordo: "rgba(255,255,255,0.16)" },
    menta: { nome: "Menta (chiaro)", sfondo1: "#f0fff8", sfondo2: "#c4f1e2", accento: "#0e9f77", testo: "#0b2e24", tenue: "#3f6b5e", scheda: "rgba(255,255,255,0.75)", bordo: "rgba(11,46,36,0.10)" },
    corallo: { nome: "Corallo (chiaro)", sfondo1: "#fff6f1", sfondo2: "#ffd8c9", accento: "#ff5a36", testo: "#2b1712", tenue: "#7a5248", scheda: "rgba(255,255,255,0.78)", bordo: "rgba(43,23,18,0.10)" },
    carta: { nome: "Carta (chiaro)", sfondo1: "#fbfbfd", sfondo2: "#e6e9f2", accento: "#2f5bff", testo: "#121628", tenue: "#5a6178", scheda: "rgba(255,255,255,0.85)", bordo: "rgba(18,22,40,0.10)" },
  };

  const CARATTERI = {
    moderno: { nome: "Moderno", famiglia: '"Inter", "Segoe UI", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif', titoli: 800 },
    deciso: { nome: "Deciso", famiglia: '"Inter Display", "Inter", "Arial Black", "Segoe UI", system-ui, sans-serif', titoli: 900 },
    elegante: { nome: "Elegante", famiglia: 'Georgia, "DejaVu Serif", "Times New Roman", serif', titoli: 700 },
    tecnico: { nome: "Tecnico", famiglia: '"JetBrains Mono", "SFMono-Regular", Consolas, "DejaVu Sans Mono", monospace', titoli: 800 },
  };

  const TRANSIZIONI = {
    dissolvenza: "Dissolvenza",
    scorrimento: "Scorrimento",
    zoom: "Zoom",
  };

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
  // Testo leggibile sopra un colore pieno (es. il pulsante).
  const testoSopra = (colore) => (luminanza(colore) > 0.45 ? "#111111" : "#ffffff");

  // ------------------------------------------------------------- progetto

  function temaDi(progetto) {
    const base = TEMI[progetto.tema] || TEMI.notte;
    const tema = Object.assign({}, base);
    if (progetto.accento) tema.accento = progetto.accento;
    const car = CARATTERI[progetto.carattere] || CARATTERI.moderno;
    tema.famiglia = car.famiglia;
    tema.pesoTitoli = car.titoli;
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

  // Tutte le immagini che il progetto usa (logo, schermate, ...).
  function sorgentiImmagini(progetto) {
    const s = new Set();
    if (progetto.marchio && progetto.marchio.logo) s.add(progetto.marchio.logo);
    for (const sc of progetto.scene || []) {
      if (sc.immagine) s.add(sc.immagine);
      if (sc.logo) s.add(sc.logo);
    }
    return [...s];
  }

  // Carica le immagini e restituisce una Map sorgente -> immagine pronta.
  // `cache` permette all'editor di non ricaricare quelle già pronte.
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

  // ----------------------------------------------------------- disegno base

  function font(tema, dim, peso = 400, corsivo = false) {
    return `${corsivo ? "italic " : ""}${peso} ${Math.round(dim)}px ${tema.famiglia}`;
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

  // Trova la dimensione di carattere più grande che fa stare il testo nel riquadro.
  function adatta(ctx, tema, testo, larghezzaMax, altezzaMax, dimMax, dimMin, peso, interlinea = 1.15, corsivo = false) {
    let dim = dimMax;
    for (;;) {
      ctx.font = font(tema, dim, peso, corsivo);
      const righe = aCapo(ctx, testo, larghezzaMax);
      const larga = righe.some((r) => ctx.measureText(r).width > larghezzaMax);
      const alta = righe.length * dim * interlinea;
      if ((alta <= altezzaMax && !larga) || dim <= dimMin) {
        return { dim, righe, altezza: alta, interlinea, peso, corsivo };
      }
      dim = Math.max(dimMin, dim * 0.92);
    }
  }

  // Scrive un blocco già misurato con adatta(). allinea: left | center | right.
  function scriviBlocco(ctx, tema, blocco, x, y, colore, allinea = "left", animaRiga) {
    ctx.textAlign = allinea;
    ctx.textBaseline = "top";
    blocco.righe.forEach((riga, i) => {
      const yy = y + i * blocco.dim * blocco.interlinea;
      const disegnaRiga = () => {
        ctx.font = font(tema, blocco.dim, blocco.peso, blocco.corsivo);
        ctx.fillStyle = colore;
        ctx.fillText(riga, x, yy);
      };
      if (animaRiga) animaRiga(i, disegnaRiga);
      else disegnaRiga();
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

  // Sfondo continuo fra le scene: gradiente + tre luci che si muovono piano.
  function sfondo(ctx, W, H, tema, t) {
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, tema.sfondo1);
    g.addColorStop(1, tema.sfondo2);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    const M = Math.max(W, H);
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

  function stella(ctx, cx, cy, r, colore) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const rr = i % 2 === 0 ? r : r * 0.45;
      ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fillStyle = colore;
    ctx.fill();
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

  // Sito finto, usato quando la scena non ha ancora un'immagine:
  // così i modelli sono già presentabili prima di caricare le schermate.
  function sitoFinto(ctx, x, y, w, h, tema, telefono = false) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x, y, w, h);
    const k = telefono ? w / 40 : w / 100; // unità interna
    const grigio = "#e8ebf2";
    const scuro = "#c9cfdc";
    // intestazione
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
    // sezione principale
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
    // schede
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

  // Cornice del browser: restituisce l'area utile (viewport) per l'immagine.
  function misuraBrowser(bx, by, bw, bh, aspetto) {
    // aspetto = larghezza / altezza della viewport
    let w = bw;
    let barra = w * 0.045;
    let h = w / aspetto + barra;
    if (h > bh) {
      // si adatta in altezza: h = w/aspetto + 0.045w
      w = bh / (1 / aspetto + 0.045);
      barra = w * 0.045;
      h = bh;
    }
    const x = bx + (bw - w) / 2;
    const y = by + (bh - h) / 2;
    return { x, y, w, h, barra, vx: x, vy: y + barra, vw: w, vh: h - barra };
  }

  function disegnaBrowser(ctx, m, tema, u, indirizzo) {
    const r = m.barra * 0.45;
    ctx.save();
    ombra(ctx, u, 1.2);
    ctx.fillStyle = "#ffffff";
    rettangoloTondo(ctx, m.x, m.y, m.w, m.h, r);
    ctx.fill();
    senzaOmbra(ctx);
    // barra
    ctx.save();
    rettangoloTondo(ctx, m.x, m.y, m.w, m.h, r);
    ctx.clip();
    ctx.fillStyle = "#eef0f5";
    ctx.fillRect(m.x, m.y, m.w, m.barra);
    ctx.restore();
    const colori = ["#ff5f57", "#febc2e", "#28c840"];
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
    if (indirizzo) {
      ctx.font = `500 ${Math.round(m.barra * 0.3)}px ${tema.famiglia}`;
      ctx.fillStyle = "#5b6275";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      let testo = String(indirizzo).replace(/^https?:\/\//, "");
      while (testo.length > 3 && ctx.measureText("🔒 " + testo).width > aw - m.barra * 0.5) testo = testo.slice(0, -2);
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

  function disegnaTelefono(ctx, m, u) {
    ctx.save();
    ombra(ctx, u, 1.3);
    ctx.fillStyle = "#111318";
    rettangoloTondo(ctx, m.x, m.y, m.w, m.h, m.raggio);
    ctx.fill();
    senzaOmbra(ctx);
    ctx.strokeStyle = "#3a3f4b";
    ctx.lineWidth = Math.max(1, m.w * 0.006);
    rettangoloTondo(ctx, m.x, m.y, m.w, m.h, m.raggio);
    ctx.stroke();
    ctx.restore();
  }

  function isolaTelefono(ctx, m) {
    ctx.fillStyle = "#111318";
    const iw = m.w * 0.3;
    rettangoloTondo(ctx, m.x + (m.w - iw) / 2, m.vy + m.vh * 0.012, iw, m.vh * 0.032, m.vh * 0.016);
    ctx.fill();
  }

  // ---------------------------------------------------------------- scene

  const SCENE = {};

  // Titolo d'apertura: logo, etichetta, titolo grande, sottotitolo.
  SCENE.titolo = function (ctx, sc, s) {
    const { W, H, u, t, tema } = s;
    const larg = W * (s.verticale ? 0.86 : 0.78);
    const logo = s.img(sc.logo || (s.progetto.marchio && s.progetto.marchio.logo));
    const dimLogo = (s.verticale ? 22 : 17) * u;
    const tit = adatta(ctx, tema, sc.titolo || "", larg, H * 0.36, (s.verticale ? 13 : 14) * u, 4 * u, tema.pesoTitoli, 1.06);
    const sot = sc.sottotitolo ? adatta(ctx, tema, sc.sottotitolo, larg * 0.9, H * 0.2, (s.verticale ? 5.4 : 5) * u, 2.4 * u, 500, 1.3) : null;
    const etichettaH = sc.etichetta ? 6.4 * u : 0;
    const gap = 3.2 * u;
    let tot = tit.altezza + 4 * u; // linea d'accento
    if (logo) tot += dimLogo + gap;
    if (etichettaH) tot += etichettaH + gap;
    if (sot) tot += sot.altezza + gap;
    let y = (H - tot) / 2;
    const cx = W / 2;

    if (logo) {
      const p = facile.molla(fase(t, 0, 0.7));
      conAlfa(ctx, fase(t, 0, 0.3), () => {
        ctx.save();
        ctx.translate(cx, y + dimLogo / 2);
        ctx.scale(0.6 + 0.4 * p, 0.6 + 0.4 * p);
        disegnaContenuto(ctx, logo, -dimLogo / 2, -dimLogo / 2, dimLogo, dimLogo);
        ctx.restore();
      });
      y += dimLogo + gap;
    }
    if (etichettaH) {
      const p = facile.fuori(fase(t, 0.1, 0.6));
      ctx.font = font(tema, 3 * u, 700);
      const testo = String(sc.etichetta).toUpperCase();
      const tw = ctx.measureText(testo).width + 4 * u;
      conAlfa(ctx, p, () => {
        ctx.fillStyle = rgba(tema.accento, 0.18);
        rettangoloTondo(ctx, cx - tw / 2, y + (1 - p) * 2 * u, tw, etichettaH, etichettaH / 2);
        ctx.fill();
        ctx.fillStyle = tema.accento;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(testo, cx, y + etichettaH / 2 + (1 - p) * 2 * u);
      });
      y += etichettaH + gap;
    }
    scriviBlocco(ctx, tema, tit, cx, y, tema.testo, "center", (i, disegna) => {
      const p = facile.fuori(fase(t, 0.15 + i * 0.12, 0.75));
      conAlfa(ctx, p, () => {
        ctx.save();
        ctx.translate(0, (1 - p) * 5 * u);
        disegna();
        ctx.restore();
      });
    });
    y += tit.altezza + 1.6 * u;
    const pl = facile.fuori(fase(t, 0.55, 0.7));
    ctx.fillStyle = tema.accento;
    rettangoloTondo(ctx, cx - 9 * u * pl, y, 18 * u * pl, 0.9 * u, 0.45 * u);
    if (pl > 0) ctx.fill();
    y += 2.4 * u + gap;
    if (sot) {
      const p = facile.fuori(fase(t, 0.7, 0.7));
      conAlfa(ctx, p, () => {
        ctx.save();
        ctx.translate(0, (1 - p) * 3 * u);
        scriviBlocco(ctx, tema, sot, cx, y, tema.tenue, "center");
        ctx.restore();
      });
    }
  };

  // Elenco di punti di forza con spunte, uno dopo l'altro.
  SCENE.punti = function (ctx, sc, s) {
    const { W, H, u, t, d, tema } = s;
    const punti = (sc.punti || []).filter((p) => String(p).trim()).slice(0, 6);
    const larg = Math.min(W * 0.86, 140 * u);
    const x0 = (W - larg) / 2;
    const tit = adatta(ctx, tema, sc.titolo || "", larg, H * 0.2, (s.verticale ? 9 : 8.5) * u, 3.5 * u, tema.pesoTitoli, 1.1);
    const gap = 2.4 * u;
    const pad = 3 * u;
    const raggio = 3.2 * u;
    const testoW = larg - pad * 3 - raggio * 2;
    const spazio = H * 0.86 - tit.altezza - 6 * u;
    // dimensione comune per tutte le schede, la più grande che sta
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

    const pt = facile.fuori(fase(t, 0, 0.7));
    conAlfa(ctx, pt, () => {
      ctx.save();
      ctx.translate(0, (1 - pt) * 3 * u);
      scriviBlocco(ctx, tema, tit, W / 2, y, tema.testo, "center");
      ctx.restore();
    });
    y += tit.altezza + 6 * u;

    const sfasa = Math.min(0.55, Math.max(0.2, (d - 1.6) / Math.max(1, punti.length)));
    schede.forEach((righe, i) => {
      const h = altezze[i];
      const p = facile.fuori(fase(t, 0.45 + i * sfasa, 0.6));
      const pc = facile.molla(fase(t, 0.6 + i * sfasa, 0.5));
      const yy = y;
      conAlfa(ctx, p, () => {
        ctx.save();
        ctx.translate((1 - p) * 8 * u, 0);
        ctx.fillStyle = tema.scheda;
        rettangoloTondo(ctx, x0, yy, larg, h, 2 * u);
        ctx.fill();
        ctx.strokeStyle = tema.bordo;
        ctx.lineWidth = Math.max(1, 0.15 * u);
        ctx.stroke();
        const cx = x0 + pad + raggio;
        const cy = yy + h / 2;
        ctx.beginPath();
        ctx.arc(cx, cy, raggio * pc, 0, Math.PI * 2);
        ctx.fillStyle = tema.accento;
        ctx.fill();
        if (pc > 0.5) segnoSpunta(ctx, cx, cy, raggio * pc, testoSopra(tema.accento));
        ctx.font = font(tema, dim, 600);
        ctx.fillStyle = tema.testo;
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        const ty = yy + (h - righe.length * dim * 1.25) / 2 + dim * 0.1;
        righe.forEach((r, k) => ctx.fillText(r, cx + raggio + pad, ty + k * dim * 1.25));
        ctx.restore();
      });
      y += h + gap;
    });
  };

  // Schermata del sito dentro un browser o un telefono, con scorrimento.
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
      const tit = adatta(ctx, tema, sc.titolo || "", testoBox.w, testoBox.h * 0.55, (orizzontale ? 7.5 : 8) * u, 3.2 * u, tema.pesoTitoli, 1.1);
      const tes = (sc.testo || "").trim() ? adatta(ctx, tema, sc.testo, testoBox.w, testoBox.h * 0.42, 4.2 * u, 2.2 * u, 500, 1.35) : null;
      const tot = tit.altezza + (tes ? 2.6 * u + tes.altezza : 0);
      let y = testoBox.y + (testoBox.h - tot) / 2;
      const p1 = facile.fuori(fase(t, 0.1, 0.7));
      conAlfa(ctx, p1, () => {
        ctx.save();
        ctx.translate(orizzontale ? (p1 - 1) * 5 * u : 0, orizzontale ? 0 : (1 - p1) * 3 * u);
        scriviBlocco(ctx, tema, tit, tx, y, tema.testo, allinea);
        ctx.restore();
      });
      y += tit.altezza + 2.6 * u;
      if (tes) {
        const p2 = facile.fuori(fase(t, 0.35, 0.7));
        conAlfa(ctx, p2, () => {
          ctx.save();
          ctx.translate(orizzontale ? (p2 - 1) * 5 * u : 0, orizzontale ? 0 : (1 - p2) * 3 * u);
          scriviBlocco(ctx, tema, tes, tx, y, tema.tenue, allinea);
          ctx.restore();
        });
      }
    }

    const pe = facile.fuori(fase(t, 0.2, 0.9));
    const p = fase(t, 0.9, d - 1.8);
    conAlfa(ctx, fase(t, 0.2, 0.5), () => {
      ctx.save();
      const cx = box.x + box.w / 2;
      const cy = box.y + box.h / 2;
      ctx.translate(cx, cy + (1 - pe) * 6 * u);
      const sc0 = 0.92 + 0.08 * pe;
      ctx.scale(sc0, sc0);
      ctx.translate(-cx, -cy);
      const m = telefono ? misuraTelefono(box.x, box.y, box.w, box.h) : misuraBrowser(box.x, box.y, box.w, box.h, 16 / 10);
      if (telefono) disegnaTelefono(ctx, m, u);
      else disegnaBrowser(ctx, m, tema, u, sc.url || (s.progetto.marchio && s.progetto.marchio.url));
      ctx.save();
      if (telefono) rettangoloTondo(ctx, m.vx, m.vy, m.vw, m.vh, m.raggio * 0.8);
      else rettangoloTondo(ctx, m.vx, m.vy, m.vw, m.vh, m.barra * 0.45);
      ctx.clip();
      if (img) {
        const scala = m.vw / img.width;
        const ih = img.height * scala;
        if (sc.scorri && ih > m.vh * 1.05) {
          // pagina intera: scorre dall'alto verso il basso
          const dy = facile.dentroFuori(p) * (ih - m.vh);
          ctx.drawImage(img, m.vx, m.vy - dy, m.vw, ih);
        } else {
          // lieve zoom lento (effetto "Ken Burns")
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
      ctx.restore();
    });
  };

  // Geometria della scena tutorial: serve anche all'editor per piazzare i passi.
  function geometriaTutorial(W, H, u, sc, img) {
    const verticale = H > W * 1.1;
    const haTitolo = Boolean((sc.titolo || "").trim());
    const alto = haTitolo ? (verticale ? H * 0.16 : 12 * u) : 3 * u;
    const box = { x: 4 * u, y: alto + 1.5 * u, w: W - 8 * u, h: H - alto - 5 * u };
    const aspetto = img ? img.width / img.height : 16 / 10;
    const m = misuraBrowser(box.x, box.y, box.w, box.h, aspetto);
    const titolo = { x: 6 * u, y: 3 * u, w: W - 12 * u, h: alto - 3 * u };
    if (verticale) {
      // in verticale titolo e browser stanno insieme, al centro (niente vuoto in mezzo)
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

  // Tempi del tutorial: per ogni passo il cursore si sposta, clicca, appare il fumetto.
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
      click: t < INIZIO_TUTORIAL ? -1 : (q - 0.38) / 0.3, // 0..1 durante l'onda del clic
    };
  }

  SCENE.tutorial = function (ctx, sc, s) {
    const { W, H, u, d, tema } = s;
    let t = s.t;
    const img = s.img(sc.immagine);
    const g = geometriaTutorial(W, H, u, sc, img);
    const m = g.m;
    if (s.modifica) {
      // posa ferma per l'editor: tutto entrato, niente zoom né cursore,
      // così i clic sull'anteprima corrispondono ai punti dell'immagine
      s = Object.assign({}, s, { t: 99 });
      t = 99;
    }
    const st = s.modifica ? { n: 0 } : statoTutorial(sc, t, d);

    if ((sc.titolo || "").trim()) {
      const tit = adatta(ctx, tema, sc.titolo, g.titolo.w, g.titolo.h, (s.verticale ? 6.5 : 5.6) * u, 3 * u, tema.pesoTitoli, 1.1);
      const pt = facile.fuori(fase(t, 0, 0.6));
      conAlfa(ctx, pt, () => {
        scriviBlocco(ctx, tema, tit, W / 2, g.titolo.y + (g.titolo.h - tit.altezza) / 2 + (1 - pt) * 2 * u, tema.testo, "center");
      });
    }

    // telecamera: zoom verso il cursore se richiesto
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
      disegnaBrowser(ctx, m, tema, u, sc.url || (s.progetto.marchio && s.progetto.marchio.url));
      ctx.save();
      rettangoloTondo(ctx, m.vx, m.vy, m.vw, m.vh, m.barra * 0.45);
      ctx.clip();
      ctx.translate(m.vx + m.vw / 2, m.vy + m.vh / 2);
      ctx.scale(scala, scala);
      ctx.translate(-centro.x * m.vw, -centro.y * m.vh);
      if (img) ctx.drawImage(img, 0, 0, m.vw, m.vh);
      else sitoFinto(ctx, 0, 0, m.vw, m.vh, tema, false);
      ctx.restore();
      ctx.restore();
    });

    if (!st.n) return;
    const a = st.passi[st.k];
    const pa = aSchermo(a.x, a.y);
    const pc = aSchermo(st.pos.x, st.pos.y);

    // anello che evidenzia il punto cliccato
    if (st.click > 0) {
      const pr = facile.fuori(limita(st.click));
      const r = (3 + 2.5 * pr) * u;
      ctx.save();
      ctx.globalAlpha *= (1 - limita(st.click)) * 0.9;
      ctx.beginPath();
      ctx.arc(pa.x, pa.y, r, 0, Math.PI * 2);
      ctx.fillStyle = rgba(tema.accento, 0.35);
      ctx.fill();
      ctx.restore();
      const pulsa = 1 + 0.08 * Math.sin(t * 6);
      conAlfa(ctx, limita(st.click * 2), () => {
        ctx.beginPath();
        ctx.arc(pa.x, pa.y, 2.6 * u * pulsa, 0, Math.PI * 2);
        ctx.lineWidth = 0.5 * u;
        ctx.strokeStyle = tema.accento;
        ctx.stroke();
      });
    }

    // fumetto con il numero e la spiegazione del passo
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
        ombra(ctx, u, 0.8);
        ctx.fillStyle = "#ffffff";
        rettangoloTondo(ctx, bx, by, bw, bh, 1.6 * u);
        ctx.fill();
        senzaOmbra(ctx);
        ctx.fillStyle = tema.accento;
        rettangoloTondo(ctx, bx, by, 0.7 * u, bh, 0.35 * u);
        ctx.fill();
        const nr = 2.2 * u;
        ctx.beginPath();
        ctx.arc(bx + 1.8 * u + nr, by + bh / 2, nr, 0, Math.PI * 2);
        ctx.fill();
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

    // cursore sopra a tutto
    const premuto = st.click > 0 && st.click < 0.5 ? Math.sin(limita(st.click * 2) * Math.PI) : 0;
    conAlfa(ctx, fase(t, 0.2, 0.4), () => cursore(ctx, pc.x, pc.y, (s.verticale ? 5 : 4.2) * u, premuto));
  };

  function formattaNumero(v, decimali) {
    return Number(v).toLocaleString("it-IT", { minimumFractionDigits: decimali, maximumFractionDigits: decimali });
  }

  // Numeri che contano fino al valore: clienti, ore risparmiate, ecc.
  SCENE.numeri = function (ctx, sc, s) {
    const { W, H, u, t, tema } = s;
    const valori = (sc.valori || []).filter((v) => v && String(v.valore).trim() !== "").slice(0, 4);
    const tit = (sc.titolo || "").trim() ? adatta(ctx, tema, sc.titolo, W * 0.84, H * 0.18, (s.verticale ? 8.5 : 8.5) * u, 3.4 * u, tema.pesoTitoli, 1.1) : null;
    const colonna = s.verticale || (valori.length > 2 && W < H * 1.2);
    const n = Math.max(1, valori.length);
    const gap = 3 * u;
    let cw;
    let ch;
    if (colonna && s.verticale) {
      cw = W * 0.8;
      ch = Math.min(26 * u, (H * 0.68 - gap * (n - 1)) / n);
    } else if (colonna) {
      // quadrato con 3-4 numeri: griglia 2x2
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
      const pt = facile.fuori(fase(t, 0, 0.6));
      conAlfa(ctx, pt, () => scriviBlocco(ctx, tema, tit, W / 2, y + (1 - pt) * 3 * u, tema.testo, "center"));
      y += tit.altezza + 6 * u;
    }
    valori.forEach((v, i) => {
      const r = Math.floor(i / perRiga);
      const c = i % perRiga;
      const inRiga = Math.min(perRiga, n - r * perRiga);
      const rigaW = inRiga * cw + (inRiga - 1) * gap;
      const x = (W - rigaW) / 2 + c * (cw + gap);
      const yy = y + r * (ch + gap);
      const inizio = 0.3 + i * 0.2;
      const p = facile.fuori(fase(t, inizio, 0.6));
      const conta = facile.fuori(fase(t, inizio + 0.1, 1.5));
      const numero = parseFloat(String(v.valore).replace(",", "."));
      const decimali = (String(v.valore).split(/[.,]/)[1] || "").length;
      const mostra = isFinite(numero) ? formattaNumero(numero * conta, decimali) : String(v.valore);
      conAlfa(ctx, p, () => {
        ctx.save();
        ctx.translate(0, (1 - p) * 5 * u);
        ctx.fillStyle = tema.scheda;
        rettangoloTondo(ctx, x, yy, cw, ch, 2.4 * u);
        ctx.fill();
        ctx.strokeStyle = tema.bordo;
        ctx.lineWidth = Math.max(1, 0.15 * u);
        ctx.stroke();
        const testo = `${v.prefisso || ""}${mostra}${v.suffisso || ""}`;
        // il numero più grande che sta nella scheda (misurato sul valore finale)
        const finale = `${v.prefisso || ""}${isFinite(numero) ? formattaNumero(numero, decimali) : v.valore}${v.suffisso || ""}`;
        let dim = Math.min(ch * 0.42, 16 * u);
        ctx.font = font(tema, dim, tema.pesoTitoli);
        while (ctx.measureText(finale).width > cw * 0.86 && dim > 3 * u) {
          dim *= 0.93;
          ctx.font = font(tema, dim, tema.pesoTitoli);
        }
        ctx.fillStyle = tema.accento;
        ctx.textAlign = "center";
        ctx.textBaseline = "alphabetic";
        const etich = (v.etichetta || "").trim();
        const ny = etich ? yy + ch * 0.52 : yy + ch / 2 + dim * 0.36;
        ctx.fillText(testo, x + cw / 2, ny);
        if (etich) {
          const b = adatta(ctx, tema, etich, cw * 0.86, ch * 0.3, 4 * u, 1.8 * u, 600, 1.2);
          scriviBlocco(ctx, tema, b, x + cw / 2, ny + ch * 0.1, tema.tenue, "center");
        }
        ctx.restore();
      });
    });
  };

  // Recensione di un cliente con stelle.
  SCENE.citazione = function (ctx, sc, s) {
    const { W, H, u, t, tema } = s;
    const larg = W * (s.verticale ? 0.84 : 0.7);
    const testo = adatta(ctx, tema, `${sc.testo || ""}`, larg, H * 0.42, (s.verticale ? 6.6 : 6.6) * u, 2.8 * u, 600, 1.3, tema.famiglia.includes("serif") && !tema.famiglia.includes("sans"));
    const stelle = limita(Math.round(Number(sc.stelle) || 0), 0, 5);
    const virgH = 14 * u;
    const stelleH = stelle ? 6 * u : 0;
    const autore = (sc.autore || "").trim();
    const ruolo = (sc.ruolo || "").trim();
    const autH = (autore ? 5 * u : 0) + (ruolo ? 3.6 * u : 0);
    const tot = virgH + stelleH + testo.altezza + 5 * u + autH;
    let y = (H - tot) / 2;
    const cx = W / 2;
    const pv = facile.molla(fase(t, 0, 0.7));
    conAlfa(ctx, fase(t, 0, 0.3), () => {
      ctx.save();
      ctx.font = `900 ${Math.round(24 * u * pv)}px Georgia, serif`;
      ctx.fillStyle = tema.accento;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText("“", cx, y - 2 * u);
      ctx.restore();
    });
    y += virgH;
    if (stelle) {
      for (let i = 0; i < stelle; i++) {
        const p = facile.molla(fase(t, 0.3 + i * 0.12, 0.45));
        if (p <= 0) continue;
        stella(ctx, cx + (i - (stelle - 1) / 2) * 5.4 * u, y + 2 * u, 2.2 * u * p, "#ffc23d");
      }
      y += stelleH;
    }
    scriviBlocco(ctx, tema, testo, cx, y, tema.testo, "center", (i, disegna) => {
      const p = facile.fuori(fase(t, 0.35 + i * 0.1, 0.6));
      conAlfa(ctx, p, () => {
        ctx.save();
        ctx.translate(0, (1 - p) * 2.5 * u);
        disegna();
        ctx.restore();
      });
    });
    y += testo.altezza + 5 * u;
    const pa = facile.fuori(fase(t, 0.8, 0.6));
    conAlfa(ctx, pa, () => {
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      if (autore) {
        ctx.font = font(tema, 3.8 * u, 800);
        ctx.fillStyle = tema.testo;
        ctx.fillText(autore, cx, y);
        y += 5 * u;
      }
      if (ruolo) {
        ctx.font = font(tema, 3 * u, 500);
        ctx.fillStyle = tema.tenue;
        ctx.fillText(ruolo, cx, y);
      }
    });
  };

  // Chiusura: invito all'azione con pulsante, indirizzo e logo.
  SCENE.cta = function (ctx, sc, s) {
    const { W, H, u, t, tema } = s;
    const larg = W * (s.verticale ? 0.86 : 0.76);
    const logo = s.img(sc.logo || (s.progetto.marchio && s.progetto.marchio.logo));
    const dimLogo = (s.verticale ? 16 : 13) * u;
    const tit = adatta(ctx, tema, sc.titolo || "", larg, H * 0.32, (s.verticale ? 12 : 13) * u, 3.6 * u, tema.pesoTitoli, 1.06);
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
      const p = facile.molla(fase(t, 0, 0.6));
      conAlfa(ctx, fase(t, 0, 0.3), () => {
        ctx.save();
        ctx.translate(cx, y + dimLogo / 2);
        ctx.scale(0.6 + 0.4 * p, 0.6 + 0.4 * p);
        disegnaContenuto(ctx, logo, -dimLogo / 2, -dimLogo / 2, dimLogo, dimLogo);
        ctx.restore();
      });
      y += dimLogo + gap;
    }
    scriviBlocco(ctx, tema, tit, cx, y, tema.testo, "center", (i, disegna) => {
      const p = facile.fuori(fase(t, 0.1 + i * 0.1, 0.6));
      conAlfa(ctx, p, () => {
        ctx.save();
        const k = 0.9 + 0.1 * p;
        ctx.translate(cx, y);
        ctx.scale(k, k);
        ctx.translate(-cx, -y);
        disegna();
        ctx.restore();
      });
    });
    y += tit.altezza + gap;
    let centroPulsante = null;
    if (ph) {
      const p = facile.molla(fase(t, 0.5, 0.6));
      const clic = fase(t, 1.75, 0.35);
      const premi = clic > 0 && clic < 1 ? Math.sin(clic * Math.PI) : 0;
      const pulsa = 1 + 0.035 * Math.sin(Math.max(0, t - 1.1) * 4.2) * fase(t, 1.1, 0.3) - 0.06 * premi;
      const py = y;
      centroPulsante = { x: cx, y: py + ph / 2 };
      conAlfa(ctx, fase(t, 0.5, 0.25), () => {
        ctx.save();
        ctx.translate(cx, py + ph / 2);
        ctx.scale(p * pulsa, p * pulsa);
        ombra(ctx, u, 0.9);
        ctx.fillStyle = tema.accento;
        rettangoloTondo(ctx, -pw / 2, -ph / 2, pw, ph, ph / 2);
        ctx.fill();
        senzaOmbra(ctx);
        ctx.font = font(tema, dimP, 800);
        ctx.fillStyle = testoSopra(tema.accento);
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(testoPuls, 0, dimP * 0.05);
        ctx.restore();
      });
      if (clic > 0) {
        conAlfa(ctx, (1 - clic) * 0.6, () => {
          ctx.strokeStyle = tema.accento;
          ctx.lineWidth = 0.6 * u;
          rettangoloTondo(ctx, cx - pw / 2 - clic * 3 * u, py - clic * 3 * u, pw + clic * 6 * u, ph + clic * 6 * u, ph);
          ctx.stroke();
        });
      }
      y += ph + gap;
    }
    if (url) {
      const p = facile.fuori(fase(t, 0.8, 0.6));
      conAlfa(ctx, p, () => {
        ctx.font = font(tema, 4 * u, 600);
        ctx.fillStyle = tema.tenue;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText(url, cx, y);
      });
    }
    // il cursore arriva e clicca il pulsante
    if (centroPulsante && sc.clic !== false) {
      const arrivo = facile.dentroFuori(fase(t, 1.0, 0.75));
      const premuto = Math.sin(fase(t, 1.75, 0.3) * Math.PI);
      const da = { x: W * 0.8, y: H * 0.95 };
      const a = { x: centroPulsante.x + pw * 0.34, y: centroPulsante.y + ph * 0.22 };
      conAlfa(ctx, fase(t, 0.9, 0.3), () =>
        cursore(ctx, mescola(da.x, a.x, arrivo), mescola(da.y, a.y, arrivo), (s.verticale ? 5.5 : 4.5) * u, premuto),
      );
    }
  };

  // ------------------------------------------------------------ fotogramma

  // Marchio piccolo in angolo durante le scene centrali (non su apertura e chiusura).
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
    return {
      W, H,
      u: Math.min(W, H) / 100,
      verticale: H > W * 1.1,
      t: t - voce.inizio,
      d: voce.durata,
      tema,
      progetto,
      img: (src) => (src && risorse ? risorse.get(src) || null : null),
      modifica: Boolean(opzioni && opzioni.modifica),
    };
  }

  /**
   * Disegna il fotogramma all'istante t (secondi) sul contesto 2D.
   * Il canvas deve già avere le dimensioni del formato (vedi dimensioni()).
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
      return;
    }
    const s = contesto(ctx, progetto, risorse, voce, t, tema, opzioni);
    const fn = SCENE[voce.scena.tipo];
    const ultima = voce.indice === progetto.scene.length - 1;
    // uscita: l'ultima scena resta ferma fino alla fine (niente nero finale)
    const pu = ultima ? 0 : facile.dentro(fase(s.t, s.d - USCITA, USCITA));
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
    const tipo = voce.scena.tipo;
    if (tipo !== "titolo" && tipo !== "cta") {
      const entra = fase(s.t, 0.2, 0.5);
      marchio(ctx, progetto, s, Math.min(entra, 1 - pu));
    }
    ctx.restore();
  }

  Object.assign(SV, {
    FORMATI, TEMI, CARATTERI, TRANSIZIONI, SCENE,
    temaDi, dimensioni, tempi, durataTotale, scenaA,
    sorgentiImmagini, caricaRisorse, disegna,
    geometriaTutorial, statoTutorial,
    utili: { limita, fase, facile, rgba, testoSopra },
  });
})(typeof window !== "undefined" ? window : globalThis);
