import { describe, it, expect } from "vitest";
import {
  getSportCalendar,
  isDeadPeriod,
  isQuietPeriod,
  getDeadPeriodMessage,
  getNextDeadPeriod,
  getUpcomingMilestones,
} from "~/utils/recruitingCalendar";

describe("sport-aware queries", () => {
  it("getSportCalendar returns the resolved sport's calendar (D1)", () => {
    expect(getSportCalendar("Softball", "D1").source).toContain("WSB");
    expect(getSportCalendar("Basketball", "D1", { gender: "female" }).source).toContain("WBB");
  });

  it("D2 → all-sports calendar regardless of sport", () => {
    expect(getSportCalendar("Baseball", "D2")).toEqual(getSportCalendar("Soccer", "D2"));
  });

  it("D3 → fallback calendar regardless of sport", () => {
    expect(getSportCalendar("Baseball", "D3")).toEqual(getSportCalendar("Volleyball", "D3"));
  });

  it("isDeadPeriod is sport-specific (regression: non-baseball ≠ baseball dates)", () => {
    // MBA (Baseball, D1) has a HIGH-confidence "Dead Period (July 4th)" window
    // 2027-07-03..2027-07-05 (calendarData.ts). Tennis resolves to "Other",
    // whose only D1 period is the Nov 9-12 fall-signing dead period — it has
    // no window anywhere near July 4th, so the two sports must disagree here.
    const d = new Date("2027-07-04T12:00:00Z"); // July-4 dead for baseball
    expect(isDeadPeriod(d, "Baseball", "D1")).toBe(true);
    // a sport whose data has no July-4 dead window must return false
    expect(isDeadPeriod(d, "Tennis", "D1")).toBe(false); // Tennis → Other
  });

  it("isQuietPeriod is sport-specific", () => {
    // MBA quiet period 2026-08-17..2026-09-10 (calendarData.ts).
    const d = new Date("2026-08-20T12:00:00Z");
    expect(isQuietPeriod(d, "Baseball", "D1")).toBe(true);
    expect(isQuietPeriod(d, "Tennis", "D1")).toBe(false);
  });

  it("getDeadPeriodMessage returns null outside any dead window", () => {
    expect(getDeadPeriodMessage(new Date("2026-10-15T12:00:00Z"), "Softball", "D1")).toBeNull();
  });

  it("getDeadPeriodMessage returns a message inside a dead window", () => {
    const msg = getDeadPeriodMessage(new Date("2027-07-04T12:00:00Z"), "Baseball", "D1");
    expect(msg).not.toBeNull();
    expect(msg).toContain("July 4th");
  });

  it("getNextDeadPeriod returns the next dead/shutdown period after the given date", () => {
    const next = getNextDeadPeriod(new Date("2027-06-01T00:00:00Z"), "Baseball", "D1");
    expect(next).not.toBeNull();
    expect(next?.start).toBe("2027-06-19");
  });

  it("getNextDeadPeriod returns null when no future dead period exists", () => {
    const next = getNextDeadPeriod(new Date("2028-01-01T00:00:00Z"), "Baseball", "D1");
    expect(next).toBeNull();
  });

  it("getUpcomingMilestones merges the resolved sport calendar's milestones with generic ones", () => {
    const milestones = getUpcomingMilestones({
      sport: "Baseball",
      division: "D1",
      currentDate: new Date("2026-08-01T00:00:00Z"),
      limit: 50,
    });
    // MBA-specific signing milestone
    expect(milestones.some((m) => m.title.includes("Early Signing Period"))).toBe(true);
    // Generic SAT test date milestone
    expect(milestones.some((m) => m.title === "SAT Test Date")).toBe(true);
    // Sorted ascending by date
    const dates = milestones.map((m) => m.date);
    expect([...dates].sort((a, b) => a.localeCompare(b))).toEqual(dates);
  });

  it("getUpcomingMilestones respects limit", () => {
    const milestones = getUpcomingMilestones({
      sport: "Baseball",
      division: "D1",
      currentDate: new Date("2026-08-01T00:00:00Z"),
      limit: 2,
    });
    expect(milestones.length).toBeLessThanOrEqual(2);
  });
});
