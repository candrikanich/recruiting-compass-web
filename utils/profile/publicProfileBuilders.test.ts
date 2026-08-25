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
});
