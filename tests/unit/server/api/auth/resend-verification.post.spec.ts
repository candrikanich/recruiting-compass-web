import { describe, it, expect, vi, beforeEach } from "vitest";
import { createError } from "h3";

const mockRateLimitState = {
  success: true as boolean,
  limit: 5,
  remaining: 4,
  reset: Date.now() + 3_600_000,
};

// Shared state read at call-time to avoid top-level variable hoisting issues
const mockBodyState = { email: "test@example.com" as string | undefined };

const mockListUsersByFilter = vi.fn(async () => ({
  data: { users: [{ email: "test@example.com", email_confirmed_at: null }] },
  error: null,
}));
const mockGenerateLink = vi.fn(async () => ({ error: null }));

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
        listUsersByFilter: mockListUsersByFilter,
        generateLink: mockGenerateLink,
      },
    },
  })),
}));

vi.mock("h3", async (importOriginal) => {
  const actual = await importOriginal<typeof import("h3")>();
  return {
    ...actual,
    defineEventHandler: (fn: Function) => fn,
    // Read state at call-time, not factory-time (avoids hoisting issues)
    readBody: vi.fn(async () => ({ email: mockBodyState.email })),
    getRequestIP: vi.fn(() => "127.0.0.1"),
  };
});

vi.stubGlobal("defineEventHandler", (fn: Function) => fn);
vi.stubGlobal(
  "readBody",
  vi.fn(async () => ({ email: mockBodyState.email })),
);
// Expose h3 createError as global for Nuxt auto-import resolution in the handler
vi.stubGlobal("createError", createError);

import { rateLimitByIp, throwIfRateLimited } from "~/server/utils/rateLimit";

const { default: handler } =
  await import("~/server/api/auth/resend-verification.post");

describe("POST /api/auth/resend-verification — rate limiting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRateLimitState.success = true;
    mockRateLimitState.remaining = 4;
    mockBodyState.email = "test@example.com";

    vi.mocked(rateLimitByIp).mockResolvedValue({ ...mockRateLimitState });
    vi.mocked(throwIfRateLimited).mockImplementation((result) => {
      if (!result.success) {
        throw createError({
          statusCode: 429,
          statusMessage: "Too many requests",
        });
      }
    });

    mockListUsersByFilter.mockResolvedValue({
      data: {
        users: [{ email: "test@example.com", email_confirmed_at: null }],
      },
      error: null,
    });
    mockGenerateLink.mockResolvedValue({ error: null });
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

describe("POST /api/auth/resend-verification — input validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(rateLimitByIp).mockResolvedValue({
      ...mockRateLimitState,
      success: true,
    });
    vi.mocked(throwIfRateLimited).mockImplementation(() => {});
    mockListUsersByFilter.mockResolvedValue({
      data: {
        users: [{ email: "test@example.com", email_confirmed_at: null }],
      },
      error: null,
    });
    mockGenerateLink.mockResolvedValue({ error: null });
  });

  it("returns 400 when email is empty string", async () => {
    mockBodyState.email = "";

    await expect(
      handler({} as Parameters<typeof handler>[0]),
    ).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: "Email address is required",
    });
  });

  it("returns 400 when email is undefined", async () => {
    mockBodyState.email = undefined;

    await expect(
      handler({} as Parameters<typeof handler>[0]),
    ).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: "Email address is required",
    });
  });

  it("returns 400 when email format is invalid", async () => {
    mockBodyState.email = "not-an-email";

    await expect(
      handler({} as Parameters<typeof handler>[0]),
    ).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: "Invalid email address format",
    });
  });

  it("returns 400 when email has no domain extension", async () => {
    mockBodyState.email = "user@domain";

    await expect(
      handler({} as Parameters<typeof handler>[0]),
    ).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: "Invalid email address format",
    });
  });
});

describe("POST /api/auth/resend-verification — user lookup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(rateLimitByIp).mockResolvedValue({
      ...mockRateLimitState,
      success: true,
    });
    vi.mocked(throwIfRateLimited).mockImplementation(() => {});
    mockBodyState.email = "test@example.com";
    mockGenerateLink.mockResolvedValue({ error: null });
  });

  it("returns success with safe message when no user found", async () => {
    mockListUsersByFilter.mockResolvedValue({
      data: { users: [] },
      error: null,
    });

    const result = await handler({} as Parameters<typeof handler>[0]);

    expect(result).toMatchObject({
      success: true,
      message: expect.stringContaining("If an account exists"),
    });
  });

  it("returns success with safe message when listUsersByFilter errors", async () => {
    mockListUsersByFilter.mockResolvedValue({
      data: null,
      error: { message: "DB error" },
    });

    const result = await handler({} as Parameters<typeof handler>[0]);

    expect(result).toMatchObject({
      success: true,
      message: expect.stringContaining("If an account exists"),
    });
  });

  it("returns already-verified message when user is already confirmed", async () => {
    mockListUsersByFilter.mockResolvedValue({
      data: {
        users: [
          {
            email: "test@example.com",
            email_confirmed_at: "2026-01-01T00:00:00Z",
          },
        ],
      },
      error: null,
    });

    const result = await handler({} as Parameters<typeof handler>[0]);

    expect(result).toMatchObject({
      success: true,
      message: "Your email is already verified.",
    });
  });
});

describe("POST /api/auth/resend-verification — send verification email", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(rateLimitByIp).mockResolvedValue({
      ...mockRateLimitState,
      success: true,
    });
    vi.mocked(throwIfRateLimited).mockImplementation(() => {});
    mockBodyState.email = "test@example.com";
    mockListUsersByFilter.mockResolvedValue({
      data: {
        users: [{ email: "test@example.com", email_confirmed_at: null }],
      },
      error: null,
    });
  });

  it("returns success when email is sent successfully", async () => {
    mockGenerateLink.mockResolvedValue({ error: null });

    const result = await handler({} as Parameters<typeof handler>[0]);

    expect(result).toMatchObject({
      success: true,
      message: "Verification email sent successfully.",
    });
  });

  it("returns 429 when Supabase rate-limits email sending", async () => {
    mockGenerateLink.mockResolvedValue({
      error: { message: "over_email_send_rate_limit: too many requests" },
    });

    await expect(
      handler({} as Parameters<typeof handler>[0]),
    ).rejects.toMatchObject({
      statusCode: 429,
    });
  });

  it("returns 400 when generateLink fails with generic error", async () => {
    mockGenerateLink.mockResolvedValue({
      error: { message: "some unexpected error" },
    });

    await expect(
      handler({} as Parameters<typeof handler>[0]),
    ).rejects.toMatchObject({
      statusCode: 400,
    });
  });
});
