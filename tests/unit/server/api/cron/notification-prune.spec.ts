/**
 * GET /api/cron/notification-prune — retention sweep. Verifies each table is
 * pruned with the right filters, counts are aggregated, deadline_alert_log is
 * never touched, and the run is auth-gated.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { H3Event } from "h3";

process.env.CRON_SECRET = "test-cron-secret";

interface DeleteCall {
  table: string;
  filters: string[];
}

let deleteCalls: DeleteCall[];
// table -> ids returned by the delete().....select("id")
let deleteResult: Record<string, { id: string }[]>;

function tableBuilder(table: string) {
  const call: DeleteCall = { table, filters: [] };
  const chain = {
    delete: () => chain,
    not: (col: string) => {
      call.filters.push(`not:${col}`);
      return chain;
    },
    lt: (col: string) => {
      call.filters.push(`lt:${col}`);
      return chain;
    },
    select: () => {
      deleteCalls.push(call);
      return Promise.resolve({ data: deleteResult[table] ?? [], error: null });
    },
  };
  return chain;
}

const supabaseMock = {
  from: (table: string) => {
    if (table === "cron_runs") {
      return {
        insert: () => ({
          select: () => ({
            single: () =>
              Promise.resolve({ data: { id: "run-1" }, error: null }),
          }),
        }),
        update: () => ({ eq: () => Promise.resolve({ error: null }) }),
      };
    }
    return tableBuilder(table);
  },
};

vi.mock("~/server/utils/supabase", () => ({
  useSupabaseAdmin: () => supabaseMock,
}));

vi.mock("~/server/utils/logger", () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}));

vi.mock("h3", async (importOriginal) => {
  const actual = await importOriginal<typeof import("h3")>();
  return { ...actual, defineEventHandler: (fn: unknown) => fn };
});

function fakeEvent(headers: Record<string, string> = {}): H3Event {
  return { node: { req: { headers }, res: {} } } as unknown as H3Event;
}

async function loadHandler() {
  return (await import("~/server/api/cron/notification-prune.get")).default;
}

const authed = () => fakeEvent({ authorization: "Bearer test-cron-secret" });

describe("GET /api/cron/notification-prune", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    deleteCalls = [];
    deleteResult = {
      notifications: [{ id: "n1" }],
      parent_view_log: [{ id: "p1" }, { id: "p2" }],
      family_code_usage_log: [{ id: "c1" }],
    };
  });

  it("prunes notifications (read + stale) and the two access logs", async () => {
    const handler = await loadHandler();
    const result = (await handler(authed())) as Record<string, number>;

    const tablesTouched = deleteCalls.map((c) => c.table);
    expect(tablesTouched).toEqual([
      "notifications",
      "notifications",
      "parent_view_log",
      "family_code_usage_log",
    ]);
    // read-notifications delete filters on read_at + created_at
    expect(deleteCalls[0].filters).toEqual(["not:read_at", "lt:created_at"]);
    // stale-notifications delete filters on created_at only
    expect(deleteCalls[1].filters).toEqual(["lt:created_at"]);

    expect(result.deletedReadNotifications).toBe(1);
    expect(result.deletedStaleNotifications).toBe(1);
    expect(result.deletedParentViewLogs).toBe(2);
    expect(result.deletedFamilyCodeUsageLogs).toBe(1);
  });

  it("never touches deadline_alert_log (send-dedup guard)", async () => {
    const handler = await loadHandler();
    await handler(authed());
    expect(deleteCalls.map((c) => c.table)).not.toContain("deadline_alert_log");
  });

  it("rejects an unauthorized request (401)", async () => {
    const handler = await loadHandler();
    await expect(handler(fakeEvent())).rejects.toMatchObject({
      statusCode: 401,
    });
  });
});
