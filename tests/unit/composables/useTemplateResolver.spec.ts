import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  useTemplateResolver,
  __resetTemplateRegistryCache,
} from "~/composables/useTemplateResolver";

// Canned per-table results + a spy counter for template_variables selects.
const h = vi.hoisted(() => {
  const registryRows = [
    {
      key: "playerName",
      source_type: "column",
      source_path: "column:users.full_name",
    },
    {
      key: "schoolName",
      source_type: "column",
      source_path: "column:schools.name",
    },
    { key: "coachSalutation", source_type: "computed", source_path: null },
    { key: "daysSinceContact", source_type: "computed", source_path: null },
  ];
  const RESULTS: Record<string, { data: unknown; error: unknown }> = {
    template_variables: { data: registryRows, error: null },
    users: {
      data: {
        id: "athlete1",
        full_name: "Jordan Ellis",
        graduation_year: 2028,
        primary_sport_id: "sport1",
        primary_position_custom: null,
        secondary_position_custom: null,
        gpa: 3.68,
        act_score: 29,
      },
      error: null,
    },
    user_preferences: {
      data: {
        data: {
          ncaa_id: "21",
          twelfth_grade_coach: "Dave Reilly",
          primary_position: "Shortstop",
          positions: ["Shortstop", "Second Base"],
          prep_baseball_id: "jordan-ellis",
          prep_baseball_state: "OH",
        },
      },
      error: null,
    },
    performance_metrics: {
      data: [
        {
          metric_type: "sixty_yard",
          display_value: "6.71",
          is_primary: true,
          recorded_date: "2026-06-15",
          source: "Perfect Game",
        },
      ],
      error: null,
    },
    sports: { data: { name: "Baseball" }, error: null },
    positions: { data: { name: "Shortstop" }, error: null },
    player_profiles: {
      data: { vanity_slug: "jordan", hash_slug: "abc123" },
      error: null,
    },
    documents: {
      data: { file_url: "https://files.example/transcript.pdf" },
      error: null,
    },
  };
  return { RESULTS, templateSelectCalls: { n: 0 } };
});

vi.mock("~/composables/useSupabase", () => ({
  useSupabase: () => ({
    from: (table: string) => {
      const result = h.RESULTS[table] ?? { data: null, error: null };
      const builder: Record<string, unknown> = {
        select: vi.fn((..._args: unknown[]) => {
          if (table === "template_variables") h.templateSelectCalls.n += 1;
          return builder;
        }),
        eq: vi.fn(() => builder),
        order: vi.fn(() => builder),
        limit: vi.fn(() => builder),
        or: vi.fn(() => builder),
        maybeSingle: vi.fn(() => Promise.resolve(result)),
        // awaitable for the no-maybeSingle paths (registry, metrics)
        then: (onFulfilled: (v: unknown) => unknown) =>
          Promise.resolve(result).then(onFulfilled),
      };
      return builder;
    },
  }),
}));

vi.mock("~/stores/user", () => ({
  useUserStore: vi.fn(() => ({ user: { id: "athlete1" } })),
}));

describe("useTemplateResolver", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __resetTemplateRegistryCache();
    h.templateSelectCalls.n = 0;
  });

  describe("loadRegistry", () => {
    it("returns rows and caches (second call does not refetch)", async () => {
      const { loadRegistry } = useTemplateResolver();
      const first = await loadRegistry();
      expect(first.map((r) => r.key)).toContain("playerName");
      expect(h.templateSelectCalls.n).toBe(1);

      const second = await loadRegistry();
      expect(second).toEqual(first);
      expect(h.templateSelectCalls.n).toBe(1); // served from cache
    });
  });

  describe("buildAthleteContext", () => {
    it("maps users, player prefs, metrics and derives sport/position/profileLink", async () => {
      const { buildAthleteContext } = useTemplateResolver();
      const ctx = await buildAthleteContext("athlete1");

      expect(ctx.tables?.users?.full_name).toBe("Jordan Ellis");
      expect(ctx.prefs?.ncaa_id).toBe("21");
      expect(ctx.metrics).toHaveLength(1);
      expect(ctx.derived?.sport).toBe("Baseball");
      // Ordered, abbreviated, coach-facing: positions[0]=SS, next distinct=2B.
      expect(ctx.derived?.position).toBe("SS/2B");
      expect(ctx.derived?.positionSecondary).toBe("2B");
      expect(ctx.derived?.profileLink).toBe("https://myrecruitingcompass.com/p/jordan");
      expect(ctx.derived?.prepBaseballLink).toBe(
        "https://www.prepbaseballreport.com/profiles/OH/jordan-ellis",
      );
      expect(ctx.derived?.hsCoachName).toBe("Dave Reilly");
      expect(ctx.derived?.transcriptLink).toBe(
        "https://files.example/transcript.pdf",
      );
    });
  });

  describe("resolveTemplate", () => {
    it("fills real data and reports genuinely-unresolved vars", async () => {
      const resolver = useTemplateResolver();
      const athleteCtx = await resolver.buildAthleteContext("athlete1");

      const result = await resolver.resolveTemplate(
        {
          subject: "{{playerName}} - {{schoolName}}",
          body: "{{coachSalutation}}, day {{daysSinceContact}}",
        },
        {
          school: { name: "Ohio State University" },
          coach: { last_name: "Delgado" },
        },
        athleteCtx,
      );

      expect(result.subject).toBe("Jordan Ellis - Ohio State University");
      expect(result.body).toContain("Coach Delgado");
      expect(result.body).toContain("{{daysSinceContact}}"); // Phase-4 var, still unfilled
      expect(result.unresolved).toContain("daysSinceContact");
      // values map drives the variables panel
      expect(result.values.playerName).toBe("Jordan Ellis");
      expect(result.values.daysSinceContact).toBeUndefined();
    });

    it("resolves [[gate|text]] optional spans — no bracket leak into fields", async () => {
      const resolver = useTemplateResolver();
      const athleteCtx = await resolver.buildAthleteContext("athlete1");

      const result = await resolver.resolveTemplate(
        {
          subject: "[[coachSalutation|{{coachSalutation}}]] — recruit",
          body: "Reaching out.[[missingGate| SHOULD DROP]] Thanks.",
        },
        {
          school: { name: "Ohio State University" },
          coach: { last_name: "Delgado" },
        },
        athleteCtx,
      );

      // Present gate keeps inner text (with its {{token}} substituted); absent
      // gate drops the whole span. No raw `[[` wrapper survives into the fields.
      expect(result.subject).not.toContain("[[");
      expect(result.subject).toBe("Coach Delgado — recruit");
      expect(result.body).not.toContain("[[");
      expect(result.body).not.toContain("SHOULD DROP");
    });
  });
});
