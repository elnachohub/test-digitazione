#!/usr/bin/env node
/*
 * Controllo delle traduzioni dell'interfaccia.
 *
 *   node test/stringhe-ui.js            elenca le frasi senza traduzione, codice 1 se ce ne sono
 *   node test/stringhe-ui.js --scrivi   scrive anche test/stringhe-mancanti.json (per il localizzatore)
 *
 * Raccoglie le frasi in due modi e li unisce:
 *  1. dal vivo: apre l'editor in ogni lingua, attraversa finestre, scene e
 *     pannelli, e annota ogni frase che SV.t non trova nel dizionario;
 *  2. dal codice: le frasi scritte dentro t("…") / SV.t("…"), anche nei
 *     confronti ternari, che dal vivo potrebbero non comparire (avvisi, errori).
 * I testi dei video (progetto, marche, modelli) non sono interfaccia e vengono esclusi.
 */
"use strict";

const fs = require("fs");
const path = require("path");
const http = require("http");

const RADICE = path.resolve(__dirname, "..");
const TIPI_MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".woff2": "font/woff2", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml" };

function server() {
  return new Promise((ok) => {
    const s = http.createServer((req, res) => {
      const file = path.join(RADICE, decodeURIComponent(new URL(req.url, "http://x").pathname));
      if (!file.startsWith(RADICE) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        res.writeHead(404);
        return res.end();
      }
      res.writeHead(200, { "content-type": TIPI_MIME[path.extname(file)] || "application/octet-stream" });
      fs.createReadStream(file).pipe(res);
    });
    s.listen(0, "127.0.0.1", () => ok(s));
  });
}

