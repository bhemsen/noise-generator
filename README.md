# Noise Generator PWA

Offline-fähiger Noise Synthesizer ohne Backend, Login, Tracking oder externe Audiodateien.

## Start

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Sprachen (DE/EN)

- `/` ist Deutsch, `/en/` Englisch; beide verweisen per `hreflang` aufeinander (`x-default` → `/en/`).
- `index.html` und `en/index.html` werden **generiert** (`npm run pages`, läuft automatisch vor `dev` und `build`) aus `src/page.template.html` und den Texten in `src/i18n/de.json` bzw. `en.json`. Nicht direkt bearbeiten – sie stehen in `.gitignore`.
- `page` enthält die Seitentexte, `ui` die Laufzeit-Texte für `t()` aus `src/i18n.ts`. Beide Dateien müssen dieselben Schlüssel haben, sonst bricht der Build ab.
- Die Rechtsseiten sind handgeschrieben: `impressum.html`/`datenschutz.html` (maßgeblich) und `en/imprint.html`/`en/privacy.html` (Übersetzung).
- Die Sprachwahl wird lokal gemerkt; `public/lang.js` leitet `/` dann auf `/en/` um.

## Deploy (Cloudflare Pages)

Deployment über die Git-Integration von Cloudflare Pages: Push auf `main` geht nach Production, andere Branches und PRs bekommen eine Preview-URL.

Einstellungen im Pages-Projekt:

- Framework preset: *None*
- Build command: `npm run build:deploy`
- Build output directory: `dist`
- Node-Version kommt aus `.node-version`

`build:deploy` baut und prüft danach, dass im Build keine `TODO-…`-Platzhalter mehr stehen (Impressum, Datenschutz). Solange welche drin sind, schlägt der Cloudflare-Build bewusst fehl. Security-Header und Caching stehen in `public/_headers`.

## Funktionen

- White/Pink/Brown/Blue/Violet und kontinuierliche Spektralneigung (angenähert, nicht kalibriert)
- Low-/High-Cut, Stereo-Breite, Lautstärke, Live-Spektrum
- Sleep-Timer, Fade-in/-out, Media Session (browserabhängig)
- Presets und letzte Einstellungen in IndexedDB; JSON-Backup und -Import
- Stereo-PCM-WAV-Export (44,1 kHz, 16 Bit, 15–120 Sekunden); benötigt OfflineAudioContext.audioWorklet
- Offline-PWA via Workbox; iOS-Home-Screen-Metadaten

## Wichtige Hinweise

- PWA-Installation und Service Worker benötigen HTTPS oder localhost. Beim allerersten Besuch ist Internet nötig, danach werden App-Dateien zwischengespeichert.
- Browser können lokale Daten löschen; JSON-Backup für eigene Presets verwenden.
- iOS/Safari kann Audio im Hintergrund oder bei gesperrtem Bildschirm unterbrechen. Media Session garantiert keine Hintergrundwiedergabe.
- WAV-Export kann auf Safari-Versionen ohne AudioWorklet im OfflineAudioContext nicht funktionieren; Desktop-Chromium verwenden.
- Die Farben sind DSP-Annäherungen, keine laborkalibrierten 1/f-Spektren. Spektralneigung ist im Bereich −6 bis +6 dB/Oktave einstellbar.
- Vor Kopfhörern mit niedriger Lautstärke starten. Die tatsächliche Lautstärke hängt vom Ausgabegerät ab.
