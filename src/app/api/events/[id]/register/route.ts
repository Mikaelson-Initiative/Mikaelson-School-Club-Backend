import { ok, badRequest, serverError, created } from "@/lib/api-helpers";
import { captureError } from "@/lib/sentry";
import { eventRegistrationSchema } from "@/lib/validators/event-registration";
import { createEventRegistration } from "@/services/event-registration.service";
import { sendEventRegistrationConfirmation, sendEventRegistrationAlert } from "@/lib/mailer";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: eventId } = await params;
    const body = await req.json();
    const parsed = eventRegistrationSchema.safeParse(body);
    
    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid input.");
    }

    const { registration, event } = await createEventRegistration(eventId, parsed.data);

    // Format date beautifully
    const eventDate = new Date(event.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    // Send confirmation email to guest
    await sendEventRegistrationConfirmation({
      email: registration.email,
      name: registration.name,
      eventTitle: event.title,
      eventDate,
      eventTime: event.time || 'TBA',
    });

    // Send alert to admin
    await sendEventRegistrationAlert({
      eventId: event.id,
      eventName: event.title,
      guestName: registration.name,
      guestEmail: registration.email,
      schoolName: registration.schoolName || undefined,
    });

    return created({ success: true, id: registration.id });
  } catch (err: any) {
    if (err.statusCode === 404) return badRequest(err.message);
    if (err.statusCode === 409) return badRequest(err.message);
    captureError(err, { route: "POST /api/events/[id]/register" });
    return serverError();
  }
}
