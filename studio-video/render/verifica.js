#!/usr/bin/env node
/*
 * Controllo automatico di un progetto prima del rendering (attrezzo del revisore).
 *
 *   node render/verifica.js progetto.json [--marca marche.json] [--piattaforma reels|youtube|sito]
 *
 * ✖ errore (il video esce rotto)   ⚠ avviso (il video esce, ma peggiore)
 * Esce con codice 1 se ci sono errori.
 */
"use strict";

const fs = require("fs");
const path = require("path");
require("../js/motore.js");
require("../js/modelli.js");
require("../js/marca.js");
const SV = globalThis.StudioVideo;
const { leggiMarche } = require("./render.js");

const argv = process.argv.slice(2);
const file = argv.find((a) => !a.startsWith("--") && argv[argv.indexOf(a) - 1] !== "--marca" && argv[argv.indexOf(a) - 1] !== "--piattaforma");
const valore = (k) => (argv.indexOf(k) >= 0 ? argv[argv.indexOf(k) + 1] : null);
if (!file) {
  console.log(fs.readFileSync(__filename, "utf8").split("*/")[0].replace(/^#!.*\n\/\*\n?/, "").replace(/^ \* ?/gm, ""));
  process.exit(1);
}

let p;
try {
  p = JSON.parse(fs.readFileSync(file, "utf8"));
} catch (e) {
  console.log(`${path.basename(file)}\n  ✖ ${e.code === "ENOENT" ? "file non trovato" : `JSON non valido: ${e.message}`}`);
  process.exit(1);
}
const correzioni = [];
try {
  SV.normalizzaProgetto(p, correzioni);
} catch (e) {
  console.log(`${path.basename(file)}\n  ✖ ${e.message}`);
  process.exit(1);
}
const cartella = path.dirname(path.resolve(file));
if (valore("--marca")) p = SV.applicaMarca(p, leggiMarche(valore("--marca"))[0]);
const piattaforma = valore("--piattaforma") || (p.formato === "9:16" ? "reels" : "youtube");

const errori = [];
const avvisi = correzioni.map((c) => `tipo sbagliato nel JSON, corretto in lettura: ${c}`);
const vuoti = SV.daCompilare(p);
if (vuoti.length) errori.push(`testi da compilare [[...]] nelle scene ${vuoti.map((i) => i + 1).join(", ")}: servono dati veri (numeri e recensioni non si inventano)`);
const parole = (t) => String(t || "").split(/\s+/).filter(Boolean).length;
// tempo per leggere: ~3,5 parole al secondo + 0,8 s per agganciare lo sguardo
const lettura = (n) => 0.8 + n / 3.5;

if (!SV.FORMATI[p.formato]) errori.push(`formato "${p.formato}" sconosciuto (validi: ${Object.keys(SV.FORMATI).join(", ")})`);
if (!SV.TEMI[p.tema]) errori.push(`tema "${p.tema}" sconosciuto (validi: ${Object.keys(SV.TEMI).join(", ")})`);
if (p.carattere && !SV.CARATTERI[p.carattere]) errori.push(`carattere "${p.carattere}" sconosciuto`);
if (p.animazione && !SV.ANIMAZIONI[p.animazione]) errori.push(`animazione "${p.animazione}" sconosciuta`);
if (!Array.isArray(p.scene) || !p.scene.length) errori.push("nessuna scena");

const scene = p.scene || [];
const totale = SV.durataTotale(p);
const limiti = { reels: [6, 35], youtube: [10, 75], sito: [10, 60] }[piattaforma] || [6, 90];
if (totale > limiti[1]) avvisi.push(`durata ${totale.toFixed(1)} s: lunga per ${piattaforma} (ideale ≤ ${limiti[1]} s)`);
if (totale < limiti[0]) avvisi.push(`durata ${totale.toFixed(1)} s: troppo corta`);
if (scene.length && scene[scene.length - 1].tipo !== "cta") avvisi.push("l'ultima scena non è un invito all'azione (cta)");
if (scene[0] && scene[0].durata > 4) avvisi.push(`apertura di ${scene[0].durata} s: sui social il gancio deve arrivare entro 3 s`);

// Parole che promettono qualcosa: vanno dimostrate (e una traduzione non deve aggiungerle).
const PROMESSE = /\b(gratis|gratuit[oaie]|garantit[oaie]|garanzia|il migliore|la migliore|n\.?\s?1|numero uno|free|guarantee[ds]?|best|no\.?\s?1|number one|kostenlos|gratis|garantiert|beste[rn]?|gratuit[e]?|garanti[e]?|meilleur[e]?|gratuit[oa]|garantizad[oa]|mejor|grátis|garantid[oa]|melhor|darmowy|gwarantowan[ya]|najlepsz[ya]|gratis|gegarandeerd|beste)\b/iu;
const promesse = [];
const resti = new Set();
const cercaSegnaposto = (t) => {
  const m = PROMESSE.exec(String(t || ""));
  if (m) promesse.push(`"${m[0]}" in: ${String(t).slice(0, 60)}`);
  return String(t || "").replace(/\{(\w+)\}/g, (x, k) => resti.add(k));
};

scene.forEach((sc, i) => {
  const n = `scena ${i + 1} (${sc.tipo})`;
  if (!SV.SCENE[sc.tipo]) return errori.push(`${n}: tipo sconosciuto (validi: ${Object.keys(SV.SCENE).join(", ")})`);
  const d = Number(sc.durata) || 0;
  if (d < 1) errori.push(`${n}: durata ${d} s (minimo 1)`);
  for (const k of ["titolo", "sottotitolo", "testo", "pulsante", "etichetta"]) cercaSegnaposto(sc[k]);
  (sc.punti || []).forEach(cercaSegnaposto);
  (sc.passi || []).forEach((q) => cercaSegnaposto(q.testo));
  const tit = String(sc.titolo || "");
  if (tit.length > 70) avvisi.push(`${n}: titolo di ${tit.length} caratteri (oltre 70 diventa piccolo)`);
  if (["titolo", "punti", "cta"].includes(sc.tipo) && !tit.trim() && !(sc.tipo === "punti")) avvisi.push(`${n}: titolo vuoto`);
  if (sc.tipo === "titolo" && parole(sc.sottotitolo) > 14) avvisi.push(`${n}: sottotitolo di ${parole(sc.sottotitolo)} parole (≤ 14)`);
  let testoScena = parole(sc.titolo) + parole(sc.sottotitolo) + parole(sc.testo);
  if (sc.tipo === "punti") {
    const pt = (sc.punti || []).filter((x) => String(x).trim());
    if (!pt.length) errori.push(`${n}: nessun punto`);
    if (pt.length > 6) avvisi.push(`${n}: ${pt.length} punti, se ne vedono solo 6`);
    pt.forEach((x, k) => parole(x) > 9 && avvisi.push(`${n}: punto ${k + 1} di ${parole(x)} parole (≤ 9, si legge in un colpo d'occhio)`));
    testoScena += pt.reduce((a, x) => a + parole(x), 0);
    const minima = 0.45 + pt.length * 0.5 + lettura(testoScena) * 0.6;
    if (d < minima) avvisi.push(`${n}: ${d} s per ${pt.length} punti; servono almeno ${minima.toFixed(1)} s per leggerli`);
  } else if (sc.tipo === "citazione") {
    testoScena += parole(sc.testo);
    if (parole(sc.testo) > 30) avvisi.push(`${n}: recensione di ${parole(sc.testo)} parole (≤ 30)`);
    if (d < lettura(testoScena)) avvisi.push(`${n}: ${d} s, ne servono ~${lettura(testoScena).toFixed(1)} per leggerla`);
  } else if (sc.tipo === "tutorial") {
    const passi = sc.passi || [];
    if (!passi.length) errori.push(`${n}: nessun passo`);
    passi.forEach((q, k) => {
      if (!(q.x >= 0 && q.x <= 1 && q.y >= 0 && q.y <= 1)) errori.push(`${n}: passo ${k + 1} fuori dall'immagine (x,y vanno da 0 a 1)`);
      if (parole(q.testo) > 8) avvisi.push(`${n}: passo ${k + 1} di ${parole(q.testo)} parole (≤ 8)`);
    });
    if (passi.length && d / passi.length < 2.2) avvisi.push(`${n}: ${(d / passi.length).toFixed(1)} s per passo (≥ 2.2 per seguirli)`);
    if (!sc.immagine) avvisi.push(`${n}: senza schermata, si vede un sito finto`);
  } else if (sc.tipo === "schermata") {
    if (!sc.immagine) avvisi.push(`${n}: senza schermata, si vede un sito finto`);
  } else if (sc.tipo === "numeri") {
    if (!(sc.valori || []).length) errori.push(`${n}: nessun numero`);
  } else if (sc.tipo === "cta") {
    if (!String(sc.pulsante || "").trim()) avvisi.push(`${n}: pulsante senza testo`);
    if (parole(sc.pulsante) > 4) avvisi.push(`${n}: pulsante di ${parole(sc.pulsante)} parole (≤ 4)`);
  } else if (d < lettura(testoScena) * 0.8) {
    avvisi.push(`${n}: ${d} s, ne servono ~${lettura(testoScena).toFixed(1)} per leggere ${testoScena} parole`);
  }
  for (const src of [sc.immagine, sc.logo, sc.sfondo && sc.sfondo.immagine]) {
    if (src && !/^(data:|https?:)/i.test(src) && !fs.existsSync(path.resolve(cartella, src))) errori.push(`${n}: immagine non trovata: ${src}`);
  }
  for (const [id, r] of Object.entries(sc.regola || {})) {
    if (r.scala && (r.scala < 0.3 || r.scala > 3)) avvisi.push(`${n}: "${id}" scalato a ${r.scala} (fuori 0.3–3)`);
    if (Math.abs(r.dx || 0) > 45 || Math.abs(r.dy || 0) > 45) avvisi.push(`${n}: "${id}" spostato quasi fuori schermo (dx ${r.dx}, dy ${r.dy})`);
  }
});
if (resti.size && !valore("--marca")) avvisi.push(`segnaposto da riempire con una marca: ${[...resti].map((k) => `{${k}}`).join(" ")} (usa --marca)`);
else if (resti.size) errori.push(`segnaposto sconosciuti: ${[...resti].map((k) => `{${k}}`).join(" ")}`);

promesse.forEach((x) => avvisi.push(`affermazione da dimostrare (il sito del cliente deve dirlo, la traduzione non deve aggiungerla): ${x}`));

console.log(`${path.basename(file)} · ${p.formato} · ${scene.length} scene · ${totale.toFixed(1)} s · ${piattaforma}`);
errori.forEach((e) => console.log(`  ✖ ${e}`));
avvisi.forEach((a) => console.log(`  ⚠ ${a}`));
if (!errori.length && !avvisi.length) console.log("  ✓ tutto a posto");
process.exit(errori.length ? 1 : 0);
