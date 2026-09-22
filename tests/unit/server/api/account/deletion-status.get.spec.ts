import { describe, it, expect, vi, beforeEach } from "vitest";

const mockState = {
  userId: "user-1",
  deletionRequestedAt: null as string | null,
  selectError: null as object | null,
};

vi.mock("~/server/utils/auth", () => ({
  requireAuth: vi.fn(async () => ({ id: mockState.userId })),
}));

vi.mock("~/server/utils/logger", () => ({
  useLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}));

vi.mock("~/server/utils/supabase", () => ({
  createServerSupabaseUserClient: vi.fn(() => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () =>
            Promise.resolve({
              data: { deletion_requested_at: mockState.deletionRequestedAt },
              error: mockState.selectError,
            }),
        }),
      }),
    }),
  })),
}));

vi.mock("~/server/utils/requestToken", () => ({
  extractRequestToken: vi.fn(() => "fake-token"),
}));

vi.mock("h3", async (importOriginal) => {
  const actual = await importOriginal<typeof import("h3")>();
  return {
    ...actual,
    defineEventHandler: (fn: Function) => fn,
    createError: (config: {
      statusCode: number;
      statusMessage?: string;
      message?: string;
    }) => {
      const err = new Error(
        config.statusMessage ?? config.message ?? "error",
      ) as Error & { statusCode: number };
      err.statusCode = config.statusCode;
      return err;
    },
  };
});

const { default: handler } =
  await import("~/server/api/account/deletion-status.get");

const mockEvent = { context: {}, node: { req: {}, res: {} } } as Parameters<
  typeof handler
>[0];

describe("GET /api/account/deletion-status", () => {
  beforeEach(() => {
    mockState.userId = "user-1";
    mockState.deletionRequestedAt = null;
    mockState.selectError = null;
  });

  it("returns null when no deletion is pending", async () => {
    const result = await handler(mockEvent);
    expect(result).toEqual({ deletion_requested_at: null });
  });

  it("returns the timestamp when deletion is pending", async () => {
    mockState.deletionRequestedAt = "2026-02-01T00:00:00Z";
    const result = await handler(mockEvent);
    expect(result).toEqual({ deletion_requested_at: "2026-02-01T00:00:00Z" });
  });

  it("throws 500 when the query fails", async () => {
    mockState.selectError = { message: "db error" };
    await expect(handler(mockEvent)).rejects.toMatchObject({
      statusCode: 500,
    });
  });

  it("propagates H3 error from requireAuth without wrapping", async () => {
    const { requireAuth } = await import("~/server/utils/auth");
    const h3Err = Object.assign(new Error("Unauthorized"), { statusCode: 401 });
    vi.mocked(requireAuth).mockRejectedValueOnce(h3Err);

    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 401 });
  });
});
