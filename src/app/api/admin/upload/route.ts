// src/app/api/admin/upload/route.ts
// POST /api/admin/upload — multipart/form-data image upload (admin only)
// ─────────────────────────────────────────────────────────────────────────────
// Accepts a single file and a category (blog | avatar | team).
// Validates type and size, uploads to Vercel Blob, returns the public URL.
// The calling route (blog, team, user) then saves the URL to the DB.
// ─────────────────────────────────────────────────────────────────────────────

import { uploadFile, MAX_FILE_SIZE, ALLOWED_MIME_TYPES } from "@/lib/storage";
import { ok, badRequest, serverError } from "@/lib/api-helpers";
import { captureError } from "@/lib/sentry";
import { env } from "@/lib/env";

const VALID_CATEGORIES = new Set(["blog", "avatar", "team"]);

export async function POST(req: Request) {
  try {
    // Verify Blob token is configured
    if (!env.BLOB_READ_WRITE_TOKEN) {
      return serverError();
    }

    // Parse multipart form data
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return badRequest("Request must be multipart/form-data.");
    }

    const file = formData.get("file");
    const category = formData.get("category");

    if (!file || !(file instanceof File)) {
      return badRequest("A file is required. Send it as form field 'file'.");
    }

    if (!category || typeof category !== "string" || !VALID_CATEGORIES.has(category)) {
      return badRequest("Category must be one of: blog, avatar, team.");
    }

    // Client-side size check (storage.ts also validates, this gives a cleaner error)
    if (file.size > MAX_FILE_SIZE) {
      return badRequest(
        `File too large: ${(file.size / 1024 / 1024).toFixed(1)} MB. Maximum is 5 MB.`
      );
    }

    // Client-side type check
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return badRequest(
        `Invalid file type: ${file.type}. Allowed types: JPEG, PNG, WebP, GIF, AVIF.`
      );
    }

    const result = await uploadFile(file, category as "blog" | "avatar" | "team");

    return ok({
      url: result.url,
      pathname: result.pathname,
      size: result.size,
      contentType: result.contentType,
    });
  } catch (err) {
    // uploadFile throws with user-friendly messages for type/size errors
    if (err instanceof Error && (
      err.message.includes("Invalid file type") ||
      err.message.includes("File too large")
    )) {
      return badRequest(err.message);
    }

    captureError(err, { route: "POST /api/admin/upload" });
    return serverError();
  }
}

// Body parser is handled automatically in Next.js App Router using req.formData()