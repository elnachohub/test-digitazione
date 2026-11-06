/*
 * Libreria delle marche: finestra con ricerca e anteprime, scheda della marca,
 * collegamento marca ↔ progetto, import/export.
 * Parla con l'archivio solo tramite SV.marche e con l'editor tramite SV.editor.
 */
(function () {
  "use strict";

  const SV = window.StudioVideo;
  const $ = (sel) => document.querySelector(sel);
  const PER_PAGINA = 48;

  let cache = null; // tutte le marche, normalizzate
  let mostrate = PER_PAGINA;
  const ed = () => SV.editor;

  async function tutte() {
    if (!cache) {
      try {
        cache = (await SV.marche.elenca()).map(SV.normalizzaMarca);
      } catch (e) {
        console.warn("Archivio marche non disponibile", e);
        cache = [];
      }
    }
    return cache;
  }

  function trova(id) {
    return (cache || []).find((m) => m.id === id) || null;
  }

  function inCache(m) {
    const i = cache.findIndex((x) => x.id === m.id);
    if (i >= 0) cache[i] = m;
    else cache.push(m);
  }

  // ------------------------------------------------------- immagini

  function caricaImg(src) {
    return new Promise((ok, ko) => {
      const img = new Image();
      img.onload = () => ok(img);
      img.onerror = ko;
      img.src = src;
    });
  }

  // I loghi enormi rallentano l'archivio: oltre 600 px si riducono (PNG, trasparenza salva).
  async function compattaLogo(src) {
    if (!src || !src.startsWith("data:image/") || src.startsWith("data:image/svg")) return src;
    try {
      const img = await caricaImg(src);
      const lato = Math.max(img.width, img.height);
      if (lato <= 600) return src;
      const k = 600 / lato;
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * k);
      c.height = Math.round(img.height * k);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      return c.toDataURL("image/png");
    } catch (e) {
      return src;
    }
  }

  // Miniatura: il titolo della marca disegnato con il suo look e i suoi ritocchi.
  async function creaAnteprima(m) {
    const sc = { tipo: "titolo", durata: 3, etichetta: "", titolo: m.nome, sottotitolo: m.slogan || m.url.replace(/^https?:\/\//, "") };
    const st = m.scene.titolo;
    if (st && st.regola) sc.regola = st.regola;
    if (st && st.sfondo) sc.sfondo = st.sfondo;
    const p = {
      formato: "16:9", tema: m.tema, accento: m.accento, carattere: m.carattere, animazione: m.animazione,
      transizione: "dissolvenza", marchio: { nome: m.nome, url: m.url, logo: m.logo }, scene: [sc],
    };
    const risorse = await SV.caricaRisorse(p);
    const grande = document.createElement("canvas");
    grande.width = 1920;
    grande.height = 1080;
    SV.disegna(grande.getContext("2d"), p, risorse, 2.95);
    const piccola = document.createElement("canvas");
    piccola.width = 480;
    piccola.height = 270;
    const c = piccola.getContext("2d");
    c.imageSmoothingQuality = "high";
    c.drawImage(grande, 0, 0, 480, 270);
    return piccola.toDataURL("image/jpeg", 0.82);
  }

  async function salva(m) {
    const marca = SV.normalizzaMarca(m);
    marca.modificata = new Date().toISOString();
    marca.logo = await compattaLogo(marca.logo);
    marca.anteprima = await creaAnteprima(marca);
    await tutte();
    await SV.marche.salva(marca);
    inCache(marca);
    aggiorna();
    return marca;
  }

  async function segnaUso(id) {
    const m = trova(id);
    if (!m) return;
    m.usi = (m.usi || 0) + 1;
    m.ultimoUso = new Date().toISOString();
    await SV.marche.salva(m).catch(() => {});
    aggiorna();
  }

  // ------------------------------------------- stato nel pannello sinistro

  async function mostraStato() {
    await tutte();
    const box = $("#marca-attuale");
    if (!box || !ed()) return;
    const el = ed().elemento;
    const p = ed().progetto();
    const m = p && p.marcaId ? trova(p.marcaId) : null;
    if (m) {
      box.replaceChildren(
        el("div", { classe: "marca-collegata" }, [
          m.anteprima ? el("img", { src: m.anteprima, alt: "" }) : "",
          el("div", {}, [el("small", { testo: "Marca collegata" }), el("strong", { testo: m.nome })]),
        ]),
        el("div", { classe: "azioni-marca-attuale" }, [
          el("button", { type: "button", classe: "pulsante piccolo", title: "Salva nella marca il look e i ritocchi di questo progetto", onclick: () => aggiornaDaProgetto(m) }, "↻ Aggiorna marca"),
          el("button", { type: "button", classe: "pulsante piccolo", onclick: () => apri() }, "Cambia"),
          el("button", { type: "button", classe: "pulsante piccolo", onclick: () => { ed().modifica(() => delete p.marcaId); mostraStato(); } }, "Scollega"),
        ]),
      );
    } else {
      box.replaceChildren(
        el("p", { classe: "nota", testo: "Nessuna marca collegata. Sistema un video come piace al cliente, poi salvalo come marca: i prossimi nasceranno già così." }),
        el("div", { classe: "azioni-marca-attuale" }, [
          el("button", { type: "button", classe: "pulsante piccolo giallo", onclick: () => apriScheda(null, true) }, "★ Salva come marca"),
          el("button", { type: "button", classe: "pulsante piccolo", onclick: () => apri() }, `Scegli (${cache.length})`),
        ]),
      );
    }
  }

  async function aggiornaDaProgetto(m) {
    if (!confirm(`Aggiornare la marca "${m.nome}" con il look e i ritocchi di questo progetto?\nI prossimi video di questa marca nasceranno così.`)) return;
    const testi = { slogan: m.slogan, vantaggi: m.vantaggi, invito: m.invito, note: m.note, creata: m.creata, usi: m.usi, ultimoUso: m.ultimoUso };
    await salva(Object.assign(SV.estraiMarca(ed().progetto(), m), testi));
    mostraStato();
  }

  // ------------------------------------------------------ libreria

  function aggiorna() {
    mostraStato();
    if ($("#libreria").open) mostraGriglia();
  }

  async function apri() {
    mostrate = PER_PAGINA;
    await tutte();
    mostraGriglia();
    $("#libreria").showModal();
    $("#cerca-marche").focus();
  }

  function mostraGriglia() {
    const el = ed().elemento;
    const elenco = SV.cercaMarche(cache, $("#cerca-marche").value, $("#ordine-marche").value);
    const p = ed().progetto();
    const totale = cache.length;
    $("#conta-marche").textContent = totale === elenco.length ? `${totale} ${totale === 1 ? "marca" : "marche"}` : `${elenco.length} di ${totale}`;
    $("#esporta-marche").disabled = !totale;
    const griglia = $("#griglia-marche");
    if (!totale) {
      griglia.replaceChildren(el("li", { classe: "vuota" }, [
        el("strong", { testo: "Ancora nessuna marca." }),
        el("span", { testo: "Sistema un video per un cliente e premi “Salva il progetto come marca”. Oppure importa un file di marche." }),
      ]));
    } else if (!elenco.length) {
      griglia.replaceChildren(el("li", { classe: "vuota" }, el("strong", { testo: "Nessuna marca trovata." })));
    } else {
      griglia.replaceChildren(...elenco.slice(0, mostrate).map((m) => scheda(m, p && p.marcaId === m.id)));
    }
    $("#altre-marche").hidden = elenco.length <= mostrate;
  }

  function quando(iso) {
    if (!iso) return "mai usata";
    const giorni = Math.floor((Date.now() - new Date(iso)) / 864e5);
    return giorni <= 0 ? "usata oggi" : giorni === 1 ? "usata ieri" : `usata ${giorni} giorni fa`;
  }

  function scheda(m, attiva) {
    const el = ed().elemento;
    const mini = (testo, titolo, fn) => el("button", { type: "button", classe: "mini", title: titolo, "aria-label": `${titolo}: ${m.nome}`, onclick: fn }, testo);
    return el("li", { classe: `scheda-marca${attiva ? " attiva" : ""}` }, [
      el("div", { classe: "anteprima-marca" }, m.anteprima ? el("img", { src: m.anteprima, alt: "", loading: "lazy" }) : el("span", { testo: m.nome.slice(0, 2).toUpperCase() })),
      el("div", { classe: "info-marca" }, [
        el("strong", { testo: m.nome }),
        el("small", { testo: m.url.replace(/^https?:\/\//, "") || "—" }),
        el("small", { classe: "tenue", testo: `${m.usi ? `${m.usi} video · ` : ""}${quando(m.ultimoUso)}` }),
      ]),
      el("div", { classe: "azioni-marca" }, [
        el("button", { type: "button", classe: "pulsante piccolo principale", onclick: () => nuovoVideo(m) }, "Nuovo video"),
        el("button", { type: "button", classe: "pulsante piccolo", title: "Applica al progetto aperto", onclick: () => applica(m) }, attiva ? "Riapplica" : "Applica"),
        el("span", { classe: "mini-marca" }, [
          mini("✎", "Modifica", () => apriScheda(m, false)),
          mini("⧉", "Duplica", () => duplica(m)),
          mini("⤓", "Esporta", () => esporta([m], `marca-${ed().nomeSicuro(m.nome)}.json`)),
          mini("✕", "Elimina", () => elimina(m)),
        ]),
      ]),
    ]);
  }

  function applica(m) {
    ed().modifica(() => SV.applicaMarca(ed().progetto(), m));
    ed().aggiornaTutto();
    segnaUso(m.id);
    $("#libreria").close();
  }

  function nuovoVideo(m) {
    $("#libreria").close();
    ed().apriGeneratore(m.id);
  }

  async function duplica(m) {
    const ora = new Date().toISOString();
    await salva(Object.assign({}, m, { id: SV.nuovoId(), nome: `${m.nome} (copia)`, creata: ora, usi: 0, ultimoUso: "" }));
  }

  async function elimina(m) {
    if (!confirm(`Eliminare la marca "${m.nome}"?\nI video già fatti restano, ma non potrai più crearne di nuovi con questa marca.`)) return;
    await SV.marche.elimina(m.id);
    cache = cache.filter((x) => x.id !== m.id);
    aggiorna();
  }

  function esporta(marche, nome) {
    const blob = new Blob([JSON.stringify(SV.fileMarche(marche), null, 1)], { type: "application/json" });
    ed().scarica(blob, nome);
  }

  async function importa(file) {
    let marche;
    try {
      marche = SV.leggiFileMarche(JSON.parse(await file.text()));
    } catch (e) {
      alert("Questo file non contiene marche di Studio Video.");
      return;
    }
    await tutte();
    const esistenti = new Set(cache.map((m) => m.id));
    let nuove = 0;
    for (const m of marche) {
      if (!esistenti.has(m.id)) nuove++;
      if (!m.anteprima) m.anteprima = await creaAnteprima(m);
      inCache(m);
    }
    await SV.marche.salvaTante(marche);
    aggiorna();
    alert(`${marche.length} marche importate (${nuove} nuove, ${marche.length - nuove} aggiornate).`);
  }

  // ------------------------------------------------- scheda della marca

  let inModifica = null; // marca in modifica (null = nuova)
  let logoScheda = "";

  function apriScheda(m, daProgetto) {
    const p = ed().progetto();
    inModifica = m;
    const f = $("#modulo-marca");
    const base = m || SV.estraiMarca(p, {});
    f.nome.value = m ? m.nome : (p.marchio && p.marchio.nome) || "";
    f.url.value = base.url || "";
    f.slogan.value = m ? m.slogan : (p.scene.find((s) => s.tipo === "titolo")?.sottotitolo || "");
    f.vantaggi.value = m ? m.vantaggi : (p.scene.find((s) => s.tipo === "punti")?.punti || []).join("\n");
    f.invito.value = base.invito || "";
    f.note.value = m ? m.note : "";
    f.prendiLook.checked = daProgetto;
    logoScheda = base.logo || "";
    ed().campoImmagine($("#logo-marca"), logoScheda, (v) => (logoScheda = v), true);
    $("#titolo-scheda-marca").textContent = m ? `Marca: ${m.nome}` : "Nuova marca";
    $("#look-marca").textContent = m ? `Look salvato: ${SV.riassuntoLook(m)}` : `Look dal progetto: ${SV.riassuntoLook(base)}`;
    $("#riga-prendi-look").hidden = !m;
    $("#scheda-marca").returnValue = "";
    $("#scheda-marca").showModal();
  }

  async function confermaScheda() {
    const f = $("#modulo-marca");
    const p = ed().progetto();
    const daProgetto = !inModifica || f.prendiLook.checked;
    let m = daProgetto ? SV.estraiMarca(p, inModifica || {}) : SV.normalizzaMarca(inModifica);
    Object.assign(m, {
      nome: f.nome.value.trim(),
      url: f.url.value.trim(),
      slogan: f.slogan.value.trim(),
      vantaggi: f.vantaggi.value,
      invito: f.invito.value.trim(),
      note: f.note.value.trim(),
      logo: logoScheda,
    });
    if (inModifica) Object.assign(m, { id: inModifica.id, creata: inModifica.creata, usi: inModifica.usi, ultimoUso: inModifica.ultimoUso });
    m = await salva(m);
    // il progetto da cui nasce la marca resta collegato e prende nome, sito e logo
    if (daProgetto) {
      ed().modifica(() => {
        p.marcaId = m.id;
        p.marchio = { nome: m.nome, url: m.url, logo: m.logo };
      });
      ed().aggiornaTutto();
    }
  }

  // ------------------------------------------------------------- avvio

  function collega() {
    $("#apri-libreria").addEventListener("click", apri);
    $("#chiudi-libreria").addEventListener("click", () => $("#libreria").close());
    $("#cerca-marche").addEventListener("input", () => {
      mostrate = PER_PAGINA;
      mostraGriglia();
    });
    $("#ordine-marche").addEventListener("change", mostraGriglia);
    $("#altre-marche").addEventListener("click", () => {
      mostrate += PER_PAGINA;
      mostraGriglia();
    });
    $("#nuova-marca").addEventListener("click", () => apriScheda(null, true));
    $("#esporta-marche").addEventListener("click", () => esporta(cache, `marche-studio-video-${new Date().toISOString().slice(0, 10)}.json`));
    $("#importa-marche").addEventListener("click", () => $("#file-marche").click());
    $("#file-marche").addEventListener("change", (e) => {
      const f = e.target.files[0];
      e.target.value = "";
      if (f) importa(f);
    });
    $("#scheda-marca").addEventListener("close", () => {
      if ($("#scheda-marca").returnValue === "salva") confermaScheda().catch((e) => alert(`Salvataggio non riuscito: ${e.message}`));
    });
  }

  SV.libreria = { tutte, trova, mostraStato, segnaUso, apri };
  collega();
})();
