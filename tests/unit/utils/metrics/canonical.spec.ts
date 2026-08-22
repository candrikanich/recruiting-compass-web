import { describe, it, expect } from "vitest";
import {
  applyFormat,
  getMetricDef,
  getKnownMetricDef,
  metricTypesForSport,
  customMetricKey,
  METRIC_DEFS,
  SPORT_METRICS,
  OTHER_KEY,
} from "~/utils/metrics/canonical";
import { formatMetricValue } from "~/utils/metricFormat";
import { SPORT_POSITIONS } from "~/utils/positions/canonical";

// Parity with iOS MetricFormatTests / MetricRegistryTests — keep in lockstep.
describe("applyFormat", () => {
  it("decimal drops the leading zero", () => {
    expect(applyFormat({ kind: "decimal", digits: 3, dropLeadingZero: true }, 0.41)).toBe(".410");
    expect(applyFormat({ kind: "decimal", digits: 3, dropLeadingZero: true }, 1.0)).toBe("1.000");
  });
  it("decimal keeps the leading zero", () => {
    expect(applyFormat({ kind: "decimal", digits: 2, dropLeadingZero: false }, 3.45)).toBe("3.45");
    expect(applyFormat({ kind: "decimal", digits: 1, dropLeadingZero: false }, 82.3)).toBe("82.3");
  });
  it("integer rounds", () => {
    expect(applyFormat({ kind: "integer" }, 12)).toBe("12");
    expect(applyFormat({ kind: "integer" }, 12.7)).toBe("13");
  });
  it("percent renders the number sign-less", () => {
    expect(applyFormat({ kind: "percent", digits: 1 }, 45.0)).toBe("45.0");
    expect(applyFormat({ kind: "percent", digits: 1 }, 82.34)).toBe("82.3");
  });
  it("duration renders MM:SS.hh from seconds", () => {
    expect(applyFormat({ kind: "duration" }, 112.34)).toBe("1:52.34");
    expect(applyFormat({ kind: "duration" }, 9.41)).toBe("0:09.41");
    expect(applyFormat({ kind: "duration" }, 581.0)).toBe("9:41.00");
  });
});

describe("registry lookups", () => {
  it("known def resolves; unknown returns undefined via getKnownMetricDef", () => {
    expect(getKnownMetricDef("velocity")?.label).toBe("Fastball Velocity");
    expect(getKnownMetricDef("wingspan_reach")).toBeUndefined();
  });
  it("getMetricDef is total — unknown key humanizes", () => {
    const d = getMetricDef("wingspan_reach");
    expect(d.label).toBe("wingspan reach");
    expect(d.format).toEqual({ kind: "decimal", digits: 2, dropLeadingZero: false });
  });
  it("shared keys have a single def", () => {
    expect(getMetricDef("goals").label).toBe("Goals");
    expect(getMetricDef("vertical_jump").label).toBe("Vertical Jump");
  });
  it("legacy lowerIsBetter flags", () => {
    expect(getMetricDef("era").lowerIsBetter).toBe(true);
    expect(getMetricDef("velocity").lowerIsBetter).toBe(false);
    expect(getMetricDef("erg_2k").lowerIsBetter).toBe(true);
  });
});

describe("formatMetricValue through the registry", () => {
  it("basketball percent renders 45.0 with % unit", () => {
    expect(formatMetricValue("field_goal_pct", 45.0)).toBe("45.0");
    expect(getMetricDef("field_goal_pct").unit).toBe("%");
  });
  it("save_pct is baseball-style .915 (not percent)", () => {
    expect(formatMetricValue("save_pct", 0.915)).toBe(".915");
  });
  it("duration sport metric formats", () => {
    expect(formatMetricValue("race_time", 581.0)).toBe("9:41.00");
  });
});

describe("sport orderings", () => {
  it("basketball order + other appended", () => {
    const t = metricTypesForSport("Basketball");
    expect(t[0]).toBe("points_per_game");
    expect(t[t.length - 1]).toBe(OTHER_KEY);
  });
  it("nil sport returns empty (no baseball fallback)", () => {
    expect(metricTypesForSport(null)).toEqual([]);
    expect(metricTypesForSport(undefined)).toEqual([]);
  });
  it("unrecognized sport returns empty (no baseball fallback)", () => {
    expect(metricTypesForSport("Quidditch")).toEqual([]);
  });
  it("baseball grew to 11 keys, fielding_pct last", () => {
    expect(SPORT_METRICS.Baseball).toHaveLength(11);
    expect(SPORT_METRICS.Baseball[SPORT_METRICS.Baseball.length - 1]).toBe("fielding_pct");
  });
  it("all 17 sports present", () => {
    expect(Object.keys(SPORT_METRICS)).toHaveLength(17);
  });
  it("every sport key has a def, and 'other' is never inline", () => {
    for (const [sport, keys] of Object.entries(SPORT_METRICS)) {
      expect(keys).not.toContain(OTHER_KEY);
      for (const key of keys) {
        expect(getKnownMetricDef(key), `${sport}:${key} missing def`).toBeDefined();
      }
    }
  });
  it("sport keys match the positions registry exactly", () => {
    for (const sport of Object.keys(SPORT_METRICS)) {
      expect(SPORT_POSITIONS[sport], `${sport} not in SPORT_POSITIONS`).toBeDefined();
    }
  });
});

describe("metric icons", () => {
  it("sport-specific keys carry a non-default emoji", () => {
    expect(getMetricDef("points_per_game").icon).toBe("🏀");
    expect(getMetricDef("goals").icon).toBe("⚽");
    expect(getMetricDef("passing_yards").icon).toBe("🏈");
    expect(getMetricDef("event_time").icon).toBe("🏊");
    expect(getMetricDef("scoring_average").icon).toBe("⛳");
    expect(getMetricDef("velocity").icon).toBe("🔥");
  });
  it("unknown/humanized keys fall back to the neutral default", () => {
    expect(getMetricDef("wingspan_reach").icon).toBe("📊");
    expect(getMetricDef(OTHER_KEY).icon).toBe("📊");
  });
  it("every registered def has a non-empty icon", () => {
    for (const d of Object.values(METRIC_DEFS)) {
      expect(d.icon, `${d.key} missing icon`).toBeTruthy();
    }
  });
});

describe("customMetricKey", () => {
  it("snake_cases a custom other-name", () => {
    expect(customMetricKey("Vertical Jump")).toBe("vertical_jump");
  });
  it("collapses whitespace runs to a single underscore (iOS parity)", () => {
    // Byte-identical to iOS MetricFormState.resolvedMetricKey: "Bat  Speed" -> "bat_speed".
    expect(customMetricKey("  Bat   Speed  ")).toBe("bat_speed");
  });
});

describe("registry integrity", () => {
  it("has no duplicate keys (construction would throw)", () => {
    expect(Object.keys(METRIC_DEFS).length).toBeGreaterThan(60);
  });
});
