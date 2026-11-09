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

  // Testi dei modelli nella lingua del VIDEO (non dell'interfaccia).
  // {nome} e {n} si riempiono al momento. I segnaposto [[...]] restano da compilare.
  const TESTI = {
    it: {
      titolo: "Il tuo titolo", sottotitolo: "Una frase che spiega il valore in pochi secondi",
      puntiTitolo: "Perché sceglierci", punti: ["Primo vantaggio concreto", "Secondo vantaggio concreto", "Terzo vantaggio concreto"],
      schermataTitolo: "Guarda com'è semplice", schermataTesto: "Tutto quello che ti serve, in un'unica pagina.",
      tutorialTitolo: "Come funziona", passi: ["Apri il menu", "Scegli l'opzione", "Conferma con un clic"],
      numeriTitolo: "I risultati parlano chiaro", numeroVero: "[[numero vero]]", numeroEtichetta: "[[cosa misura, con fonte]]",
      recensione: "[[Incolla una recensione vera del cliente, con il suo permesso]]", autore: "[[Nome della persona]]", ruolo: "[[Ruolo o azienda]]",
      ctaTitolo: "Provalo oggi", ctaPulsante: "Inizia ora",
      novita: "Novità", tre: "In 3 parole?", provalo: "Provalo adesso", prodotto: "Il tuo prodotto",
      sito: "Il tuo sito", unico: "Tutto in un unico posto", scopri: "Scopri come funziona in pochi secondi.", ottieni: "Cosa ottieni", pronto: "Pronto a iniziare?", visita: "Visita il sito",
      tutorial: "Tutorial", comeUsare: "Come usare {nome}", ilSito: "il sito", nPassi: "{n} passi, meno di un minuto", passoPasso: "{nome}, passo dopo passo", passoPassoSolo: "Passo dopo passo", riepilogo: "Riepilogo", tocca: "Ora tocca a te", provaOra: "Provalo ora",
      passo: "Passo {n}",
    },
    en: {
      titolo: "Your headline", sottotitolo: "One sentence that explains the value in seconds",
      puntiTitolo: "Why choose us", punti: ["First concrete benefit", "Second concrete benefit", "Third concrete benefit"],
      schermataTitolo: "See how simple it is", schermataTesto: "Everything you need, on a single page.",
      tutorialTitolo: "How it works", passi: ["Open the menu", "Choose an option", "Confirm with one click"],
      numeriTitolo: "The results speak for themselves", numeroVero: "[[real number]]", numeroEtichetta: "[[what it measures, with source]]",
      recensione: "[[Paste a real customer review, with their permission]]", autore: "[[Person's name]]", ruolo: "[[Role or company]]",
      ctaTitolo: "Try it today", ctaPulsante: "Get started",
      novita: "New", tre: "In 3 words?", provalo: "Try it now", prodotto: "Your product",
      sito: "Your website", unico: "Everything in one place", scopri: "See how it works in seconds.", ottieni: "What you get", pronto: "Ready to start?", visita: "Visit the website",
      tutorial: "Tutorial", comeUsare: "How to use {nome}", ilSito: "the website", nPassi: "{n} steps, under a minute", passoPasso: "{nome}, step by step", passoPassoSolo: "Step by step", riepilogo: "Recap", tocca: "Your turn", provaOra: "Try it now",
      passo: "Step {n}",
    },
    es: {
      titolo: "Tu titular", sottotitolo: "Una frase que explica el valor en segundos",
      puntiTitolo: "Por qué elegirnos", punti: ["Primera ventaja concreta", "Segunda ventaja concreta", "Tercera ventaja concreta"],
      schermataTitolo: "Mira qué fácil es", schermataTesto: "Todo lo que necesitas, en una sola página.",
      tutorialTitolo: "Cómo funciona", passi: ["Abre el menú", "Elige la opción", "Confirma con un clic"],
      numeriTitolo: "Los resultados hablan por sí solos", numeroVero: "[[número real]]", numeroEtichetta: "[[qué mide, con fuente]]",
      recensione: "[[Pega una reseña real del cliente, con su permiso]]", autore: "[[Nombre de la persona]]", ruolo: "[[Cargo o empresa]]",
      ctaTitolo: "Pruébalo hoy", ctaPulsante: "Empieza ya",
      novita: "Novedad", tre: "¿En 3 palabras?", provalo: "Pruébalo ahora", prodotto: "Tu producto",
      sito: "Tu web", unico: "Todo en un solo lugar", scopri: "Descubre cómo funciona en segundos.", ottieni: "Lo que obtienes", pronto: "¿Listo para empezar?", visita: "Visita la web",
      tutorial: "Tutorial", comeUsare: "Cómo usar {nome}", ilSito: "la web", nPassi: "{n} pasos, menos de un minuto", passoPasso: "{nome}, paso a paso", passoPassoSolo: "Paso a paso", riepilogo: "Resumen", tocca: "Ahora te toca a ti", provaOra: "Pruébalo ya",
      passo: "Paso {n}",
    },
    fr: {
      titolo: "Votre titre", sottotitolo: "Une phrase qui explique la valeur en quelques secondes",
      puntiTitolo: "Pourquoi nous choisir", punti: ["Premier avantage concret", "Deuxième avantage concret", "Troisième avantage concret"],
      schermataTitolo: "Voyez comme c'est simple", schermataTesto: "Tout ce qu'il vous faut, sur une seule page.",
      tutorialTitolo: "Comment ça marche", passi: ["Ouvrez le menu", "Choisissez l'option", "Confirmez d'un clic"],
      numeriTitolo: "Les résultats parlent d'eux-mêmes", numeroVero: "[[chiffre réel]]", numeroEtichetta: "[[ce qu'il mesure, avec la source]]",
      recensione: "[[Collez un vrai avis client, avec son accord]]", autore: "[[Nom de la personne]]", ruolo: "[[Fonction ou entreprise]]",
      ctaTitolo: "Essayez dès aujourd'hui", ctaPulsante: "Commencer",
      novita: "Nouveau", tre: "En 3 mots\u00a0?", provalo: "Essayez maintenant", prodotto: "Votre produit",
      sito: "Votre site", unico: "Tout au même endroit", scopri: "Découvrez comment ça marche en quelques secondes.", ottieni: "Ce que vous obtenez", pronto: "Prêt à vous lancer\u00a0?", visita: "Visitez le site",
      tutorial: "Tutoriel", comeUsare: "Comment utiliser {nome}", ilSito: "le site", nPassi: "{n} étapes, moins d'une minute", passoPasso: "{nome}, étape par étape", passoPassoSolo: "Étape par étape", riepilogo: "En résumé", tocca: "À vous de jouer", provaOra: "Essayez maintenant",
      passo: "Étape {n}",
    },
    de: {
      titolo: "Ihre Überschrift", sottotitolo: "Ein Satz, der den Nutzen in Sekunden erklärt",
      puntiTitolo: "Gute Gründe für uns", punti: ["Erster konkreter Vorteil", "Zweiter konkreter Vorteil", "Dritter konkreter Vorteil"],
      schermataTitolo: "So einfach geht's", schermataTesto: "Alles, was Sie brauchen, auf einer Seite.",
      tutorialTitolo: "So funktioniert's", passi: ["Menü öffnen", "Option wählen", "Mit einem Klick bestätigen"],
      numeriTitolo: "Die Zahlen sprechen für sich", numeroVero: "[[echte Zahl]]", numeroEtichetta: "[[was sie misst, mit Quelle]]",
      recensione: "[[Echte Kundenbewertung einfügen, mit Erlaubnis]]", autore: "[[Name der Person]]", ruolo: "[[Position oder Unternehmen]]",
      ctaTitolo: "Heute ausprobieren", ctaPulsante: "Jetzt starten",
      novita: "Neu", tre: "In 3 Worten?", provalo: "Jetzt testen", prodotto: "Ihr Produkt",
      sito: "Ihre Website", unico: "Alles an einem Ort", scopri: "Sehen Sie in Sekunden, wie es funktioniert.", ottieni: "Das bekommen Sie", pronto: "Bereit loszulegen?", visita: "Zur Website",
      tutorial: "Anleitung", comeUsare: "So nutzen Sie {nome}", ilSito: "die Website", nPassi: "{n} Schritte, in unter einer Minute", passoPasso: "{nome}, Schritt für Schritt", passoPassoSolo: "Schritt für Schritt", riepilogo: "Auf einen Blick", tocca: "Jetzt sind Sie dran", provaOra: "Jetzt testen",
      passo: "Schritt {n}",
    },
    pt: {
      titolo: "O seu título", sottotitolo: "Uma frase que explica o valor em segundos",
      puntiTitolo: "Porquê escolher-nos", punti: ["Primeira vantagem concreta", "Segunda vantagem concreta", "Terceira vantagem concreta"],
      schermataTitolo: "Veja como é simples", schermataTesto: "Tudo o que precisa, numa só página.",
      tutorialTitolo: "Como funciona", passi: ["Abra o menu", "Escolha a opção", "Confirme com um clique"],
      numeriTitolo: "Os resultados falam por si", numeroVero: "[[número real]]", numeroEtichetta: "[[o que mede, com fonte]]",
      recensione: "[[Cole uma avaliação real do cliente, com autorização]]", autore: "[[Nome da pessoa]]", ruolo: "[[Cargo ou empresa]]",
      ctaTitolo: "Experimente hoje", ctaPulsante: "Começar agora",
      novita: "Novidade", tre: "Em 3 palavras?", provalo: "Experimente já", prodotto: "O seu produto",
      sito: "O seu site", unico: "Tudo num só lugar", scopri: "Veja como funciona em segundos.", ottieni: "O que ganha", pronto: "Pronto para começar?", visita: "Visite o site",
      tutorial: "Tutorial", comeUsare: "Como usar {nome}", ilSito: "o site", nPassi: "{n} passos, menos de um minuto", passoPasso: "{nome}, passo a passo", passoPassoSolo: "Passo a passo", riepilogo: "Resumo", tocca: "Agora é a sua vez", provaOra: "Experimente já",
      passo: "Passo {n}",
    },
    nl: {
      titolo: "Je koptekst", sottotitolo: "Eén zin die de waarde in seconden uitlegt",
      puntiTitolo: "Waarom kiezen voor ons", punti: ["Eerste concrete voordeel", "Tweede concrete voordeel", "Derde concrete voordeel"],
      schermataTitolo: "Kijk hoe eenvoudig het is", schermataTesto: "Alles wat je nodig hebt, op één pagina.",
      tutorialTitolo: "Zo werkt het", passi: ["Open het menu", "Kies de optie", "Bevestig met één klik"],
      numeriTitolo: "De resultaten spreken voor zich", numeroVero: "[[echt getal]]", numeroEtichetta: "[[wat het meet, met bron]]",
      recensione: "[[Plak een echte klantreview, met toestemming]]", autore: "[[Naam van de persoon]]", ruolo: "[[Functie of bedrijf]]",
      ctaTitolo: "Probeer het vandaag", ctaPulsante: "Begin nu",
      novita: "Nieuw", tre: "In 3 woorden?", provalo: "Probeer het nu", prodotto: "Je product",
      sito: "Je website", unico: "Alles op één plek", scopri: "Ontdek in een paar seconden hoe het werkt.", ottieni: "Wat je krijgt", pronto: "Klaar om te beginnen?", visita: "Bezoek de website",
      tutorial: "Tutorial", comeUsare: "Zo gebruik je {nome}", ilSito: "de website", nPassi: "{n} stappen, in minder dan een minuut", passoPasso: "{nome}, stap voor stap", passoPassoSolo: "Stap voor stap", riepilogo: "Samengevat", tocca: "Nu ben jij aan de beurt", provaOra: "Probeer het nu",
      passo: "Stap {n}",
    },
    pl: {
      titolo: "Twój nagłówek", sottotitolo: "Jedno zdanie, które w kilka sekund wyjaśnia korzyść",
      puntiTitolo: "Dlaczego my?", punti: ["Pierwsza konkretna korzyść", "Druga konkretna korzyść", "Trzecia konkretna korzyść"],
      schermataTitolo: "Zobacz, jakie to proste", schermataTesto: "Wszystko, czego potrzebujesz, na jednej stronie.",
      tutorialTitolo: "Jak to działa", passi: ["Otwórz menu", "Wybierz opcję", "Potwierdź jednym kliknięciem"],
      numeriTitolo: "Wyniki mówią same za siebie", numeroVero: "[[prawdziwa liczba]]", numeroEtichetta: "[[co mierzy, ze źródłem]]",
      recensione: "[[Wklej prawdziwą opinię klienta, za jego zgodą]]", autore: "[[Imię i nazwisko]]", ruolo: "[[Stanowisko lub firma]]",
      ctaTitolo: "Wypróbuj dziś", ctaPulsante: "Zacznij teraz",
      novita: "Nowość", tre: "W 3 słowach?", provalo: "Wypróbuj teraz", prodotto: "Twój produkt",
      sito: "Twoja strona", unico: "Wszystko w jednym miejscu", scopri: "Zobacz w kilka sekund, jak to działa.", ottieni: "Co zyskujesz", pronto: "Zaczynamy?", visita: "Odwiedź stronę",
      tutorial: "Poradnik", comeUsare: "Jak używać {nome}", ilSito: "strony", nPassi: "Kroki: {n} · niecała minuta", passoPasso: "{nome} krok po kroku", passoPassoSolo: "Krok po kroku", riepilogo: "Podsumowanie", tocca: "Twoja kolej", provaOra: "Wypróbuj teraz",
      passo: "Krok {n}",
    },
  };
  const testi = (lingua) => TESTI[lingua] || TESTI.it;
  const riempiT = (t, valori) => t.replace(/\{(\w+)\}/g, (x, k) => (k in valori ? valori[k] : x));

  // Etichette e scena di partenza per ogni tipo, nella lingua del video.
  const TIPI = {
    titolo: { nome: "Titolo", icona: "T", vuota: (lg) => ({ tipo: "titolo", durata: 3, etichetta: "", titolo: testi(lg).titolo, sottotitolo: testi(lg).sottotitolo }) },
    punti: { nome: "Punti di forza", icona: "✓", vuota: (lg) => ({ tipo: "punti", durata: 5, titolo: testi(lg).puntiTitolo, punti: testi(lg).punti.slice() }) },
    schermata: { nome: "Schermata del sito", icona: "▣", vuota: (lg) => ({ tipo: "schermata", durata: 5, titolo: testi(lg).schermataTitolo, testo: testi(lg).schermataTesto, immagine: "", dispositivo: "browser", scorri: true, url: "" }) },
    tutorial: { nome: "Tutorial (passi)", icona: "➜", vuota: (lg) => ({ tipo: "tutorial", durata: 10, titolo: testi(lg).tutorialTitolo, immagine: "", zoom: true, url: "", passi: passiPredefiniti(testi(lg).passi) }) },
    // Numeri e recensioni NON si inventano (pubblicità ingannevole): il modello
    // parte con segnaposto [[...]] evidenti, che verifica.js e l'esportazione bloccano.
    numeri: { nome: "Numeri", icona: "#", vuota: (lg) => ({ tipo: "numeri", durata: 4.5, titolo: testi(lg).numeriTitolo, valori: [0, 1].map(() => ({ valore: testi(lg).numeroVero, prefisso: "", suffisso: "", etichetta: testi(lg).numeroEtichetta })) }) },
    citazione: { nome: "Recensione", icona: "❝", vuota: (lg) => ({ tipo: "citazione", durata: 6, testo: testi(lg).recensione, autore: testi(lg).autore, ruolo: testi(lg).ruolo, stelle: 0 }) },
    cta: { nome: "Invito all'azione", icona: "→", vuota: (lg) => ({ tipo: "cta", durata: 3.5, titolo: testi(lg).ctaTitolo, pulsante: testi(lg).ctaPulsante, url: "", clic: true }) },
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
      lingua: SV.LINGUE && !SV.LINGUE[dati.lingua] ? "it" : dati.lingua || "it",
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
        const T = testi(p.lingua);
        const v = righe(dati.vantaggi);
        p.scene = [
          // niente "Novità" di serie: è un'affermazione, la mette solo chi sa che è vera
          { tipo: "titolo", durata: 3, etichetta: dati.etichetta || "", titolo: dati.slogan || dati.nome || T.prodotto, sottotitolo: dati.nome && dati.slogan ? dati.nome : "" },
          { tipo: "punti", durata: 4.5, titolo: T.tre, punti: v.length ? v.slice(0, 3) : T.punti.slice() },
          { tipo: "schermata", durata: 4, titolo: "", testo: "", immagine: dati.immagine || "", dispositivo: dati.formato === "9:16" ? "telefono" : "browser", scorri: true, url: dati.url || "" },
          { tipo: "cta", durata: 3.5, titolo: dati.invitoTitolo || T.provalo, pulsante: dati.invito || T.ctaPulsante, url: dati.url || "", clic: true },
        ];
        return p;
      },
    },
    presentazione: {
      nome: "Presentazione del sito (~30 s)",
      descrizione: "Per la home, YouTube e LinkedIn: problema, soluzione, prove, invito.",
      crea(dati) {
        const p = base(dati);
        const T = testi(p.lingua);
        const v = righe(dati.vantaggi);
        p.scene = [
          { tipo: "titolo", durata: 3.5, etichetta: dati.etichetta || "", titolo: dati.nome || T.sito, sottotitolo: dati.slogan || "" },
          { tipo: "schermata", durata: 5.5, titolo: dati.slogan || T.unico, testo: dati.descrizione || T.scopri, immagine: dati.immagine || "", dispositivo: "browser", scorri: true, url: dati.url || "" },
          { tipo: "punti", durata: 6, titolo: T.ottieni, punti: v.length ? v.slice(0, 5) : T.punti.slice() },
          TIPI.numeri.vuota(p.lingua),
          TIPI.citazione.vuota(p.lingua),
          { tipo: "cta", durata: 4, titolo: dati.invitoTitolo || T.pronto, pulsante: dati.invito || T.visita, url: dati.url || "", clic: true },
        ];
        return p;
      },
    },
    tutorial: {
      nome: "Tutorial d'uso (~25 s)",
      descrizione: "Mostra come si usa: il cursore clicca i punti giusti, passo dopo passo.",
      crea(dati) {
        const p = base(dati);
        const T = testi(p.lingua);
        const passi = righe(dati.vantaggi);
        const elenco = passi.length ? passi.slice(0, 6) : T.passi.slice();
        p.scene = [
          { tipo: "titolo", durata: 3, etichetta: T.tutorial, titolo: dati.slogan || riempiT(T.comeUsare, { nome: dati.nome || T.ilSito }), sottotitolo: riempiT(T.nPassi, { n: elenco.length }) },
          { tipo: "tutorial", durata: Math.max(6, 1.2 + elenco.length * 2.6), titolo: dati.nome ? riempiT(T.passoPasso, { nome: dati.nome }) : T.passoPassoSolo, immagine: dati.immagine || "", zoom: true, url: dati.url || "", passi: passiPredefiniti(elenco) },
          { tipo: "punti", durata: 4.5, titolo: T.riepilogo, punti: elenco },
          { tipo: "cta", durata: 3.5, titolo: T.tocca, pulsante: dati.invito || T.provaOra, url: dati.url || "", clic: true },
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
    if (!p.lingua) p.lingua = "it"; // progetti di prima dell'internazionale
    else if (SV.LINGUE && !SV.LINGUE[p.lingua]) {
      nota(`lingua "${p.lingua}" non supportata: uso l'italiano (lingue: ${Object.keys(SV.LINGUE).join(", ")})`);
      p.lingua = "it";
    }
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

  // Durata minima per leggere una scena: stesse soglie di render/verifica.js
  // (0,8 s + 1 s ogni 3,5 parole; punti con tempo d'entrata; ≥ 2,5 s per passo).
  function durataMinima(sc) {
    const parole = (t) => String(t || "").split(/\s+/).filter(Boolean).length;
    const lettura = (n) => 0.8 + n / 3.5;
    let n = parole(sc.titolo) + parole(sc.sottotitolo) + parole(sc.testo) + parole(sc.etichetta);
    if (sc.tipo === "punti") {
      const pt = (sc.punti || []).filter((x) => String(x).trim());
      n += pt.reduce((a, x) => a + parole(x), 0);
      return 0.45 + pt.length * 0.5 + lettura(n) * 0.6;
    }
    if (sc.tipo === "tutorial") return Math.max(lettura(n), 1.1 + (sc.passi || []).length * 2.5);
    if (sc.tipo === "cta") return lettura(n + parole(sc.pulsante)) + 0.5;
    if (sc.tipo === "schermata") return Math.max(3.5, lettura(n) + 1);
    return lettura(n);
  }

  Object.assign(SV, { durataMinima, TIPI, MODELLI, TESTI, testiModello: testi, passiPredefiniti, righe, normalizzaProgetto, daCompilare, DA_COMPILARE });
})(typeof window !== "undefined" ? window : globalThis);
