#!/usr/bin/env node
/*
 * Collaudo automatico di Studio Video (QA).
 *
 *   node test/collaudo.js            flussi principali (devono passare tutti)
 *   node test/collaudo.js --bug      in più: i bug noti di docs/squadra/qa.md
 *                                    (falliscono finché non sono corretti)
 *   node test/collaudo.js --veloce   salta il rendering MP4 da riga di comando
 *   node test/collaudo.js --vedi     browser visibile (serve uno schermo)
 *
 * Avvia da sé un server statico su una porta libera, usa un contesto
 * Playwright pulito (IndexedDB vuoto) e scrive i file temporanei nella
 * cartella temporanea del sistema. Esce con codice 1 se qualcosa fallisce.
 * Ogni errore in console o eccezione della pagina fa fallire la prova.
 */
"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const http = require("http");
const { spawnSync } = require("child_process");
const { chromium, devices } = require("playwright");

const RADICE = path.resolve(__dirname, "..");
const argomenti = process.argv.slice(2);
const CON_BUG = argomenti.includes("--bug");
const VELOCE = argomenti.includes("--veloce");
const VEDI = argomenti.includes("--vedi");
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "collaudo-studio-video-"));

// ------------------------------------------------------------ server statico

const TIPI = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".woff2": "font/woff2", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml" };
function avviaServer() {
  const server = http.createServer((req, res) => {
    const rel = decodeURIComponent(new URL(req.url, "http://x").pathname).replace(/^\/+/, "") || "index.html";
    const pieno = path.resolve(RADICE, rel);
    if (!pieno.startsWith(RADICE) || !fs.existsSync(pieno) || fs.statSync(pieno).isDirectory()) {
      res.writeHead(404);
      return res.end("non trovato");
    }
    res.writeHead(200, { "Content-Type": TIPI[path.extname(pieno)] || "application/octet-stream" });
    fs.createReadStream(pieno).pipe(res);
  });
  return new Promise((ok) => server.listen(0, "127.0.0.1", () => ok(server)));
}

// --------------------------------------------------------------- prove

const esiti = [];
function verifica(cond, messaggio) {
  if (!cond) throw new Error(messaggio);
}

async function prova(nome, fn, { bug = false } = {}) {
  if (bug && !CON_BUG) return;
  const inizio = Date.now();
  try {
    await fn();
    esiti.push({ nome, ok: true, bug });
    console.log(`  ✓ ${nome} (${((Date.now() - inizio) / 1000).toFixed(1)} s)`);
  } catch (e) {
    esiti.push({ nome, ok: false, bug, errore: e.message });
    console.log(`  ✖ ${nome}\n      ${String(e.message).split("\n")[0]}`);
  }
}

// Apre l'editor in un contesto nuovo (IndexedDB vuoto) e raccoglie gli errori.
async function apriEditor(browser, base, opzioni = {}) {
  const contesto = await browser.newContext(Object.assign({ viewport: { width: 1440, height: 900 }, acceptDownloads: true }, opzioni));
  const pagina = await contesto.newPage();
  const errori = [];
  const finestre = [];
  pagina.on("pageerror", (e) => errori.push(`eccezione: ${e.message}`));
  pagina.on("console", (m) => m.type() === "error" && errori.push(`console: ${m.text()}`));
  pagina.on("dialog", async (d) => {
    finestre.push(d.message());
    await d.accept();
  });
  await pagina.goto(`${base}/index.html`);
  await pagina.waitForFunction(() => document.querySelectorAll("#elenco-scene li").length > 0);
  await pagina.waitForTimeout(200);
  const ed = {
    pagina, contesto, errori, finestre,
    progetto: () => pagina.evaluate(() => JSON.parse(JSON.stringify(StudioVideo.editor.progetto()))),
    tipi: () => pagina.evaluate(() => StudioVideo.editor.progetto().scene.map((s) => s.tipo).join(",")),
    storia: () => pagina.evaluate(() => ({ annulla: !document.querySelector("#annulla").disabled, ripeti: !document.querySelector("#ripeti").disabled })),
    scena: async (i) => {
      await pagina.locator("#elenco-scene li").nth(i).click();
      await pagina.waitForTimeout(150);
    },
    // centro del titolo della scena selezionata, in coordinate della pagina
    puntoElemento: async (id) => {
      await pagina.waitForTimeout(100);
      return pagina.evaluate((id) => {
        const c = document.querySelector("#tela");
        const r = c.getBoundingClientRect();
        const ctx = document.createElement("canvas").getContext("2d");
        ctx.canvas.width = c.width;
        ctx.canvas.height = c.height;
        const p = StudioVideo.editor.progetto();
        const t = Number(document.querySelector("#cursore-tempo").value) / 1000 * StudioVideo.durataTotale(p);
        const el = StudioVideo.disegna(ctx, p, new Map(), t, { registra: true }).find((e) => e.id === id);
        if (!el) return null;
        const k = r.width / c.width;
        return { x: r.x + (el.x + el.w / 2) * k, y: r.y + (el.y + el.h / 2) * k, dx: r.x + (el.x + el.w + 5) * k, dy: r.y + (el.y + el.h + 5) * k };
      }, id);
    },
    pulito: (cosa) => verifica(!errori.length, `errori in pagina durante ${cosa}: ${errori.join(" | ")}`),
    chiudi: () => contesto.close(),
  };
  return ed;
}

