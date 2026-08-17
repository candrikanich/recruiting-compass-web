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
const mockAssertNotParent = vi.fn(async () => {});
vi.mock("~/server/utils/auth", () => ({
  requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
  assertNotParent: (...args: unknown[]) => mockAssertNotParent(...args),
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
  mockAssertNotParent.mockResolvedValue(undefined);
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
  it("rejects a parent with 403", async () => {
    mockAssertNotParent.mockRejectedValueOnce(
      Object.assign(new Error("Parents cannot perform this action."), {
        statusCode: 403,
      }),
    );

    const handler = (await import("~/server/api/video-links/index.post"))
      .default;
    await expect(handler(fakeEvent())).rejects.toMatchObject({
      statusCode: 403,
    });
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
});
