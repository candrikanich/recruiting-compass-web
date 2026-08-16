/**
 * GET /api/cron/health-ping — real behavioral tests (mocked redis + fetch;
 * a live network health check has no real-vs-fake DB distinction to prove,
 * unlike the destructive-batch crons, so this stays at the unit/integration
 * boundary per the Phase 11 brief's "mocked/unit-level is fine for pure
 * logic" guidance). Covers the auth gate and both success and
 * partial-failure paths through the real handler.
 *
 * planning/audit-2026-07-27-findings.md flagged all 4 cron jobs as
 * P0-untested; process-account-deletions (Phase 3) and
 * cleanup-expired-invites (Phase 11) now have live-Postgres coverage —
 * this and daily-suggestions.spec.ts cover the remaining two.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { H3Event } from "h3";

process.env.CRON_SECRET = "test-cron-secret";

const mockRedis = {
  ping: vi.fn(),
  get: vi.fn(),
  set: vi.fn(),
};

vi.mock("~/server/utils/redis", () => ({
  redis: mockRedis,
  CACHE_KEYS: {
    COLLEGE_SEARCH: (q: string, fields: string, perPage: string) =>
      `college-search:${q}:${fields}:${perPage}`,
  },
  TTL: { THIRTY_DAYS: 60 * 60 * 24 * 30 },
}));

vi.mock("~/server/utils/logger", () => ({
  useLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
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
    useRuntimeConfig: () => { collegeScorecardApiKey: string };
  }
).createError = (config) => {
  const err = new Error(config.message) as Error & { statusCode: number };
  err.statusCode = config.statusCode;
  return err;
};
(
  globalThis as unknown as { useRuntimeConfig: () => unknown }
).useRuntimeConfig = () => ({ collegeScorecardApiKey: "test-api-key" });

function fakeEvent(headers: Record<string, string> = {}): H3Event {
  return { node: { req: { headers }, res: {} } } as unknown as H3Event;
}

async function loadHandler() {
  return (await import("~/server/api/cron/health-ping.get")).default;
}

describe("GET /api/cron/health-ping", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockRedis.ping.mockResolvedValue("PONG");
    mockRedis.get.mockResolvedValue(null);
    mockRedis.set.mockResolvedValue("OK");
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => ({ results: [] }),
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
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

  it("accepts the legacy x-cron-secret header", async () => {
    const handler = await loadHandler();
    const result = (await handler(
      fakeEvent({ "x-cron-secret": "test-cron-secret" }),
    )) as { status: string };
    expect(result.status).toBe("healthy");
  });

  it("pings redis and warms the cache for un-cached queries, reporting healthy", async () => {
    const handler = await loadHandler();
    const result = (await handler(
      fakeEvent({ authorization: "Bearer test-cron-secret" }),
    )) as {
      status: string;
      redisUp: boolean;
      siteUp: boolean;
      cacheWarmed: number;
      cacheSkipped: number;
      errors: string[];
    };

    expect(result.redisUp).toBe(true);
    expect(result.siteUp).toBe(true);
    expect(result.cacheWarmed).toBeGreaterThan(0);
    expect(result.cacheSkipped).toBe(0);
    expect(result.status).toBe("healthy");
    expect(mockRedis.set).toHaveBeenCalled();
  });

  it("skips already-cached queries instead of re-fetching from Scorecard", async () => {
    mockRedis.get.mockResolvedValue({ results: ["cached"] });
    const handler = await loadHandler();
    const result = (await handler(
      fakeEvent({ authorization: "Bearer test-cron-secret" }),
    )) as { cacheWarmed: number; cacheSkipped: number };

    expect(result.cacheSkipped).toBeGreaterThan(0);
    expect(result.cacheWarmed).toBe(0);
  });

  it("reports degraded when a public page check fails", async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (typeof url === "string" && url.includes("/login")) {
        return Promise.resolve({ ok: false, status: 503, statusText: "Down" });
      }
      return Promise.resolve({ ok: true, status: 200, statusText: "OK" });
    });
    const handler = await loadHandler();
    const result = (await handler(
      fakeEvent({ authorization: "Bearer test-cron-secret" }),
    )) as { status: string; errors: string[] };

    expect(result.status).toBe("degraded");
    expect(result.errors.some((e) => e.includes("503"))).toBe(true);
  });

  it("reports degraded (not a crash) when redis.ping rejects", async () => {
    mockRedis.ping.mockRejectedValue(new Error("connection refused"));
    const handler = await loadHandler();
    const result = (await handler(
      fakeEvent({ authorization: "Bearer test-cron-secret" }),
    )) as { redisUp: boolean; errors: string[] };

    expect(result.redisUp).toBe(false);
    expect(result.errors).toContain("Redis ping failed");
  });
});
