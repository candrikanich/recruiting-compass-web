/**
 * GET /api/cron/school-metadata-backfill
 * Mirrors video-health-check.spec.ts's secret-gate pattern; the real risk
 * under test is null-fill-only (never clobbers a user-edited field) and
 * that one bad update doesn't stop the batch.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { H3Event } from "h3";

process.env.CRON_SECRET = "test-cron-secret";

const mockSupabase = { from: vi.fn() };
vi.mock("~/server/utils/supabase", () => ({
  useSupabaseAdmin: () => mockSupabase,
}));

vi.mock("~/server/utils/schoolMetadataLookup", () => ({
  lookupSchoolMetadata: vi.fn((name: string) => {
    if (name === "Known University") {
      return {
        mascot: "Bulldogs",
        athleticsUrl: "https://known.example",
        colors: ["#111111"],
        conferenceUrl: null,
      };
    }
    return { mascot: null, athleticsUrl: null, colors: null, conferenceUrl: null };
  }),
}));

vi.mock("~/server/utils/logger", () => ({
  useLogger: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() }),
  createLogger: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() }),
}));

vi.mock("h3", async (importOriginal) => {
  const actual = await importOriginal<typeof import("h3")>();
  return { ...actual, defineEventHandler: (fn: (event: H3Event) => unknown) => fn };
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

interface School {
  id: string;
  name: string;
  mascot: string | null;
  athletics_url: string | null;
  school_colors: string[] | null;
}

function mockSchools(schools: School[]) {
  const updateMock = vi.fn().mockReturnValue({
    eq: () => Promise.resolve({ data: null, error: null }),
  });
  mockSupabase.from.mockImplementation((table: string) => {
    if (table !== "schools") throw new Error(`unexpected table ${table}`);
    return {
      select: () => ({
        or: () => Promise.resolve({ data: schools, error: null }),
      }),
      update: updateMock,
    };
  });
  return updateMock;
}

async function loadHandler() {
  return (await import("~/server/api/cron/school-metadata-backfill.get")).default;
}

describe("GET /api/cron/school-metadata-backfill", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("rejects a request with no cron secret (401)", async () => {
    mockSchools([]);
    const handler = await loadHandler();
    await expect(handler(fakeEvent())).rejects.toMatchObject({ statusCode: 401 });
  });

  it("null-fills a school found in the seed", async () => {
    const updateMock = mockSchools([
      {
        id: "s1",
        name: "Known University",
        mascot: null,
        athletics_url: null,
        school_colors: null,
      },
    ]);
    const handler = await loadHandler();

    const result = (await handler(
      fakeEvent({ authorization: "Bearer test-cron-secret" }),
    )) as { total: number; updated: number; skipped: number };

    expect(updateMock).toHaveBeenCalledWith({
      mascot: "Bulldogs",
      athletics_url: "https://known.example",
      school_colors: ["#111111"],
    });
    expect(result).toEqual({ total: 1, updated: 1, skipped: 0, failed: 0 });
  });

  it("never overwrites an existing value (skips even if seed disagrees)", async () => {
    const updateMock = mockSchools([
      {
        id: "s2",
        name: "Known University",
        mascot: "User-entered Mascot",
        athletics_url: "https://user.example",
        school_colors: ["#000000"],
      },
    ]);
    const handler = await loadHandler();

    const result = (await handler(
      fakeEvent({ authorization: "Bearer test-cron-secret" }),
    )) as { total: number; updated: number; skipped: number };

    expect(updateMock).not.toHaveBeenCalled();
    expect(result).toEqual({ total: 1, updated: 0, skipped: 1, failed: 0 });
  });

  it("skips a school not in the seed (empty patch)", async () => {
    const updateMock = mockSchools([
      {
        id: "s3",
        name: "Unknown University",
        mascot: null,
        athletics_url: null,
        school_colors: null,
      },
    ]);
    const handler = await loadHandler();

    const result = (await handler(
      fakeEvent({ authorization: "Bearer test-cron-secret" }),
    )) as { total: number; updated: number; skipped: number };

    expect(updateMock).not.toHaveBeenCalled();
    expect(result.skipped).toBe(1);
  });

  it("continues the batch when one row's update throws", async () => {
    const updateMock = vi
      .fn()
      .mockReturnValueOnce({
        eq: () => Promise.resolve({ data: null, error: { message: "db error" } }),
      })
      .mockReturnValueOnce({ eq: () => Promise.resolve({ data: null, error: null }) });
    mockSupabase.from.mockImplementation((table: string) => {
      if (table !== "schools") throw new Error(`unexpected table ${table}`);
      return {
        select: () => ({
          or: () =>
            Promise.resolve({
              data: [
                {
                  id: "s4",
                  name: "Known University",
                  mascot: null,
                  athletics_url: null,
                  school_colors: null,
                },
                {
                  id: "s5",
                  name: "Known University",
                  mascot: null,
                  athletics_url: null,
                  school_colors: null,
                },
              ],
              error: null,
            }),
        }),
        update: updateMock,
      };
    });
    const handler = await loadHandler();

    const result = (await handler(
      fakeEvent({ authorization: "Bearer test-cron-secret" }),
    )) as { total: number; updated: number; skipped: number; failed: number };

    expect(result.total).toBe(2);
    expect(result.updated).toBe(1);
    expect(result.failed).toBe(1);
  });
});
