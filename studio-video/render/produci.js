#!/usr/bin/env node
/*
 * Dal link del sito ai video in N lingue (la parte meccanica della squadra).
 *
 *   node render/produci.js prepara <indirizzo> --cliente "Nome" --lingue it,en,de
 *        [--video promo,presentazione,tutorial] [--tema carta] [--marca marche.json [--solo nome]]
 *        [--cartella ordini/<cliente>]
 *     cattura il sito in ogni lingua che ha una versione (hreflang, /en/, "English"...),
 *     scrive le bozze dei video con i testi DEL SITO in quella lingua, e per le
 *     lingue senza versione del sito prepara il foglio testi per il localizzatore.
 *
 *   node render/produci.js finisci [--cartella ordini/<cliente>] [--formati 9:16,16:9,1:1,4:5] [--senza-video]
 *     controlla ogni video × lingua, fa i provini, rende tutti i formati e scrive
 *     revisione.html (per approvare in pochi minuti) e consegna.md.
 *
 * In mezzo lavora la squadra (comando /produci in Claude Code): migliora i testi,
 * traduce le lingue mancanti, sistema i ritocchi. Niente numeri né recensioni
 * inventati: le bozze non hanno scene "numeri" e "citazione".
 * La cartella ordini/ non va nel repository (materiale dei clienti).
 */
"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
require("../js/motore.js");
require("../js/modelli.js");
require("../js/marca.js");
const SV = globalThis.StudioVideo;
const { catturaSito } = require("./cattura-sito.js");
const { leggiMarche } = require("./render.js");

const RADICE = path.resolve(__dirname, "..");
const VIDEO_PREDEFINITI = ["promo", "presentazione"];
const FORMATI_PREDEFINITI = ["9:16", "16:9", "1:1", "4:5"];

const sicuro = (t) => String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "cliente";
const parole = (t) => String(t || "").split(/\s+/).filter(Boolean).length;
const ora = () => new Date().toISOString();

function argomenti(argv) {
  const o = { comando: argv[0], url: null };
  for (let i = 1; i < argv.length; i++) {
    const a = argv[i];
    const v = () => argv[++i];
    if (a === "--cliente") o.cliente = v();
    else if (a === "--lingue") o.lingue = v().split(",").map((x) => x.trim()).filter(Boolean);
    else if (a === "--video") o.video = v().split(",").map((x) => x.trim()).filter(Boolean);
    else if (a === "--formati") o.formati = v().split(",").map((x) => x.trim()).filter(Boolean);
    else if (a === "--tema") o.tema = v();
    else if (a === "--marca") o.marca = v();
    else if (a === "--solo") o.solo = v().toLowerCase();
    else if (a === "--cartella") o.cartella = v();
    else if (a === "--senza-video") o.senzaVideo = true;
    else if (a.startsWith("--")) throw new Error(`opzione sconosciuta: ${a}`);
    else o.url = a;
  }
  return o;
}

// --------------------------------------------------- bozza dai testi del sito

// Titoli di sezione generici (non sono vantaggi): ne usiamo uno come titolo dei punti.
const GENERICI = /^(perch[eé]|why|warum|pourquoi|por qu[eé]|porqu[eê]|waarom|dlaczego|chi siamo|about|über uns|qui sommes|sobre|over ons|o nas|contatt|contact|kontakt|newsletter|faq|blog|servizi|services|leistungen|prodotti|products|produkte|i nostri|our |unsere|nos |nuestr|scopri|discover|entdecken|découvr|descubr)/i;

function nomeDaTitolo(sito) {
  const parti = String(sito.titolo || "").split(/\s+[—–|·:-]\s+/);
  const primo = (parti[0] || "").trim();
  if (primo && parole(primo) <= 4) return primo;
  try {
    return new URL(sito.indirizzo).hostname.replace(/^www\./, "").split(".")[0].replace(/^./, (c) => c.toUpperCase());
  } catch (e) {
    return primo || "Cliente";
  }
}

