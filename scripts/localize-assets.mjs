// Downloads every image the site still loads from Shopify / Judge.me into site/assets/img
// and rewrites the pages to use the local copies. Run once before you close the Shopify store:
//   node scripts/localize-assets.mjs
// Videos are skipped (too big). Re-encode them small and put them in site/assets/video yourself.
import { readFile, writeFile, mkdir, readdir, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

const SITE = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../site');
const OUT = path.join(SITE, 'assets/img');
const RE = /https:\/\/(?:cdn\.shopify\.com\/s\/files|review-images\.judgeme\.com)\/[^\s"'<>)]+/g;

async function files(dir) {
  const out = [];
  for (const f of await readdir(dir)) {
    const p = path.join(dir, f);
    if ((await stat(p)).isDirectory()) out.push(...await files(p));
    else if (/\.(html|js|json|css)$/.test(f)) out.push(p);
  }
  return out;
}

await mkdir(OUT, { recursive: true });
const list = await files(SITE);
const map = new Map();
for (const f of list) for (const u of (await readFile(f, 'utf8')).matchAll(RE)) map.set(u[0].replace(/&amp;/g, '&'), null);

let n = 0;
for (const url of map.keys()) {
  const clean = url.split('?')[0];
  const ext = (path.extname(clean) || '.jpg').toLowerCase();
  const name = createHash('sha1').update(url).digest('hex').slice(0, 12) + ext;
  const res = await fetch(url);
  if (!res.ok) { console.warn('skip', res.status, url); continue; }
  await writeFile(path.join(OUT, name), Buffer.from(await res.arrayBuffer()));
  map.set(url, '/assets/img/' + name);
  if (++n % 20 === 0) console.log(n, 'downloaded');
}

for (const f of list) {
  let t = await readFile(f, 'utf8');
  const before = t;
  t = t.replace(RE, m => map.get(m.replace(/&amp;/g, '&')) || m);
  if (t !== before) await writeFile(f, t);
}
console.log(`Done: ${n} files saved to site/assets/img and pages updated.`);
