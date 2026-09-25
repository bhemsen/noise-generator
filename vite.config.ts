import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  build: {rollupOptions: {input: {main: 'index.html', impressum: 'impressum.html', datenschutz: 'datenschutz.html'}}},
  plugins: [VitePWA({
    registerType: 'autoUpdate',
    includeAssets: ['worklet.js', 'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'apple-touch-icon.png'],
    manifest: {
      id: './', name: 'Noise Generator', short_name: 'Noise', description: 'Offline noise synthesizer',
      start_url: './', scope: './', display: 'standalone', background_color: '#0b1015', theme_color: '#0b1015',
      icons: [
        {src:'icons/icon-192.png',sizes:'192x192',type:'image/png'},
        {src:'icons/icon-512.png',sizes:'512x512',type:'image/png'},
        {src:'icons/icon-512.png',sizes:'512x512',type:'image/png',purpose:'maskable'}
      ]
    },
    workbox: {globPatterns: ['**/*.{js,css,html,png,svg,webmanifest}'], cleanupOutdatedCaches: true, navigateFallback: 'index.html'}
  })]
});
