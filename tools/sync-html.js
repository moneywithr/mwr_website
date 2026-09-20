#!/usr/bin/env node
// Haelt das ausgelieferte HTML mit dem Rest des Projekts im Einklang:
//
//   1. Platzhaltertexte (data-i18n / data-i18n-html) aus den ARABISCHEN
//      Uebersetzungen in js/i18n.js.
//   2. Die Open-Graph-/Twitter-Angaben aus <title>, <meta name="description">
//      und <link rel="canonical"> derselben Seite.
//
// Warum 1: jede Seite ist <html lang="ar" dir="rtl">, und Erstbesucher bekommen
// immer Arabisch (siehe detectLang() in js/common.js). Der ausgelieferte
// HTML-Text ist das, was Suchmaschinen, Screenreader und Besucher ohne
// JavaScript sehen - er muss also arabisch sein und zum Rest passen. Frueher
// standen dort deutsche Resttexte, die mit der Zeit inhaltlich veraltet sind
// (u.a. in der Datenschutzerklaerung).
//
// Warum 2: beim Teilen eines Links (WhatsApp, Instagram, Telegram, X) zeigen
// die Apps nur, was in diesen Tags steht. Aus Titel/Description abgeleitet,
// damit beides nicht getrennt gepflegt werden muss und nicht auseinanderlaeuft.
//
// Aufruf:
//   node tools/sync-html.js --check   nur pruefen (Exit 1 bei Abweichung)
//   node tools/sync-html.js           HTML-Dateien anpassen
//
// Nach jeder Textaenderung in js/i18n.js einmal laufen lassen.
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
global.window = {};
require(path.join(ROOT, 'js/i18n.js'));
const AR = global.window.I18N.ar;

const checkOnly = process.argv.includes('--check');

// Nur Zeichen escapen, die den HTML-Text sonst zerreissen wuerden. Bereits
// vorhandene Entities (&amp;, &#039;) bleiben unangetastet.
function escapeText(str) {
  return String(str)
    .replace(/&(?![a-zA-Z#0-9]+;)/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Inhalt zwischen oeffnendem und zugehoerigem schliessendem Tag finden.
function findCloseIndex(source, tag, from) {
  const re = new RegExp('</?' + tag + '\\b[^>]*>', 'g');
  re.lastIndex = from;
  let depth = 1;
  let m;
  while ((m = re.exec(source))) {
    depth += m[0][1] === '/' ? -1 : 1;
    if (depth === 0) return m.index;
  }
  return -1;
}

const ORIGIN = 'https://moneywithrami.com';
const OG_IMAGE = ORIGIN + '/img/social/og-cover.png';
const OG_MARK = '<!-- Vorschau beim Teilen (erzeugt von tools/sync-html.js) -->';

// Der Block steht immer direkt hinter <link rel="canonical">. Nur Seiten mit
// Titel, Beschreibung und Canonical bekommen ihn - alles andere waere geraten.
function socialBlock(html) {
  const pick = (re) => (html.match(re) || [])[1];
  const title = pick(/<title>([^<]*)<\/title>/);
  const desc = pick(/<meta name="description" content="([^"]*)"\s*\/?>/);
  const url = pick(/<link rel="canonical" href="([^"]*)"\s*\/?>/);
  if (!title || !desc || !url) return null;

  const attr = (s) => s.replace(/&(?![a-zA-Z#0-9]+;)/g, '&amp;').replace(/"/g, '&quot;');
  const tags = [
    ['property', 'og:type', 'website'],
    ['property', 'og:site_name', 'moneywithrami'],
    ['property', 'og:locale', 'ar_AR'],
    ['property', 'og:url', url],
    ['property', 'og:title', title],
    ['property', 'og:description', desc],
    ['property', 'og:image', OG_IMAGE],
    ['property', 'og:image:width', '1200'],
    ['property', 'og:image:height', '630'],
    ['name', 'twitter:card', 'summary_large_image'],
    ['name', 'twitter:title', title],
    ['name', 'twitter:description', desc],
    ['name', 'twitter:image', OG_IMAGE],
  ];
  return (
    OG_MARK + '\n' +
    tags.map(([kind, key, value]) => `<meta ${kind}="${key}" content="${attr(value)}">`).join('\n')
  );
}

const files = execSync("git ls-files '*.html'", { cwd: ROOT })
  .toString()
  .split('\n')
  .filter((f) => f && !f.startsWith('graphify'));

let totalChanged = 0;
let filesChanged = 0;
const missingKeys = new Set();

for (const file of files) {
  const full = path.join(ROOT, file);
  const source = fs.readFileSync(full, 'utf8');
  const open = /<(\w+)([^>]*\bdata-i18n(-html)?="([A-Za-z0-9_]+)"[^>]*)>/g;

  let out = '';
  let last = 0;
  let count = 0;
  let m;

  while ((m = open.exec(source))) {
    const tag = m[1];
    const isHtml = Boolean(m[3]);
    const key = m[4];
    const start = m.index + m[0].length;
    const end = findCloseIndex(source, tag, start);
    if (end < 0) continue;

    if (!(key in AR)) {
      missingKeys.add(key);
      continue;
    }

    const current = source.slice(start, end);
    // Leere Huellen fuellt erst das Skript zur Laufzeit (z.B. Cookie-Banner).
    if (!current.trim()) continue;

    const next = isHtml ? AR[key] : escapeText(AR[key]);
    if (current === next) continue;

    out += source.slice(last, start) + next;
    last = end;
    count++;
    open.lastIndex = end;
  }

  out += source.slice(last);

  // Social-Tags: vorhandenen Block ersetzen, sonst hinter dem Canonical einsetzen.
  const block = socialBlock(out);
  if (block) {
    const existing = new RegExp(
      OG_MARK.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') +
        '\\n(?:<meta (?:property|name)="(?:og|twitter):[^"]*" content="[^"]*">\\n?)+'
    );
    const withBlock = existing.test(out)
      ? out.replace(existing, block + '\n')
      : out.replace(/(<link rel="canonical" href="[^"]*"\s*\/?>)/, `$1\n${block}`);
    if (withBlock !== out) {
      out = withBlock;
      count++;
    }
  }

  if (!count) continue;
  totalChanged += count;
  filesChanged++;
  console.log(`${String(count).padStart(3)}  ${file}`);
  if (!checkOnly) fs.writeFileSync(full, out);
}

if (missingKeys.size) {
  console.error('\nFehlende Schluessel in I18N.ar: ' + [...missingKeys].join(', '));
}

if (!totalChanged) {
  console.log('Alle HTML-Platzhalter stimmen mit den arabischen Texten ueberein.');
} else if (checkOnly) {
  console.error(`\n${totalChanged} Platzhalter in ${filesChanged} Dateien weichen ab. "node tools/sync-html-fallbacks.js" gleicht sie an.`);
} else {
  console.log(`\n${totalChanged} Platzhalter in ${filesChanged} Dateien angeglichen.`);
}

process.exit(missingKeys.size || (checkOnly && totalChanged) ? 1 : 0);
