// src/app/api/events/route.ts
// GET /api/events — Public list of upcoming and past events

export const dynamic = "force-dynamic";

import { eventRepository } from "@/repositories/event.repository";
import { ok, serverError } from "@/lib/api-helpers";
import { captureError } from "@/lib/sentry";

export async function GET() {
  try {
    const result = await eventRepository.listPublic();
    return ok(result);
  } catch (err) {
    captureError(err, { route: "GET /api/events" });
    return serverError();
  }
}
