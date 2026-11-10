/*
 * Consegna all'agenzia e ritorno dell'esito (usato da render/produci.js).
 *
 * La pagina per l'agenzia è WHITE-LABEL: c'è il nome (e il logo) dell'agenzia,
 * mai "Studio Video". È una cartella statica (index.html + video), da
 * spedire zippata o pubblicare dove si vuole: niente server, niente account.
 * L'agenzia approva o chiede modifiche video per video; l'esito torna con
 * un'email (se si indica --risposte) o con "Copia esito", e si registra con
 *   node render/produci.js esito --cartella ordini/<cliente> [--file esito.txt]
 */
"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
require("../js/motore.js");
const SV = globalThis.StudioVideo;

const escapeHtml = (t) => String(t == null ? "" : t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// Testi della pagina dell'agenzia (la lingua dell'agenzia, non quella dei video).
const PAGINA = {
  it: {
    titolo: "Video per {cliente}", consegnati: "Consegnati il {data}", istruzioni: "Guardate ogni video in ogni lingua. Per ognuno scegliete «Approvato» oppure «Modifiche» con una nota, poi inviate l'esito in fondo alla pagina.",
    approvato: "Approvato", modifiche: "Modifiche", nota: "Cosa cambiare (scena, testo, formato)…", scarica: "Scarica", formati: "Formati", gia: "già approvato il {data}", nuovo: "nuova versione",
    lingua: "Lingua", inviaEmail: "Invia l'esito per email", copia: "Copia l'esito", copiato: "Esito copiato: incollatelo in una risposta.", mancano: "Mancano {n} decisioni.",
    pronto: "Tutte le decisioni sono prese.", avvisi: "Da sapere prima di pubblicare", oggetto: "Esito video {cliente}", riepilogo: "Riepilogo",
    video: { promo: "Promo", presentazione: "Presentazione", tutorial: "Tutorial" },
  },
  en: {
    titolo: "Videos for {cliente}", consegnati: "Delivered on {data}", istruzioni: "Watch every video in every language. For each one choose “Approved” or “Changes” with a note, then send your feedback at the bottom of the page.",
    approvato: "Approved", modifiche: "Changes", nota: "What to change (scene, text, format)…", scarica: "Download", formati: "Formats", gia: "already approved on {data}", nuovo: "new version",
    lingua: "Language", inviaEmail: "Send feedback by email", copia: "Copy feedback", copiato: "Feedback copied: paste it into a reply.", mancano: "{n} decisions missing.",
    pronto: "All decisions made.", avvisi: "Before publishing", oggetto: "Video feedback {cliente}", riepilogo: "Summary",
    video: { promo: "Promo", presentazione: "Website tour", tutorial: "Tutorial" },
  },
};
const AVVISI = {
  it: {
    traduzione: "Le versioni in {lingue} usano schermate e indirizzo del sito in {principale}, perché il sito non ha una versione in quella lingua.",
    rilettura: "Fate rileggere i testi di ogni lingua da chi conosce il mercato prima di pubblicare.",
    dati: "Nei video non ci sono numeri né recensioni: si aggiungono solo con dati del cliente.",
    audio: "I video sono senza audio: aggiungete la musica nella piattaforma dove pubblicate, se serve.",
  },
  en: {
    traduzione: "The {lingue} versions use screenshots and the web address of the {principale} site, because the site has no version in that language.",
    rilettura: "Have the copy in each language checked by someone who knows that market before publishing.",
    dati: "The videos contain no figures or reviews: they can be added only with the client's own data.",
    audio: "The videos have no audio: add music on the platform where you publish, if needed.",
  },
};
const riempi = (t, v) => t.replace(/\{(\w+)\}/g, (x, k) => (k in v ? v[k] : x));
const nomeLingua = (l) => (SV.LINGUE[l] ? SV.LINGUE[l].nome : l);

function idOrdine(ordine) {
  return `${ordine.cliente}·${ordine.creato}`;
}

/**
 * Crea <cartella>/consegna-agenzia/ con index.html e i video pronti, più lo zip.
 * opz: { agenzia, logo, risposte (email), lingua (della pagina) }
 */
function creaConsegna(cartella, ordine, opz) {
  const L = PAGINA[opz.lingua] ? opz.lingua : "it";
  const T = PAGINA[L];
  const A = AVVISI[L];
  const dest = path.join(cartella, "consegna-agenzia");
  fs.rmSync(dest, { recursive: true, force: true });
  fs.mkdirSync(path.join(dest, "video"), { recursive: true });
  const pronti = (ordine.risultati || []).filter((r) => r.stato === "pronto" && (r.video || []).length);
  if (!pronti.length) throw new Error("nessun video pronto: prima render/produci.js finisci");
  // i file video si copiano (la cartella deve stare in piedi da sola)
  const voci = pronti.map((r) => {
    const file = r.video.map((v) => {
      const nome = path.basename(v);
      fs.copyFileSync(path.join(cartella, v), path.join(dest, "video", nome));
      const formato = (/-(\d+x\d+)\.mp4$/.exec(nome) || [])[1] || "";
      return { nome, formato: formato.replace("x", ":") };
    });
    // copertina del lettore: il gancio già scritto (il primo fotogramma è vuoto)
    const copertina = file[0].nome.replace(/\.mp4$/, ".jpg");
    spawnSync("ffmpeg", ["-loglevel", "error", "-y", "-ss", "2.6", "-i", path.join(dest, "video", file[0].nome), "-frames:v", "1", "-q:v", "4", path.join(dest, "video", copertina)]);
    file[0].copertina = fs.existsSync(path.join(dest, "video", copertina)) ? copertina : "";
    const giaApprovato = r.cliente && r.cliente.stato === "approvato" ? r.cliente.data : "";
    return { tipo: r.tipo, lingua: r.lingua, durata: r.durata, file, giaApprovato, rifatto: !giaApprovato && Boolean(r.clientePrecedente) };
  });
  let logo = "";
  if (opz.logo && fs.existsSync(opz.logo)) {
    logo = `logo${path.extname(opz.logo).toLowerCase()}`;
    fs.copyFileSync(opz.logo, path.join(dest, logo));
  }
  const tradotte = ordine.lingue.filter((l) => !ordine.lingueSito[l]);
  const avvisi = [
    tradotte.length ? riempi(A.traduzione, { lingue: tradotte.map(nomeLingua).join(", "), principale: nomeLingua(ordine.linguaPrincipale) }) : "",
    ordine.lingue.length > 1 ? A.rilettura : "",
    A.dati,
    A.audio,
  ].filter(Boolean);
  const dati = { ordine: idOrdine(ordine), cliente: ordine.cliente, voci, risposte: opz.risposte || "", T, oggetto: riempi(T.oggetto, { cliente: ordine.cliente }) };
  fs.writeFileSync(path.join(dest, "index.html"), paginaAgenzia(dati, { agenzia: opz.agenzia || "", logo, avvisi, lingua: L, data: new Date().toLocaleDateString(L === "en" ? "en-GB" : "it-IT", { day: "numeric", month: "long", year: "numeric" }) }));
  // zip da spedire (se c'è il comando zip; altrimenti si manda la cartella)
  const zip = path.join(cartella, "consegna-agenzia.zip");
  fs.rmSync(zip, { force: true });
  const r = spawnSync("zip", ["-qr", zip, "consegna-agenzia"], { cwd: cartella });
  return { cartella: dest, zip: r.status === 0 ? zip : null, video: voci.reduce((a, v) => a + v.file.length, 0) };
}

function paginaAgenzia(d, o) {
  const T = d.T;
  const schede = d.voci.map((v, i) => {
    const principale = v.file[0];
    const scarica = v.file.map((f) => `<a class="formato" href="video/${escapeHtml(f.nome)}" download>${escapeHtml(f.formato)}</a>`).join("");
    return `<article class="voce" data-i="${i}">
  <div class="schermo"><video src="video/${escapeHtml(principale.nome)}"${principale.copertina ? ` poster="video/${escapeHtml(principale.copertina)}"` : ""} controls preload="none" playsinline></video></div>
  <div class="dettagli">
    <h2>${escapeHtml(T.video[v.tipo] || v.tipo)} <span class="lingua">${escapeHtml(nomeLingua(v.lingua))}</span>${v.giaApprovato ? ` <span class="gia">✓ ${escapeHtml(riempi(T.gia, { data: v.giaApprovato.slice(0, 10) }))}</span>` : v.rifatto ? ` <span class="nuovo">${escapeHtml(T.nuovo)}</span>` : ""}</h2>
    <p class="tenue">${v.durata ? `${v.durata.toFixed(1)} s · ` : ""}${T.formati}: ${v.file.map((f) => escapeHtml(f.formato)).join(", ")}</p>
    <p class="scarica">${T.scarica}: ${scarica}</p>
    <div class="scelta" role="radiogroup">
      <label><input type="radio" name="s${i}" value="approvato"${v.giaApprovato ? " checked" : ""}> ✓ ${T.approvato}</label>
      <label><input type="radio" name="s${i}" value="modifiche"> ✎ ${T.modifiche}</label>
    </div>
    <textarea name="n${i}" rows="2" placeholder="${escapeHtml(T.nota)}" hidden></textarea>
  </div>
</article>`;
  }).join("\n");
  const voci = d.voci.map((v) => ({ video: v.tipo, lingua: v.lingua }));
  return `<!DOCTYPE html>
<html lang="${o.lingua}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${escapeHtml(riempi(T.titolo, { cliente: d.cliente }))}</title>
<style>
  :root{--testo:#16181d;--tenue:#666b76;--bordo:#e3e5ea;--accento:#16181d}
  *{box-sizing:border-box}body{margin:0;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;color:var(--testo);background:#f6f7f9}
  header{background:#fff;border-bottom:1px solid var(--bordo);padding:20px 24px;display:flex;align-items:center;gap:16px}
  header img{height:44px;width:auto}header .agenzia{font-weight:700;font-size:15px;color:var(--tenue)}
  h1{margin:4px 0 0;font-size:24px}.tenue{color:var(--tenue);margin:4px 0}
  main{max-width:1100px;margin:0 auto;padding:20px 16px 120px;display:grid;gap:16px}
  .istruzioni{background:#fff;border:1px solid var(--bordo);border-radius:12px;padding:14px 18px;margin:0}
  .voce{background:#fff;border:1px solid var(--bordo);border-radius:14px;padding:16px;display:grid;grid-template-columns:minmax(0,300px) 1fr;gap:20px;align-items:start}
  .voce.fatta{border-color:#2e9c5a;box-shadow:0 0 0 2px #2e9c5a22}.voce.modifiche{border-color:#d98a00;box-shadow:0 0 0 2px #d98a0022}
  .schermo video{width:100%;max-height:420px;background:#000;border-radius:10px}
  h2{margin:0;font-size:19px}.lingua{font-size:13px;font-weight:600;background:#eef0f4;border-radius:999px;padding:2px 10px;margin-left:6px;text-transform:none}
  .formato{display:inline-block;border:1px solid var(--bordo);border-radius:8px;padding:3px 9px;margin:0 4px 4px 0;color:var(--testo);text-decoration:none;font-size:13px}
  .formato:hover{border-color:var(--testo)}
  .gia{font-size:12px;font-weight:700;color:#2e7d4f;margin-left:6px}.nuovo{font-size:12px;font-weight:700;color:#b06a00;background:#fff3dd;border-radius:999px;padding:2px 8px;margin-left:6px}
  .scelta{display:flex;gap:10px;margin:12px 0 8px;flex-wrap:wrap}.scelta label{border:1px solid var(--bordo);border-radius:10px;padding:8px 14px;cursor:pointer;font-weight:600}
  .scelta input{margin-right:6px}textarea{width:100%;border:1px solid var(--bordo);border-radius:10px;padding:8px 10px;font:inherit}
  .avvisi{background:#fffaf0;border:1px solid #f0dfb8;border-radius:12px;padding:14px 18px}.avvisi h3{margin:0 0 6px;font-size:15px}.avvisi ul{margin:0;padding-left:18px}
  footer{position:fixed;left:0;right:0;bottom:0;background:#fff;border-top:1px solid var(--bordo);padding:12px 16px;display:flex;gap:10px;align-items:center;justify-content:center;flex-wrap:wrap}
  footer button,footer a{border:0;border-radius:10px;padding:10px 16px;font:inherit;font-weight:700;cursor:pointer;background:var(--accento);color:#fff;text-decoration:none}
  footer button.secondario{background:#eef0f4;color:var(--testo)}#stato{color:var(--tenue);font-size:14px}
  pre#esito{display:none}
  @media (max-width:700px){.voce{grid-template-columns:1fr}}
</style>
</head>
<body>
<header>
  ${o.logo ? `<img src="${escapeHtml(o.logo)}" alt="${escapeHtml(o.agenzia)}">` : ""}
  <div>${o.agenzia ? `<div class="agenzia">${escapeHtml(o.agenzia)}</div>` : ""}<h1>${escapeHtml(riempi(T.titolo, { cliente: d.cliente }))}</h1><p class="tenue">${escapeHtml(riempi(T.consegnati, { data: o.data }))}</p></div>
</header>
<main>
<p class="istruzioni">${escapeHtml(T.istruzioni)}</p>
${schede}
<section class="avvisi"><h3>${escapeHtml(T.avvisi)}</h3><ul>${o.avvisi.map((a) => `<li>${escapeHtml(a)}</li>`).join("")}</ul></section>
</main>
<footer>
  <span id="stato"></span>
  ${d.risposte ? `<a id="email" href="#">${escapeHtml(T.inviaEmail)}</a>` : ""}
  <button id="copia" class="${d.risposte ? "secondario" : ""}" type="button">${escapeHtml(T.copia)}</button>
</footer>
<pre id="esito"></pre>
<script>
(function () {
  "use strict";
  var VOCI = ${JSON.stringify(voci)};
  var ORDINE = ${JSON.stringify(d.ordine)};
  var RISPOSTE = ${JSON.stringify(d.risposte)};
  var OGGETTO = ${JSON.stringify(d.oggetto)};
  var NOMI = ${JSON.stringify(T.video)};
  var T = ${JSON.stringify({ approvato: T.approvato, modifiche: T.modifiche, mancano: T.mancano, pronto: T.pronto, copiato: T.copiato, riepilogo: T.riepilogo })};
  var CHIAVE = "esito:" + ORDINE + ":" + ${JSON.stringify(String(Date.now()))};
  var salvato = {};
  try { salvato = JSON.parse(localStorage.getItem(CHIAVE) || "{}"); } catch (e) {}
  function esiti() {
    return VOCI.map(function (v, i) {
      var scelta = document.querySelector('input[name="s' + i + '"]:checked');
      var nota = document.querySelector('textarea[name="n' + i + '"]').value.trim();
      return { video: v.video, lingua: v.lingua, stato: scelta ? scelta.value : "", nota: nota };
    });
  }
  function testoEsito() {
    var e = esiti();
    var righe = [T.riepilogo + ":"];
    e.forEach(function (x) {
      righe.push("- " + (NOMI[x.video] || x.video) + " · " + x.lingua + ": " + (x.stato === "approvato" ? T.approvato : x.stato === "modifiche" ? T.modifiche + " — " + x.nota : "?"));
    });
    righe.push("", "ESITO-JSON " + JSON.stringify({ ordine: ORDINE, esiti: e }));
    return righe.join("\\n");
  }
  function aggiorna() {
    var e = esiti();
    var mancano = e.filter(function (x) { return !x.stato; }).length;
    e.forEach(function (x, i) {
      var scheda = document.querySelector('.voce[data-i="' + i + '"]');
      scheda.classList.toggle("fatta", x.stato === "approvato");
      scheda.classList.toggle("modifiche", x.stato === "modifiche");
      document.querySelector('textarea[name="n' + i + '"]').hidden = x.stato !== "modifiche";
    });
    document.getElementById("stato").textContent = mancano ? T.mancano.replace("{n}", mancano) : T.pronto;
    document.getElementById("esito").textContent = testoEsito();
    var a = document.getElementById("email");
    if (a) a.href = "mailto:" + encodeURIComponent(RISPOSTE) + "?subject=" + encodeURIComponent(OGGETTO) + "&body=" + encodeURIComponent(testoEsito());
    try { localStorage.setItem(CHIAVE, JSON.stringify(e)); } catch (err) {}
  }
  (salvato.length ? salvato : []).forEach(function (x, i) {
    if (x.stato) { var r = document.querySelector('input[name="s' + i + '"][value="' + x.stato + '"]'); if (r) r.checked = true; }
    var t = document.querySelector('textarea[name="n' + i + '"]'); if (t && x.nota) t.value = x.nota;
  });
  document.addEventListener("input", aggiorna);
  document.addEventListener("change", aggiorna);
  document.getElementById("copia").addEventListener("click", function () {
    var testo = testoEsito();
    (navigator.clipboard ? navigator.clipboard.writeText(testo) : Promise.reject()).then(function () {
      document.getElementById("stato").textContent = T.copiato;
    }, function () { window.prompt("", testo); });
  });
  aggiorna();
})();
</script>
</body>
</html>
`;
}

// Legge l'esito incollato dall'agenzia (email o "Copia l'esito") e lo registra nell'ordine.
function applicaEsito(ordine, testo) {
  const m = /ESITO-JSON\s+(\{[\s\S]*\})\s*$/m.exec(String(testo).replace(/\r/g, ""));
  if (!m) throw new Error("nel testo non c'è la riga ESITO-JSON (incolla tutto il messaggio dell'agenzia)");
  let esito;
  try {
    esito = JSON.parse(m[1]);
  } catch (e) {
    throw new Error(`ESITO-JSON non leggibile: ${e.message}`);
  }
  if (esito.ordine !== idOrdine(ordine)) throw new Error(`l'esito è di un altro ordine ("${esito.ordine}")`);
  const data = new Date().toISOString();
  let registrati = 0;
  for (const e of esito.esiti || []) {
    const r = (ordine.risultati || []).find((x) => x.tipo === e.video && x.lingua === e.lingua);
    if (!r || !e.stato) continue;
    if (r.cliente && r.cliente.stato === "approvato" && e.stato === "approvato") continue; // già approvato: resta la data originale
    r.cliente = { stato: e.stato, nota: e.nota || "", data };
    delete r.clientePrecedente;
    registrati++;
  }
  ordine.esitoCliente = data;
  return registrati;
}

module.exports = { creaConsegna, applicaEsito, idOrdine };
