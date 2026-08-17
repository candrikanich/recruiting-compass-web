import { describe, it, expect } from "vitest";
import { dayBuckets, countByDay } from "~/server/utils/adminQuery";

describe("adminQuery", () => {
  it("dayBuckets is inclusive of both ends (UTC)", () => {
    expect(dayBuckets(new Date("2026-08-15T00:00:00Z"), new Date("2026-08-17T23:59:59Z"))).toEqual([
      "2026-08-15",
      "2026-08-16",
      "2026-08-17",
    ]);
  });

  it("countByDay zero-fills missing days", () => {
    const rows = [{ created_at: "2026-08-16T10:00:00Z" }, { created_at: "2026-08-16T12:00:00Z" }];
    expect(countByDay(rows, new Date("2026-08-15T00:00:00Z"), new Date("2026-08-17T00:00:00Z"))).toEqual([
      { day: "2026-08-15", count: 0 },
      { day: "2026-08-16", count: 2 },
      { day: "2026-08-17", count: 0 },
    ]);
  });

  it("countByDay buckets a custom timestamp field", () => {
    const rows = [{ sent_at: "2026-08-16T10:00:00Z" }];
    const r = countByDay(rows, new Date("2026-08-16T00:00:00Z"), new Date("2026-08-16T00:00:00Z"), "sent_at");
    expect(r).toEqual([{ day: "2026-08-16", count: 1 }]);
  });

  it("countByDay does not throw on a row missing the field, and it matches no bucket", () => {
    const rows = [{ created_at: "2026-08-16T10:00:00Z" }, {} as unknown as { created_at: string }];
    expect(() =>
      countByDay(rows as Record<string, string>[], new Date("2026-08-15T00:00:00Z"), new Date("2026-08-17T00:00:00Z")),
    ).not.toThrow();
    const r = countByDay(rows as Record<string, string>[], new Date("2026-08-15T00:00:00Z"), new Date("2026-08-17T00:00:00Z"));
    expect(r).toEqual([
      { day: "2026-08-15", count: 0 },
      { day: "2026-08-16", count: 1 },
      { day: "2026-08-17", count: 0 },
    ]);
  });
});