// Frasi scritte nel codice dentro t("…") o SV.t("…"), anche "a ? "x" : "y"".
function frasiDalCodice() {
  const frasi = new Set();
  for (const f of ["js/editor.js", "js/libreria.js", "js/marca.js"]) {
    const testo = fs.readFileSync(path.join(RADICE, f), "utf8");
    for (const m of testo.matchAll(/\bt\(([^;\n]*)/g)) {
      // stringhe fino alla prima virgola fuori dalle virgolette o alla parentesi del dizionario {…}
      const argomento = m[1].split(/,\s*\{/)[0];
      for (const s of argomento.matchAll(/"((?:[^"\\]|\\.)*)"/g)) {
        const v = JSON.parse(`"${s[1]}"`);
        if (/\p{L}{2}/u.test(v) && !/^[#.]/.test(v)) frasi.add(v);
      }
    }
  }
  return frasi;
}

async function frasiDalVivo(browser, base, lingua) {
  const pagina = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errori = [];
  pagina.on("pageerror", (e) => errori.push(e.message));
  pagina.on("dialog", (d) => d.dismiss());
  await pagina.addInitScript((l) => {
    localStorage.setItem("studio-video-lingua", l);
    window.__mancanti = new Set();
    window.StudioVideo = { registraMancante: (s) => window.__mancanti.add(s) };
  }, lingua);
  await pagina.goto(`${base}/index.html`);
  await pagina.waitForFunction(() => document.querySelectorAll("#elenco-scene li").length > 0);
  const clic = async (sel) => {
    const e = pagina.locator(sel).first();
    if (await e.count()) await e.click({ force: true }).catch(() => {});
    await pagina.waitForTimeout(120);
  };
  // una scena per tipo, ognuna selezionata, con un elemento scelto nell'anteprima
  const tipi = await pagina.$$eval("#nuova-scena option", (o) => o.map((x) => x.value));
  for (const tipo of tipi) {
    await pagina.selectOption("#nuova-scena", tipo);
    await clic("#aggiungi-scena");
    const box = await pagina.locator("#tela").boundingBox();
    if (tipo !== "tutorial") await pagina.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.45);
    await pagina.waitForTimeout(150);
  }
  await pagina.selectOption("#stile-scena select >> nth=1", "colore").catch(() => {});
  await pagina.selectOption("#stile-scena select >> nth=1", "immagine").catch(() => {});
  // generatore con i tre modelli
  await clic("#apri-generatore");
  for (const m of ["promo", "presentazione", "tutorial"]) await clic(`.scheda-modello input[value=${m}]`);
  await pagina.keyboard.press("Escape");
  // marche: vuota, poi con le marche d'esempio, scheda, stato collegato
  await clic("#apri-libreria");
  await pagina.waitForTimeout(200);
  const [scelta] = await Promise.all([pagina.waitForEvent("filechooser"), clic("#importa-marche")]);
  await scelta.setFiles(path.join(RADICE, "esempi/marche.json"));
  await pagina.waitForTimeout(1500);
  await pagina.fill("#cerca-marche", "zzz");
  await pagina.fill("#cerca-marche", "");
  await clic(".scheda-marca button[title='Modifica'], .scheda-marca .mini >> nth=0");
  await pagina.keyboard.press("Escape");
  await clic("#apri-libreria");
  await clic(".scheda-marca .pulsante:not(.principale)");
  await pagina.waitForTimeout(300);
  // esportazione
  await clic("#apri-esporta");
  await pagina.keyboard.press("Escape");

  const risultato = await pagina.evaluate(() => {
    const SV = window.StudioVideo;
    // testi dei video: non sono interfaccia
    const contenuti = new Set();
    const raccogli = (x) => {
      if (typeof x === "string") contenuti.add(x);
      else if (x && typeof x === "object") Object.values(x).forEach(raccogli);
    };
    raccogli(SV.TESTI);
    raccogli(JSON.parse(localStorage.getItem("__nulla") || "{}"));
    return { mancanti: [...window.__mancanti], contenuti: [...contenuti] };
  });
  const progetto = await pagina.evaluate(() => new Promise((ok) => {
    const r = indexedDB.open("studio-video");
    r.onsuccess = () => {
      const tx = r.result.transaction(["progetti", "marche"], "readonly");
      const a = tx.objectStore("progetti").get("corrente");
      const b = tx.objectStore("marche").getAll();
      tx.oncomplete = () => ok(JSON.stringify([a.result, b.result]));
    };
  }));
  const contenuti = new Set(risultato.contenuti);
  const scan = (x) => {
    if (typeof x === "string") contenuti.add(x);
    else if (x && typeof x === "object") Object.values(x).forEach(scan);
  };
  scan(JSON.parse(progetto));
  await pagina.close();
  return { frasi: risultato.mancanti.filter((s) => !contenuti.has(s) && /\p{L}/u.test(s) && !/^(https?:|data:)/.test(s)), errori };
}

(async () => {
  const scrivi = process.argv.includes("--scrivi");
  global.window = global;
  require(path.join(RADICE, "js/lingue-ui.js"));
  const DIZ = global.StudioVideo.DIZIONARI;
  const { chromium } = require("playwright");
  const srv = await server();
  const base = `http://127.0.0.1:${srv.address().port}`;
  const browser = await chromium.launch();
  const codice = frasiDalCodice();
  const mancanti = {};
  let totale = 0;
  try {
    for (const lingua of Object.keys(DIZ)) {
      const vivo = await frasiDalVivo(browser, base, lingua);
      if (vivo.errori.length) console.log(`  ! errori nella pagina (${lingua}): ${vivo.errori.join(" | ")}`);
      const tutte = new Set([...vivo.frasi, ...codice]);
      mancanti[lingua] = [...tutte].filter((f) => !Object.prototype.hasOwnProperty.call(DIZ[lingua], f)).sort();
      totale += mancanti[lingua].length;
      console.log(`${lingua}: ${Object.keys(DIZ[lingua]).length} tradotte · ${mancanti[lingua].length} mancanti`);
    }
  } finally {
    await browser.close();
    srv.close();
  }
  if (scrivi) {
    fs.writeFileSync(path.join(__dirname, "stringhe-mancanti.json"), JSON.stringify(mancanti, null, 1) + "\n");
    console.log("→ test/stringhe-mancanti.json");
  } else if (totale) {
    for (const [l, el] of Object.entries(mancanti)) if (el.length) console.log(`\n${l}:\n  ${el.slice(0, 20).join("\n  ")}${el.length > 20 ? `\n  … e altre ${el.length - 20}` : ""}`);
  }
  process.exit(totale ? 1 : 0);
})().catch((e) => {
  console.error("Errore:", e.message);
  process.exit(2);
});
