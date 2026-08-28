import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("~/utils/ncaaDatabase", () => ({
  getCatalogSchools: () => [
    {
      name: "Ohio State University",
      division: "D1",
      conference: "Big Ten",
      state: "OH",
      website: "osu.edu",
      athleticWebsite: null,
    },
    {
      name: "Duke University",
      division: "D1",
      conference: "ACC",
      state: "NC",
      website: "duke.edu",
      athleticWebsite: null,
    },
  ],
}));

type QueryResult = { data: unknown; error: { message: string } | null };

const db = vi.hoisted(() => ({
  family: { data: { family_unit_id: "fam-1" }, error: null } as QueryResult,
  prefs: {
    data: [
      { category: "player", data: { gpa: 3.7, school_state: "OH" } },
      { category: "location", data: { state: "OH" } },
    ],
    error: null,
  } as QueryResult,
  user: { data: { hometown_state: "OH" }, error: null } as QueryResult,
  schools: { data: [] as { name: string }[], error: null } as QueryResult,
  dismissals: {
    data: [] as { catalog_key: string }[],
    error: null,
  } as QueryResult,
}));

function chain(result: QueryResult, maybeSingleData: unknown) {
  const obj = {
    select: vi.fn(() => obj),
    eq: vi.fn(() => obj),
    in: vi.fn(() => obj),
    limit: vi.fn(() => obj),
    maybeSingle: vi.fn(async () => ({
      data: maybeSingleData,
      error: result.error,
    })),
    then: (
      resolve: (value: QueryResult) => unknown,
      reject?: (reason: unknown) => unknown,
    ) => Promise.resolve(result).then(resolve, reject),
  };
  return obj;
}

vi.mock("~/server/utils/supabase", () => ({
  useSupabaseAdmin: vi.fn(),
}));

import { assembleSchoolRecommendations } from "~/server/utils/assembleSchoolRecommendations";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "~/types/database";

function mockClient(): SupabaseClient<Database> {
  return {
    from: vi.fn((table: string) => {
      switch (table) {
        case "family_members":
          return chain(db.family, db.family.data);
        case "user_preferences":
          return chain(db.prefs, null);
        case "users":
          return chain(db.user, db.user.data);
        case "schools":
          return chain(db.schools, null);
        case "school_recommendation_dismissals":
          return chain(db.dismissals, null);
        default:
          return chain({ data: null, error: null }, null);
      }
    }),
  } as unknown as SupabaseClient<Database>;
}

describe("assembleSchoolRecommendations", () => {
  beforeEach(() => {
    db.family = { data: { family_unit_id: "fam-1" }, error: null };
    db.prefs = {
      data: [
        { category: "player", data: { gpa: 3.7, school_state: "OH" } },
        { category: "location", data: { state: "OH" } },
      ],
      error: null,
    };
    db.user = { data: { hometown_state: "OH" }, error: null };
    db.schools = { data: [], error: null };
    db.dismissals = { data: [], error: null };
  });

  it("ranks in-state schools first from player signals", async () => {
    const result = await assembleSchoolRecommendations(
      mockClient(),
      "athlete-1",
    );
    expect(result.signals.homeState).toBe("OH");
    expect(result.signals.gpa).toBe(3.7);
    expect(result.recommendations[0]?.name).toBe("Ohio State University");
    expect(result.recommendations[0]?.reasons).toContain("In OH");
  });

  it("excludes schools already on the family list", async () => {
    db.schools = { data: [{ name: "Ohio State University" }], error: null };
    const result = await assembleSchoolRecommendations(
      mockClient(),
      "athlete-1",
    );
    expect(result.recommendations.map((row) => row.name)).not.toContain(
      "Ohio State University",
    );
    expect(result.signals.excludedCount).toBe(1);
  });

  it("excludes dismissed catalog keys", async () => {
    db.dismissals = {
      data: [{ catalog_key: "ohio state university" }],
      error: null,
    };
    const result = await assembleSchoolRecommendations(
      mockClient(),
      "athlete-1",
    );
    expect(result.recommendations.map((row) => row.name)).not.toContain(
      "Ohio State University",
    );
  });
});
