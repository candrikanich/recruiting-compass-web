import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

vi.mock("~/server/utils/logger", () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

import {
  generateOfferNotifications,
  generateRecommendationNotifications,
  generateEventNotifications,
  generateCoachFollowupNotifications,
  generateDailyDigest,
} from "~/server/utils/notificationGenerator";

type Row = Record<string, unknown>;

interface ChainResult {
  data: Row[] | Row | null;
  error: unknown;
}

interface TableConfig {
  // Result for await-on-chain (resolves with { data, error })
  list?: ChainResult;
  // Result for .single() terminator
  single?: ChainResult;
  // Result for .maybeSingle() terminator
  maybeSingle?: ChainResult;
  // Throw synchronously when chain is built (.from())
  throwOnFrom?: unknown;
}

/**
 * Build a thenable Supabase chain mock. All `.select/.eq/.in/.gte/.lt/.lte` etc.
 * return the same chain, which is awaitable (resolves to `{ data, error }`).
 * `.single()` / `.maybeSingle()` resolve to their configured results.
 */
function buildChain(cfg: TableConfig): Record<string, unknown> {
  const listResult: ChainResult = cfg.list ?? { data: [], error: null };
  const singleResult: ChainResult = cfg.single ?? { data: null, error: null };
  const maybeSingleResult: ChainResult = cfg.maybeSingle ?? {
    data: null,
    error: null,
  };

  // Lazily build chain so .insert can also return a thenable result.
  const chain: Record<string, unknown> = {};

  const passthrough = () => chain;

  chain.select = vi.fn(passthrough);
  chain.eq = vi.fn(passthrough);
  chain.in = vi.fn(passthrough);
  chain.gte = vi.fn(passthrough);
  chain.gt = vi.fn(passthrough);
  chain.lt = vi.fn(passthrough);
  chain.lte = vi.fn(passthrough);
  chain.order = vi.fn(passthrough);
  chain.limit = vi.fn(passthrough);
  chain.range = vi.fn(passthrough);
  chain.is = vi.fn(passthrough);
  chain.not = vi.fn(passthrough);
  chain.match = vi.fn(passthrough);
  chain.single = vi.fn(async () => singleResult);
  chain.maybeSingle = vi.fn(async () => maybeSingleResult);
  chain.insert = vi.fn(async () => ({ data: null, error: null }));
  chain.update = vi.fn(passthrough);
  chain.delete = vi.fn(passthrough);

  // Awaitable — Supabase queries are "thenable" PostgrestBuilders.
  chain.then = (resolve: (v: unknown) => void) => resolve(listResult);

  return chain;
}

function makeSupabase(
  tables: Record<string, TableConfig | (() => TableConfig)>,
  trackInserts?: { calls: Array<{ table: string; rows: unknown }> },
): { supabase: SupabaseClient; fromMock: ReturnType<typeof vi.fn> } {
  const fromMock = vi.fn((table: string) => {
    const raw = tables[table];
    const cfg = typeof raw === "function" ? raw() : (raw ?? {});
    if (cfg.throwOnFrom) throw cfg.throwOnFrom;
    const chain = buildChain(cfg);
    if (trackInserts) {
      const originalInsert = chain.insert as ReturnType<typeof vi.fn>;
      chain.insert = vi.fn(async (rows: unknown) => {
        trackInserts.calls.push({ table, rows });
        return originalInsert(rows);
      });
    }
    return chain;
  });

  const supabase = { from: fromMock } as unknown as SupabaseClient;
  return { supabase, fromMock };
}

// Helper: future-dated ISO string `daysAhead` days from now.
function daysFromNow(daysAhead: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString();
}

// Helper: past-dated ISO string `daysAgo` days before now.
function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("generateOfferNotifications", () => {
  it("returns 0 count when there are no pending offers", async () => {
    const { supabase } = makeSupabase({
      offers: { list: { data: [], error: null } },
    });
    const result = await generateOfferNotifications("u-1", supabase);
    expect(result).toEqual({ count: 0, type: "offers" });
  });

  it("returns 0 and logs when offers query errors", async () => {
    const { supabase } = makeSupabase({
      offers: { list: { data: null, error: { message: "boom" } } },
    });
    const result = await generateOfferNotifications("u-1", supabase);
    expect(result).toEqual({ count: 0, type: "offers" });
  });

  it("returns 0 when schools lookup errors", async () => {
    const { supabase } = makeSupabase({
      offers: {
        list: {
          data: [
            {
              id: "o-1",
              school_id: "s-1",
              deadline_date: daysFromNow(2),
              status: "pending",
            },
          ],
          error: null,
        },
      },
      schools: { list: { data: null, error: { message: "fail" } } },
    });
    const result = await generateOfferNotifications("u-1", supabase);
    expect(result.count).toBe(0);
  });

  it("skips offers with no deadline_date", async () => {
    const inserts = { calls: [] as Array<{ table: string; rows: unknown }> };
    const { supabase } = makeSupabase(
      {
        offers: {
          list: {
            data: [
              {
                id: "o-1",
                school_id: "s-1",
                deadline_date: null,
                status: "pending",
              },
            ],
            error: null,
          },
        },
        schools: {
          list: { data: [{ id: "s-1", name: "Texas" }], error: null },
        },
        notifications: { maybeSingle: { data: null, error: null } },
      },
      inserts,
    );
    const result = await generateOfferNotifications("u-1", supabase);
    expect(result.count).toBe(0);
    expect(inserts.calls).toHaveLength(0);
  });

  it("inserts a high-priority notification for an offer due in 1 day", async () => {
    const inserts = { calls: [] as Array<{ table: string; rows: unknown }> };
    const { supabase } = makeSupabase(
      {
        offers: {
          list: {
            data: [
              {
                id: "o-1",
                school_id: "s-1",
                deadline_date: daysFromNow(1),
                status: "pending",
              },
            ],
            error: null,
          },
        },
        schools: {
          list: { data: [{ id: "s-1", name: "Bama" }], error: null },
        },
        notifications: { maybeSingle: { data: null, error: null } },
      },
      inserts,
    );
    const result = await generateOfferNotifications("u-1", supabase);
    // 1 day is also within 14/7/3 windows, but each window only inserts once per offer.
    // The function loops [14,7,3,1] — all match for a 1-day-out offer (4 inserts).
    expect(result.count).toBeGreaterThanOrEqual(1);
    const offerInserts = inserts.calls.filter(
      (c) => c.table === "notifications",
    );
    expect(offerInserts.length).toBeGreaterThan(0);
    const firstRow = (offerInserts[0].rows as Row[])[0] as Row;
    expect(firstRow.user_id).toBe("u-1");
    expect(firstRow.type).toBe("deadline");
    expect(firstRow.related_entity_type).toBe("offer");
    expect(firstRow.related_offer_id).toBe("o-1");
    // At least one insert at high priority (days <= 3)
    expect(
      offerInserts.some(
        (c) => (((c.rows as Row[])[0] as Row).priority as string) === "high",
      ),
    ).toBe(true);
  });

  it("skips insertion when a duplicate notification already exists", async () => {
    const inserts = { calls: [] as Array<{ table: string; rows: unknown }> };
    const { supabase } = makeSupabase(
      {
        offers: {
          list: {
            data: [
              {
                id: "o-1",
                school_id: "s-1",
                deadline_date: daysFromNow(2),
                status: "pending",
              },
            ],
            error: null,
          },
        },
        schools: {
          list: { data: [{ id: "s-1", name: "UGA" }], error: null },
        },
        notifications: {
          maybeSingle: { data: { id: "n-existing" }, error: null },
        },
      },
      inserts,
    );
    const result = await generateOfferNotifications("u-1", supabase);
    expect(result.count).toBe(0);
    expect(
      inserts.calls.filter((c) => c.table === "notifications"),
    ).toHaveLength(0);
  });

  it("returns 0 when notification-exists check errors", async () => {
    const { supabase } = makeSupabase({
      offers: {
        list: {
          data: [
            {
              id: "o-1",
              school_id: "s-1",
              deadline_date: daysFromNow(2),
              status: "pending",
            },
          ],
          error: null,
        },
      },
      schools: {
        list: { data: [{ id: "s-1", name: "UGA" }], error: null },
      },
      notifications: { maybeSingle: { data: null, error: { message: "bad" } } },
    });
    const result = await generateOfferNotifications("u-1", supabase);
    expect(result.count).toBe(0);
  });

  it("falls back to 'Unknown School' when school lookup misses", async () => {
    const inserts = { calls: [] as Array<{ table: string; rows: unknown }> };
    const { supabase } = makeSupabase(
      {
        offers: {
          list: {
            data: [
              {
                id: "o-1",
                school_id: "s-unknown",
                deadline_date: daysFromNow(2),
                status: "pending",
              },
            ],
            error: null,
          },
        },
        schools: { list: { data: [], error: null } },
        notifications: { maybeSingle: { data: null, error: null } },
      },
      inserts,
    );
    const result = await generateOfferNotifications("u-1", supabase);
    expect(result.count).toBeGreaterThan(0);
    const row = (inserts.calls[0].rows as Row[])[0] as Row;
    expect(row.title).toContain("Unknown School");
  });

  it("does not insert for offers more than 14 days out", async () => {
    const inserts = { calls: [] as Array<{ table: string; rows: unknown }> };
    const { supabase } = makeSupabase(
      {
        offers: {
          list: {
            data: [
              {
                id: "o-1",
                school_id: "s-1",
                deadline_date: daysFromNow(30),
                status: "pending",
              },
            ],
            error: null,
          },
        },
        schools: {
          list: { data: [{ id: "s-1", name: "UGA" }], error: null },
        },
        notifications: { maybeSingle: { data: null, error: null } },
      },
      inserts,
    );
    const result = await generateOfferNotifications("u-1", supabase);
    expect(result.count).toBe(0);
    expect(
      inserts.calls.filter((c) => c.table === "notifications"),
    ).toHaveLength(0);
  });
});

describe("generateRecommendationNotifications", () => {
  it("returns 0 when no requested recommendations exist", async () => {
    const { supabase } = makeSupabase({
      recommendation_letters: { list: { data: [], error: null } },
    });
    const result = await generateRecommendationNotifications("u-1", supabase);
    expect(result).toEqual({ count: 0, type: "recommendations" });
  });

  it("returns 0 on query error", async () => {
    const { supabase } = makeSupabase({
      recommendation_letters: {
        list: { data: null, error: { message: "boom" } },
      },
    });
    const result = await generateRecommendationNotifications("u-1", supabase);
    expect(result.count).toBe(0);
  });

  it("skips recs with no deadline_date", async () => {
    const inserts = { calls: [] as Array<{ table: string; rows: unknown }> };
    const { supabase } = makeSupabase(
      {
        recommendation_letters: {
          list: {
            data: [
              {
                id: "r-1",
                requested_from: "Coach K",
                deadline_date: null,
                status: "requested",
              },
            ],
            error: null,
          },
        },
      },
      inserts,
    );
    const result = await generateRecommendationNotifications("u-1", supabase);
    expect(result.count).toBe(0);
  });

  it("inserts a recommendation notification with normal priority", async () => {
    const inserts = { calls: [] as Array<{ table: string; rows: unknown }> };
    const { supabase } = makeSupabase(
      {
        recommendation_letters: {
          list: {
            data: [
              {
                id: "r-1",
                requested_from: "Coach K",
                deadline_date: daysFromNow(5),
                status: "requested",
              },
            ],
            error: null,
          },
        },
        notifications: { maybeSingle: { data: null, error: null } },
      },
      inserts,
    );
    const result = await generateRecommendationNotifications("u-1", supabase);
    expect(result.count).toBeGreaterThan(0);
    const row = (inserts.calls[0].rows as Row[])[0] as Row;
    expect(row.related_entity_type).toBe("recommendation");
    expect(row.priority).toBe("normal");
    expect(row.title).toContain("Coach K");
  });

  it("falls back to 'Coach' when requested_from is missing", async () => {
    const inserts = { calls: [] as Array<{ table: string; rows: unknown }> };
    const { supabase } = makeSupabase(
      {
        recommendation_letters: {
          list: {
            data: [
              {
                id: "r-1",
                requested_from: null,
                deadline_date: daysFromNow(5),
                status: "requested",
              },
            ],
            error: null,
          },
        },
        notifications: { maybeSingle: { data: null, error: null } },
      },
      inserts,
    );
    const result = await generateRecommendationNotifications("u-1", supabase);
    expect(result.count).toBeGreaterThan(0);
    const row = (inserts.calls[0].rows as Row[])[0] as Row;
    expect(row.title).toContain("Coach");
  });

  it("skips when duplicate notification already exists", async () => {
    const inserts = { calls: [] as Array<{ table: string; rows: unknown }> };
    const { supabase } = makeSupabase(
      {
        recommendation_letters: {
          list: {
            data: [
              {
                id: "r-1",
                requested_from: "Coach K",
                deadline_date: daysFromNow(5),
                status: "requested",
              },
            ],
            error: null,
          },
        },
        notifications: { maybeSingle: { data: { id: "n-ex" }, error: null } },
      },
      inserts,
    );
    const result = await generateRecommendationNotifications("u-1", supabase);
    expect(result.count).toBe(0);
  });

  it("returns 0 when dup-check errors", async () => {
    const { supabase } = makeSupabase({
      recommendation_letters: {
        list: {
          data: [
            {
              id: "r-1",
              requested_from: "Coach K",
              deadline_date: daysFromNow(5),
              status: "requested",
            },
          ],
          error: null,
        },
      },
      notifications: { maybeSingle: { data: null, error: { message: "bad" } } },
    });
    const result = await generateRecommendationNotifications("u-1", supabase);
    expect(result.count).toBe(0);
  });

  it("does not insert for deadlines more than 14 days out", async () => {
    const inserts = { calls: [] as Array<{ table: string; rows: unknown }> };
    const { supabase } = makeSupabase(
      {
        recommendation_letters: {
          list: {
            data: [
              {
                id: "r-1",
                requested_from: "Coach K",
                deadline_date: daysFromNow(45),
                status: "requested",
              },
            ],
            error: null,
          },
        },
        notifications: { maybeSingle: { data: null, error: null } },
      },
      inserts,
    );
    const result = await generateRecommendationNotifications("u-1", supabase);
    expect(result.count).toBe(0);
  });
});

describe("generateEventNotifications", () => {
  it("returns 0 when there are no unattended events", async () => {
    const { supabase } = makeSupabase({
      events: { list: { data: [], error: null } },
    });
    const result = await generateEventNotifications("u-1", supabase);
    expect(result).toEqual({ count: 0, type: "events" });
  });

  it("returns 0 on events query error", async () => {
    const { supabase } = makeSupabase({
      events: { list: { data: null, error: { message: "boom" } } },
    });
    const result = await generateEventNotifications("u-1", supabase);
    expect(result.count).toBe(0);
  });

  it("inserts a high-priority notification for an event tomorrow", async () => {
    const inserts = { calls: [] as Array<{ table: string; rows: unknown }> };
    const { supabase } = makeSupabase(
      {
        events: {
          list: {
            data: [{ id: "e-1", name: "Combine", start_date: daysFromNow(1) }],
            error: null,
          },
        },
        notifications: { maybeSingle: { data: null, error: null } },
      },
      inserts,
    );
    const result = await generateEventNotifications("u-1", supabase);
    expect(result.count).toBeGreaterThan(0);
    const rows = inserts.calls.map((c) => (c.rows as Row[])[0] as Row);
    expect(rows.some((r) => r.priority === "high")).toBe(true);
    expect(rows[0].related_entity_type).toBe("event");
    expect(rows[0].related_event_id).toBe("e-1");
  });

  it("inserts normal priority for event 7 days out", async () => {
    const inserts = { calls: [] as Array<{ table: string; rows: unknown }> };
    const { supabase } = makeSupabase(
      {
        events: {
          list: {
            data: [{ id: "e-1", name: "Camp", start_date: daysFromNow(6) }],
            error: null,
          },
        },
        notifications: { maybeSingle: { data: null, error: null } },
      },
      inserts,
    );
    const result = await generateEventNotifications("u-1", supabase);
    expect(result.count).toBeGreaterThan(0);
    const rows = inserts.calls.map((c) => (c.rows as Row[])[0] as Row);
    expect(rows.every((r) => r.priority === "normal")).toBe(true);
  });

  it("skips when dup exists", async () => {
    const inserts = { calls: [] as Array<{ table: string; rows: unknown }> };
    const { supabase } = makeSupabase(
      {
        events: {
          list: {
            data: [{ id: "e-1", name: "Camp", start_date: daysFromNow(1) }],
            error: null,
          },
        },
        notifications: { maybeSingle: { data: { id: "ex" }, error: null } },
      },
      inserts,
    );
    const result = await generateEventNotifications("u-1", supabase);
    expect(result.count).toBe(0);
    expect(
      inserts.calls.filter((c) => c.table === "notifications"),
    ).toHaveLength(0);
  });

  it("returns 0 when dup-check errors", async () => {
    const { supabase } = makeSupabase({
      events: {
        list: {
          data: [{ id: "e-1", name: "Camp", start_date: daysFromNow(1) }],
          error: null,
        },
      },
      notifications: { maybeSingle: { data: null, error: { message: "x" } } },
    });
    const result = await generateEventNotifications("u-1", supabase);
    expect(result.count).toBe(0);
  });

  it("does not insert for events past or far in the future", async () => {
    const inserts = { calls: [] as Array<{ table: string; rows: unknown }> };
    const { supabase } = makeSupabase(
      {
        events: {
          list: {
            data: [
              { id: "e-1", name: "Past", start_date: daysAgo(2) },
              { id: "e-2", name: "Far", start_date: daysFromNow(30) },
            ],
            error: null,
          },
        },
        notifications: { maybeSingle: { data: null, error: null } },
      },
      inserts,
    );
    const result = await generateEventNotifications("u-1", supabase);
    expect(result.count).toBe(0);
  });
});

describe("generateCoachFollowupNotifications", () => {
  it("returns 0 when no coaches found", async () => {
    const { supabase } = makeSupabase({
      coaches: { list: { data: [], error: null } },
    });
    const result = await generateCoachFollowupNotifications("u-1", supabase);
    expect(result).toEqual({ count: 0, type: "coaches" });
  });

  it("returns 0 on coaches query error", async () => {
    const { supabase } = makeSupabase({
      coaches: { list: { data: null, error: { message: "boom" } } },
    });
    const result = await generateCoachFollowupNotifications("u-1", supabase);
    expect(result.count).toBe(0);
  });

  it("skips coaches with no last_contact_date", async () => {
    const inserts = { calls: [] as Array<{ table: string; rows: unknown }> };
    const { supabase } = makeSupabase(
      {
        coaches: {
          list: {
            data: [
              {
                id: "c-1",
                first_name: "A",
                last_name: "B",
                last_contact_date: null,
                follow_up_threshold_days: 7,
              },
            ],
            error: null,
          },
        },
      },
      inserts,
    );
    const result = await generateCoachFollowupNotifications("u-1", supabase);
    expect(result.count).toBe(0);
  });

  it("inserts a follow_up notification when threshold exceeded", async () => {
    const inserts = { calls: [] as Array<{ table: string; rows: unknown }> };
    const { supabase } = makeSupabase(
      {
        coaches: {
          list: {
            data: [
              {
                id: "c-1",
                first_name: "Jane",
                last_name: "Doe",
                last_contact_date: daysAgo(30),
                follow_up_threshold_days: 21,
              },
            ],
            error: null,
          },
        },
        notifications: { maybeSingle: { data: null, error: null } },
      },
      inserts,
    );
    const result = await generateCoachFollowupNotifications("u-1", supabase);
    expect(result.count).toBe(1);
    const row = (inserts.calls[0].rows as Row[])[0] as Row;
    expect(row.type).toBe("follow_up");
    expect(row.related_entity_type).toBe("coach");
    expect(row.related_coach_id).toBe("c-1");
    expect(row.title).toContain("Jane Doe");
  });

  it("skips when dup notification already exists", async () => {
    const inserts = { calls: [] as Array<{ table: string; rows: unknown }> };
    const { supabase } = makeSupabase(
      {
        coaches: {
          list: {
            data: [
              {
                id: "c-1",
                first_name: "Jane",
                last_name: "Doe",
                last_contact_date: daysAgo(30),
                follow_up_threshold_days: 21,
              },
            ],
            error: null,
          },
        },
        notifications: { maybeSingle: { data: { id: "ex" }, error: null } },
      },
      inserts,
    );
    const result = await generateCoachFollowupNotifications("u-1", supabase);
    expect(result.count).toBe(0);
  });

  it("returns 0 when dup-check errors", async () => {
    const { supabase } = makeSupabase({
      coaches: {
        list: {
          data: [
            {
              id: "c-1",
              first_name: "A",
              last_name: "B",
              last_contact_date: daysAgo(30),
              follow_up_threshold_days: 7,
            },
          ],
          error: null,
        },
      },
      notifications: { maybeSingle: { data: null, error: { message: "bad" } } },
    });
    const result = await generateCoachFollowupNotifications("u-1", supabase);
    expect(result.count).toBe(0);
  });
});

describe("generateDailyDigest", () => {
  it("returns 0 when daily digest preference is disabled", async () => {
    const { supabase } = makeSupabase({
      user_preferences: {
        single: { data: { data: { enableDailyDigest: false } }, error: null },
      },
    });
    const result = await generateDailyDigest("u-1", supabase);
    expect(result).toEqual({ count: 0, type: "daily_digest" });
  });

  it("returns 0 when prefs row is missing entirely", async () => {
    const { supabase } = makeSupabase({
      user_preferences: { single: { data: null, error: null } },
    });
    const result = await generateDailyDigest("u-1", supabase);
    expect(result.count).toBe(0);
  });

  it("returns 0 when there is no activity in the prior day", async () => {
    const { supabase } = makeSupabase({
      user_preferences: {
        single: { data: { data: { enableDailyDigest: true } }, error: null },
      },
      interactions: { list: { data: [], error: null } },
      events: { list: { data: [], error: null } },
      performance_metrics: { list: { data: [], error: null } },
      notifications: { single: { data: null, error: null } },
    });
    const result = await generateDailyDigest("u-1", supabase);
    expect(result.count).toBe(0);
  });

  it("returns 0 when a digest already exists for today", async () => {
    const { supabase } = makeSupabase({
      user_preferences: {
        single: { data: { data: { enableDailyDigest: true } }, error: null },
      },
      interactions: { list: { data: [{ id: "i-1" }], error: null } },
      events: { list: { data: [], error: null } },
      performance_metrics: { list: { data: [], error: null } },
      notifications: { single: { data: { id: "n-ex" }, error: null } },
    });
    const result = await generateDailyDigest("u-1", supabase);
    expect(result.count).toBe(0);
  });

  it("inserts a low-priority digest notification when activity exists", async () => {
    const inserts = { calls: [] as Array<{ table: string; rows: unknown }> };
    const { supabase } = makeSupabase(
      {
        user_preferences: {
          single: { data: { data: { enableDailyDigest: true } }, error: null },
        },
        interactions: {
          list: { data: [{ id: "i-1" }, { id: "i-2" }], error: null },
        },
        events: { list: { data: [{ id: "e-1" }], error: null } },
        performance_metrics: { list: { data: [{ id: "m-1" }], error: null } },
        notifications: { single: { data: null, error: null } },
      },
      inserts,
    );
    const result = await generateDailyDigest("u-1", supabase);
    expect(result.count).toBe(1);
    const insert = inserts.calls.find((c) => c.table === "notifications");
    expect(insert).toBeDefined();
    const row = (insert!.rows as Row[])[0] as Row;
    expect(row.type).toBe("daily_digest");
    expect(row.priority).toBe("low");
    expect(row.title).toBe("Daily Activity Summary");
    expect(row.message).toContain("2 interactions logged");
    expect(row.message).toContain("1 event attended");
    expect(row.message).toContain("1 performance metric recorded");
  });

  it("returns 0 when digest insert errors", async () => {
    // Wire the notifications insert to surface an error from the chain.
    const { supabase, fromMock } = makeSupabase({
      user_preferences: {
        single: { data: { data: { enableDailyDigest: true } }, error: null },
      },
      interactions: { list: { data: [{ id: "i-1" }], error: null } },
      events: { list: { data: [], error: null } },
      performance_metrics: { list: { data: [], error: null } },
      notifications: { single: { data: null, error: null } },
    });
    // Override notifications.insert to return an error
    const originalFrom = fromMock.getMockImplementation()!;
    fromMock.mockImplementation((table: string) => {
      const chain = originalFrom(table) as Record<string, unknown>;
      if (table === "notifications") {
        chain.insert = vi.fn(async () => ({
          data: null,
          error: { message: "insert failed" },
        }));
      }
      return chain;
    });
    const result = await generateDailyDigest("u-1", supabase);
    expect(result.count).toBe(0);
  });

  it("handles singular pluralization (1 interaction, 0 events, 0 metrics)", async () => {
    const inserts = { calls: [] as Array<{ table: string; rows: unknown }> };
    const { supabase } = makeSupabase(
      {
        user_preferences: {
          single: { data: { data: { enableDailyDigest: true } }, error: null },
        },
        interactions: { list: { data: [{ id: "i-1" }], error: null } },
        events: { list: { data: [], error: null } },
        performance_metrics: { list: { data: [], error: null } },
        notifications: { single: { data: null, error: null } },
      },
      inserts,
    );
    const result = await generateDailyDigest("u-1", supabase);
    expect(result.count).toBe(1);
    const row = (
      inserts.calls.find((c) => c.table === "notifications")!.rows as Row[]
    )[0] as Row;
    expect(row.message).toContain("1 interaction logged");
    expect(row.message).toContain("0 events attended");
    expect(row.message).toContain("0 performance metrics recorded");
  });
});
