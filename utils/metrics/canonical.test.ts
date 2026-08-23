import { describe, it, expect } from "vitest";
import {
  SPORT_METRIC_GROUPS,
  SPORT_METRICS,
  metricGroupsForSport,
} from "./canonical";

const GROUPED_SPORTS = [
  "Baseball",
  "Softball",
  "Basketball",
  "Football",
  "Track & Field",
  "Volleyball",
] as const;

describe("SPORT_METRIC_GROUPS", () => {
  it("covers exactly the 6 metric-dense sports", () => {
    expect(Object.keys(SPORT_METRIC_GROUPS).sort()).toEqual(
      [...GROUPED_SPORTS].sort(),
    );
  });

  it("every grouped key exists in that sport's metric set", () => {
    for (const sport of GROUPED_SPORTS) {
      const sportKeys = new Set(SPORT_METRICS[sport]);
      for (const group of SPORT_METRIC_GROUPS[sport]) {
        for (const key of group.keys) {
          expect(sportKeys.has(key), `${sport}/${group.category}: ${key}`).toBe(
            true,
          );
        }
      }
    }
  });

  it("has no duplicate key within a sport's groups", () => {
    for (const sport of GROUPED_SPORTS) {
      const seen = new Set<string>();
      for (const group of SPORT_METRIC_GROUPS[sport]) {
        for (const key of group.keys) {
          expect(seen.has(key), `${sport}: duplicate ${key}`).toBe(false);
          seen.add(key);
        }
      }
    }
  });

  it("shares one grouping between Baseball and Softball", () => {
    expect(SPORT_METRIC_GROUPS.Softball).toBe(SPORT_METRIC_GROUPS.Baseball);
  });
});

describe("metricGroupsForSport", () => {
  it("returns groups for a grouped sport", () => {
    const groups = metricGroupsForSport("Basketball");
    expect(groups.map((g) => g.category)).toEqual([
      "Scoring",
      "Playmaking",
      "Defense",
      "Athleticism",
    ]);
  });

  it("returns [] for an ungrouped sport (Soccer)", () => {
    expect(metricGroupsForSport("Soccer")).toEqual([]);
  });

  it("returns [] for nil / unknown sport", () => {
    expect(metricGroupsForSport(null)).toEqual([]);
    expect(metricGroupsForSport(undefined)).toEqual([]);
    expect(metricGroupsForSport("Quidditch")).toEqual([]);
  });
});
