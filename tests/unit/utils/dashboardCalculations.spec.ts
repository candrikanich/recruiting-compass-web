import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  calculateSchoolSizeBreakdown,
  calculateContactsThisMonth,
  calculateTotalOffers,
  calculateAcceptedOffers,
  getUpcomingEvents,
  getTopMetrics,
} from "~/utils/dashboardCalculations";
import type { School, Interaction, Offer } from "~/types/models";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSchool(studentSize: number | null | undefined): School {
  return {
    id: `school-${studentSize ?? "null"}`,
    name: `School ${studentSize}`,
    academic_info: studentSize !== undefined ? { student_size: studentSize } : undefined,
  } as unknown as School;
}

function makeInteraction(occurredAt: string): Interaction {
  return {
    id: `int-${occurredAt}`,
    type: "email",
    direction: "outbound",
    occurred_at: occurredAt,
  } as Interaction;
}

function makeOffer(status: Offer["status"]): Offer {
  return {
    id: `offer-${status}-${Math.random()}`,
    school_id: "school-1",
    offer_type: "scholarship",
    offer_date: "2026-01-01",
    status,
  } as Offer;
}

// ---------------------------------------------------------------------------
// calculateSchoolSizeBreakdown
// ---------------------------------------------------------------------------

describe("calculateSchoolSizeBreakdown", () => {
  it("returns all-zero breakdown for empty array", () => {
    const result = calculateSchoolSizeBreakdown([]);
    expect(result).toEqual({
      "Very Small": 0,
      Small: 0,
      Medium: 0,
      Large: 0,
      "Very Large": 0,
    });
  });

  it("counts Very Small schools (< 1,000 students)", () => {
    const result = calculateSchoolSizeBreakdown([makeSchool(500), makeSchool(999)]);
    expect(result["Very Small"]).toBe(2);
  });

  it("counts Small schools (1,000–4,999 students)", () => {
    const result = calculateSchoolSizeBreakdown([makeSchool(1000), makeSchool(4999)]);
    expect(result["Small"]).toBe(2);
  });

  it("counts Medium schools (5,000–9,999 students)", () => {
    const result = calculateSchoolSizeBreakdown([makeSchool(5000), makeSchool(9999)]);
    expect(result["Medium"]).toBe(2);
  });

  it("counts Large schools (10,000–19,999 students)", () => {
    const result = calculateSchoolSizeBreakdown([makeSchool(10000), makeSchool(19999)]);
    expect(result["Large"]).toBe(2);
  });

  it("counts Very Large schools (20,000+ students)", () => {
    const result = calculateSchoolSizeBreakdown([makeSchool(20000), makeSchool(50000)]);
    expect(result["Very Large"]).toBe(2);
  });

  it("ignores schools without academic_info", () => {
    const school: School = { id: "no-info", name: "No Info" } as School;
    const result = calculateSchoolSizeBreakdown([school]);
    const total = Object.values(result).reduce((a, b) => a + b, 0);
    expect(total).toBe(0);
  });

  it("ignores schools with null student_size", () => {
    const result = calculateSchoolSizeBreakdown([makeSchool(null)]);
    const total = Object.values(result).reduce((a, b) => a + b, 0);
    expect(total).toBe(0);
  });

  it("ignores schools with zero student_size", () => {
    const result = calculateSchoolSizeBreakdown([makeSchool(0)]);
    const total = Object.values(result).reduce((a, b) => a + b, 0);
    expect(total).toBe(0);
  });

  it("counts a mixed set correctly", () => {
    const schools = [
      makeSchool(500),     // Very Small
      makeSchool(2000),    // Small
      makeSchool(7500),    // Medium
      makeSchool(15000),   // Large
      makeSchool(25000),   // Very Large
      makeSchool(null),    // ignored
    ];
    const result = calculateSchoolSizeBreakdown(schools);
    expect(result["Very Small"]).toBe(1);
    expect(result["Small"]).toBe(1);
    expect(result["Medium"]).toBe(1);
    expect(result["Large"]).toBe(1);
    expect(result["Very Large"]).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// calculateContactsThisMonth
// ---------------------------------------------------------------------------

describe("calculateContactsThisMonth", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-19T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 0 for empty array", () => {
    expect(calculateContactsThisMonth([])).toBe(0);
  });

  it("counts interactions that occurred this month", () => {
    // Use explicit UTC timestamps to avoid local timezone offset issues
    const interactions = [
      makeInteraction("2026-03-05T12:00:00Z"),
      makeInteraction("2026-03-15T12:00:00Z"),
      makeInteraction("2026-03-19T10:00:00Z"), // before noon UTC = before mocked now
    ];
    expect(calculateContactsThisMonth(interactions)).toBe(3);
  });

  it("excludes interactions from last month", () => {
    const interactions = [
      makeInteraction("2026-02-15T12:00:00"),
      makeInteraction("2026-03-10T12:00:00"),
    ];
    expect(calculateContactsThisMonth(interactions)).toBe(1);
  });

  it("excludes interactions from future months", () => {
    const interactions = [
      makeInteraction("2026-04-10T12:00:00"),
      makeInteraction("2026-03-10T12:00:00"),
    ];
    expect(calculateContactsThisMonth(interactions)).toBe(1);
  });

  it("falls back to created_at when occurred_at is absent", () => {
    const interaction: Interaction = {
      id: "int-fallback",
      type: "email",
      direction: "outbound",
      created_at: "2026-03-05T00:00:00Z",
    } as Interaction;
    expect(calculateContactsThisMonth([interaction])).toBe(1);
  });

  it("excludes interaction with empty date string", () => {
    const interaction: Interaction = {
      id: "int-empty",
      type: "email",
      direction: "outbound",
      occurred_at: "",
    } as Interaction;
    // new Date("") is Invalid Date, which is not >= startOfMonth
    expect(calculateContactsThisMonth([interaction])).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// calculateTotalOffers
// ---------------------------------------------------------------------------

describe("calculateTotalOffers", () => {
  it("returns 0 for empty array", () => {
    expect(calculateTotalOffers([])).toBe(0);
  });

  it("returns the length of the offers array", () => {
    const offers = [
      makeOffer("pending"),
      makeOffer("accepted"),
      makeOffer("declined"),
    ];
    expect(calculateTotalOffers(offers)).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// calculateAcceptedOffers
// ---------------------------------------------------------------------------

describe("calculateAcceptedOffers", () => {
  it("returns 0 for empty array", () => {
    expect(calculateAcceptedOffers([])).toBe(0);
  });

  it("counts only accepted offers", () => {
    const offers = [
      makeOffer("accepted"),
      makeOffer("accepted"),
      makeOffer("pending"),
      makeOffer("declined"),
      makeOffer("expired"),
    ];
    expect(calculateAcceptedOffers(offers)).toBe(2);
  });

  it("returns 0 when no offers are accepted", () => {
    const offers = [makeOffer("pending"), makeOffer("declined"), makeOffer("expired")];
    expect(calculateAcceptedOffers(offers)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// getUpcomingEvents
// ---------------------------------------------------------------------------

describe("getUpcomingEvents", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-19T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns empty array for empty input", () => {
    expect(getUpcomingEvents([])).toEqual([]);
  });

  it("excludes past events", () => {
    const events = [{ start_date: "2026-03-18T00:00:00Z", name: "Past" }];
    expect(getUpcomingEvents(events)).toHaveLength(0);
  });

  it("includes today's events (same time as now)", () => {
    // start_date exactly equal to now — should be included (>=)
    const events = [{ start_date: "2026-03-19T12:00:00Z", name: "Now" }];
    expect(getUpcomingEvents(events)).toHaveLength(1);
  });

  it("includes future events", () => {
    const events = [
      { start_date: "2026-03-20T00:00:00Z", name: "Tomorrow" },
      { start_date: "2026-04-01T00:00:00Z", name: "April" },
    ];
    expect(getUpcomingEvents(events)).toHaveLength(2);
  });

  it("returns events sorted ascending by start_date", () => {
    const events = [
      { start_date: "2026-04-10T00:00:00Z", name: "Later" },
      { start_date: "2026-03-25T00:00:00Z", name: "Sooner" },
      { start_date: "2026-03-20T00:00:00Z", name: "Soonest" },
    ];
    const result = getUpcomingEvents(events);
    expect(result[0].name).toBe("Soonest");
    expect(result[1].name).toBe("Sooner");
    expect(result[2].name).toBe("Later");
  });

  it("limits results to at most 5 events", () => {
    const events = Array.from({ length: 10 }, (_, i) => ({
      start_date: `2026-04-${String(i + 1).padStart(2, "0")}T00:00:00Z`,
      name: `Event ${i + 1}`,
    }));
    expect(getUpcomingEvents(events)).toHaveLength(5);
  });

  it("filters out past events and returns the 5 soonest future ones", () => {
    const events = [
      { start_date: "2026-03-01T00:00:00Z", name: "Past" },
      ...Array.from({ length: 7 }, (_, i) => ({
        start_date: `2026-04-${String(i + 1).padStart(2, "0")}T00:00:00Z`,
        name: `Future ${i + 1}`,
      })),
    ];
    const result = getUpcomingEvents(events);
    expect(result).toHaveLength(5);
    expect(result[0].name).toBe("Future 1");
  });
});

// ---------------------------------------------------------------------------
// getTopMetrics
// ---------------------------------------------------------------------------

describe("getTopMetrics", () => {
  it("returns empty array for empty input", () => {
    expect(getTopMetrics([])).toEqual([]);
  });

  it("returns the first 3 items by default", () => {
    const metrics = [1, 2, 3, 4, 5];
    expect(getTopMetrics(metrics)).toEqual([1, 2, 3]);
  });

  it("returns all items when array is smaller than default count", () => {
    const metrics = [10, 20];
    expect(getTopMetrics(metrics)).toEqual([10, 20]);
  });

  it("respects a custom count parameter", () => {
    const metrics = ["a", "b", "c", "d", "e"];
    expect(getTopMetrics(metrics, 2)).toEqual(["a", "b"]);
    expect(getTopMetrics(metrics, 5)).toEqual(["a", "b", "c", "d", "e"]);
  });

  it("returns all items when count exceeds array length", () => {
    const metrics = [1, 2];
    expect(getTopMetrics(metrics, 10)).toEqual([1, 2]);
  });

  it("returns empty array when count is 0", () => {
    expect(getTopMetrics([1, 2, 3], 0)).toEqual([]);
  });
});
