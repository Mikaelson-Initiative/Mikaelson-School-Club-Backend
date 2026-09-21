import { ok, serverError, requireRole } from "@/lib/api-helpers";
import { captureError } from "@/lib/sentry";
import { listEventRegistrations } from "@/services/event-registration.service";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole(["ADMIN", "SUPERADMIN"]);
    if (session instanceof Response) return session;

    const { id: eventId } = await params;
    const registrations = await listEventRegistrations(eventId);
    return ok(registrations);
  } catch (err) {
    captureError(err, { route: "GET /api/admin/events/[id]/registrations" });
    return serverError();
  }
}
