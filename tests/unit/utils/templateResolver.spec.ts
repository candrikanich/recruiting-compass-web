import { describe, it, expect } from "vitest";
import {
  resolveSourcePath,
  renderMetrics,
  dedupeMostRecentPerType,
  applyOptionalSegments,
  carryingTool,
  resolveVariables,
  renderTemplate,
  renderClean,
  formatUsPhone,
  findUnresolved,
  type RegistryVar,
  type ResolverContext,
  type MetricRow,
} from "~/utils/templateResolver";

const ctx: ResolverContext = {
  tables: {
    users: {
      full_name: "Jordan Ellis",
      graduation_year: 2028,
      phone: "440-555-0134",
      gpa: 3.68,
      act_score: 29,
      sat_score: null,
      height_inches: 74,
      weight_lbs: 185,
      high_school: "Olmsted Falls HS",
    },
    schools: {
      name: "Ohio State University",
      division: "NCAA Division II",
      twitter_handle: "StateBaseball",
    },
    coaches: { first_name: "Ryan", last_name: "Delgado", role: "recruiting" },
    events: {
      name: "Midwest Prospect Showcase",
      location: "Grand Park, Westfield IN",
    },
  },
  prefs: {
    ncaa_id: "2109887654",
    video_links: ["https://film.example/1"],
    travel_team_coach: "Marcus Webb",
    city: "PLAYER_CITY",
    // player stats now resolve from prefs (source of truth), not the users mirror
    height_inches: 74,
    weight_lbs: 185,
    act_score: 29,
  },
  locationPrefs: {
    city: "Olmsted Township",
    state: "OH",
  },
  authored: {
    programNote: "Your staff develops middle infielders.",
    updateHook: "Ran a 6.71 sixty.",
  },
  now: new Date("2026-08-07T12:00:00Z"),
};

describe("resolveSourcePath", () => {
  it("resolves column: paths from the named table", () => {
    expect(resolveSourcePath("column:users.full_name", ctx)).toBe(
      "Jordan Ellis",
    );
    expect(resolveSourcePath("column:schools.name", ctx)).toBe(
      "Ohio State University",
    );
    expect(resolveSourcePath("column:coaches.last_name", ctx)).toBe("Delgado");
    expect(resolveSourcePath("column:events.name", ctx)).toBe(
      "Midwest Prospect Showcase",
    );
  });

  it("resolves pref:player.<key> from the player jsonb", () => {
    expect(resolveSourcePath("pref:player.ncaa_id", ctx)).toBe("2109887654");
  });

  it("resolves pref:location.<key> from the location jsonb, not player prefs", () => {
    expect(resolveSourcePath("pref:location.city", ctx)).toBe("Olmsted Township");
    expect(resolveSourcePath("pref:location.state", ctx)).toBe("OH");
    // player prefs also carry a `city`; the location prefix must not read it
    expect(resolveSourcePath("pref:player.city", ctx)).toBe("PLAYER_CITY");
  });

  it("returns null for a missing column or unknown table", () => {
    expect(resolveSourcePath("column:users.nonexistent", ctx)).toBeNull();
    expect(resolveSourcePath("column:bogus.x", ctx)).toBeNull();
    expect(resolveSourcePath("pref:player.missing", ctx)).toBeNull();
  });
});

