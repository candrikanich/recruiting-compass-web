import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock state holders
let mockExistingClaim: { value: unknown } = { value: null };
let mockInsertError: unknown = null;
let mockBody: Record<string, unknown> = {};
// Locked 13-17 player with no consent by default — the only caller shape allowed
// to create a fresh claim from the no-existing-claim branch.
let mockUserRow: { value: unknown } = {
  value: {
    role: "player",
    date_of_birth: "2012-01-01",
    guardian_consent_at: null,
    full_name: "Player One",
  },
};

let mockFamilyMembership: { value: { family_unit_id: string } | null } = { value: null };
let mockFamilyHasParent: { value: boolean } = { value: false };

const mockInsert = vi.fn(async () => ({ error: mockInsertError }));

// All vi.mock calls first
vi.mock("~/server/utils/auth", () => ({
  requireAuth: vi.fn(async () => ({ id: "player-1", email: "player@example.com" })),
}));

vi.mock("~/server/utils/logger", () => ({
  useLogger: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() }),
}));

vi.mock("~/server/utils/rateLimit", () => ({
  rateLimitByUser: vi.fn(async () => ({ success: true })),
  throwIfRateLimited: vi.fn(),
}));

vi.mock("~/server/utils/emailService", () => ({
  sendGuardianClaimEmail: vi.fn(async () => ({ success: true })),
}));

vi.mock("~/server/utils/supabase", () => ({
  useSupabaseAdmin: vi.fn(() => ({
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
        // No family membership by default — resolveGuardianLock's override only
        // matters for the dedicated eligibility test below.
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
            eq: () => ({
              maybeSingle: async () => ({ data: mockExistingClaim.value }),
            }),
          }),
        }),
        insert: mockInsert,
        update: () => ({ eq: async () => ({ error: null }) }),
      };
    },
  })),
}));

vi.mock("h3", async () => {
  const actual = await vi.importActual<typeof import("h3")>("h3");
  return {
    ...actual,
    readBody: vi.fn(async () => mockBody),
  };
});

import handler from "~/server/api/guardian/resend.post";

const fakeEvent = {} as Parameters<typeof handler>[0];

describe("POST /api/guardian/resend — no existing claim", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExistingClaim = { value: null };
    mockInsertError = null;
    mockBody = {};
    mockFamilyMembership = { value: null };
    mockFamilyHasParent = { value: false };
    mockUserRow = {
      value: {
        role: "player",
        date_of_birth: "2012-01-01",
        guardian_consent_at: null,
        full_name: "Player One",
      },
    };
  });

  it("creates a fresh claim when no claim exists and an email is provided", async () => {
    mockBody = { guardianEmail: "newparent@example.com" };

    const result = await handler(fakeEvent);

    expect(result).toEqual({ success: true });
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        player_user_id: "player-1",
        guardian_email: "newparent@example.com",
      }),
    );
  });

  it("rejects when no claim exists and no email is provided", async () => {
    mockBody = {};

    await expect(handler(fakeEvent)).rejects.toMatchObject({ statusCode: 400 });
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("rejects a guardian email equal to the player's own", async () => {
    mockBody = { guardianEmail: "player@example.com" };

    await expect(handler(fakeEvent)).rejects.toMatchObject({ statusCode: 400 });
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("uses the player's full_name in the email rather than the email-address prefix", async () => {
    mockBody = { guardianEmail: "newparent@example.com" };

    await handler(fakeEvent);

    const { sendGuardianClaimEmail } = await import("~/server/utils/emailService");
    expect(sendGuardianClaimEmail).toHaveBeenCalledWith(
      expect.objectContaining({ playerName: "Player One" }),
    );
  });

  it("rejects an adult with no pending claim, even with an email provided", async () => {
    mockUserRow = {
      value: { role: "player", date_of_birth: "2000-01-01", guardian_consent_at: null, full_name: "Adult Player" },
    };
    mockBody = { guardianEmail: "newparent@example.com" };

    await expect(handler(fakeEvent)).rejects.toMatchObject({ statusCode: 403 });
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("rejects a parent caller with no pending claim", async () => {
    mockUserRow = {
      value: { role: "parent", date_of_birth: null, guardian_consent_at: null, full_name: "A Parent" },
    };
    mockBody = { guardianEmail: "newparent@example.com" };

    await expect(handler(fakeEvent)).rejects.toMatchObject({ statusCode: 403 });
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("rejects an already-consented 13-17 player with no pending claim", async () => {
    mockUserRow = {
      value: {
        role: "player",
        date_of_birth: "2012-01-01",
        guardian_consent_at: "2026-09-01T00:00:00.000Z",
        full_name: "Consented Player",
      },
    };
    mockBody = { guardianEmail: "newparent@example.com" };

    await expect(handler(fakeEvent)).rejects.toMatchObject({ statusCode: 403 });
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("rejects a locked player who already belongs to a family with a parent", async () => {
    // A real guardian is already present via family membership even though
    // guardian_consent_at was never stamped — the same override
    // assertGuardianConfirmed honors, so this endpoint can't be used to spam an
    // arbitrary address for a player who already has a parent in their family.
    mockFamilyMembership = { value: { family_unit_id: "family-1" } };
    mockFamilyHasParent = { value: true };
    mockBody = { guardianEmail: "newparent@example.com" };

    await expect(handler(fakeEvent)).rejects.toMatchObject({ statusCode: 403 });
    expect(mockInsert).not.toHaveBeenCalled();
  });
});
