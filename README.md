# Chronicle — Vom Urknall bis Heute

Eine interaktive, zoombare Zeitleiste der Geschichte – vom Urknall (vor ~13,8 Mrd. Jahren) bis in die Gegenwart. Läuft vollständig im Browser, ohne Build-Schritt und ohne Backend.

## Features

- **Stufenloser Zoom** – Mausrad zoomt zur Cursorposition, Pinch auf Touch, Ziehen mit Momentum. Von 13,8 Mrd. Jahren bis auf ~25 Jahre Sichtweite, ohne feste Zoomstufen.
- **Canvas-Rendering** – die gesamte Zeitleiste wird auf einem Canvas gezeichnet: Ereigniskarten mit dynamischem Spurlayout ohne Überlappungen, Wichtigkeits-Fading beim Zoomen, Dichte-Punkte auf der Achse für Ereignisse, die keinen Platz für eine Karte bekommen.
- **Log-Minimap** – die kompletten 13,8 Mrd. Jahre logarithmisch komprimiert als Übersichtsleiste; Klick/Ziehen springt direkt hin.
- **Epochen & Ereignisse** – über 240 historische Ereignisse in fünf Kategorien plus geologische, kulturelle und politische Epochen, per Filter zuschaltbar.
- **Suche** – gewichtete Volltextsuche mit Tastaturnavigation (↑/↓/Enter) und Sprung zum Treffer.
- **KI-Generator** – erzeugt neue Ereignisse zu einem Thema über die OpenAI-API (eigener API-Key nötig, JSON-Mode, validierte Antworten).
- **Geschichts-Quiz** – generiert Fragen aus den vorhandenen Ereignissen.
- **Teilbare Links** – die aktuelle Position steht in der URL (`#t=<Jahr>&s=<Spanne>`).
- **Persistenz** – API-Key und KI-generierte Ereignisse liegen im `localStorage`.

## Bedienung

| Eingabe | Aktion |
| --- | --- |
| Ziehen / Wischen | Verschieben (mit Momentum) |
| Mausrad / Pinch | Zoom zur Cursorposition |
| `+` / `-` | Zoomen |
| `←` / `→` | Verschieben |
| `/` oder `f` | Suche öffnen |
| `Home` | Gesamtansicht |
| `Esc` | Overlays schließen |

## Starten

```
python3 -m http.server 8000
# → http://localhost:8000
```

Ein lokaler Server ist nötig, weil die Seite ES-Module lädt (`file://` reicht nicht).

## Projektstruktur

```
chronicle/
├── index.html          # Markup: Chrome (Header, Filter, Modals) um das Canvas
├── css/
│   └── styles.css      # Design-Tokens, Layout, UI-Komponenten
└── js/                 # ES-Module, kein Build-Schritt
    ├── data.js         # Statische Daten: Epochen, Ereignisse, Kategorien
    ├── time.js         # Zeitformatierung, Achsen-Ticks (1-2-5), Wichtigkeits-Fade
    ├── store.js        # Zentraler State (center/span, Filter), Persistenz, URL-Hash
    ├── renderer.js     # Canvas-Renderer: Epochen, Achse, Ereigniskarten, Hit-Testing
    ├── minimap.js      # Logarithmische Übersichtsleiste
    ├── interaction.js  # Drag/Momentum, Wheel-Zoom, Pinch, Tastatur, goTo-Animation
    ├── panel.js        # Info-Panel
    ├── search.js       # Suche mit Scoring und Tastaturnavigation
    ├── settings.js     # Einstellungen: API-Key, Statistik
    ├── ai.js           # KI-Ereignisgenerator (OpenAI)
    ├── quiz.js         # Quiz
    ├── ui.js           # Helfer: Toasts, HTML-Escaping, Modals, Shuffle
    └── main.js         # Einstiegspunkt und Verdrahtung
```

## Architektur

- **ES-Module** mit expliziten Imports; `index.html` lädt nur `js/main.js` (`type="module"`).
- **Ein State, ein Renderpfad**: `store.js` hält `center` und `span` (sichtbare Jahre); jede Änderung läuft über `notify()`, gezeichnet wird höchstens einmal pro Frame (`requestAnimationFrame`, dirty-flag).
- **Layout pro Frame**: Ereigniskarten werden nach Wichtigkeit sortiert gierig auf Spuren verteilt; was nicht passt, wird zum Dichte-Punkt auf der Achse. Hit-Testing läuft über die beim Zeichnen gesammelten Regionen.
- **Sicherheit**: Alles, was aus der KI, dem `localStorage` oder Suchtreffern in `innerHTML` landet, wird escaped; KI-Antworten werden validiert und geclampt.
