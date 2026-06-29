import { describe, it, expect, beforeEach, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { POST } from "@/app/api/internal/log-breach/route";

type MockPrisma = {
  rateLimitBreach: {
    create: ReturnType<typeof vi.fn>;
  };
};

const mockPrisma = prisma as unknown as MockPrisma;

const cronSecret = "test-cron-secret-that-is-at-least-32-chars!!";

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

describe("POST /api/internal/log-breach", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.rateLimitBreach.create.mockResolvedValue({ id: "mock-breach-id" });
  });

  it("returns 401 if x-internal-key header is missing", async () => {
    const res = await POST(makeRequest({ ip: "1.2.3.4", route: "/api/test" }));
    const json = await res.json() as { error: string };
    expect(res.status).toBe(401);
    expect(json.error).toBe("Unauthorized internal call.");
  });

  it("returns 401 if x-internal-key header is incorrect", async () => {
    const res = await POST(makeRequest({ ip: "1.2.3.4", route: "/api/test" }, "wrong-secret"));
    const json = await res.json() as { error: string };
    expect(res.status).toBe(401);
    expect(json.error).toBe("Unauthorized internal call.");
  });

  it("returns 400 if ip is missing from request body", async () => {
    const res = await POST(makeRequest({ route: "/api/test" }, cronSecret));
    const json = await res.json() as { error: string };
    expect(res.status).toBe(400);
    expect(json.error).toBe("Missing required fields (ip, route).");
  });

  it("returns 400 if route is missing from request body", async () => {
    const res = await POST(makeRequest({ ip: "1.2.3.4" }, cronSecret));
    const json = await res.json() as { error: string };
    expect(res.status).toBe(400);
    expect(json.error).toBe("Missing required fields (ip, route).");
  });

  it("logs the breach successfully and returns 200 with breach id", async () => {
    const payload = {
      ip: "192.168.1.1",
      route: "/api/admin/upload",
      userAgent: "curl/7.64.1",
      limitKey: "admin_upload",
    };
    const res = await POST(makeRequest(payload, cronSecret));
    const json = await res.json() as { success: boolean; id: string };

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.id).toBe("mock-breach-id");

    expect(mockPrisma.rateLimitBreach.create).toHaveBeenCalledWith({
      data: {
        ip: "192.168.1.1",
        route: "/api/admin/upload",
        userAgent: "curl/7.64.1",
        limitKey: "admin_upload",
      },
    });
  });

  it("sets null value for userAgent and limitKey if omitted from payload", async () => {
    const payload = {
      ip: "192.168.1.1",
      route: "/api/admin/upload",
    };
    const res = await POST(makeRequest(payload, cronSecret));
    const json = await res.json() as { success: boolean; id: string };

    expect(res.status).toBe(200);
    expect(mockPrisma.rateLimitBreach.create).toHaveBeenCalledWith({
      data: {
        ip: "192.168.1.1",
        route: "/api/admin/upload",
        userAgent: null,
        limitKey: null,
      },
    });
  });
});
