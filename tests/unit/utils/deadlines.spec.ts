import { describe, it, expect } from "vitest";
import {
  mergeDeadlines,
  groupByMonth,
  splitUpcomingPast,
} from "~/utils/deadlines";
import type { UnifiedDeadline } from "~/types/deadline";

function makeDeadline(
  overrides: Partial<UnifiedDeadline> & { id: string; date: string },
): UnifiedDeadline {
  return {
    label: "Test",
    category: "custom",
    source: "user",
    ...overrides,
  };
}

describe("mergeDeadlines", () => {
  it("sorts merged deadlines by date ascending", () => {
    const user = [makeDeadline({ id: "u1", date: "2026-12-01", source: "user" })];
    const system = [makeDeadline({ id: "s1", date: "2026-11-01", source: "system" })];
    const result = mergeDeadlines(user, system);
    expect(result.map((d) => d.id)).toEqual(["s1", "u1"]);
  });

  it("deduplicates by date + label + source", () => {
    const a = [makeDeadline({ id: "a1", date: "2026-11-01", label: "SAT", source: "system" })];
    const b = [makeDeadline({ id: "a2", date: "2026-11-01", label: "SAT", source: "system" })];
    expect(mergeDeadlines(a, b)).toHaveLength(1);
  });

  it("keeps entries with same date+label but different source", () => {
    const user = [makeDeadline({ id: "u1", date: "2026-11-01", label: "App Due", source: "user" })];
    const system = [makeDeadline({ id: "s1", date: "2026-11-01", label: "App Due", source: "system" })];
    expect(mergeDeadlines(user, system)).toHaveLength(2);
  });

  it("returns empty array for empty inputs", () => {
    expect(mergeDeadlines([], [])).toEqual([]);
  });
});

describe("groupByMonth", () => {
  it("groups deadlines by YYYY-MM key", () => {
    const deadlines = [
      makeDeadline({ id: "1", date: "2026-09-01" }),
      makeDeadline({ id: "2", date: "2026-09-15" }),
      makeDeadline({ id: "3", date: "2026-10-01" }),
    ];
    const grouped = groupByMonth(deadlines);
    expect(grouped.get("2026-09")).toHaveLength(2);
    expect(grouped.get("2026-10")).toHaveLength(1);
  });

  it("returns empty map for empty input", () => {
    expect(groupByMonth([])).toEqual(new Map());
  });
});

describe("splitUpcomingPast", () => {
  it("splits by today boundary (today = upcoming)", () => {
    const deadlines = [
      makeDeadline({ id: "past", date: "2026-08-01" }),
      makeDeadline({ id: "today", date: "2026-09-02" }),
      makeDeadline({ id: "future", date: "2026-12-01" }),
    ];
    const { upcoming, past } = splitUpcomingPast(deadlines, "2026-09-02");
    expect(past.map((d) => d.id)).toEqual(["past"]);
    expect(upcoming.map((d) => d.id)).toEqual(["today", "future"]);
  });
});
