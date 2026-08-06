/**
 * GET /api/cron/daily-suggestions — real behavioral tests.
 *
 * planning/audit-2026-07-27-findings.md flagged all 4 cron jobs as
 * P0-untested. The rule engine itself already has real coverage (8/12
 * suggestion rules, per the audit's "well-covered" list) — what's
 * untested here is this cron's OWN orchestration: the auth gate, and
 * critically, that one athlete's `triggerSuggestionUpdate` failure is
 * isolated (caught per-iteration) and doesn't abort the whole batch run
 * for every other athlete — the real risk in a nightly cron over
 * potentially thousands of users.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { H3Event } from "h3";

process.env.CRON_SECRET = "test-cron-secret";

const mockSupabase = { from: vi.fn() };
vi.mock("~/server/utils/supabase", () => ({
  createServerSupabaseClient: () => mockSupabase,
}));

vi.mock("~/server/utils/logger", () => ({
  useLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}));

const mockTriggerSuggestionUpdate = vi.fn();
vi.mock("~/server/utils/triggerSuggestionUpdate", () => ({
  triggerSuggestionUpdate: mockTriggerSuggestionUpdate,
}));

vi.mock("h3", async (importOriginal) => {
  const actual = await importOriginal<typeof import("h3")>();
  return {
    ...actual,
    defineEventHandler: (fn: (event: H3Event) => unknown) => fn,
  };
});

(
  globalThis as unknown as {
    createError: (config: { statusCode: number; message?: string }) => Error & {
      statusCode: number;
    };
  }
).createError = (config) => {
  const err = new Error(config.message) as Error & { statusCode: number };
  err.statusCode = config.statusCode;
  return err;
};

function fakeEvent(headers: Record<string, string> = {}): H3Event {
  return { node: { req: { headers }, res: {} } } as unknown as H3Event;
}

function mockAthletes(athletes: Array<{ id: string }>) {
  mockSupabase.from.mockReturnValue({
    select: () => ({
      eq: () => Promise.resolve({ data: athletes, error: null }),
    }),
  });
}

async function loadHandler() {
  return (await import("~/server/api/cron/daily-suggestions.get")).default;
}

describe("GET /api/cron/daily-suggestions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockTriggerSuggestionUpdate.mockResolvedValue(undefined);
  });

  it("rejects a request with no cron secret (401)", async () => {
    const handler = await loadHandler();
    await expect(handler(fakeEvent())).rejects.toMatchObject({
      statusCode: 401,
    });
  });

  it("rejects a request with the wrong cron secret (401)", async () => {
    const handler = await loadHandler();
    await expect(
      handler(fakeEvent({ authorization: "Bearer wrong-secret" })),
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  it("processes every active athlete and reports the totals", async () => {
    mockAthletes([
      { id: "athlete-1" },
      { id: "athlete-2" },
      { id: "athlete-3" },
    ]);
    const handler = await loadHandler();

    const result = (await handler(
      fakeEvent({ authorization: "Bearer test-cron-secret" }),
    )) as { total: number; updated: number; failed: number };

    expect(result.total).toBe(3);
    expect(result.updated).toBe(3);
    expect(result.failed).toBe(0);
    expect(mockTriggerSuggestionUpdate).toHaveBeenCalledTimes(3);
    expect(mockTriggerSuggestionUpdate).toHaveBeenCalledWith(
      mockSupabase,
      "athlete-1",
      "daily_refresh",
    );
  });

  it("isolates a single athlete's failure — the batch continues and reports it as failed, not aborted", async () => {
    mockAthletes([
      { id: "athlete-1" },
      { id: "athlete-2" },
      { id: "athlete-3" },
    ]);
    mockTriggerSuggestionUpdate.mockImplementation(
      async (_supabase: unknown, athleteId: string) => {
        if (athleteId === "athlete-2") {
          throw new Error("rule engine exploded");
        }
      },
    );
    const handler = await loadHandler();

    const result = (await handler(
      fakeEvent({ authorization: "Bearer test-cron-secret" }),
    )) as {
      total: number;
      updated: number;
      failed: number;
      errors: Array<{ athleteId: string }>;
    };

    expect(result.total).toBe(3);
    expect(result.updated).toBe(2);
    expect(result.failed).toBe(1);
    expect(result.errors).toEqual([
      { athleteId: "athlete-2", error: "Processing failed" },
    ]);
    // All 3 athletes were attempted despite athlete-2's failure.
    expect(mockTriggerSuggestionUpdate).toHaveBeenCalledTimes(3);
  });

  it("returns 500 when the athlete list can't be fetched", async () => {
    mockSupabase.from.mockReturnValue({
      select: () => ({
        eq: () =>
          Promise.resolve({ data: null, error: { message: "db down" } }),
      }),
    });
    const handler = await loadHandler();

    await expect(
      handler(fakeEvent({ authorization: "Bearer test-cron-secret" })),
    ).rejects.toMatchObject({ statusCode: 500 });
    expect(mockTriggerSuggestionUpdate).not.toHaveBeenCalled();
  });

  it("returns a zeroed result (no crash) when there are no active athletes", async () => {
    mockAthletes([]);
    const handler = await loadHandler();

    const result = (await handler(
      fakeEvent({ authorization: "Bearer test-cron-secret" }),
    )) as { total: number; updated: number; failed: number };

    expect(result).toEqual({ total: 0, updated: 0, failed: 0, errors: [] });
  });
});
