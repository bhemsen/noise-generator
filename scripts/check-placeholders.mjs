// Verhindert einen Production-Deploy mit unausgefülltem Impressum/Sponsor-Link.
import {readdirSync, readFileSync, statSync} from 'node:fs';
import {join} from 'node:path';

const hits = [];
const walk = dir => {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path);
    else if (/\.(html|js)$/.test(name) && readFileSync(path, 'utf8').includes('TODO-')) hits.push(path);
  }
};
walk('dist');
if (hits.length) {
  console.error(`Platzhalter (TODO-…) im Build gefunden:\n  ${hits.join('\n  ')}`);
  process.exit(1);
}
console.log('Keine Platzhalter im Build.');