async function genera(ed, modello, campi) {
  const { pagina } = ed;
  await pagina.click("#apri-generatore");
  await pagina.waitForSelector("#generatore[open]");
  await pagina.check(`#scelta-modello input[value=${modello}]`);
  for (const [k, v] of Object.entries(campi)) {
    const campo = pagina.locator(`#modulo-generatore [name=${k}]`);
    if ((await campo.evaluate((e) => e.tagName)) === "SELECT") await campo.selectOption(v);
    else await campo.fill(v);
  }
  await pagina.click("#modulo-generatore button[value=crea]");
  await pagina.waitForFunction(() => !document.querySelector("#generatore").open);
  await pagina.waitForTimeout(400);
}

function scrivi(nome, contenuto) {
  const f = path.join(TMP, nome);
  fs.writeFileSync(f, typeof contenuto === "string" ? contenuto : JSON.stringify(contenuto, null, 2));
  return f;
}

const BREVE = {
  nome: "Collaudo breve", formato: "16:9", tema: "cobalto",
  marchio: { nome: "Collaudo", url: "collaudo.example", logo: "" },
  scene: [
    { tipo: "titolo", durata: 1, titolo: "Uno", sottotitolo: "prova" },
    { tipo: "cta", durata: 1.5, titolo: "Due", pulsante: "Vai", clic: true },
  ],
};

// ------------------------------------------------------------- principale

