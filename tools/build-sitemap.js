#!/usr/bin/env node
// Erzeugt sitemap.xml aus den tatsaechlich vorhandenen Seiten.
//
// Warum nicht von Hand: die Sitemap wurde bisher getippt und war dadurch
// unvollstaendig (ETF-Overlap-Rechner und Kreditkarten-Finder fehlten) und die
// lastmod-Daten veraltet. Aufgenommen wird jede index.html, ausser sie traegt
// <meta name="robots" content="noindex...> - so bleiben Bestaetigungs- und
// Danke-Seiten draussen, ohne dass man daran denken muss.
// lastmod kommt aus dem letzten Commit der Datei.
//
// Aufruf:
//   node tools/build-sitemap.js --check   nur pruefen (Exit 1 bei Abweichung)
//   node tools/build-sitemap.js           sitemap.xml schreiben
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const ORIGIN = 'https://moneywithrami.com';
const checkOnly = process.argv.includes('--check');

// Wie oft sich eine Seite erfahrungsgemaess aendert und wie wichtig sie ist.
function rank(url) {
  if (url === '/') return { changefreq: 'weekly', priority: '1.0' };
  if (url.startsWith('/calculator/')) return { changefreq: 'monthly', priority: '0.9' };
  if (url === '/impressum/' || url === '/datenschutz/') return { changefreq: 'yearly', priority: '0.3' };
  if (/^\/stuff_i_use\/insurance\/.+/.test(url)) return { changefreq: 'monthly', priority: '0.7' };
  return { changefreq: 'monthly', priority: '0.8' };
}

const pages = execSync("git ls-files '*/index.html' 'index.html'", { cwd: ROOT })
  .toString()
  .split('\n')
  .filter((f) => f && !f.startsWith('graphify'))
  .map((file) => {
    const html = fs.readFileSync(path.join(ROOT, file), 'utf8');
    if (/<meta\s+name="robots"[^>]*content="[^"]*noindex/i.test(html)) return null;
    const url = '/' + file.replace(/index\.html$/, '');
    const lastmod =
      execSync(`git log -1 --format=%cs -- "${file}"`, { cwd: ROOT }).toString().trim() ||
      new Date().toISOString().slice(0, 10);
    return { url, lastmod, ...rank(url) };
  })
  .filter(Boolean)
  .sort((a, b) => (b.priority === a.priority ? a.url.localeCompare(b.url) : b.priority - a.priority));

const xml =
  '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  pages
    .map(
      (p) =>
        '  <url>\n' +
        `    <loc>${ORIGIN}${p.url}</loc>\n` +
        `    <lastmod>${p.lastmod}</lastmod>\n` +
        `    <changefreq>${p.changefreq}</changefreq>\n` +
        `    <priority>${p.priority}</priority>\n` +
        '  </url>\n'
    )
    .join('') +
  '</urlset>\n';

const target = path.join(ROOT, 'sitemap.xml');
const current = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : '';

if (current === xml) {
  console.log(`sitemap.xml ist aktuell (${pages.length} Seiten).`);
  process.exit(0);
}

if (checkOnly) {
  console.error(`sitemap.xml weicht ab (${pages.length} Seiten erwartet). "node tools/build-sitemap.js" schreibt sie neu.`);
  process.exit(1);
}

fs.writeFileSync(target, xml);
console.log(`sitemap.xml geschrieben: ${pages.length} Seiten.`);
for (const p of pages) console.log(`  ${p.priority}  ${p.url}`);
