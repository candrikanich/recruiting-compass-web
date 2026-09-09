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
const mockGetUserRole = vi.fn(async () => "player");
vi.mock("~/server/utils/auth", () => ({
  requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
  getUserRole: (...args: unknown[]) => mockGetUserRole(...args),
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

/**
 * Handles the two sequential `family_members` queries getLinkedAthleteId
 * issues for a parent caller: their own membership, then the family's player
 * row. Pass through to a caller-supplied handler for any other table.
 */
function familyMembersRedirectingTo(
  athleteId: string,
  otherTables: (table: string) => unknown,
) {
  let call = 0;
  return (table: string) => {
    if (table !== "family_members") return otherTables(table);
    call += 1;
    if (call === 1) {
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({
                  data: { family_unit_id: "fam-1" },
                  error: null,
                }),
            }),
          }),
        }),
      };
    }
    // 2nd call: player members list (awaited directly). Later calls (e.g.
    // an endpoint's own family_unit_id lookup) chain further .eq()s before
    // .maybeSingle() — this node supports any depth of both.
    const listResult = Promise.resolve({
      data: [{ user_id: athleteId }],
      error: null,
    });
    const chain: Record<string, unknown> = {
      eq: () => chain,
      maybeSingle: () =>
        Promise.resolve({ data: { family_unit_id: "fam-1" }, error: null }),
      then: (
        resolve: (v: unknown) => unknown,
        reject: (e: unknown) => unknown,
      ) => listResult.then(resolve, reject),
    };
    return { select: () => chain };
  };
}

function fakeEvent(params: Record<string, string> = {}): H3Event {
  return {
    node: { req: { headers: {} }, res: {} },
    context: { params },
  } as unknown as H3Event;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireAuth.mockResolvedValue({ id: "user-1", email: "p@t" });
  mockGetUserRole.mockResolvedValue("player");
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
  it("redirects a parent's create to their linked athlete's row (family-shared profile, #555)", async () => {
    mockGetUserRole.mockResolvedValueOnce("parent");
    mockReadBody.mockResolvedValue({
      platform: "hudl",
      url: "https://hudl.com/video/1",
    });

    mockSupabase.from.mockImplementation(
      familyMembersRedirectingTo("athlete-9", (table) => {
        if (table === "video_links") {
          return {
            select: () => ({
              eq: () => Promise.resolve({ count: 0, error: null }),
            }),
            insert: (payload: unknown) => ({
              select: () => ({
                single: () =>
                  Promise.resolve({
                    data: { id: "v1", ...(payload as object) },
                    error: null,
                  }),
              }),
            }),
          };
        }
        throw new Error(`unexpected table ${table}`);
      }),
    );

    const handler = (await import("~/server/api/video-links/index.post"))
      .default;
    const res = (await handler(fakeEvent())) as {
      videoLink: { user_id: string };
    };

    expect(res.videoLink.user_id).toBe("athlete-9");
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

  it("redirects a parent's edit to their linked athlete's row (family-shared profile, #555)", async () => {
    mockGetUserRole.mockResolvedValueOnce("parent");
    mockReadBody.mockResolvedValue({ title: "New title" });
    const captured: { update?: unknown } = {};

    mockSupabase.from.mockImplementation(
      familyMembersRedirectingTo("athlete-9", (table) => {
        if (table === "video_links") {
          return {
            update: (payload: unknown) => {
              captured.update = payload;
              return {
                eq: () => ({
                  eq: () => ({
                    select: () => ({
                      maybeSingle: () =>
                        Promise.resolve({
                          data: { id: VALID_ID, title: "New title" },
                          error: null,
                        }),
                    }),
                  }),
                }),
              };
            },
          };
        }
        throw new Error(`unexpected table ${table}`);
      }),
    );

    const handler = (await import("~/server/api/video-links/[id].patch"))
      .default;
    const res = (await handler(fakeEvent({ id: VALID_ID }))) as {
      videoLink: { id: string };
    };

    expect(res.videoLink.id).toBe(VALID_ID);
    expect(captured.update).toMatchObject({ title: "New title" });
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
});
