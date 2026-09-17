# openMedAT

Inoffizieller Trainings-Trainer für die kognitiven Fähigkeiten und Fertigkeiten (KFF) des MedAT — 8 Übungsmodule, komplett tastatursteuerbar, ohne Backend.

Alle Daten (Statistiken, laufende Sessions) bleiben im Browser der jeweiligen Person (`localStorage`). Es gibt kein Konto, keinen Server und keine Übertragung von Daten.

## Testmodule

| Modul                     | Inhalt                                                                                                     | Umfang                                     |
| ------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| 🔢 Zahlenfolgen           | 7 Zahlen → 8. und 9. Stelle berechnen                                                                      | 10 Aufgaben (15 Min) oder Endlosmodus      |
| 🔤 Wortflüssigkeit        | Wort zum Anfangsbuchstaben erkennen                                                                        | 15 Aufgaben (20 Min) oder Endlosmodus      |
| 🧠 Implikationen erkennen | Zwei Aussagen → logisch korrekte Schlussfolgerung                                                          | 10 Aufgaben (10 Min) oder Endlosmodus      |
| 💳 Allergieausweise       | Merkphase → Wartezeit → Abfrage                                                                            | konfigurierbar (2–8 Ausweise, 5–25 Fragen) |
| 🔷 Figuren zusammensetzen | Einzelteile zu einer Figur zusammensetzen, zusätzlich Winkel üben                                          | 15 Aufgaben (20 Min) oder Endlosmodus      |
| 🔗 Major-System           | Zahlen ↔ Bildwörter (Ziffern 0–9, Zahlen 1–100), Multiple Choice oder Eingabe                              | Einstellungen im Modul                     |
| 🎓 Simulation             | Komplette KFF-Simulation: alle 5 KFF-Kategorien in Originalreihenfolge mit Zeitlimits und gewichteter Auswertung | fester Ablauf                              |
| 📝 Simulationsrechner     | Timer und Auswertung für externe Simulationen                                                              | fester Ablauf                              |

## Features

- **Tastatursteuerung:** Das gesamte Menü und alle Tests lassen sich ohne Maus bedienen.
- **Statistik:** Ergebnisse aus dem Nicht-Endlosmodus werden gespeichert und im Hauptmenü als Verlauf (letzte 10 Läufe pro Test, Ø-Prozent) angezeigt.
- **Fortsetzen:** Simulation und Simulationsrechner speichern den Fortschritt still im Hintergrund — nach versehentlichem Zurückgehen kann weitergemacht werden. Die Abfrage der Allergieausweise bleibt ebenfalls erhalten; die Merkphase dagegen läuft bewusst ohne Speicherung.
- **Abfrage-Timer:** Nach der Merkphase läuft die Wartezeit weiter, auch wenn man andere Übungen macht. Ein Hinweis auf der Startseite (plus Ton/Benachrichtigung) erinnert an die Abfrage.
- **Onboarding:** Beim ersten Besuch erklärt ein Overlay die Tastatursteuerung.

## Schnellstart

```bash
npm install
npm run dev      # → http://localhost:5173
```

| Befehl            | Zweck                          |
| ----------------- | ------------------------------ |
| `npm run dev`     | Entwicklungsserver (Vite)      |
| `npm run build`   | Produktions-Build nach `dist/` |
| `npm run preview` | Build lokal testen             |
| `npm test`        | Vitest (Generatoren und Utils) |
| `npm run lint`    | ESLint                         |
| `npm run format`  | Prettier                       |

## Tastaturkürzel

| Bereich       | Tasten                                                                                      |
| ------------- | ------------------------------------------------------------------------------------------- |
| Hauptmenü     | `↑ ↓ ← →` navigieren · `Enter` öffnen · `1`–`8` direkt wählen                               |
| Einstellungen | `↑ ↓` Zeile wechseln · `← →` Option wählen · `Enter` bestätigen · `Esc` zurück              |
| In Tests      | `A S D F G` Antwortoptionen · `Esc` zurück · `Tab` nächste Frage (Allergieausweise-Abfrage) |

## Projektstruktur

```
src/
├── App.jsx            Hauptmenü, Routing, Statistik-Ansicht
├── main.jsx           Einstiegspunkt (React 18, StrictMode)
├── router.js          Minimaler pushState-Router (navigate/useRoute)
├── theme.js           Farbpalette
├── allergStore.js     Persistenz der Allergieausweise-Session (localStorage)
├── tests/             Die 8 Testmodule
├── components/
│   ├── Shared.jsx     UI-Bausteine, Timer, Tastatur-Hooks, Statistiken
│   └── Feedback.jsx   Feedback-Modal (Reddit-DM / E-Mail)
├── data/              Wortlisten, Länder, Allergene, Major-System-Tabelle
│   └── gens/          Zahlenfolgen-Generatoren (mit Vitest-Tests)
└── utils/random.js
```

## Speicherung (localStorage)

| Key                            | Inhalt                                                |
| ------------------------------ | ----------------------------------------------------- |
| `openmedat_stats`              | Testergebnisse für die Statistik-Ansicht              |
| `openmedat_allerg_session`     | Laufende Allergieausweise-Session (Wartezeit/Abfrage) |
| `openmedat_simulation_session` | Laufende Simulation (Fortsetzen)                      |
| `openmedat_simrechner_session` | Laufende Simulationsrechner-Session                   |
| `openmedat_visited`            | Onboarding bereits gesehen                            |

## Deployment

Der Build ist eine statische Seite. Wegen der pfadbasierten Routen (`/zahlenfolgen`, `/simulation`, …) braucht der Webserver einen SPA-Fallback auf `index.html` — eine passende `nginx.conf` liegt im Repo:

```nginx
location / {
    root /var/www/html;
    try_files $uri $uri/ /index.html;
}
```

## Rechtliches & Kontakt

openMedAT ist ein inoffizielles Hobbyprojekt und steht in keiner Verbindung zur Medizinischen Universität, dem MedAT oder dessen Veranstaltern. Alle Inhalte dienen ausschließlich der privaten Übung. Irrtümer und Fehler vorbehalten.

Feedback, Bugs und Ideen: über den ✉-Button in der App (Reddit-DM oder E-Mail) oder an **laurinpublic@gmail.com**.
