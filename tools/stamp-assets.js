#!/usr/bin/env node
// Setzt hinter jede CSS-/JS-Einbindung im HTML ein ?v=<Kurz-Hash> des
// Dateiinhalts, damit Browser nach einer Aenderung sicher neu laden.
//
// Warum nicht von Hand: die Versionen wurden bisher pro Seite getippt
// ("?v=20260920b"). Dabei hatte dieselbe Datei auf verschiedenen Seiten
// unterschiedliche Versionen (js/coaching.js), und beim Aendern einer Datei
// konnte das Hochzaehlen vergessen werden - dann sehen Besucher alte Dateien.
// Der Hash kommt aus dem Inhalt: aendert sich die Datei, aendert sich die URL,
// sonst nicht.
//
// Aufruf:
//   node tools/stamp-assets.js --check   nur pruefen (Exit 1, wenn veraltet)
//   node tools/stamp-assets.js           HTML-Dateien anpassen
//
// Nach jeder Aenderung an css/ oder js/ einmal laufen lassen.
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const checkOnly = process.argv.includes('--check');
const hashes = new Map();

function hashOf(assetPath) {
  if (hashes.has(assetPath)) return hashes.get(assetPath);
  const full = path.join(ROOT, assetPath.replace(/^\//, ''));
  let h = null;
  if (fs.existsSync(full)) {
    h = crypto.createHash('md5').update(fs.readFileSync(full)).digest('hex').slice(0, 8);
  }
  hashes.set(assetPath, h);
  return h;
}

const files = execSync("git ls-files '*.html'", { cwd: ROOT })
  .toString()
  .split('\n')
  .filter((f) => f && !f.startsWith('graphify'));

let totalChanged = 0;
let filesChanged = 0;
const missing = new Set();

for (const file of files) {
  const full = path.join(ROOT, file);
  const source = fs.readFileSync(full, 'utf8');
  let count = 0;

  const next = source.replace(
    /((?:href|src)=")(\/(?:css|js)\/[A-Za-z0-9._-]+\.(?:css|js))(\?v=[A-Za-z0-9]+)?(")/g,
    (all, pre, asset, version, post) => {
      const h = hashOf(asset);
      if (!h) {
        missing.add(asset);
        return all;
      }
      const want = `${pre}${asset}?v=${h}${post}`;
      if (want !== all) count++;
      return want;
    }
  );

  if (!count) continue;
  totalChanged += count;
  filesChanged++;
  console.log(`${String(count).padStart(3)}  ${file}`);
  if (!checkOnly) fs.writeFileSync(full, next);
}

if (missing.size) {
  console.error('\nVerlinkt, aber nicht vorhanden: ' + [...missing].join(', '));
}

if (!totalChanged) {
  console.log('Alle Asset-Versionen sind aktuell.');
} else if (checkOnly) {
  console.error(`\n${totalChanged} Einbindungen in ${filesChanged} Dateien veraltet. "node tools/stamp-assets.js" aktualisiert sie.`);
} else {
  console.log(`\n${totalChanged} Einbindungen in ${filesChanged} Dateien aktualisiert.`);
}

process.exit(missing.size || (checkOnly && totalChanged) ? 1 : 0);
