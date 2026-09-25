# Schach Lernen

Eine einfache Progressive Web App (PWA), um die Grundlagen des Schachspiels zu
lernen: interaktive Lektionen zu Regeln, Spezialzügen, Eröffnungsprinzipien
und Taktik, sowie ein Sparring-Modus gegen die Stockfish-Engine mit
einstellbarem Schwierigkeitsgrad.

## Installation auf dem Android-Handy

1. Die App unter der veröffentlichten GitHub-Pages-URL im Chrome-Browser öffnen.
2. Chrome-Menü (drei Punkte) → "Zum Startbildschirm hinzufügen" bzw.
   "App installieren" antippen.
3. Die App erscheint danach als eigenes Icon auf dem Homescreen und lässt
   sich offline nutzen.

## Lokale Entwicklung

Kein Build-Schritt nötig – reines HTML/CSS/JavaScript. Zum lokalen Testen
reicht ein beliebiger statischer Webserver im Projektverzeichnis, z. B.:

```bash
python3 -m http.server 8420
```

Danach `http://localhost:8420` im Browser öffnen.

## Technik

- **Regeln & Zugvalidierung:** [chess.js](https://github.com/jhlywa/chess.js) (`vendor/chess.esm.js`)
- **Gegner:** [Stockfish.js](https://github.com/nmrugg/stockfish.js), lite/single-threaded WASM-Build (`vendor/stockfish.js` + `.wasm`), läuft als Web Worker
- **Brett & Figuren:** eigene, leichte SVG-Komponente mit Unicode-Schachsymbolen (`js/board.js`)
- **Offline/Installation:** Web App Manifest (`manifest.json`) + Service Worker (`service-worker.js`)

## Projektstruktur

```
index.html          Einstiegspunkt, Tab-Navigation
manifest.json        PWA-Manifest
service-worker.js     Offline-Caching
css/style.css        Gesamtes Styling
js/app.js            Tab-Steuerung, Service-Worker-Registrierung
js/board.js           Schachbrett-Komponente (SVG)
js/chess-utils.js      Hilfsfunktionen rund um chess.js
js/engine.js           Stockfish-Wrapper (UCI über Web Worker)
js/lessons.js           Lektions-Player (Info-/Aufgaben-Schritte)
js/lessons-data.js       Lektionsinhalte (Kapitel, Texte, Aufgaben)
js/sparring.js           Sparring-Modus gegen die Engine
vendor/                Eingebundene Bibliotheken (chess.js, Stockfish)
icons/                 App-Icons
```
