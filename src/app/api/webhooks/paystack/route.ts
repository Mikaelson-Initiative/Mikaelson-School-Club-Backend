// src/app/api/webhooks/paystack/route.ts
// Server-to-server webhook from Paystack — the authoritative source of truth
// for payment status, since a donor can close their browser before the
// callback redirect (and /sponsor/verify) ever runs.

import { verifyWebhookSignature } from "@/lib/paystack";
import { finalizeSponsorshipFromWebhook } from "@/services/sponsorship.service";
import { captureError } from "@/lib/sentry";

export async function POST(req: Request) {
  const rawBody = await req.text();

  const signature = req.headers.get("x-paystack-signature");
  if (!verifyWebhookSignature(rawBody, signature)) {
    return new Response(null, { status: 401 });
  }

  try {
    const event = JSON.parse(rawBody);
    if (event.event === "charge.success") {
      const { reference, status, paid_at } = event.data;
      await finalizeSponsorshipFromWebhook(reference, status, paid_at ?? null);
    }
  } catch (err) {
    captureError(err, { route: "POST /api/webhooks/paystack" });
    // Still acknowledge with 200 — Paystack retries on non-2xx, and a
    // malformed/unexpected payload won't fix itself on retry.
  }

  return new Response(null, { status: 200 });
}
