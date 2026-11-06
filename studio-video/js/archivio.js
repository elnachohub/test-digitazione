/*
 * Salvataggio automatico del progetto nel browser (IndexedDB).
 * IndexedDB e non localStorage: immagini e musica pesano troppo per i 5 MB
 * di localStorage. Nessun dato lascia il computer.
 */
(function (globale) {
  "use strict";

  const SV = (globale.StudioVideo = globale.StudioVideo || {});
  const NOME_DB = "studio-video";
  const TABELLA = "progetti";

  function apri() {
    return new Promise((ok, ko) => {
      const r = indexedDB.open(NOME_DB, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(TABELLA);
      r.onsuccess = () => ok(r.result);
      r.onerror = () => ko(r.error);
    });
  }

  async function operazione(modo, fn) {
    const db = await apri();
    return new Promise((ok, ko) => {
      const tx = db.transaction(TABELLA, modo);
      const r = fn(tx.objectStore(TABELLA));
      tx.oncomplete = () => {
        db.close();
        ok(r && r.result);
      };
      tx.onerror = () => {
        db.close();
        ko(tx.error);
      };
    });
  }

  SV.archivio = {
    leggi: (chiave = "corrente") => operazione("readonly", (t) => t.get(chiave)),
    scrivi: (valore, chiave = "corrente") => operazione("readwrite", (t) => t.put(valore, chiave)),
  };
})(window);
