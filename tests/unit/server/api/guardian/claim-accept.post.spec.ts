import { describe, it, expect, vi, beforeEach } from "vitest";
import { createError } from "h3";

const future = () => new Date(Date.now() + 86_400_000).toISOString();
const past = () => new Date(Date.now() - 86_400_000).toISOString();

const state = {
  claim: null as Record<string, unknown> | null,
  guardian: { id: "guardian-1", email: "parent@example.com" },
  // Truthy by default so most tests don't need to touch the family-creation
  // branch at all. Set to null to exercise it (see the dedicated tests below).
  guardianMembership: { family_unit_id: "fam-1" } as
    | { family_unit_id: string }
    | null,
  // The common guardian-optional-signup case: null by default (player has no family
  // yet in most existing tests, matching pre-existing coverage). Dedicated tests below
  // set this to reproduce the real bug found live on QA (player already self-provisioned
  // into their own solo family before the guardian ever claims them).
  playerMembership: null as { id: string; family_unit_id: string } | null,
  // Only consulted when neither membership above resolves a family (family-creation
  // branch).
  familyUnitsInsertError: null as { code: string; message: string } | null,
  raceWinnerFamilyId: null as string | null,
};

const mockClaimUpdate = vi.fn(async () => ({ error: null }));
const mockUserUpdate = vi.fn(async () => ({ error: null }));
const mockMemberInsert = vi.fn(
  async (_payload: Record<string, unknown>) =>
    ({ error: null }) as { error: { code: string; message: string } | null },
);
const mockMemberUpdate = vi.fn(async () => ({ error: null }));
const mockFamilyUnitsInsert = vi.fn();

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
      select: () => {
        const filters: Record<string, unknown> = {};
        const builder = {
          eq: (col: string, val: unknown) => {
            filters[col] = val;
            return builder;
          },
          maybeSingle: async () => {
            if (filters.role === "player") {
              return { data: state.playerMembership };
            }
            if (filters.user_id === state.guardian.id) {
              return { data: state.guardianMembership };
            }
            return { data: null };
          },
        };
        return builder;
      },
      insert: (v: unknown) =>
        mockMemberInsert(v as Record<string, unknown>),
      update: (v: unknown) => ({ eq: () => mockMemberUpdate(v as never) }),
    };
  }
  if (name === "family_units") {
    return {
      insert: (payload: unknown) => {
        mockFamilyUnitsInsert(payload);
        return {
          select: () => ({
            single: async () =>
              state.familyUnitsInsertError
                ? { data: null, error: state.familyUnitsInsertError }
                : { data: { id: "new-family-1" }, error: null },
          }),
        };
      },
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: state.raceWinnerFamilyId
              ? { id: state.raceWinnerFamilyId }
              : null,
          }),
        }),
      }),
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
    mockMemberUpdate.mockResolvedValue({ error: null });
    mockFamilyUnitsInsert.mockClear();
    state.guardianMembership = { family_unit_id: "fam-1" };
    state.playerMembership = null;
    state.familyUnitsInsertError = null;
    state.raceWinnerFamilyId = null;
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

  it("creates a new family and adds the guardian to it when they have none yet", async () => {
    state.guardianMembership = null;

    const result = await handler({} as never);

    expect(result).toMatchObject({ success: true, familyUnitId: "new-family-1" });
    expect(mockFamilyUnitsInsert).toHaveBeenCalledWith(
      expect.objectContaining({ created_by_user_id: "guardian-1" }),
    );
    expect(mockMemberInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        family_unit_id: "new-family-1",
        user_id: "guardian-1",
        role: "parent",
      }),
    );
  });

  it("reuses the winner's family when the create INSERT loses a concurrent race (23505)", async () => {
    // A guardian's own signup fires plugins/auth.client.ts's SIGNED_IN listener
    // (calls /api/family/create) at the same moment this endpoint runs its own
    // family-creation branch. idx_family_units_one_per_creator turns whichever
    // INSERT loses into a 23505 conflict instead of a silent duplicate family —
    // this reproduces that exact race, found live on QA.
    state.guardianMembership = null;
    state.familyUnitsInsertError = { code: "23505", message: "duplicate key value" };
    state.raceWinnerFamilyId = "race-winner-family";
    // The winning /api/family/create call already added the guardian to
    // family_members as part of creating the family -- our own attempt to add
    // them again hits the same unique constraint.
    mockMemberInsert.mockImplementation(
      async (payload: Record<string, unknown>) =>
        payload.user_id === "guardian-1"
          ? { error: { code: "23505", message: "duplicate key value" } }
          : { error: null },
    );

    const result = await handler({} as never);

    expect(result).toMatchObject({
      success: true,
      familyUnitId: "race-winner-family",
    });
    expect(mockMemberInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "player-1",
        family_unit_id: "race-winner-family",
      }),
    );
  });

  it("reuses the player's existing solo family when the guardian has none yet", async () => {
    // Found live on QA: guardian-optional signup means the player already
    // self-provisioned into their own single-member family (via
    // /api/family/create's SIGNED_IN listener) by the time the guardian confirms.
    // The old code always tried to INSERT the player into a family, which violated
    // idx_player_one_family (unique on user_id where role='player') and surfaced
    // as "Could not connect your athlete" on every first-time claim.
    state.guardianMembership = null;
    state.playerMembership = { id: "player-member-1", family_unit_id: "player-fam" };

    const result = await handler({} as never);

    expect(result).toMatchObject({ success: true, familyUnitId: "player-fam" });
    // No new family created -- the player's existing one won.
    expect(mockFamilyUnitsInsert).not.toHaveBeenCalled();
    // Player already belongs to player-fam: no insert, no move.
    expect(mockMemberInsert).not.toHaveBeenCalledWith(
      expect.objectContaining({ user_id: "player-1" }),
    );
    expect(mockMemberUpdate).not.toHaveBeenCalled();
    // Guardian gets added to the player's family.
    expect(mockMemberInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        family_unit_id: "player-fam",
        user_id: "guardian-1",
        role: "parent",
      }),
    );
  });

  it("moves the player into the guardian's existing family for a second child", async () => {
    // Guardian already has a family (an older sibling). This player self-provisioned
    // their own solo family on signup same as any guardian-optional signup -- move them
    // into the guardian's family rather than fail on idx_player_one_family.
    state.guardianMembership = { family_unit_id: "fam-1" };
    state.playerMembership = { id: "player-member-1", family_unit_id: "player-fam" };

    const result = await handler({} as never);

    expect(result).toMatchObject({ success: true, familyUnitId: "fam-1" });
    // Guardian already belongs to fam-1: no insert needed.
    expect(mockMemberInsert).not.toHaveBeenCalledWith(
      expect.objectContaining({ user_id: "guardian-1" }),
    );
    // Player's row gets moved (UPDATE), not duplicated (INSERT).
    expect(mockMemberInsert).not.toHaveBeenCalledWith(
      expect.objectContaining({ user_id: "player-1" }),
    );
    expect(mockMemberUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ family_unit_id: "fam-1" }),
    );
  });
});
