import { vi, describe, it, expect, beforeEach } from "vitest";
import { uploadFile, MAX_FILE_SIZE } from "@/lib/storage";
import { put } from "@vercel/blob";
import sharp from "sharp";

// Mock @vercel/blob
vi.mock("@vercel/blob", () => ({
  put: vi.fn().mockResolvedValue({
    url: "https://example.com/blob.webp",
    pathname: "blog/mock.webp",
  }),
  del: vi.fn().mockResolvedValue(undefined),
}));

// Mock sharp
const mockMetadata = vi.fn();
const mockResize = vi.fn();
const mockWebp = vi.fn();
const mockToBuffer = vi.fn();

vi.mock("sharp", () => {
  return {
    default: vi.fn(() => ({
      metadata: mockMetadata,
      resize: mockResize,
      webp: mockWebp,
      toBuffer: mockToBuffer,
    })),
  };
});

describe("uploadFile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResize.mockReturnThis();
    mockWebp.mockReturnThis();
  });

  it("throws error for unsupported file types", async () => {
    const file = new File(["dummy content"], "test.pdf", { type: "application/pdf" });
    await expect(uploadFile(file, "blog")).rejects.toThrow("Invalid file type");
  });

  it("throws error if file exceeds max size limit", async () => {
    const hugeBuffer = new Uint8Array(MAX_FILE_SIZE + 10);
    const file = new File([hugeBuffer], "large.png", { type: "image/png" });
    await expect(uploadFile(file, "blog")).rejects.toThrow("File too large");
  });

  it("skips sharp processing and uploads original for GIF images to preserve animation", async () => {
    const file = new File(["gifdata"], "animated.gif", { type: "image/gif" });
    const result = await uploadFile(file, "blog");

    expect(sharp).not.toHaveBeenCalled();
    expect(put).toHaveBeenCalledWith(
      expect.stringMatching(/^blog\/\d+-\w+\.gif$/),
      expect.any(Buffer),
      expect.objectContaining({ contentType: "image/gif" })
    );
    expect(result.url).toBe("https://example.com/blob.webp");
  });

  it("resizes image if width exceeds 1200px and converts to WebP", async () => {
    mockMetadata.mockResolvedValue({ width: 1500, height: 1000 });
    mockToBuffer.mockResolvedValue(Buffer.from("fake-webp-buffer"));

    const file = new File(["imagedata"], "photo.jpg", { type: "image/jpeg" });
    const result = await uploadFile(file, "avatar");

    expect(sharp).toHaveBeenCalled();
    expect(mockResize).toHaveBeenCalledWith({ width: 1200, withoutEnlargement: true });
    expect(mockWebp).toHaveBeenCalledWith({ quality: 80 });
    expect(put).toHaveBeenCalledWith(
      expect.stringMatching(/^avatar\/\d+-\w+\.webp$/),
      Buffer.from("fake-webp-buffer"),
      expect.objectContaining({ contentType: "image/webp" })
    );
    expect(result.contentType).toBe("image/webp");
    expect(result.size).toBe(Buffer.from("fake-webp-buffer").length);
  });

  it("converts to WebP without resizing if width is under 1200px", async () => {
    mockMetadata.mockResolvedValue({ width: 800, height: 600 });
    mockToBuffer.mockResolvedValue(Buffer.from("fake-webp-buffer-small"));

    const file = new File(["imagedata"], "photo.png", { type: "image/png" });
    const result = await uploadFile(file, "team");

    expect(sharp).toHaveBeenCalled();
    expect(mockResize).not.toHaveBeenCalled();
    expect(mockWebp).toHaveBeenCalledWith({ quality: 80 });
    expect(put).toHaveBeenCalledWith(
      expect.stringMatching(/^team\/\d+-\w+\.webp$/),
      Buffer.from("fake-webp-buffer-small"),
      expect.objectContaining({ contentType: "image/webp" })
    );
  });
});
