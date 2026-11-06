#!/usr/bin/env node
/*
 * Rendering MP4 da riga di comando, fotogramma per fotogramma (niente scatti).
 *
 *   node render/render.js progetto.json [altri.json ...] [opzioni]
 *
 * Opzioni:
 *   --formati 16:9,9:16,1:1   uno o più formati (predefinito: quello del progetto)
 *   --tutti                   tutti i formati: 16:9, 9:16, 1:1, 4:5
 *   --uscita cartella         dove salvare gli MP4 (predefinito: ./video)
 *   --musica file.mp3         colonna sonora (sostituisce quella del progetto)
 *   --fps 30                  fotogrammi al secondo
 *   --qualita 20              CRF di x264: più basso = più qualità (18-28)
 *
 * Richiede: Node 18+, ffmpeg nel PATH, Playwright (npm install).
 * Le immagini nel JSON possono essere data URL, indirizzi http(s) o percorsi
 * di file relativi al JSON.
 */
"use strict";

const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const { pathToFileURL } = require("url");

const FORMATI = ["16:9", "9:16", "1:1", "4:5"];
const MIME = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif", ".svg": "image/svg+xml" };

function leggiArgomenti(argv) {
  const opz = { file: [], formati: null, uscita: "video", musica: null, fps: 30, qualita: 20 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const valore = () => {
      if (i + 1 >= argv.length) throw new Error(`Manca il valore dopo ${a}`);
      return argv[++i];
    };
    if (a === "--formati") opz.formati = valore().split(",").map((s) => s.trim());
    else if (a === "--tutti") opz.formati = FORMATI.slice();
    else if (a === "--uscita") opz.uscita = valore();
    else if (a === "--musica") opz.musica = valore();
    else if (a === "--fps") opz.fps = Math.max(10, Math.min(60, Number(valore()) || 30));
    else if (a === "--qualita") opz.qualita = Number(valore()) || 20;
    else if (a === "-h" || a === "--aiuto" || a === "--help") opz.aiuto = true;
    else if (a.startsWith("--")) throw new Error(`Opzione sconosciuta: ${a}`);
    else opz.file.push(a);
  }
  for (const f of opz.formati || []) if (!FORMATI.includes(f)) throw new Error(`Formato non valido: ${f} (validi: ${FORMATI.join(", ")})`);
  return opz;
}

// Percorsi locali -> data URL, così la pagina di rendering li legge senza server.
function incorporaImmagini(progetto, cartella) {
  const converti = (src) => {
    if (!src || /^(data:|https?:)/i.test(src)) return src;
    const pieno = path.resolve(cartella, src);
    if (!fs.existsSync(pieno)) {
      console.warn(`  ! immagine non trovata, uso il segnaposto: ${src}`);
      return "";
    }
    const tipo = MIME[path.extname(pieno).toLowerCase()] || "application/octet-stream";
    return `data:${tipo};base64,${fs.readFileSync(pieno).toString("base64")}`;
  };
  if (progetto.marchio) progetto.marchio.logo = converti(progetto.marchio.logo);
  for (const s of progetto.scene || []) {
    if (s.immagine) s.immagine = converti(s.immagine);
    if (s.logo) s.logo = converti(s.logo);
  }
  return progetto;
}

// La musica del progetto può essere una data URL: la scriviamo su un file temporaneo.
function fileMusica(progetto, opz, cartella, tmp) {
  if (opz.musica) return path.resolve(opz.musica);
  const m = progetto.musica;
  if (!m) return null;
  const dati = /^data:([^;]+);base64,(.*)$/s.exec(m);
  if (dati) {
    const est = { "audio/mpeg": ".mp3", "audio/mp3": ".mp3", "audio/wav": ".wav", "audio/x-wav": ".wav", "audio/ogg": ".ogg", "audio/mp4": ".m4a", "audio/aac": ".aac", "audio/x-m4a": ".m4a" }[dati[1]] || ".audio";
    const f = path.join(tmp, `musica-${process.pid}${est}`);
    fs.writeFileSync(f, Buffer.from(dati[2], "base64"));
    return f;
  }
  const pieno = path.resolve(cartella, m);
  return fs.existsSync(pieno) ? pieno : null;
}

function nomeFile(progetto, formato, fileJson) {
  const baseNome = (progetto.nome || path.basename(fileJson, ".json"))
    .toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "video";
  return `${baseNome}-${formato.replace(":", "x")}.mp4`;
}

