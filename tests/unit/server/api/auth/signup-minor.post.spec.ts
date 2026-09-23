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
const mockUserUpdateEq = vi.fn(async () => ({ error: null }));
const mockUserUpdate = vi.fn(() => ({ eq: mockUserUpdateEq }));
const mockPreferencesUpsert = vi.fn(async () => ({ error: null }));
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
      upsert:
        table === "users"
          ? mockUserUpsert
          : table === "user_preferences"
            ? mockPreferencesUpsert
            : vi.fn(),
      update: table === "users" ? mockUserUpdate : vi.fn(),
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

const { default: handler } =
  await import("~/server/api/auth/signup-minor.post");

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
    mockUserUpdateEq.mockResolvedValue({ error: null });
    mockPreferencesUpsert.mockResolvedValue({ error: null });
    mockSendGuardianClaimEmail.mockResolvedValue({ success: true });
  });

  it("creates the account and a guardian claim for a 13-17 player", async () => {
    const result = await call();

    expect(result).toMatchObject({
      ok: true,
      guardianEmail: "parent@example.com",
    });
    expect(mockClaimInsert).toHaveBeenCalledOnce();
    expect(mockSendGuardianClaimEmail).toHaveBeenCalledOnce();
  });

  it("passes through the tokenHash from createVerifiedAccount so the client can skip the captcha-gated sign-in", async () => {
    mockCreateVerifiedAccount.mockResolvedValueOnce({
      ok: true,
      userId: "player-uuid",
      tokenHash: "hash-1",
    });

    const result = await call();

    expect(result).toMatchObject({ ok: true, tokenHash: "hash-1" });
  });

  it("verifies Turnstile before creating the account", async () => {
    mockVerifyTurnstile.mockResolvedValueOnce({
      ok: false,
      reason: "missing_token",
    });

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

  it("stamps onboarding_complete when the caller's wizard is fully done and both fields are present", async () => {
    // Regression for the redirect-loop bug: a minor who already supplied sport/grad
    // year on this single-step signup form must not be bounced back to /onboarding
    // and re-asked the same questions on their first /dashboard visit. Mirrors the
    // markOnboardingComplete fix already shipped for the invite-accept path.
    await call({
      graduationYear: 2028,
      primarySport: "Baseball",
      wizardComplete: true,
    });

    expect(mockPreferencesUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "player-uuid",
        category: "player",
        data: expect.objectContaining({
          graduation_year: 2028,
          primary_sport: "Baseball",
        }),
      }),
      expect.anything(),
    );
    expect(mockUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        phase_milestone_data: expect.objectContaining({
          onboarding_complete: true,
          onboarding_completed_at: expect.any(String),
        }),
      }),
    );
    expect(mockUserUpdateEq).toHaveBeenCalledWith("id", "player-uuid");
  });

  it("does not stamp onboarding_complete when grad year or sport is missing", async () => {
    // Incomplete data means /onboarding still has real work to do — an unconditional
    // stamp here would skip that step entirely instead of just closing the bug.
    await call({
      graduationYear: undefined,
      primarySport: undefined,
      wizardComplete: true,
    });

    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it("does not stamp onboarding_complete when wizardComplete is not sent, even with both fields present", async () => {
    // iOS already sends graduationYear + primarySport as onboarding-STEP-1 data
    // only — its own wizard still has a schools-carousel step after this. Without
    // an explicit wizardComplete: true, field presence alone must never trigger
    // the stamp, or every iOS minor signup would wrongly skip that step.
    await call({ graduationYear: 2028, primarySport: "Baseball" });

    expect(mockPreferencesUpsert).not.toHaveBeenCalled();
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it("does not stamp onboarding_complete when the player-preferences write fails", async () => {
    // Fail closed: middleware's sport-gate reads user_preferences directly, not
    // phase_milestone_data — stamping complete before (or despite) a failed prefs
    // write would pass the onboarding check while the sport-gate still finds
    // nothing, or would leave the flag permanently wrong with no further trigger
    // to fix it.
    mockPreferencesUpsert.mockResolvedValueOnce({ error: { message: "boom" } });

    await call({
      graduationYear: 2028,
      primarySport: "Baseball",
      wizardComplete: true,
    });

    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it("rejects a graduation year outside the canonical options", async () => {
    await expect(
      call({
        graduationYear: 1999,
        primarySport: "Baseball",
        wizardComplete: true,
      }),
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(mockCreateVerifiedAccount).not.toHaveBeenCalled();
  });

  it("rejects a non-integer graduation year", async () => {
    await expect(
      call({
        graduationYear: 2028.5,
        primarySport: "Baseball",
        wizardComplete: true,
      }),
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(mockCreateVerifiedAccount).not.toHaveBeenCalled();
  });

  it("rejects a whitespace-only primary sport", async () => {
    await expect(
      call({ graduationYear: 2028, primarySport: "   ", wizardComplete: true }),
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(mockCreateVerifiedAccount).not.toHaveBeenCalled();
  });

  it("trims the primary sport before persisting and stamping", async () => {
    await call({
      graduationYear: 2028,
      primarySport: "  Baseball  ",
      wizardComplete: true,
    });

    expect(mockPreferencesUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ primary_sport: "Baseball" }),
      }),
      expect.anything(),
    );
  });

  it("rejects a guardian email matching the player's own", async () => {
    // Otherwise the minor receives their own consent link and self-consents.
    await expect(
      call({ guardianEmail: "player@example.com" }),
    ).rejects.toMatchObject({ statusCode: 400 });
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

  it("accepts and normalizes player/guardian emails with surrounding whitespace", async () => {
    const result = await call({
      email: "  player@example.com  ",
      guardianEmail: " parent@example.com ",
    });

    expect(result).toMatchObject({ ok: true });
    expect(mockCreateVerifiedAccount).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ email: "player@example.com" }),
    );
    expect(mockClaimInsert).toHaveBeenCalledWith(
      expect.objectContaining({ guardian_email: "parent@example.com" }),
    );
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
