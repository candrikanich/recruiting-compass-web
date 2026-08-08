import { describe, it, expect } from "vitest";
import {
  resolveSourcePath,
  renderMetrics,
  carryingTool,
  resolveVariables,
  renderTemplate,
  findUnresolved,
  type RegistryVar,
  type ResolverContext,
  type MetricRow,
} from "~/utils/templateResolver";

const ctx: ResolverContext = {
  tables: {
    users: { full_name: "Jordan Ellis", graduation_year: 2028, phone: "440-555-0134", gpa: 3.68, act_score: 29, sat_score: null, height_inches: 74, weight_lbs: 185, high_school: "Olmsted Falls HS" },
    schools: { name: "Ohio State University", division: "NCAA Division II", twitter_handle: "StateBaseball" },
    coaches: { first_name: "Ryan", last_name: "Delgado", role: "recruiting" },
    events: { name: "Midwest Prospect Showcase", location: "Grand Park, Westfield IN" },
  },
  prefs: { ncaa_id: "2109887654", video_links: ["https://film.example/1"], travel_team_coach: "Marcus Webb" },
  authored: { programNote: "Your staff develops middle infielders.", updateHook: "Ran a 6.71 sixty." },
  now: new Date("2026-08-07T12:00:00Z"),
};

describe("resolveSourcePath", () => {
  it("resolves column: paths from the named table", () => {
    expect(resolveSourcePath("column:users.full_name", ctx)).toBe("Jordan Ellis");
    expect(resolveSourcePath("column:schools.name", ctx)).toBe("Ohio State University");
    expect(resolveSourcePath("column:coaches.last_name", ctx)).toBe("Delgado");
    expect(resolveSourcePath("column:events.name", ctx)).toBe("Midwest Prospect Showcase");
  });

  it("resolves pref:player.<key> from the player jsonb", () => {
    expect(resolveSourcePath("pref:player.ncaa_id", ctx)).toBe("2109887654");
  });

  it("returns null for a missing column or unknown table", () => {
    expect(resolveSourcePath("column:users.nonexistent", ctx)).toBeNull();
    expect(resolveSourcePath("column:bogus.x", ctx)).toBeNull();
    expect(resolveSourcePath("pref:player.missing", ctx)).toBeNull();
  });
});

describe("renderMetrics", () => {
  const metrics: MetricRow[] = [
    { metric_type: "sixty_yard", display_value: "6.71", source: "Perfect Game", recorded_date: "2026-06-15", is_primary: true },
    { metric_type: "exit_velo", display_value: "92.1 mph", source: "HitTrax", recorded_date: "2026-06-10", is_primary: false },
    { metric_type: "throwing_velo", display_value: "88 mph", source: null, recorded_date: "2026-05-01", is_primary: false },
    { metric_type: "pop_time", display_value: "1.95", source: "Perfect Game", recorded_date: "2026-04-01", is_primary: false },
    { metric_type: "broad_jump", display_value: "9'2\"", source: null, recorded_date: "2026-03-01", is_primary: false },
  ];

  it("caps the rendered block at 4 lines (product rule #4)", () => {
    const lines = renderMetrics(metrics).split("\n").filter(Boolean);
    expect(lines).toHaveLength(4);
  });

  it("puts the primary metric first and renders source + month/year (rule #3)", () => {
    const first = renderMetrics(metrics).split("\n")[0];
    expect(first).toContain("6.71");
    expect(first).toContain("Perfect Game");
    expect(first).toContain("Jun 2026");
  });

  it("omits the parenthetical when no source", () => {
    const line = renderMetrics([{ metric_type: "throwing_velo", display_value: "88 mph", recorded_date: null }]);
    expect(line).not.toContain("(");
    expect(line).toContain("88 mph");
  });

  it("falls back to value + unit when display_value is absent", () => {
    const line = renderMetrics([{ metric_type: "velocity", value: 82.3, unit: "mph", recorded_date: null }]);
    expect(line).toContain("82.3 mph");
  });

  it("returns empty string for no metrics", () => {
    expect(renderMetrics([])).toBe("");
  });
});

describe("carryingTool", () => {
  it("returns the primary metric as '<value> <label>'", () => {
    const out = carryingTool([
      { metric_type: "sixty_yard", display_value: "6.71", is_primary: true },
      { metric_type: "exit_velo", display_value: "92.1 mph", is_primary: false },
    ]);
    expect(out).toBe("6.71 sixty yard");
  });

  it("returns null when no metric is primary", () => {
    expect(carryingTool([{ metric_type: "x", display_value: "1", is_primary: false }])).toBeNull();
    expect(carryingTool([])).toBeNull();
  });
});

describe("renderTemplate + findUnresolved", () => {
  it("replaces every {{key}} occurrence", () => {
    expect(renderTemplate("Hi {{coachSalutation}}, from {{playerName}}. {{playerName}} again.", {
      coachSalutation: "Coach Delgado",
      playerName: "Jordan Ellis",
    })).toBe("Hi Coach Delgado, from Jordan Ellis. Jordan Ellis again.");
  });

  it("lists surviving unresolved variables after render (send-blocking check)", () => {
    const rendered = renderTemplate("Hi {{coachSalutation}}, {{missingOne}} and {{another}}.", {
      coachSalutation: "Coach Delgado",
    });
    expect(findUnresolved(rendered)).toEqual(["missingOne", "another"]);
    expect(findUnresolved("all good")).toEqual([]);
  });
});

describe("resolveVariables", () => {
  const registry: RegistryVar[] = [
    { key: "playerName", source_type: "column", source_path: "column:users.full_name" },
    { key: "playerFirstName", source_type: "computed", source_path: null },
    { key: "gradYear", source_type: "column", source_path: "column:users.graduation_year" },
    { key: "height", source_type: "computed", source_path: null },
    { key: "weight", source_type: "computed", source_path: null },
    { key: "coachSalutation", source_type: "computed", source_path: null },
    { key: "schoolShortName", source_type: "computed", source_path: null },
    { key: "testLabel", source_type: "computed", source_path: null },
    { key: "testScore", source_type: "computed", source_path: null },
    { key: "ncaaId", source_type: "column", source_path: "pref:player.ncaa_id" },
    { key: "programNote", source_type: "authored", source_path: null },
    { key: "todayDate", source_type: "system", source_path: null },
    { key: "schoolName", source_type: "column", source_path: "column:schools.name" },
  ];

  const out = resolveVariables(registry, ctx);

  it("resolves column values as strings", () => {
    expect(out.playerName).toBe("Jordan Ellis");
    expect(out.gradYear).toBe("2028");
    expect(out.schoolName).toBe("Ohio State University");
    expect(out.ncaaId).toBe("2109887654");
  });

  it("resolves computed formatters", () => {
    expect(out.playerFirstName).toBe("Jordan");
    expect(out.height).toBe("6'2\"");
    expect(out.weight).toBe("185 lbs");
    expect(out.coachSalutation).toBe("Coach Delgado");
    expect(out.schoolShortName).toBe("Ohio State");
    expect(out.testLabel).toBe("ACT");
    expect(out.testScore).toBe("29");
  });

  it("resolves authored + system values", () => {
    expect(out.programNote).toBe("Your staff develops middle infielders.");
    expect(out.todayDate).toBe("August 7, 2026");
  });

  it("omits keys that resolve to null (so findUnresolved can catch them)", () => {
    const sparse = resolveVariables(
      [{ key: "height", source_type: "computed", source_path: null }],
      { tables: { users: {} } },
    );
    expect(sparse.height).toBeUndefined();
  });
});
