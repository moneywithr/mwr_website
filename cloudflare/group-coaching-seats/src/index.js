// Gruppen-Coaching: Platz-Zähler.
// GET  /seats           -> { total, taken, remaining, soldOut }  (öffentlich, keine Geheimnisse)
// POST /stripe-webhook   -> von Stripe aufgerufen, zählt bei erfolgreicher Zahlung hoch
//
// Benötigte Secrets (per `wrangler secret put ...` gesetzt, siehe README):
//   STRIPE_WEBHOOK_SECRET  -> Signing secret des Stripe-Webhooks (whsec_...)
//
// KV-Keys:
//   "taken"          -> Anzahl bereits bezahlter Plätze (String, Zahl)
//   "event:<id>"     -> Markiert eine Stripe-Event-ID als bereits verarbeitet (Idempotenz)

const ALLOWED_ORIGIN = "*"; // nur Lesezugriff auf einen Zähler, keine sensiblen Daten

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders() },
  });
}

async function getTaken(env) {
  const raw = await env.SEATS_KV.get("taken");
  const n = parseInt(raw || "0", 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

async function handleSeats(env) {
  const total = parseInt(env.TOTAL_SEATS || "5", 10);
  const taken = await getTaken(env);
  const remaining = Math.max(0, total - taken);
  return json({ total, taken, remaining, soldOut: remaining <= 0 });
}

// Stripe-Signaturprüfung von Hand (Web Crypto), siehe:
// https://docs.stripe.com/webhooks#verify-manually
async function verifyStripeSignature(rawBody, signatureHeader, secret) {
  if (!signatureHeader) return false;
  const parts = Object.fromEntries(
    signatureHeader.split(",").map((p) => {
      const [k, v] = p.split("=");
      return [k, v];
    })
  );
  const timestamp = parts.t;
  const v1 = parts.v1;
  if (!timestamp || !v1) return false;

  // Gegen Replay: Zeitstempel darf nicht zu alt sein (5 Minuten Toleranz).
  const age = Math.abs(Date.now() / 1000 - parseInt(timestamp, 10));
  if (!Number.isFinite(age) || age > 300) return false;

  const signedPayload = `${timestamp}.${rawBody}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sigBuffer = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signedPayload));
  const computed = [...new Uint8Array(sigBuffer)].map((b) => b.toString(16).padStart(2, "0")).join("");

  // Konstante-Zeit-Vergleich.
  if (computed.length !== v1.length) return false;
  let diff = 0;
  for (let i = 0; i < computed.length; i++) diff |= computed.charCodeAt(i) ^ v1.charCodeAt(i);
  return diff === 0;
}

async function handleWebhook(request, env) {
  const rawBody = await request.text();
  const signature = request.headers.get("Stripe-Signature");
  const ok = await verifyStripeSignature(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
  if (!ok) return new Response("invalid signature", { status: 400 });

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch (e) {
    return new Response("invalid json", { status: 400 });
  }

  // Idempotenz: dieselbe Event-ID nicht zweimal zählen (Stripe kann Events erneut zustellen).
  const eventKey = `event:${event.id}`;
  const already = await env.SEATS_KV.get(eventKey);
  if (already) return json({ ok: true, duplicate: true });

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    if (session.payment_status === "paid") {
      const taken = await getTaken(env);
      const total = parseInt(env.TOTAL_SEATS || "5", 10);
      const next = Math.min(total, taken + 1);
      await env.SEATS_KV.put("taken", String(next));
    }
  }

  // Event-ID 30 Tage lang merken, danach kann der Key verfallen.
  await env.SEATS_KV.put(eventKey, "1", { expirationTtl: 60 * 60 * 24 * 30 });

  return json({ ok: true });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders() });
    }
    if (request.method === "GET" && url.pathname === "/seats") {
      return handleSeats(env);
    }
    if (request.method === "POST" && url.pathname === "/stripe-webhook") {
      return handleWebhook(request, env);
    }
    return new Response("not found", { status: 404 });
  },
};
