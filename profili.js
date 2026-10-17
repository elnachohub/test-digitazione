/*
 * Profili locali: più persone sullo stesso browser, ognuna col suo storico.
 *
 * Perché locali e senza password: il progetto è una pagina statica senza
 * server (local-first). Un vero account online richiederebbe un server, un
 * login e la gestione di dati personali: è una decisione da prendere a parte.
 * Qui i profili sono "nomi" che separano punteggi e cronologia.
 *
 * I dati stanno in un unico oggetto:
 *   { attivo: id, profili: [{ id, nome, creato, storico: [test...], importati: {chiave: ppm} }] }
 * Ogni test registra la sua "modalità" (vedi chiaveRecord in logica.js), così
 * record e classifica confrontano solo test fatti con le stesse impostazioni.
 */

const CHIAVE_PROFILI = "profili-digitazione";
// Test conservati per profilo: abbastanza per vedere i progressi di mesi,
// abbastanza pochi da non riempire l'archivio del browser (~1 KB a test col grafico).
const MAX_STORICO = 200;
const MAX_NOME = 20;

/* Identificativo unico abbastanza per un solo browser. */
function nuovoId(adesso) {
  return "p" + adesso.toString(36) + Math.random().toString(36).slice(2, 6);
}

function datiVuoti() {
  return { attivo: null, profili: [] };
}

/* Controlla un nome: restituisce il nome pulito, oppure un codice d'errore. */
function validaNome(dati, nome, escludiId = null) {
  const pulito = String(nome || "").trim().replace(/\s+/g, " ");
  if (!pulito) return { errore: "vuoto" };
  if (pulito.length > MAX_NOME) return { errore: "lungo" };
  const doppio = dati.profili.some((p) => p.id !== escludiId && p.nome.toLowerCase() === pulito.toLowerCase());
  if (doppio) return { errore: "doppio" };
  return { nome: pulito };
}

/* Crea un profilo e lo rende attivo. Restituisce { id } oppure { errore }. */
function creaProfilo(dati, nome, adesso = Date.now()) {
  const v = validaNome(dati, nome);
  if (v.errore) return v;
  const profilo = { id: nuovoId(adesso), nome: v.nome, creato: adesso, storico: [], importati: {} };
  dati.profili.push(profilo);
  dati.attivo = profilo.id;
  return { id: profilo.id };
}

/* Elimina un profilo. L'ultimo rimasto non si può eliminare: serve sempre un profilo attivo. */
function eliminaProfilo(dati, id) {
  if (dati.profili.length <= 1) return false;
  dati.profili = dati.profili.filter((p) => p.id !== id);
  if (dati.attivo === id) dati.attivo = dati.profili[0].id;
  return true;
}

function profiloAttivo(dati) {
  return dati.profili.find((p) => p.id === dati.attivo) || dati.profili[0];
}

/* Aggiunge un test allo storico, tenendo solo gli ultimi MAX_STORICO. */
function registraTest(profilo, test) {
  profilo.storico.push(test);
  if (profilo.storico.length > MAX_STORICO) profilo.storico.splice(0, profilo.storico.length - MAX_STORICO);
}

/* Miglior velocità del profilo in una modalità (record importati compresi). */
function migliore(profilo, modalita) {
  const dalloStorico = profilo.storico.filter((t) => t.modalita === modalita).map((t) => t.ppm);
  return Math.max(0, profilo.importati[modalita] || 0, ...dalloStorico);
}

/* Media della velocità negli ultimi `quanti` test di una modalità (null se nessuno). */
function mediaRecente(profilo, modalita, quanti = 10) {
  const ultimi = profilo.storico.filter((t) => t.modalita === modalita).slice(-quanti);
  if (ultimi.length === 0) return null;
  return Math.round(ultimi.reduce((a, t) => a + t.ppm, 0) / ultimi.length);
}

/*
 * Tabella sfida: i profili ordinati per miglior velocità nella modalità scelta.
 * Compaiono solo i profili che hanno almeno un risultato in quella modalità.
 * A pari velocità vince la precisione migliore.
 */
function classifica(dati, modalita) {
  return dati.profili
    .map((p) => {
      const test = p.storico.filter((t) => t.modalita === modalita);
      const ppm = migliore(p, modalita);
      const precisione = Math.max(0, ...test.filter((t) => t.ppm === ppm).map((t) => t.precisione));
      return { id: p.id, nome: p.nome, ppm, precisione, test: test.length };
    })
    .filter((r) => r.ppm > 0)
    .sort((a, b) => b.ppm - a.ppm || b.precisione - a.precisione);
}

/*
 * Legge i profili dall'archivio. Se non ce ne sono (prima visita) crea un
 * profilo predefinito e ci importa i vecchi record salvati prima che esistessero
 * i profili, così nessun risultato va perso.
 */
function caricaProfili(archivio, nomePredefinito, adesso = Date.now()) {
  let dati = datiVuoti();
  try {
    const letti = JSON.parse(archivio.getItem(CHIAVE_PROFILI));
    if (letti && Array.isArray(letti.profili) && letti.profili.length > 0) dati = letti;
  } catch { /* archivio bloccato o dato rovinato: si riparte puliti */ }

  if (dati.profili.length === 0) {
    creaProfilo(dati, nomePredefinito, adesso);
    const profilo = dati.profili[0];
    try {
      for (let i = 0; i < archivio.length; i++) {
        const chiave = archivio.key(i);
        if (chiave && chiave.startsWith("record-digitazione-")) {
          profilo.importati[chiave] = Number(archivio.getItem(chiave)) || 0;
        }
      }
    } catch { /* niente da importare */ }
  }
  if (!dati.profili.some((p) => p.id === dati.attivo)) dati.attivo = dati.profili[0].id;
  return dati;
}

function salvaProfili(archivio, dati) {
  try {
    archivio.setItem(CHIAVE_PROFILI, JSON.stringify(dati));
    return true;
  } catch {
    return false; // archivio pieno o bloccato: il test resta visibile, ma non viene salvato
  }
}

if (typeof module !== "undefined") {
  module.exports = {
    creaProfilo, eliminaProfilo, profiloAttivo, registraTest, migliore, mediaRecente,
    classifica, caricaProfili, salvaProfili, validaNome, datiVuoti, MAX_STORICO, MAX_NOME,
  };
}
