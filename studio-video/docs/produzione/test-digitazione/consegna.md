# Consegna — Test di digitazione

Scritta dal regista. Primo lavoro completo della squadra video.

| Video | Formato | Durata | File | Esito |
|---|---|---|---|---|
| Promo | 9:16, 1080×1920, H.264 | 19,5 s | `video/test-di-digitazione-promo-9x16.mp4` | APPROVATO dal revisore |
| Tutorial | 16:9, 1920×1080, H.264 | 39,9 s | `video/test-di-digitazione-tutorial-16x9.mp4` | DA RIFARE → corretto (vedi sotto) |

Gli MP4 non stanno nel repository: si rigenerano con
`node render/render.js docs/produzione/test-digitazione/<video>.json --uscita docs/produzione/test-digitazione/video`.

## Percorso

regista (brief) → esploratore (catture e coordinate) → sceneggiatore
(copione) → art director (JSON, provini) → montatore (ritmo, MP4) →
revisore (promo approvata, tutorial con 1 nota bloccante).

## Correzione dopo la revisione

- Nota 1 del revisore: il riepilogo diceva "In tre passi" dopo un tutorial
  numerato 1-4. Il titolo ora è **"Ricapitolando"** (copione e JSON), la
  durata non cambia. Ho rifatto il render 16:9 e controllato il fotogramma a
  33 s. Il controllo l'ha fatto il regista, non un secondo giro del revisore:
  era una sola parola, senza altri effetti.
- In mezzo il motore è stato corretto: nello stile editoriale il browser del
  tutorial non copre più i filetti della cornice, e i titoli del tutorial
  sono tornati a grandezza piena senza ritocchi di ripiego.

## Scelte

- Tema **carta** con l'accento del sito `#d9622b` e carattere grottesco:
  stessa marca nei due video.
- Nessun numero di utenti, nessuna recensione, nessun "gratis": il sito non
  li dimostra.
- Niente musica: non abbiamo brani con diritti chiari.
- Promo in 4:5 non consegnata: i ritocchi per la zona sicura del 9:16 la
  rompono. Serve un JSON dedicato.

## Da proporre la volta dopo

1. Correggere il difetto del sito alla prima visita (`app.js:101`, vedi `sito.md`):
   nessun livello evidenziato e "Maiuscole e punteggiatura" che sembra spento.
2. Versione inglese dei due video (il sito è bilingue).
3. Promo 4:5 per il feed e una seconda promo con gancio alternativo (varianti in `copione.md`).
4. Il revisore ha notato che i fumetti dei passi restano a schermo ~1,2 s:
   allungarli è un lavoro sul motore (comparsa anticipata del fumetto).
