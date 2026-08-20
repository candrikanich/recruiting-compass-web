import { describe, it, expect } from "vitest";
import { groupCounts, weeklyCounts } from "~/utils/adminBreakdown";

describe("groupCounts", () => {
  it("groups by field and sorts by count desc", () => {
    const rows = [
      { division: "D1" },
      { division: "D1" },
      { division: "D3" },
      { division: "D1" },
      { division: "D3" },
      { division: "NAIA" },
    ];
    expect(groupCounts(rows, "division")).toEqual([
      { value: "D1", count: 3 },
      { value: "D3", count: 2 },
      { value: "NAIA", count: 1 },
    ]);
  });

  it("collapses null/undefined/empty into one bucket, always sorted last", () => {
    const rows = [
      { division: null },
      { division: undefined },
      { division: "" },
      { division: "D1" },
    ];
    const result = groupCounts(rows, "division");
    expect(result[result.length - 1]).toEqual({ value: "Unknown", count: 3 });
    expect(result[0]).toEqual({ value: "D1", count: 1 });
  });

  it("honors a custom null label", () => {
    const rows = [{ role: null }];
    expect(groupCounts(rows, "role", "None")).toEqual([
      { value: "None", count: 1 },
    ]);
  });

  it("returns an empty array for no rows", () => {
    expect(groupCounts([], "division")).toEqual([]);
  });
});

describe("weeklyCounts", () => {
  const now = new Date("2026-08-20T12:00:00Z"); // Thursday

  it("returns exactly `weeks` buckets, oldest first", () => {
    const result = weeklyCounts([], "created_at", 4, now);
    expect(result).toHaveLength(4);
    const dates = result.map((b) => b.weekStart);
    expect([...dates].sort()).toEqual(dates); // ascending
  });

  it("buckets rows into their UTC-Monday week", () => {
    const rows = [
      { created_at: "2026-08-17T09:00:00Z" }, // Mon, current week
      { created_at: "2026-08-20T01:00:00Z" }, // Thu, current week
      { created_at: "2026-08-10T23:00:00Z" }, // prior week
    ];
    const result = weeklyCounts(rows, "created_at", 4, now);
    expect(result[result.length - 1]).toEqual({
      weekStart: "2026-08-17",
      count: 2,
    });
    expect(result[result.length - 2]).toEqual({
      weekStart: "2026-08-10",
      count: 1,
    });
  });

  it("ignores rows outside the window and unparseable timestamps", () => {
    const rows = [
      { created_at: "2020-01-01T00:00:00Z" }, // way before window
      { created_at: "not-a-date" },
      { created_at: null },
    ];
    const result = weeklyCounts(rows, "created_at", 4, now);
    expect(result.reduce((s, b) => s + b.count, 0)).toBe(0);
  });
});