describe("renderMetrics", () => {
  const metrics: MetricRow[] = [
    {
      metric_type: "sixty_yard",
      display_value: "6.71",
      source: "Perfect Game",
      recorded_date: "2026-06-15",
      is_primary: true,
    },
    {
      metric_type: "exit_velo",
      display_value: "92.1 mph",
      source: "HitTrax",
      recorded_date: "2026-06-10",
      is_primary: false,
    },
    {
      metric_type: "throwing_velo",
      display_value: "88 mph",
      source: null,
      recorded_date: "2026-05-01",
      is_primary: false,
    },
    {
      metric_type: "pop_time",
      display_value: "1.95",
      source: "Perfect Game",
      recorded_date: "2026-04-01",
      is_primary: false,
    },
    {
      metric_type: "broad_jump",
      display_value: "9'2\"",
      source: null,
      recorded_date: "2026-03-01",
      is_primary: false,
    },
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
    const line = renderMetrics([
      {
        metric_type: "throwing_velo",
        display_value: "88 mph",
        recorded_date: null,
      },
    ]);
    expect(line).not.toContain("(");
    expect(line).toContain("88 mph");
  });

  it("falls back to value + unit when display_value is absent", () => {
    const line = renderMetrics([
      {
        metric_type: "velocity",
        value: 82.3,
        unit: "mph",
        recorded_date: null,
      },
    ]);
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
      {
        metric_type: "exit_velo",
        display_value: "92.1 mph",
        is_primary: false,
      },
    ]);
    expect(out).toBe("6.71 sixty yard");
  });

  it("uses the registry label for a known metric_type", () => {
    const out = carryingTool([
      { metric_type: "batting_avg", display_value: ".410", is_primary: true },
    ]);
    expect(out).toBe(".410 Batting Average");
  });

  it("falls back to a humanized label for an unregistered metric_type", () => {
    const out = carryingTool([
      { metric_type: "arm_strength", display_value: "80", is_primary: true },
    ]);
    expect(out).toBe("80 arm strength");
  });

  it("returns null when no metric is primary", () => {
    expect(
      carryingTool([
        { metric_type: "x", display_value: "1", is_primary: false },
      ]),
    ).toBeNull();
    expect(carryingTool([])).toBeNull();
  });
});

describe("renderTemplate + findUnresolved", () => {
  it("replaces every {{key}} occurrence", () => {
    expect(
      renderTemplate(
        "Hi {{coachSalutation}}, from {{playerName}}. {{playerName}} again.",
        {
          coachSalutation: "Coach Delgado",
          playerName: "Jordan Ellis",
        },
      ),
    ).toBe("Hi Coach Delgado, from Jordan Ellis. Jordan Ellis again.");
  });

  it("lists surviving unresolved variables after render (send-blocking check)", () => {
    const rendered = renderTemplate(
      "Hi {{coachSalutation}}, {{missingOne}} and {{another}}.",
      {
        coachSalutation: "Coach Delgado",
      },
    );
    expect(findUnresolved(rendered)).toEqual(["missingOne", "another"]);
    expect(findUnresolved("all good")).toEqual([]);
  });
});

