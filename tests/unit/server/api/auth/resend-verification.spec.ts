import { describe, it, expect, vi, beforeEach } from "vitest";
import { createError } from "h3";

const mockRateLimitState = {
  success: true as boolean,
  limit: 5,
  remaining: 4,
  reset: Date.now() + 3_600_000,
};

vi.mock("~/server/utils/rateLimit", () => ({
  rateLimitByIp: vi.fn(async () => ({ ...mockRateLimitState })),
  throwIfRateLimited: vi.fn((result: { success: boolean; reset: number }) => {
    if (!result.success) {
      throw createError({
        statusCode: 429,
        statusMessage: "Too many requests",
      });
    }
  }),
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
  createServerSupabaseClient: vi.fn(() => ({
    auth: {
      admin: {
        listUsersByFilter: vi.fn(async () => ({
          data: { users: [] },
          error: null,
        })),
        generateLink: vi.fn(async () => ({ error: null })),
      },
    },
  })),
}));

vi.mock("h3", async (importOriginal) => {
  const actual = await importOriginal<typeof import("h3")>();
  return {
    ...actual,
    defineEventHandler: (fn: Function) => fn,
    readBody: vi.fn(async () => ({ email: "test@example.com" })),
    getRequestIP: vi.fn(() => "127.0.0.1"),
    createError: (cfg: {
      statusCode: number;
      statusMessage?: string;
      data?: unknown;
    }) => {
      const err = new Error(cfg.statusMessage) as Error & {
        statusCode: number;
      };
      err.statusCode = cfg.statusCode;
      return err;
    },
  };
});

vi.stubGlobal("defineEventHandler", (fn: Function) => fn);
vi.stubGlobal(
  "readBody",
  vi.fn(async () => ({ email: "test@example.com" })),
);
vi.stubGlobal(
  "createError",
  (cfg: { statusCode: number; statusMessage?: string; data?: unknown }) => {
    const err = new Error(cfg.statusMessage) as Error & { statusCode: number };
    err.statusCode = cfg.statusCode;
    return err;
  },
);

import { rateLimitByIp, throwIfRateLimited } from "~/server/utils/rateLimit";

const { default: handler } =
  await import("~/server/api/auth/resend-verification.post");

describe("POST /api/auth/resend-verification — rate limiting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRateLimitState.success = true;
    mockRateLimitState.remaining = 4;

    vi.mocked(rateLimitByIp).mockResolvedValue({ ...mockRateLimitState });
    vi.mocked(throwIfRateLimited).mockImplementation((result) => {
      if (!result.success) {
        throw createError({
          statusCode: 429,
          statusMessage: "Too many requests",
        });
      }
    });
  });

  it("returns 429 when rate limit is exceeded", async () => {
    mockRateLimitState.success = false;
    mockRateLimitState.remaining = 0;
    vi.mocked(rateLimitByIp).mockResolvedValue({ ...mockRateLimitState });

    await expect(
      handler({} as Parameters<typeof handler>[0]),
    ).rejects.toMatchObject({
      statusCode: 429,
    });
  });

  it("calls rateLimitByIp with correct options", async () => {
    await handler({} as Parameters<typeof handler>[0]);

    expect(rateLimitByIp).toHaveBeenCalledWith(expect.anything(), {
      requests: 5,
      window: "1 h",
    });
  });

  it("calls throwIfRateLimited with the rate limit result", async () => {
    await handler({} as Parameters<typeof handler>[0]);

    expect(throwIfRateLimited).toHaveBeenCalledWith(
      expect.objectContaining({ success: true }),
    );
  });

  it("allows request through when under the rate limit", async () => {
    const result = await handler({} as Parameters<typeof handler>[0]);

    expect(result).toMatchObject({ success: true });
  });
});
