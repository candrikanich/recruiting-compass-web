import { describe, it, expect } from "vitest";
import {
  mergeDeadlines,
  groupByMonth,
  splitUpcomingPast,
  filterDeadlines,
  buildCalendarGrid,
  groupByDate,
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
    const user = [
      makeDeadline({ id: "u1", date: "2026-12-01", source: "user" }),
    ];
    const system = [
      makeDeadline({ id: "s1", date: "2026-11-01", source: "system" }),
    ];
    const result = mergeDeadlines(user, system);
    expect(result.map((d) => d.id)).toEqual(["s1", "u1"]);
  });

  it("deduplicates by date + label + source", () => {
    const a = [
      makeDeadline({
        id: "a1",
        date: "2026-11-01",
        label: "SAT",
        source: "system",
      }),
    ];
    const b = [
      makeDeadline({
        id: "a2",
        date: "2026-11-01",
        label: "SAT",
        source: "system",
      }),
    ];
    expect(mergeDeadlines(a, b)).toHaveLength(1);
  });

  it("keeps entries with same date+label but different source", () => {
    const user = [
      makeDeadline({
        id: "u1",
        date: "2026-11-01",
        label: "App Due",
        source: "user",
      }),
    ];
    const system = [
      makeDeadline({
        id: "s1",
        date: "2026-11-01",
        label: "App Due",
        source: "system",
      }),
    ];
    expect(mergeDeadlines(user, system)).toHaveLength(2);
  });

  it("returns empty array for empty inputs", () => {
    expect(mergeDeadlines([], [])).toEqual([]);
  });

  it("keeps both when user deadline collides with system deadline on same date+label", () => {
    const system = [
      makeDeadline({
        id: "s1",
        date: "2026-10-05",
        label: "SAT Test Date",
        source: "system",
        category: "test",
      }),
    ];
    const user = [
      makeDeadline({
        id: "u1",
        date: "2026-10-05",
        label: "SAT Test Date",
        source: "user",
        category: "custom",
      }),
    ];
    const result = mergeDeadlines(user, system);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("s1");
    expect(result[1].id).toBe("u1");
  });

  it("deduplicates multiple system deadlines with identical date+label+source", () => {
    const system = [
      makeDeadline({
        id: "s1",
        date: "2026-11-15",
        label: "Early Signing Period",
        source: "system",
        division: "D1" as any,
      }),
      makeDeadline({
        id: "s2",
        date: "2026-11-15",
        label: "Early Signing Period",
        source: "system",
        division: "D2" as any,
      }),
    ];
    const result = mergeDeadlines([], system);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("s1");
  });

  it("deduplicates three system entries from D1/D2/D3 with same key to one", () => {
    const system = [
      makeDeadline({
        id: "d1",
        date: "2026-02-01",
        label: "NLI Signing",
        source: "system",
        division: "D1" as any,
      }),
      makeDeadline({
        id: "d2",
        date: "2026-02-01",
        label: "NLI Signing",
        source: "system",
        division: "D2" as any,
      }),
      makeDeadline({
        id: "d3",
        date: "2026-02-01",
        label: "NLI Signing",
        source: "system",
        division: "D3" as any,
      }),
    ];
    const result = mergeDeadlines([], system);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("d1");
  });

  it("preserves insertion order for deadlines on the same date", () => {
    const system = [
      makeDeadline({
        id: "a",
        date: "2026-06-01",
        label: "Alpha",
        source: "system",
      }),
      makeDeadline({
        id: "b",
        date: "2026-06-01",
        label: "Beta",
        source: "system",
      }),
      makeDeadline({
        id: "c",
        date: "2026-06-01",
        label: "Charlie",
        source: "system",
      }),
    ];
    const result = mergeDeadlines([], system);
    expect(result.map((d) => d.id)).toEqual(["a", "b", "c"]);
  });

  it("handles large merge with overlapping entries", () => {
    const system: UnifiedDeadline[] = Array.from({ length: 10 }, (_, i) =>
      makeDeadline({
        id: `s${i}`,
        date: `2026-${String(i + 1).padStart(2, "0")}-15`,
        label: `System Event ${i}`,
        source: "system",
      }),
    );
    const user: UnifiedDeadline[] = Array.from({ length: 5 }, (_, i) =>
      makeDeadline({
        id: `u${i}`,
        date: `2026-${String(i + 1).padStart(2, "0")}-15`,
        label: i < 2 ? `System Event ${i}` : `User Event ${i}`,
        source: "user",
      }),
    );
    const result = mergeDeadlines(user, system);
    expect(result).toHaveLength(15);
    for (let i = 1; i < result.length; i++) {
      expect(result[i].date >= result[i - 1].date).toBe(true);
    }
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

  it("returns all as upcoming when none are past", () => {
    const deadlines = [
      makeDeadline({ id: "a", date: "2027-01-01" }),
      makeDeadline({ id: "b", date: "2027-06-15" }),
    ];
    const { upcoming, past } = splitUpcomingPast(deadlines, "2026-09-02");
    expect(upcoming).toHaveLength(2);
    expect(past).toHaveLength(0);
  });

  it("returns all as past when none are upcoming", () => {
    const deadlines = [
      makeDeadline({ id: "a", date: "2025-03-01" }),
      makeDeadline({ id: "b", date: "2026-01-01" }),
    ];
    const { upcoming, past } = splitUpcomingPast(deadlines, "2026-09-02");
    expect(upcoming).toHaveLength(0);
    expect(past).toHaveLength(2);
  });

  it("returns both empty for empty input", () => {
    const { upcoming, past } = splitUpcomingPast([], "2026-09-02");
    expect(upcoming).toEqual([]);
    expect(past).toEqual([]);
  });
});