describe("resolveVariables", () => {
  const registry: RegistryVar[] = [
    {
      key: "playerName",
      source_type: "column",
      source_path: "column:users.full_name",
    },
    { key: "playerFirstName", source_type: "computed", source_path: null },
    {
      key: "gradYear",
      source_type: "column",
      source_path: "column:users.graduation_year",
    },
    { key: "height", source_type: "computed", source_path: null },
    { key: "weight", source_type: "computed", source_path: null },
    { key: "coachSalutation", source_type: "computed", source_path: null },
    { key: "schoolShortName", source_type: "computed", source_path: null },
    { key: "testLabel", source_type: "computed", source_path: null },
    { key: "testScore", source_type: "computed", source_path: null },
    {
      key: "ncaaId",
      source_type: "column",
      source_path: "pref:player.ncaa_id",
    },
    { key: "programNote", source_type: "authored", source_path: null },
    { key: "todayDate", source_type: "system", source_path: null },
    {
      key: "schoolName",
      source_type: "column",
      source_path: "column:schools.name",
    },
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

describe("questionnaireNote (optional completion sentence)", () => {
  const reg: RegistryVar[] = [
    { key: "questionnaireNote", source_type: "computed", source_path: null },
  ];

  it("renders the completion sentence when the school flag is true", () => {
    const out = resolveVariables(reg, {
      tables: { schools: { name: "Ohio State", questionnaire_completed: true } },
    });
    expect(out.questionnaireNote).toBe(
      "I've completed your recruiting questionnaire. ",
    );
  });

  it("resolves to an empty string (not omitted) when the flag is false", () => {
    const out = resolveVariables(reg, {
      tables: { schools: { name: "Ohio State", questionnaire_completed: false } },
    });
    // Present-but-empty is the key contract: the literal is replaced with
    // nothing rather than left intact, so findUnresolved does NOT block send.
    expect(out.questionnaireNote).toBe("");
    expect("questionnaireNote" in out).toBe(true);
  });

  it("defaults to empty when the flag is absent", () => {
    const out = resolveVariables(reg, {
      tables: { schools: { name: "Ohio State" } },
    });
    expect(out.questionnaireNote).toBe("");
  });

  it("leaves no unresolved token in a rendered body when omitted", () => {
    const out = resolveVariables(reg, {
      tables: { schools: { questionnaire_completed: false } },
    });
    const body = renderTemplate("{{questionnaireNote}}I'd welcome feedback.", out);
    expect(body).toBe("I'd welcome feedback.");
    expect(findUnresolved(body)).toEqual([]);
  });
});

// Shared vectors with iOS TemplateRenderCleanTests — keep the two byte-identical.
describe("renderClean", () => {
  const required = new Set(["programNote"]);

  it("drops a label-only line for an empty optional", () => {
    expect(renderClean("Film: {{videoLink}}\nThanks", {}, required)).toBe(
      "Thanks",
    );
  });

  it("keeps the line when the optional resolves", () => {
    expect(
      renderClean("Film: {{videoLink}}\nThanks", { videoLink: "https://film/1" }, required),
    ).toBe("Film: https://film/1\nThanks");
  });

  it("keeps a required unresolved token", () => {
    expect(renderClean("Hi,\n{{programNote}}\nThanks", {}, required)).toBe(
      "Hi,\n{{programNote}}\nThanks",
    );
  });

  it("drops an empty bullet line", () => {
    expect(renderClean("Numbers:\n- {{metrics}}\nEnd", {}, required)).toBe(
      "Numbers:\nEnd",
    );
  });

  it("tidies a footer with some resolved", () => {
    expect(
      renderClean("{{gradYear}} | {{position}} | {{highSchool}}", { gradYear: "2028" }, required),
    ).toBe("2028");
  });

  it("drops the footer when all optional are empty", () => {
    expect(
      renderClean("Signed,\n{{gradYear}} | {{position}} | {{highSchool}}", {}, required),
    ).toBe("Signed,");
  });

  it("collapses blank lines left by a drop", () => {
    expect(renderClean("A\n\nFilm: {{videoLink}}\n\nB", {}, required)).toBe("A\n\nB");
  });

  it("keeps required when mixed with optional on one line", () => {
    expect(renderClean("{{position}} — {{programNote}}", {}, required)).toBe(
      "{{programNote}}",
    );
  });
});

// Shared vectors with iOS TemplateResolver.applyOptionalSegments — keep byte-identical.
describe("applyOptionalSegments", () => {
  it("keeps the inner text when the gate key resolves non-empty", () => {
    expect(
      applyOptionalSegments("Hi[[intendedMajor|, planning to study {{intendedMajor}}]].", {
        intendedMajor: "Engineering",
      }),
    ).toBe("Hi, planning to study {{intendedMajor}}.");
  });

  it("drops the whole span when the gate key is missing", () => {
    expect(
      applyOptionalSegments("Hi[[intendedMajor|, planning to study {{intendedMajor}}]].", {}),
    ).toBe("Hi.");
  });

  it("drops the span when the gate key is present but blank after trim", () => {
    expect(
      applyOptionalSegments("Hi[[intendedMajor|, planning to study X]].", {
        intendedMajor: "   ",
      }),
    ).toBe("Hi.");
  });

  it("handles a multi-token film clause spanning gate + inner tokens", () => {
    const body =
      "[[videoLink|I'd welcome any feedback on my film {{videoLink}} to fit at {{schoolName}}.]]";
    expect(
      applyOptionalSegments(body, { videoLink: "https://film/1", schoolName: "OSU" }),
    ).toBe("I'd welcome any feedback on my film {{videoLink}} to fit at {{schoolName}}.");
    expect(applyOptionalSegments(body, { schoolName: "OSU" })).toBe("");
  });

  it("never prints the gate key itself", () => {
    expect(applyOptionalSegments("[[videoLink|film]]", { videoLink: "x" })).toBe("film");
  });
});

describe("renderClean — optional [[gate|text]] segments", () => {
  const required = new Set<string>();

  it("keeps the major clause and substitutes its inner token when resolved", () => {
    const body = "I'm a {{position}}[[intendedMajor|, planning to study {{intendedMajor}}]].";
    expect(
      renderClean(body, { position: "SS", intendedMajor: "Engineering" }, required),
    ).toBe("I'm a SS, planning to study Engineering.");
  });

  it("removes the major clause entirely when the gate is unresolved", () => {
    const body = "I'm a {{position}}[[intendedMajor|, planning to study {{intendedMajor}}]].";
    expect(renderClean(body, { position: "SS" }, required)).toBe("I'm a SS.");
  });

  it("renders a film clause end-to-end when videoLink resolves", () => {
    const body =
      "Thanks.\n[[videoLink|I'd welcome any feedback on my film {{videoLink}} to fit at {{schoolName}}.]]";
    expect(
      renderClean(body, { videoLink: "https://film/1", schoolName: "OSU" }, required),
    ).toBe("Thanks.\nI'd welcome any feedback on my film https://film/1 to fit at OSU.");
  });

  it("drops the film line when videoLink is missing", () => {
    const body =
      "Thanks.\n[[videoLink|I'd welcome any feedback on my film {{videoLink}} to fit at {{schoolName}}.]]";
    expect(renderClean(body, { schoolName: "OSU" }, required)).toBe("Thanks.");
  });
});

describe("dedupeMostRecentPerType", () => {
  it("keeps only the most recent row per metric_type", () => {
    const rows: MetricRow[] = [
      { metric_type: "exit_velo", display_value: "90", recorded_date: "2026-05-01" },
      { metric_type: "exit_velo", display_value: "94", recorded_date: "2026-06-10" },
      { metric_type: "sixty_yard", display_value: "6.9", recorded_date: "2026-04-01" },
    ];
    const out = dedupeMostRecentPerType(rows);
    expect(out).toHaveLength(2);
    expect(out.find((m) => m.metric_type === "exit_velo")?.display_value).toBe("94");
  });

  it("breaks a same-date tie toward the verified row", () => {
    const rows: MetricRow[] = [
      { metric_type: "exit_velo", display_value: "90", recorded_date: "2026-06-10", verified: false },
      { metric_type: "exit_velo", display_value: "94", recorded_date: "2026-06-10", verified: true },
    ];
    const out = dedupeMostRecentPerType(rows);
    expect(out).toHaveLength(1);
    expect(out[0].display_value).toBe("94");
  });

  it("breaks a date+verified tie toward the primary row", () => {
    const rows: MetricRow[] = [
      {
        metric_type: "exit_velo",
        display_value: "90",
        recorded_date: "2026-06-10",
        verified: true,
        is_primary: false,
      },
      {
        metric_type: "exit_velo",
        display_value: "94",
        recorded_date: "2026-06-10",
        verified: true,
        is_primary: true,
      },
    ];
    expect(dedupeMostRecentPerType(rows)[0].display_value).toBe("94");
  });

  it("preserves original input order of the surviving rows", () => {
    const rows: MetricRow[] = [
      { metric_type: "sixty_yard", display_value: "6.9", recorded_date: "2026-04-01" },
      { metric_type: "exit_velo", display_value: "94", recorded_date: "2026-06-10" },
    ];
    const out = dedupeMostRecentPerType(rows);
    expect(out.map((m) => m.metric_type)).toEqual(["sixty_yard", "exit_velo"]);
  });

  it("renderMetrics collapses duplicate types before capping", () => {
    const rows: MetricRow[] = [
      { metric_type: "exit_velo", display_value: "90", recorded_date: "2026-05-01" },
      { metric_type: "exit_velo", display_value: "94", recorded_date: "2026-06-10" },
    ];
    const lines = renderMetrics(rows).split("\n").filter(Boolean);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain("94");
  });
});

describe("formatUsPhone", () => {
  it("formats US 10-digit and 1-prefixed numbers", () => {
    expect(formatUsPhone("216-534-8996")).toBe("(216) 534-8996");
    expect(formatUsPhone("2165348996")).toBe("(216) 534-8996");
    expect(formatUsPhone("+1 (216) 534.8996")).toBe("(216) 534-8996");
    expect(formatUsPhone("12165348996")).toBe("(216) 534-8996");
  });
  it("leaves non-standard numbers and empties alone", () => {
    expect(formatUsPhone("555-1234")).toBe("555-1234");
    expect(formatUsPhone("  ")).toBeNull();
  });
});
