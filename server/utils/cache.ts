/**
 * Server-side caching utility for static data
 * Reduces database queries for frequently accessed but rarely-changing data
 * Performance optimization: Cache hit avoids database round trip (saves ~100-300ms per query)
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<any>>();

/**
 * Get cached data or return null if expired/missing
 */
export function getCached<T>(key: string): T | null {
  const entry = cache.get(key);

  if (!entry) return null;

  // Check if expired
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }

  return entry.data as T;
}

/**
 * Set cached data with TTL
 * @param key Cache key
 * @param data Data to cache
 * @param ttlSeconds Time to live in seconds (default: 1 hour)
 */
export function setCached<T>(
  key: string,
  data: T,
  ttlSeconds: number = 3600,
): void {
  cache.set(key, {
    data,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

/**
 * Clear specific cache entry
 */
export function clearCache(key: string): void {
  cache.delete(key);
}

/**
 * Clear all cache entries
 */
export function clearAllCache(): void {
  cache.clear();
}

/**
 * Clear cache entries matching a pattern
 * Useful for invalidating related caches (e.g., all division-related caches)
 */
export function clearCachePattern(pattern: RegExp): void {
  for (const key of cache.keys()) {
    if (pattern.test(key)) {
      cache.delete(key);
    }
  }
}

/**
 * Get or fetch cached data with fallback to async function
 * Automatically caches the result
 * @param key Cache key
 * @param fetchFn Async function to call if cache miss
 * @param ttlSeconds Time to cache (default: 1 hour)
 */
export async function getOrFetch<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttlSeconds: number = 3600,
): Promise<T> {
  // Check cache first
  const cached = getCached<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Fetch and cache
  const data = await fetchFn();
  setCached(key, data, ttlSeconds);
  return data;
}
