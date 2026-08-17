/**
 * GET /api/cron/generate-notifications — auth gate + batch isolation.
 * Mirrors the daily-suggestions cron tests: the risk in a nightly batch is a
 * single user's failure aborting everyone else's delivery.
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
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}));

const mockDeliver = vi.fn();
vi.mock("~/server/utils/notificationDelivery", () => ({
  deliverNotificationsForUser: mockDeliver,
}));

vi.mock("h3", async (importOriginal) => {
  const actual = await importOriginal<typeof import("h3")>();
  return { ...actual, defineEventHandler: (fn: (e: H3Event) => unknown) => fn };
});

(
  globalThis as unknown as {
    createError: (c: { statusCode: number; message?: string }) => Error & {
      statusCode: number;
    };
  }
).createError = (c) => {
  const err = new Error(c.message) as Error & { statusCode: number };
  err.statusCode = c.statusCode;
  return err;
};

vi.stubGlobal("useRuntimeConfig", () => ({ unsubscribeSecret: "s" }));

function fakeEvent(headers: Record<string, string> = {}): H3Event {
  return { node: { req: { headers }, res: {} } } as unknown as H3Event;
}

function mockAthletes(rows: Array<{ id: string; email: string | null }>) {
  mockSupabase.from.mockReturnValue({
    select: () => ({ eq: () => Promise.resolve({ data: rows, error: null }) }),
  });
}

async function loadHandler() {
  return (await import("~/server/api/cron/generate-notifications.get")).default;
}

describe("GET /api/cron/generate-notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockDeliver.mockResolvedValue({ inApp: 1, emails: 1 });
  });

  it("rejects with no cron secret (401)", async () => {
    const handler = await loadHandler();
    await expect(handler(fakeEvent())).rejects.toMatchObject({
      statusCode: 401,
    });
  });

  it("rejects with the wrong cron secret (401)", async () => {
    const handler = await loadHandler();
    await expect(
      handler(fakeEvent({ authorization: "Bearer nope" })),
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  it("delivers to every athlete and sums the totals", async () => {
    mockAthletes([
      { id: "a-1", email: "a1@x.com" },
      { id: "a-2", email: "a2@x.com" },
    ]);
    const handler = await loadHandler();
    const result = (await handler(
      fakeEvent({ authorization: "Bearer test-cron-secret" }),
    )) as { total: number; processed: number; inApp: number; emails: number };

    expect(result).toMatchObject({
      total: 2,
      processed: 2,
      inApp: 2,
      emails: 2,
    });
    expect(mockDeliver).toHaveBeenCalledTimes(2);
  });

  it("isolates one athlete's failure — batch continues", async () => {
    mockAthletes([
      { id: "a-1", email: "a1@x.com" },
      { id: "a-2", email: "a2@x.com" },
      { id: "a-3", email: "a3@x.com" },
    ]);
    mockDeliver.mockImplementation(async (id: string) => {
      if (id === "a-2") throw new Error("boom");
      return { inApp: 1, emails: 0 };
    });
    const handler = await loadHandler();
    const result = (await handler(
      fakeEvent({ authorization: "Bearer test-cron-secret" }),
    )) as { processed: number; failed: number };

    expect(result.processed).toBe(2);
    expect(result.failed).toBe(1);
    expect(mockDeliver).toHaveBeenCalledTimes(3);
  });
});
