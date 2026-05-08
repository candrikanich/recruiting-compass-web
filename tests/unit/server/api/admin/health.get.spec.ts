import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("~/server/utils/auth", () => ({
  requireAdmin: vi.fn().mockResolvedValue({ id: "admin-user-id" }),
}));

vi.mock("~/server/utils/logger", () => ({
  useLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}));

const mockMaybeSingle = vi.fn();
const mockLimit = vi.fn(() => ({ maybeSingle: mockMaybeSingle }));
const mockSelect = vi.fn(() => ({ limit: mockLimit }));
const mockFrom = vi.fn(() => ({ select: mockSelect }));

vi.mock("~/server/utils/supabase", () => ({
  useSupabaseAdmin: vi.fn(() => ({ from: mockFrom })),
}));

vi.mock("h3", async (importOriginal) => {
  const actual = await importOriginal<typeof import("h3")>();
  return {
    ...actual,
    defineEventHandler: (fn: Function) => fn,
    createError: (config: { statusCode: number; statusMessage: string }) => {
      const err = new Error(config.statusMessage) as Error & {
        statusCode: number;
      };
      err.statusCode = config.statusCode;
      return err;
    },
  };
});

import { requireAdmin } from "~/server/utils/auth";

describe("GET /api/admin/health", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns ok:true, db:'ok', resend:'ok' when DB succeeds and RESEND_API_KEY is set", async () => {
    vi.stubEnv("RESEND_API_KEY", "test-key");
    mockMaybeSingle.mockResolvedValue({ data: { id: "1" }, error: null });

    const { default: handler } = await import("~/server/api/admin/health.get");
    const mockEvent = { context: {}, node: { req: {}, res: {} } } as any;

    const response = await handler(mockEvent);

    expect(response.ok).toBe(true);
    expect(response.db).toBe("ok");
    expect(response.resend).toBe("ok");
    expect(response.checks).toContainEqual(
      expect.objectContaining({ name: "Database", status: "ok" }),
    );
    expect(response.checks).toContainEqual(
      expect.objectContaining({ name: "Resend (email)", status: "ok" }),
    );
  });

  it("returns ok:true, db:'ok', resend:'missing' when DB succeeds and RESEND_API_KEY is not set", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });

    const { default: handler } = await import("~/server/api/admin/health.get");
    const mockEvent = { context: {}, node: { req: {}, res: {} } } as any;

    const response = await handler(mockEvent);

    expect(response.ok).toBe(true);
    expect(response.db).toBe("ok");
    expect(response.resend).toBe("missing");
    expect(response.checks).toContainEqual(
      expect.objectContaining({ name: "Resend (email)", status: "missing" }),
    );
  });

  it("returns ok:false, db:'error' when DB query returns an error", async () => {
    vi.stubEnv("RESEND_API_KEY", "test-key");
    mockMaybeSingle.mockResolvedValue({
      data: null,
      error: { message: "connection refused" },
    });

    const { default: handler } = await import("~/server/api/admin/health.get");
    const mockEvent = { context: {}, node: { req: {}, res: {} } } as any;

    const response = await handler(mockEvent);

    expect(response.ok).toBe(false);
    expect(response.db).toBe("error");
    expect(response.checks).toContainEqual(
      expect.objectContaining({ name: "Database", status: "error" }),
    );
  });

  it("re-throws H3Error from requireAdmin without wrapping in 500", async () => {
    const h3Error = new Error("Forbidden") as Error & { statusCode: number };
    h3Error.statusCode = 403;
    vi.mocked(requireAdmin).mockRejectedValue(h3Error);
    vi.stubEnv("RESEND_API_KEY", "test-key");

    const { default: handler } = await import("~/server/api/admin/health.get");
    const mockEvent = { context: {}, node: { req: {}, res: {} } } as any;

    await expect(handler(mockEvent)).rejects.toMatchObject({
      statusCode: 403,
      message: "Forbidden",
    });
  });

  it("wraps generic Error from requireAdmin in a 500 createError", async () => {
    vi.mocked(requireAdmin).mockRejectedValue(new Error("unexpected failure"));
    vi.stubEnv("RESEND_API_KEY", "test-key");

    const { default: handler } = await import("~/server/api/admin/health.get");
    const mockEvent = { context: {}, node: { req: {}, res: {} } } as any;

    await expect(handler(mockEvent)).rejects.toMatchObject({
      statusCode: 500,
      message: "Health check failed",
    });
  });
});