async function renderizza(pagina, progetto, formato, destinazione, opz, musica) {
  const p = Object.assign({}, progetto, { formato });
  const { w, h, durata } = await pagina.evaluate((x) => window.prepara(x), p);
  const totale = Math.ceil(durata * opz.fps);
  const argomenti = ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(opz.fps), "-c:v", "mjpeg", "-i", "-"];
  if (musica) argomenti.push("-i", musica);
  argomenti.push("-c:v", "libx264", "-preset", "medium", "-crf", String(opz.qualita), "-pix_fmt", "yuv420p", "-r", String(opz.fps));
  if (musica) {
    const volume = progetto.volume == null ? 0.8 : Number(progetto.volume);
    const dissolvenza = Math.min(1.5, durata / 4);
    argomenti.push("-map", "0:v", "-map", "1:a", "-c:a", "aac", "-b:a", "192k",
      "-af", `volume=${volume},afade=t=in:d=0.3,afade=t=out:st=${(durata - dissolvenza).toFixed(2)}:d=${dissolvenza.toFixed(2)}`,
      "-t", durata.toFixed(3));
  }
  argomenti.push("-movflags", "+faststart", destinazione);

  const ff = spawn("ffmpeg", argomenti, { stdio: ["pipe", "inherit", "inherit"] });
  const fine = new Promise((ok, ko) => {
    ff.on("error", (e) => ko(e.code === "ENOENT" ? new Error("ffmpeg non trovato: installalo e mettilo nel PATH") : e));
    ff.on("close", (c) => (c === 0 ? ok() : ko(new Error(`ffmpeg è uscito con codice ${c}`))));
  });
  const scrivi = (buf) => new Promise((ok) => (ff.stdin.write(buf) ? ok() : ff.stdin.once("drain", ok)));

  const inizio = Date.now();
  for (let i = 0; i < totale; i++) {
    const url = await pagina.evaluate(([t]) => window.fotogramma(t, 0.94), [i / opz.fps]);
    await scrivi(Buffer.from(url.slice(url.indexOf(",") + 1), "base64"));
    if (i % 15 === 0 || i === totale - 1) {
      process.stdout.write(`\r  ${formato} ${w}x${h}  ${String(Math.round(((i + 1) / totale) * 100)).padStart(3)}%  (${i + 1}/${totale} fotogrammi)`);
    }
  }
  ff.stdin.end();
  await fine;
  process.stdout.write(`  ✓ ${((Date.now() - inizio) / 1000).toFixed(1)} s\n`);
}

async function principale() {
  const opz = leggiArgomenti(process.argv.slice(2));
  if (opz.aiuto || !opz.file.length) {
    console.log(fs.readFileSync(__filename, "utf8").split("*/")[0].replace(/^#!.*\n\/\*\n?/, "").replace(/^ \* ?/gm, ""));
    process.exit(opz.aiuto ? 0 : 1);
  }
  let chromium;
  try {
    ({ chromium } = require("playwright"));
  } catch (e) {
    console.error("Playwright non trovato. Nella cartella studio-video esegui: npm install");
    process.exit(1);
  }
  fs.mkdirSync(opz.uscita, { recursive: true });
  const browser = await chromium.launch();
  try {
    const pagina = await browser.newPage();
    pagina.on("pageerror", (e) => console.error("  errore nella pagina:", e.message));
    await pagina.goto(pathToFileURL(path.join(__dirname, "pagina.html")).href);
    for (const file of opz.file) {
      const cartella = path.dirname(path.resolve(file));
      const progetto = incorporaImmagini(JSON.parse(fs.readFileSync(file, "utf8")), cartella);
      const musica = fileMusica(progetto, opz, cartella, require("os").tmpdir());
      console.log(`• ${file}${musica ? `  (musica: ${path.basename(musica)})` : ""}`);
      for (const formato of opz.formati || [progetto.formato || "16:9"]) {
        const destinazione = path.join(opz.uscita, nomeFile(progetto, formato, file));
        await renderizza(pagina, progetto, formato, destinazione, opz, musica);
        console.log(`    → ${destinazione}`);
      }
    }
  } finally {
    await browser.close();
  }
}

principale().catch((e) => {
  console.error("\nErrore:", e.message);
  process.exit(1);
});
