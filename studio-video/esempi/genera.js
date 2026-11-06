// Rigenera i progetti d'esempio a partire dai modelli: node esempi/genera.js
"use strict";
const fs = require("fs");
const path = require("path");
require("../js/modelli.js");
const { MODELLI } = globalThis.StudioVideo;

const dati = {
  nome: "Prenotalo",
  slogan: "Prenotazioni online senza telefonate",
  url: "https://prenotalo.example",
  vantaggi: "Agenda sempre aggiornata\nPromemoria automatici ai clienti\nPagamenti anticipati, zero buchi",
  invito: "Prova gratis 14 giorni",
  tema: "limone",
};
const passi = "Scegli il servizio\nSeleziona giorno e ora\nConferma: arriva subito la mail";

const esempi = {
  "promo.json": MODELLI.promo.crea(Object.assign({}, dati, { formato: "9:16", tema: "anguria" })),
  "presentazione.json": MODELLI.presentazione.crea(Object.assign({}, dati, { tema: "carta" })),
  "tutorial.json": MODELLI.tutorial.crea(Object.assign({}, dati, { vantaggi: passi, tema: "acido", formato: "16:9" })),
};
for (const [nome, progetto] of Object.entries(esempi)) {
  fs.writeFileSync(path.join(__dirname, nome), JSON.stringify(progetto, null, 2) + "\n");
  console.log("scritto", nome);
}
