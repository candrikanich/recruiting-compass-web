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

/** TTL for generation fence keys — must outlive the longest cache tier TTL. */
const GENERATION_TTL_SECONDS = 3600;

function generationKey(key: string): string {
  return `${key}:gen`;
}

/**
 * Read the generation fence for a key: the timestamp of the most recent
 * invalidation. A `fillCache` write that started before this timestamp is
 * stale and must not overwrite what invalidation just cleared.
 */
async function getGeneration(
  redis: KvCache | null,
  key: string,
): Promise<number> {
  if (!redis) return 0;
  try {
    const value = await redis.get(generationKey(key));
    const parsed = typeof value === "number" ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  } catch {
    return 0;
  }
}

async function setGeneration(
  redis: KvCache | null,
  key: string,
  timestamp: number,
): Promise<void> {
  if (!redis) return;
  try {
    await redis.set(generationKey(key), timestamp, {
      ex: GENERATION_TTL_SECONDS,
    });
  } catch {
    // fail-open
  }
}

/**
 * Fan-out write behind `singleflight` can race with a concurrent
 * `invalidateCache`: an origin fetch that started before an invalidation can
 * still resolve and write after it, silently reviving stale data. Callers
 * pass `startedAt` (captured before the origin fetch began) so a write that
 * started before the most recent invalidation is dropped instead of applied.
 */
export async function fillCache<T>(opts: {
  keys: string[];
  namespace: string;
  envelope: CacheEnvelope<T>;
  l1TtlSeconds: number;
  l2TtlSeconds: number;
  redis: KvCache | null;
  snapshot: SnapshotStore<T> | null;
  startedAt?: number;
}): Promise<void> {
  await Promise.all(
    opts.keys.map(async (key) => {
      if (opts.startedAt !== undefined) {
        const generation = await getGeneration(opts.redis, key);
        if (generation > opts.startedAt) return;
      }
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
  const now = Date.now();
  await Promise.all([
    l1Del(opts.redis, opts.keys),
    l2Del(opts.snapshot, opts.keys),
    ...opts.keys.map((key) => setGeneration(opts.redis, key, now)),
  ]);
}
