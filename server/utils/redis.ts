import { Redis } from "@upstash/redis";
import { createLogger } from "./logger";

const logger = createLogger("redis");

/**
 * Construct the Upstash client defensively.
 *
 * Caching is optional infrastructure — a missing OR malformed Upstash env var
 * must never crash the server. The real-world failure was an env value with a
 * trailing newline (a paste artifact in the Vercel dashboard): it is truthy so
 * it passes a presence check, the Upstash constructor only `console.warn`s
 * about the whitespace, and the newline then breaks the underlying `fetch()`
 * at request time — taking down every route with a 500.
 *
 * Defense: `.trim()` the values (strips stray newlines/spaces) and require a
 * well-formed https URL. Anything else degrades to "no cache" (null) and lets
 * callers fall back to their source of truth instead of crashing.
 */
function createRedisClient(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) return null;
  if (!/^https:\/\/[^\s]+$/.test(url)) {
    logger.error(
      "UPSTASH_REDIS_REST_URL is not a valid https URL; caching disabled",
    );
    return null;
  }
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
