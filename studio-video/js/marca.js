/*
 * Marche di Studio Video: logica pura (nessun archivio, nessuna interfaccia).
 *
 * Una marca è il "kit" di un cliente: nome, sito, logo, testi ricorrenti e,
 * soprattutto, il look e i ritocchi a mano per ogni tipo di scena. Si salva
 * una volta dopo aver sistemato un video; da lì ogni nuovo video nasce già
 * sistemato.
 *
 * Funziona nel browser (editor) e in Node (render/render.js --marca).
 */
(function (globale) {
  "use strict";

  const SV = (globale.StudioVideo = globale.StudioVideo || {});

  const VERSIONE_MARCA = 1;
  const clona = (x) => (x == null ? x : JSON.parse(JSON.stringify(x)));

  function nuovoId() {
    if (globale.crypto && globale.crypto.randomUUID) return globale.crypto.randomUUID();
    return `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }

  // Porta qualsiasi oggetto (anche vecchio o importato) alla forma attuale.
  function normalizzaMarca(m) {
    const ora = new Date().toISOString();
    const x = m && typeof m === "object" ? m : {};
    const scene = {};
    for (const [tipo, st] of Object.entries(x.scene || {})) {
      if (!st || typeof st !== "object") continue;
      const voce = {};
      if (st.regola && Object.keys(st.regola).length) voce.regola = clona(st.regola);
      if (st.animazione) voce.animazione = st.animazione;
      if (st.sfondo && st.sfondo.tipo && st.sfondo.tipo !== "tema") voce.sfondo = clona(st.sfondo);
      if (Object.keys(voce).length) scene[tipo] = voce;
    }
    return {
      versione: VERSIONE_MARCA,
      id: String(x.id || nuovoId()),
      nome: String(x.nome || "").trim() || "Senza nome",
      url: String(x.url || "").trim(),
      logo: String(x.logo || ""),
      slogan: String(x.slogan || ""),
      vantaggi: Array.isArray(x.vantaggi) ? x.vantaggi.join("\n") : String(x.vantaggi || ""),
      invito: String(x.invito || ""),
      note: String(x.note || ""),
      tema: String(x.tema || "limone"),
      accento: String(x.accento || ""),
      carattere: String(x.carattere || "auto"),
      animazione: String(x.animazione || "auto"),
      transizione: String(x.transizione || "dissolvenza"),
      formato: String(x.formato || "9:16"),
      lingua: String(x.lingua || "it"),
      scene,
      anteprima: String(x.anteprima || ""),
      creata: x.creata || ora,
      modificata: x.modificata || ora,
      usi: Number(x.usi) || 0,
      ultimoUso: x.ultimoUso || "",
    };
  }

  // Prende dal progetto il look e i ritocchi (il primo di ogni tipo di scena vince).
  function estraiMarca(progetto, base) {
    const m = Object.assign({}, base || {});
    const marchio = progetto.marchio || {};
    m.nome = marchio.nome || m.nome || progetto.nome;
    m.url = marchio.url || m.url || "";
    m.logo = marchio.logo || m.logo || "";
    for (const k of ["tema", "accento", "carattere", "animazione", "transizione", "formato", "lingua"]) m[k] = progetto[k] || "";
    const scene = {};
    for (const sc of progetto.scene || []) {
      if (scene[sc.tipo]) continue;
      scene[sc.tipo] = { regola: sc.regola, animazione: sc.animazione, sfondo: sc.sfondo };
    }
    m.scene = scene;
    if (!m.invito) {
      const cta = (progetto.scene || []).find((s) => s.tipo === "cta" && s.pulsante);
      if (cta) m.invito = cta.pulsante;
    }
    m.modificata = new Date().toISOString();
    return normalizzaMarca(m);
  }

  // Sostituisce la parola intera (per il nome della marca dentro i testi).
  function sostituisciNome(testo, vecchio, nuovo) {
    if (typeof testo !== "string" || !vecchio || vecchio === nuovo) return testo;
    const sicuro = vecchio.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return testo.replace(new RegExp(`(^|[^\\p{L}\\p{N}])${sicuro}(?=$|[^\\p{L}\\p{N}])`, "gu"), `$1${nuovo}`);
  }

  // Segnaposto per la stampa unione: nei testi del modello si scrive {slogan},
  // {invito}, {vantaggio1}... e ogni marca ci mette i suoi.
  function segnaposti(m) {
    const vantaggi = String(m.vantaggi || "").split("\n").map((v) => v.trim()).filter(Boolean);
    const mappa = { nome: m.nome, slogan: m.slogan, invito: m.invito, url: m.url, sito: m.url.replace(/^https?:\/\//, "").replace(/\/$/, "") };
    for (let i = 0; i < 6; i++) mappa[`vantaggio${i + 1}`] = vantaggi[i] || "";
    return { mappa, vantaggi };
  }
  const SEGNAPOSTO = /\{(nome|slogan|invito|url|sito|vantaggio[1-6])\}/g;
  function riempi(testo, mappa) {
    return typeof testo === "string" ? testo.replace(SEGNAPOSTO, (x, k) => mappa[k] || "") : testo;
  }

  /**
   * Applica la marca al progetto (lo modifica e lo restituisce):
   * look, marchio, ritocchi per tipo di scena; il nome della marca vecchia
   * nei testi diventa quello nuovo; gli indirizzi vecchi tornano "del marchio".
   */
  function applicaMarca(progetto, marca) {
    const m = normalizzaMarca(marca);
    const vecchio = Object.assign({ nome: "", url: "" }, progetto.marchio);
    progetto.tema = m.tema;
    progetto.accento = m.accento;
    progetto.carattere = m.carattere;
    progetto.animazione = m.animazione;
    progetto.transizione = m.transizione;
    progetto.marchio = { nome: m.nome, url: m.url, logo: m.logo };
    progetto.marcaId = m.id;
    const campiTesto = ["titolo", "sottotitolo", "testo", "etichetta", "pulsante", "autore", "ruolo"];
    const { mappa, vantaggi } = segnaposti(m);
    const sistema = (t) => riempi(sostituisciNome(t, vecchio.nome, m.nome), mappa);
    for (const sc of progetto.scene || []) {
      for (const k of campiTesto) sc[k] = sistema(sc[k]);
      if (Array.isArray(sc.punti)) {
        // {vantaggi} da solo su una riga = tutti i vantaggi della marca
        sc.punti = sc.punti.flatMap((p) => (String(p).trim() === "{vantaggi}" ? vantaggi : [sistema(p)])).filter((p) => String(p).trim());
      }
      if (Array.isArray(sc.passi)) for (const p of sc.passi) p.testo = sistema(p.testo);
      if (sc.url && (sc.url === vecchio.url || sc.url === m.url)) sc.url = "";
      const st = m.scene[sc.tipo];
      if (!st) continue;
      if (st.regola) sc.regola = clona(st.regola);
      else delete sc.regola;
      if (st.animazione) sc.animazione = st.animazione;
      else delete sc.animazione;
      if (st.sfondo) sc.sfondo = clona(st.sfondo);
      else delete sc.sfondo;
    }
    return progetto;
  }

  // Dati per il generatore rapido a partire dalla marca.
  function datiDaMarca(marca) {
    const m = normalizzaMarca(marca);
    return { nome: m.nome, url: m.url, logo: m.logo, slogan: m.slogan, vantaggi: m.vantaggi, invito: m.invito, tema: m.tema, carattere: m.carattere, formato: m.formato, lingua: m.lingua };
  }

  // Riassunto leggibile del look (per schede e conferme).
  function riassuntoLook(marca) {
    const m = normalizzaMarca(marca);
    const tema = (SV.TEMI && SV.TEMI[m.tema] && SV.TEMI[m.tema].nome) || m.tema;
    const ritocchi = Object.values(m.scene).filter((s) => s.regola).length;
    const t = SV.t || ((x, v) => x.replace(/\{(\w+)\}/g, (a, k) => v[k]));
    const lingua = SV.LINGUE && SV.LINGUE[m.lingua] ? ` · ${SV.LINGUE[m.lingua].nome}` : "";
    return `${t(tema)}${lingua}${ritocchi ? ` · ${t(ritocchi === 1 ? "ritocchi su {n} tipo di scena" : "ritocchi su {n} tipi di scena", { n: ritocchi })}` : ""}`;
  }

  function testoRicerca(m) {
    return `${m.nome} ${m.url} ${m.slogan} ${m.note}`.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  }

  // Filtra e ordina in memoria: veloce fino a decine di migliaia di marche.
  function cercaMarche(marche, testo, ordine) {
    const parole = String(testo || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").split(/\s+/).filter(Boolean);
    const trovate = marche.filter((m) => {
      const t = testoRicerca(m);
      return parole.every((p) => t.includes(p));
    });
    const confronti = {
      recenti: (a, b) => String(b.ultimoUso || b.modificata).localeCompare(String(a.ultimoUso || a.modificata)),
      nome: (a, b) => a.nome.localeCompare(b.nome, "it", { sensitivity: "base" }),
      usate: (a, b) => (b.usi || 0) - (a.usi || 0) || a.nome.localeCompare(b.nome, "it"),
      nuove: (a, b) => String(b.creata).localeCompare(String(a.creata)),
    };
    return trovate.sort(confronti[ordine] || confronti.recenti);
  }

  // File di scambio: una o più marche.
  function fileMarche(marche) {
    return { tipo: "studio-video-marche", versione: VERSIONE_MARCA, esportato: new Date().toISOString(), marche: marche.map(normalizzaMarca) };
  }

  function leggiFileMarche(dati) {
    if (dati && Array.isArray(dati.marche)) return dati.marche.map(normalizzaMarca);
    if (Array.isArray(dati)) return dati.map(normalizzaMarca);
    if (dati && typeof dati === "object" && (dati.nome || dati.tema)) return [normalizzaMarca(dati)];
    throw new Error("Il file non contiene marche di Studio Video");
  }

  Object.assign(SV, { nuovoId, normalizzaMarca, estraiMarca, applicaMarca, datiDaMarca, riassuntoLook, cercaMarche, fileMarche, leggiFileMarche });
})(typeof window !== "undefined" ? window : globalThis);
