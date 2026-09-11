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

  it("writes the claim before the users row", async () => {
    // Ordering is load-bearing, not incidental: trg_enforce_minor_requires_invite is a
    // BEFORE INSERT trigger on users that rejects an under-18 player with no guardian
    // link, so a users-first sequence would fail every minor signup.
    const order: string[] = [];
    mockClaimInsert.mockImplementation(async () => {
      order.push("claim");
      return { error: null };
    });
    mockUserUpsert.mockImplementation(async () => {
      order.push("user");
      return { error: null };
    });

    await call();

    expect(order).toEqual(["claim", "user"]);
  });

  it("omits date_of_birth from signUp metadata", async () => {
    // handle_new_user() creates the public.users row from this metadata the instant the
    // auth user exists — before the guardian_claims row can (its FK needs the auth user).
    // A DOB here would make enforce_minor_requires_invite reject that insert, and
    // handle_new_user swallows the exception, leaving an auth account with no profile and
    // no error anywhere the user can see. The DOB must arrive in the later upsert instead.
    await call();

    const metadata = mockSignUp.mock.calls[0]?.[0]?.options?.data ?? {};
    expect(metadata).not.toHaveProperty("date_of_birth");
    expect(mockUserUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ date_of_birth: expect.any(String) }),
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

  it("rejects a missing guardian email", async () => {
    await expect(call({ guardianEmail: "" })).rejects.toMatchObject({
      statusCode: 400,
    });
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it("still succeeds when the guardian email fails to send", async () => {
    // The account exists and the claim is live; the player can resend from the banner.
    mockSendGuardianClaimEmail.mockResolvedValue({ success: false });

    const result = await call();

    expect(result).toMatchObject({ ok: true, guardianEmailSent: false });
  });

  it("fails the request when the claim cannot be created", async () => {
    // Without a claim the users insert would be rejected by the trigger anyway; failing
    // here keeps the error legible instead of surfacing a raw constraint violation.
    mockClaimInsert.mockResolvedValue({ error: { message: "boom" } });

    await expect(call()).rejects.toMatchObject({ statusCode: 500 });
    expect(mockUserUpsert).not.toHaveBeenCalled();
  });
});
