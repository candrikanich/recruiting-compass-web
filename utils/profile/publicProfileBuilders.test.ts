import { describe, it, expect } from "vitest";
import { buildPublicMetrics, buildTeamHistory } from "./publicProfileBuilders";

describe("buildPublicMetrics", () => {
  it("prefers primary then verified, caps at 6, formats value", () => {
    const rows = [
      { metric_type: "sixty_yard_dash", display_value: "6.8", unit: "sec", verified: true, is_primary: true },
      { metric_type: "exit_velocity", value: 91, unit: "mph", verified: true, is_primary: false },
    ];
    const out = buildPublicMetrics(rows);
    expect(out[0].key).toBe("sixty_yard_dash");
    expect(out[0].value).toBe("6.8");
    expect(out[0].verified).toBe(true);
    expect(out.length).toBeLessThanOrEqual(6);
    expect(out[1].label.length).toBeGreaterThan(0);
  });

  it("caps at 6 metrics when 7+ rows provided", () => {
    const rows = Array.from({ length: 10 }, (_, i) => ({
      metric_type: `metric_${i}`,
      value: i,
    }));
    const out = buildPublicMetrics(rows);
    expect(out.length).toBe(6);
  });

  it("formats null value and display_value as empty string", () => {
    const rows = [
      { metric_type: "test_metric", value: null, display_value: null },
    ];
    const out = buildPublicMetrics(rows);
    expect(out[0].value).toBe("");
  });

  it("prioritizes primary over verified when sorting", () => {
    const rows = [
      { metric_type: "primary_unverified", is_primary: true, verified: false },
      { metric_type: "not_primary_verified", is_primary: false, verified: true },
    ];
    const out = buildPublicMetrics(rows);
    expect(out[0].key).toBe("primary_unverified");
    expect(out[1].key).toBe("not_primary_verified");
  });
});

describe("buildTeamHistory", () => {
  it("lists grade teams newest-first and travel teams", () => {
    const details = {
      twelfth_grade_team: "Olmsted Falls Varsity",
      twelfth_grade_coach: "Mike Smith",
      travel_teams: [{ name: "Ohio Warhawks 16U", coach: "Dave Johnson" }],
    };
    const out = buildTeamHistory(details);
    expect(out[0].name).toBe("Olmsted Falls Varsity");
    expect(out.some((e) => e.name === "Ohio Warhawks 16U")).toBe(true);
  });

  it("returns empty array for null details", () => {
    expect(buildTeamHistory(null)).toEqual([]);
  });

  it("orders all 4 grades as 12th, 11th, 10th, 9th", () => {
    const details = {
      ninth_grade_team: "Ninth Grade Team",
      ninth_grade_coach: "Coach 9",
      tenth_grade_team: "Tenth Grade Team",
      tenth_grade_coach: "Coach 10",
      eleventh_grade_team: "Eleventh Grade Team",
      eleventh_grade_coach: "Coach 11",
      twelfth_grade_team: "Twelfth Grade Team",
      twelfth_grade_coach: "Coach 12",
    };
    const out = buildTeamHistory(details);
    expect(out.length).toBe(4);
    expect(out[0].name).toBe("Twelfth Grade Team");
    expect(out[1].name).toBe("Eleventh Grade Team");
    expect(out[2].name).toBe("Tenth Grade Team");
    expect(out[3].name).toBe("Ninth Grade Team");
  });

  it("excludes whitespace-only team names", () => {
    const details = {
      twelfth_grade_team: "   ",
      eleventh_grade_team: "Real Team",
      eleventh_grade_coach: "Coach",
    };
    const out = buildTeamHistory(details);
    expect(out.length).toBe(1);
    expect(out[0].name).toBe("Real Team");
  });
});
