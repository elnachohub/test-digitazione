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
 * Funziona anche con file locali: node render/cattura-sito.js ../index.html
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
  for (const e of document.querySelectorAll("a, button, header, nav, [class*=btn], [class*=button], h1, h2")) {
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
  return {
    indirizzo: location.href,
    titolo: document.title,
    descrizione: meta("description") || meta("og:description"),
    titoli: testi("h1, h2, h3", 25),
    paragrafi: testi("p, li", 30),
    pulsanti: testi("button, a[class*=btn], a[class*=button], [role=button], input[type=submit]", 15),
    colori: { sfondoPagina: sfondo, accentiCandidati: [...conta.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([c]) => c) },
    cliccabili,
  };
}

(async () => {
  const o = argomenti(process.argv.slice(2));
  if (!o.url) {
    console.log(fs.readFileSync(__filename, "utf8").split("*/")[0].replace(/^#!.*\n\/\*\n?/, "").replace(/^ \* ?/gm, ""));
    process.exit(1);
  }
  const { chromium, devices } = require("playwright");
  fs.mkdirSync(o.uscita, { recursive: true });
  const browser = await chromium.launch();
  const vai = async (pagina) => {
    await pagina.goto(o.url, { waitUntil: "load", timeout: 45000 });
    await pagina.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
    await pagina.waitForTimeout(o.attesa);
  };
  try {
    const computer = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await vai(computer);
    const dati = await computer.evaluate(leggiPagina);
    await computer.screenshot({ path: path.join(o.uscita, "computer-schermo.jpg"), type: "jpeg", quality: 88 });
    const altezza = await computer.evaluate(() => document.documentElement.scrollHeight);
    await computer.screenshot({ path: path.join(o.uscita, "computer-pagina.jpg"), type: "jpeg", quality: 85, fullPage: true, clip: altezza > 9000 ? { x: 0, y: 0, width: 1440, height: 9000 } : undefined });
    const telefono = await browser.newPage({ ...devices["iPhone 13"] });
    await vai(telefono);
    await telefono.screenshot({ path: path.join(o.uscita, "telefono-pagina.jpg"), type: "jpeg", quality: 85, fullPage: true });
    dati.catturato = new Date().toISOString();
    dati.file = { computerPagina: "computer-pagina.jpg", computerSchermo: "computer-schermo.jpg", telefonoPagina: "telefono-pagina.jpg" };
    fs.writeFileSync(path.join(o.uscita, "sito.json"), JSON.stringify(dati, null, 2) + "\n");
    console.log(`"${dati.titolo}" · ${dati.titoli.length} titoli · ${dati.cliccabili.length} cliccabili · accenti ${dati.colori.accentiCandidati.join(" ") || "—"} → ${o.uscita}/`);
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error("Errore:", e.message);
  process.exit(1);
});
