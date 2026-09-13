import { describe, it, expect, vi, beforeEach } from "vitest";

// Mutable test state — updated per test, read by mock factories at call time
const mockState = {
  userId: "player-user-id",
  userRole: "player" as string | null,
  existingFamily: null as object | null,
  existingMembership: null as object | null,
  // Set to simulate losing the create race: the insert below returns a 23505
  // conflict, and this is what the post-conflict re-select finds.
  raceWinnerFamily: null as object | null,
};

vi.mock("~/server/utils/auth", () => ({
  requireAuth: vi.fn(async () => ({ id: mockState.userId })),
  getUserRole: vi.fn(async () => mockState.userRole),
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
  generateFamilyCode: vi.fn().mockResolvedValue("FAM-TESTCODE"),
}));

vi.mock("~/server/utils/familyInboundToken", () => ({
  generateInboundToken: vi.fn().mockResolvedValue("abcd1234"),
}));

const familyUnitsInsertSpy = vi.fn();
// Module-level, not per-`.from()`-call scoped: real code calls
// `.from("family_units")` separately for the initial existing-family check, the
// insert, and (on a race) the post-conflict re-select — each is a fresh `from()`
// invocation, so a counter declared inside the closure would reset every time.
let familyUnitsSelectCallCount = 0;

vi.mock("~/server/utils/supabase", () => ({
  useSupabaseAdmin: vi.fn(() => ({
    from: (table: string) => {
      if (table === "family_units") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => {
                familyUnitsSelectCallCount += 1;
                // First call is the initial existing-family check; a second call
                // only happens on the race-recovery path after a 23505 conflict.
                const data =
                  familyUnitsSelectCallCount === 1
                    ? mockState.existingFamily
                    : mockState.raceWinnerFamily;
                return Promise.resolve({ data, error: null });
              },
            }),
          }),
          insert: (payload: object) => {
            familyUnitsInsertSpy(payload);
            return {
              select: () => ({
                single: () =>
                  mockState.raceWinnerFamily
                    ? Promise.resolve({
                        data: null,
                        error: { code: "23505", message: "duplicate key value" },
                      })
                    : Promise.resolve({
                        data: {
                          id: "family-123",
                          family_code: "FAM-TESTCODE",
                          family_name: "My Family",
                        },
                        error: null,
                      }),
              }),
            };
          },
          delete: () => ({ eq: () => Promise.resolve({ error: null }) }),
        };
      }
      if (table === "family_members") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({
                  data: mockState.existingMembership,
                  error: null,
                }),
            }),
          }),
          insert: () => Promise.resolve({ error: null }),
        };
      }
      if (table === "family_code_usage_log") {
        const builder = Object.assign(
          Promise.resolve({ data: null, error: null }),
          { catch: vi.fn() },
        );
        return { insert: vi.fn().mockReturnValue(builder) };
      }
      return {};
    },
  })),
}));

vi.mock("h3", async (importOriginal) => {
  const actual = await importOriginal<typeof import("h3")>();
  return {
    ...actual,
    defineEventHandler: (fn: Function) => fn,
    createError: (config: {
      statusCode: number;
      message?: string;
      statusMessage?: string;
    }) => {
      const err = new Error(config.message ?? config.statusMessage) as Error & {
        statusCode: number;
      };
      err.statusCode = config.statusCode;
      return err;
    },
  };
});

// Import handler once — mocks are established above
const { default: handler } = await import("~/server/api/family/create.post");

describe("POST /api/family/create — symmetric", () => {
  beforeEach(() => {
    mockState.userId = "player-user-id";
    mockState.userRole = "player";
    mockState.existingFamily = null;
    mockState.existingMembership = null;
    mockState.raceWinnerFamily = null;
    familyUnitsInsertSpy.mockClear();
    familyUnitsSelectCallCount = 0;
  });

  it("sets inbound_token on insert — DB column is NOT NULL, omitting it 500s in prod", async () => {
    await handler({} as Parameters<typeof handler>[0]);

    expect(familyUnitsInsertSpy).toHaveBeenCalledWith(
      expect.objectContaining({ inbound_token: "abcd1234" }),
    );
  });

  it("allows a player to create a family unit", async () => {
    const result = await handler({} as Parameters<typeof handler>[0]);
    expect(result).toMatchObject({
      success: true,
      familyCode: "FAM-TESTCODE",
      familyId: "family-123",
    });
  });

  it("allows a parent to create a family unit", async () => {
    mockState.userId = "parent-user-id";
    mockState.userRole = "parent";

    const result = await handler({} as Parameters<typeof handler>[0]);
    expect(result).toMatchObject({ success: true, familyCode: "FAM-TESTCODE" });
  });

  it("returns existing family if one already exists", async () => {
    mockState.existingFamily = {
      id: "existing-family",
      family_code: "FAM-EXISTING",
      family_name: "My Family",
    };

    const result = await handler({} as Parameters<typeof handler>[0]);
    expect(result).toMatchObject({
      success: true,
      familyId: "existing-family",
      message: "Family already exists",
    });
  });

  it("returns the invited family instead of creating a duplicate when a player is already a family_members row (not the creator) — repro for idx_player_one_family 500", async () => {
    mockState.existingMembership = {
      family_units: {
        id: "invited-family",
        family_code: "FAM-INVITED",
        family_name: "The Invite Family",
      },
    };

    const result = await handler({} as Parameters<typeof handler>[0]);

    expect(result).toMatchObject({
      success: true,
      familyId: "invited-family",
      familyCode: "FAM-INVITED",
      message: "Family already exists",
    });
    expect(familyUnitsInsertSpy).not.toHaveBeenCalled();
  });

  it("reuses the winner's family when the create INSERT loses a concurrent race (23505)", async () => {
    // The initial existing-family SELECT found nothing (a genuine race — a
    // concurrent caller, e.g. plugins/auth.client.ts's SIGNED_IN listener, hadn't
    // committed its own INSERT yet), so this caller's own INSERT hits
    // idx_family_units_one_per_creator and gets back a 23505 conflict instead of a
    // silent duplicate family.
    mockState.raceWinnerFamily = {
      id: "race-winner-family",
      family_code: "FAM-WINNER",
      family_name: "My Family",
    };

    const result = await handler({} as Parameters<typeof handler>[0]);

    expect(result).toMatchObject({
      success: true,
      familyId: "race-winner-family",
      familyCode: "FAM-WINNER",
      message: "Family already exists",
    });
  });
});
