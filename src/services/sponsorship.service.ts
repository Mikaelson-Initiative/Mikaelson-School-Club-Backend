// Business logic for chapter/student sponsorships via Paystack.
// Pricing is authoritative here — never trust an amount from the client.
// ─────────────────────────────────────────────────────────────────────────────

import crypto from "crypto";
import { sponsorshipRepository } from "@/repositories/sponsorship.repository";
import { schoolRepository } from "@/repositories/school.repository";
import { initializeTransaction, verifyTransaction } from "@/lib/paystack";
import { writeAuditLog } from "@/lib/audit";
import { captureError } from "@/lib/sentry";
import { sendSponsorshipReceipt, sendSponsorshipAlert } from "@/lib/mailer";
import type { InitializeSponsorshipInput } from "@/lib/validators/sponsorship";

interface ActorContext {
  ip?: string | null;
  userAgent?: string | null;
}

// Naira, not kobo — converted to kobo (×100) at the Paystack boundary.
export const STUDENT_PRICE_NGN = 15_000;
export const CHAPTER_STUDENT_COUNT = 40;
export const CHAPTER_PRICE_NGN = STUDENT_PRICE_NGN * CHAPTER_STUDENT_COUNT;

export type InitializeSponsorshipResult =
  | { success: true; authorizationUrl: string; reference: string }
  | { success: false; error: string; status: number };

export async function initializeSponsorship(
  input: InitializeSponsorshipInput,
  callbackUrl: string,
  ctx: ActorContext
): Promise<InitializeSponsorshipResult> {
  let amountNgn: number;
  let quantity = 1;
  let chapterId: string | null = null;
  let chapterName: string | null = null;

  if (input.type === "STUDENT") {
    quantity = input.quantity;
    amountNgn = STUDENT_PRICE_NGN * quantity;
  } else {
    const chapter = await schoolRepository.findById(input.chapterId!);
    if (!chapter) {
      return { success: false, status: 404, error: "That chapter could not be found." };
    }
    chapterId = chapter.id;
    chapterName = chapter.name;
    amountNgn = CHAPTER_PRICE_NGN;
  }

  const amountKobo = amountNgn * 100;
  const reference = `msc_${crypto.randomUUID().replace(/-/g, "")}`;

  const sponsorship = await sponsorshipRepository.create({
    type: input.type,
    quantity,
    chapterId,
    amountKobo,
    donorName: input.donorName,
    donorEmail: input.donorEmail,
    reference,
  });

  try {
    const result = await initializeTransaction({
      email: input.donorEmail,
      amountKobo,
      reference,
      callbackUrl,
      metadata: {
        sponsorshipId: sponsorship.id,
        type: input.type,
        quantity,
        chapterId,
        chapterName,
      },
    });

    await writeAuditLog({
      action: "CREATE",
      model: "Sponsorship",
      recordId: sponsorship.id,
      after: { type: input.type, amountKobo, chapterId, status: "PENDING" },
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });

    return { success: true, authorizationUrl: result.authorizationUrl, reference };
  } catch (err) {
    captureError(err, { route: "initializeSponsorship", extra: { reference } });
    await sponsorshipRepository.markStatus(reference, "FAILED", null);
    return {
      success: false,
      status: 502,
      error: "We couldn't start the payment. Please try again in a moment.",
    };
  }
}

export type VerifySponsorshipResult =
  | {
      success: true;
      status: "SUCCESS" | "FAILED" | "PENDING";
      type: "STUDENT" | "CHAPTER" | "TEST";
      quantity: number;
      chapterName: string | null;
      amountKobo: number;
      donorName: string;
    }
  | { success: false; error: string; status: number };

