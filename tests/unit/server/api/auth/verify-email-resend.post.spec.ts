import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRateLimitState = {
  success: true as boolean,
  limit: 5,
  remaining: 4,
  reset: Date.now() + 3_600_000,
};

const mockIssueToken = vi.fn(async () => ({
  token: "tok-2",
  expiresAt: "2026-09-16T00:00:00.000Z",
}));
const mockSendVerification = vi.fn(async () => ({ success: true }));
const mockInvalidateOutstanding = vi.fn(async () => undefined);
const mockDiscardToken = vi.fn(async () => undefined);

vi.mock("~/server/utils/auth", () => ({
  requireAuth: vi.fn(async () => ({
    id: "user-1",
    email: "parent@example.com",
  })),
}));
vi.mock("~/server/utils/emailVerificationTokens", () => ({
  issueVerificationToken: mockIssueToken,
  invalidateOutstandingTokens: mockInvalidateOutstanding,
  discardVerificationToken: mockDiscardToken,
}));
vi.mock("~/server/utils/emailService", () => ({
  sendVerificationEmail: mockSendVerification,
}));
vi.mock("~/server/utils/rateLimit", () => ({
  rateLimitByUser: vi.fn(async () => ({ ...mockRateLimitState })),
  throwIfRateLimited: vi.fn((result: { success: boolean; reset: number }) => {
    if (!result.success) {
      throw new Error("Too many requests");
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

vi.mock("h3", async () => {
  const actual = await vi.importActual<typeof import("h3")>("h3");
  return {
    ...actual,
    defineEventHandler: (fn: Function) => fn,
  };
});

import { requireAuth } from "~/server/utils/auth";
import { rateLimitByUser, throwIfRateLimited } from "~/server/utils/rateLimit";

const { default: handler } =
  await import("~/server/api/auth/verify-email/resend.post");

describe("POST /api/auth/verify-email/resend", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRateLimitState.success = true;
    mockRateLimitState.remaining = 4;
    vi.mocked(requireAuth).mockResolvedValue({
      id: "user-1",
      email: "parent@example.com",
    });
    vi.mocked(rateLimitByUser).mockResolvedValue({ ...mockRateLimitState });
    vi.mocked(throwIfRateLimited).mockImplementation((result) => {
      if (!result.success) {
        throw new Error("Too many requests");
      }
    });
    mockIssueToken.mockResolvedValue({
      token: "tok-2",
      expiresAt: "2026-09-16T00:00:00.000Z",
    });
    mockSendVerification.mockResolvedValue({ success: true });
  });

  it("issues a new token (without invalidating the prior one yet) and re-sends for the authenticated user", async () => {
    const result = await handler({} as Parameters<typeof handler>[0]);

    expect(requireAuth).toHaveBeenCalled();
    expect(mockIssueToken).toHaveBeenCalledWith("user-1", {
      invalidatePrior: false,
    });
    expect(mockSendVerification).toHaveBeenCalledWith(
      expect.objectContaining({ to: "parent@example.com", token: "tok-2" }),
    );
    expect(result).toEqual({ success: true });
  });

  it("invalidates the prior token only after the send succeeds", async () => {
    await handler({} as Parameters<typeof handler>[0]);

    expect(mockInvalidateOutstanding).toHaveBeenCalledWith("user-1", "tok-2");
    expect(mockDiscardToken).not.toHaveBeenCalled();
  });

  it("throws instead of reporting success when the email fails to send", async () => {
    mockSendVerification.mockResolvedValue({
      success: false,
      error: "resend-api-down",
    });

    await expect(
      handler({} as Parameters<typeof handler>[0]),
    ).rejects.toThrow();

    expect(mockInvalidateOutstanding).not.toHaveBeenCalled();
  });

  it("discards the newly-issued token on send failure so the prior link stays valid", async () => {
    mockSendVerification.mockResolvedValue({
      success: false,
      error: "resend-api-down",
    });

    await expect(
      handler({} as Parameters<typeof handler>[0]),
    ).rejects.toThrow();

    expect(mockDiscardToken).toHaveBeenCalledWith("tok-2");
  });

  it("rate-limits by the authenticated user id", async () => {
    await handler({} as Parameters<typeof handler>[0]);

    expect(rateLimitByUser).toHaveBeenCalledWith(expect.anything(), "user-1", {
      requests: 5,
      window: "1 h",
    });
  });

  it("throws when the user is rate-limited", async () => {
    mockRateLimitState.success = false;
    vi.mocked(rateLimitByUser).mockResolvedValue({ ...mockRateLimitState });

    await expect(handler({} as Parameters<typeof handler>[0])).rejects.toThrow(
      "Too many requests",
    );

    expect(mockIssueToken).not.toHaveBeenCalled();
  });
});
