// Rigenera i progetti d'esempio a partire dai modelli: node esempi/genera.js
"use strict";
const fs = require("fs");
const path = require("path");
require("../js/modelli.js");
require("../js/marca.js");
const { MODELLI, normalizzaMarca, fileMarche } = globalThis.StudioVideo;

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

// Modello con segnaposto: ogni marca ci mette nome, slogan, vantaggi e invito.
const modello = MODELLI.promo.crea({ nome: "{nome}", slogan: "{slogan}", url: "", vantaggi: "{vantaggi}", invito: "{invito}", formato: "9:16", tema: "limone" });
modello.nome = "Modello pubblicità";
modello.scene[0].etichetta = "Novità";
modello.scene[3].titolo = "Provalo adesso";
fs.writeFileSync(path.join(__dirname, "modello-promo.json"), JSON.stringify(modello, null, 2) + "\n");
console.log("scritto modello-promo.json");

// Tre marche d'esempio: stesso modello, tre clienti, tre look diversi.
// Prova:  npm run esempi:marche   (modello-promo.json × marche.json = 3 video)
const ora = "2026-11-06T00:00:00.000Z";
const marche = [
  { id: "esempio-prenotalo", nome: "Prenotalo", url: "prenotalo.example", slogan: "Prenotazioni online senza telefonate", invito: "Prova gratis 14 giorni", tema: "anguria",
    vantaggi: "Agenda sempre aggiornata\nPromemoria automatici\nZero buchi in agenda", formato: "9:16",
    scene: { titolo: { regola: { titolo: { scala: 1.1 } } } } },
  { id: "esempio-forno", nome: "Forno Bianchi", url: "fornobianchi.example", slogan: "Pane a lievitazione naturale, ordinalo online", invito: "Ordina il pane", tema: "carta",
    vantaggi: "Sfornato alle 6 ogni mattina\nRitiro senza fila\nFarine macinate a pietra", formato: "9:16",
    scene: { cta: { regola: { pulsante: { scala: 1.25 } } } } },
  { id: "esempio-palestra", nome: "Palestra Nova", url: "palestranova.example", slogan: "Prenota il corso in 10 secondi", invito: "Prenota la prova", tema: "acido",
    vantaggi: "Aperta 7 giorni su 7\nPrima lezione gratis\nIstruttori certificati", formato: "9:16",
    scene: { titolo: { animazione: "macchina", regola: { titolo: { colore: "#c8ff2e" } } } } },
].map((m) => normalizzaMarca(Object.assign({ creata: ora, modificata: ora }, m)));
const file = fileMarche(marche);
file.esportato = ora;
fs.writeFileSync(path.join(__dirname, "marche.json"), JSON.stringify(file, null, 2) + "\n");
console.log("scritto marche.json");
