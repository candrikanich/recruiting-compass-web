import { describe, it, expect, vi, beforeEach } from "vitest";

const mockUserRow: {
  value: { role: string; date_of_birth: string | null; guardian_consent_at: string | null } | null;
} = { value: null };
const mockClaimRow: {
  value: { guardian_email: string; status: string; expires_at: string } | null;
} = { value: null };
const mockFamilyMembership: { value: { family_unit_id: string } | null } = { value: null };
const mockFamilyHasParent: { value: boolean } = { value: false };

vi.mock("~/server/utils/auth", () => ({
  requireAuth: vi.fn(async () => ({ id: "player-1", email: "p@example.com" })),
}));

vi.mock("~/server/utils/logger", () => ({
  useLogger: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() }),
}));

vi.mock("~/server/utils/supabase", () => ({
  useSupabaseAdmin: vi.fn(() => ({
    from: (table: string) => {
      if (table === "users") {
        return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: mockUserRow.value }) }) }) };
      }
      if (table === "family_members") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: mockFamilyMembership.value }),
              eq: () => ({
                limit: () => ({
                  maybeSingle: async () => ({
                    data: mockFamilyHasParent.value ? { user_id: "some-parent" } : null,
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
              limit: () => ({ maybeSingle: async () => ({ data: mockClaimRow.value }) }),
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
  });

  it("returns status 'none', locked:true, pending:false for a 13-17 player who never named a guardian (no claim outstanding)", async () => {
    mockUserRow.value = { role: "player", date_of_birth: "2012-01-01", guardian_consent_at: null };
    mockClaimRow.value = null;

    const result = await statusHandler(fakeEvent);

    expect(result).toEqual({
      locked: true,
      pending: false,
      guardianEmailMasked: null,
      expiresAt: null,
      status: "none",
    });
  });

  it("returns status 'pending', locked:true, pending:true for an outstanding claim", async () => {
    mockUserRow.value = { role: "player", date_of_birth: "2012-01-01", guardian_consent_at: null };
    mockClaimRow.value = {
      guardian_email: "parent@example.com",
      status: "pending",
      expires_at: "2026-11-01T00:00:00.000Z",
    };

    const result = await statusHandler(fakeEvent);

    expect(result.status).toBe("pending");
    expect(result.locked).toBe(true);
    expect(result.pending).toBe(true);
    expect(result.guardianEmailMasked).toBe("p****@example.com");
  });

  it("decouples pending from locked for an expired claim — still locked, but nothing is outstanding", async () => {
    mockUserRow.value = { role: "player", date_of_birth: "2012-01-01", guardian_consent_at: null };
    mockClaimRow.value = {
      guardian_email: "parent@example.com",
      status: "expired",
      expires_at: "2026-01-01T00:00:00.000Z",
    };

    const result = await statusHandler(fakeEvent);

    expect(result.status).toBe("expired");
    expect(result.locked).toBe(true);
    expect(result.pending).toBe(false);
  });

  it("decouples pending from locked for a family-membership override with a still-outstanding claim", async () => {
    mockUserRow.value = { role: "player", date_of_birth: "2012-01-01", guardian_consent_at: null };
    mockClaimRow.value = {
      guardian_email: "parent@example.com",
      status: "pending",
      expires_at: "2026-11-01T00:00:00.000Z",
    };
    mockFamilyMembership.value = { family_unit_id: "family-1" };
    mockFamilyHasParent.value = true;

    const result = await statusHandler(fakeEvent);

    expect(result.locked).toBe(false);
    expect(result.pending).toBe(true);
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
    expect(result.status).toBe("claimed");
  });

  it("returns locked:false for an adult player with no claim", async () => {
    mockUserRow.value = { role: "player", date_of_birth: "2000-01-01", guardian_consent_at: null };

    const result = await statusHandler(fakeEvent);

    expect(result.locked).toBe(false);
    expect(result.status).toBe("none");
  });

  it("returns locked:false for a minor already in a family with a parent, even with no consent stamped", async () => {
    mockUserRow.value = { role: "player", date_of_birth: "2012-01-01", guardian_consent_at: null };
    mockFamilyMembership.value = { family_unit_id: "family-1" };
    mockFamilyHasParent.value = true;

    const result = await statusHandler(fakeEvent);

    expect(result.locked).toBe(false);
    // Presentation-only status is untouched by the override — no claim exists here,
    // so it's still "none"; the banner text is display-only, `locked` is authoritative.
    expect(result.status).toBe("none");
  });
});
