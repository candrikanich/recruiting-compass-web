import { describe, it, expect, vi, beforeEach } from "vitest";

const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };
const mockInsert = vi.fn();
const mockFrom = vi.fn(() => ({ insert: mockInsert }));

// Nuxt server auto-imports — must be globals
vi.stubGlobal("defineEventHandler", (handler: (event: unknown) => unknown) => handler);
vi.stubGlobal("createError", (opts: { statusCode: number; statusMessage: string }) => {
  const err = new Error(opts.statusMessage) as Error & { statusCode: number };
  err.statusCode = opts.statusCode;
  return err;
});

vi.mock("~/server/utils/logger", () => ({
  useLogger: vi.fn(() => mockLogger),
}));
vi.mock("~/server/utils/auth", () => ({
  requireAuth: vi.fn(),
}));
vi.mock("~/server/utils/supabase", () => ({
  useSupabaseAdmin: vi.fn(() => ({ from: mockFrom })),
}));
vi.mock("~/server/utils/validation", () => ({
  validateBody: vi.fn(),
}));
vi.mock("~/server/utils/errorHandler", () => ({
  createSafeErrorResponse: vi.fn(() => ({
    statusCode: 500,
    statusMessage: "Internal error",
    data: null,
  })),
}));

const mockEvent = { context: {}, node: { req: { headers: {} } } } as any;

describe("POST /api/help/feedback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInsert.mockResolvedValue({ error: null });
  });

  it("exports a valid event handler", async () => {
    const mod = await import("~/server/api/help/feedback.post");
    expect(typeof mod.default).toBe("function");
  });

  it("inserts feedback and returns { ok: true } for thumbs up", async () => {
    const { requireAuth } = await import("~/server/utils/auth");
    const { validateBody } = await import("~/server/utils/validation");
    vi.mocked(requireAuth).mockResolvedValue({ id: "user-123" } as any);
    vi.mocked(validateBody).mockResolvedValue({ page: "/help/schools", helpful: true });

    const { default: handler } = await import("~/server/api/help/feedback.post");
    const result = await handler(mockEvent);

    expect(result).toEqual({ ok: true });
    expect(mockFrom).toHaveBeenCalledWith("help_feedback");
    expect(mockInsert).toHaveBeenCalledWith({
      page: "/help/schools",
      helpful: true,
      user_id: "user-123",
    });
  });

  it("inserts feedback and returns { ok: true } for thumbs down", async () => {
    const { requireAuth } = await import("~/server/utils/auth");
    const { validateBody } = await import("~/server/utils/validation");
    vi.mocked(requireAuth).mockResolvedValue({ id: "user-456" } as any);
    vi.mocked(validateBody).mockResolvedValue({ page: "/help/phases", helpful: false });

    const { default: handler } = await import("~/server/api/help/feedback.post");
    const result = await handler(mockEvent);

    expect(result).toEqual({ ok: true });
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ helpful: false, page: "/help/phases" })
    );
  });

  it("throws 401 when user is not authenticated", async () => {
    const { requireAuth } = await import("~/server/utils/auth");
    vi.mocked(requireAuth).mockRejectedValue(
      Object.assign(new Error("Unauthorized"), { statusCode: 401 })
    );

    const { default: handler } = await import("~/server/api/help/feedback.post");
    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 401 });
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("throws 500 when Supabase insert fails", async () => {
    const { requireAuth } = await import("~/server/utils/auth");
    const { validateBody } = await import("~/server/utils/validation");
    vi.mocked(requireAuth).mockResolvedValue({ id: "user-123" } as any);
    vi.mocked(validateBody).mockResolvedValue({ page: "/help/account", helpful: true });
    mockInsert.mockResolvedValue({ error: { message: "DB error" } });

    const { default: handler } = await import("~/server/api/help/feedback.post");
    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 500 });
    expect(mockLogger.error).toHaveBeenCalled();
  });

  it("does not expose raw DB error in statusMessage", async () => {
    const { requireAuth } = await import("~/server/utils/auth");
    const { validateBody } = await import("~/server/utils/validation");
    vi.mocked(requireAuth).mockResolvedValue({ id: "user-123" } as any);
    vi.mocked(validateBody).mockResolvedValue({ page: "/help/getting-started", helpful: false });
    mockInsert.mockResolvedValue({ error: { message: "relation does not exist" } });

    const { default: handler } = await import("~/server/api/help/feedback.post");
    await expect(handler(mockEvent)).rejects.toMatchObject({
      message: expect.not.stringContaining("relation does not exist"),
    });
  });
});
