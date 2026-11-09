# Formato di un progetto video (per la squadra di produzione)

Un video è un file JSON. L'editor lo apre con **Apri**, gli attrezzi lo
leggono da riga di comando. Questo documento è la fonte di verità: se il
codice cambia, va aggiornato.

## Struttura

```json
{
  "nome": "Test di digitazione — promo",
  "lingua": "it",
  "formato": "9:16",
  "tema": "limone",
  "accento": "",
  "carattere": "auto",
  "animazione": "auto",
  "transizione": "dissolvenza",
  "marchio": { "nome": "Test di digitazione", "url": "elnachohub.github.io/test-digitazione", "logo": "sito/logo.png" },
  "musica": "",
  "volume": 0.8,
  "scene": [ { "tipo": "titolo", "durata": 3, "titolo": "…" } ]
}
```

| Campo | Valori |
|---|---|
| `lingua` | lingua del video: `it` `en` `es` `fr` `de` `pt` `nl` `pl`. Decide il formato dei numeri (1.200 / 1,200 / 1 200), le maiuscole e i testi delle scene nuove. Non traduce i testi già scritti: per quello c'è `render/testi.js` |
| `formato` | `16:9` (YouTube, sito), `9:16` (Reels, TikTok, Shorts), `1:1`, `4:5` (feed) |
| `tema` | `limone` `cobalto` `anguria` (pop) · `carta` `inchiostro` (editoriale) · `acido` `laser` (griglia) · `tramonto` `oceano` (sfumato) |
| `accento` | colore `#rrggbb` che sostituisce quello del tema; `""` = del tema |
| `carattere` | `auto` (del tema), `pesante`, `manifesto` (maiuscolo), `grottesco`, `editoriale`, `tecnico`, `largo`, `pulito` |
| `animazione` | testo: `auto` (dello stile), `sali`, `scatto`, `maschera`, `macchina`, `nessuna` |
| `transizione` | `dissolvenza`, `scorrimento`, `zoom` |
| `marchio` | nome e sito mostrati nel video; `logo` = percorso relativo al JSON, URL o data URL |
| `musica` | percorso di un file audio (o data URL); nel comando si può usare `--musica` |

Le immagini (`logo`, `immagine`, `sfondo.immagine`) possono essere **percorsi
relativi al file JSON**: è il modo giusto per la squadra (niente data URL
giganti nel JSON).

## Scene

Ogni scena ha `tipo` e `durata` (secondi, minimo 1). Campi per tipo:

| Tipo | Campi | Per cosa |
|---|---|---|
| `titolo` | `etichetta` (adesivo sopra, facoltativo), `titolo`, `sottotitolo`, `logo` | apertura, gancio |
| `punti` | `titolo`, `punti` (lista, max 6, ideale 3) | vantaggi, riepiloghi |
| `schermata` | `titolo`, `testo` (entrambi vuoti = schermata a tutto schermo), `immagine`, `dispositivo` (`browser`/`telefono`), `scorri` (true = la pagina intera scorre), `url` | mostrare il sito |
| `tutorial` | `titolo`, `immagine` (UN solo schermo, non la pagina intera), `zoom` (true), `url`, `passi`: `[{ "testo", "x", "y" }]` | il cursore clicca i punti giusti |
| `numeri` | `titolo`, `valori`: `[{ "valore": "1200", "prefisso": "", "suffisso": "+", "etichetta": "clienti" }]` max 4 | prove, risultati |
| `citazione` | `testo`, `autore`, `ruolo`, `stelle` (0-5) | recensioni (solo vere!) |
| `cta` | `titolo`, `pulsante`, `url`, `logo`, `clic` (il cursore clicca) | chiusura, sempre ultima |

**Passi del tutorial**: `x` e `y` sono frazioni (0-1) dell'immagine della
scena. `render/cattura-sito.js` le fornisce già in `sito.json → cliccabili`
per `computer-schermo.jpg`. Il cursore impiega la durata della scena divisa
per il numero di passi: almeno 2,5 s a passo.

## Per ogni scena, facoltativi

- `animazione`: come sopra, solo per questa scena.
- `sfondo`: `{ "tipo": "colore", "colore": "#111111" }` oppure
  `{ "tipo": "immagine", "immagine": "foto.jpg", "velo": 0.45 }` (velo 0-0.85).
- `regola`: ritocchi a mano per elemento, `{ "<id>": { "dx": 0, "dy": 0, "scala": 1, "colore": "#…", "nascosto": false } }`.
  `dx`/`dy` in unità = 1% del lato corto del video (positivi = destra/giù).

Id degli elementi per tipo:

| Tipo | Id |
|---|---|
| `titolo` | `logo`, `etichetta`, `titolo`, `linea`, `sottotitolo` |
| `punti` | `titolo`, `punto0` … `punto5` |
| `schermata` | `titolo`, `testo`, `dispositivo` |
| `tutorial` | `titolo` |
| `numeri` | `titolo`, `numero0` … `numero3` |
| `citazione` | `virgolette`, `stelle`, `testo`, `autore` |
| `cta` | `logo`, `titolo`, `pulsante`, `url` |

## Segnaposto (modelli per tante marche)

Nei testi: `{nome}`, `{slogan}`, `{invito}`, `{sito}`, `{url}`,
`{vantaggio1}` … `{vantaggio6}`; una riga dei `punti` uguale a `{vantaggi}`
diventa tutti i vantaggi della marca. Si riempiono con `--marca marche.json`.

## Regole di mestiere (quelle che fanno vendere)

- **Gancio entro 3 s**: la prima scena dice il beneficio, non il nome.
- **Un'idea per scena.** Titoli ≤ 8 parole, punti ≤ 9 parole, pulsante ≤ 4.
- **Tempo di lettura**: circa 0,8 s + 1 s ogni 3,5 parole. `verifica.js` lo controlla.
- **Durate**: Reels/TikTok 12–25 s, YouTube/sito 20–45 s, tutorial ≤ 60 s.
- **Zona sicura in 9:16**: niente testo importante nel 12% in alto e nel 20%
  in basso (lì ci sono le icone del social). Usa `regola.*.dy` per spostare.
- **Chiudi sempre con una `cta`** e il sito leggibile.
- **Niente numeri o recensioni inventati**: solo dati che il cliente può dimostrare.
  I modelli mettono segnaposto `[[...]]`: `verifica.js` e `render.js` si
  fermano finché restano (`--bozza` solo per prove interne).
- **Numeri**: scrivi il valore puro (`1200`, `4.9`): il motore lo formatta
  secondo la lingua del video. "24/7" o "10k" restano come scritti.
- **Altre lingue**: il tedesco è ~30% più lungo dell'inglese, il francese
  ~20%: accorcia le idee, non i caratteri. Verifica sempre i provini.

## Attrezzi

```bash
node render/cattura-sito.js https://sito.it --uscita docs/produzione/<cliente>/sito
node render/verifica.js progetto.json [--marca marche.json]
node render/fotogrammi.js progetto.json [--formato 9:16] [--uscita cartella]   # foglio provini
node render/testi.js estrai progetto.json --uscita testi.json                  # foglio dei testi da tradurre
node render/testi.js applica progetto.json testi-en.json --lingua en --uscita progetto-en.json
node render/render.js progetto.json --formati 9:16,16:9 --uscita video
```
