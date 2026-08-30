import { createHash } from "node:crypto";
import {
  clearCache,
  clearCachePattern,
  getCached,
  setCached,
} from "~/server/utils/cache";
import { createLogger } from "~/server/utils/logger";
import { redis } from "~/server/utils/redis";
import { useSupabaseAdmin } from "~/server/utils/supabase";

const logger = createLogger("shared-cache");

const inflight = new Map<string, Promise<unknown>>();

export type SharedCacheSource = "memory" | "redis" | "postgres" | "origin";

export interface SharedCacheResult<T> {
  data: T;
  source: SharedCacheSource;
}

export function hashCacheSignal(value: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex")
    .slice(0, 16);
}

function isExpired(expiresAt: string | null | undefined): boolean {
  if (!expiresAt) return true;
  return Date.parse(expiresAt) <= Date.now();
}

async function readRedis<T>(key: string): Promise<T | null> {
  if (!redis) return null;
  try {
    const cached = await redis.get<T>(key);
    return cached == null ? null : cached;
  } catch (err) {
    logger.warn("Redis cache read failed", err);
    return null;
  }
}

async function writeRedis<T>(
  key: string,
  data: T,
  ttlSeconds: number,
): Promise<void> {
  if (!redis) return;
  try {
    await redis.set(key, data, { ex: ttlSeconds });
  } catch (err) {
    logger.warn("Redis cache write failed", err);
  }
}

async function readPostgres<T>(key: string): Promise<T | null> {
  try {
    const supabase = useSupabaseAdmin();
    const { data, error } = await supabase
      .from("response_cache")
      .select("payload, expires_at")
      .eq("cache_key", key)
      .maybeSingle();
    if (error) {
      logger.warn("Postgres cache read failed", error);
      return null;
    }
    if (!data || isExpired(data.expires_at)) return null;
    return data.payload as T;
  } catch (err) {
    logger.warn("Postgres cache read failed", err);
    return null;
  }
}

async function writePostgres<T>(
  key: string,
  data: T,
  ttlSeconds: number,
): Promise<void> {
  try {
    const supabase = useSupabaseAdmin();
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
    const { error } = await supabase.from("response_cache").upsert(
      {
        cache_key: key,
        payload: data as never,
        expires_at: expiresAt,
      },
      { onConflict: "cache_key" },
    );
    if (error) logger.warn("Postgres cache write failed", error);
  } catch (err) {
    logger.warn("Postgres cache write failed", err);
  }
}

async function loadThrough<T>(
  key: string,
  ttlSeconds: number,
  fetchFn: () => Promise<T>,
): Promise<SharedCacheResult<T>> {
  const memoryHit = getCached<T>(key);
  if (memoryHit !== null) {
    return { data: memoryHit, source: "memory" };
  }

  const redisHit = await readRedis<T>(key);
  if (redisHit !== null) {
    setCached(key, redisHit, ttlSeconds);
    return { data: redisHit, source: "redis" };
  }

  const postgresHit = await readPostgres<T>(key);
  if (postgresHit !== null) {
    setCached(key, postgresHit, ttlSeconds);
    void writeRedis(key, postgresHit, ttlSeconds);
    return { data: postgresHit, source: "postgres" };
  }

  const data = await fetchFn();
  setCached(key, data, ttlSeconds);
  void writeRedis(key, data, ttlSeconds);
  void writePostgres(key, data, ttlSeconds);
  return { data, source: "origin" };
}

/**
 * Cache-aside across three layers:
 *   L1 in-process Map (this isolate only)
 *   L2 Upstash Redis (optional shared)
 *   L3 Postgres `response_cache` (always available; Redis-missing fallback)
 *
 * Fail-open on every cache error. Concurrent misses on the same isolate share
 * one inflight promise so a stampede does not fan out to origin.
 */
export async function getOrSetShared<T>(
  key: string,
  ttlSeconds: number,
  fetchFn: () => Promise<T>,
): Promise<SharedCacheResult<T>> {
  const existing = inflight.get(key);
  if (existing) {
    return existing as Promise<SharedCacheResult<T>>;
  }

  const pending = loadThrough(key, ttlSeconds, fetchFn).finally(() => {
    inflight.delete(key);
  });
  inflight.set(key, pending);
  return pending;
}

export async function deleteShared(key: string): Promise<void> {
  clearCache(key);
  inflight.delete(key);

  if (redis) {
    try {
      await redis.del(key);
    } catch (err) {
      logger.warn("Redis cache delete failed", err);
    }
  }

  try {
    const supabase = useSupabaseAdmin();
    const { error } = await supabase
      .from("response_cache")
      .delete()
      .eq("cache_key", key);
    if (error) logger.warn("Postgres cache delete failed", error);
  } catch (err) {
    logger.warn("Postgres cache delete failed", err);
  }
}

export async function deleteSharedByPrefix(prefix: string): Promise<void> {
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  clearCachePattern(new RegExp(`^${escaped}`));

  for (const key of inflight.keys()) {
    if (key.startsWith(prefix)) inflight.delete(key);
  }

  if (redis) {
    try {
      await redis.del(`${prefix}*`);
    } catch (err) {
      logger.warn("Redis cache prefix delete failed", err);
    }
  }

  try {
    const supabase = useSupabaseAdmin();
    const { error } = await supabase
      .from("response_cache")
      .delete()
      .like("cache_key", `${prefix}%`);
    if (error) logger.warn("Postgres cache prefix delete failed", error);
  } catch (err) {
    logger.warn("Postgres cache prefix delete failed", err);
  }
}
