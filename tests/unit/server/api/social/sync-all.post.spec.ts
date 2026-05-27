import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Nuxt auto-import
(global as unknown as { useRuntimeConfig: unknown }).useRuntimeConfig = vi.fn(
  () => ({
    twitterBearerToken: "tw-token",
    instagramAccessToken: "ig-token",
  }),
);

const { loggerMock } = vi.hoisted(() => ({
  loggerMock: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("~/server/utils/logger", () => ({
  useLogger: () => loggerMock,
  createLogger: () => loggerMock,
}));

// Force shared-secret check to depend purely on string equality so tests don't
// need real timing-safe-equal buffers.
vi.mock("~/server/utils/secrets", () => ({
  verifySharedSecret: vi.fn(
    (a: string, b: string) => !!a && !!b && a === b,
  ),
}));

// Tracked service mocks
const { twitterFetchMock, instagramFetchMock } = vi.hoisted(() => ({
  twitterFetchMock: vi.fn(),
  instagramFetchMock: vi.fn(),
}));

vi.mock("~/server/utils/twitterService", () => ({
  TwitterService: class {
    fetchTweetsForHandles = twitterFetchMock;
  },
}));

vi.mock("~/server/utils/instagramService", () => ({
  InstagramService: class {
    fetchMediaForHandles = instagramFetchMock;
  },
}));

vi.mock("~/utils/sentimentAnalysis", () => ({
  analyzeSentiment: vi.fn(() => ({ sentiment: "neutral", score: 0 })),
}));

// Supabase mock — we override per test via mockState
type TableResult = {
  data?: unknown;
  error?: unknown;
};
const { supabaseState } = vi.hoisted(() => ({
  supabaseState: {
    handlers: {} as Record<
      string,
      (op: string, args?: unknown) => Promise<TableResult>
    >,
  },
}));

function makeQuery(table: string) {
  const lastArgs: { select?: unknown; in?: unknown; eq?: unknown } = {};
  const handler = supabaseState.handlers[table];

  // q is both chainable AND thenable — awaiting it triggers the most recent op
  let lastOp: string = "select";
  let lastOpArgs: unknown = undefined;

  const q: Record<string, unknown> = {};
  q.select = vi.fn((cols: unknown) => {
    lastArgs.select = cols;
    lastOp = "select";
    lastOpArgs = cols;
    return q;
  });
  q.eq = vi.fn((...args: unknown[]) => {
    lastArgs.eq = args;
    lastOp = "eq";
    lastOpArgs = args;
    return q;
  });
  q.in = vi.fn((...args: unknown[]) => {
    lastArgs.in = args;
    lastOp = "in";
    lastOpArgs = args;
    return q;
  });
  q.insert = vi.fn(async (row: unknown) =>
    handler ? handler("insert", row) : { data: null, error: null },
  );
  q.then = (
    onFulfilled: (v: { data?: unknown; error?: unknown }) => unknown,
  ) => {
    const result = handler
      ? handler(lastOp, lastOpArgs)
      : Promise.resolve({ data: [], error: null });
    return Promise.resolve(result).then(onFulfilled);
  };
  return q;
}

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn((table: string) => makeQuery(table)),
  })),
}));

vi.mock("h3", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    getHeader: vi.fn(),
    defineEventHandler: (fn: (event: unknown) => unknown) => fn,
    createError: (opts: { statusCode: number; statusMessage: string }) => {
      const err = new Error(opts.statusMessage) as Error & {
        statusCode: number;
      };
      err.statusCode = opts.statusCode;
      return err;
    },
  };
});

import * as h3 from "h3";

