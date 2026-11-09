#!/usr/bin/env node
/*
 * Esplora il sito di un cliente (attrezzo dell'esploratore della squadra video).
 *
 *   node render/cattura-sito.js https://sito.it [--uscita cartella] [--attesa 1500]
 *
 * Scrive nella cartella (predefinito: ./sito):
 *   computer-pagina.jpg   pagina intera a 1440 px (per la scena "schermata" con scorrimento)
 *   computer-schermo.jpg  solo il primo schermo 1440x900 (per la scena "tutorial")
 *   telefono-pagina.jpg   pagina intera da telefono (per il dispositivo "telefono")
 *   sito.json             testi, colori e punti cliccabili:
 *     titolo, descrizione, titoli (h1-h3), paragrafi, pulsanti, colori,
 *     cliccabili: [{ testo, x, y }] con x,y in frazioni di computer-schermo.jpg,
 *     pronti da usare come "passi" del tutorial.
 *   logo.png/.svg         l'icona più grande dichiarata dal sito, se c'è
 *   in sito.json anche: lingua della pagina e versioni = { en: url, de: url } trovate
 *   con <link hreflang> o con i selettori di lingua (/en/, "English", "DE").
 * Funziona anche con file locali: node render/cattura-sito.js ../index.html
 * Da altri script: const { catturaSito } = require("./cattura-sito.js").
 */
"use strict";

const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");

function argomenti(argv) {
  const o = { url: null, uscita: "sito", attesa: 1500 };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--uscita") o.uscita = argv[++i];
    else if (argv[i] === "--attesa") o.attesa = Number(argv[++i]) || 0;
    else if (!argv[i].startsWith("--")) o.url = argv[i];
  }
  if (o.url && !/^(https?|file):/i.test(o.url)) {
    o.url = fs.existsSync(o.url) ? pathToFileURL(path.resolve(o.url)).href : `https://${o.url}`;
  }
  return o;
}

// Raccoglie testi, colori e posizioni degli elementi cliccabili (gira nella pagina).
function leggiPagina() {
  const pulito = (t) => (t || "").replace(/\s+/g, " ").trim();
  const visibile = (e) => {
    const r = e.getBoundingClientRect();
    const st = getComputedStyle(e);
    return r.width > 4 && r.height > 4 && st.visibility !== "hidden" && st.display !== "none" && Number(st.opacity) > 0.05;
  };
  const testi = (sel, max) => [...document.querySelectorAll(sel)].filter(visibile).map((e) => pulito(e.innerText)).filter((t) => t && t.length < 300).slice(0, max);
  const meta = (n) => (document.querySelector(`meta[name="${n}"], meta[property="${n}"]`) || {}).content || "";
  const W = innerWidth;
  const H = innerHeight;
  const cliccabili = [...document.querySelectorAll("a, button, input, select, textarea, [role=button], [onclick]")]
    .filter(visibile)
    .map((e) => {
      const r = e.getBoundingClientRect();
      return { testo: pulito(e.innerText || e.value || e.placeholder || e.getAttribute("aria-label") || e.title).slice(0, 60), tipo: e.tagName.toLowerCase(), x: (r.left + r.width / 2) / W, y: (r.top + r.height / 2) / H };
    })
    .filter((c) => c.x >= 0 && c.x <= 1 && c.y >= 0 && c.y <= 1)
    .map((c) => ({ ...c, x: Math.round(c.x * 1000) / 1000, y: Math.round(c.y * 1000) / 1000 }))
    .slice(0, 40);
  // colori più usati per sfondi pieni di pulsanti e intestazioni: candidati per l'accento
  const conta = new Map();
  for (const e of document.querySelectorAll("a, button, header, nav, [class*=btn], [class*=button], [class*=bott], [class*=cta], h1, h2")) {
    if (!visibile(e)) continue;
    const st = getComputedStyle(e);
    for (const c of [st.backgroundColor, st.color]) {
      const m = /rgba?\((\d+), (\d+), (\d+)(?:, ([\d.]+))?\)/.exec(c);
      if (!m || (m[4] !== undefined && Number(m[4]) < 0.5)) continue;
      const [r, g, b] = [m[1], m[2], m[3]].map(Number);
      const grigio = Math.max(r, g, b) - Math.min(r, g, b) < 24;
      if (grigio) continue;
      const hex = "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
      conta.set(hex, (conta.get(hex) || 0) + 1);
    }
  }
  const sfondo = getComputedStyle(document.body).backgroundColor;
  // versioni del sito in altre lingue: <link hreflang>, poi selettori di lingua (/en/, "English", "DE"...)
  const assoluto = (h) => {
    try {
      return new URL(h, location.href).href;
    } catch (e) {
      return "";
    }
  };
  const versioni = {};
  for (const l of document.querySelectorAll('link[rel="alternate"][hreflang]')) {
    const lg = l.getAttribute("hreflang").slice(0, 2).toLowerCase();
    if (/^[a-z]{2}$/.test(lg) && !versioni[lg]) versioni[lg] = assoluto(l.getAttribute("href"));
  }
  const NOMI = { it: /^(it|ita|italiano)$/i, en: /^(en|eng|english)$/i, es: /^(es|esp|español|espanol)$/i, fr: /^(fr|fra|français|francais)$/i, de: /^(de|deu|deutsch)$/i, pt: /^(pt|por|português|portugues)$/i, nl: /^(nl|nederlands)$/i, pl: /^(pl|polski)$/i };
  for (const a of document.querySelectorAll("a[href]")) {
    const h = a.getAttribute("hreflang");
    const testo = pulito(a.innerText || a.getAttribute("aria-label") || a.title);
    let lg = h ? h.slice(0, 2).toLowerCase() : Object.keys(NOMI).find((k) => NOMI[k].test(testo));
    if (!lg) {
      const m = /^\/(it|en|es|fr|de|pt|nl|pl)(\/|$)/.exec(new URL(assoluto(a.getAttribute("href")) || location.href).pathname);
      if (m && testo.length <= 12) lg = m[1];
    }
    if (lg && /^[a-z]{2}$/.test(lg) && !versioni[lg]) versioni[lg] = assoluto(a.getAttribute("href"));
  }
  const icone = [...document.querySelectorAll('link[rel~="apple-touch-icon"], link[rel~="icon"]')]
    .map((l) => ({ href: assoluto(l.getAttribute("href")), lato: parseInt((l.getAttribute("sizes") || "0").split("x")[0], 10) || (/apple/.test(l.rel) ? 180 : /svg/.test(l.type || l.href) ? 512 : 32) }))
    .sort((x, y) => y.lato - x.lato);
  return {
    lingua: (document.documentElement.lang || "").slice(0, 2).toLowerCase(),
    versioni,
    icona: icone.length ? icone[0].href : assoluto("/favicon.ico"),
    indirizzo: location.href,
    titolo: document.title,
    descrizione: meta("description") || meta("og:description"),
    titoli: testi("h1, h2, h3", 25),
    paragrafi: testi("p, li", 30),
    pulsanti: testi("button, a[class*=btn], a[class*=button], a[class*=bott], a[class*=puls], a[class*=cta], a[class*=knop], a[class*=bouton], a[class*=boton], [role=button], input[type=submit]", 15),
    colori: { sfondoPagina: sfondo, accentiCandidati: [...conta.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([c]) => c) },
    cliccabili,
  };
}

