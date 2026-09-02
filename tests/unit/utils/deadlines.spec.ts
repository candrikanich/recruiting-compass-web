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

  it("keeps both when user deadline collides with system deadline on same date+label", () => {
    const system = [
      makeDeadline({ id: "s1", date: "2026-10-05", label: "SAT Test Date", source: "system", category: "test" }),
    ];
    const user = [
      makeDeadline({ id: "u1", date: "2026-10-05", label: "SAT Test Date", source: "user", category: "custom" }),
    ];
    const result = mergeDeadlines(user, system);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("s1");
    expect(result[1].id).toBe("u1");
  });

  it("deduplicates multiple system deadlines with identical date+label+source", () => {
    const system = [
      makeDeadline({ id: "s1", date: "2026-11-15", label: "Early Signing Period", source: "system", division: "D1" as any }),
      makeDeadline({ id: "s2", date: "2026-11-15", label: "Early Signing Period", source: "system", division: "D2" as any }),
    ];
    const result = mergeDeadlines([], system);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("s1");
  });

  it("deduplicates three system entries from D1/D2/D3 with same key to one", () => {
    const system = [
      makeDeadline({ id: "d1", date: "2026-02-01", label: "NLI Signing", source: "system", division: "D1" as any }),
      makeDeadline({ id: "d2", date: "2026-02-01", label: "NLI Signing", source: "system", division: "D2" as any }),
      makeDeadline({ id: "d3", date: "2026-02-01", label: "NLI Signing", source: "system", division: "D3" as any }),
    ];
    const result = mergeDeadlines([], system);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("d1");
  });

  it("preserves insertion order for deadlines on the same date", () => {
    const system = [
      makeDeadline({ id: "a", date: "2026-06-01", label: "Alpha", source: "system" }),
      makeDeadline({ id: "b", date: "2026-06-01", label: "Beta", source: "system" }),
      makeDeadline({ id: "c", date: "2026-06-01", label: "Charlie", source: "system" }),
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