function notifySponsorshipSuccess(sponsorship: {
  id: string;
  type: "STUDENT" | "CHAPTER" | "TEST";
  quantity: number;
  amountKobo: number;
  donorName: string;
  donorEmail: string;
  reference: string;
  chapter: { name: string } | null;
}) {
  const amountNgn = sponsorship.amountKobo / 100;
  Promise.allSettled([
    sendSponsorshipReceipt({
      to: sponsorship.donorEmail,
      donorName: sponsorship.donorName,
      type: sponsorship.type,
      quantity: sponsorship.quantity,
      chapterName: sponsorship.chapter?.name ?? null,
      amountNgn,
      reference: sponsorship.reference,
    }),
    sendSponsorshipAlert({
      donorName: sponsorship.donorName,
      donorEmail: sponsorship.donorEmail,
      type: sponsorship.type,
      quantity: sponsorship.quantity,
      chapterName: sponsorship.chapter?.name ?? null,
      amountNgn,
      reference: sponsorship.reference,
    }),
  ]).then((results) => {
    results.forEach((r) => {
      if (r.status === "rejected") captureError(r.reason, { route: "notifySponsorshipSuccess" });
    });
  });
}

export async function verifySponsorship(reference: string): Promise<VerifySponsorshipResult> {
  const sponsorship = await sponsorshipRepository.findByReference(reference);
  if (!sponsorship) {
    return { success: false, status: 404, error: "Sponsorship not found." };
  }

  // Already finalized (e.g. the webhook beat us to it) — just report it.
  if (sponsorship.status !== "PENDING") {
    return {
      success: true,
      status: sponsorship.status,
      type: sponsorship.type,
      quantity: sponsorship.quantity,
      chapterName: sponsorship.chapter?.name ?? null,
      amountKobo: sponsorship.amountKobo,
      donorName: sponsorship.donorName,
    };
  }

  try {
    const result = await verifyTransaction(reference);
    const finalStatus = result.status === "success" ? "SUCCESS" : "FAILED";
    const updated = await sponsorshipRepository.markStatus(
      reference,
      finalStatus,
      result.paidAt ? new Date(result.paidAt) : null
    );

    await writeAuditLog({
      action: "UPDATE",
      model: "Sponsorship",
      recordId: sponsorship.id,
      before: { status: "PENDING" },
      after: { status: finalStatus },
    });

    if (finalStatus === "SUCCESS") {
      notifySponsorshipSuccess({ ...sponsorship, amountKobo: updated.amountKobo });
    }

    return {
      success: true,
      status: finalStatus,
      type: sponsorship.type,
      quantity: sponsorship.quantity,
      chapterName: sponsorship.chapter?.name ?? null,
      amountKobo: updated.amountKobo,
      donorName: sponsorship.donorName,
    };
  } catch (err) {
    captureError(err, { route: "verifySponsorship", extra: { reference } });
    return { success: false, status: 502, error: "Could not verify payment status right now." };
  }
}

export async function listSponsorships(options: {
  status?: "PENDING" | "SUCCESS" | "FAILED";
  type?: "STUDENT" | "CHAPTER" | "TEST";
  page: number;
  limit: number;
}) {
  const { items, total } = await sponsorshipRepository.list(options);
  const summary = await sponsorshipRepository.summary();

  return {
    sponsorships: items,
    total,
    page: options.page,
    limit: options.limit,
    hasNextPage: (options.page - 1) * options.limit + items.length < total,
    summary,
  };
}

export async function finalizeSponsorshipFromWebhook(
  reference: string,
  paystackStatus: string,
  paidAt: string | null
): Promise<void> {
  const sponsorship = await sponsorshipRepository.findByReference(reference);
  if (!sponsorship || sponsorship.status !== "PENDING") return; // unknown or already finalized — idempotent no-op

  const finalStatus = paystackStatus === "success" ? "SUCCESS" : "FAILED";
  const updated = await sponsorshipRepository.markStatus(reference, finalStatus, paidAt ? new Date(paidAt) : null);

  await writeAuditLog({
    action: "UPDATE",
    model: "Sponsorship",
    recordId: sponsorship.id,
    before: { status: "PENDING" },
    after: { status: finalStatus, via: "webhook" },
  });

  if (finalStatus === "SUCCESS") {
    notifySponsorshipSuccess({ ...sponsorship, amountKobo: updated.amountKobo });
  }
}
