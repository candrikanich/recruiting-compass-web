/**
 * NCAA Division Lookup Composable
 * Maps college names to NCAA divisions using comprehensive school database
 * Supports D1, D2, D3 divisions for baseball
 * Includes built-in session-based caching for performance
 */

import { ref } from "vue";
import { DIVISION_SCHOOLS } from "./ncaaDatabase";
import type { NcaaDivision, SchoolInfo } from "./ncaaDatabase";

/**
 * NCAA Lookup Result with caching
 */
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
 * Normalize school name for better matching
 * Removes common suffixes and standardizes format
 * Handles College Scorecard naming variations
 */
const normalizeSchoolName = (name: string): string => {
  return (
    name
      .toLowerCase()
      // Remove campuses and locations
      .replace(/[-\s]+main\s+campus\b/i, "")
      .replace(/\s+at\s+.+$/i, "") // "Kent State at Kent" -> "kent state"
      .replace(/\s+\(.+\)$/i, "") // "School (Location)" -> "school"
      // Remove common suffixes
      .replace(/\s+university\b/i, "")
      .replace(/\s+college\b/i, "")
      .replace(/\s+institute\b/i, "")
      .replace(/\s+state\b/i, "")
      .replace(/\s+campus\b/i, "")
      .replace(/\s+technical\b/i, "")
      .replace(/\s+polytechnic\b/i, "")
      .trim()
  );
};

/**
 * Calculate Levenshtein distance for fuzzy matching
 */
const levenshteinDistance = (str1: string, str2: string): number => {
  const matrix: number[][] = [];
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1,
        );
      }
    }
  }
  return matrix[str2.length][str1.length];
};

/**
 * Check if a school name matches a known school
 * Uses exact, normalized, partial, and fuzzy matching
 * More strict to avoid false positives
 */
const schoolNameMatches = (schoolName: string, knownName: string): boolean => {
  const normalizedSchool = normalizeSchoolName(schoolName);
  const normalizedKnown = normalizeSchoolName(knownName);

  // Exact match
  if (normalizedSchool === normalizedKnown) return true;

  // Check if one contains the other (only for multi-word names to avoid false matches)
  if (normalizedSchool.length > 8 && normalizedKnown.length > 8) {
    if (
      normalizedSchool.includes(normalizedKnown) ||
      normalizedKnown.includes(normalizedSchool)
    ) {
      return true;
    }
  }

  // Fuzzy match using Levenshtein distance - only for similar length strings
  const lenDiff = Math.abs(normalizedSchool.length - normalizedKnown.length);
  if (lenDiff <= 3) {
    const maxDistance =
      Math.max(normalizedSchool.length, normalizedKnown.length) > 6 ? 2 : 1;
    const distance = levenshteinDistance(normalizedSchool, normalizedKnown);
    if (distance <= maxDistance) {
      return true;
    }
  }

  return false;
};

export const useNcaaLookup = () => {
  const loading = ref(false);
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

  /**
   * Get all schools for a specific division
   */
  const getSchools = (division: NcaaDivision): SchoolInfo[] => {
    return DIVISION_SCHOOLS[division];
  };

  /**
   * Get the full NCAA database
   */
  const getNcaaDatabase = (): typeof DIVISION_SCHOOLS => {
    return DIVISION_SCHOOLS;
  };

  /**
   * Search for a school across NCAA divisions
   * Returns division and conference if found
   * Uses session cache to avoid duplicate lookups
   * Searches in order: D1 → D2 → D3
   */
  const lookupSchool = async (
    schoolName: string,
  ): Promise<NcaaLookupResult | null> => {
    if (!schoolName || schoolName.trim().length === 0) {
      return null;
    }

    // Check cache first
    const cacheKey = normalizeSchoolName(schoolName);
    if (isCached(cacheKey)) {
      return getCached(cacheKey);
    }

    loading.value = true;

    try {
      // Try each division in order (D1, D2, D3)
      for (const division of ["D1", "D2", "D3"] as NcaaDivision[]) {
        const schools = DIVISION_SCHOOLS[division];

        // Search for matching school in this division
        for (const school of schools) {
          if (schoolNameMatches(schoolName, school.name)) {
            const result: NcaaLookupResult = {
              division,
              conference: school.conference,
            };

            // Cache the result
            setCached(cacheKey, result);
            return result;
          }
        }
      }

      return null;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Backwards-compatible alias for lookupSchool
   * Maintained for compatibility with existing code
   * @deprecated Use lookupSchool() instead
   */
  const lookupDivision = lookupSchool;

  return {
    loading,
    cacheSize,
    lookupSchool,
    lookupDivision, // Backwards compatibility
    getSchools,
    getNcaaDatabase,
    // Cache methods (inlined from useNcaaCache)
    getCached,
    setCached,
    isCached,
    clearCache,
    invalidateEntry,
    getCacheStats,
    preloadCache,
  };
};
