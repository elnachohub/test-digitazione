#!/usr/bin/env node
/*
 * Il moltiplicatore di lingue: un video → N lingue (attrezzo del localizzatore).
 *
 *   node render/testi.js estrai progetto.json [--uscita testi.json]
 *       foglio con tutti i testi del video, la scena, il limite di parole e la durata
 *
 *   node render/testi.js applica progetto.json testi-en.json --lingua en [--uscita progetto-en.json] [--durate-fisse] [--sito en]
 *       rimette i testi tradotti, imposta la lingua del video e allunga le scene
 *       se il testo tradotto chiede più tempo di lettura (0,8 s + 1 s ogni 3,5 parole)
 *
 * --sito en: le immagini prese da una cartella "sito/<lingua>/" passano a
 *   "sito/en/" se lì c'è lo stesso file (catture della versione inglese del sito),
 *   e l'indirizzo mostrato nel video diventa quello della versione inglese.
 * Nel foglio si cambia SOLO "testo". Nomi del cliente e del sito non si traducono.
 * Le immagini con percorso relativo restano giuste anche se l'uscita è in un'altra cartella.
 */
"use strict";

const fs = require("fs");
const path = require("path");
require("../js/motore.js");
require("../js/modelli.js");
const SV = globalThis.StudioVideo;

const LIMITI = { titolo: 8, sottotitolo: 14, etichetta: 3, pulsante: 4, punti: 9, passi: 8, testo: 30, ruolo: 6, etichettaValore: 5 };
const parole = (t) => String(t || "").split(/\s+/).filter(Boolean).length;
const lettura = (n) => 0.8 + n / 3.5;
const conLettere = (t) => /\p{L}/u.test(String(t || ""));

// Tutti i testi visibili di un progetto, con la chiave per ritrovarli.
function voci(progetto) {
  const out = [];
  progetto.scene.forEach((sc, i) => {
    const base = { scena: i + 1, tipo: sc.tipo, durata: sc.durata };
    const aggiungi = (chiave, campo, testo, limite) => {
      if (testo == null || !String(testo).trim()) return;
      out.push(Object.assign({ chiave }, base, { campo, limite: limite ? `≤ ${limite} parole` : "", testo: String(testo) }));
    };
    for (const k of ["etichetta", "titolo", "sottotitolo", "testo", "pulsante", "ruolo"]) {
      // nella recensione "testo" è la citazione del cliente: si traduce, ma resta sua
      aggiungi(`scene.${i}.${k}`, k, sc[k], LIMITI[k]);
    }
    (sc.punti || []).forEach((p, j) => aggiungi(`scene.${i}.punti.${j}`, "punto", p, LIMITI.punti));
    (sc.passi || []).forEach((p, j) => aggiungi(`scene.${i}.passi.${j}.testo`, "passo", p.testo, LIMITI.passi));
    (sc.valori || []).forEach((v, j) => {
      aggiungi(`scene.${i}.valori.${j}.etichetta`, "etichetta del numero", v.etichetta, LIMITI.etichettaValore);
      for (const k of ["prefisso", "suffisso"]) if (conLettere(v[k])) aggiungi(`scene.${i}.valori.${j}.${k}`, k, v[k]);
    });
  });
  return out;
}

function imposta(obj, chiave, valore) {
  const parti = chiave.split(".");
  let o = obj;
  for (const p of parti.slice(0, -1)) {
    if (o == null) return false;
    o = o[p];
  }
  if (o == null || !(parti[parti.length - 1] in o)) return false;
  o[parti[parti.length - 1]] = valore;
  return true;
}

