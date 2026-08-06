import { describe, it, expect, vi, beforeEach } from "vitest";

const mockState = {
  userId: "parent-user-id",
  familyMembers: [] as { family_unit_id: string }[],
  playerMembers: [] as {
    family_unit_id: string;
    user_id: string;
    users: {
      id: string;
      full_name: string | null;
      email: string | null;
      graduation_year: number | null;
    };
  }[],
  familyUnits: [] as { id: string; family_name: string }[],
};

vi.mock("~/server/utils/auth", () => ({
  requireAuth: vi.fn(async () => ({ id: mockState.userId })),
}));

vi.mock("~/server/utils/logger", () => ({
  useLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}));

// Thenable chain: eq()/in() both return the same chain object regardless of
// call order (the real handler chains .eq().eq() for the parent lookup, but
// .in().eq() for the player join) — resolving happens on `await` via .then().
function makeChain<T>(data: T) {
  const chain: {
    eq: () => typeof chain;
    in: () => typeof chain;
    then: (resolve: (v: { data: T; error: null }) => void) => void;
  } = {
    eq: () => chain,
    in: () => chain,
    then: (resolve) => resolve({ data, error: null }),
  };
  return chain;
}

vi.mock("~/server/utils/supabase", () => ({
  useSupabaseAdmin: vi.fn(() => ({
    from: (table: string) => {
      if (table === "family_members") {
        return {
          select: (cols: string) => {
            const isPlayerJoin = cols.includes("users!inner");
            return isPlayerJoin
              ? makeChain(mockState.playerMembers)
              : makeChain(mockState.familyMembers);
          },
        };
      }
      if (table === "family_units") {
        return { select: () => makeChain(mockState.familyUnits) };
      }
      return {};
    },
  })),
}));

vi.mock("h3", async (importOriginal) => {
  const actual = await importOriginal<typeof import("h3")>();
  return {
    ...actual,
    defineEventHandler: (fn: (event: unknown) => unknown) => fn,
    createError: (config: { statusCode: number; statusMessage?: string }) => {
      const err = new Error(config.statusMessage) as Error & {
        statusCode: number;
      };
      err.statusCode = config.statusCode;
      return err;
    },
    setResponseHeader: vi.fn(),
  };
});

const { default: handler } = await import("~/server/api/family/accessible.get");

describe("GET /api/family/accessible", () => {
  beforeEach(() => {
    mockState.userId = "parent-user-id";
    mockState.familyMembers = [{ family_unit_id: "family-1" }];
    mockState.familyUnits = [{ id: "family-1", family_name: "The Smiths" }];
    mockState.playerMembers = [
      {
        family_unit_id: "family-1",
        user_id: "athlete-1",
        users: {
          id: "athlete-1",
          full_name: "Alex Smith",
          email: "alex@example.com",
          graduation_year: 2027,
        },
      },
    ];
  });

  it("populates graduationYear from the athlete's users row instead of hardcoding null", async () => {
    const result = (await handler({} as never)) as {
      families: Array<{
        athleteId: string | null;
        graduationYear: number | null;
      }>;
    };

    expect(result.families).toHaveLength(1);
    expect(result.families[0].athleteId).toBe("athlete-1");
    expect(result.families[0].graduationYear).toBe(2027);
  });

  it("returns null graduationYear when the athlete has none set (not a hardcoded stub)", async () => {
    mockState.playerMembers[0].users.graduation_year = null;

    const result = (await handler({} as never)) as {
      families: Array<{ graduationYear: number | null }>;
    };

    expect(result.families[0].graduationYear).toBeNull();
  });

  it("selects the athlete closest to graduation across multiple families using the real graduationYear", async () => {
    mockState.familyMembers = [
      { family_unit_id: "family-1" },
      { family_unit_id: "family-2" },
    ];
    mockState.familyUnits = [
      { id: "family-1", family_name: "Family A" },
      { id: "family-2", family_name: "Family B" },
    ];
    mockState.playerMembers = [
      {
        family_unit_id: "family-1",
        user_id: "athlete-1",
        users: {
          id: "athlete-1",
          full_name: "Later Grad",
          email: null,
          graduation_year: 2030,
        },
      },
      {
        family_unit_id: "family-2",
        user_id: "athlete-2",
        users: {
          id: "athlete-2",
          full_name: "Sooner Grad",
          email: null,
          graduation_year: 2026,
        },
      },
    ];

    const result = (await handler({} as never)) as {
      families: Array<{
        athleteId: string | null;
        graduationYear: number | null;
      }>;
    };

    const closest = [...result.families].sort(
      (a, b) => (a.graduationYear ?? Infinity) - (b.graduationYear ?? Infinity),
    )[0];
    expect(closest.athleteId).toBe("athlete-2");
    expect(closest.graduationYear).toBe(2026);
  });
});
