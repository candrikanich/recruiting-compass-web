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

interface SignUpArgs {
  email: string;
  password: string;
  options?: { captchaToken?: string; data?: Record<string, unknown> };
}

const mockSignUp = vi.fn(async (_args: SignUpArgs) => ({
  data: { user: { id: "player-uuid" } },
  error: null as { message: string } | null,
}));
const mockClaimInsert = vi.fn(async () => ({ error: null }));
const mockUserUpsert = vi.fn(async () => ({ error: null }));
const mockSendGuardianClaimEmail = vi.fn(async () => ({ success: true }));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({ auth: { signUp: mockSignUp } })),
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
    process.env.NUXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
    mockSignUp.mockResolvedValue({
      data: { user: { id: "player-uuid" } },
      error: null,
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

  it("reports emailConfirmed:false when signUp() returns no session (confirmation required)", async () => {
    // Default mockSignUp shape: no `session` key, matching a real environment
    // where email confirmation is required and Supabase withholds the session.
    const result = await call();

    expect(result).toMatchObject({ emailConfirmed: false });
  });

  it("reports emailConfirmed:true when signUp() returns a session (confirmation off)", async () => {
    // Found live on QA: environments with email confirmation disabled confirm the
    // account immediately and return a session from signUp() -- the client used to
    // always route to /verify-email regardless, a dead end with no email ever sent.
    mockSignUp.mockResolvedValueOnce({
      data: { user: { id: "player-uuid" }, session: { access_token: "tok" } },
      error: null,
    });

    const result = await call();

    expect(result).toMatchObject({ emailConfirmed: true });
  });

  it("puts the real date_of_birth in signUp metadata, so handle_new_user() writes it atomically", async () => {
    // A null-DOB row must never exist even momentarily: requiresGuardianInvite(null) is
    // false, so a row with no DOB reads as unlocked. Putting the exact DOB in signUp
    // metadata (not just the later upsert) closes that fail-open window.
    const dob = yearsAgo(15);
    await call({ dateOfBirth: dob });

    const metadata = mockSignUp.mock.calls[0]?.[0]?.options?.data ?? {};
    expect(metadata).toMatchObject({ date_of_birth: dob });
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
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it("rejects an under-13 player", async () => {
    await expect(call({ dateOfBirth: yearsAgo(11) })).rejects.toMatchObject({
      statusCode: 400,
    });
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it("rejects an 18+ player, who belongs on the ordinary signup route", async () => {
    await expect(call({ dateOfBirth: yearsAgo(19) })).rejects.toMatchObject({
      statusCode: 400,
    });
    expect(mockSignUp).not.toHaveBeenCalled();
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
    expect(mockSignUp).toHaveBeenCalled();
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
});
