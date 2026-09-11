import { describe, it, expect, vi, beforeEach } from "vitest";
import { createError } from "h3";

const future = () => new Date(Date.now() + 86_400_000).toISOString();
const past = () => new Date(Date.now() - 86_400_000).toISOString();

const state = {
  claim: null as Record<string, unknown> | null,
  guardian: { id: "guardian-1", email: "parent@example.com" },
};

const mockClaimUpdate = vi.fn(async () => ({ error: null }));
const mockUserUpdate = vi.fn(async () => ({ error: null }));
const mockMemberInsert = vi.fn(async () => ({ error: null }));

const table = (name: string) => {
  if (name === "guardian_claims") {
    return {
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: state.claim }) }),
      }),
      update: (v: unknown) => ({ eq: () => mockClaimUpdate(v as never) }),
    };
  }
  if (name === "family_members") {
    return {
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: { family_unit_id: "fam-1" } }),
        }),
      }),
      insert: (v: unknown) => mockMemberInsert(v as never),
    };
  }
  if (name === "users") {
    return { update: (v: unknown) => ({ eq: () => mockUserUpdate(v as never) }) };
  }
  return {};
};

vi.mock("~/server/utils/supabase", () => ({
  useSupabaseAdmin: vi.fn(() => ({ from: (n: string) => table(n) })),
}));
vi.mock("~/server/utils/auth", () => ({
  requireAuth: vi.fn(async () => state.guardian),
}));
vi.mock("~/server/utils/logger", () => ({
  useLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}));
vi.mock("~/server/utils/familyCode", () => ({
  generateFamilyCode: vi.fn(async () => "ABC123"),
}));
vi.mock("~/server/utils/familyInboundToken", () => ({
  generateInboundToken: vi.fn(async () => "inbound"),
}));
vi.mock("h3", async (importOriginal) => {
  const actual = await importOriginal<typeof import("h3")>();
  return {
    ...actual,
    defineEventHandler: (fn: Function) => fn,
    getRouterParam: vi.fn(() => "tok-1"),
  };
});
vi.stubGlobal("defineEventHandler", (fn: Function) => fn);
vi.stubGlobal("createError", createError);

const { default: handler } = await import(
  "~/server/api/guardian/claim/[token]/accept.post"
);

describe("POST /api/guardian/claim/[token]/accept", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.guardian = { id: "guardian-1", email: "parent@example.com" };
    state.claim = {
      id: "claim-1",
      player_user_id: "player-1",
      guardian_email: "parent@example.com",
      status: "pending",
      expires_at: future(),
    };
    mockClaimUpdate.mockResolvedValue({ error: null });
    mockUserUpdate.mockResolvedValue({ error: null });
    mockMemberInsert.mockResolvedValue({ error: null });
  });

  it("stamps guardian consent and closes the claim", async () => {
    const result = await handler({} as never);

    expect(result).toMatchObject({ success: true });
    expect(mockUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        guardian_consent_by: "guardian-1",
        guardian_consent_at: expect.any(String),
        guardian_consent_terms_version: expect.any(String),
      }),
    );
    expect(mockClaimUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: "claimed" }),
    );
  });

  it("adds the player to the family before stamping consent", async () => {
    // family_members is the expiry-proof link the DB gate accepts. Establishing it first
    // means the consent UPDATE can't be rejected once the claim stops counting.
    const order: string[] = [];
    mockMemberInsert.mockImplementation(async () => {
      order.push("member");
      return { error: null };
    });
    mockUserUpdate.mockImplementation(async () => {
      order.push("consent");
      return { error: null };
    });

    await handler({} as never);

    expect(order).toEqual(["member", "consent"]);
  });

  it("rejects a guardian whose email doesn't match the claim", async () => {
    // Otherwise a forwarded link lets any account consent on a minor's behalf.
    state.guardian = { id: "stranger-1", email: "stranger@example.com" };

    await expect(handler({} as never)).rejects.toMatchObject({
      statusCode: 403,
    });
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it("rejects an already-claimed link", async () => {
    state.claim = { ...state.claim!, status: "claimed" };

    await expect(handler({} as never)).rejects.toMatchObject({
      statusCode: 409,
    });
  });

  it("rejects an expired link", async () => {
    state.claim = { ...state.claim!, expires_at: past() };

    await expect(handler({} as never)).rejects.toMatchObject({
      statusCode: 410,
    });
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it("fails loudly when consent cannot be recorded", async () => {
    // The consent row is the proof the account was ever allowed to exist; a silent failure
    // would leave a confirmed player with nothing on file.
    mockUserUpdate.mockResolvedValue({ error: { message: "boom" } });

    await expect(handler({} as never)).rejects.toMatchObject({
      statusCode: 500,
    });
    expect(mockClaimUpdate).not.toHaveBeenCalled();
  });
});
