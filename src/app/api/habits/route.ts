// src/app/api/habits/route.ts
import { requireSession, ok, badRequest, serverError, created } from "@/lib/api-helpers";
import { createHabit, getHabitsForUser } from "@/services/habit.service";
import { createHabitSchema } from "@/lib/validators/habit";
import { getRequestMeta } from "@/lib/audit";
import { captureError } from "@/lib/sentry";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await requireSession();
    if (session instanceof Response) return session;

    const habits = await getHabitsForUser(session.user.id);
    return ok(habits);
  } catch (err) {
    captureError(err, { route: "GET /api/habits" });
    return serverError();
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    if (session instanceof Response) return session;

    const json = await req.json();
    const parsed = createHabitSchema.safeParse(json);
    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid input.");
    }

    const ctx = getRequestMeta(req);
    const result = await createHabit(session.user.id, parsed.data, ctx);

    return created(result.data);
  } catch (err) {
    console.error("ERROR IN POST /api/habits:", err);
    captureError(err, { route: "POST /api/habits" });
    return serverError();
  }
}
