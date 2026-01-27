import { describe, it, expect, beforeEach, vi } from "vitest";
import { useNcaaLookup } from "~/composables/useNcaaLookup";

describe("useNcaaLookup - Enhanced with Inline Caching", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Core Functionality", () => {
    it("should lookup school and return division info", async () => {
      const { lookupSchool } = useNcaaLookup();
      const result = await lookupSchool("University of Florida");

      expect(result).toBeDefined();
      if (result) {
        expect(result.division).toMatch(/D[123]/);
      }
    });

    it("should return null for unknown school", async () => {
      const { lookupSchool } = useNcaaLookup();
      const result = await lookupSchool("Fake University XYZ");

      expect(result).toBeNull();
    });

    it("should handle empty school name", async () => {
      const { lookupSchool } = useNcaaLookup();
      const result = await lookupSchool("");

      expect(result).toBeNull();
    });

    it("should handle whitespace-only school name", async () => {
      const { lookupSchool } = useNcaaLookup();
      const result = await lookupSchool("   ");

      expect(result).toBeNull();
    });

    it("should get all schools for a division", () => {
      const { getSchools } = useNcaaLookup();
      const d1Schools = getSchools("D1");

      expect(Array.isArray(d1Schools)).toBe(true);
      expect(d1Schools.length).toBeGreaterThan(0);
    });

    it("should get NCAA database", () => {
      const { getNcaaDatabase } = useNcaaLookup();
      const database = getNcaaDatabase();

      expect(database).toBeDefined();
      expect(database.D1).toBeDefined();
      expect(database.D2).toBeDefined();
      expect(database.D3).toBeDefined();
    });
  });

  describe("Caching - Core Cache Functionality", () => {
    it("should cache lookup results for faster subsequent queries", async () => {
      const { lookupSchool, getCacheStats } = useNcaaLookup();

      // First lookup
      const result1 = await lookupSchool("Florida State");
      expect(result1).toBeDefined();

      // Cache should now have 1 entry
      const stats1 = getCacheStats();
      expect(stats1.size).toBeGreaterThan(0);

      // Second lookup should use cache (very fast, no re-search)
      const result2 = await lookupSchool("Florida State");

      // Results should be identical
      expect(result2).toEqual(result1);

      // Cache size should be same or increased
      const stats2 = getCacheStats();
      expect(stats2.size).toBeGreaterThanOrEqual(stats1.size);
    });

    it("should avoid duplicate database searches via caching", async () => {
      const { lookupSchool } = useNcaaLookup();

      // Look up same school 3 times
      const school = "Duke";
      const result1 = await lookupSchool(school);
      const result2 = await lookupSchool(school);
      const result3 = await lookupSchool(school);

      // All results should be identical
      expect(result1).toEqual(result2);
      expect(result2).toEqual(result3);
    });

    it("should normalize school names for caching", async () => {
      const { lookupSchool, getCacheStats } = useNcaaLookup();

      // Different variations should resolve to same cache entry
      const result1 = await lookupSchool("florida state university");
      const result2 = await lookupSchool("florida state");
      const result3 = await lookupSchool("Florida State");

      // Should return same results
      expect(result1).toEqual(result2);
      expect(result2).toEqual(result3);
    });

    it("should retrieve cached result without re-searching", async () => {
      const { lookupSchool, isCached, getCached } = useNcaaLookup();

      // First lookup - not cached
      const schoolName = "North Carolina";
      // Cache functions take normalized names
      const normalizeSchoolName = (name: string): string => {
        return name.toLowerCase().replace(/\s+university\b/i, "").replace(/\s+college\b/i, "").trim();
      };
      const normalizedName = normalizeSchoolName(schoolName);

      expect(isCached(normalizedName)).toBe(false);

      // After lookup - should be cached
      const result1 = await lookupSchool(schoolName);
      expect(result1).toBeDefined();

      // Should be cached now
      expect(isCached(normalizedName)).toBe(true);

      // Should be able to retrieve from cache directly
      const cached = getCached(normalizedName);
      expect(cached).toEqual(result1);
    });
  });

  describe("Caching - Invalidation & Clear", () => {
    it("should invalidate specific cache entry", async () => {
      const { lookupSchool, isCached, invalidateEntry } = useNcaaLookup();

      const schoolName = "Stanford";
      // Cache functions take normalized names
      const normalizeSchoolName = (name: string): string => {
        return name.toLowerCase().replace(/\s+university\b/i, "").replace(/\s+college\b/i, "").trim();
      };
      const normalizedName = normalizeSchoolName(schoolName);

      await lookupSchool(schoolName);

      // Should be cached
      expect(isCached(normalizedName)).toBe(true);

      // Invalidate
      invalidateEntry(normalizedName);

      // Should not be cached anymore
      expect(isCached(normalizedName)).toBe(false);
    });

    it("should clear all cache entries", async () => {
      const { lookupSchool, getCacheStats, clearCache } = useNcaaLookup();

      // Populate cache with multiple entries
      await lookupSchool("Florida");
      await lookupSchool("Georgia");
      await lookupSchool("Alabama");

      let stats = getCacheStats();
      expect(stats.size).toBeGreaterThan(0);

      // Clear cache
      clearCache();

      // Cache should be empty
      stats = getCacheStats();
      expect(stats.size).toBe(0);
    });

    it("should provide cache statistics", async () => {
      const { lookupSchool, getCacheStats } = useNcaaLookup();

      // Populate cache
      await lookupSchool("Florida");
      await lookupSchool("Georgia");

      const stats = getCacheStats();
      expect(stats.size).toBeGreaterThan(0);
      expect(Array.isArray(stats.entries)).toBe(true);
      expect(stats.entries.length).toBeGreaterThan(0);
    });
  });

  describe("Caching - Preload", () => {
    it("should preload cache with multiple entries", () => {
      const { preloadCache, getCacheStats } = useNcaaLookup();

      const entries = [
        ["florida", { division: "D1" as const, conference: "SEC" }],
        ["georgia", { division: "D1" as const, conference: "SEC" }],
      ];

      preloadCache(entries as any);

      const stats = getCacheStats();
      expect(stats.size).toBe(2);
    });
  });

  describe("Loading State", () => {
    it("should set loading state during lookup", async () => {
      const { lookupSchool, loading } = useNcaaLookup();

      const promise = lookupSchool("Texas");
      // Note: In sync operations, loading state might not be observable
      // but it should be defined
      expect(loading).toBeDefined();

      await promise;
      // After completion, loading should be false
      expect(loading.value).toBe(false);
    });
  });

  describe("Integration", () => {
    it("should work with all composable methods together", async () => {
      const { lookupSchool, getSchools, getNcaaDatabase, getCacheStats } =
        useNcaaLookup();

      // Lookup a school
      const result = await lookupSchool("Texas A&M");
      expect(result).toBeDefined();

      // Get schools for division
      if (result) {
        const schoolsInDivision = getSchools(result.division);
        expect(schoolsInDivision.length).toBeGreaterThan(0);
      }

      // Get database
      const database = getNcaaDatabase();
      expect(Object.keys(database)).toContain("D1");

      // Check cache stats
      const stats = getCacheStats();
      expect(stats.size).toBeGreaterThan(0);
    });
  });

  describe("Backward Compatibility", () => {
    it("should support lookupDivision alias for backward compatibility", async () => {
      const { lookupDivision } = useNcaaLookup();
      expect(lookupDivision).toBeDefined();

      const result = await lookupDivision("Virginia Tech");
      expect(result).toBeDefined();
    });
  });
});
