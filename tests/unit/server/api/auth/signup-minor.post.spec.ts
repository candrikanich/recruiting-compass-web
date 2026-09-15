import { describe, it, expect, vi, beforeEach } from "vitest";
import { createError } from "h3";

const yearsAgo = (n: number): string => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - n);
  return d.toISOString().slice(0, 10);
};

const mockBodyState: { body: Record<string, unknown> } = { body: {} };

const validBody = () => ({
  email: "player@example.com",
  password: "StrongPass123",
  firstName: "Owen",
  lastName: "Smith",
  dateOfBirth: yearsAgo(15),
  guardianEmail: "parent@example.com",
  captchaToken: "tok",
});

const mockCreateVerifiedAccount = vi.fn(async () => ({
  ok: true as const,
  userId: "player-uuid",
}));
const mockVerifyTurnstile = vi.fn(async () => ({ ok: true }));
const mockClaimInsert = vi.fn(async () => ({ error: null }));
const mockUserUpsert = vi.fn(async () => ({ error: null }));
const mockSendGuardianClaimEmail = vi.fn(async () => ({ success: true }));

vi.mock("~/server/utils/accountCreation", () => ({
  createVerifiedAccount: mockCreateVerifiedAccount,
}));

vi.mock("~/server/utils/turnstile", () => ({
  verifyTurnstile: mockVerifyTurnstile,
}));

vi.mock("~/server/utils/supabase", () => ({
  useSupabaseAdmin: vi.fn(() => ({
    from: (table: string) => ({
      insert: table === "guardian_claims" ? mockClaimInsert : vi.fn(),
      upsert: table === "users" ? mockUserUpsert : vi.fn(),
    }),
  })),
}));

vi.mock("~/server/utils/rateLimit", () => ({
  rateLimitByIp: vi.fn(async () => ({
    success: true,
    limit: 5,
    remaining: 4,
    reset: Date.now() + 600_000,
  })),
  throwIfRateLimited: vi.fn(),
}));

vi.mock("~/server/utils/logger", () => ({
  useLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}));

