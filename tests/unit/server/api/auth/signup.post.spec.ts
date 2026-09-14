import { describe, it, expect, vi, beforeEach } from "vitest";
import { createError } from "h3";

const mockBodyState: { body: Record<string, unknown> } = { body: {} };

const mockCreateUser = vi.fn(async () => ({
  data: { user: { id: "user-1", email: "parent@example.com" } },
  error: null as { message: string } | null,
}));
const mockIssueToken = vi.fn(async () => ({
  token: "tok-1",
  expiresAt: "2026-09-15T00:00:00.000Z",
}));
const mockSendVerification = vi.fn(async () => ({ success: true }));
const mockVerifyTurnstile = vi.fn(async () => ({ ok: true }));

vi.mock("~/server/utils/turnstile", () => ({
  verifyTurnstile: mockVerifyTurnstile,
}));
vi.mock("~/server/utils/supabase", () => ({
  useSupabaseAdmin: vi.fn(() => ({
    auth: { admin: { createUser: mockCreateUser } },
  })),
}));
vi.mock("~/server/utils/emailVerificationTokens", () => ({
  issueVerificationToken: mockIssueToken,
}));
vi.mock("~/server/utils/emailService", () => ({
  sendVerificationEmail: mockSendVerification,
}));
vi.mock("~/server/utils/rateLimit", () => ({
  rateLimitByIp: vi.fn(async () => ({ success: true })),
  throwIfRateLimited: vi.fn(),
}));
vi.mock("~/server/utils/logger", () => ({
  useLogger: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() }),
}));

vi.mock("h3", async (importOriginal) => {
  const actual = await importOriginal<typeof import("h3")>();
  return {
    ...actual,
    defineEventHandler: (fn: Function) => fn,
    readBody: vi.fn(async () => mockBodyState.body),
    getRequestIP: vi.fn(() => "127.0.0.1"),
  };
});

vi.stubGlobal("defineEventHandler", (fn: Function) => fn);
vi.stubGlobal("createError", createError);

const { default: handler } = await import("~/server/api/auth/signup.post");

const call = async (overrides: Record<string, unknown> = {}) => {
  mockBodyState.body = {
    email: "Parent@Example.com",
    password: "correct-horse-1",
    fullName: "Pat Parent",
    role: "parent",
    captchaToken: "cf-token",
    ...overrides,
  };
  return handler({} as never);
};

describe("POST /api/auth/signup", () => {
  beforeEach(() => {
    mockCreateUser.mockClear();
    mockVerifyTurnstile.mockClear();
    mockVerifyTurnstile.mockResolvedValue({ ok: true });
    mockCreateUser.mockResolvedValue({
      data: { user: { id: "user-1", email: "parent@example.com" } },
      error: null,
    });
  });

  it("creates an auto-confirmed user, issues a token, and sends the verification email", async () => {
    const result = await call();

    expect(mockVerifyTurnstile).toHaveBeenCalledWith(
      "cf-token",
      expect.objectContaining({ expectedAction: undefined }),
    );
    expect(mockCreateUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "parent@example.com",
        email_confirm: true,
      }),
    );
    expect(mockSendVerification).toHaveBeenCalledWith(
      expect.objectContaining({ to: "parent@example.com", token: "tok-1" }),
    );
    expect(result).toEqual({ userId: "user-1" });
  });

  it("rejects when Turnstile verification fails", async () => {
    mockVerifyTurnstile.mockResolvedValueOnce({ ok: false, reason: "missing_token" });

    await expect(
      call({ fullName: undefined, role: undefined }),
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(mockCreateUser).not.toHaveBeenCalled();
  });
});