/**
 * Cattura un sito nella cartella: tre JPG, logo (se trovato) e sito.json.
 * `browser` facoltativo (riuso tra più catture). Restituisce i dati di sito.json.
 */
async function catturaSito(url, cartella, opzioni = {}) {
  const { chromium, devices } = require("playwright");
  const attesa = opzioni.attesa == null ? 1500 : opzioni.attesa;
  fs.mkdirSync(cartella, { recursive: true });
  const proprio = !opzioni.browser;
  const browser = opzioni.browser || (await chromium.launch());
  const vai = async (pagina) => {
    await pagina.goto(url, { waitUntil: "load", timeout: 45000 });
    await pagina.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
    await pagina.waitForTimeout(attesa);
  };
  try {
    const computer = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await vai(computer);
    const dati = await computer.evaluate(leggiPagina);
    await computer.screenshot({ path: path.join(cartella, "computer-schermo.jpg"), type: "jpeg", quality: 88 });
    const altezza = await computer.evaluate(() => document.documentElement.scrollHeight);
    await computer.screenshot({ path: path.join(cartella, "computer-pagina.jpg"), type: "jpeg", quality: 85, fullPage: true, clip: altezza > 9000 ? { x: 0, y: 0, width: 1440, height: 9000 } : undefined });
    dati.file = { computerPagina: "computer-pagina.jpg", computerSchermo: "computer-schermo.jpg", telefonoPagina: "telefono-pagina.jpg" };
    // logo: l'icona più grande dichiarata dal sito (PNG, JPG o SVG)
    if (dati.icona) {
      const r = await computer.request.get(dati.icona, { timeout: 10000 }).catch(() => null);
      const tipo = r && r.ok() ? (r.headers()["content-type"] || "") : "";
      const est = /svg/.test(tipo) ? ".svg" : /png/.test(tipo) ? ".png" : /jpe?g/.test(tipo) ? ".jpg" : "";
      if (est) {
        fs.writeFileSync(path.join(cartella, `logo${est}`), await r.body());
        dati.file.logo = `logo${est}`;
      }
    }
    await computer.close();
    const telefono = await browser.newPage({ ...devices["iPhone 13"] });
    await vai(telefono);
    const altezzaTel = await telefono.evaluate(() => document.documentElement.scrollHeight);
    await telefono.screenshot({ path: path.join(cartella, "telefono-pagina.jpg"), type: "jpeg", quality: 85, fullPage: true, clip: altezzaTel > 9000 ? { x: 0, y: 0, width: 390, height: 9000 } : undefined });
    await telefono.close();
    dati.catturato = new Date().toISOString();
    fs.writeFileSync(path.join(cartella, "sito.json"), JSON.stringify(dati, null, 2) + "\n");
    return dati;
  } finally {
    if (proprio) await browser.close();
  }
}

module.exports = { catturaSito };

if (require.main === module) {
  (async () => {
    const o = argomenti(process.argv.slice(2));
    if (!o.url) {
      console.log(fs.readFileSync(__filename, "utf8").split("*/")[0].replace(/^#!.*\n\/\*\n?/, "").replace(/^ \* ?/gm, ""));
      process.exit(1);
    }
    const dati = await catturaSito(o.url, o.uscita, { attesa: o.attesa });
    const altre = Object.keys(dati.versioni).filter((l) => l !== dati.lingua);
    console.log(`"${dati.titolo}" · lingua ${dati.lingua || "?"}${altre.length ? ` · anche in ${altre.join(", ")}` : ""} · ${dati.titoli.length} titoli · ${dati.cliccabili.length} cliccabili · accenti ${dati.colori.accentiCandidati.join(" ") || "—"}${dati.file.logo ? " · logo" : ""} → ${o.uscita}/`);
  })().catch((e) => {
    console.error("Errore:", e.message);
    process.exit(1);
  });
}
