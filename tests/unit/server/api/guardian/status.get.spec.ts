import { describe, it, expect, vi, beforeEach } from "vitest";

const mockUserRow: {
  value: {
    role: string;
    date_of_birth: string | null;
    guardian_consent_at: string | null;
  } | null;
} = { value: null };
const mockClaimRow: {
  value: { guardian_email: string; status: string; expires_at: string } | null;
} = { value: null };
const mockFamilyMembership: { value: { family_unit_id: string } | null } = {
  value: null,
};
const mockFamilyHasParent: { value: boolean } = { value: false };
const mockClaimError: { value: object | null } = { value: null };

vi.mock("~/server/utils/auth", () => ({
  requireAuth: vi.fn(async () => ({ id: "player-1", email: "p@example.com" })),
}));

vi.mock("~/server/utils/logger", () => ({
  useLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}));

vi.mock("~/server/utils/requestToken", () => ({
  extractRequestToken: vi.fn(() => "fake-token"),
}));

vi.mock("~/server/utils/supabase", () => ({
  createServerSupabaseUserClient: vi.fn(() => ({
    from: (table: string) => {
      if (table === "users") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: mockUserRow.value }),
            }),
          }),
        };
      }
      if (table === "family_members") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: mockFamilyMembership.value }),
              eq: () => ({
                limit: () => ({
                  maybeSingle: async () => ({
                    data: mockFamilyHasParent.value
                      ? { user_id: "some-parent" }
                      : null,
                  }),
                }),
              }),
            }),
          }),
        };
      }
      // guardian_claims
      return {
        select: () => ({
          eq: () => ({
            order: () => ({
              limit: () => ({
                maybeSingle: async () => ({
                  data: mockClaimRow.value,
                  error: mockClaimError.value,
                }),
              }),
            }),
          }),
        }),
      };
    },
  })),
}));

import statusHandler from "~/server/api/guardian/status.get";

const fakeEvent = {} as Parameters<typeof statusHandler>[0];

describe("GET /api/guardian/status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserRow.value = null;
    mockClaimRow.value = null;
    mockFamilyMembership.value = null;
    mockFamilyHasParent.value = false;
    mockClaimError.value = null;
  });

  it("returns status 'none', locked:true, pending:true (mirrors locked) for a 13-17 player who never named a guardian", async () => {
    mockUserRow.value = {
      role: "player",
      date_of_birth: "2012-01-01",
      guardian_consent_at: null,
    };
    mockClaimRow.value = null;

    const result = await statusHandler(fakeEvent);

    expect(result).toEqual({
      locked: true,
      pending: true,
      claimOutstanding: false,
      guardianEmailMasked: null,
      expiresAt: null,
      status: "none",
    });
  });

  it("returns status 'pending', locked:true, pending:true, claimOutstanding:true for an outstanding unexpired claim", async () => {
    mockUserRow.value = {
      role: "player",
      date_of_birth: "2012-01-01",
      guardian_consent_at: null,
    };
    mockClaimRow.value = {
      guardian_email: "parent@example.com",
      status: "pending",
      expires_at: "2026-11-01T00:00:00.000Z",
    };

    const result = await statusHandler(fakeEvent);

    expect(result.status).toBe("pending");
    expect(result.locked).toBe(true);
    expect(result.pending).toBe(true);
    expect(result.claimOutstanding).toBe(true);
    expect(result.guardianEmailMasked).toBe("p****@example.com");
  });

  it("keeps pending mirroring locked for an already-expired claim — nothing outstanding to wait on", async () => {
    mockUserRow.value = {
      role: "player",
      date_of_birth: "2012-01-01",
      guardian_consent_at: null,
    };
    mockClaimRow.value = {
      guardian_email: "parent@example.com",
      status: "expired",
      expires_at: "2026-01-01T00:00:00.000Z",
    };

    const result = await statusHandler(fakeEvent);

    expect(result.status).toBe("expired");
    expect(result.locked).toBe(true);
    expect(result.pending).toBe(true);
    expect(result.claimOutstanding).toBe(false);
  });

  it("treats a stored 'pending' claim with an elapsed expires_at as effectively expired", async () => {
    mockUserRow.value = {
      role: "player",
      date_of_birth: "2012-01-01",
      guardian_consent_at: null,
    };
    mockClaimRow.value = {
      guardian_email: "parent@example.com",
      status: "pending",
      expires_at: "2020-01-01T00:00:00.000Z",
    };

    const result = await statusHandler(fakeEvent);

    expect(result.status).toBe("expired");
    expect(result.locked).toBe(true);
    expect(result.pending).toBe(true);
    expect(result.claimOutstanding).toBe(false);
  });

  it("keeps pending mirroring locked for a family-membership override with a still-outstanding claim", async () => {
    mockUserRow.value = {
      role: "player",
      date_of_birth: "2012-01-01",
      guardian_consent_at: null,
    };
    mockClaimRow.value = {
      guardian_email: "parent@example.com",
      status: "pending",
      expires_at: "2026-11-01T00:00:00.000Z",
    };
    mockFamilyMembership.value = { family_unit_id: "family-1" };
    mockFamilyHasParent.value = true;

    const result = await statusHandler(fakeEvent);

    expect(result.locked).toBe(false);
    expect(result.pending).toBe(false);
    expect(result.claimOutstanding).toBe(true);
  });

  it("returns locked:false, pending:false once guardian_consent_at is stamped, even with a stale claim row", async () => {
    mockUserRow.value = {
      role: "player",
      date_of_birth: "2012-01-01",
      guardian_consent_at: "2026-09-05T00:00:00.000Z",
    };
    mockClaimRow.value = {
      guardian_email: "parent@example.com",
      status: "claimed",
      expires_at: "2026-11-01T00:00:00.000Z",
    };

    const result = await statusHandler(fakeEvent);

    expect(result.locked).toBe(false);
    expect(result.pending).toBe(false);
    expect(result.claimOutstanding).toBe(false);
    expect(result.status).toBe("claimed");
  });

  it("returns locked:false for an adult player with no claim", async () => {
    mockUserRow.value = {
      role: "player",
      date_of_birth: "2000-01-01",
      guardian_consent_at: null,
    };

    const result = await statusHandler(fakeEvent);

    expect(result.locked).toBe(false);
    expect(result.status).toBe("none");
  });

  it("returns locked:false for a minor already in a family with a parent, even with no consent stamped", async () => {
    mockUserRow.value = {
      role: "player",
      date_of_birth: "2012-01-01",
      guardian_consent_at: null,
    };
    mockFamilyMembership.value = { family_unit_id: "family-1" };
    mockFamilyHasParent.value = true;

    const result = await statusHandler(fakeEvent);

    expect(result.locked).toBe(false);
    // Presentation-only status is untouched by the override — no claim exists here,
    // so it's still "none"; the banner text is display-only, `locked` is authoritative.
    expect(result.status).toBe("none");
  });

  it("500s instead of reporting 'no claim' when the guardian_claims query itself errors (PR #963)", async () => {
    // A permission/RLS failure must not be silently read as an absent
    // claim — that would mask a real pending/expired/claimed guardian
    // claim from the player.
    mockUserRow.value = {
      role: "player",
      date_of_birth: "2012-01-01",
      guardian_consent_at: null,
    };
    mockClaimError.value = {
      message: "permission denied for table guardian_claims",
    };

    await expect(statusHandler(fakeEvent)).rejects.toMatchObject({
      statusCode: 500,
    });
  });
});