describe("filterDeadlines", () => {
  const deadlines = [
    makeDeadline({
      id: "1",
      date: "2026-09-01",
      label: "Stanford App",
      category: "application",
    }),
    makeDeadline({
      id: "2",
      date: "2026-09-15",
      label: "SAT Test Date",
      category: "test",
    }),
    makeDeadline({
      id: "3",
      date: "2026-10-01",
      label: "Campus Visit",
      category: "visit",
    }),
  ];

  it("returns all deadlines when no filters are set", () => {
    expect(filterDeadlines(deadlines, {})).toHaveLength(3);
  });

  it("filters by category", () => {
    const result = filterDeadlines(deadlines, { category: "test" });
    expect(result.map((d) => d.id)).toEqual(["2"]);
  });

  it("filters by search text, case-insensitive, matching label", () => {
    const result = filterDeadlines(deadlines, { search: "stanford" });
    expect(result.map((d) => d.id)).toEqual(["1"]);
  });

  it("combines category and search filters (AND)", () => {
    const result = filterDeadlines(deadlines, {
      category: "visit",
      search: "campus",
    });
    expect(result.map((d) => d.id)).toEqual(["3"]);
  });

  it("returns empty array when nothing matches", () => {
    const result = filterDeadlines(deadlines, { search: "nonexistent" });
    expect(result).toEqual([]);
  });

  it("ignores blank/whitespace-only search text", () => {
    const result = filterDeadlines(deadlines, { search: "   " });
    expect(result).toHaveLength(3);
  });
});

describe("buildCalendarGrid", () => {
  it("returns 42 local YYYY-MM-DD date keys, Sunday-start, spilling into adjacent months", () => {
    // September 2026: Sept 1 is a Tuesday, so the grid starts Sunday Aug 30
    // and ends Saturday Oct 10 (30+2+... = 42 cells).
    const grid = buildCalendarGrid(2026, 8); // month is 0-indexed (8 = September)
    expect(grid).toHaveLength(42);
    expect(grid[0]).toBe("2026-08-30");
    expect(grid[2]).toBe("2026-09-01");
    expect(grid[41]).toBe("2026-10-10");
  });

  it("handles a month starting on Sunday with no leading spillover", () => {
    // Nov 1, 2026 is a Sunday
    const grid = buildCalendarGrid(2026, 10);
    expect(grid[0]).toBe("2026-11-01");
  });

  it("handles December→January year rollover", () => {
    const grid = buildCalendarGrid(2026, 11);
    expect(grid.every((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))).toBe(true);
    expect(grid[grid.length - 1] >= "2027-01-01").toBe(true);
  });
});

describe("groupByDate", () => {
  it("groups deadlines by their date key", () => {
    const deadlines = [
      makeDeadline({ id: "1", date: "2026-09-01" }),
      makeDeadline({ id: "2", date: "2026-09-01" }),
      makeDeadline({ id: "3", date: "2026-09-05" }),
    ];
    const grouped = groupByDate(deadlines);
    expect(grouped.get("2026-09-01")).toHaveLength(2);
    expect(grouped.get("2026-09-05")).toHaveLength(1);
    expect(grouped.get("2026-09-06")).toBeUndefined();
  });

  it("returns empty map for empty input", () => {
    expect(groupByDate([])).toEqual(new Map());
  });
});
