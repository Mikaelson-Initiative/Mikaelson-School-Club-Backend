import { notFound } from "@/lib/api-helpers";

// One-off data-backfill script — done its job, and was never authenticated
// (a real vulnerability: any unauthenticated GET could mutate every chapter's
// city/country). Removed from the live HTTP surface entirely.
export const dynamic = "force-dynamic";

export async function GET() {
  return notFound();
}
