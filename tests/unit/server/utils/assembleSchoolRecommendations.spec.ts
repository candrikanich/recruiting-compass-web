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
  programs: {
    data: [] as { school_catalog_key: string }[],
    error: null,
  } as QueryResult,
  familyUnit: { data: null, error: null } as QueryResult,
  memberships: {
    data: [{ family_unit_id: "fam-1", role: "parent" }],
    error: null,
  } as QueryResult,
  players: { data: [] as { user_id: string }[], error: null } as QueryResult,
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

// family_members is read three ways: single-row family id, all memberships of
// a user, and player-role members of a family. Serve each by its select list.
function familyMembersChain() {
  let columns = "";
  const obj = chain(db.family, db.family.data);
  obj.select = vi.fn((cols: string) => {
    columns = cols;
    return obj;
  });
  obj.then = (
    resolve: (value: QueryResult) => unknown,
    reject?: (reason: unknown) => unknown,
  ) =>
    Promise.resolve(
      columns === "family_unit_id, role" ? db.memberships : db.players,
    ).then(resolve, reject);
  return obj;
}

vi.mock("~/server/utils/supabase", () => ({
  useSupabaseAdmin: vi.fn(),
}));

// Bypass the module-level cache so each test sees its own db.programs fixture.
vi.mock("~/server/utils/cache", () => ({
  getOrFetch: async (_key: string, fetchFn: () => Promise<unknown>) =>
    fetchFn(),
}));

import { assembleSchoolRecommendations } from "~/server/utils/assembleSchoolRecommendations";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "~/types/database";

function mockClient(): SupabaseClient<Database> {
  return {
    from: vi.fn((table: string) => {
      switch (table) {
        case "family_members":
          return familyMembersChain();
        case "user_preferences":
          return chain(db.prefs, null);
        case "users":
          return chain(db.user, db.user.data);
        case "schools":
          return chain(db.schools, null);
        case "school_recommendation_dismissals":
          return chain(db.dismissals, null);
        case "college_programs":
          return chain(db.programs, null);
        case "family_units":
          return chain(db.familyUnit, db.familyUnit.data);
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
    db.programs = { data: [], error: null };
    db.familyUnit = { data: null, error: null };
    db.memberships = {
      data: [{ family_unit_id: "fam-1", role: "parent" }],
      error: null,
    };
    db.players = { data: [], error: null };
  });

  describe("pre-athlete fallback to family_units.pending_player_details", () => {
    beforeEach(() => {
      db.prefs = { data: [], error: null };
      db.programs = {
        data: [{ school_catalog_key: "ohio state university" }],
        error: null,
      };
    });

    it("uses pending sport + gender when the athlete has no preferences", async () => {
      db.familyUnit = {
        data: { pending_player_details: { sport: "Baseball", gender: "male" } },
        error: null,
      };
      const result = await assembleSchoolRecommendations(
        mockClient(),
        "parent-1",
      );
      expect(result.recommendations.map((row) => row.name)).toEqual([
        "Ohio State University",
      ]);
    });

    it("prefers athlete preferences over pending details", async () => {
      db.prefs = {
        data: [{ category: "player", data: { primary_sport: "Baseball" } }],
        error: null,
      };
      db.familyUnit = {
        data: { pending_player_details: { sport: "Soccer" } },
        error: null,
      };
      const result = await assembleSchoolRecommendations(
        mockClient(),
        "athlete-1",
      );
      expect(result.recommendations.map((row) => row.name)).toEqual([
        "Ohio State University",
      ]);
    });

    it("ignores the draft when a player already exists in the family", async () => {
      db.players = { data: [{ user_id: "athlete-1" }], error: null };
      db.familyUnit = {
        data: { pending_player_details: { sport: "Baseball" } },
        error: null,
      };
      const result = await assembleSchoolRecommendations(
        mockClient(),
        "parent-1",
      );
      expect(result.recommendations).toHaveLength(2);
    });

    it("ignores the draft for a player-role target (sibling's draft)", async () => {
      db.memberships = {
        data: [{ family_unit_id: "fam-1", role: "player" }],
        error: null,
      };
      db.familyUnit = {
        data: { pending_player_details: { sport: "Baseball" } },
        error: null,
      };
      const result = await assembleSchoolRecommendations(
        mockClient(),
        "athlete-2",
      );
      expect(result.recommendations).toHaveLength(2);
    });

    it("skips the draft when the parent belongs to multiple families", async () => {
      db.memberships = {
        data: [
          { family_unit_id: "fam-1", role: "parent" },
          { family_unit_id: "fam-2", role: "parent" },
        ],
        error: null,
      };
      db.familyUnit = {
        data: { pending_player_details: { sport: "Baseball" } },
        error: null,
      };
      const result = await assembleSchoolRecommendations(
        mockClient(),
        "parent-1",
      );
      expect(result.recommendations).toHaveLength(2);
    });

    it("fills a missing gender from the draft when sport is already set", async () => {
      db.prefs = {
        data: [{ category: "player", data: { primary_sport: "Baseball" } }],
        error: null,
      };
      db.familyUnit = {
        data: { pending_player_details: { gender: "female" } },
        error: null,
      };
      const gendersQueried: unknown[] = [];
      const client = mockClient();
      const from = client.from as unknown as (t: string) => {
        in: (...args: unknown[]) => unknown;
      };
      const originalFrom = from.bind(client);
      (client as unknown as { from: unknown }).from = (table: string) => {
        const builder = originalFrom(table);
        if (table === "college_programs") {
          const originalIn = builder.in.bind(builder);
          builder.in = (...args: unknown[]) => {
            gendersQueried.push(args);
            return originalIn(...args);
          };
        }
        return builder;
      };
      await assembleSchoolRecommendations(client, "parent-1");
      expect(gendersQueried).toEqual([["gender", ["women", "coed"]]]);
    });

    it("ignores malformed pending details", async () => {
      db.familyUnit = {
        data: { pending_player_details: ["Baseball"] },
        error: null,
      };
      const result = await assembleSchoolRecommendations(
        mockClient(),
        "parent-1",
      );
      expect(result.recommendations).toHaveLength(2);
    });
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

  it("falls back to unfiltered recommendations when no programs data exists", async () => {
    db.prefs = {
      data: [
        {
          category: "player",
          data: { gpa: 3.7, school_state: "OH", primary_sport: "Baseball" },
        },
        { category: "location", data: { state: "OH" } },
      ],
      error: null,
    };
    db.programs = { data: [], error: null };
    const result = await assembleSchoolRecommendations(
      mockClient(),
      "athlete-1",
    );
    expect(result.recommendations.map((row) => row.name)).toContain(
      "Duke University",
    );
  });

  it("filters recommendations to schools sponsoring the athlete's sport", async () => {
    db.prefs = {
      data: [
        {
          category: "player",
          data: { gpa: 3.7, school_state: "OH", primary_sport: "Baseball" },
        },
        { category: "location", data: { state: "OH" } },
      ],
      error: null,
    };
    db.programs = {
      data: [{ school_catalog_key: "ohio state university" }],
      error: null,
    };
    const result = await assembleSchoolRecommendations(
      mockClient(),
      "athlete-1",
    );
    expect(result.recommendations.map((row) => row.name)).toContain(
      "Ohio State University",
    );
    expect(result.recommendations.map((row) => row.name)).not.toContain(
      "Duke University",
    );
  });
});
