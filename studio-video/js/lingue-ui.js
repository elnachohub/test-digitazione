/*
 * Dizionari dell'interfaccia: frase italiana → traduzione.
 * Si aggiornano con: node test/stringhe-ui.js (elenca le frasi mancanti).
 */
(function (globale) {
  "use strict";
  const SV = (globale.StudioVideo = globale.StudioVideo || {});
  SV.DIZIONARI = { en: {} };
})(typeof window !== "undefined" ? window : globalThis);
