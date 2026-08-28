import { describe, it, expect, vi, beforeEach } from "vitest";

const redisState = vi.hoisted(() => {
  const store = new Map<string, unknown>();
  return {
    store,
    client: {
      get: async (key: string) => store.get(key) ?? null,
      set: async (key: string, value: unknown) => {
        store.set(key, value);
      },
      del: async (key: string) => {
        store.delete(key);
      },
    },
  };
});

vi.mock("~/server/utils/logger", () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

vi.mock("~/server/utils/redis", () => ({
  redis: redisState.client,
}));

const postgres = vi.hoisted(() => ({
  rows: new Map<string, { payload: unknown; expires_at: string }>(),
  error: null as { message: string } | null,
}));

vi.mock("~/server/utils/supabase", () => ({
  useSupabaseAdmin: () => ({
    from: (table: string) => {
      if (table !== "response_cache") {
        throw new Error(`unexpected table ${table}`);
      }
      return {
        select: () => ({
          eq: (_col: string, key: string) => ({
            maybeSingle: async () => {
              if (postgres.error) return { data: null, error: postgres.error };
              const row = postgres.rows.get(key);
              return { data: row ?? null, error: null };
            },
          }),
        }),
        upsert: async (row: {
          cache_key: string;
          payload: unknown;
          expires_at: string;
        }) => {
          if (postgres.error) return { error: postgres.error };
          postgres.rows.set(row.cache_key, {
            payload: row.payload,
            expires_at: row.expires_at,
          });
          return { error: null };
        },
        delete: () => ({
          eq: async (_col: string, key: string) => {
            postgres.rows.delete(key);
            return { error: postgres.error };
          },
          like: async (_col: string, pattern: string) => {
            const prefix = pattern.replace(/%$/, "");
            for (const key of postgres.rows.keys()) {
              if (key.startsWith(prefix)) postgres.rows.delete(key);
            }
            return { error: postgres.error };
          },
        }),
      };
    },
  }),
}));

import {
  deleteShared,
  getOrSetShared,
  hashCacheSignal,
} from "~/server/utils/sharedCache";
import { clearAllCache } from "~/server/utils/cache";

describe("sharedCache", () => {
  beforeEach(() => {
    clearAllCache();
    redisState.store.clear();
    postgres.rows.clear();
    postgres.error = null;
  });

  it("hashes signals stably", () => {
    expect(hashCacheSignal({ a: 1, b: "x" })).toBe(
      hashCacheSignal({ a: 1, b: "x" }),
    );
    expect(hashCacheSignal({ a: 1 })).not.toBe(hashCacheSignal({ a: 2 }));
  });

  it("returns origin on a cold miss and serves memory on the next call", async () => {
    const fetchFn = vi.fn().mockResolvedValue({ n: 1 });
    const first = await getOrSetShared("k", 60, fetchFn);
    expect(first.source).toBe("origin");
    expect(fetchFn).toHaveBeenCalledOnce();

    const second = await getOrSetShared("k", 60, fetchFn);
    expect(second.source).toBe("memory");
    expect(second.data).toEqual({ n: 1 });
    expect(fetchFn).toHaveBeenCalledOnce();
  });

  it("reads redis when memory is empty", async () => {
    redisState.store.set("k", { n: 2 });
    const fetchFn = vi.fn();
    const result = await getOrSetShared("k", 60, fetchFn);
    expect(result.source).toBe("redis");
    expect(result.data).toEqual({ n: 2 });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("reads postgres when memory and redis miss", async () => {
    postgres.rows.set("k", {
      payload: { n: 3 },
      expires_at: new Date(Date.now() + 60_000).toISOString(),
    });
    const fetchFn = vi.fn();
    const result = await getOrSetShared("k", 60, fetchFn);
    expect(result.source).toBe("postgres");
    expect(result.data).toEqual({ n: 3 });
  });

  it("skips expired postgres rows", async () => {
    postgres.rows.set("k", {
      payload: { n: 4 },
      expires_at: new Date(Date.now() - 1000).toISOString(),
    });
    const fetchFn = vi.fn().mockResolvedValue({ n: 5 });
    const result = await getOrSetShared("k", 60, fetchFn);
    expect(result.source).toBe("origin");
    expect(result.data).toEqual({ n: 5 });
  });

  it("deleteShared drops the memory entry so origin runs again", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce({ n: 1 })
      .mockResolvedValueOnce({
        n: 2,
      });
    await getOrSetShared("k", 60, fetchFn);
    await deleteShared("k");
    const result = await getOrSetShared("k", 60, fetchFn);
    expect(result.source).toBe("origin");
    expect(result.data).toEqual({ n: 2 });
  });
});