const originalSyncKey = process.env.SYNC_API_KEY;
const originalSupaUrl = process.env.NUXT_PUBLIC_SUPABASE_URL;
const originalSupaKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const mockEvent = {
  context: {},
  node: { req: { headers: {} }, res: {} },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any;

async function loadHandler() {
  vi.resetModules();
  const mod = await import("~/server/api/social/sync-all.post");
  return mod.default;
}

describe("POST /api/social/sync-all", () => {
  beforeEach(() => {
    Object.values(loggerMock).forEach((fn) => fn.mockClear());
    twitterFetchMock.mockReset();
    instagramFetchMock.mockReset();
    supabaseState.handlers = {};
    process.env.SYNC_API_KEY = "valid-secret";
    process.env.NUXT_PUBLIC_SUPABASE_URL = "http://localhost";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key";
    vi.mocked(h3.getHeader).mockReturnValue("Bearer valid-secret");
  });

  afterEach(() => {
    process.env.SYNC_API_KEY = originalSyncKey;
    process.env.NUXT_PUBLIC_SUPABASE_URL = originalSupaUrl;
    process.env.SUPABASE_SERVICE_ROLE_KEY = originalSupaKey;
  });

  it("returns 500 when SYNC_API_KEY is missing", async () => {
    delete process.env.SYNC_API_KEY;
    const handler = await loadHandler();
    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 500 });
  });

  it("returns 401 with no Authorization header", async () => {
    vi.mocked(h3.getHeader).mockReturnValue(undefined as never);
    const handler = await loadHandler();
    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 401 });
  });

  it("returns 401 with mismatched bearer token", async () => {
    vi.mocked(h3.getHeader).mockReturnValue("Bearer wrong");
    const handler = await loadHandler();
    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 401 });
  });

  it("returns 401 when Authorization header lacks 'Bearer ' prefix", async () => {
    vi.mocked(h3.getHeader).mockReturnValue("Token valid-secret");
    const handler = await loadHandler();
    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 401 });
  });

  it("returns 500 when Supabase URL env is missing", async () => {
    delete process.env.NUXT_PUBLIC_SUPABASE_URL;
    const handler = await loadHandler();
    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 500 });
  });

  it("returns 500 when users fetch fails", async () => {
    supabaseState.handlers.users = async () => ({
      data: null,
      error: { message: "db-down" },
    });
    const handler = await loadHandler();
    await expect(handler(mockEvent)).rejects.toMatchObject({
      statusCode: 500,
      message: "Failed to fetch users",
    });
  });

  it("returns zero-stats when there are no users", async () => {
    supabaseState.handlers.users = async () => ({ data: [], error: null });
    const handler = await loadHandler();
    const result = await handler(mockEvent);
    expect(result).toMatchObject({
      totalUsers: 0,
      successfulUsers: 0,
      failedUsers: 0,
      totalPostsFetched: 0,
      totalPostsInserted: 0,
      errors: [],
    });
  });

  it("counts failed users when fetching their schools errors", async () => {
    supabaseState.handlers.users = async () => ({
      data: [{ id: "user-1" }],
      error: null,
    });
    supabaseState.handlers.schools = async (op) => {
      if (op === "eq") {
        return { data: null, error: { message: "boom" } };
      }
      return { data: [], error: null };
    };
    supabaseState.handlers.coaches = async () => ({ data: [], error: null });

    const handler = await loadHandler();
    const result = await handler(mockEvent);
    expect(result.failedUsers).toBe(1);
    expect(result.successfulUsers).toBe(0);
    expect(result.errors[0]).toContain("user-1");
    expect(result.errors[0]).toContain("Failed to fetch schools");
  });

  it("inserts new posts, skips existing, increments stats, and matches school/coach by handle", async () => {
    supabaseState.handlers.users = async () => ({
      data: [{ id: "user-1" }],
      error: null,
    });
    supabaseState.handlers.schools = async () => ({
      data: [
        {
          id: "school-1",
          name: "State",
          twitter_handle: "state_tw",
          instagram_handle: null,
        },
      ],
      error: null,
    });
    supabaseState.handlers.coaches = async () => ({
      data: [
        {
          id: "coach-1",
          first_name: "Coach",
          last_name: "K",
          twitter_handle: null,
          instagram_handle: "coach_ig",
        },
      ],
      error: null,
    });

    // Existing posts: one URL is already in DB and should be skipped
    const insertedPosts: unknown[] = [];
    supabaseState.handlers.social_media_posts = async (op, args) => {
      if (op === "in") {
        return {
          data: [{ post_url: "https://twitter.com/state_tw/status/1" }],
          error: null,
        };
      }
      if (op === "insert") {
        insertedPosts.push(args);
        return { data: null, error: null };
      }
      return { data: [], error: null };
    };

    twitterFetchMock.mockResolvedValue([
      {
        platform: "twitter",
        post_url: "https://twitter.com/state_tw/status/1", // exists -> skipped
        post_content: "old",
        post_date: "2026-01-01T00:00:00Z",
        author_name: "State",
        author_handle: "state_tw",
        engagement_count: 1,
        is_recruiting_related: false,
      },
      {
        platform: "twitter",
        post_url: "https://twitter.com/state_tw/status/2", // new -> inserted
        post_content: "new tweet",
        post_date: "2026-01-02T00:00:00Z",
        author_name: "State",
        author_handle: "state_tw",
        engagement_count: 2,
        is_recruiting_related: true,
      },
    ]);
    instagramFetchMock.mockResolvedValue([
      {
        platform: "instagram",
        post_url: "https://instagram.com/p/abc/",
        post_content: "ig post",
        post_date: "2026-01-03T00:00:00Z",
        author_name: "coach_ig",
        author_handle: "coach_ig",
        engagement_count: 5,
        is_recruiting_related: false,
      },
    ]);

    const handler = await loadHandler();
    const result = await handler(mockEvent);

    expect(result.totalUsers).toBe(1);
    expect(result.successfulUsers).toBe(1);
    expect(result.failedUsers).toBe(0);
    expect(result.totalPostsFetched).toBe(3);
    expect(result.totalPostsInserted).toBe(2);
    expect(insertedPosts).toHaveLength(2);
    // school match for twitter handle
    const tweetInsert = insertedPosts[0] as { school_id: string };
    expect(tweetInsert.school_id).toBe("school-1");
    // coach match for instagram handle
    const igInsert = insertedPosts[1] as {
      school_id: string | null;
      coach_id: string;
    };
    expect(igInsert.school_id).toBeNull();
    expect(igInsert.coach_id).toBe("coach-1");
  });

  it("logs a warning and continues when an individual insert fails", async () => {
    supabaseState.handlers.users = async () => ({
      data: [{ id: "user-1" }],
      error: null,
    });
    supabaseState.handlers.schools = async () => ({
      data: [
        {
          id: "school-1",
          name: "x",
          twitter_handle: "x_tw",
          instagram_handle: null,
        },
      ],
      error: null,
    });
    supabaseState.handlers.coaches = async () => ({ data: [], error: null });
    supabaseState.handlers.social_media_posts = async (op) => {
      if (op === "in") return { data: [], error: null };
      if (op === "insert")
        return { data: null, error: { message: "insert-fail" } };
      return { data: [], error: null };
    };

    twitterFetchMock.mockResolvedValue([
      {
        platform: "twitter",
        post_url: "https://twitter.com/x_tw/status/1",
        post_content: "t",
        post_date: "2026-01-01T00:00:00Z",
        author_name: "x",
        author_handle: "x_tw",
        engagement_count: 0,
        is_recruiting_related: false,
      },
    ]);
    instagramFetchMock.mockResolvedValue([]);

    const handler = await loadHandler();
    const result = await handler(mockEvent);

    expect(result.totalPostsInserted).toBe(0);
    expect(result.successfulUsers).toBe(1);
    expect(loggerMock.warn).toHaveBeenCalledWith(
      "Failed to insert post",
      expect.objectContaining({
        post_url: "https://twitter.com/x_tw/status/1",
      }),
    );
  });

  it("does not call services when user has no handles", async () => {
    supabaseState.handlers.users = async () => ({
      data: [{ id: "user-1" }],
      error: null,
    });
    supabaseState.handlers.schools = async () => ({
      data: [
        {
          id: "s1",
          name: "x",
          twitter_handle: null,
          instagram_handle: null,
        },
      ],
      error: null,
    });
    supabaseState.handlers.coaches = async () => ({ data: [], error: null });

    const handler = await loadHandler();
    const result = await handler(mockEvent);
    expect(result.successfulUsers).toBe(1);
    expect(result.totalPostsFetched).toBe(0);
    expect(twitterFetchMock).not.toHaveBeenCalled();
    expect(instagramFetchMock).not.toHaveBeenCalled();
  });

  it("catches thrown errors from a single user and tags them in stats.errors", async () => {
    supabaseState.handlers.users = async () => ({
      data: [{ id: "user-1" }],
      error: null,
    });
    supabaseState.handlers.schools = async () => ({
      data: [
        {
          id: "s1",
          name: "x",
          twitter_handle: "h1",
          instagram_handle: null,
        },
      ],
      error: null,
    });
    supabaseState.handlers.coaches = async () => ({ data: [], error: null });
    twitterFetchMock.mockRejectedValue(new Error("twitter-broke"));
    instagramFetchMock.mockResolvedValue([]);

    const handler = await loadHandler();
    const result = await handler(mockEvent);
    expect(result.failedUsers).toBe(1);
    expect(result.errors[0]).toContain("user-1");
    expect(result.errors[0]).toContain("twitter-broke");
  });
});
