import { Redis } from "@upstash/redis";

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

export const redis: Redis | null = url && token ? new Redis({ url, token }) : null;

/**
 * Common cache key prefixes for consistency
 */
export const CACHE_KEYS = {
  COLLEGE_SEARCH: (query: string) => `college:search:${query.toLowerCase().trim()}`,
  COLLEGE_ID: (id: string) => `college:id:${id}`,
  NCAA_METADATA: "ncaa:metadata:all",
} as const;

/**
 * Default TTLs in seconds
 */
export const TTL = {
  ONE_HOUR: 3600,
  ONE_DAY: 86400,
  THIRTY_DAYS: 2592000,
} as const;
