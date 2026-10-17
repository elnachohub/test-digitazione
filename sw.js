/*
 * Service worker: fa funzionare il test anche senza rete e permette di
 * installarlo sul telefono come un'app.
 *
 * Strategia "prima la rete": con la connessione si scarica SEMPRE la versione
 * più nuova (e se ne salva una copia); senza connessione si usa l'ultima copia.
 * Perché non "prima la copia salvata": più veloce, ma dopo ogni modifica si
 * vedrebbe la versione vecchia, proprio il difetto che servi.py ha eliminato.
 *
 * Nessun dato dell'utente passa di qui: profili e risultati restano in localStorage.
 */

// Cambiare il numero quando cambia l'elenco dei file: la copia vecchia viene buttata.
const CACHE = "digitazione-v10";
const FILE = [
  "./", "index.html", "stile.css", "testi.js", "frasi.js", "logica.js",
  "profili.js", "grafico.js", "app.js", "manifest.webmanifest",
  "icona.svg", "icona-180.png", "icona-192.png", "icona-512.png",
];

self.addEventListener("install", (evento) => {
  evento.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches.keys()
      .then((nomi) => Promise.all(nomi.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (evento) => {
  const richiesta = evento.request;
  // Solo letture dei nostri file: tutto il resto passa senza toccarlo.
  if (richiesta.method !== "GET" || new URL(richiesta.url).origin !== self.location.origin) return;
  evento.respondWith(
    fetch(richiesta)
      .then((risposta) => {
        if (risposta.ok) {
          const copia = risposta.clone();
          caches.open(CACHE).then((c) => c.put(richiesta, copia));
        }
        return risposta;
      })
      .catch(async () => (await caches.match(richiesta)) || caches.match("index.html")),
  );
});
