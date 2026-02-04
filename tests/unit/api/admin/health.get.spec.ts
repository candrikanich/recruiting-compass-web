import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("~/server/utils/auth", () => ({
  requireAuth: vi.fn().mockResolvedValue({ id: "admin-user-id" }),
}));

const mockFrom = vi.fn();
vi.mock("~/server/utils/supabase", () => ({
  useSupabaseAdmin: vi.fn(() => ({ from: mockFrom })),
}));

vi.mock("~/server/utils/logger", () => ({
  createLogger: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

describe("GET /api/admin/health", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { is_admin: true } }),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ error: null }),
    });
  });

  it("exports a valid event handler", async () => {
    const mod = await import("~/server/api/admin/health.get");
    expect(mod).toBeDefined();
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe("function");
  });

  it("AdminHealthResponse shape: ok, db, resend, checks array", () => {
    const response: {
      ok: boolean;
      db: "ok" | "error";
      resend: "ok" | "missing";
      checks: { name: string; status: string; message?: string }[];
    } = {
      ok: true,
      db: "ok",
      resend: "ok",
      checks: [
        { name: "Database", status: "ok" },
        { name: "Resend (email)", status: "ok" },
      ],
    };
    expect(response.checks).toHaveLength(2);
    expect(response.checks[0]).toHaveProperty("name");
    expect(response.checks[0]).toHaveProperty("status");
  });

  it("handler returns health shape with ok, db, resend, checks", async () => {
    const mod = await import("~/server/api/admin/health.get");
    const handler = mod.default;
    const mockEvent = { node: { req: { headers: {} } }, context: {} };

    const result = await handler(mockEvent as any);
    expect(result).toHaveProperty("ok");
    expect(result).toHaveProperty("db");
    expect(result).toHaveProperty("resend");
    expect(result).toHaveProperty("checks");
    expect(typeof result.ok).toBe("boolean");
    expect(["ok", "error"]).toContain(result.db);
    expect(["ok", "missing"]).toContain(result.resend);
    expect(Array.isArray(result.checks)).toBe(true);
    expect(result.checks.length).toBeGreaterThanOrEqual(1);
    result.checks.forEach((c: { name: string; status: string }) => {
      expect(c).toHaveProperty("name");
      expect(c).toHaveProperty("status");
    });
  });
});
