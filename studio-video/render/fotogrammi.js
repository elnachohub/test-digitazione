#!/usr/bin/env node
/*
 * Provini di un progetto, per guardarlo senza fare l'MP4 (attrezzo del revisore).
 *
 *   node render/fotogrammi.js progetto.json [opzioni]
 *
 *   --formato 9:16       formato da provare (predefinito: quello del progetto)
 *   --tempi 1,2.5,4      istanti precisi (predefinito: 2 per scena, a metà e a fine entrata)
 *   --marca marche.json  applica la prima marca del file (o quella di --solo)
 *   --solo "nome"        con --marca
 *   --uscita cartella    predefinito: ./provini
 *   --colonne 4          colonne del foglio
 *
 * Scrive provini/<nome>-<formato>-foglio.jpg (tutti i fotogrammi in una
 * immagine) e un JPG per ogni istante.
 */
"use strict";

const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");
const { incorporaImmagini, leggiMarche } = require("./render.js");

function argomenti(argv) {
  const o = { file: null, formato: null, tempi: null, marca: null, solo: null, uscita: "provini", colonne: 4 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const v = () => argv[++i];
    if (a === "--formato") o.formato = v();
    else if (a === "--tempi") o.tempi = v().split(",").map(Number).filter((n) => n >= 0);
    else if (a === "--marca") o.marca = v();
    else if (a === "--solo") o.solo = v().toLowerCase();
    else if (a === "--uscita") o.uscita = v();
    else if (a === "--colonne") o.colonne = Math.max(1, Number(v()) || 4);
    else if (!a.startsWith("--")) o.file = a;
  }
  return o;
}

(async () => {
  const o = argomenti(process.argv.slice(2));
  if (!o.file) {
    console.log(fs.readFileSync(__filename, "utf8").split("*/")[0].replace(/^#!.*\n\/\*\n?/, "").replace(/^ \* ?/gm, ""));
    process.exit(1);
  }
  require("../js/motore.js");
  require("../js/marca.js");
  const SV = globalThis.StudioVideo;
  let progetto = incorporaImmagini(JSON.parse(fs.readFileSync(o.file, "utf8")), path.dirname(path.resolve(o.file)));
  if (o.marca) progetto = SV.applicaMarca(progetto, leggiMarche(o.marca, o.solo)[0]);
  if (o.formato) progetto.formato = o.formato;
  const tempi = o.tempi || SV.tempi(progetto).flatMap((v) => [v.inizio + Math.min(1.2, v.durata * 0.35), v.inizio + v.durata - 0.55]);
  const { chromium } = require("playwright");
  const browser = await chromium.launch();
  try {
    const pagina = await browser.newPage();
    pagina.on("pageerror", (e) => console.error("errore nella pagina:", e.message));
    await pagina.goto(pathToFileURL(path.join(__dirname, "pagina.html")).href);
    const info = await pagina.evaluate((p) => window.prepara(p), progetto);
    fs.mkdirSync(o.uscita, { recursive: true });
    const base = `${path.basename(o.file, ".json")}-${(progetto.formato || "16:9").replace(":", "x")}`;
    const lw = info.w >= info.h ? 480 : 270;
    const foglio = await pagina.evaluate(([t, c, l]) => window.foglio(t, c, l), [tempi, o.colonne, lw]);
    const fileFoglio = path.join(o.uscita, `${base}-foglio.jpg`);
    fs.writeFileSync(fileFoglio, Buffer.from(foglio.split(",")[1], "base64"));
    for (const t of tempi) {
      const url = await pagina.evaluate(([x]) => window.fotogramma(x, 0.88), [t]);
      fs.writeFileSync(path.join(o.uscita, `${base}-${t.toFixed(2)}s.jpg`), Buffer.from(url.split(",")[1], "base64"));
    }
    console.log(`${tempi.length} provini (${info.w}x${info.h}, ${info.durata} s) → ${fileFoglio}`);
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error("Errore:", e.message);
  process.exit(1);
});
