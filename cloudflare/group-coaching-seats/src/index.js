// Gruppen-Coaching: Platz-Zähler.
// GET  /seats           -> { total, taken, remaining, soldOut }  (öffentlich, keine Geheimnisse)
// POST /stripe-webhook   -> von Stripe aufgerufen, zählt bei erfolgreicher Zahlung hoch
//
// Schickt außerdem die Bestätigungsmail mit dem Google-Meet-Link via Brevo.
//
// Benötigte Secrets (per `wrangler secret put ...` gesetzt, siehe README):
//   STRIPE_WEBHOOK_SECRET  -> Signing secret des Stripe-Webhooks (whsec_...)
//   BREVO_API_KEY          -> API-Key aus Brevo (SMTP & API -> API keys & MCP)
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

function confirmationEmailHtml(env) {
  return `
    <div dir="rtl" style="font-family:sans-serif; font-size:15px; line-height:1.7; color:#222;">
      <p>أهلاً 🌱</p>
      <p>تم تأكيد حجزك بنجاح بالكوتشينغ الجماعي! هيك منفاصل تفاصيل الجلسات:</p>
      <p>
        <strong>رابط الجلسات (Google Meet):</strong><br>
        <a href="${env.MEET_LINK}">${env.MEET_LINK}</a>
      </p>
      <p>
        <strong>المواعيد:</strong><br>
        الأحد ٦، ١٣ و٢٠ ديسمبر، الساعة ١١:٠٠ حتى ١٢:٣٠ (بتوقيت ألمانيا)
      </p>
      <p>كل جلسة بتتسجل، فإذا ما قدرت تحضر مباشرة فيك تتفرج عليها لاحقاً.</p>
      <p style="color:#666; font-size:13px;">المحتوى المقدم لا يشكل أي نصيحة مالية أو استثمارية أو قانونية. جميع المعلومات مخصصة للأغراض التعليمية والإيضاحية العامة فقط، وتعبر فقط عن رأيي الشخصي.</p>
      <p>بانتظارك 👋<br>Rami</p>
    </div>
  `;
}

async function sendConfirmationEmail(env, toEmail, toName) {
  if (!toEmail || !env.BREVO_API_KEY) return;
  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "api-key": env.BREVO_API_KEY.trim(),
      },
      body: JSON.stringify({
        sender: { email: env.SENDER_EMAIL, name: env.SENDER_NAME },
        to: [{ email: toEmail, name: toName || undefined }],
        subject: "تأكيد الحجز: كوتشينغ جماعي مع Money with Rami",
        htmlContent: confirmationEmailHtml(env),
      }),
    });
    if (!res.ok) {
      console.error("Brevo send failed", res.status, await res.text());
    }
  } catch (e) {
    // E-Mail-Fehler sollen die Webhook-Verarbeitung nicht blockieren, aber geloggt werden.
    console.error("Brevo send threw", e);
  }
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

      const email = session.customer_details?.email || session.customer_email;
      const name = session.customer_details?.name;
      await sendConfirmationEmail(env, email, name);
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
