import { notFound } from "@/lib/api-helpers";

// One-off backfill script for LAUNCHED applications missing a SchoolChapter —
// done its job. The LAUNCHED transition now creates the chapter directly
// (see src/services/application.service.ts), so this is no longer needed.
// Was also a GET that mutated data and leaked err.message to the client.
export const dynamic = "force-dynamic";

export async function GET() {
  return notFound();
}
