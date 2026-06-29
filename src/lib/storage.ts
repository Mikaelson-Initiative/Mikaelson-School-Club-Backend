// src/lib/storage.ts
// ─────────────────────────────────────────────────────────────────────────────
// File upload helper using Vercel Blob.
// Used by POST /api/admin/upload to handle image uploads for:
//   - Blog post cover images  (BlogPost.imageUrl)
//   - Team member avatars     (TeamMember.avatarUrl)
//   - Admin user avatars      (User.avatarUrl)
//
// Install: npm install @vercel/blob
// Env var: BLOB_READ_WRITE_TOKEN (from Vercel dashboard → Storage → Blob)
// ─────────────────────────────────────────────────────────────────────────────

import { put, del } from "@vercel/blob";
import sharp from "sharp";

// Max upload size: 5 MB
export const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Allowed MIME types
export const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

export type UploadCategory = "blog" | "avatar" | "team";

export interface UploadResult {
  url: string;
  pathname: string;
  size: number;
  contentType: string;
}

/**
 * Uploads a file to Vercel Blob and returns the public URL.
 * Throws on invalid type, size exceed, or upload failure.
 * Automatically optimizes and resizes images to WebP where appropriate.
 */
export async function uploadFile(
  file: File,
  category: UploadCategory
): Promise<UploadResult> {
  // Validate MIME type
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    throw new Error(
      `Invalid file type: ${file.type}. Allowed: JPEG, PNG, WebP, GIF, AVIF.`
    );
  }

  // Validate size
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(
      `File too large: ${(file.size / 1024 / 1024).toFixed(1)} MB. Max: 5 MB.`
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  let uploadBuffer = buffer;
  let uploadContentType = file.type;
  let fileExtension = file.name.split(".").pop()?.toLowerCase() ?? "jpg";

  // Process and optimize images (exclude GIFs to preserve animations)
  if (file.type.startsWith("image/") && file.type !== "image/gif") {
    try {
      let builder = sharp(buffer);
      const metadata = await builder.metadata();

      // Resize down if width exceeds 1200px
      if (metadata.width && metadata.width > 1200) {
        builder = builder.resize({ width: 1200, withoutEnlargement: true });
      }

      // Compress and convert to webp format
      uploadBuffer = await builder.webp({ quality: 80 }).toBuffer() as any;
      uploadContentType = "image/webp";
      fileExtension = "webp";
    } catch (err) {
      console.error("Image optimization failed, uploading original:", err);
    }
  }

  // Build a clean, collision-resistant pathname
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 8);
  const pathname = `${category}/${timestamp}-${random}.${fileExtension}`;

  const blob = await put(pathname, uploadBuffer, {
    access: "public",
    contentType: uploadContentType,
  });

  return {
    url: blob.url,
    pathname: blob.pathname,
    size: uploadBuffer.length,
    contentType: uploadContentType,
  };
}

/**
 * Deletes a file from Vercel Blob by its URL.
 * Safe to call with a non-Blob URL — it will no-op gracefully.
 */
export async function deleteFile(url: string): Promise<void> {
  if (!url.includes("vercel-storage.com")) return;
  await del(url);
}