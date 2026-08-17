import { describe, it, expect, vi, beforeEach } from "vitest";

// Per-table row fixtures the stub returns based on table name.
const data: Record<string, any[]> = {};
const counts: Record<string, number> = {};
function stub(table: string) {
  let gteCol: string | undefined;
  let gteVal: string | undefined;
  const filtered = () => {
    const rows = data[table] ?? [];
    if (!gteCol || !gteVal) return rows;
    return rows.filter((r) => r[gteCol as string] >= (gteVal as string));
  };
  const b: any = {
    select: (_c?: string, opts?: any) => {
      if (opts?.head) return { gte: () => b, not: () => b, eq: () => b, then: (r: any) => r({ count: counts[table] ?? 0, error: null }) };
      return b;
    },
    gte: (col: string, val: string) => {
      gteCol = col;
      gteVal = val;
      return b;
    },
    not: () => b,
    eq: () => b,
    then: (r: any) => r({ data: filtered(), error: null, count: counts[table] ?? 0 }),
  };
  return b;
}
vi.mock("../../../../../server/utils/supabase", () => ({ useSupabaseAdmin: () => ({ from: (t: string) => stub(t) }) }));
const { requireAdmin } = vi.hoisted(() => ({ requireAdmin: vi.fn(async () => {}) }));
vi.mock("../../../../../server/utils/auth", () => ({ requireAdmin }));

import handler from "../../../../../server/api/admin/growth.get";
const ev = (days?: string) => {
  const path = "/api/admin/growth" + (days ? `?days=${days}` : "");
  return { context: {}, path, node: { req: { url: path } } } as any;
};

beforeEach(() => {
  for (const k of Object.keys(data)) delete data[k];
  for (const k of Object.keys(counts)) delete counts[k];
  counts["users"] = 10; counts["family_invitations"] = 8;
  data["interactions"] = [{ logged_by: "u1", occurred_at: new Date().toISOString() }];
  data["athlete_messages"] = [{ user_id: "u2", sent_at: new Date().toISOString() }];
  requireAdmin.mockClear();
});

describe("GET /api/admin/growth", () => {
  it("returns funnel, activity, adoption with the window", async () => {
    const res = await handler(ev("30"));
    expect(requireAdmin).toHaveBeenCalled();
    expect(res.windowDays).toBe(30);
    expect(res.funnel.length).toBeGreaterThan(0);
    expect(res.activity).toHaveProperty("dau");
    expect(res.adoption.totalUsers).toBe(10);
  });
  it("clamps days to 90", async () => {
    const res = await handler(ev("9999"));
    expect(res.windowDays).toBe(90);
  });

  it("counts MAU from a floor of at least 30d even when a shorter range is selected", async () => {
    const twentyDaysAgo = new Date(Date.now() - 20 * 86400000).toISOString();
    data["interactions"] = [
      { logged_by: "u1", occurred_at: new Date().toISOString() },
      { logged_by: "u3", occurred_at: twentyDaysAgo },
    ];

    const res = await handler(ev("7"));

    expect(res.windowDays).toBe(7);
    // MAU must see the ~20-day-old row even though the selected range is 7d.
    expect(res.activity.mau).toBeGreaterThanOrEqual(2);
    // The daily trend stays scoped to the selected 7d window: it must only
    // reflect today's 2 rows (u1 via interactions, u2 via athlete_messages),
    // never the 20-day-old u3 row.
    const trendTotal = res.activity.dailyTrend.reduce((sum, d) => sum + d.count, 0);
    expect(trendTotal).toBe(2);
  });
});
