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
    expect(
      getSportCalendar("Basketball", "D1", { gender: "female" }).source,
    ).toContain("WBB");
  });

  it("D2 → all-sports calendar regardless of sport", () => {
    expect(getSportCalendar("Baseball", "D2")).toEqual(
      getSportCalendar("Soccer", "D2"),
    );
  });

  it("D3 → fallback calendar regardless of sport", () => {
    expect(getSportCalendar("Baseball", "D3")).toEqual(
      getSportCalendar("Volleyball", "D3"),
    );
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
    expect(
      getDeadPeriodMessage(new Date("2026-10-15T12:00:00Z"), "Softball", "D1"),
    ).toBeNull();
  });

  it("getDeadPeriodMessage returns a message inside a dead window", () => {
    const msg = getDeadPeriodMessage(
      new Date("2027-07-04T12:00:00Z"),
      "Baseball",
      "D1",
    );
    expect(msg).not.toBeNull();
    expect(msg).toContain("July 4th");
  });

  it("getNextDeadPeriod returns the next dead/shutdown period after the given date", () => {
    const next = getNextDeadPeriod(
      new Date("2027-06-01T00:00:00Z"),
      "Baseball",
      "D1",
    );
    expect(next).not.toBeNull();
    expect(next?.start).toBe("2027-06-19");
  });

  it("getNextDeadPeriod returns null when no future dead period exists", () => {
    const next = getNextDeadPeriod(
      new Date("2028-01-01T00:00:00Z"),
      "Baseball",
      "D1",
    );
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
    expect(
      milestones.some((m) => m.title.includes("Early Signing Period")),
    ).toBe(true);
    // Generic SAT test date milestone
    expect(milestones.some((m) => m.title === "SAT Test Date")).toBe(true);
    // Sorted ascending by date
    const dates = milestones.map((m) => m.date);
    expect([...dates].sort((a, b) => a.localeCompare(b))).toEqual(dates);
  });

  it("getUpcomingMilestones caps GENERIC milestones at limit but still surfaces sport milestones", () => {
    // Contract: `limit` caps the generic (SAT/ACT/deadline) bucket only. The
    // resolved sport calendar's own milestones (signing etc.) always append,
    // so a near-term generic date is never stolen to make room for a far-off
    // signing. Total may exceed `limit` by the sport-milestone count.
    const milestones = getUpcomingMilestones({
      sport: "Baseball",
      division: "D1",
      currentDate: new Date(2026, 7, 1), // local Aug 1 2026
      limit: 2,
    });
    const generics = milestones.filter(
      (m) => m.type === "test" || m.type === "deadline",
    );
    expect(generics.length).toBeLessThanOrEqual(2);
    // MBA signing (2026-11-11) still present despite only 2 generic slots.
    expect(
      milestones.some((m) => m.title.includes("Early Signing Period")),
    ).toBe(true);
  });

  it("getUpcomingMilestones surfaces a senior's signing date, uncrowded by nearer generic test dates", () => {
    // Regression: generic SAT/ACT dates in early 2026 used to fill all 5 slots
    // before Baseball D1's Nov 2026 signing, truncating it out of the list.
    const currentDate = new Date(2026, 0, 1); // local Jan 1 2026
    const milestones = getUpcomingMilestones({
      sport: "Baseball",
      division: "D1",
      graduationYear: 2029, // currentYear (2026) + 3 → senior bucket
      currentDate,
    });
    expect(milestones.some((m) => m.type === "signing")).toBe(true);
    expect(
      milestones.some((m) => m.title.includes("Early Signing Period")),
    ).toBe(true);
  });

  it("getUpcomingMilestones surfaces the signing date with no graduationYear (unfiltered)", () => {
    const milestones = getUpcomingMilestones({
      sport: "Baseball",
      division: "D1",
      currentDate: new Date(2026, 0, 1), // local Jan 1 2026
    });
    expect(milestones.some((m) => m.type === "signing")).toBe(true);
  });

  it("getUpcomingMilestones withholds signing from underclassmen via the grade-type filter", () => {
    // Sophomore bucket keeps only test/ncaa-period — signing (a sport
    // milestone) must NOT append for a freshman/sophomore.
    const milestones = getUpcomingMilestones({
      sport: "Baseball",
      division: "D1",
      graduationYear: 2030, // currentYear (2026) + 4 → underclassman bucket
      currentDate: new Date(2026, 0, 1),
    });
    expect(milestones.some((m) => m.type === "signing")).toBe(false);
  });
});
