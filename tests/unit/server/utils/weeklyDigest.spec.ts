import { describe, it, expect, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  formatDigestLines,
  buildWeeklyDigestData,
} from "~/server/utils/weeklyDigest";

describe("formatDigestLines", () => {
  it("pluralizes counts correctly", () => {
    const lines = formatDigestLines({
      interactions: 1,
      events: 0,
      metrics: 2,
    });
    expect(lines).toEqual([
      "1 coach interaction logged this week",
      "0 events attended",
      "2 performance metrics recorded",
    ]);
  });

  it("renders a fully empty week without crashing", () => {
    const lines = formatDigestLines({ interactions: 0, events: 0, metrics: 0 });
    expect(lines).toHaveLength(3);
    expect(lines[0]).toContain("0 coach interactions");
  });
});

describe("fetchUpcomingDeadlines with user_deadlines", () => {
  // Filters rows the way Postgres gte/lte on `deadline_date` would, so the
  // horizon-boundary tests exercise real filtering rather than a pass-through stub.
  function buildChain(rows: Array<Record<string, unknown>>) {
    let filtered = rows;
    const chain: Record<string, unknown> = {};
    chain.select = vi.fn(() => chain);
    chain.eq = vi.fn(() => chain);
    chain.in = vi.fn(() => chain);
    chain.gte = vi.fn((field: string, value: string) => {
      filtered = filtered.filter((r) => (r[field] as string) >= value);
      return chain;
    });
    chain.lte = vi.fn((field: string, value: string) => {
      filtered = filtered.filter((r) => (r[field] as string) <= value);
      return chain;
    });
    chain.then = (resolve: (v: unknown) => void) =>
      resolve({ data: filtered, error: null });
    return chain;
  }

  function makeSupabase(userDeadlines: Array<Record<string, unknown>>) {
    const fromMock = vi.fn((table: string) => {
      if (table === "user_deadlines") return buildChain(userDeadlines);
      return buildChain([]);
    });
    return { from: fromMock } as unknown as SupabaseClient;
  }

  it("includes user deadlines within 14-day horizon", async () => {
    const now = new Date("2026-08-16T12:00:00.000Z");
    const inRange = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const supabase = makeSupabase([
      { label: "Stanford App", deadline_date: inRange },
    ]);

    const data = await buildWeeklyDigestData("u-1", supabase, now);

    expect(data?.upcomingDeadlines).toContainEqual({
      label: "Stanford App",
      deadline_date: inRange,
    });
  });

  it("excludes user deadlines outside the 14-day horizon", async () => {
    const now = new Date("2026-08-16T12:00:00.000Z");
    const outOfRange = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const supabase = makeSupabase([
      { label: "Far Off App", deadline_date: outOfRange },
    ]);

    const data = await buildWeeklyDigestData("u-1", supabase, now);

    expect(data?.upcomingDeadlines ?? []).not.toContainEqual(
      expect.objectContaining({ label: "Far Off App" }),
    );
  });
});
