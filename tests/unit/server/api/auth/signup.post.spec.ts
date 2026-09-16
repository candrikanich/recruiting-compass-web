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
const mockInvitationState: {
  invitation: { status: string; expires_at: string } | null;
} = { invitation: null };

vi.mock("~/server/utils/turnstile", () => ({
  verifyTurnstile: mockVerifyTurnstile,
}));
vi.mock("~/server/utils/supabase", () => ({
  useSupabaseAdmin: vi.fn(() => ({
    auth: { admin: { createUser: mockCreateUser } },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: mockInvitationState.invitation }),
        }),
      }),
    }),
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
    mockIssueToken.mockClear();
    mockSendVerification.mockClear();
    mockVerifyTurnstile.mockClear();
    mockVerifyTurnstile.mockResolvedValue({ ok: true });
    mockCreateUser.mockResolvedValue({
      data: { user: { id: "user-1", email: "parent@example.com" } },
      error: null,
    });
    mockInvitationState.invitation = null;
  });

  describe("captcha skip for invite-accept signups", () => {
    it("skips Turnstile when a valid pending invite token is supplied", async () => {
      mockInvitationState.invitation = {
        status: "pending",
        expires_at: "2099-01-01T00:00:00.000Z",
      };

      const result = await call({
        captchaToken: undefined,
        inviteToken: "tok-abc",
      });

      expect(mockVerifyTurnstile).not.toHaveBeenCalled();
      expect(result).toEqual({ userId: "user-1" });
    });

    it("still enforces Turnstile when the invite token is expired", async () => {
      mockInvitationState.invitation = {
        status: "pending",
        expires_at: "2000-01-01T00:00:00.000Z",
      };
      mockVerifyTurnstile.mockResolvedValueOnce({
        ok: false,
        reason: "missing_token",
      });

      await expect(
        call({ captchaToken: undefined, inviteToken: "tok-abc" }),
      ).rejects.toMatchObject({ statusCode: 403 });
    });

    it("still enforces Turnstile when the invite token is not found", async () => {
      mockInvitationState.invitation = null;
      mockVerifyTurnstile.mockResolvedValueOnce({
        ok: false,
        reason: "missing_token",
      });

      await expect(
        call({ captchaToken: undefined, inviteToken: "nonexistent" }),
      ).rejects.toMatchObject({ statusCode: 403 });
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
    ).rejects.toMatchObject({
      statusCode: 403,
      data: { code: "captcha_failed" },
    });
    expect(mockCreateUser).not.toHaveBeenCalled();
  });

  it("responds to a duplicate email the same generic way as any other creation failure", async () => {
    // A distinct "account already exists" response is an account-existence
    // enumeration oracle Supabase's own signUp() deliberately avoids — this
    // endpoint must not reintroduce one. No statusCode/message/data
    // distinguishes a duplicate email from any other creation failure.
    mockCreateUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: "A user with this email address has already been registered" },
    } as never);

    const rejection = await call().catch((e) => e);

    expect(rejection).toMatchObject({
      statusCode: 400,
      statusMessage: "Unable to create account. Please try again.",
    });
    expect(rejection.data).toBeUndefined();
  });

  it("skips the verification token and email when skipVerificationEmail is set", async () => {
    // Invite / guardian-claim signups get email_verified_at stamped by their
    // own accept handler — they must never receive a verification email.
    const result = await call({ skipVerificationEmail: true });

    expect(mockIssueToken).not.toHaveBeenCalled();
    expect(mockSendVerification).not.toHaveBeenCalled();
    expect(result).toEqual({ userId: "user-1" });
  });

  describe("metadata is never trusted from the request body", () => {
    // An unauthenticated caller could previously POST metadata: { pending_admin:
    // true } directly to this public endpoint and have it land in user_metadata
    // unchanged — admin-profile.post.ts's since-removed pending_admin trust path
    // then let that self-promote to admin on next sign-in with no adminToken at
    // all. Only an explicit allowlist of harmless pending onboarding/invite
    // fields may pass through; anything else, privileged or not, is dropped.
    it("strips a privileged pending_admin flag from client-supplied metadata", async () => {
      await call({ metadata: { pending_admin: true } });

      expect(mockCreateUser).toHaveBeenCalledWith(
        expect.objectContaining({
          user_metadata: expect.not.objectContaining({ pending_admin: true }),
        }),
      );
    });

    it("strips arbitrary/unrecognized metadata keys, including other privileged-looking flags", async () => {
      await call({
        metadata: { is_admin: true, role: "admin", some_other_key: "value" },
      });

      const userMetadata = mockCreateUser.mock.calls[0][0].user_metadata;
      expect(userMetadata).not.toHaveProperty("is_admin");
      expect(userMetadata).not.toHaveProperty("some_other_key");
      // `role` IS set, but only from the endpoint's own explicit `role` field
      // (see call() default), never from the metadata blob.
      expect(userMetadata.role).toBe("parent");
    });

    it("still allows the harmless allowlisted pending onboarding/invite fields through", async () => {
      await call({
        metadata: {
          pending_primary_sport: "Baseball",
          pending_graduation_year: "2027",
          pending_gender: "male",
          pending_zip_code: "90210",
          pending_invite_token: "tok-abc",
        },
      });

      expect(mockCreateUser).toHaveBeenCalledWith(
        expect.objectContaining({
          user_metadata: expect.objectContaining({
            pending_primary_sport: "Baseball",
            pending_graduation_year: "2027",
            pending_gender: "male",
            pending_zip_code: "90210",
            pending_invite_token: "tok-abc",
          }),
        }),
      );
    });
  });
});
