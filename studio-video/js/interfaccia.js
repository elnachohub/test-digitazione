/*
 * Lingua dell'INTERFACCIA dell'editor (la lingua dei VIDEO è un'altra cosa:
 * è nel progetto, campo "lingua").
 *
 * Metodo "la frase è la chiave": nel codice i testi restano in italiano e
 * SV.t("Esporta video") cerca la traduzione nel dizionario della lingua scelta
 * (js/lingue-ui.js). Se manca, resta l'italiano: niente si rompe.
 * Variabili: SV.t("{n} marche", { n: 3 }).
 *
 * Le scritte statiche di index.html si traducono da sole al caricamento;
 * quelle create dall'editor passano da SV.t (anche dentro elemento()).
 * Controllo dei dizionari: node test/stringhe-ui.js
 */
(function (globale) {
  "use strict";

  const SV = (globale.StudioVideo = globale.StudioVideo || {});
  const CHIAVE = "studio-video-lingua";

  // Lingue dell'interfaccia: nome scritto nella lingua stessa.
  // Solo le lingue in cui diamo anche assistenza (decisione del CEO): il tedesco arriva col mercato DACH.
  const LINGUE_UI = { it: "Italiano", en: "English" };

  function scegliLingua() {
    try {
      const salvata = localStorage.getItem(CHIAVE);
      if (salvata && LINGUE_UI[salvata]) return salvata;
    } catch (e) {
      /* localStorage non disponibile */
    }
    for (const l of navigator.languages || [navigator.language || ""]) {
      const breve = String(l).slice(0, 2).toLowerCase();
      if (LINGUE_UI[breve]) return breve;
    }
    return "en"; // fuori dalle lingue note: inglese, non italiano
  }

  const lingua = scegliLingua();
  document.documentElement.lang = lingua;

  function t(testo, valori) {
    let out = String(testo == null ? "" : testo);
    if (lingua !== "it") {
      const diz = (SV.DIZIONARI && SV.DIZIONARI[lingua]) || {};
      if (Object.prototype.hasOwnProperty.call(diz, out)) out = diz[out];
      else if (SV.registraMancante) SV.registraMancante(out);
    }
    if (valori) out = out.replace(/\{(\w+)\}/g, (x, k) => (k in valori ? valori[k] : x));
    return out;
  }

  // Traduce le scritte già presenti nella pagina (testi e attributi visibili).
  const ATTRIBUTI = ["placeholder", "title", "aria-label", "label", "content"];
  function traduciPagina(radice = document.body) {
    if (lingua === "it") return;
    const giro = document.createTreeWalker(radice, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => (n.parentElement && /^(SCRIPT|STYLE|TEXTAREA)$/.test(n.parentElement.tagName) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
    });
    const nodi = [];
    while (giro.nextNode()) nodi.push(giro.currentNode);
    for (const n of nodi) {
      const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(n.nodeValue);
      if (m[2] && /\p{L}/u.test(m[2])) n.nodeValue = m[1] + t(m[2].replace(/\s+/g, " ")) + m[3];
    }
    for (const e of radice.querySelectorAll("[placeholder], [title], [aria-label], optgroup[label]")) {
      for (const a of ATTRIBUTI) if (e.hasAttribute(a) && a !== "content") e.setAttribute(a, t(e.getAttribute(a)));
    }
    document.title = t(document.title);
    const descr = document.querySelector('meta[name="description"]');
    if (descr) descr.content = t(descr.content);
  }

  function cambiaLingua(nuova) {
    try {
      localStorage.setItem(CHIAVE, nuova);
    } catch (e) {
      /* pazienza: vale fino alla ricarica */
    }
    location.reload();
  }

  Object.assign(SV, { LINGUE_UI, linguaUI: lingua, t, traduciPagina, cambiaLingua });
})(window);
