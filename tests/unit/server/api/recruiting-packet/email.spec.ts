import { describe, it, expect, vi, beforeEach } from "vitest";
import { createError } from "h3";

const mockState = {
  userId: "user-456",
};

const mockRateLimitState = {
  success: true as boolean,
  limit: 5,
  remaining: 4,
  reset: Date.now() + 86_400_000,
};

vi.mock("~/server/utils/rateLimit", () => ({
  rateLimitByUser: vi.fn(async () => ({ ...mockRateLimitState })),
  throwIfRateLimited: vi.fn((result: { success: boolean; reset: number }) => {
    if (!result.success) {
      throw createError({
        statusCode: 429,
        statusMessage: "Too many requests",
      });
    }
  }),
}));

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

const mockResendInstance = {
  emails: {
    send: vi.fn(async () => ({ id: "email-123" })),
  },
};

vi.mock("resend", () => {
  function ResendMock() {
    return mockResendInstance;
  }
  return { Resend: ResendMock };
});

vi.mock("h3", async (importOriginal) => {
  const actual = await importOriginal<typeof import("h3")>();
  return {
    ...actual,
    defineEventHandler: (fn: Function) => fn,
    readBody: vi.fn(async () => ({
      recipients: ["coach@school.edu"],
      subject: "Recruiting Packet",
      body: "Please find my profile attached.",
      athleteName: "Test Athlete",
    })),
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
  "createError",
  (cfg: { statusCode: number; statusMessage?: string; data?: unknown }) => {
    const err = new Error(cfg.statusMessage) as Error & { statusCode: number };
    err.statusCode = cfg.statusCode;
    return err;
  },
);

vi.stubGlobal("process", {
  ...process,
  env: { ...process.env, RESEND_API_KEY: "test-key" },
});

import { rateLimitByUser, throwIfRateLimited } from "~/server/utils/rateLimit";
import { requireAuth } from "~/server/utils/auth";

const { default: handler } =
  await import("~/server/api/recruiting-packet/email.post");

describe("POST /api/recruiting-packet/email — rate limiting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.userId = "user-456";
    mockRateLimitState.success = true;
    mockRateLimitState.remaining = 4;

    vi.mocked(requireAuth).mockResolvedValue({ id: mockState.userId });
    vi.mocked(rateLimitByUser).mockResolvedValue({ ...mockRateLimitState });
    vi.mocked(throwIfRateLimited).mockImplementation((result) => {
      if (!result.success) {
        throw createError({
          statusCode: 429,
          statusMessage: "Too many requests",
        });
      }
    });
  });

  it("returns 429 when user rate limit is exceeded", async () => {
    mockRateLimitState.success = false;
    mockRateLimitState.remaining = 0;
    vi.mocked(rateLimitByUser).mockResolvedValue({ ...mockRateLimitState });

    await expect(
      handler({} as Parameters<typeof handler>[0]),
    ).rejects.toMatchObject({
      statusCode: 429,
    });
  });

  it("calls rateLimitByUser with correct options (5 req / 24 h)", async () => {
    await handler({} as Parameters<typeof handler>[0]);

    expect(rateLimitByUser).toHaveBeenCalledWith(
      expect.anything(),
      mockState.userId,
      { requests: 5, window: "24 h" },
    );
  });

  it("calls throwIfRateLimited with the rate limit result", async () => {
    await handler({} as Parameters<typeof handler>[0]);

    expect(throwIfRateLimited).toHaveBeenCalledWith(
      expect.objectContaining({ success: true }),
    );
  });

  it("sends email when under rate limit", async () => {
    const result = await handler({} as Parameters<typeof handler>[0]);

    expect(result).toMatchObject({ success: true });
  });
});
