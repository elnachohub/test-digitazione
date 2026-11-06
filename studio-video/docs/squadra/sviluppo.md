# Registro dello sviluppo

## Giro 1 (6 novembre 2026) — bug della QA, rischi legali, correzioni rapide del designer

Verifica: `node test/collaudo.js --bug` → **13/13 flussi superati, 0/8 bug noti aperti**.

| Da | Cosa | Dove |
|---|---|---|
| QA G1 | i vantaggi che iniziano con un numero non perdono le cifre | `js/modelli.js` (`righe`) |
| QA G2 | Invio nel generatore e nella scheda marca = azione principale | `index.html`, `css/editor.css` (`.fondo-finestra.invertito`) |
| QA G3 | 6 punti stanno nello schermo: schede, cerchi e spazi si stringono col testo | `js/motore.js` (`SCENE.punti`) |
| QA G4 | numeri all'italiana: "1.200" resta 1.200, "24/7" resta così; formato fatto a mano, uguale su ogni computer | `js/motore.js` (`leggiNumero`, `formattaNumero`) |
| QA G5 | un clic di selezione non cancella più "Ripeti": la storia si registra al primo movimento vero | `js/editor.js` (`preparaStoriaGesto`) |
| QA G6 | `sfondo.immagine` relativo funziona in `render.js` e `fotogrammi.js` | `render/render.js` |
| QA G7 | due progetti con lo stesso nome non si sovrascrivono | `render/render.js` |
| QA G8 | JSON scritti a mano con tipi sbagliati: normalizzati e annotati, non mandano in errore | `js/modelli.js` (`normalizzaProgetto`), editor, `render/pagina.html`, `render.js`, `verifica.js` |
| QA G9 | un render interrotto non lascia un MP4 a metà (file provvisorio) | `render/render.js` |
| QA M1, M3, M4, M6, M8, M9, M10, M11 | focus del nuovo passo; annulla per scena; Ctrl+Y bloccato nelle finestre; durate/animazioni non valide; pulsante lungo; limiti di durata e stelle; messaggi chiari su musica/JSON/file mancanti | editor, motore, `render.js`, `verifica.js` |
| Legale 1 | niente numeri né recensioni inventati nei modelli: segnaposto `[[...]]` che `verifica.js` e `render.js` bloccano (`--bozza` per prove interne) e l'esportazione segnala | `js/modelli.js`, `render/*.js`, `js/editor.js` |
| Designer | macchina da scrivere: la riga resta ferma e il cursore non copre le lettere | `js/motore.js` |
| Designer | testo scuro sui pulsanti rosa (contrasto); piede fisso delle finestre; anteprima in alto sotto i 1100 px | `css/editor.css` |
| Art director | tutorial in stile editoriale: il browser non copre più i filetti | `js/motore.js` (`geometriaTutorial`) |
| — | test della durata totale calcolato dalle scene (non più un valore fisso) | `test/collaudo.js` |

### Aperto

- QA M2, M5, M7, M12-M16 (minori): Ctrl+Z dentro i campi, import di marche senza id,
  salvataggio alla chiusura entro 0,5 s, validazioni di `fotogrammi.js`,
  `cattura-sito.js` su pagine lunghissime, passo aggiunto sopra un altro,
  generatore che ricorda la schermata precedente, immagini relative aperte nell'editor.
- Designer: zona sicura 9:16 automatica nel motore (12% alto, 20% basso),
  stelle poco visibili nello stile editoriale, a capo dei titoli nello stile sfumato.
