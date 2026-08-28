import { describe, it, expect, vi, beforeEach } from "vitest";

const auth = vi.hoisted(() => ({
  requireAuth: vi.fn(async () => ({ id: "caller-id", email: "a@b.com" })),
}));

const athlete = vi.hoisted(() => ({
  resolveTargetAthleteId: vi.fn(
    async (_e: unknown, _caller: string, requested?: string) =>
      requested ?? _caller,
  ),
}));

const db = vi.hoisted(() => ({
  membership: {
    data: { family_unit_id: "fam-1" },
    error: null as null | { message: string },
  },
  insertError: null as null | { message: string },
}));

const cache = vi.hoisted(() => ({
  deleteShared: vi.fn(async () => undefined),
}));

vi.mock("~/server/utils/auth", () => ({ requireAuth: auth.requireAuth }));
vi.mock("~/server/utils/athleteAccess", () => ({
  resolveTargetAthleteId: athlete.resolveTargetAthleteId,
}));
vi.mock("~/server/utils/logger", () => ({
  useLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}));
vi.mock("~/server/utils/sharedCache", () => ({
  deleteShared: cache.deleteShared,
}));
vi.mock("~/server/utils/redis", () => ({
  CACHE_KEYS: { SCHOOL_RECS: (id: string) => `rec:v1:${id}` },
}));
vi.mock("~/server/utils/supabase", () => ({
  useSupabaseAdmin: () => ({
    from: (table: string) => {
      if (table === "family_members") {
        const chain = {
          select: () => chain,
          eq: () => chain,
          limit: () => chain,
          maybeSingle: async () => db.membership,
        };
        return chain;
      }
      if (table === "school_recommendation_dismissals") {
        return {
          upsert: async () => ({ error: db.insertError }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  }),
}));
vi.mock("h3", async (importOriginal) => {
  const actual = await importOriginal<typeof import("h3")>();
  return {
    ...actual,
    defineEventHandler: (fn: unknown) => fn,
    readBody: vi.fn(),
    createError: (config: { statusCode: number; statusMessage: string }) => {
      const err = new Error(config.statusMessage) as Error & {
        statusCode: number;
      };
      err.statusCode = config.statusCode;
      return err;
    },
  };
});

import { readBody } from "h3";
import handler from "~/server/api/schools/recommendations/dismiss.post";

describe("POST /api/schools/recommendations/dismiss", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.membership = { data: { family_unit_id: "fam-1" }, error: null };
    db.insertError = null;
    vi.mocked(readBody).mockResolvedValue({
      catalogKey: "Ohio State University",
    });
  });

  it("upserts a normalized catalog key and busts the cache", async () => {
    const result = await handler({} as never);
    expect(result).toEqual({
      dismissed: true,
      catalogKey: "ohio state university",
    });
    expect(cache.deleteShared).toHaveBeenCalledWith("rec:v1:caller-id");
  });

  it("rejects a missing catalog key", async () => {
    vi.mocked(readBody).mockResolvedValue({});
    await expect(handler({} as never)).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it("rejects when the athlete has no family unit", async () => {
    db.membership = { data: null as never, error: null };
    await expect(handler({} as never)).rejects.toMatchObject({
      statusCode: 400,
    });
  });
});