function accorcia(testo, massimo) {
  const p = String(testo || "").split(/\s+/).filter(Boolean);
  if (p.length <= massimo) return p.join(" ");
  // taglia alla fine di una frase se possibile, altrimenti alle parole
  const frase = /^(.+?[.!?])\s/.exec(p.join(" ") + " ");
  if (frase && parole(frase[1]) <= massimo) return frase[1];
  return p.slice(0, massimo).join(" ").replace(/[,;:]$/, "") + "…";
}

function scegliAccento(sito) {
  for (const c of (sito.colori && sito.colori.accentiCandidati) || []) {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const sat = Math.max(r, g, b) - Math.min(r, g, b);
    if (lum > 40 && lum < 220 && sat > 60) return c; // né quasi nero né quasi bianco, abbastanza vivo
  }
  return "";
}

function scegliTema(sito) {
  const m = /rgba?\((\d+), (\d+), (\d+)/.exec((sito.colori && sito.colori.sfondoPagina) || "");
  const lum = m ? 0.2126 * m[1] + 0.7152 * m[2] + 0.0722 * m[3] : 255;
  return lum < 90 ? "inchiostro" : "carta";
}

/** Dati per i modelli presi dal sito, nella sua lingua. Mancanze → [[...]] (verifica le blocca). */
function datiDaSito(sito, lingua) {
  const T = SV.testiModello(lingua);
  const h = sito.titoli || [];
  const h1 = h[0] || "";
  const vantaggi = h.slice(1).filter((t) => !GENERICI.test(t) && parole(t) >= 2 && parole(t) <= 9);
  if (vantaggi.length < 3) {
    for (const p of sito.paragrafi || []) if (parole(p) >= 2 && parole(p) <= 9 && !vantaggi.includes(p)) vantaggi.push(p);
  }
  const titoloPunti = h.slice(1).find((t) => GENERICI.test(t) && parole(t) <= 6) || T.puntiTitolo;
  const pulsante = (sito.pulsanti || []).find((p) => parole(p) >= 1 && parole(p) <= 4);
  let indirizzo = "";
  try {
    const u = new URL(sito.indirizzo);
    indirizzo = (u.hostname.replace(/^www\./, "") + u.pathname).replace(/\/$/, "");
  } catch (e) {
    /* indirizzo locale */
  }
  return {
    nome: nomeDaTitolo(sito),
    slogan: parole(h1) && parole(h1) <= 10 ? h1 : accorcia(sito.descrizione || h1, 10),
    descrizione: accorcia(sito.descrizione || (sito.paragrafi || [])[0] || "", 22),
    vantaggi: (vantaggi.length ? vantaggi.slice(0, 5) : ["[[vantaggio vero dal sito]]"]).join("\n"),
    titoloPunti,
    invito: pulsante || T.ctaPulsante,
    url: indirizzo,
    lingua,
  };
}

// Pagine lunghe: la scena "schermata" le farebbe scorrere troppo in fretta.
function ritaglia(cartellaSito, file, rapporto) {
  const sorgente = path.join(cartellaSito, file);
  const uscita = path.join(cartellaSito, file.replace(/\.jpg$/, "-corta.jpg"));
  if (!fs.existsSync(sorgente)) return file;
  const r = spawnSync("ffmpeg", ["-loglevel", "error", "-y", "-i", sorgente, "-vf", `crop=iw:min(ih\\,iw*${rapporto}):0:0`, "-q:v", "3", uscita]);
  return r.status === 0 ? path.basename(uscita) : file;
}

function bozza(tipo, dati, cartellaSito, relSito, opz) {
  const immagini = {
    telefono: ritaglia(cartellaSito, "telefono-pagina.jpg", 3.2),
    computer: ritaglia(cartellaSito, "computer-pagina.jpg", 2.2),
    schermo: "computer-schermo.jpg",
  };
  const logo = fs.readdirSync(cartellaSito).find((f) => /^logo\.(png|jpg|svg)$/.test(f));
  const comune = Object.assign({}, dati, { logo: logo ? `${relSito}/${logo}` : "", tema: opz.tema || opz.temaSito, accento: opz.accento });
  let p;
  if (tipo === "promo") {
    p = SV.MODELLI.promo.crea(Object.assign({}, comune, { formato: "9:16", immagine: `${relSito}/${immagini.telefono}` }));
    p.scene[1].titolo = dati.titoloPunti;
  } else if (tipo === "presentazione") {
    p = SV.MODELLI.presentazione.crea(Object.assign({}, comune, { formato: "16:9", immagine: `${relSito}/${immagini.computer}` }));
    p.scene = p.scene.filter((s) => s.tipo !== "numeri" && s.tipo !== "citazione"); // niente dati inventati
    p.scene[2].titolo = dati.titoloPunti;
  } else if (tipo === "tutorial") {
    const sito = JSON.parse(fs.readFileSync(path.join(cartellaSito, "sito.json"), "utf8"));
    const T = SV.testiModello(dati.lingua);
    // passi: pulsanti in vista sul primo schermo, poi voci di menu (da verificare a mano)
    const punti = (sito.cliccabili || []).filter((c) => c.testo && parole(c.testo) <= 4 && c.y > 0.02 && c.y < 0.98);
    const ordinati = [...punti.filter((c) => (sito.pulsanti || []).includes(c.testo)), ...punti.filter((c) => !(sito.pulsanti || []).includes(c.testo))].slice(0, 3);
    p = SV.MODELLI.tutorial.crea(Object.assign({}, comune, { formato: "16:9", immagine: `${relSito}/${immagini.schermo}`, vantaggi: ordinati.map((c) => c.testo).join("\n") }));
    const scena = p.scene.find((s) => s.tipo === "tutorial");
    scena.passi = ordinati.map((c) => ({ testo: c.testo, x: c.x, y: c.y }));
    if (!scena.passi.length) scena.passi = [{ testo: "[[passo vero del percorso]]", x: 0.5, y: 0.5 }];
    p.nota = `passi ricavati dai pulsanti del primo schermo: da verificare (${T.tutorial})`;
  } else {
    throw new Error(`video "${tipo}" sconosciuto (promo, presentazione, tutorial)`);
  }
  // chiusura: niente "Provalo adesso" di riserva, il nome del cliente sopra il SUO pulsante
  const cta = p.scene.find((x) => x.tipo === "cta");
  if (cta) cta.titolo = dati.nome;
  p.nome = `${dati.nome} — ${tipo}`;
  if (opz.marca) SV.applicaMarca(p, opz.marca);
  // ogni scena dura almeno il tempo per leggerla (al mezzo secondo)
  for (const sc of p.scene) sc.durata = Math.max(sc.durata, Math.ceil(SV.durataMinima(sc) * 2) / 2);
  return p;
}

// ------------------------------------------------------------- prepara

async function prepara(o) {
  if (!o.url) throw new Error("manca l'indirizzo del sito");
  if (!o.lingue || !o.lingue.length) throw new Error("manca --lingue (es. --lingue it,en,de)");
  for (const l of o.lingue) if (!SV.LINGUE[l]) throw new Error(`lingua "${l}" non supportata (${Object.keys(SV.LINGUE).join(", ")})`);
  const video = o.video || VIDEO_PREDEFINITI;
  const cliente = o.cliente || "cliente";
  const cartella = path.resolve(o.cartella || path.join(RADICE, "ordini", sicuro(cliente)));
  fs.mkdirSync(cartella, { recursive: true });
  const marca = o.marca ? leggiMarche(o.marca, o.solo)[0] : null;
  const ordine = { cliente, indirizzo: o.url, lingue: o.lingue, video, creato: ora(), tempi: {}, lingueSito: {}, daTradurre: [] };
  const { chromium } = require("playwright");
  const browser = await chromium.launch();
  const inizio = Date.now();
  let principale;
  try {
    // 1. la pagina data; se è in un'altra lingua e c'è la versione nella lingua principale, si parte da quella
    console.log(`• cattura ${o.url}`);
    const prima = await catturaSito(o.url, path.join(cartella, "sito", "_ingresso"), { browser });
    const lingua0 = o.lingue[0];
    const urlPer = (l) => (prima.versioni && prima.versioni[l]) || ((prima.lingua || lingua0) === l ? o.url : null);
    for (const l of o.lingue) {
      const u = urlPer(l);
      if (!u) continue;
      const dest = path.join(cartella, "sito", l);
      if (u === o.url && (prima.lingua || lingua0) === l) {
        fs.rmSync(dest, { recursive: true, force: true });
        fs.cpSync(path.join(cartella, "sito", "_ingresso"), dest, { recursive: true });
      } else {
        console.log(`• cattura versione ${l}: ${u}`);
        await catturaSito(u, dest, { browser });
      }
      ordine.lingueSito[l] = u;
    }
    fs.rmSync(path.join(cartella, "sito", "_ingresso"), { recursive: true, force: true });
    principale = ordine.lingueSito[lingua0] ? lingua0 : Object.keys(ordine.lingueSito)[0];
    if (!principale) throw new Error("nessuna lingua richiesta corrisponde al sito: cattura fallita");
  } finally {
    await browser.close();
  }
  ordine.linguaPrincipale = principale;
  ordine.tempi.cattura = Math.round((Date.now() - inizio) / 1000);

  // 2. bozze: per ogni lingua con versione del sito, testi del sito in quella lingua
  const sitoPrincipale = JSON.parse(fs.readFileSync(path.join(cartella, "sito", principale, "sito.json"), "utf8"));
  const temaSito = scegliTema(sitoPrincipale);
  const accento = scegliAccento(sitoPrincipale);
  const verifiche = [];
  for (const l of o.lingue) {
    const conSito = Boolean(ordine.lingueSito[l]);
    for (const tipo of video) {
      const file = l === principale ? `${tipo}.json` : `${tipo}-${l}.json`;
      if (conSito) {
        const sito = JSON.parse(fs.readFileSync(path.join(cartella, "sito", l, "sito.json"), "utf8"));
        const p = bozza(tipo, datiDaSito(sito, l), path.join(cartella, "sito", l), `sito/${l}`, { tema: o.tema, temaSito, accento, marca });
        p.nome = `${p.nome} ${l}`; // file MP4 distinti per lingua
        fs.writeFileSync(path.join(cartella, file), JSON.stringify(p, null, 2) + "\n");
        verifiche.push(file);
      }
    }
  }
  // 3. lingue senza versione del sito: fogli testi dalla lingua principale, per il localizzatore
  for (const l of o.lingue.filter((x) => !ordine.lingueSito[x])) {
    for (const tipo of video) {
      const foglio = path.join(cartella, `testi-${tipo}-${l}.json`);
      spawnSync(process.execPath, [path.join(__dirname, "testi.js"), "estrai", path.join(cartella, `${tipo}.json`), "--uscita", foglio], { stdio: "ignore" });
      const f = JSON.parse(fs.readFileSync(foglio, "utf8"));
      f.daTradurreIn = l;
      f.istruzioni = `DA TRADURRE in ${SV.LINGUE[l].nome}: cambia solo "testo". ${f.istruzioni} Poi: node render/testi.js applica ${tipo}.json testi-${tipo}-${l}.json --lingua ${l} --uscita ${tipo}-${l}.json`;
      fs.writeFileSync(foglio, JSON.stringify(f, null, 2) + "\n");
    }
    ordine.daTradurre.push(l);
  }
  fs.writeFileSync(path.join(cartella, "ordine.json"), JSON.stringify(ordine, null, 2) + "\n");
  scriviBrief(cartella, ordine, sitoPrincipale);

  console.log(`\n${cliente}: lingua principale ${principale}; dal sito: ${Object.keys(ordine.lingueSito).join(", ")}${ordine.daTradurre.length ? `; da tradurre: ${ordine.daTradurre.join(", ")}` : ""}`);
  for (const f of verifiche) {
    const r = spawnSync(process.execPath, [path.join(__dirname, "verifica.js"), path.join(cartella, f)], { encoding: "utf8" });
    process.stdout.write(r.stdout.replace(/^/gm, "  "));
  }
  console.log(`\nBozze in ${cartella}\nDopo la squadra (o subito, per una prova): node render/produci.js finisci --cartella ${path.relative(process.cwd(), cartella) || "."}`);
}

function scriviBrief(cartella, ordine, sito) {
  const file = path.join(cartella, "brief.md");
  if (fs.existsSync(file)) return; // il regista può averlo già scritto
  const lingue = ordine.lingue.map((l) => `${SV.LINGUE[l].nome}${ordine.lingueSito[l] ? " (dal sito)" : " (da tradurre)"}`).join(", ");
  fs.writeFileSync(file, `# Brief — ${ordine.cliente}

Scritto da \`render/produci.js\`; il regista completa le parti [[...]].

| | |
|---|---|
| Sito | ${ordine.indirizzo} |
| Titolo del sito | ${sito.titolo || "—"} |
| Lingue | ${lingue} |
| Video | ${ordine.video.join(", ")} |
| Pubblico | [[chi deve guardare il video]] |
| Obiettivo | [[una sola azione]] |
| Tono | [[es. caldo, artigianale]] |
| Cosa NON dire | numeri, recensioni, "gratis", "il migliore" se il sito non li dimostra |

Versioni del sito trovate: ${Object.entries(ordine.lingueSito).map(([l, u]) => `${l} → ${u}`).join(" · ") || "nessuna"}.
${ordine.daTradurre.length ? `Senza versione del sito (fogli \`testi-*-<lingua>.json\` per il localizzatore; le catture restano nella lingua principale): ${ordine.daTradurre.join(", ")}.` : ""}
`);
}

// ------------------------------------------------------------- finisci

function finisci(o) {
  const cartella = path.resolve(o.cartella || ".");
  const fileOrdine = path.join(cartella, "ordine.json");
  if (!fs.existsSync(fileOrdine)) throw new Error(`${cartella}: manca ordine.json (prima: produci.js prepara)`);
  const ordine = JSON.parse(fs.readFileSync(fileOrdine, "utf8"));
  const formati = o.formati || FORMATI_PREDEFINITI;
  const righe = [];
  const daRendere = [];
  const inizio = Date.now();
  for (const tipo of ordine.video) {
    for (const l of ordine.lingue) {
      const file = l === ordine.linguaPrincipale ? `${tipo}.json` : `${tipo}-${l}.json`;
      const pieno = path.join(cartella, file);
      const riga = { tipo, lingua: l, file, dalSito: Boolean(ordine.lingueSito[l]) };
      if (!fs.existsSync(pieno)) {
        riga.stato = fs.existsSync(path.join(cartella, `testi-${tipo}-${l}.json`)) ? "da tradurre" : "mancante";
        righe.push(riga);
        continue;
      }
      const v = spawnSync(process.execPath, [path.join(__dirname, "verifica.js"), pieno], { encoding: "utf8" });
      riga.verifica = v.stdout.trim().split("\n").slice(1).map((x) => x.trim());
      riga.ok = v.status === 0;
      const p = JSON.parse(fs.readFileSync(pieno, "utf8"));
      riga.durata = SV.durataTotale(SV.normalizzaProgetto(p));
      spawnSync(process.execPath, [path.join(__dirname, "fotogrammi.js"), pieno, "--uscita", path.join(cartella, "provini"), "--colonne", "5"], { stdio: "ignore" });
      riga.foglio = `provini/${path.basename(file, ".json")}-${(p.formato || "16:9").replace(":", "x")}-foglio.jpg`;
      riga.stato = riga.ok ? "pronto" : "bloccato";
      if (riga.ok) daRendere.push(pieno);
      righe.push(riga);
    }
  }
  ordine.tempi.controlli = Math.round((Date.now() - inizio) / 1000);
  if (daRendere.length && !o.senzaVideo) {
    const t0 = Date.now();
    const cartellaVideo = path.join(cartella, "video");
    const precedenti = new Map((ordine.risultati || []).map((r) => [r.file, r]));
    for (const riga of righe.filter((x) => x.stato === "pronto")) {
      // già reso e il progetto non è cambiato: si tengono gli MP4 che ci sono
      const prima = precedenti.get(riga.file);
      const mtime = (f) => (fs.existsSync(f) ? fs.statSync(f).mtimeMs : 0);
      // si rifà anche se è cambiato il motore (stesso progetto, disegno diverso)
      const progettoMs = Math.max(mtime(path.join(cartella, riga.file)), mtime(path.join(RADICE, "js", "motore.js")));
      if (prima && prima.video && prima.video.length === formati.length && prima.formati && prima.formati.join() === formati.join()
        && prima.video.every((v) => mtime(path.join(cartella, v)) > progettoMs)) {
        riga.video = prima.video;
        riga.formati = formati;
        console.log(`• ${riga.tipo} · ${riga.lingua}: già reso, invariato`);
        continue;
      }
      console.log(`• rendo ${riga.tipo} · ${riga.lingua} × ${formati.length} formati`);
      riga.formati = formati;
      // un progetto alla volta: i nomi veri dei file si leggono dall'uscita (→ percorso)
      const r = spawnSync(process.execPath, [path.join(__dirname, "render.js"), path.join(cartella, riga.file), "--formati", formati.join(","), "--uscita", cartellaVideo], { encoding: "utf8" });
      riga.video = (r.stdout.match(/→ (.+\.mp4)/g) || []).map((x) => path.relative(cartella, path.resolve(x.slice(2).trim())).split(path.sep).join("/"));
      if (r.status !== 0) {
        riga.stato = "rendering fallito";
        riga.verifica = (riga.verifica || []).concat(`✖ ${(r.stderr.trim().split("\n").pop() || "errore di rendering").trim()}`);
        console.error(`  ! ${riga.file}: rendering fallito`);
      }
    }
    ordine.tempi.rendering = Math.round((Date.now() - t0) / 1000);
  }
  ordine.finito = ora();
  ordine.risultati = righe;
  fs.writeFileSync(fileOrdine, JSON.stringify(ordine, null, 2) + "\n");
  fs.writeFileSync(path.join(cartella, "revisione.html"), paginaRevisione(ordine, righe));
  fs.writeFileSync(path.join(cartella, "consegna.md"), consegna(ordine, righe, formati));
  for (const r of righe) console.log(`  ${r.stato === "pronto" ? "✓" : r.stato === "bloccato" ? "✖" : "…"} ${r.tipo} · ${r.lingua} · ${r.stato}${r.video ? ` · ${r.video.length} MP4` : ""}`);
  console.log(`\nApri ${path.join(cartella, "revisione.html")} per approvare; riepilogo in consegna.md`);
}

const escapeHtml = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

function paginaRevisione(ordine, righe) {
  const blocchi = righe.map((r) => {
    const nomeLingua = SV.LINGUE[r.lingua].nome;
    const testa = `<h2>${escapeHtml(r.tipo)} · ${escapeHtml(nomeLingua)} <span class="stato ${r.stato.replace(/\s/g, "-")}">${escapeHtml(r.stato)}</span></h2>`;
    if (r.stato === "da tradurre") return `<section>${testa}<p>Foglio <code>testi-${r.tipo}-${r.lingua}.json</code> in attesa del localizzatore.</p></section>`;
    if (r.stato === "mancante") return `<section>${testa}<p>Progetto mancante.</p></section>`;
    const verifica = (r.verifica || []).map((x) => `<li>${escapeHtml(x)}</li>`).join("");
    const video = (r.video || []).map((v) => `<figure><video src="${escapeHtml(v)}" controls preload="metadata"></video><figcaption>${escapeHtml(v.split("-").pop().replace(".mp4", "").replace("x", ":"))}</figcaption></figure>`).join("");
    return `<section>${testa}
<p class="tenue">${escapeHtml(r.file)} · ${r.durata ? r.durata.toFixed(1) : "?"} s · ${r.dalSito ? "il sito ha una versione in questa lingua (catture nella stessa lingua)" : "tradotto: catture nella lingua principale"}</p>
<ul class="verifica">${verifica}</ul>
<img class="foglio" src="${escapeHtml(r.foglio)}" alt="provini">
<div class="video">${video}</div>
<label class="ok"><input type="checkbox"> Approvato (${escapeHtml(nomeLingua)}): testi giusti, niente promesse non dimostrabili, nessun taglio</label>
</section>`;
  }).join("\n");
  return `<!DOCTYPE html>
<html lang="it"><head><meta charset="utf-8"><title>Revisione — ${escapeHtml(ordine.cliente)}</title>
<style>
body{font-family:system-ui,sans-serif;margin:0;background:#f3eee3;color:#121212}
header{padding:20px 28px;background:#121212;color:#fff}header p{margin:4px 0 0;opacity:.8}
main{padding:20px 28px;display:grid;gap:20px}
section{background:#fff;border:2px solid #121212;border-radius:12px;padding:16px 20px;box-shadow:4px 4px 0 #121212}
h2{margin:0 0 6px;font-size:20px}.tenue{color:#666;margin:0 0 8px}
.stato{font-size:12px;padding:2px 8px;border-radius:999px;border:2px solid #121212;vertical-align:middle}
.pronto{background:#9dffc6}.bloccato,.rendering-fallito{background:#ff9d9d}.da-tradurre,.mancante{background:#ffe24a}
.foglio{max-width:100%;border:2px solid #121212;border-radius:6px;margin:8px 0}
.video{display:flex;flex-wrap:wrap;gap:12px}figure{margin:0}video{height:260px;border:2px solid #121212;border-radius:6px;background:#000}
figcaption{font-size:12px;text-align:center}.ok{display:block;margin-top:10px;font-weight:700}
.verifica{margin:0;padding-left:18px;font-size:13px}
</style></head><body>
<header><h1>${escapeHtml(ordine.cliente)}</h1><p>${escapeHtml(ordine.indirizzo)} · lingue: ${ordine.lingue.join(", ")} · creato ${escapeHtml(ordine.creato.slice(0, 16).replace("T", " "))}</p>
<p>Guarda ogni video in ogni lingua, poi segna i minuti spesi in consegna.md. Obiettivo: ≤ 20 minuti per video e ≤ 8 per ogni lingua in più.</p></header>
<main>
${blocchi}
</main></body></html>
`;
}

function consegna(ordine, righe, formati) {
  const tabella = righe.map((r) => `| ${r.tipo} | ${SV.LINGUE[r.lingua].nome} | ${r.dalSito ? "sì" : "no: catture in lingua principale"} | ${r.durata ? `${r.durata.toFixed(1)} s` : "—"} | ${r.stato} | ${(r.video || []).length}/${formati.length} |`).join("\n");
  const bloccati = righe.filter((r) => r.stato === "bloccato" || r.stato === "rendering fallito").map((r) => `- **${r.tipo} · ${r.lingua}**: ${(r.verifica || []).filter((x) => x.startsWith("✖")).join(" · ")}`).join("\n");
  return `# Consegna — ${ordine.cliente}

Generata da \`render/produci.js finisci\` il ${ordine.finito.slice(0, 16).replace("T", " ")}. Pagina per approvare: \`revisione.html\`.

| Video | Lingua | Versione del sito | Durata | Stato | MP4 |
|---|---|---|---|---|---|
${tabella}

${bloccati ? `## Bloccati (da sistemare prima della consegna)\n\n${bloccati}\n` : ""}
## Tempi

| | |
|---|---|
| Macchina: cattura | ${ordine.tempi.cattura ?? "—"} s |
| Macchina: controlli e provini | ${ordine.tempi.controlli ?? "—"} s |
| Macchina: rendering | ${ordine.tempi.rendering ?? "—"} s |
| **Minuti umani** (da compilare: revisione, ritocchi, approvazione) | [[minuti]] |

## Da dichiarare all'agenzia

- Le lingue con testi "traduzione" mostrano catture del sito nella lingua principale.
- Numeri e recensioni non sono stati inseriti: si aggiungono solo con dati del cliente.
- Ogni lingua va approvata dall'agenzia o dal suo cliente prima della pubblicazione.
`;
}

// ------------------------------------------------------------- avvio

(async () => {
  const o = argomenti(process.argv.slice(2));
  if (o.comando === "prepara") await prepara(o);
  else if (o.comando === "finisci") finisci(o);
  else {
    console.log(fs.readFileSync(__filename, "utf8").split("*/")[0].replace(/^#!.*\n\/\*\n?/, "").replace(/^ \* ?/gm, ""));
    process.exit(1);
  }
})().catch((e) => {
  console.error("Errore:", e.message);
  process.exit(1);
});