// Percorsi relativi delle immagini ricalcolati per la cartella di uscita.
function spostaImmagini(progetto, da, a) {
  const sposta = (p) => (!p || /^(data:|https?:)/i.test(p) ? p : path.relative(a, path.resolve(da, p)).split(path.sep).join("/"));
  if (progetto.marchio) progetto.marchio.logo = sposta(progetto.marchio.logo);
  for (const sc of progetto.scene) {
    if (sc.immagine) sc.immagine = sposta(sc.immagine);
    if (sc.logo) sc.logo = sposta(sc.logo);
    if (sc.sfondo && sc.sfondo.immagine) sc.sfondo.immagine = sposta(sc.sfondo.immagine);
  }
}

function leggiJSON(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (e) {
    throw new Error(`${file}: ${e.code === "ENOENT" ? "file non trovato" : `JSON non valido (${e.message})`}`);
  }
}

function scriviUscita(oggetto, uscita) {
  const testo = JSON.stringify(oggetto, null, 2) + "\n";
  if (uscita) fs.writeFileSync(uscita, testo);
  else process.stdout.write(testo);
}

function estrai(fileProgetto, uscita) {
  const p = SV.normalizzaProgetto(leggiJSON(fileProgetto));
  const foglio = {
    tipo: "studio-video-testi",
    progetto: path.basename(fileProgetto),
    lingua: p.lingua,
    istruzioni: "Cambia solo 'testo'. Rispetta il limite di parole. Non tradurre nomi di cliente, prodotto e sito. Non aggiungere promesse o numeri.",
    testi: voci(p),
  };
  scriviUscita(foglio, uscita);
  if (uscita) console.error(`${foglio.testi.length} testi (${p.lingua}) → ${uscita}`);
}

