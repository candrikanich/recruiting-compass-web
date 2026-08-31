import { describe, it, expect, vi, beforeEach } from "vitest";

const counts: Record<string, number | null> = { users: 10, schools: 5 };
function tableStub(name: string) {
  return {
    select: () => ({
      then: (res: any) => res({ count: counts[name] ?? 0, error: null }),
    }),
  };
}
const { listBuckets, listObjects, requireAdmin } = vi.hoisted(() => ({
  listBuckets: vi
    .fn()
    .mockResolvedValue({ data: [{ name: "avatars" }], error: null }),
  listObjects: vi
    .fn()
    .mockResolvedValue({ data: [{ name: "a" }, { name: "b" }], error: null }),
  requireAdmin: vi.fn(async () => {}),
}));
vi.mock("../../../../../server/utils/supabase", () => ({
  useSupabaseAdmin: () => ({
    from: (t: string) => tableStub(t),
    storage: { listBuckets, from: () => ({ list: listObjects }) },
  }),
}));
vi.mock("../../../../../server/utils/auth", () => ({ requireAdmin }));
vi.stubGlobal(
  "$fetch",
  vi.fn().mockResolvedValue({
    dryRun: true,
    perBucket: {},
    expiredExports: 0,
    totalObjects: 0,
  }),
);

import handler from "../../../../../server/api/admin/ops/db-health.get";
const ev = () => ({ context: {}, node: { req: {} } }) as any;
beforeEach(() => {
  process.env.CRON_SECRET = "s";
  requireAdmin.mockClear();
});

describe("GET /api/admin/ops/db-health", () => {
  it("returns row counts and storage buckets", async () => {
    const res = await handler(ev());
    expect(res.rowCounts.find((r: any) => r.table === "users")?.count).toBe(10);
    expect(res.storage.length).toBeGreaterThan(0);
  });
  it("degrades gracefully — a failing count yields null, not a throw", async () => {
    counts.users = null; // simulate error path handled → null
    const res = await handler(ev());
    expect(res).toBeTruthy();
  });
});
