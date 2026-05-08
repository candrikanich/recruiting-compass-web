import { describe, it, expect, vi, beforeEach } from "vitest";

const mockState = {
  userId: "user-1",
  deletionRequestedAt: "2026-02-01T00:00:00Z" as string | null,
  updateError: null as object | null,
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
  useSupabaseAdmin: vi.fn(() => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () =>
            Promise.resolve({
              data: { deletion_requested_at: mockState.deletionRequestedAt },
              error: null,
            }),
        }),
      }),
      update: () => ({
        eq: () => Promise.resolve({ error: mockState.updateError }),
      }),
    }),
  })),
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
      ) as Error & {
        statusCode: number;
      };
      err.statusCode = config.statusCode;
      return err;
    },
  };
});

const { default: handler } =
  await import("~/server/api/account/cancel-deletion.post");

const mockEvent = { context: {}, node: { req: {}, res: {} } } as Parameters<
  typeof handler
>[0];

describe("POST /api/account/cancel-deletion", () => {
  beforeEach(() => {
    mockState.userId = "user-1";
    mockState.deletionRequestedAt = "2026-02-01T00:00:00Z";
    mockState.updateError = null;
  });

  it("returns success:true when deletion is pending and cancel succeeds", async () => {
    const result = await handler(mockEvent);
    expect(result).toEqual({ success: true });
  });

  it("throws 400 when deletion_requested_at is null (no pending deletion)", async () => {
    mockState.deletionRequestedAt = null;
    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 400 });
  });

  it("throws 400 when userData has no deletion_requested_at field", async () => {
    // Simulate DB returning a row with no deletion_requested_at (undefined)
    mockState.deletionRequestedAt = null;
    await expect(handler(mockEvent)).rejects.toMatchObject({
      statusCode: 400,
      message: "No pending deletion to cancel",
    });
  });

  it("throws 500 when DB update returns an error", async () => {
    mockState.updateError = { message: "write error" };
    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 500 });
  });

  it("propagates H3 error from requireAuth without wrapping", async () => {
    const { requireAuth } = await import("~/server/utils/auth");
    const h3Err = Object.assign(new Error("Unauthorized"), { statusCode: 401 });
    vi.mocked(requireAuth).mockRejectedValueOnce(h3Err);

    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 401 });
  });

  it("wraps unexpected non-H3 errors in a 500", async () => {
    const { requireAuth } = await import("~/server/utils/auth");
    vi.mocked(requireAuth).mockRejectedValueOnce(new Error("unexpected"));

    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 500 });
  });
});
