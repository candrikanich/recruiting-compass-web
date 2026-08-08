/**
 * GET /api/cron/video-health-check — real behavioral tests.
 *
 * Mirrors daily-suggestions.spec.ts: the secret gate is the same
 * copy-pasted pattern, and the real risk being tested here is the
 * status→health mapping (2xx/3xx → healthy, everything else including a
 * thrown/timed-out fetch → broken) plus that every link gets its
 * last_health_check stamped regardless of outcome.
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

type Link = { id: string; url: string };

function mockLinks(links: Link[]) {
  const updateMock = vi.fn().mockReturnValue({
    eq: () => Promise.resolve({ data: null, error: null }),
  });
  mockSupabase.from.mockImplementation((table: string) => {
    if (table !== "video_links") {
      throw new Error(`unexpected table ${table}`);
    }
    return {
      select: () => Promise.resolve({ data: links, error: null }),
      update: updateMock,
    };
  });
  return updateMock;
}

async function loadHandler() {
  return (await import("~/server/api/cron/video-health-check.get")).default;
}

describe("GET /api/cron/video-health-check", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("rejects a request with no cron secret (401)", async () => {
    mockLinks([]);
    const handler = await loadHandler();
    await expect(handler(fakeEvent())).rejects.toMatchObject({
      statusCode: 401,
    });
  });

  it("rejects a request with the wrong cron secret (401)", async () => {
    mockLinks([]);
    const handler = await loadHandler();
    await expect(
      handler(fakeEvent({ authorization: "Bearer wrong-secret" })),
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  it("marks a 2xx url as healthy", async () => {
    const updateMock = mockLinks([{ id: "link-1", url: "https://ok.example" }]);
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
    });
    const handler = await loadHandler();

    await handler(fakeEvent({ authorization: "Bearer test-cron-secret" }));

    expect(fetch).toHaveBeenCalledWith(
      "https://ok.example",
      expect.objectContaining({ method: "HEAD" }),
    );
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        health_status: "healthy",
        last_health_check: expect.any(String),
      }),
    );
  });

  it("marks a non-OK url as broken", async () => {
    const updateMock = mockLinks([
      { id: "link-2", url: "https://broken.example" },
    ]);
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 404,
    });
    const handler = await loadHandler();

    await handler(fakeEvent({ authorization: "Bearer test-cron-secret" }));

    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        health_status: "broken",
        last_health_check: expect.any(String),
      }),
    );
  });

  it("marks a url whose fetch throws (e.g. timeout) as broken", async () => {
    const updateMock = mockLinks([
      { id: "link-3", url: "https://timeout.example" },
    ]);
    (fetch as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("timeout"),
    );
    const handler = await loadHandler();

    await handler(fakeEvent({ authorization: "Bearer test-cron-secret" }));

    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        health_status: "broken",
        last_health_check: expect.any(String),
      }),
    );
  });

  it("checks every link even when one throws", async () => {
    const updateMock = mockLinks([
      { id: "link-a", url: "https://a.example" },
      { id: "link-b", url: "https://b.example" },
    ]);
    (fetch as unknown as ReturnType<typeof vi.fn>)
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce({ ok: true, status: 200 });
    const handler = await loadHandler();

    const result = (await handler(
      fakeEvent({ authorization: "Bearer test-cron-secret" }),
    )) as { total: number };

    expect(result.total).toBe(2);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(updateMock).toHaveBeenCalledTimes(2);
  });
});
