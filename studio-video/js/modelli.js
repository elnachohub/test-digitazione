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
    numeri: { nome: "Numeri", icona: "#", vuota: () => ({ tipo: "numeri", durata: 4.5, titolo: "I risultati parlano", valori: [{ valore: "1200", prefisso: "", suffisso: "+", etichetta: "clienti soddisfatti" }, { valore: "4.9", prefisso: "", suffisso: "/5", etichetta: "valutazione media" }, { valore: "24", prefisso: "", suffisso: "h", etichetta: "assistenza" }] }) },
    citazione: { nome: "Recensione", icona: "❝", vuota: () => ({ tipo: "citazione", durata: 5, testo: "Ci ha fatto risparmiare ore ogni settimana. Non torneremmo mai indietro.", autore: "Giulia R.", ruolo: "Titolare, Studio Rossi", stelle: 5 }) },
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
      .map((r) => r.replace(/^[-•*\d.)\s]+/, "").trim())
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

  Object.assign(SV, { TIPI, MODELLI, passiPredefiniti, righe });
})(typeof window !== "undefined" ? window : globalThis);