(async () => {
  const server = await avviaServer();
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ headless: !VEDI });
  console.log(`Collaudo Studio Video su ${base}${CON_BUG ? " (con i bug noti)" : ""}\n`);
  try {
    // ---------------------------------------------------- avvio
    await prova("avvio: progetto iniziale, console pulita", async () => {
      const ed = await apriEditor(browser, base);
      verifica((await ed.tipi()) === "titolo,schermata,punti,numeri,citazione,cta", `scene iniziali: ${await ed.tipi()}`);
      const s = await ed.storia();
      verifica(!s.annulla && !s.ripeti, "annulla/ripeti dovrebbero essere disattivati all'avvio");
      ed.pulito("l'avvio");
      await ed.chiudi();
    });

    // ---------------------------------------------------- generatore
    await prova("generatore rapido: i 3 modelli, formato e tema scelti", async () => {
      const ed = await apriEditor(browser, base);
      await genera(ed, "promo", { nome: "Prenotalo", slogan: "Prenota senza telefonate", vantaggi: "Agenda\nPromemoria\nPagamenti", invito: "Prova", formato: "9:16", tema: "anguria" });
      let p = await ed.progetto();
      verifica(p.scene.map((s) => s.tipo).join(",") === "titolo,punti,schermata,cta", "promo: scene sbagliate");
      verifica(p.formato === "9:16" && p.tema === "anguria", "promo: formato o tema non applicati");
      verifica(p.scene[1].punti.join("|") === "Agenda|Promemoria|Pagamenti", "promo: vantaggi non passati");
      await genera(ed, "presentazione", { nome: "Sito", formato: "16:9", tema: "carta" });
      p = await ed.progetto();
      verifica(p.scene.length === 6 && p.scene[5].tipo === "cta", "presentazione: scene sbagliate");
      await genera(ed, "tutorial", { nome: "App", vantaggi: "Apri\nScegli\nConferma\nPaga", formato: "1:1", tema: "acido" });
      p = await ed.progetto();
      verifica(p.scene[1].tipo === "tutorial" && p.scene[1].passi.length === 4, "tutorial: passi non creati");
      verifica(p.marchio.nome === "App", "tutorial: marchio non impostato");
      await ed.pagina.keyboard.press("Control+z");
      await ed.pagina.waitForTimeout(300);
      verifica((await ed.progetto()).nome === "Sito", "Ctrl+Z dopo il generatore non torna al progetto precedente");
      ed.pulito("il generatore");
      await ed.chiudi();
    });

    await prova("generatore: nome obbligatorio, Annulla non cambia nulla", async () => {
      const ed = await apriEditor(browser, base);
      const prima = await ed.tipi();
      await ed.pagina.click("#apri-generatore");
      await ed.pagina.locator("#modulo-generatore [name=nome]").fill("");
      await ed.pagina.click("#modulo-generatore button[value=crea]");
      verifica(await ed.pagina.evaluate(() => document.querySelector("#generatore").open), "con nome vuoto la finestra si chiude");
      await ed.pagina.click("#modulo-generatore button[value=annulla]");
      await ed.pagina.waitForTimeout(200);
      verifica((await ed.tipi()) === prima, "Annulla ha cambiato il progetto");
      ed.pulito("il generatore annullato");
      await ed.chiudi();
    });

    // ---------------------------------------------------- scene
    await prova("scene: aggiungi, sposta, duplica, elimina con annulla/ripeti", async () => {
      const ed = await apriEditor(browser, base);
      const { pagina } = ed;
      const li = (i) => pagina.locator("#elenco-scene li").nth(i);
      await pagina.selectOption("#nuova-scena", "citazione");
      await pagina.click("#aggiungi-scena");
      verifica((await ed.tipi()) === "titolo,citazione,schermata,punti,numeri,citazione,cta", `aggiungi: ${await ed.tipi()}`);
      await pagina.click("#annulla");
      verifica((await ed.tipi()) === "titolo,schermata,punti,numeri,citazione,cta", "annulla aggiungi");
      await pagina.click("#ripeti");
      verifica((await ed.tipi()).split(",").length === 7, "ripeti aggiungi");
      await pagina.click("#annulla");
      await li(1).getByRole("button", { name: "Sposta giù" }).click();
      verifica((await ed.tipi()) === "titolo,punti,schermata,numeri,citazione,cta", "sposta giù");
      await pagina.keyboard.press("Control+z");
      verifica((await ed.tipi()) === "titolo,schermata,punti,numeri,citazione,cta", "Ctrl+Z sposta");
      await pagina.keyboard.press("Control+Shift+z");
      verifica((await ed.tipi()) === "titolo,punti,schermata,numeri,citazione,cta", "Ctrl+Maiusc+Z sposta");
      await li(3).getByRole("button", { name: "Duplica" }).click();
      verifica((await ed.tipi()) === "titolo,punti,schermata,numeri,numeri,citazione,cta", "duplica");
      await pagina.click("#annulla");
      await li(5).getByRole("button", { name: "Elimina" }).click();
      verifica((await ed.tipi()) === "titolo,punti,schermata,numeri,citazione", "elimina");
      await pagina.click("#annulla");
      verifica((await ed.tipi()) === "titolo,punti,schermata,numeri,citazione,cta", "annulla elimina");
      for (let i = 0; i < 6; i++) {
        const b = li(0).getByRole("button", { name: "Elimina" });
        if (await b.isDisabled()) break;
        await b.click();
      }
      verifica((await ed.tipi()).split(",").length === 1, "non si arriva a una scena");
      verifica(await li(0).getByRole("button", { name: "Elimina" }).isDisabled(), "l'ultima scena si può eliminare");
      ed.pulito("le operazioni sulle scene");
      await ed.chiudi();
    });

    await prova("testi: modifica campi, durata totale, riassunto nell'elenco", async () => {
      const ed = await apriEditor(browser, base);
      const { pagina } = ed;
      await ed.scena(0);
      await pagina.locator("#proprieta textarea[data-chiave=titolo]").fill("Titolo con emoji 🚀 e àèìòù");
      await pagina.locator("#proprieta input[type=number]").first().fill("5");
      await pagina.waitForTimeout(200);
      const p = await ed.progetto();
      verifica(p.scene[0].titolo === "Titolo con emoji 🚀 e àèìòù" && p.scene[0].durata === 5, "campo titolo o durata non salvati");
      verifica((await pagina.textContent("#elenco-scene li .riassunto")).includes("🚀"), "riassunto non aggiornato");
      verifica((await pagina.textContent("#durata-totale")) === "0:30", `durata totale: ${await pagina.textContent("#durata-totale")}`);
      ed.pulito("la modifica dei testi");
      await ed.chiudi();
    });

    // ---------------------------------------------------- ritocco a mano
    await prova("ritocco a mano: trascina, maniglia, colore, frecce, Canc, Esc, occhio + annulla", async () => {
      const ed = await apriEditor(browser, base);
      const { pagina } = ed;
      const regola = async () => JSON.stringify((await ed.progetto()).scene[0].regola || {});
      await ed.scena(0);
      const c = await ed.puntoElemento("titolo");
      verifica(c, "titolo non trovato nel fotogramma");
      await pagina.mouse.click(c.x, c.y);
      await pagina.waitForTimeout(150);
      verifica((await pagina.textContent("#pannello-elemento strong")) === "Titolo", "clic sul titolo non lo seleziona");
      // trascina
      await pagina.mouse.move(c.x, c.y);
      await pagina.mouse.down();
      await pagina.mouse.move(c.x + 60, c.y + 30, { steps: 5 });
      await pagina.mouse.up();
      verifica(/"dx":\d/.test(await regola()) && /"dy":\d/.test(await regola()), `trascinamento non registrato: ${await regola()}`);
      await pagina.keyboard.press("Control+z");
      verifica((await regola()) === "{}", "annulla trascinamento");
      await pagina.keyboard.press("Control+Shift+z");
      verifica(/"dx"/.test(await regola()), "ripeti trascinamento");
      await pagina.click("#annulla");
      // maniglia
      await pagina.mouse.click(c.x, c.y);
      await pagina.waitForTimeout(150);
      const m = await ed.puntoElemento("titolo");
      await pagina.mouse.move(m.dx, m.dy);
      await pagina.mouse.down();
      await pagina.mouse.move(m.dx + 80, m.dy + 40, { steps: 6 });
      await pagina.mouse.up();
      const scala = JSON.parse(await regola()).titolo?.scala;
      verifica(scala > 1, `la maniglia non ingrandisce (scala ${scala})`);
      await pagina.click("#annulla");
      verifica((await regola()) === "{}", "annulla maniglia");
      // colore da campione
      await pagina.mouse.click(c.x, c.y);
      await pagina.waitForTimeout(150);
      await pagina.locator("#pannello-elemento .campione").nth(1).click();
      verifica(/"colore":"#/.test(await regola()), "campione di colore non applicato");
      await pagina.click("#annulla");
      // frecce
      await pagina.mouse.click(c.x, c.y);
      await pagina.waitForTimeout(150);
      await pagina.keyboard.press("ArrowRight");
      await pagina.keyboard.press("Shift+ArrowDown");
      verifica((await regola()) === '{"titolo":{"dx":0.5,"dy":2}}', `frecce: ${await regola()}`);
      await pagina.keyboard.press("Control+z");
      verifica((await regola()) === "{}", "annulla frecce");
      // Canc
      await pagina.mouse.click(c.x, c.y);
      await pagina.waitForTimeout(150);
      await pagina.keyboard.press("Delete");
      verifica(/"nascosto":true/.test(await regola()), "Canc non nasconde");
      await pagina.keyboard.press("Control+z");
      verifica((await regola()) === "{}", "annulla Canc");
      // occhio nell'elenco elementi
      await pagina.locator("#lista-elementi li").nth(0).locator("button.mini").click();
      verifica(/"nascosto":true/.test(await regola()), "l'occhio non nasconde");
      await pagina.waitForTimeout(150);
      await pagina.locator("#lista-elementi li").nth(0).locator("button.mini").click();
      verifica((await regola()) === "{}", "l'occhio non rimostra");
      // Esc
      await pagina.mouse.click(c.x, c.y);
      await pagina.waitForTimeout(150);
      await pagina.keyboard.press("Escape");
      await pagina.waitForTimeout(100);
      verifica(!(await pagina.$("#pannello-elemento strong")), "Esc non deseleziona");
      ed.pulito("il ritocco a mano");
      await ed.chiudi();
    });

    // ---------------------------------------------------- tutorial
    await prova("tutorial: clic aggiunge un passo, trascinamento sposta, annulla", async () => {
      const ed = await apriEditor(browser, base);
      const { pagina } = ed;
      await pagina.selectOption("#nuova-scena", "tutorial");
      await pagina.click("#aggiungi-scena");
      await pagina.waitForTimeout(250);
      verifica(await pagina.isVisible("#suggerimento-tutorial"), "suggerimento del tutorial non visibile");
      const passi = async () => (await ed.progetto()).scene[1].passi;
      const box = await pagina.locator("#tela").boundingBox();
      await pagina.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.55);
      await pagina.waitForTimeout(150);
      verifica((await passi()).length === 4, "il clic non aggiunge il passo");
      const punti = await pagina.evaluate(() => {
        const c = document.querySelector("#tela");
        const r = c.getBoundingClientRect();
        const sc = StudioVideo.editor.progetto().scene[1];
        const { m } = StudioVideo.geometriaTutorial(c.width, c.height, Math.min(c.width, c.height) / 100, sc, null);
        const k = r.width / c.width;
        return sc.passi.map((p) => ({ x: r.x + (m.vx + p.x * m.vw) * k, y: r.y + (m.vy + p.y * m.vh) * k }));
      });
      await pagina.mouse.move(punti[0].x, punti[0].y);
      await pagina.mouse.down();
      await pagina.mouse.move(punti[0].x + 100, punti[0].y + 60, { steps: 6 });
      await pagina.mouse.up();
      const p0 = (await passi())[0];
      verifica(p0.x > 0.25 && p0.y > 0.15, `trascinamento del passo non applicato (${p0.x}, ${p0.y})`);
      await pagina.keyboard.press("Control+z");
      verifica((await passi())[0].x === 0.2, "annulla trascinamento passo");
      await pagina.keyboard.press("Control+z");
      verifica((await passi()).length === 3, "annulla aggiunta passo");
      await pagina.getByText("+ Aggiungi passo").click();
      verifica((await passi()).length === 4, "pulsante Aggiungi passo");
      ed.pulito("il tutorial");
      await ed.chiudi();
    });

    // ---------------------------------------------------- marche
    await prova("marche: salva come marca, aggiorna, importa due volte, cerca, ordina, duplica, esporta, elimina, applica, scollega, nuovo video", async () => {
      const ed = await apriEditor(browser, base);
      const { pagina } = ed;
      const griglia = () => pagina.evaluate(() => [...document.querySelectorAll("#griglia-marche li.scheda-marca strong")].map((e) => e.textContent));
      const scheda = (nome) => pagina.locator("#griglia-marche li.scheda-marca", { has: pagina.locator("strong", { hasText: new RegExp(`^${nome.replace(/[()]/g, "\\$&")}$`) }) });
      await pagina.evaluate(() => StudioVideo.editor.modifica(() => { StudioVideo.editor.progetto().scene[0].regola = { titolo: { dx: 5 } }; }));
      await pagina.getByRole("button", { name: "★ Salva come marca" }).click();
      await pagina.waitForSelector("#scheda-marca[open]");
      await pagina.locator("#modulo-marca [name=nome]").fill("Cliente Collaudo");
      await pagina.locator("#modulo-marca [name=note]").fill("referente Mario");
      await pagina.click("#modulo-marca button[value=salva]");
      await pagina.waitForFunction(() => document.querySelector("#marca-attuale").textContent.includes("Cliente Collaudo"));
      verifica((await ed.progetto()).marcaId, "il progetto non è collegato alla marca");
      await pagina.selectOption("#tema", "oceano");
      await pagina.getByRole("button", { name: "↻ Aggiorna marca" }).click();
      await pagina.waitForTimeout(600);
      await pagina.click("#apri-libreria");
      await pagina.waitForSelector("#libreria[open]");
      for (let i = 0; i < 2; i++) {
        const avvisi = ed.finestre.length;
        await pagina.locator("#file-marche").setInputFiles(path.join(RADICE, "esempi/marche.json"));
        for (let k = 0; k < 100 && ed.finestre.length === avvisi; k++) await pagina.waitForTimeout(100);
        verifica((await griglia()).length === 4, `dopo l'import ${i + 1}: ${await griglia()}`);
      }
      verifica(ed.finestre.some((f) => f.includes("0 nuove, 3 aggiornate")), "il secondo import duplica le marche");
      await pagina.fill("#cerca-marche", "forno");
      await pagina.waitForTimeout(100);
      verifica((await griglia()).join() === "Forno Bianchi", "ricerca per nome");
      await pagina.fill("#cerca-marche", "mario");
      await pagina.waitForTimeout(100);
      verifica((await griglia()).join() === "Cliente Collaudo", "ricerca nelle note");
      await pagina.fill("#cerca-marche", "");
      await pagina.selectOption("#ordine-marche", "nome");
      await pagina.waitForTimeout(100);
      verifica((await griglia()).join() === "Cliente Collaudo,Forno Bianchi,Palestra Nova,Prenotalo", `ordine per nome: ${await griglia()}`);
      await scheda("Forno Bianchi").getByRole("button", { name: /Duplica/ }).click();
      await pagina.waitForFunction(() => document.querySelectorAll("#griglia-marche li.scheda-marca").length === 5);
      const [scaricato] = await Promise.all([pagina.waitForEvent("download"), pagina.click("#esporta-marche")]);
      const fileEsportato = path.join(TMP, "marche-esportate.json");
      await scaricato.saveAs(fileEsportato);
      const esportate = JSON.parse(fs.readFileSync(fileEsportato, "utf8"));
      verifica(esportate.tipo === "studio-video-marche" && esportate.marche.length === 5, "esportazione marche");
      verifica(esportate.marche.find((m) => m.nome === "Cliente Collaudo").tema === "oceano", "Aggiorna marca non ha salvato il nuovo tema");
      await scheda("Forno Bianchi (copia)").getByRole("button", { name: /Elimina/ }).click();
      await pagina.waitForFunction(() => document.querySelectorAll("#griglia-marche li.scheda-marca").length === 4);
      await scheda("Palestra Nova").getByRole("button", { name: "Applica" }).click();
      await pagina.waitForTimeout(500);
      let p = await ed.progetto();
      verifica(p.tema === "acido" && p.marchio.nome === "Palestra Nova" && p.scene[0].animazione === "macchina", "Applica marca");
      await pagina.keyboard.press("Control+z");
      await pagina.waitForTimeout(300);
      verifica((await ed.progetto()).tema === "oceano", "annulla Applica marca");
      await pagina.keyboard.press("Control+Shift+z");
      await pagina.getByRole("button", { name: "Scollega" }).click();
      await pagina.waitForTimeout(300);
      verifica(!(await ed.progetto()).marcaId, "Scollega");
      await pagina.click("#apri-libreria");
      await scheda("Forno Bianchi").getByRole("button", { name: "Nuovo video" }).click();
      await pagina.waitForSelector("#generatore[open]");
      verifica((await pagina.inputValue("#modulo-generatore [name=nome]")) === "Forno Bianchi", "il generatore non si compila dalla marca");
      await pagina.check("#scelta-modello input[value=promo]");
      await pagina.click("#modulo-generatore button[value=crea]");
      await pagina.waitForTimeout(600);
      p = await ed.progetto();
      verifica(p.marcaId === "esempio-forno" && p.tema === "carta", "nuovo video da marca");
      verifica(JSON.stringify(p.scene.find((s) => s.tipo === "cta").regola) === '{"pulsante":{"scala":1.25}}', "ritocchi della marca non applicati");
      ed.pulito("le marche");
      await ed.chiudi();
    });

    // ---------------------------------------------------- file e persistenza
    await prova("apri/salva JSON, JSON rotto rifiutato, persistenza dopo ricarica", async () => {
      const ed = await apriEditor(browser, base);
      const { pagina } = ed;
      await pagina.locator("#file-progetto").setInputFiles(scrivi("rotto.json", '{ "nome": "rotto", "scene": [ {'));
      await pagina.waitForTimeout(300);
      verifica(ed.finestre.some((f) => f.includes("non è un progetto")), "JSON rotto senza avviso");
      verifica((await ed.progetto()).nome === "Il mio sito", "JSON rotto ha cambiato il progetto");
      await pagina.locator("#file-progetto").setInputFiles(scrivi("vuoto.json", { nome: "vuoto", scene: [] }));
      await pagina.waitForTimeout(300);
      verifica((await ed.progetto()).nome === "Il mio sito", "progetto senza scene accettato");
      await pagina.locator("#file-progetto").setInputFiles(scrivi("notte.json", Object.assign({}, BREVE, { nome: "Tema vecchio", tema: "notte", carattere: "gotico" })));
      await pagina.waitForTimeout(500);
      let p = await ed.progetto();
      verifica(p.nome === "Tema vecchio" && p.tema === "limone" && p.carattere === "auto", "tema/carattere inesistenti non riportati ai predefiniti");
      const [scaricato] = await Promise.all([pagina.waitForEvent("download"), pagina.click("#salva-file")]);
      verifica(scaricato.suggestedFilename() === "tema-vecchio.json", `nome file: ${scaricato.suggestedFilename()}`);
      const salvato = path.join(TMP, "salvato.json");
      await scaricato.saveAs(salvato);
      verifica(JSON.parse(fs.readFileSync(salvato, "utf8")).scene.length === 2, "il file salvato non contiene le scene");
      await pagina.fill("#nome-progetto", "Dopo la ricarica");
      await pagina.waitForTimeout(900);
      await pagina.reload();
      await pagina.waitForFunction(() => document.querySelectorAll("#elenco-scene li").length > 0);
      await pagina.waitForTimeout(300);
      p = await ed.progetto();
      verifica(p.nome === "Dopo la ricarica" && p.scene.length === 2, "il progetto non sopravvive alla ricarica");
      ed.pulito("apri/salva");
      await ed.chiudi();
    });

    await prova("formati: la tela cambia dimensione, annulla torna indietro", async () => {
      const ed = await apriEditor(browser, base);
      const { pagina } = ed;
      const attesi = { "16:9": [1920, 1080], "9:16": [1080, 1920], "1:1": [1080, 1080], "4:5": [1080, 1350] };
      for (const [f, [w, h]] of Object.entries(attesi)) {
        await pagina.selectOption("#formato", f);
        await pagina.waitForTimeout(150);
        const d = await pagina.evaluate(() => [document.querySelector("#tela").width, document.querySelector("#tela").height]);
        verifica(d[0] === w && d[1] === h, `${f}: tela ${d}`);
      }
      await pagina.click("#annulla");
      verifica((await ed.progetto()).formato === "1:1", "annulla cambio formato");
      ed.pulito("il cambio formato");
      await ed.chiudi();
    });

    await prova("esportazione dal browser (2,5 s, 2 formati) e copertina PNG", async () => {
      const ed = await apriEditor(browser, base);
      const { pagina } = ed;
      await pagina.locator("#file-progetto").setInputFiles(scrivi("breve.json", BREVE));
      await pagina.waitForTimeout(500);
      await pagina.click("#apri-esporta");
      await pagina.check('#scelta-formati input[value="9:16"]');
      const file = [];
      pagina.on("download", (d) => file.push(d.suggestedFilename()));
      await pagina.click("#avvia-esporta");
      await pagina.waitForFunction(() => document.querySelector("#testo-avanzamento").textContent === "Fatto.", null, { timeout: 30000 });
      await pagina.waitForTimeout(500);
      verifica(file.length === 2 && file.every((f) => /^collaudo-breve-(16x9|9x16)\.(mp4|webm)$/.test(f)), `file esportati: ${file}`);
      const tela = await pagina.evaluate(() => [document.querySelector("#tela").width, document.querySelector("#tela").height]);
      verifica(tela[0] === 1920, "dopo l'esportazione la tela non torna al formato del progetto");
      await pagina.click("#chiudi-esporta");
      const [png] = await Promise.all([pagina.waitForEvent("download"), pagina.click("#copertina")]);
      verifica(png.suggestedFilename() === "collaudo-breve-copertina-16x9.png", `copertina: ${png.suggestedFilename()}`);
      ed.pulito("l'esportazione");
      await ed.chiudi();
    });

    await prova("finestra stretta e iPhone: niente scorrimento orizzontale, tocco seleziona", async () => {
      for (const opz of [{ viewport: { width: 700, height: 900 } }, devices["iPhone 13"]]) {
        const ed = await apriEditor(browser, base, opz);
        const { pagina } = ed;
        const m = await pagina.evaluate(() => ({
          largo: document.documentElement.scrollWidth, vista: innerWidth,
          fuori: [...document.querySelectorAll("button, input, select")].filter((e) => { const r = e.getBoundingClientRect(); return r.width && (r.right > innerWidth + 1 || r.left < -1); }).length,
        }));
        verifica(m.largo <= m.vista && !m.fuori, `pagina più larga della finestra (${m.largo} > ${m.vista}, ${m.fuori} comandi fuori)`);
        if (opz.hasTouch) {
          const c = await ed.puntoElemento("titolo");
          await pagina.touchscreen.tap(c.x, c.y);
          await pagina.waitForTimeout(200);
          verifica((await pagina.textContent("#pannello-elemento strong")) === "Titolo", "il tocco non seleziona il titolo");
        }
        ed.pulito("la vista stretta");
        await ed.chiudi();
      }
    });

    // ---------------------------------------------------- riga di comando
    const ffmpeg = spawnSync("ffprobe", ["-version"]).status === 0;
    await prova("riga di comando: verifica.js, fotogrammi.js, render.js (h264, durata, risoluzione)", async () => {
      if (!ffmpeg || VELOCE) return console.log("      (saltato: --veloce o ffmpeg assente)");
      const progetto = scrivi("cli.json", BREVE);
      const nodo = (script, args) => spawnSync(process.execPath, [path.join(RADICE, "render", script), ...args], { encoding: "utf8", cwd: TMP, timeout: 180000 });
      let r = nodo("verifica.js", [progetto]);
      verifica(r.status === 0 && r.stdout.includes("2 scene"), `verifica.js: ${r.stdout}${r.stderr}`);
      r = nodo("fotogrammi.js", [progetto, "--uscita", path.join(TMP, "provini")]);
      verifica(r.status === 0 && fs.existsSync(path.join(TMP, "provini/cli-16x9-foglio.jpg")), `fotogrammi.js: ${r.stderr}`);
      r = nodo("render.js", [progetto, "--formati", "16:9,9:16", "--uscita", path.join(TMP, "video")]);
      verifica(r.status === 0, `render.js: ${r.stderr}`);
      for (const [f, w, h] of [["16x9", 1920, 1080], ["9x16", 1080, 1920]]) {
        const mp4 = path.join(TMP, `video/collaudo-breve-${f}.mp4`);
        const info = spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration:stream=codec_name,width,height", "-of", "json", mp4], { encoding: "utf8" });
        verifica(info.status === 0, `${mp4} illeggibile`);
        const j = JSON.parse(info.stdout);
        const v = j.streams[0];
        verifica(v.codec_name === "h264" && v.width === w && v.height === h, `${f}: ${v.codec_name} ${v.width}x${v.height}`);
        verifica(Math.abs(Number(j.format.duration) - 2.5) < 0.05, `${f}: durata ${j.format.duration}`);
      }
      r = nodo("render.js", [path.join(TMP, "non-esiste.json"), "--uscita", path.join(TMP, "video")]);
      verifica(r.status === 1 && r.stderr.includes("Errore"), "render.js con file inesistente non esce con errore");
    });

    // ------------------------------------------- bug noti (docs/squadra/qa.md)
    await prova("BUG G1: vantaggi che iniziano con un numero restano interi", async () => {
      const ed = await apriEditor(browser, base);
      await genera(ed, "promo", { nome: "Forno", vantaggi: "24 ore su 24\n100% biologico\n3 mesi gratis" });
      const punti = (await ed.progetto()).scene[1].punti.join("|");
      await ed.chiudi();
      verifica(punti === "24 ore su 24|100% biologico|3 mesi gratis", `punti: ${punti}`);
    }, { bug: true });

    await prova("BUG G2: Invio nel generatore crea il video (non annulla)", async () => {
      const ed = await apriEditor(browser, base);
      await ed.pagina.click("#apri-generatore");
      await ed.pagina.locator("#modulo-generatore [name=nome]").fill("Invio");
      await ed.pagina.locator("#modulo-generatore [name=nome]").press("Enter");
      await ed.pagina.waitForTimeout(500);
      const nome = (await ed.progetto()).nome;
      await ed.chiudi();
      verifica(nome === "Invio", `progetto dopo Invio: ${nome}`);
    }, { bug: true });

    await prova("BUG G3: 6 punti in 16:9 stanno nello schermo", async () => {
      const ed = await apriEditor(browser, base);
      await ed.scena(2);
      await ed.pagina.locator("#proprieta textarea[data-chiave=punti]").fill("Uno\nDue\nTre\nQuattro\nCinque\nSei");
      await ed.pagina.waitForTimeout(200);
      const fuori = await ed.pagina.evaluate(() => {
        const c = document.createElement("canvas");
        c.width = 1920;
        c.height = 1080;
        const p = StudioVideo.editor.progetto();
        const v = StudioVideo.tempi(p)[2];
        return StudioVideo.disegna(c.getContext("2d"), p, new Map(), v.inizio + v.durata - 0.6, { registra: true }).filter((e) => e.y < 0 || e.y + e.h > 1080).map((e) => e.id);
      });
      await ed.chiudi();
      verifica(!fuori.length, `elementi fuori schermo: ${fuori}`);
    }, { bug: true });

    await prova("BUG G4: numeri all'italiana (1.200) e testi (24/7) mostrati come scritti", async () => {
      const ed = await apriEditor(browser, base);
      const risultato = await ed.pagina.evaluate(() => {
        const testi = [];
        const c = document.createElement("canvas");
        c.width = 1920;
        c.height = 1080;
        const ctx = c.getContext("2d");
        const originale = ctx.fillText.bind(ctx);
        ctx.fillText = (t, ...r) => { testi.push(String(t)); return originale(t, ...r); };
        StudioVideo.disegna(ctx, { formato: "16:9", tema: "limone", scene: [{ tipo: "numeri", durata: 4, titolo: "", valori: [{ valore: "1.200", etichetta: "" }, { valore: "24/7", etichetta: "" }] }] }, new Map(), 3.9);
        return testi;
      });
      await ed.chiudi();
      verifica(risultato.includes("1.200") && risultato.includes("24/7"), `testi disegnati: ${risultato.join(" | ")}`);
    }, { bug: true });

    await prova("BUG G5: selezionare un elemento non cancella «Ripeti»", async () => {
      const ed = await apriEditor(browser, base);
      await ed.pagina.click("#aggiungi-scena");
      await ed.pagina.click("#annulla");
      await ed.scena(0);
      const c = await ed.puntoElemento("titolo");
      await ed.pagina.mouse.click(c.x, c.y);
      await ed.pagina.waitForTimeout(150);
      const s = await ed.storia();
      await ed.chiudi();
      verifica(s.ripeti, "Ripeti disattivato dopo un semplice clic di selezione");
    }, { bug: true });

    await prova("BUG G6: render.js usa sfondo.immagine relativo al JSON", async () => {
      if (!ffmpeg) return;
      const png = path.join(TMP, "rosso.png");
      spawnSync("ffmpeg", ["-loglevel", "error", "-y", "-f", "lavfi", "-i", "color=c=red:size=320x180", "-frames:v", "1", png]);
      const progetto = scrivi("sfondo.json", { nome: "Sfondo", formato: "16:9", tema: "cobalto", scene: [{ tipo: "titolo", durata: 1, titolo: "", sfondo: { tipo: "immagine", immagine: "rosso.png", velo: 0 } }] });
      const r = spawnSync(process.execPath, [path.join(RADICE, "render/render.js"), progetto, "--uscita", path.join(TMP, "sfondo")], { encoding: "utf8", cwd: TMP });
      verifica(r.status === 0, r.stderr);
      const px = spawnSync("ffmpeg", ["-loglevel", "error", "-ss", "0.9", "-i", path.join(TMP, "sfondo/sfondo-16x9.mp4"), "-frames:v", "1", "-vf", "crop=16:16:952:532,scale=1:1", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"]);
      const [rr, gg, bb] = px.stdout;
      verifica(rr > 180 && gg < 80 && bb < 80, `pixel centrale rgb(${rr},${gg},${bb}): lo sfondo rosso non c'è`);
    }, { bug: true });

    await prova("BUG G7: render.js non sovrascrive due progetti con lo stesso nome", async () => {
      if (!ffmpeg) return;
      const a = scrivi("a.json", Object.assign({}, BREVE, { scene: [BREVE.scene[0]] }));
      const b = scrivi("b.json", Object.assign({}, BREVE, { scene: [BREVE.scene[0]], tema: "acido" }));
      const uscita = path.join(TMP, "omonimi");
      spawnSync(process.execPath, [path.join(RADICE, "render/render.js"), a, b, "--uscita", uscita], { encoding: "utf8", cwd: TMP });
      const n = fs.existsSync(uscita) ? fs.readdirSync(uscita).length : 0;
      verifica(n === 2, `${n} file per 2 progetti`);
    }, { bug: true });

    await prova("BUG G8: JSON scritti a mano con tipi sbagliati non mandano in errore l'editor", async () => {
      const ed = await apriEditor(browser, base);
      await ed.pagina.locator("#file-progetto").setInputFiles(scrivi("tipi.json", { nome: "Tipi", formato: "16:9", tema: "limone", scene: [{ tipo: "punti", durata: 3, titolo: "x", punti: "una stringa" }, { tipo: "cta", durata: 3, titolo: "x", pulsante: 42 }] }));
      await ed.pagina.waitForTimeout(500);
      await ed.scena(1);
      const errori = ed.errori.slice();
      await ed.chiudi();
      verifica(!errori.length, errori.join(" | "));
    }, { bug: true });
  } finally {
    await browser.close();
    server.close();
    fs.rmSync(TMP, { recursive: true, force: true });
  }

  const falliti = esiti.filter((e) => !e.ok);
  const principali = esiti.filter((e) => !e.bug);
  console.log(`\n${principali.filter((e) => e.ok).length}/${principali.length} flussi principali superati` +
    (CON_BUG ? ` · bug noti ancora aperti: ${esiti.filter((e) => e.bug && !e.ok).length}/${esiti.filter((e) => e.bug).length}` : ""));
  process.exit(falliti.length ? 1 : 0);
})().catch((e) => {
  console.error("Collaudo interrotto:", e);
  process.exit(1);
});
