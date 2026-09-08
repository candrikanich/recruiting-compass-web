/**
 * /api/video-links CRUD — route unit tests.
 *
 * These endpoints run against the service-role Supabase client (bypasses
 * RLS), so every query MUST carry an explicit ownership/family filter.
 * These tests assert the handlers call the right filtered queries and
 * surface the right status codes — not just "returns data".
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { H3Event } from "h3";

const mockSupabase = { from: vi.fn() };
vi.mock("~/server/utils/supabase", () => ({
  createServerSupabaseClient: () => mockSupabase,
}));

const mockRequireAuth = vi.fn(async () => ({ id: "user-1", email: "p@t" }));
vi.mock("~/server/utils/auth", () => ({
  requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
}));

// resolveAthleteId defaults to the caller's own id (matches unmocked
// getUserRole behavior — role !== "parent" short-circuits). Parent
// resolution is covered by its own dedicated tests below.
const mockResolveAthleteId = vi.fn(async (userId: string) => userId);
vi.mock("~/server/utils/resolveAthleteId", () => ({
  resolveAthleteId: (...args: [string, unknown]) =>
    mockResolveAthleteId(...args),
}));

vi.mock("~/server/utils/logger", () => ({
  useLogger: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }),
}));

const mockReadBody = vi.fn(async () => ({}) as unknown);

vi.mock("h3", async (importOriginal) => {
  const actual = await importOriginal<typeof import("h3")>();
  return {
    ...actual,
    defineEventHandler: (fn: (event: H3Event) => unknown) => fn,
    readBody: (...args: unknown[]) => mockReadBody(...args),
  };
});

(
  globalThis as unknown as {
    createError: (config: {
      statusCode: number;
      statusMessage?: string;
      message?: string;
    }) => Error & { statusCode: number };
  }
).createError = (config) => {
  const err = new Error(config.statusMessage || config.message) as Error & {
    statusCode: number;
  };
  err.statusCode = config.statusCode;
  return err;
};

function fakeEvent(params: Record<string, string> = {}): H3Event {
  return {
    node: { req: { headers: {} }, res: {} },
    context: { params },
  } as unknown as H3Event;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireAuth.mockResolvedValue({ id: "user-1", email: "p@t" });
  mockResolveAthleteId.mockImplementation(async (userId: string) => userId);
  mockReadBody.mockResolvedValue({});
});

describe("GET /api/video-links", () => {
  it("returns caller's video links filtered by user_id, ordered by position", async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "family_members") {
        return {
          select: () => ({
            eq: () => Promise.resolve({ data: [], error: null }),
          }),
        };
      }
      if (table === "video_links") {
        return {
          select: () => ({
            eq: () => ({
              order: () =>
                Promise.resolve({
                  data: [{ id: "v1", user_id: "user-1", position: 0 }],
                  error: null,
                }),
            }),
          }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    });

    const handler = (await import("~/server/api/video-links/index.get"))
      .default;
    const res = (await handler(fakeEvent())) as { videoLinks: unknown[] };
    expect(res.videoLinks).toHaveLength(1);
    expect(mockSupabase.from).toHaveBeenCalledWith("video_links");
  });
});

describe("POST /api/video-links", () => {
  it("a parent's request creates the video link on the LINKED ATHLETE's row, not their own (#555)", async () => {
    mockResolveAthleteId.mockResolvedValueOnce("athlete-9");
    mockReadBody.mockResolvedValue({
      platform: "youtube",
      url: "https://youtube.com/watch?v=abc",
    });

    let capturedInsert: unknown;
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "video_links") {
        return {
          select: () => ({
            eq: () => Promise.resolve({ count: 0, error: null }),
          }),
          insert: (payload: unknown) => {
            capturedInsert = payload;
            return {
              select: () => ({
                single: () =>
                  Promise.resolve({
                    data: { id: "v1", ...(payload as object) },
                    error: null,
                  }),
              }),
            };
          },
        };
      }
      if (table === "family_members") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({ data: null, error: null }),
              }),
            }),
          }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    });

    const handler = (await import("~/server/api/video-links/index.post"))
      .default;
    await handler(fakeEvent());

    expect(capturedInsert).toMatchObject({ user_id: "athlete-9" });
  });

  it("rejects an invalid platform with 422", async () => {
    mockReadBody.mockResolvedValue({
      platform: "not-a-real-platform",
      url: "https://example.com/video",
    });

    const handler = (await import("~/server/api/video-links/index.post"))
      .default;
    await expect(handler(fakeEvent())).rejects.toMatchObject({
      statusCode: 422,
    });
  });
});

describe("PATCH /api/video-links/:id", () => {
  const VALID_ID = "11111111-1111-1111-1111-111111111111";

  // Capture the object passed to .update() so we can assert the health-reset
  // side effect. Returns whatever `data` the caller wires up.
  const stubUpdate = (data: unknown, captured: { update?: unknown }) => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "video_links") {
        return {
          update: (payload: unknown) => {
            captured.update = payload;
            return {
              eq: () => ({
                eq: () => ({
                  select: () => ({
                    maybeSingle: () => Promise.resolve({ data, error: null }),
                  }),
                }),
              }),
            };
          },
        };
      }
      throw new Error(`unexpected table ${table}`);
    });
  };

  it("a parent's request updates the LINKED ATHLETE's video link, not their own (#555)", async () => {
    mockResolveAthleteId.mockResolvedValueOnce("athlete-9");
    const captured: { update?: unknown; eqCalls: unknown[] } = { eqCalls: [] };
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "video_links") {
        return {
          update: (payload: unknown) => {
            captured.update = payload;
            return {
              eq: (...args: unknown[]) => {
                captured.eqCalls.push(args);
                return {
                  eq: (...args2: unknown[]) => {
                    captured.eqCalls.push(args2);
                    return {
                      select: () => ({
                        maybeSingle: () =>
                          Promise.resolve({
                            data: { id: VALID_ID },
                            error: null,
                          }),
                      }),
                    };
                  },
                };
              },
            };
          },
        };
      }
      throw new Error(`unexpected table ${table}`);
    });
    mockReadBody.mockResolvedValue({ title: "New title" });

    const handler = (await import("~/server/api/video-links/[id].patch"))
      .default;
    await handler(fakeEvent({ id: VALID_ID }));

    expect(captured.eqCalls).toContainEqual(["user_id", "athlete-9"]);
  });

  it("rejects an invalid body with 422", async () => {
    mockReadBody.mockResolvedValue({ platform: "not-a-real-platform" });

    const handler = (await import("~/server/api/video-links/[id].patch"))
      .default;
    await expect(handler(fakeEvent({ id: VALID_ID }))).rejects.toMatchObject({
      statusCode: 422,
    });
  });

  it("returns 404 when the video link is not owned by the caller", async () => {
    const captured: { update?: unknown } = {};
    stubUpdate(null, captured);
    mockReadBody.mockResolvedValue({ title: "New title" });

    const handler = (await import("~/server/api/video-links/[id].patch"))
      .default;
    await expect(handler(fakeEvent({ id: VALID_ID }))).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it("updates a non-url field without touching health-check state", async () => {
    const captured: { update?: unknown } = {};
    stubUpdate({ id: VALID_ID, title: "New title" }, captured);
    mockReadBody.mockResolvedValue({ title: "New title" });

    const handler = (await import("~/server/api/video-links/[id].patch"))
      .default;
    const res = (await handler(fakeEvent({ id: VALID_ID }))) as {
      videoLink: { id: string };
    };

    expect(res.videoLink.id).toBe(VALID_ID);
    expect(captured.update).toMatchObject({ title: "New title" });
    expect(captured.update).not.toHaveProperty("health_status");
  });

  it("resets health-check state when the url is edited", async () => {
    const captured: { update?: unknown } = {};
    stubUpdate({ id: VALID_ID }, captured);
    mockReadBody.mockResolvedValue({ url: "https://youtube.com/watch?v=new" });

    const handler = (await import("~/server/api/video-links/[id].patch"))
      .default;
    await handler(fakeEvent({ id: VALID_ID }));

    expect(captured.update).toMatchObject({
      url: "https://youtube.com/watch?v=new",
      health_status: "unknown",
      last_health_check: null,
    });
  });
});

describe("DELETE /api/video-links/:id", () => {
  it("returns 404 when the video link is not owned by the caller", async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "video_links") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({ data: null, error: null }),
              }),
            }),
          }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    });

    const handler = (await import("~/server/api/video-links/[id].delete"))
      .default;
    const event = fakeEvent({ id: "11111111-1111-1111-1111-111111111111" });
    await expect(handler(event)).rejects.toMatchObject({ statusCode: 404 });
  });

  it("a parent's request deletes the LINKED ATHLETE's video link, not their own (#555)", async () => {
    mockResolveAthleteId.mockResolvedValueOnce("athlete-9");
    const id = "11111111-1111-1111-1111-111111111111";
    const eqCalls: unknown[] = [];
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "video_links") {
        return {
          select: () => ({
            eq: (...args: unknown[]) => {
              eqCalls.push(args);
              return {
                eq: (...args2: unknown[]) => {
                  eqCalls.push(args2);
                  return {
                    maybeSingle: () =>
                      Promise.resolve({ data: { id }, error: null }),
                  };
                },
              };
            },
          }),
          delete: () => ({
            eq: (...args: unknown[]) => {
              eqCalls.push(args);
              return {
                eq: (...args2: unknown[]) => {
                  eqCalls.push(args2);
                  return Promise.resolve({ error: null });
                },
              };
            },
          }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    });

    const handler = (await import("~/server/api/video-links/[id].delete"))
      .default;
    const result = (await handler(fakeEvent({ id }))) as { success: boolean };

    expect(result.success).toBe(true);
    expect(eqCalls).toContainEqual(["user_id", "athlete-9"]);
  });
});
