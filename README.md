# Money with Rami — Projektstruktur

```
project/
├─ index.html                             Startseite "Im Aufbau" mit Links zu den 3 Tools (/)
├─ impressum/
│  └─ index.html                          Impressum-Vorlage — echte Daten eintragen! (/impressum/)
├─ calculator/
│  ├─ investment/
│  │  └─ index.html                       Investitionsrechner (/calculator/investment/)
│  └─ fund_etf_fees/
│     └─ index.html                       ETF vs. Fonds Kostenvergleich (/calculator/fund_etf_fees/)
├─ stuff_i_use/
│  └─ brokerage_finder/
│     └─ index.html                       Broker-Finder (/stuff_i_use/brokerage_finder/)
├─ fonts/                                  Selbst gehostete IBM-Plex-Schriftdateien (woff2)
├─ css/
│  └─ style.css                           Alle Styles + @font-face-Deklarationen
└─ js/
   ├─ i18n.js                             Alle Übersetzungstexte (de/en/ar)
   ├─ broker-data.js                      Länder- und Broker-Liste
   ├─ common.js                           Sprachumschaltung, Formatierung, Navigation
   ├─ sparrechner.js                      Logik nur für calculator/investment/index.html
   ├─ kostenvergleich.js                  Logik nur für calculator/fund_etf_fees/index.html
   └─ broker.js                           Logik nur für stuff_i_use/brokerage_finder/index.html
```

Die Startseite `/` ist aktuell eine "Im Aufbau"-Seite ohne eigenes JS — sie nutzt nur
`i18n.js` und `common.js` für Sprachumschaltung und verlinkt auf die drei aktiven Tools.

Alle URL-Pfade sind bewusst auf Englisch gehalten (`calculator`, `investment`,
`fund_etf_fees`, `stuff_i_use`, `brokerage_finder`), unabhängig von der Sprache,
die gerade auf der Seite ausgewählt ist.

## Schriften
Alle Schriften (IBM Plex Sans, IBM Plex Mono, IBM Plex Sans Arabic) liegen lokal
im Ordner `fonts/` und werden über `@font-face` in `css/style.css` eingebunden —
keine Abhängigkeit mehr von Google Fonts.

## Farbkontrast
`--purple-strong` und `--orange-strong` sind dunklere Varianten von `--purple`
und `--orange`, die für Text und Buttons mit weißer Schrift verwendet werden,
damit sie WCAG-AA-Kontrast (4.5:1) erreichen. Die ursprünglichen helleren
Farben (`--purple`, `--orange`) bleiben für Hintergründe, Icons und Rahmen
erhalten, wo Kontrastregeln nicht gelten.

## Impressum
**Wichtig:** `impressum/index.html` ist nur eine Vorlage mit Platzhaltern
(Name, Adresse, E-Mail). Vor der Veröffentlichung unbedingt die echten Angaben
eintragen — ein Impressum mit Platzhaltertext erfüllt die gesetzliche Pflicht
nach § 5 TMG nicht.

## Eine neue Sektion/Seite hinzufügen

1. Neue Datei `meine-seite.html` anlegen — kopiere Kopf/Nav/Footer aus einer
   bestehenden Seite (`index.html` etc.), damit Branding und Sprache gleich bleiben.
2. Im `<nav class="tab-nav">` einen weiteren Link ergänzen, in **allen** HTML-Dateien:
   ```html
   <a class="tab-btn" href="meine-seite.html" data-page="meine-seite.html" data-i18n="tabNeu">Neu</a>
   ```
3. Neue Übersetzungs-Keys in `js/i18n.js` für alle drei Sprachen ergänzen
   (z.B. `tabNeu: 'Neu'`, `titleNeu: '...'`).
4. Eigene `js/meine-seite.js` schreiben, die auf `mwr:langchange` hört, um bei
   Sprachwechsel neu zu rendern (siehe `rendite.js` als Vorlage).
5. In `meine-seite.html` einbinden:
   ```html
   <script src="js/i18n.js"></script>
   <script src="js/common.js"></script>
   <script src="js/meine-seite.js"></script>
   ```

Da `common.js` die gewählte Sprache in `localStorage` speichert, merkt sich
die Seite die Sprache auch beim Wechsel zwischen den HTML-Dateien.

## Lokal testen

Einfach im Projektordner einen kleinen lokalen Server starten (Doppelklick auf
die `.html`-Datei funktioniert wegen der `fetch`-freien Struktur zwar auch,
ein Server ist aber sauberer):

```bash
# Python (meistens vorinstalliert)
python3 -m http.server 8000
# dann im Browser: http://localhost:8000
```

Oder mit VS Code: Erweiterung "Live Server" installieren und "Go Live" klicken.

## Kostenlos hosten

Alle drei Optionen sind kostenlos, brauchen keinen eigenen Server und
unterstützen eigene Domains.

**1. GitHub Pages** (am einfachsten, wenn du schon GitHub nutzt)
1. Neues Repository auf github.com erstellen, alle Dateien hochladen (oder per Git pushen).
2. Repository → Settings → Pages → unter "Branch" `main` und Ordner `/ (root)` wählen → Save.
3. Nach ~1 Minute ist die Seite unter `https://DEIN-NUTZERNAME.github.io/DEIN-REPO/` live.
4. Eigene Domain: unter Pages → "Custom domain" eintragen, DNS beim Domain-Anbieter per CNAME auf `DEIN-NUTZERNAME.github.io` zeigen lassen.

**2. Netlify**
1. Auf netlify.com registrieren.
2. Den `project`-Ordner per Drag & Drop auf die Netlify-Startseite ziehen ("Deploy manually") — fertig, sofort live.
3. Für automatische Updates: stattdessen das GitHub-Repo verbinden ("Import from Git").
4. Eigene Domain unter Site settings → Domain management kostenlos verbinden.

**3. Cloudflare Pages**
1. Auf pages.cloudflare.com registrieren, GitHub-Repo verbinden.
2. Build-Befehl leer lassen (kein Build nötig), Output-Verzeichnis `/` (root).
3. Deploy — Seite ist unter `DEIN-PROJEKT.pages.dev` live, eigene Domain kostenlos möglich.

Alle drei bieten kostenloses HTTPS, unbegrenzten Traffic für so ein statisches
Projekt und automatische Deployments bei jeder Änderung, wenn du sie mit
GitHub verbindest — für den Anfang ist GitHub Pages oder Netlify (Drag & Drop)
am schnellsten eingerichtet.
