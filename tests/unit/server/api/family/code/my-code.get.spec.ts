import { describe, it, expect, vi, beforeEach } from "vitest";

interface FamilyUnitRow {
  id: string;
  family_code: string | null;
  family_name: string | null;
  code_generated_at: string | null;
}

const mockState = {
  userId: "user-1",
  role: "player" as "player" | "parent",
  // Player branch: single membership (or null).
  playerMembership: null as { family_units: FamilyUnitRow } | null,
  // Parent branch: list of memberships.
  parentMemberships: [] as Array<{ family_units: FamilyUnitRow }>,
};

vi.mock("~/server/utils/auth", () => ({
  requireAuth: vi.fn(async () => ({ id: mockState.userId })),
  getUserRole: vi.fn(async () => mockState.role),
}));

vi.mock("~/server/utils/logger", () => ({
  useLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}));

vi.mock("~/server/utils/supabase", () => ({
  useSupabaseAdmin: vi.fn(() => ({
    from: (table: string) => {
      if (table === "family_members") {
        // Player path chains `.eq(...).maybeSingle()`; parent path chains
        // `.eq(...).eq(...)` and is awaited as a list. One thenable supports both.
        const chain: Record<string, unknown> = {
          eq: () => chain,
          maybeSingle: () =>
            Promise.resolve({ data: mockState.playerMembership, error: null }),
          then: (resolve: (v: unknown) => unknown) =>
            resolve({ data: mockState.parentMemberships, error: null }),
        };
        return { select: () => chain };
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
      statusMessage?: string;
      message?: string;
    }) => {
      const err = new Error(
        config.statusMessage ?? config.message ?? "error",
      ) as Error & { statusCode: number };
      err.statusCode = config.statusCode;
      return err;
    },
  };
});

const { default: handler } =
  await import("~/server/api/family/code/my-code.get");

const mockEvent = { context: {}, node: { req: {}, res: {} } } as Parameters<
  typeof handler
>[0];

const unit = (over: Partial<FamilyUnitRow> = {}): FamilyUnitRow => ({
  id: "fam-1",
  family_code: "FAM-ABCDEF",
  family_name: "Smith Family",
  code_generated_at: "2024-01-01T00:00:00Z",
  ...over,
});

describe("GET /api/family/code/my-code", () => {
  beforeEach(() => {
    mockState.userId = "user-1";
    mockState.role = "player";
    mockState.playerMembership = null;
    mockState.parentMemberships = [];
  });

  it("returns the family code for a player with a family", async () => {
    mockState.playerMembership = { family_units: unit() };
    const result = await handler(mockEvent);
    expect(result).toMatchObject({
      success: true,
      hasFamily: true,
      familyId: "fam-1",
      familyCode: "FAM-ABCDEF",
      familyName: "Smith Family",
    });
  });

  it("returns hasFamily=false with null fields for a player with no family", async () => {
    mockState.playerMembership = null;
    const result = await handler(mockEvent);
    expect(result).toMatchObject({
      success: true,
      hasFamily: false,
      familyId: null,
      familyCode: null,
    });
  });

  it("returns all family codes for a parent in multiple families", async () => {
    mockState.role = "parent";
    mockState.parentMemberships = [
      { family_units: unit({ id: "fam-1", family_code: "FAM-AAA" }) },
      { family_units: unit({ id: "fam-2", family_code: "FAM-BBB" }) },
    ];
    const result = (await handler(mockEvent)) as {
      success: boolean;
      families: Array<{ familyId: string; familyCode: string }>;
    };
    expect(result.success).toBe(true);
    expect(result.families).toHaveLength(2);
    expect(result.families.map((f) => f.familyCode)).toEqual([
      "FAM-AAA",
      "FAM-BBB",
    ]);
  });

  it("returns an empty families array for a parent with no memberships", async () => {
    mockState.role = "parent";
    mockState.parentMemberships = [];
    const result = (await handler(mockEvent)) as { families: unknown[] };
    expect(result.families).toEqual([]);
  });

  it("propagates an H3 auth error without wrapping it in a 500", async () => {
    const { requireAuth } = await import("~/server/utils/auth");
    const h3Err = Object.assign(new Error("Unauthorized"), { statusCode: 401 });
    vi.mocked(requireAuth).mockRejectedValueOnce(h3Err);
    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 401 });
  });

  it("wraps an unexpected error in a 500", async () => {
    const { getUserRole } = await import("~/server/utils/auth");
    vi.mocked(getUserRole).mockRejectedValueOnce(new Error("db down"));
    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 500 });
  });
});