// Catture della stessa lingua del video, se la versione del sito esiste.
function immaginiDelSito(progetto, linguaSito, cartellaProgetto, avvisi) {
  const cambia = (p) => {
    if (!p || /^(data:|https?:)/i.test(p)) return p;
    const nuovo = p.replace(/(^|\/)sito\/[a-z]{2}\//, `$1sito/${linguaSito}/`);
    if (nuovo !== p && fs.existsSync(path.resolve(cartellaProgetto, nuovo))) return nuovo;
    if (nuovo !== p) avvisi.push(`immagine senza versione ${linguaSito}, resta quella originale: ${p}`);
    return p;
  };
  if (progetto.marchio) progetto.marchio.logo = cambia(progetto.marchio.logo);
  for (const sc of progetto.scene) {
    for (const k of ["immagine", "logo"]) if (sc[k]) sc[k] = cambia(sc[k]);
    if (sc.sfondo && sc.sfondo.immagine) sc.sfondo.immagine = cambia(sc.sfondo.immagine);
  }
  // indirizzo della versione del sito in quella lingua (barra del browser e chiusura)
  const fileSito = path.resolve(cartellaProgetto, "sito", linguaSito, "sito.json");
  if (!fs.existsSync(fileSito)) return;
  try {
    const u = new URL(JSON.parse(fs.readFileSync(fileSito, "utf8")).indirizzo);
    const nuovo = (u.hostname.replace(/^www\./, "") + u.pathname).replace(/\/$/, "");
    const vecchio = (progetto.marchio && progetto.marchio.url) || "";
    for (const sc of progetto.scene) if (sc.url && sc.url === vecchio) sc.url = nuovo;
    if (progetto.marchio) progetto.marchio.url = nuovo;
  } catch (e) {
    avvisi.push(`indirizzo della versione ${linguaSito} non leggibile: resta ${progetto.marchio && progetto.marchio.url}`);
  }
}

function applica(fileProgetto, fileTesti, lingua, uscita, durateFisse, linguaSito) {
  if (!SV.LINGUE[lingua]) throw new Error(`lingua "${lingua}" non supportata (lingue: ${Object.keys(SV.LINGUE).join(", ")})`);
  const p = SV.normalizzaProgetto(leggiJSON(fileProgetto));
  const originale = JSON.parse(JSON.stringify(p));
  const foglio = leggiJSON(fileTesti);
  if (!Array.isArray(foglio.testi)) throw new Error(`${fileTesti}: manca l'elenco "testi"`);
  const prima = new Map(voci(originale).map((v) => [v.chiave, v.testo]));
  const avvisi = [];
  for (const v of foglio.testi) {
    if (!prima.has(v.chiave)) {
      avvisi.push(`chiave sconosciuta, ignorata: ${v.chiave}`);
      continue;
    }
    const vecchio = prima.get(v.chiave);
    const nuovo = String(v.testo == null ? "" : v.testo);
    const segni = (t) => (t.match(/\{\w+\}|\[\[[^\]]*\]\]/g) || []).sort().join(" ");
    if (segni(vecchio) !== segni(nuovo)) avvisi.push(`${v.chiave}: segnaposto diversi dall'originale ("${segni(vecchio)}" → "${segni(nuovo)}")`);
    if (nuovo === vecchio && conLettere(nuovo) && parole(nuovo) > 1) avvisi.push(`${v.chiave}: identico all'originale (non tradotto?): "${nuovo}"`);
    const limite = parseInt(String(v.limite || "").replace(/\D/g, ""), 10);
    if (limite && parole(nuovo) > limite) avvisi.push(`${v.chiave}: ${parole(nuovo)} parole, limite ${limite}`);
    imposta(p, v.chiave, nuovo);
    prima.delete(v.chiave);
  }
  for (const k of prima.keys()) avvisi.push(`testo non presente nel foglio, resta com'era: ${k}`);

  // durate: se la traduzione chiede più tempo di lettura, la scena si allunga (al mezzo secondo)
  if (!durateFisse) {
    const totParole = (pr, i) => voci(pr).filter((v) => v.scena === i + 1).reduce((a, v) => a + parole(v.testo), 0);
    p.scene.forEach((sc, i) => {
      const extra = lettura(totParole(p, i)) - lettura(totParole(originale, i));
      if (extra > 0.05) {
        const nuova = Math.min(60, Math.ceil((sc.durata + extra) * 2) / 2);
        avvisi.push(`scena ${i + 1}: durata ${sc.durata} → ${nuova} s (testo più lungo)`);
        sc.durata = nuova;
      }
    });
  }
  if (linguaSito) immaginiDelSito(p, linguaSito, path.dirname(path.resolve(fileProgetto)), avvisi);
  p.lingua = lingua;
  const nomeBase = String(originale.nome || path.basename(fileProgetto, ".json")).replace(new RegExp(`\\s${originale.lingua}$`), "");
  p.nome = `${nomeBase} ${lingua}`;
  if (uscita) spostaImmagini(p, path.dirname(path.resolve(fileProgetto)), path.dirname(path.resolve(uscita)));
  scriviUscita(p, uscita);
  avvisi.forEach((a) => console.error(`  ⚠ ${a}`));
  if (uscita) console.error(`${lingua}: ${foglio.testi.length} testi applicati → ${uscita}`);
}

function principale(argv) {
  const [comando, ...resto] = argv;
  const valore = (k) => (resto.indexOf(k) >= 0 ? resto[resto.indexOf(k) + 1] : null);
  const file = resto.filter((a, i) => !a.startsWith("--") && !["--uscita", "--lingua", "--sito"].includes(resto[i - 1]));
  if (comando === "estrai" && file[0]) return estrai(file[0], valore("--uscita"));
  if (comando === "applica" && file[0] && file[1] && valore("--lingua")) return applica(file[0], file[1], valore("--lingua"), valore("--uscita"), resto.includes("--durate-fisse"), valore("--sito"));
  console.log(fs.readFileSync(__filename, "utf8").split("*/")[0].replace(/^#!.*\n\/\*\n?/, "").replace(/^ \* ?/gm, ""));
  process.exit(1);
}

try {
  principale(process.argv.slice(2));
} catch (e) {
  console.error("Errore:", e.message);
  process.exit(1);
}
