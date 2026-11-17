# Gruppen-Coaching: Platz-Zähler (Cloudflare Worker)

Dieser kleine Worker zählt, wie viele der 5 Plätze im Gruppen-Coaching schon
bezahlt sind. Die Webseite fragt `GET /seats` ab, um die Anzahl anzuzeigen.
Stripe ruft `POST /stripe-webhook` auf, sobald jemand erfolgreich bezahlt hat.

## Einmalig einrichten

1. Node.js muss installiert sein. Dann im Terminal in diesen Ordner wechseln:
   ```bash
   cd cloudflare/group-coaching-seats
   npm install -g wrangler
   wrangler login
   ```
   Das öffnet den Browser, dort mit deinem Cloudflare-Konto einloggen.

2. KV-Namespace anlegen (speichert den Zählerstand):
   ```bash
   wrangler kv namespace create SEATS_KV
   ```
   Das gibt eine `id` aus, z. B. `"id": "abcd1234..."`. Diese `id` in
   `wrangler.toml` bei `REPLACE_WITH_KV_NAMESPACE_ID` eintragen.

3. Stripe-Webhook-Secret als Secret hinterlegen (noch Platzhalter, siehe Schritt 5):
   ```bash
   wrangler secret put STRIPE_WEBHOOK_SECRET
   ```
   Fragt nach dem Wert, einfach erstmal irgendeinen Platzhalter eingeben –
   wird in Schritt 5 mit dem echten Wert überschrieben.

4. Worker deployen:
   ```bash
   wrangler deploy
   ```
   Die Ausgabe zeigt die Worker-URL, z. B.
   `https://mwr-group-coaching-seats.<dein-konto>.workers.dev`.
   Diese URL brauchst du gleich für die Webseite (siehe unten).

5. In deinem Stripe-Dashboard: **Entwickler → Webhooks → Endpunkt hinzufügen**
   - URL: `https://mwr-group-coaching-seats.<dein-konto>.workers.dev/stripe-webhook`
   - Event: `checkout.session.completed`
   - Nach dem Anlegen zeigt Stripe ein **Signing secret** (`whsec_...`). Das jetzt
     wirklich setzen:
     ```bash
     wrangler secret put STRIPE_WEBHOOK_SECRET
     ```
     und den `whsec_...`-Wert einfügen.

6. In der Webseite die Worker-URL eintragen: in
   `js/group-coaching.js` die Konstante `SEATS_API` auf deine Worker-URL setzen
   (z. B. `https://mwr-group-coaching-seats.<dein-konto>.workers.dev`).

## Zähler manuell zurücksetzen oder ändern

```bash
wrangler kv key put --binding=SEATS_KV "taken" "0"
```

## Testen ohne echte Zahlung

```bash
curl https://mwr-group-coaching-seats.<dein-konto>.workers.dev/seats
```
