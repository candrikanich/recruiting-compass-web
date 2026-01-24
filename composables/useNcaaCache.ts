/**
 * NCAA Lookup Cache Management
 * Manages session-based caching for NCAA school lookups
 * Prevents duplicate lookups and improves performance
 */

import { ref } from "vue";

export interface NcaaLookupResult {
  division: "D1" | "D2" | "D3";
  conference?: string;
  logo?: string;
}

/**
 * Session-based cache for NCAA lookups
 * Key: normalized school name, Value: lookup result
 */
let lookupCache: Map<string, NcaaLookupResult> | null = null;

/**
 * Composable for managing NCAA lookup cache
 * Handles cache initialization, retrieval, storage, and invalidation
 */
export const useNcaaCache = () => {
  const cacheSize = ref(0);

  /**
   * Initialize cache if not already done
   */
  const initializeCache = () => {
    if (!lookupCache) {
      lookupCache = new Map();
    }
  };

  /**
   * Get cached result for a normalized school name
   */
  const getCached = (normalizedName: string): NcaaLookupResult | null => {
    initializeCache();
    return lookupCache!.get(normalizedName) || null;
  };

  /**
   * Store result in cache
   */
  const setCached = (
    normalizedName: string,
    result: NcaaLookupResult,
  ): void => {
    initializeCache();
    lookupCache!.set(normalizedName, result);
    cacheSize.value = lookupCache!.size;
  };

  /**
   * Check if a result is cached
   */
  const isCached = (normalizedName: string): boolean => {
    initializeCache();
    return lookupCache!.has(normalizedName);
  };

  /**
   * Clear all cache entries
   */
  const clearCache = (): void => {
    if (lookupCache) {
      lookupCache.clear();
      cacheSize.value = 0;
    }
  };

  /**
   * Invalidate cache entry for a specific school
   */
  const invalidateEntry = (normalizedName: string): void => {
    if (lookupCache?.has(normalizedName)) {
      lookupCache.delete(normalizedName);
      cacheSize.value = lookupCache.size;
    }
  };

  /**
   * Get current cache statistics
   */
  const getCacheStats = () => {
    initializeCache();
    return {
      size: lookupCache!.size,
      entries: Array.from(lookupCache!.keys()),
    };
  };

  /**
   * Preload cache with multiple entries
   */
  const preloadCache = (entries: Array<[string, NcaaLookupResult]>): void => {
    initializeCache();
    for (const [key, value] of entries) {
      lookupCache!.set(key, value);
    }
    cacheSize.value = lookupCache!.size;
  };

  return {
    cacheSize,
    getCached,
    setCached,
    isCached,
    clearCache,
    invalidateEntry,
    getCacheStats,
    preloadCache,
  };
};
