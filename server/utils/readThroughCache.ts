/**
 * Generic two-tier read-through cache for serverless Nitro routes.
 *
 * L1: Upstash Redis (optional — null when env is missing/malformed)
 * L2: Postgres `cache_snapshots` (optional — fail-open if the table is not
 *     migrated yet or the query throws)
 *
 * Both layers are fail-open: a cache error never fails the request. Origin
 * remains the source of truth. Singleflight coalesces concurrent misses for
 * the same key inside one isolate (Vercel fluid / warm instance).
 */
import { createHash } from "node:crypto";

export type CacheSource = "l1" | "l2" | "origin";

export interface CacheEnvelope<T> {
  data: T;
  etag: string;
}

export interface KvCache {
  get: (key: string) => Promise<unknown>;
  set: (key: string, value: unknown, opts: { ex: number }) => Promise<unknown>;
  del: (...keys: string[]) => Promise<unknown>;
}

export interface SnapshotRow<T> {
  payload: T;
  etag: string;
  expires_at: string;
}

export interface SnapshotStore<T> {
  get: (key: string) => Promise<SnapshotRow<T> | null>;
  put: (
    key: string,
    namespace: string,
    payload: T,
    etag: string,
    ttlSeconds: number,
  ) => Promise<void>;
  del: (keys: string[]) => Promise<void>;
}

const inflight = new Map<string, Promise<unknown>>();

export function computeEtag(payload: unknown): string {
  const hex = createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex")
    .slice(0, 16);
  return `"${hex}"`;
}

export function isCacheEnvelope<T>(value: unknown): value is CacheEnvelope<T> {
  if (typeof value !== "object" || value === null) return false;
  return "data" in value && "etag" in value;
}

export async function singleflight<T>(
  key: string,
  fn: () => Promise<T>,
): Promise<T> {
  const existing = inflight.get(key);
  if (existing) return existing as Promise<T>;
  const pending = fn().finally(() => {
    inflight.delete(key);
  });
  inflight.set(key, pending);
  return pending;
}

/** Test-only: drop in-flight coalescing state between cases. */
export function resetSingleflight(): void {
  inflight.clear();
}

export async function l1Get<T>(
  redis: KvCache | null,
  key: string,
): Promise<CacheEnvelope<T> | null> {
  if (!redis) return null;
  try {
    const cached = await redis.get(key);
    if (isCacheEnvelope<T>(cached)) return cached;
    return null;
  } catch {
    return null;
  }
}

export async function l1Set<T>(
  redis: KvCache | null,
  key: string,
  envelope: CacheEnvelope<T>,
  ttlSeconds: number,
): Promise<void> {
  if (!redis) return;
  try {
    await redis.set(key, envelope, { ex: ttlSeconds });
  } catch {
    // fail-open
  }
}

export async function l1Del(
  redis: KvCache | null,
  keys: string[],
): Promise<void> {
  if (!redis || keys.length === 0) return;
  try {
    await redis.del(...keys);
  } catch {
    // fail-open
  }
}

export async function l2Get<T>(
  snapshot: SnapshotStore<T> | null,
  key: string,
): Promise<CacheEnvelope<T> | null> {
  if (!snapshot) return null;
  try {
    const row = await snapshot.get(key);
    if (!row) return null;
    if (Date.parse(row.expires_at) <= Date.now()) return null;
    return { data: row.payload, etag: row.etag };
  } catch {
    return null;
  }
}

export async function l2Set<T>(
  snapshot: SnapshotStore<T> | null,
  key: string,
  namespace: string,
  envelope: CacheEnvelope<T>,
  ttlSeconds: number,
): Promise<void> {
  if (!snapshot) return;
  try {
    await snapshot.put(
      key,
      namespace,
      envelope.data,
      envelope.etag,
      ttlSeconds,
    );
  } catch {
    // fail-open
  }
}

export async function l2Del<T>(
  snapshot: SnapshotStore<T> | null,
  keys: string[],
): Promise<void> {
  if (!snapshot || keys.length === 0) return;
  try {
    await snapshot.del(keys);
  } catch {
    // fail-open
  }
}

export async function fillCache<T>(opts: {
  keys: string[];
  namespace: string;
  envelope: CacheEnvelope<T>;
  l1TtlSeconds: number;
  l2TtlSeconds: number;
  redis: KvCache | null;
  snapshot: SnapshotStore<T> | null;
}): Promise<void> {
  await Promise.all(
    opts.keys.map(async (key) => {
      await l1Set(opts.redis, key, opts.envelope, opts.l1TtlSeconds);
      await l2Set(
        opts.snapshot,
        key,
        opts.namespace,
        opts.envelope,
        opts.l2TtlSeconds,
      );
    }),
  );
}

export async function invalidateCache<T>(opts: {
  keys: string[];
  redis: KvCache | null;
  snapshot: SnapshotStore<T> | null;
}): Promise<void> {
  await Promise.all([
    l1Del(opts.redis, opts.keys),
    l2Del(opts.snapshot, opts.keys),
  ]);
}
