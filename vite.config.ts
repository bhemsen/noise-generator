import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // Absolut, damit /en/ dieselben Assets, Service Worker und Worklet nutzt
  base: '/',
  // index.html und en/index.html erzeugt scripts/build-pages.mjs (predev/prebuild)
  build: {rollupOptions: {input: {
    main: 'index.html', impressum: 'impressum.html', datenschutz: 'datenschutz.html',
    en: 'en/index.html', enImprint: 'en/imprint.html', enPrivacy: 'en/privacy.html'
  }}},
  plugins: [VitePWA({
    registerType: 'autoUpdate',
    includeAssets: ['worklet.js', 'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'apple-touch-icon.png'],
    // Ein Manifest pro Sprache (public/manifest.webmanifest, public/manifest-en.webmanifest), verlinkt über die Seitenvorlage,
    // damit die von /en/ installierte App auch auf /en/ startet
    manifest: false,
    workbox: {globPatterns: ['**/*.{js,css,html,png,svg,webmanifest}'], globIgnores: ['og-image*.png'], cleanupOutdatedCaches: true, navigateFallback: 'index.html'}
  })]
});
