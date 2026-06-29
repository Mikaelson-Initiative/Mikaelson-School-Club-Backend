import { describe, it, expect, beforeAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { POST } from "@/app/api/internal/log-breach/route";

const cronSecret = process.env.CRON_SECRET || "";

function makeRequest(body: unknown, headerKey?: string): Request {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (headerKey !== undefined) {
    headers["x-internal-key"] = headerKey;
  }
  return new Request("http://localhost:3000/api/internal/log-breach", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

describe("POST /api/internal/log-breach (integration)", () => {
  it("successfully creates a rate limit breach record in the actual database", async () => {
    const payload = {
      ip: "10.0.0.99",
      route: "/api/admin/upload",
      userAgent: "integration-test-agent",
      limitKey: "admin_upload",
    };

    const res = await POST(makeRequest(payload, cronSecret));
    expect(res.status).toBe(200);

    const body = await res.json() as { success: boolean; id: string };
    expect(body.success).toBe(true);
    expect(body.id).toBeDefined();

    // Verify it exists in the database
    const dbRecord = await prisma.rateLimitBreach.findUnique({
      where: { id: body.id },
    });

    expect(dbRecord).not.toBeNull();
    expect(dbRecord?.ip).toBe("10.0.0.99");
    expect(dbRecord?.route).toBe("/api/admin/upload");
    expect(dbRecord?.userAgent).toBe("integration-test-agent");
    expect(dbRecord?.limitKey).toBe("admin_upload");
    expect(dbRecord?.createdAt).toBeInstanceOf(Date);
  });
});
