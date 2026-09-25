// Erzeugt index.html (DE) und en/index.html (EN) aus src/page.template.html + src/i18n/*.json.
// Die erzeugten Dateien nicht von Hand bearbeiten – sie stehen in .gitignore.
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';

const template = readFileSync('src/page.template.html', 'utf8');
const dicts = {de: JSON.parse(readFileSync('src/i18n/de.json', 'utf8')), en: JSON.parse(readFileSync('src/i18n/en.json', 'utf8'))};

for (const section of ['page', 'ui']) {
  const de = Object.keys(dicts.de[section]).sort().join(), en = Object.keys(dicts.en[section]).sort().join();
  if (de !== en) throw new Error(`i18n: Schlüssel in "${section}" unterscheiden sich zwischen de.json und en.json`);
}
// Seitentexte landen unescaped in HTML-Attributen und im JSON-LD: gerade Anführungszeichen würden beides still zerbrechen
for (const [lang, dict] of Object.entries(dicts)) {
  for (const [key, value] of Object.entries(dict.page)) {
    if (/["\\]/.test(value)) throw new Error(`i18n: ${lang}.page.${key} enthält " oder \\ – bitte typografische Anführungszeichen („“ bzw. “”) verwenden`);
  }
}

const pages = [
  {lang: 'de', file: 'index.html', url: 'https://noise-gen.com/', manifest: '/manifest.webmanifest', headScripts: '<script src="/lang.js"></script>'},
  {lang: 'en', file: 'en/index.html', url: 'https://noise-gen.com/en/', manifest: '/manifest-en.webmanifest', headScripts: ''},
];

for (const page of pages) {
  const vars = {
    lang: page.lang, url: page.url, manifest: page.manifest, headScripts: page.headScripts,
    currentDe: page.lang === 'de' ? ' aria-current="page"' : '',
    currentEn: page.lang === 'en' ? ' aria-current="page"' : '',
  };
  const html = template.replace(/\{\{([\w.]+)\}\}/g, (_, key) => {
    const value = key.startsWith('page.') ? dicts[page.lang].page[key.slice(5)] : vars[key];
    if (value === undefined) throw new Error(`build-pages: unbekannter Platzhalter {{${key}}} (${page.lang})`);
    return value;
  });
  mkdirSync(page.file.includes('/') ? page.file.split('/')[0] : '.', {recursive: true});
  writeFileSync(page.file, `<!-- Generiert aus src/page.template.html – nicht bearbeiten -->\n${html}`);
}
console.log('Seiten erzeugt: index.html, en/index.html');