vi.mock("~/server/utils/emailService", () => ({
  sendGuardianClaimEmail: mockSendGuardianClaimEmail,
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

const { default: handler } = await import(
  "~/server/api/auth/signup-minor.post"
);

const call = async (overrides: Record<string, unknown> = {}) => {
  mockBodyState.body = { ...validBody(), ...overrides };
  return handler({} as never);
};

describe("POST /api/auth/signup-minor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyTurnstile.mockResolvedValue({ ok: true });
    mockCreateVerifiedAccount.mockResolvedValue({
      ok: true,
      userId: "player-uuid",
    });
    mockClaimInsert.mockResolvedValue({ error: null });
    mockUserUpsert.mockResolvedValue({ error: null });
    mockSendGuardianClaimEmail.mockResolvedValue({ success: true });
  });

  it("creates the account and a guardian claim for a 13-17 player", async () => {
    const result = await call();

    expect(result).toMatchObject({ ok: true, guardianEmail: "parent@example.com" });
    expect(mockClaimInsert).toHaveBeenCalledOnce();
    expect(mockSendGuardianClaimEmail).toHaveBeenCalledOnce();
  });

  it("verifies Turnstile before creating the account", async () => {
    mockVerifyTurnstile.mockResolvedValueOnce({ ok: false, reason: "missing_token" });

    await expect(call()).rejects.toMatchObject({
      statusCode: 403,
      data: { code: "captcha_failed" },
    });
    expect(mockCreateVerifiedAccount).not.toHaveBeenCalled();
  });

  it("creates the account through the shared createVerifiedAccount, with its own verification email", async () => {
    // A 13-17 player's own email is verified exactly like an adult's,
    // independent of guardian confirmation — never skipVerificationEmail.
    await call();

    expect(mockCreateVerifiedAccount).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        email: "player@example.com",
        userMetadata: expect.objectContaining({
          full_name: "Owen Smith",
          role: "player",
        }),
      }),
    );
    const [, options] = mockCreateVerifiedAccount.mock.calls[0]!;
    expect(options.skipVerificationEmail).toBeFalsy();
  });

  it("puts the real date_of_birth in the account metadata, so handle_new_user() writes it atomically", async () => {
    // A null-DOB row must never exist even momentarily: requiresGuardianInvite(null) is
    // false, so a row with no DOB reads as unlocked. Putting the exact DOB in the
    // account metadata (not just the later upsert) closes that fail-open window.
    const dob = yearsAgo(15);
    await call({ dateOfBirth: dob });

    const [, options] = mockCreateVerifiedAccount.mock.calls[0]!;
    expect(options.userMetadata).toMatchObject({ date_of_birth: dob });
    expect(mockUserUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ date_of_birth: dob }),
      expect.anything(),
    );
  });

  it("rejects a guardian email matching the player's own", async () => {
    // Otherwise the minor receives their own consent link and self-consents.
    await expect(call({ guardianEmail: "player@example.com" })).rejects.toMatchObject(
      { statusCode: 400 },
    );
    expect(mockCreateVerifiedAccount).not.toHaveBeenCalled();
  });

  it("rejects an under-13 player", async () => {
    await expect(call({ dateOfBirth: yearsAgo(11) })).rejects.toMatchObject({
      statusCode: 400,
    });
    expect(mockCreateVerifiedAccount).not.toHaveBeenCalled();
  });

  it("rejects an 18+ player, who belongs on the ordinary signup route", async () => {
    await expect(call({ dateOfBirth: yearsAgo(19) })).rejects.toMatchObject({
      statusCode: 400,
    });
    expect(mockCreateVerifiedAccount).not.toHaveBeenCalled();
  });

  it("creates the account with no guardian_claims row when guardianEmail is omitted", async () => {
    const result = await call({ guardianEmail: undefined });

    expect(result).toMatchObject({
      ok: true,
      guardianEmail: null,
      guardianEmailSent: false,
    });
    expect(mockClaimInsert).not.toHaveBeenCalled();
    expect(mockUserUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ date_of_birth: expect.any(String) }),
      expect.anything(),
    );
    expect(mockSendGuardianClaimEmail).not.toHaveBeenCalled();
  });

  it("still creates a guardian_claims row and sends the email when guardianEmail is provided", async () => {
    const result = await call();

    expect(result).toMatchObject({ ok: true, guardianEmailSent: true });
    expect(mockClaimInsert).toHaveBeenCalled();
    expect(mockSendGuardianClaimEmail).toHaveBeenCalled();
  });

  it("treats an empty guardian email as omitted, same as a missing one", async () => {
    const result = await call({ guardianEmail: "" });

    expect(result).toMatchObject({ ok: true, guardianEmail: null });
    expect(mockClaimInsert).not.toHaveBeenCalled();
    expect(mockCreateVerifiedAccount).toHaveBeenCalled();
  });

  it("still succeeds when the guardian email fails to send", async () => {
    // The account exists and the claim is live; the player can resend from the banner.
    mockSendGuardianClaimEmail.mockResolvedValue({ success: false });

    const result = await call();

    expect(result).toMatchObject({ ok: true, guardianEmailSent: false });
  });

  it("still succeeds when the guardian claim cannot be created", async () => {
    // The account itself is already created and valid (guardian-optional) — a failed
    // claim write must not fail the whole signup. The player can invite a guardian later
    // from the dashboard.
    mockClaimInsert.mockResolvedValue({ error: { message: "boom" } });

    const result = await call();

    expect(result).toMatchObject({
      ok: true,
      guardianEmail: "parent@example.com",
      guardianEmailSent: false,
    });
    expect(mockUserUpsert).toHaveBeenCalled();
    expect(mockSendGuardianClaimEmail).not.toHaveBeenCalled();
  });

  it("propagates a generic account-creation failure without a distinguishing status/code", async () => {
    mockCreateVerifiedAccount.mockResolvedValueOnce({
      ok: false,
      statusCode: 400,
      statusMessage: "Unable to create account. Please try again.",
    });

    const rejection = await call().catch((e) => e);

    expect(rejection).toMatchObject({
      statusCode: 400,
      statusMessage: "Unable to create account. Please try again.",
    });
    expect(rejection.data).toBeUndefined();
  });
});
