/*
 * Archivio di Studio Video nel browser (IndexedDB).
 *
 *   progetti  il progetto aperto, salvato da solo
 *   marche    il database delle marche dei clienti
 *
 * IndexedDB e non localStorage: loghi, immagini e musica pesano troppo per i
 * 5 MB di localStorage. Nessun dato lascia il computer.
 *
 * PUNTO DI SCAMBIO: l'editor parla con le marche SOLO tramite SV.marche
 * (elenca, leggi, salva, salvaTante, elimina). Per passare a un server con
 * account basta un oggetto con gli stessi metodi asincroni che chiama le API:
 * il resto dell'editor non cambia.
 */
(function (globale) {
  "use strict";

  const SV = (globale.StudioVideo = globale.StudioVideo || {});
  const NOME_DB = "studio-video";
  const VERSIONE_DB = 2;

  let connessione = null;
  function apri() {
    if (connessione) return connessione;
    connessione = new Promise((ok, ko) => {
      const r = indexedDB.open(NOME_DB, VERSIONE_DB);
      r.onupgradeneeded = () => {
        const db = r.result;
        if (!db.objectStoreNames.contains("progetti")) db.createObjectStore("progetti");
        if (!db.objectStoreNames.contains("marche")) {
          const marche = db.createObjectStore("marche", { keyPath: "id" });
          marche.createIndex("nome", "nome");
          marche.createIndex("modificata", "modificata");
        }
      };
      r.onsuccess = () => {
        const db = r.result;
        // un'altra scheda aggiorna il database: chiudiamo e riapriremo
        db.onversionchange = () => {
          db.close();
          connessione = null;
        };
        ok(db);
      };
      r.onerror = () => {
        connessione = null;
        ko(r.error);
      };
    });
    return connessione;
  }

  async function operazione(tabella, modo, fn) {
    const db = await apri();
    return new Promise((ok, ko) => {
      const tx = db.transaction(tabella, modo);
      const r = fn(tx.objectStore(tabella));
      tx.oncomplete = () => ok(r && "result" in r ? r.result : undefined);
      tx.onerror = () => ko(tx.error);
      tx.onabort = () => ko(tx.error || new Error("Operazione annullata (spazio esaurito?)"));
    });
  }

  SV.archivio = {
    leggi: (chiave = "corrente") => operazione("progetti", "readonly", (t) => t.get(chiave)),
    scrivi: (valore, chiave = "corrente") => operazione("progetti", "readwrite", (t) => t.put(valore, chiave)),
  };

  SV.marche = {
    elenca: () => operazione("marche", "readonly", (t) => t.getAll()),
    leggi: (id) => operazione("marche", "readonly", (t) => t.get(id)),
    salva: (marca) => operazione("marche", "readwrite", (t) => t.put(marca)).then(() => marca),
    salvaTante: (marche) => operazione("marche", "readwrite", (t) => {
      for (const m of marche) t.put(m);
    }).then(() => marche.length),
    elimina: (id) => operazione("marche", "readwrite", (t) => t.delete(id)),
  };
})(window);
