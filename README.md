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

## Deploy (Cloudflare Pages)

Die Pipeline `.github/workflows/deploy.yml` baut bei jedem Push und deployt per Wrangler: `main` geht nach Production, PR-Branches bekommen eine Preview-URL.

Einmalige Einrichtung:

1. Pages-Projekt anlegen: `npx wrangler pages project create noise-generator --production-branch=main`
2. In Cloudflare einen API-Token mit der Berechtigung *Account → Cloudflare Pages → Edit* erstellen.
3. Im GitHub-Repo unter *Settings → Secrets and variables → Actions* die Secrets `CLOUDFLARE_API_TOKEN` und `CLOUDFLARE_ACCOUNT_ID` hinterlegen.
4. Optional: eine Custom Domain im Pages-Projekt verbinden.

Vor jedem Deploy prüft `npm run check:placeholders`, dass im Build keine `TODO-…`-Platzhalter mehr stehen (Impressum, Datenschutz, Sponsor-Link). Security-Header und Caching stehen in `public/_headers`.

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
