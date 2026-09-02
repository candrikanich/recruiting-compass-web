import { describe, it, expect, vi, beforeEach } from "vitest";
import type { UnifiedDeadline } from "~/types/deadline";
import type { AppSport, Division } from "~/utils/recruitingCalendar/types";

// Mock the recruiting calendar resolver
vi.mock("~/utils/recruitingCalendar/resolver", () => ({
  getUpcomingMilestones: vi.fn().mockReturnValue([]),
  getSportCalendar: vi.fn().mockReturnValue({ periods: [], milestones: [], source: "", verifiedOn: "" }),
}));

vi.mock("~/utils/recruitingCalendar/calendarData", () => ({
  SEASON_END: new Date("2027-07-31T23:59:59Z"),
}));

vi.mock("~/utils/ncaaRecruitingCalendar", () => ({
  ALL_MILESTONES: [
    { date: "2026-10-03", title: "SAT Test Date", type: "test", division: "ALL" },
    { date: "2026-09-12", title: "ACT Test Date", type: "test", division: "ALL" },
  ],
}));

describe("useRecruitingDeadlines", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty systemDeadlines when no sport or schools", async () => {
    const { systemDeadlines } = await setupComposable({ sport: null, divisions: [], graduationYear: null });
    expect(systemDeadlines.value).toEqual([]);
  });

  it("includes SAT/ACT test dates regardless of sport/division", async () => {
    const { systemDeadlines } = await setupComposable({ sport: "Baseball", divisions: ["D1"], graduationYear: 2027 });
    const testDates = systemDeadlines.value.filter((d: UnifiedDeadline) => d.category === "test");
    expect(testDates.length).toBeGreaterThan(0);
    expect(testDates[0].source).toBe("system");
  });

  it("converts dead period starts to deadline entries with endDate", async () => {
    const { getSportCalendar } = await import("~/utils/recruitingCalendar/resolver");
    vi.mocked(getSportCalendar).mockReturnValue({
      periods: [
        { type: "dead", start: "2026-11-09", end: "2026-11-12", description: "Dead Period", confidence: "HIGH" as const },
      ],
      milestones: [],
      source: "NCAA",
      verifiedOn: "2026-08-01",
    });
    const { systemDeadlines } = await setupComposable({ sport: "Baseball", divisions: ["D1"], graduationYear: 2027 });
    const deadPeriods = systemDeadlines.value.filter((d: UnifiedDeadline) => d.category === "ncaa-period");
    expect(deadPeriods).toHaveLength(1);
    expect(deadPeriods[0].endDate).toBe("2026-11-12");
  });

  it("deduplicates milestones across divisions (SAT appears once)", async () => {
    const { systemDeadlines } = await setupComposable({ sport: "Baseball", divisions: ["D1", "D2"], graduationYear: 2027 });
    const satDates = systemDeadlines.value.filter((d: UnifiedDeadline) => d.label.includes("SAT"));
    // Each SAT date should appear once, not twice
    const uniqueDates = new Set(satDates.map((d: UnifiedDeadline) => d.date));
    expect(satDates.length).toBe(uniqueDates.size);
  });

  it("sets isStale true when current date > SEASON_END", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2027-08-01"));
    const { isStale } = await setupComposable({ sport: "Baseball", divisions: ["D1"], graduationYear: 2028 });
    expect(isStale.value).toBe(true);
    vi.useRealTimers();
  });

  it("all entries have source 'system' and deterministic IDs", async () => {
    const { systemDeadlines } = await setupComposable({ sport: "Baseball", divisions: ["D1"], graduationYear: 2027 });
    for (const d of systemDeadlines.value) {
      expect(d.source).toBe("system");
      expect(d.id).toMatch(/^(system-|milestone-)/);
    }
  });
});

// Helper: sets up the composable with mocked reactive inputs, wired as getters
async function setupComposable(opts: { sport: string | null; divisions: string[]; graduationYear: number | null }) {
  const mod = await import("~/composables/useRecruitingDeadlines");
  return mod.useRecruitingDeadlines(
    () => opts.sport as AppSport | null,
    () => opts.divisions as Division[],
    () => opts.graduationYear,
  );
}
