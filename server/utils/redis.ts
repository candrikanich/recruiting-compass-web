import { Redis } from "@upstash/redis";
import { createLogger } from "./logger";

const logger = createLogger("redis");

/**
 * Construct the Upstash client defensively.
 *
 * Caching is optional infrastructure — a missing OR malformed Upstash env var
 * must never crash the server. A present-but-invalid value (e.g. a URL that
 * does not start with https://) makes `new Redis()` throw synchronously at
 * module load, which previously took down every route with a 500. Degrade to
 * "no cache" (null) instead and let callers fall back to their source of truth.
 */
function createRedisClient(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  try {
    return new Redis({ url, token });
  } catch (err) {
    logger.error(
      "Failed to initialize Upstash client; caching disabled",
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}

export const redis: Redis | null = createRedisClient();

/**
 * Common cache key prefixes for consistency
 */
export const CACHE_KEYS = {
  COLLEGE_SEARCH: (query: string) =>
    `college:search:${query.toLowerCase().trim()}`,
  COLLEGE_ID: (id: string) => `college:id:${id}`,
  NCAA_METADATA: "ncaa:metadata:all",
  NCES_SEARCH: (q: string, state: string) =>
    `nces:search:${q.toLowerCase().trim()}:${state.toLowerCase()}`,
} as const;

/**
 * Default TTLs in seconds
 */
export const TTL = {
  ONE_HOUR: 3600,
  ONE_DAY: 86400,
  THIRTY_DAYS: 2592000,
} as const;
