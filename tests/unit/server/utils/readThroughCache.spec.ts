import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  computeEtag,
  fillCache,
  invalidateCache,
  l1Get,
  l2Get,
  resetSingleflight,
  singleflight,
  type KvCache,
  type SnapshotStore,
} from "~/server/utils/readThroughCache";

function memoryRedis(): KvCache & { store: Map<string, unknown> } {
  const store = new Map<string, unknown>();
  return {
    store,
    async get(key) {
      return store.has(key) ? store.get(key)! : null;
    },
    async set(key, value) {
      store.set(key, value);
    },
    async del(...keys) {
      for (const key of keys) store.delete(key);
    },
  };
}

function memorySnapshot<T>(): SnapshotStore<T> & {
  rows: Map<string, { payload: T; etag: string; expires_at: string }>;
} {
  const rows = new Map<
    string,
    { payload: T; etag: string; expires_at: string }
  >();
  return {
    rows,
    async get(key) {
      return rows.get(key) ?? null;
    },
    async put(key, _namespace, payload, etag, ttlSeconds) {
      rows.set(key, {
        payload,
        etag,
        expires_at: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
      });
    },
    async del(keys) {
      for (const key of keys) rows.delete(key);
    },
  };
}

describe("readThroughCache", () => {
  beforeEach(() => {
    resetSingleflight();
  });

  it("computeEtag is stable for the same payload and quoted", () => {
    const a = computeEtag({ name: "Ada" });
    const b = computeEtag({ name: "Ada" });
    expect(a).toBe(b);
    expect(a.startsWith('"')).toBe(true);
    expect(a.endsWith('"')).toBe(true);
    expect(computeEtag({ name: "Bob" })).not.toBe(a);
  });

  it("l1Get returns the envelope and l1 miss is null", async () => {
    const redis = memoryRedis();
    await redis.set("k", { data: { n: 1 }, etag: '"abc"' }, { ex: 60 });
    expect(await l1Get(redis, "k")).toEqual({ data: { n: 1 }, etag: '"abc"' });
    expect(await l1Get(redis, "missing")).toBeNull();
    expect(await l1Get(null, "k")).toBeNull();
  });

  it("l1Get fail-opens when redis throws", async () => {
    const redis: KvCache = {
      get: async () => {
        throw new Error("boom");
      },
      set: async () => {
        throw new Error("boom");
      },
      del: async () => {
        throw new Error("boom");
      },
    };
    expect(await l1Get(redis, "k")).toBeNull();
  });

  it("l2Get ignores expired rows", async () => {
    const snapshot = memorySnapshot<{ n: number }>();
    snapshot.rows.set("k", {
      payload: { n: 1 },
      etag: '"x"',
      expires_at: new Date(Date.now() - 1000).toISOString(),
    });
    expect(await l2Get(snapshot, "k")).toBeNull();
  });

  it("fillCache writes L1 and L2; invalidate removes both", async () => {
    const redis = memoryRedis();
    const snapshot = memorySnapshot<{ n: number }>();
    const envelope = { data: { n: 7 }, etag: '"e"' };
    await fillCache({
      keys: ["a", "b"],
      namespace: "ns",
      envelope,
      l1TtlSeconds: 60,
      l2TtlSeconds: 300,
      redis,
      snapshot,
    });
    expect(await l1Get(redis, "a")).toEqual(envelope);
    expect(await l2Get(snapshot, "b")).toEqual(envelope);

    await invalidateCache({ keys: ["a", "b"], redis, snapshot });
    expect(await l1Get(redis, "a")).toBeNull();
    expect(await l2Get(snapshot, "a")).toBeNull();
  });

  it("singleflight coalesces concurrent callers onto one execution", async () => {
    let calls = 0;
    const load = vi.fn(async () => {
      calls += 1;
      await new Promise((r) => setTimeout(r, 20));
      return "ok";
    });
    const [a, b, c] = await Promise.all([
      singleflight("k", load),
      singleflight("k", load),
      singleflight("k", load),
    ]);
    expect([a, b, c]).toEqual(["ok", "ok", "ok"]);
    expect(calls).toBe(1);
  });
});
