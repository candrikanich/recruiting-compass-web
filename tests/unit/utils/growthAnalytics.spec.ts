import { describe, it, expect } from "vitest";
import {
  dailyActiveUsers,
  windowActiveCount,
  funnelWithDropoff,
  adoption,
  confirmationRate,
  coachMatchRate,
} from "~/utils/growthAnalytics";

const rows = [
  { userId: "a", ts: "2026-08-16T10:00:00Z" },
  { userId: "a", ts: "2026-08-16T12:00:00Z" }, // same user same day → counts once
  { userId: "b", ts: "2026-08-16T09:00:00Z" },
  { userId: "a", ts: "2026-08-17T09:00:00Z" },
];

describe("growthAnalytics", () => {
  it("dailyActiveUsers distinct-counts users per day, zero-filled", () => {
    const r = dailyActiveUsers(
      rows,
      new Date("2026-08-15T00:00:00Z"),
      new Date("2026-08-17T00:00:00Z"),
    );
    expect(r).toEqual([
      { day: "2026-08-15", count: 0 },
      { day: "2026-08-16", count: 2 }, // a + b
      { day: "2026-08-17", count: 1 }, // a
    ]);
  });
  it("windowActiveCount distinct users since a cutoff", () => {
    expect(
      windowActiveCount(
        rows,
        new Date("2026-08-17T00:00:00Z"),
        new Date("2026-08-17T23:59:59Z"),
      ),
    ).toBe(1);
    expect(
      windowActiveCount(
        rows,
        new Date("2026-08-16T00:00:00Z"),
        new Date("2026-08-17T23:59:59Z"),
      ),
    ).toBe(2);
  });
  it("funnelWithDropoff computes % vs previous stage", () => {
    const f = funnelWithDropoff([
      { stage: "sent", count: 100 },
      { stage: "accepted", count: 40 },
    ]);
    expect(f[0].dropoffPct).toBeNull();
    expect(f[1].dropoffPct).toBe(60); // lost 60%
  });
  it("adoption computes distinct users + pct of base", () => {
    const a = adoption({ messages: ["a", "a", "b"], events: ["a"] }, 4);
    expect(a.features.find((x) => x.feature === "messages")?.users).toBe(2);
    expect(a.features.find((x) => x.feature === "messages")?.pct).toBe(50);
  });

  it("confirmationRate excludes pending drafts from the denominator", () => {
    const drafts = [
      { status: "confirmed" },
      { status: "confirmed" },
      { status: "discarded" },
      { status: "pending" },
      { status: "pending" },
    ];
    // 2 confirmed / 3 decided (pending excluded) = 67%
    expect(confirmationRate(drafts)).toBe(67);
  });

  it("confirmationRate is null (not NaN) when every draft is still pending", () => {
    const drafts = [{ status: "pending" }, { status: "pending" }];
    expect(confirmationRate(drafts)).toBeNull();
  });

  it("confirmationRate is null on an empty window", () => {
    expect(confirmationRate([])).toBeNull();
  });

  it("coachMatchRate computes matched share of all drafts", () => {
    const drafts = [
      { matchedCoachId: "c1" },
      { matchedCoachId: "c2" },
      { matchedCoachId: null },
      { matchedCoachId: null },
    ];
    expect(coachMatchRate(drafts)).toBe(50);
  });

  it("coachMatchRate is null (not NaN) on a zero-draft window", () => {
    expect(coachMatchRate([])).toBeNull();
  });
});
