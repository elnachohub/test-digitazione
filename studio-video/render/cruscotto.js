#!/usr/bin/env node
/*
 * Cruscotto degli ordini: ordini/index.html con tutti gli ordini, la fase di
 * ognuno, cosa aspetta chi, video pronti, valore in corso.
 *
 *   node render/cruscotto.js [--cartella ordini]
 *
 * Si rigenera da solo a ogni passo di render/produci.js (prepara, finisci,
 * consegna, esito). È una pagina statica: si apre anche senza server.
 */
"use strict";

const fs = require("fs");
const path = require("path");
require("../js/motore.js");
const SV = globalThis.StudioVideo;

const RADICE = path.resolve(__dirname, "..");
const escapeHtml = (t) => String(t == null ? "" : t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// Fase dell'ordine e prossima azione (chi deve muoversi).
function fase(ordine, cartella) {
  const r = ordine.risultati || [];
  const conta = (f) => r.filter(f).length;
  const lati = { pronti: conta((x) => x.stato === "pronto"), totali: r.length || ordine.lingue.length * ordine.video.length };
  if (ordine.esitoCliente) {
    const modifiche = r.filter((x) => x.cliente && x.cliente.stato === "modifiche");
    const approvati = conta((x) => x.cliente && x.cliente.stato === "approvato");
    if (modifiche.length) return { nome: "Modifiche richieste", classe: "rosso", azione: `Squadra: ${modifiche.map((x) => `${x.tipo} ${x.lingua} — “${x.cliente.nota || "senza nota"}”`).join(" · ")}`, ...lati, approvati };
    if (approvati >= lati.pronti) return { nome: "Approvato dal cliente", classe: "verde", azione: "Fatturare e chiudere", ...lati, approvati };
    return { nome: "Esito parziale", classe: "giallo", azione: "Sollecitare l'agenzia per i video senza decisione", ...lati, approvati };
  }
  if (ordine.consegnaAgenzia) return { nome: "In attesa dell'agenzia", classe: "blu", azione: `Inviato il ${ordine.consegnaAgenzia.slice(0, 10)}: aspettare l'esito`, ...lati };
  if (!r.length) return { nome: "Bozze pronte", classe: "giallo", azione: "Squadra: testi, look, traduzioni (/produci), poi finisci", ...lati };
  const daTradurre = conta((x) => x.stato === "da tradurre");
  const bloccati = conta((x) => x.stato === "bloccato" || x.stato === "rendering fallito");
  if (bloccati) return { nome: "Bloccato", classe: "rosso", azione: `${bloccati} video bloccati: vedi consegna.md`, ...lati };
  if (daTradurre) return { nome: "In lavorazione", classe: "giallo", azione: `Localizzatore: ${daTradurre} video da tradurre`, ...lati };
  if (!fs.existsSync(path.join(cartella, "revisione.md"))) return { nome: "Da rivedere", classe: "giallo", azione: "Revisore: controllare i video", ...lati };
  return { nome: "Pronto da consegnare", classe: "verde-chiaro", azione: "Regista: render/produci.js consegna", ...lati };
}

function leggiOrdini(base) {
  if (!fs.existsSync(base)) return [];
  return fs.readdirSync(base, { withFileTypes: true })
    .filter((d) => d.isDirectory() && fs.existsSync(path.join(base, d.name, "ordine.json")))
    .map((d) => {
      const cartella = path.join(base, d.name);
      const ordine = JSON.parse(fs.readFileSync(path.join(cartella, "ordine.json"), "utf8"));
      return { cartella: d.name, ordine, fase: fase(ordine, cartella) };
    })
    .sort((a, b) => String(b.ordine.creato).localeCompare(String(a.ordine.creato)));
}

function scriviCruscotto(base = path.join(RADICE, "ordini")) {
  const ordini = leggiOrdini(base);
  const mp4 = ordini.reduce((a, o) => a + (o.ordine.risultati || []).reduce((b, r) => b + (r.video || []).length, 0), 0);
  const attesa = ordini.filter((o) => o.fase.nome === "In attesa dell'agenzia").length;
  const chiusi = ordini.filter((o) => o.fase.nome === "Approvato dal cliente").length;
  const valore = {};
  for (const o of ordini) if (o.ordine.prezzo) valore[o.ordine.prezzo.valuta] = (valore[o.ordine.prezzo.valuta] || 0) + o.ordine.prezzo.importo;
  const macchina = ordini.reduce((a, o) => a + Object.values(o.ordine.tempi || {}).reduce((b, x) => b + (Number(x) || 0), 0), 0);
  const link = (o, file, testo) => (fs.existsSync(path.join(base, o.cartella, file)) ? `<a href="${escapeHtml(`${o.cartella}/${file}`)}">${testo}</a>` : "");
  const righe = ordini.map((o) => {
    const ord = o.ordine;
    const celle = ord.video.map((tipo) => ord.lingue.map((l) => {
      const r = (ord.risultati || []).find((x) => x.tipo === tipo && x.lingua === l);
      const c = r && r.cliente ? r.cliente.stato : r ? r.stato : "bozza";
      const simbolo = { approvato: "✓", modifiche: "✎", pronto: "●", "da tradurre": "…", bloccato: "✖", "rendering fallito": "✖", bozza: "○" }[c] || "?";
      return `<span class="cella ${escapeHtml(c.replace(/\s/g, "-"))}" title="${escapeHtml(`${tipo} · ${l}: ${c}`)}">${simbolo} ${escapeHtml(l)}</span>`;
    }).join("")).map((x, i) => `<div class="riga-video"><b>${escapeHtml(ord.video[i])}</b>${x}</div>`).join("");
    return `<tr>
  <td><strong>${escapeHtml(ord.cliente)}</strong><div class="tenue">${escapeHtml(ord.indirizzo)}</div><div class="tenue">${escapeHtml(String(ord.creato).slice(0, 10))}${ord.prezzo ? ` · ${ord.prezzo.importo} ${escapeHtml(ord.prezzo.valuta)}` : ""}</div></td>
  <td><span class="fase ${o.fase.classe}">${escapeHtml(o.fase.nome)}</span><div class="azione">${escapeHtml(o.fase.azione)}</div></td>
  <td>${celle}</td>
  <td class="numeri">${o.fase.pronti}/${o.fase.totali}${o.fase.approvati != null ? `<div class="tenue">${o.fase.approvati} approvati</div>` : ""}</td>
  <td class="link">${[link(o, "revisione.html", "Revisione"), link(o, "consegna.md", "Consegna"), link(o, "consegna-agenzia/index.html", "Pagina agenzia"), link(o, "revisione.md", "Note revisore")].filter(Boolean).join("<br>")}</td>
</tr>`;
  }).join("\n");
  const html = `<!DOCTYPE html>
<html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Cruscotto ordini — Studio Video</title>
<style>
  body{margin:0;font-family:"SV Bricolage",system-ui,sans-serif;background:#f3eee3;color:#121212}
  header{padding:22px 28px;background:#fffdf7;border-bottom:2px solid #121212;display:flex;align-items:baseline;gap:14px;flex-wrap:wrap}
  h1{margin:0;font-size:26px}.tenue{color:#6d6658;font-size:12.5px}
  .kpi{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;padding:18px 28px}
  .kpi div{background:#fff;border:2px solid #121212;border-radius:12px;padding:12px 16px;box-shadow:3px 3px 0 #121212}
  .kpi b{display:block;font-size:28px}.kpi span{font-size:13px;color:#6d6658}
  main{padding:0 28px 40px}table{width:100%;border-collapse:separate;border-spacing:0;background:#fff;border:2px solid #121212;border-radius:12px;overflow:hidden}
  th,td{padding:12px 14px;text-align:left;vertical-align:top;border-bottom:1px solid #e9e2d3}th{background:#121212;color:#fff;font-size:13px}
  tr:last-child td{border-bottom:0}.fase{display:inline-block;font-weight:800;font-size:13px;border:2px solid #121212;border-radius:999px;padding:2px 10px}
  .verde{background:#9dffc6}.verde-chiaro{background:#d8ffe8}.giallo{background:#ffe24a}.blu{background:#b9c6ff}.rosso{background:#ff9d9d}
  .azione{font-size:12.5px;margin-top:6px;max-width:340px}.riga-video{margin-bottom:4px;font-size:13px}.riga-video b{display:inline-block;min-width:96px;text-transform:capitalize}
  .cella{display:inline-block;margin:0 4px 2px 0;padding:1px 7px;border-radius:6px;border:1px solid #d6d0c2;font-size:12px}
  .cella.approvato{background:#9dffc6}.cella.modifiche{background:#ff9d9d}.cella.pronto{background:#eaf7ff}.cella.da-tradurre,.cella.bozza{background:#fff6c2}.cella.bloccato{background:#ff9d9d}
  .numeri{font-weight:800}.link a{color:#121212;font-weight:700}
  .vuoto{padding:40px;text-align:center}
</style></head><body>
<header><h1>Cruscotto ordini</h1><span class="tenue">aggiornato ${escapeHtml(new Date().toLocaleString("it-IT"))} · si rigenera a ogni passo di render/produci.js</span></header>
<section class="kpi">
  <div><b>${ordini.length}</b><span>ordini</span></div>
  <div><b>${mp4}</b><span>MP4 pronti</span></div>
  <div><b>${attesa}</b><span>in attesa dell'agenzia</span></div>
  <div><b>${chiusi}</b><span>approvati dal cliente</span></div>
  <div><b>${Object.entries(valore).map(([v, n]) => `${n.toLocaleString("it-IT")} ${escapeHtml(v)}`).join(" + ") || "—"}</b><span>valore degli ordini</span></div>
  <div><b>${Math.round(macchina / 60)} min</b><span>tempo macchina totale</span></div>
</section>
<main>${ordini.length ? `<table><thead><tr><th>Cliente</th><th>Fase e prossima azione</th><th>Video × lingua</th><th>Pronti</th><th>Apri</th></tr></thead><tbody>${righe}</tbody></table>` : `<p class="vuoto">Nessun ordine. Si comincia con: node render/produci.js prepara &lt;sito&gt; --cliente "Nome" --lingue it,en</p>`}
<p class="tenue">Legenda: ○ bozza · … da tradurre · ● pronto · ✓ approvato dal cliente · ✎ modifiche richieste · ✖ bloccato</p></main>
</body></html>
`;
  fs.mkdirSync(base, { recursive: true });
  const file = path.join(base, "index.html");
  fs.writeFileSync(file, html);
  return { file, ordini: ordini.length };
}

module.exports = { scriviCruscotto };

if (require.main === module) {
  const i = process.argv.indexOf("--cartella");
  const r = scriviCruscotto(i > 0 ? path.resolve(process.argv[i + 1]) : undefined);
  console.log(`${r.ordini} ordini → ${r.file}`);
}
