/*
 * Modelli di Studio Video: scene vuote e generatori di progetti completi.
 *
 * Il generatore rapido prende pochi dati (nome, slogan, vantaggi, invito)
 * e restituisce un progetto pronto: niente pagina bianca, si parte da un
 * video già montato e si ritocca.
 *
 * Funziona sia nel browser sia in Node (render/render.js, esempi).
 */
(function (globale) {
  "use strict";

  const SV = (globale.StudioVideo = globale.StudioVideo || {});

  // Etichette e scena di partenza per ogni tipo.
  const TIPI = {
    titolo: { nome: "Titolo", icona: "T", vuota: () => ({ tipo: "titolo", durata: 3, etichetta: "", titolo: "Il tuo titolo", sottotitolo: "Una frase che spiega il valore in pochi secondi" }) },
    punti: { nome: "Punti di forza", icona: "✓", vuota: () => ({ tipo: "punti", durata: 5, titolo: "Perché sceglierci", punti: ["Primo vantaggio concreto", "Secondo vantaggio concreto", "Terzo vantaggio concreto"] }) },
    schermata: { nome: "Schermata del sito", icona: "▣", vuota: () => ({ tipo: "schermata", durata: 5, titolo: "Guarda com'è semplice", testo: "Tutto quello che ti serve, in un'unica pagina.", immagine: "", dispositivo: "browser", scorri: true, url: "" }) },
    tutorial: { nome: "Tutorial (passi)", icona: "➜", vuota: () => ({ tipo: "tutorial", durata: 10, titolo: "Come funziona", immagine: "", zoom: true, url: "", passi: passiPredefiniti(["Apri il menu", "Scegli l'opzione", "Conferma con un clic"]) }) },
    // Numeri e recensioni NON si inventano (pubblicità ingannevole): il modello
    // parte con segnaposto [[...]] evidenti, che verifica.js e l'esportazione bloccano.
    numeri: { nome: "Numeri", icona: "#", vuota: () => ({ tipo: "numeri", durata: 4.5, titolo: "I risultati parlano", valori: [{ valore: "[[numero vero]]", prefisso: "", suffisso: "", etichetta: "[[cosa misura, con fonte]]" }, { valore: "[[numero vero]]", prefisso: "", suffisso: "", etichetta: "[[cosa misura, con fonte]]" }] }) },
    citazione: { nome: "Recensione", icona: "❝", vuota: () => ({ tipo: "citazione", durata: 6, testo: "[[Incolla una recensione vera del cliente, con il suo permesso]]", autore: "[[Nome della persona]]", ruolo: "[[Ruolo o azienda]]", stelle: 0 }) },
    cta: { nome: "Invito all'azione", icona: "→", vuota: () => ({ tipo: "cta", durata: 3.5, titolo: "Provalo oggi", pulsante: "Inizia gratis", url: "", clic: true }) },
  };

  // Posizioni di partenza dei passi (in frazioni dell'immagine), sparse sulla pagina.
  const POSIZIONI = [
    { x: 0.2, y: 0.12 }, { x: 0.62, y: 0.38 }, { x: 0.3, y: 0.62 },
    { x: 0.75, y: 0.8 }, { x: 0.5, y: 0.25 }, { x: 0.15, y: 0.85 },
  ];
  function passiPredefiniti(testi) {
    return testi.map((testo, i) => Object.assign({ testo }, POSIZIONI[i % POSIZIONI.length]));
  }

  function righe(testo) {
    return String(testo || "")
      .split("\n")
      .map((r) => r.replace(/^\s*(?:[-•*]+|\d+[.)])\s+/, "").trim())
      .filter(Boolean);
  }

  function base(dati) {
    return {
      versione: 1,
      nome: dati.nome || "Nuovo video",
      formato: dati.formato || "16:9",
      tema: dati.tema || "limone",
      accento: dati.accento || "",
      carattere: dati.carattere || "auto",
      animazione: dati.animazione || "auto",
      transizione: dati.transizione || "dissolvenza",
      marchio: { nome: dati.nome || "", url: dati.url || "", logo: dati.logo || "" },
      musica: "",
      volume: 0.8,
      scene: [],
    };
  }

  // I tre modelli principali. `dati`: nome, slogan, url, vantaggi (testo, uno
  // per riga), invito, immagine (schermata), logo, formato, tema.
  const MODELLI = {
    promo: {
      nome: "Pubblicità lampo (~15 s)",
      descrizione: "Per Reels, TikTok e annunci: aggancio, 3 vantaggi, schermata, invito.",
      crea(dati) {
        const p = base(dati);
        const v = righe(dati.vantaggi);
        p.scene = [
          { tipo: "titolo", durata: 3, etichetta: dati.etichetta || "Novità", titolo: dati.slogan || dati.nome || "Il tuo prodotto", sottotitolo: dati.nome && dati.slogan ? dati.nome : "" },
          { tipo: "punti", durata: 4.5, titolo: "In 3 parole?", punti: v.length ? v.slice(0, 3) : TIPI.punti.vuota().punti },
          { tipo: "schermata", durata: 4, titolo: "", testo: "", immagine: dati.immagine || "", dispositivo: dati.formato === "9:16" ? "telefono" : "browser", scorri: true, url: dati.url || "" },
          { tipo: "cta", durata: 3.5, titolo: dati.invitoTitolo || "Provalo adesso", pulsante: dati.invito || "Inizia ora", url: dati.url || "", clic: true },
        ];
        return p;
      },
    },
    presentazione: {
      nome: "Presentazione del sito (~30 s)",
      descrizione: "Per la home, YouTube e LinkedIn: problema, soluzione, prove, invito.",
      crea(dati) {
        const p = base(dati);
        const v = righe(dati.vantaggi);
        p.scene = [
          { tipo: "titolo", durata: 3.5, etichetta: dati.etichetta || "", titolo: dati.nome || "Il tuo sito", sottotitolo: dati.slogan || "" },
          { tipo: "schermata", durata: 5.5, titolo: dati.slogan || "Tutto in un unico posto", testo: dati.descrizione || "Scopri come funziona in pochi secondi.", immagine: dati.immagine || "", dispositivo: "browser", scorri: true, url: dati.url || "" },
          { tipo: "punti", durata: 6, titolo: "Cosa ottieni", punti: v.length ? v.slice(0, 5) : TIPI.punti.vuota().punti },
          TIPI.numeri.vuota(),
          TIPI.citazione.vuota(),
          { tipo: "cta", durata: 4, titolo: dati.invitoTitolo || "Pronto a iniziare?", pulsante: dati.invito || "Visita il sito", url: dati.url || "", clic: true },
        ];
        return p;
      },
    },
    tutorial: {
      nome: "Tutorial d'uso (~25 s)",
      descrizione: "Mostra come si usa: il cursore clicca i punti giusti, passo dopo passo.",
      crea(dati) {
        const p = base(dati);
        const passi = righe(dati.vantaggi);
        const elenco = passi.length ? passi.slice(0, 6) : ["Apri il menu", "Scegli l'opzione", "Conferma con un clic"];
        p.scene = [
          { tipo: "titolo", durata: 3, etichetta: "Tutorial", titolo: dati.slogan || `Come usare ${dati.nome || "il sito"}`, sottotitolo: `${elenco.length} passi, meno di un minuto` },
          { tipo: "tutorial", durata: Math.max(6, 1.2 + elenco.length * 2.6), titolo: dati.nome ? `${dati.nome}, passo per passo` : "Passo per passo", immagine: dati.immagine || "", zoom: true, url: dati.url || "", passi: passiPredefiniti(elenco) },
          { tipo: "punti", durata: 4.5, titolo: "Riepilogo", punti: elenco },
          { tipo: "cta", durata: 3.5, titolo: "Ora tocca a te", pulsante: dati.invito || "Provalo ora", url: dati.url || "", clic: true },
        ];
        return p;
      },
    },
  };

  // Testi da compilare lasciati dai modelli: [[...]]
  const DA_COMPILARE = /\[\[[^\]]*\]\]/;
  function daCompilare(progetto) {
    const trovati = [];
    (progetto.scene || []).forEach((sc, i) => {
      const testi = [sc.titolo, sc.sottotitolo, sc.testo, sc.etichetta, sc.pulsante, sc.autore, sc.ruolo, ...(sc.punti || []), ...(sc.passi || []).map((p) => p && p.testo)];
      for (const v of sc.valori || []) if (v) testi.push(v.valore, v.prefisso, v.suffisso, v.etichetta);
      if (testi.some((t) => DA_COMPILARE.test(String(t == null ? "" : t)))) trovati.push(i);
    });
    return trovati;
  }

  /**
   * Rende sicuro un progetto scritto a mano o di una versione vecchia:
   * testi in stringa, liste in array, numeri nei limiti, voci nulle scartate.
   * Modifica e restituisce il progetto; se `correzioni` è un array ci annota cosa ha sistemato.
   */
  const CAMPI_TESTO = ["titolo", "sottotitolo", "testo", "etichetta", "pulsante", "autore", "ruolo", "url", "immagine", "logo", "dispositivo"];
  function normalizzaProgetto(p, correzioni) {
    const nota = (m) => correzioni && correzioni.push(m);
    const testo = (v) => (v == null ? "" : typeof v === "string" ? v : String(v));
    if (!p || typeof p !== "object") throw new Error("il progetto non è un oggetto JSON");
    if (!Array.isArray(p.scene)) {
      nota("scene non è una lista");
      p.scene = [];
    }
    p.scene = p.scene.filter((sc) => sc && typeof sc === "object");
    if (SV.ANIMAZIONI && p.animazione && !SV.ANIMAZIONI[p.animazione]) {
      nota(`animazione "${p.animazione}" sconosciuta: uso quella dello stile`);
      p.animazione = "auto";
    }
    if (SV.TRANSIZIONI && p.transizione && !SV.TRANSIZIONI[p.transizione]) {
      nota(`transizione "${p.transizione}" sconosciuta: uso dissolvenza`);
      p.transizione = "dissolvenza";
    }
    p.scene.forEach((sc, i) => {
      const n = `scena ${i + 1}`;
      const d = Number(sc.durata);
      if (!isFinite(d) || d < 1) {
        nota(`${n}: durata "${sc.durata}" non valida, uso 3 s`);
        sc.durata = 3;
      } else if (d > 60) {
        nota(`${n}: durata ${d} s ridotta a 60`);
        sc.durata = 60;
      }
      for (const k of CAMPI_TESTO) {
        if (sc[k] != null && typeof sc[k] !== "string") {
          nota(`${n}: "${k}" convertito in testo`);
          sc[k] = testo(sc[k]);
        }
      }
      if (sc.punti != null && !Array.isArray(sc.punti)) {
        nota(`${n}: "punti" convertito in lista (una riga per punto)`);
        sc.punti = testo(sc.punti).split("\n");
      }
      if (Array.isArray(sc.punti)) sc.punti = sc.punti.filter((x) => x != null).map(testo);
      if (sc.valori != null) {
        const prima = Array.isArray(sc.valori) ? sc.valori.length : -1;
        sc.valori = (Array.isArray(sc.valori) ? sc.valori : []).filter((v) => v && typeof v === "object")
          .map((v) => ({ valore: testo(v.valore), prefisso: testo(v.prefisso), suffisso: testo(v.suffisso), etichetta: testo(v.etichetta) }));
        if (sc.valori.length !== prima) nota(`${n}: voci non valide tolte da "valori"`);
      }
      if (sc.passi != null) {
        const prima = Array.isArray(sc.passi) ? sc.passi.length : -1;
        sc.passi = (Array.isArray(sc.passi) ? sc.passi : []).filter((q) => q && typeof q === "object")
          .map((q) => Object.assign({}, q, { testo: testo(q.testo), x: Math.min(1, Math.max(0, Number(q.x) || 0)), y: Math.min(1, Math.max(0, Number(q.y) || 0)) }));
        if (sc.passi.length !== prima) nota(`${n}: voci non valide tolte da "passi"`);
      }
      if (sc.stelle != null) {
        const st = Math.round(Number(sc.stelle));
        const giusta = isFinite(st) ? Math.min(5, Math.max(0, st)) : 0;
        if (giusta !== sc.stelle) nota(`${n}: stelle portate a ${giusta}`);
        sc.stelle = giusta;
      }
      if (sc.regola != null && (typeof sc.regola !== "object" || Array.isArray(sc.regola))) {
        nota(`${n}: "regola" non valida, tolta`);
        delete sc.regola;
      }
      if (SV.ANIMAZIONI && sc.animazione && !SV.ANIMAZIONI[sc.animazione]) {
        nota(`${n}: animazione "${sc.animazione}" sconosciuta, tolta`);
        delete sc.animazione;
      }
    });
    return p;
  }

  Object.assign(SV, { TIPI, MODELLI, passiPredefiniti, righe, normalizzaProgetto, daCompilare, DA_COMPILARE });
})(typeof window !== "undefined" ? window : globalThis);
