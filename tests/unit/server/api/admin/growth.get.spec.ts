import { describe, it, expect, vi, beforeEach } from "vitest";

// Per-table row fixtures the stub returns based on table name.
const data: Record<string, any[]> = {};
const counts: Record<string, number> = {};
function stub(table: string) {
  const b: any = {
    select: (_c?: string, opts?: any) => {
      if (opts?.head) return { gte: () => b, not: () => b, eq: () => b, then: (r: any) => r({ count: counts[table] ?? 0, error: null }) };
      return b;
    },
    gte: () => b, not: () => b, eq: () => b,
    then: (r: any) => r({ data: data[table] ?? [], error: null, count: counts[table] ?? 0 }),
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
});
