# Money with Rami, Projektstruktur

```
project/
├─ index.html                             Startseite mit 3 Tabs: Investieren starten, Tools, die ich nutze, Rechner (/)
├─ calculator/                            Tab "Rechner" (alle 5 Seiten, inkl. der früheren "Vergleiche")
│  ├─ investment/                         Investitionsrechner
│  ├─ financial_freedom/                  Finanzielle Freiheit
│  ├─ spending_plan/                      Ausgabenplan
│  ├─ fund_etf_fees/                      ETF vs. Fonds Kostenvergleich
│  └─ etf_overlap/                        ETF-Overlap
├─ stuff_i_use/                           Tab "Tools, die ich nutze"
│  ├─ brokerage_finder/                   Broker-Finder
│  ├─ find_bank/                          Bank-Finder
│  ├─ credit_cards/                       Kreditkarten-Finder
│  └─ insurance/                          Versicherungen (Übersicht + car, home, legal, liability)
├─ one-on-one-coaching/                   Coaching 1:1 (öffentlich, in der Sitemap): Termin per Cal.com buchen
├─ coaching/                              Trainingssessions in Kleingruppen (versteckt, noindex, nicht in der Sitemap)
│  ├─ thank-you/                          Bestätigungsseite nach dem Absenden des Wartelisten-Formulars
│  └─ confirmed/                          Seite nach Klick auf den Double-Opt-In-Link
├─ impressum/  datenschutz/               Rechtstexte
├─ fonts/                                 Selbst gehostete Schriften (woff2)
├─ img/flags/                             Länderflaggen (SVG) für die Bewertungen
├─ css/
│  ├─ style.css                           Alle Styles der Website + @font-face-Deklarationen
│  └─ coaching.css                        Nur für die Coaching-Seiten
└─ js/
   ├─ i18n.js                             Alle Übersetzungstexte (de/en/ar)
   ├─ common.js                           Sprachumschaltung, Formatierung, Tab-Leiste (Kategorien)
   ├─ coaching.js                         Bewertungs-Karussell, Dialog und Wartelisten-Formular
   ├─ coaching-reviews.js                 Die Bewertungen (Name, Text, Land, Datum)
   ├─ coach-box.js                        Coaching-Hinweis-Box am Ende der Rechner-Seiten
   └─ *-calculator.js, broker*.js ...     Logik der jeweiligen Rechner/Finder
```

## Startseite und Tabs

Die Tab-Leiste oben (`.category-switch`) hat drei Kategorien, in dieser Reihenfolge:
`start` (Investieren starten), `tools` (Tools, die ich nutze), `calculators` (Rechner).
Die Farben stehen in `CATEGORY_COLORS` in `js/common.js`. Vergleiche gibt es nicht
mehr als eigene Kategorie, alter Link `#cat-comparisons` führt automatisch zu
`calculators`. Der Tab `start` zeigt den Einstiegsbereich (`.home-hero`), die anderen
beiden das Karten-Panel. Elemente mit `data-hide-on="start"` sind auf dem Start-Tab
ausgeblendet. Die Leiste steht auf allen Seiten mit Banner, wer eine Kategorie
ergänzt, muss sie in allen HTML-Dateien eintragen.

Die Rechner-Seiten (`/calculator/…`) tragen `data-coach-box` im `<body>`, dann fügt
`js/coach-box.js` vor dem Footer die Box "Hilfe beim Einstieg?" mit Link zu
`/one-on-one-coaching/` ein.

## Coaching-Seiten und Warteliste

- `/one-on-one-coaching/`: öffentlich, Buchung über Cal.com (`moneywithrami/15min`).
- `/coaching/`: Kleingruppen-Training, absichtlich nicht verlinkt und auf `noindex`.
  Das Formular sendet direkt (normales POST) an Brevo, die Adresse steht im
  `action`-Attribut der Formulare. Brevo leitet danach auf `/coaching/thank-you/`
  und nach dem Klick auf den Bestätigungslink auf `/coaching/confirmed/` weiter
  (im Brevo-Formular eintragen). Double Opt-In ist aktiv.
- Die Bewertungen stehen fest in `js/coaching-reviews.js` (nur Zeilen mit
  "Ja" bei Einverstanden aus der Google-Tabelle). Neue Bewertung: Datei anpassen und
  ggf. die Flagge in `img/flags/` ergänzen.
- Beim Ändern von `i18n.js`, `coaching.css` oder `common.js` die Versionsnummer
  (`?v=…`) in den HTML-Dateien erhöhen, sonst sehen Besucher die alte Datei aus dem Cache.

Alle URL-Pfade sind bewusst auf Englisch gehalten, unabhängig von der Sprache, die
gerade auf der Seite ausgewählt ist.

## Schriften
Alle Schriften liegen lokal im Ordner `fonts/` und werden über `@font-face` in
`css/style.css` eingebunden, keine Abhängigkeit von Google Fonts.
- **Latein/Zahlen:** IBM Plex Sans, IBM Plex Mono
- **Arabisch:** IBM Plex Sans Arabic (Fließtext), Kufam (Startseiten-Headline); Tajawal nur auf den Coaching-Seiten und in der Startseiten-Einstiegssektion
- **Markenname:** Space Grotesk

Tajawal liegt in den Schnitten 400/500/700 vor (`fonts/tajawal-arabic-*.woff2`), ohne 600.

Alle Schriftdateien sind mit `pyftsubset` auf die tatsächlich im Projekt
verwendeten Zeichen zugeschnitten (siehe frühere Learnings: immer alle
HTML- und JS-Dateien inkl. `broker-data.js` scannen, nicht nur `i18n.js`).

## Farbkontrast
`--purple-strong` und `--orange-strong` sind dunklere Varianten von `--purple`
und `--orange`, die für Text und Buttons mit weißer Schrift verwendet werden,
damit sie WCAG-AA-Kontrast (4.5:1) erreichen. Die ursprünglichen helleren
Farben (`--purple`, `--orange`) bleiben für Hintergründe, Icons und Rahmen
erhalten, wo Kontrastregeln nicht gelten.

## Impressum
**Wichtig:** `impressum/index.html` ist nur eine Vorlage mit Platzhaltern
(Name, Adresse, E-Mail). Vor der Veröffentlichung unbedingt die echten Angaben
eintragen, ein Impressum mit Platzhaltertext erfüllt die gesetzliche Pflicht
nach § 5 TMG nicht.

## Eine neue Sektion/Seite hinzufügen

1. Neue Datei `meine-seite.html` anlegen, kopiere Kopf/Nav/Footer aus einer
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
2. Den `project`-Ordner per Drag & Drop auf die Netlify-Startseite ziehen ("Deploy manually"), fertig, sofort live.
3. Für automatische Updates: stattdessen das GitHub-Repo verbinden ("Import from Git").
4. Eigene Domain unter Site settings → Domain management kostenlos verbinden.

**3. Cloudflare Pages**
1. Auf pages.cloudflare.com registrieren, GitHub-Repo verbinden.
2. Build-Befehl leer lassen (kein Build nötig), Output-Verzeichnis `/` (root).
3. Deploy, Seite ist unter `DEIN-PROJEKT.pages.dev` live, eigene Domain kostenlos möglich.

Alle drei bieten kostenloses HTTPS, unbegrenzten Traffic für so ein statisches
Projekt und automatische Deployments bei jeder Änderung, wenn du sie mit
GitHub verbindest, für den Anfang ist GitHub Pages oder Netlify (Drag & Drop)
am schnellsten eingerichtet.
