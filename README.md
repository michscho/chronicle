# Chronicle — Vom Urknall bis Heute

Eine interaktive, zoombare Zeitleiste der Geschichte – vom Urknall (vor ~13,8 Mrd. Jahren) bis in die Gegenwart. Läuft vollständig im Browser, ohne Build-Schritt und ohne Backend.

## Features

- **Stufenlose Navigation** – Ziehen zum Verschieben (mit Momentum), Zoom über 10 Stufen von „Kosmisch" bis „Fein".
- **Epochen & Ereignisse** – über 240 historische Ereignisse, kategorisiert nach Ereignis, Wissenschaft, Kultur, Politik und Person, gefiltert nach Wichtigkeit und Kategorie.
- **Suche** – gewichtete Volltextsuche über Ereignisse und Epochen mit Sprung zum Treffer.
- **KI-Generator** – erzeugt neue Ereignisse zu einem Thema über die OpenAI Chat-Completions-API (eigener API-Key nötig).
- **Geschichts-Quiz** – generiert Fragen aus den vorhandenen Ereignissen.
- **Persistenz** – API-Key und KI-generierte Ereignisse werden im `localStorage` gespeichert.

## Projektstruktur

```
chronicle/
├── index.html          # Markup; bindet styles.css und die JS-Module ein
├── css/
│   └── styles.css       # Gesamtes Styling (Design-Tokens, Layout, Komponenten)
└── js/
    ├── data.js          # Statische Daten: Epochen, Ereignisse, Zoom-Stufen
    ├── state.js         # Veränderlicher Laufzeit-State + zwischengespeicherte DOM-Referenzen
    ├── timeline.js      # Rendering: Epochen/Ereignisse aufbauen, Viewport-Update, Zeitmarker
    ├── navigation.js    # Zoom, Drag/Pan, Momentum, goToTime-Animation
    ├── search.js        # Such-Overlay: Scoring und Treffer-Navigation
    ├── panel.js         # Info-Panel und Kategorie-Label/-Farben
    ├── settings.js      # Einstellungen: API-Key + Persistenz der KI-Ereignisse, Statistik
    ├── ai.js            # KI-Ereignisgenerator (OpenAI)
    ├── quiz.js          # Quiz: Fragen erzeugen, rendern, auswerten
    ├── ui.js            # Kleine UI-Helfer (Toasts)
    └── main.js          # Einstiegspunkt: init(), Event-Binding, globale Handler, Bootstrap
```

### Architektur-Hinweise

- Die JS-Dateien sind **klassische Scripts** (kein `type="module"`). Sie teilen sich denselben globalen Lexical-Scope, daher sind Top-Level-`const`/`let`/`function` dateiübergreifend sichtbar.
- **Ladereihenfolge = Abhängigkeitsreihenfolge.** `main.js` muss zuletzt geladen werden, da es `init()` aufruft und Funktionen für Inline-`onclick`-Handler an `window` hängt. Reihenfolge ist in `index.html` festgelegt.
- Gemeinsamer veränderlicher State (z. B. `centerTime`, `zoomIndex`, `categories`) lebt in `state.js`; die Rendering-Pipeline läuft über `update()` in `timeline.js`.

## Lokal starten

Die Anwendung benötigt keinen Build-Schritt.

```bash
# Option A: direkt öffnen
open index.html

# Option B: lokaler Server (empfohlen – konsistentes Verhalten beim Laden der Scripts)
python3 -m http.server 8000
# danach http://localhost:8000 aufrufen
```

Eine Internetverbindung wird für die Google-Fonts und – falls genutzt – für die OpenAI-API benötigt.

## KI-Generator einrichten

1. Über das Zahnrad-Icon die Einstellungen öffnen.
2. Einen OpenAI-API-Key (`sk-…`) eintragen und speichern.
3. Der Key wird ausschließlich lokal im `localStorage` des Browsers gespeichert und direkt vom Browser an `api.openai.com` gesendet.

> **Hinweis:** Der API-Key wird clientseitig gehalten. Diese App ist als persönliches/lokales Werkzeug gedacht; ein im Browser hinterlegter Key sollte nicht öffentlich bereitgestellt werden.
