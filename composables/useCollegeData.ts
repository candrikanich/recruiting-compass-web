import { ref } from "vue";
import { createClientLogger } from "~/utils/logger";
import type { CollegeScorecardResponse } from "~/types/api";
import { collegeScorecardResponseSchema } from "~/utils/validation/schemas";
import { sanitizeUrl } from "~/utils/validation/sanitize";

export interface CollegeDataResult {
  id: string;
  name: string;
  website: string | null;
  address: string | null; // City, State
  city: string | null;
  state: string | null;
  studentSize: number | null;
  carnegieSize: string | null; // Size category (e.g., "Small", "Medium", "Large")
  enrollmentAll: number | null; // Alternative enrollment field
  admissionRate: number | null;
  studentFacultyRatio: number | null;
  tuitionInState: number | null;
  tuitionOutOfState: number | null;
  latitude: number | null;
  longitude: number | null;
}

/**
 * Session-based cache for College Scorecard lookups (inlined from useCollegeScorecardCache)
 */
let scoreboardCache: Map<string, CollegeDataResult> | null = null;

const logger = createClientLogger("useCollegeData");

export const useCollegeData = () => {
  const data = ref<CollegeDataResult | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const cacheSize = ref(0);

  const config = useRuntimeConfig();
  const apiKey = config.public.collegeScorecardApiKey as string;

  /**
   * Initialize cache if not already done
   */
  const initializeCache = () => {
    if (!scoreboardCache) {
      scoreboardCache = new Map();
    }
  };

  /**
   * Get cached result for a normalized school name
   */
  const getCached = (normalizedName: string): CollegeDataResult | null => {
    initializeCache();
    return scoreboardCache!.get(normalizedName) || null;
  };

  /**
   * Store result in cache
   */
  const setCached = (
    normalizedName: string,
    result: CollegeDataResult,
  ): void => {
    initializeCache();
    scoreboardCache!.set(normalizedName, result);
    cacheSize.value = scoreboardCache!.size;
  };

  /**
   * Check if result is cached
   */
  const isCached = (normalizedName: string): boolean => {
    initializeCache();
    return scoreboardCache!.has(normalizedName);
  };

  /**
   * Clear all cache entries
   */
  const clearCache = (): void => {
    if (scoreboardCache) {
      scoreboardCache.clear();
      cacheSize.value = 0;
    }
  };

  /**
   * Invalidate cache entry for a specific school
   */
  const invalidateEntry = (normalizedName: string): void => {
    if (scoreboardCache?.has(normalizedName)) {
      scoreboardCache.delete(normalizedName);
      cacheSize.value = scoreboardCache.size;
    }
  };

  /**
   * Get current cache statistics
   */
  const getCacheStats = () => {
    initializeCache();
    return {
      size: scoreboardCache!.size,
      entries: Array.from(scoreboardCache!.keys()),
    };
  };

  /**
   * Preload cache with multiple entries
   */
  const preloadCache = (entries: Array<[string, CollegeDataResult]>): void => {
    initializeCache();
    for (const [key, value] of entries) {
      scoreboardCache!.set(key, value);
    }
    cacheSize.value = scoreboardCache!.size;
  };

  /**
   * Format website URL to include protocol and sanitize
   */
  const formatWebsite = (url: string | null | undefined): string | null => {
    if (!url) return null;
    let formatted = url;
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      formatted = `http://${url}`;
    }
    // Sanitize URL to prevent javascript: and other dangerous protocols
    const sanitized = sanitizeUrl(formatted);
    return sanitized || null;
  };

  /**
   * Validate numeric field is a valid number (not NaN or Infinity)
   */
  const isValidNumber = (value: unknown): boolean => {
    if (value === null || value === undefined) return false;
    const num = Number(value);
    return !isNaN(num) && isFinite(num);
  };

  /**
   * Transform College Scorecard API response to our format with validation
   */
  const transformData = (
    school: Record<string, unknown>,
  ): CollegeDataResult => {
    const city = String(school["school.city"] || "");
    const state = String(school["school.state"] || "");
    const address = [city, state].filter(Boolean).join(", ") || null;

    // Type-safe conversion functions for school record fields
    const getStringField = (value: unknown): string =>
      typeof value === "string" ? value : "";

    const getNumberField = (value: unknown): number | null =>
      isValidNumber(value) ? (value as number) : null;

    const getStringOrNull = (value: unknown): string | null =>
      typeof value === "string" ? value : null;

    return {
      id: String(school.id),
      name: getStringField(school["school.name"]),
      website: formatWebsite(getStringOrNull(school["school.school_url"])),
      address,
      city: city || null,
      state: state || null,
      studentSize: getNumberField(school["latest.student.size"]),
      carnegieSize: null, // Not available in standard API
      enrollmentAll: null, // Not available in standard API
      admissionRate: getNumberField(
        school["latest.admissions.admission_rate.overall"],
      ),
      studentFacultyRatio: null, // Not available in standard API
      tuitionInState: getNumberField(school["latest.cost.tuition.in_state"]),
      tuitionOutOfState: getNumberField(
        school["latest.cost.tuition.out_of_state"],
      ),
      latitude: getNumberField(school["location.lat"]),
      longitude: getNumberField(school["location.lon"]),
    };
  };

  /**
   * Fetch school data by name from College Scorecard API
   */
  const fetchByName = async (
    schoolName: string,
  ): Promise<CollegeDataResult | null> => {
    if (!schoolName || schoolName.length < 3) {
      error.value = "School name must be at least 3 characters";
      return null;
    }

    if (!apiKey) {
      error.value = "College Scorecard API not configured";
      return null;
    }

    // Check cache first
    const normalizedName = schoolName.toLowerCase().trim();
    if (isCached(normalizedName)) {
      const cached = getCached(normalizedName);
      data.value = cached;
      return cached;
    }

    loading.value = true;
    error.value = null;
    data.value = null;

    try {
      const params = new URLSearchParams({
        api_key: apiKey,
        "school.name": schoolName,
        fields:
          "id,school.name,school.city,school.state,school.school_url,location.lat,location.lon,latest.admissions.admission_rate.overall,latest.student.size,latest.cost.tuition.in_state,latest.cost.tuition.out_of_state",
        per_page: "1",
      });

      const url = `https://api.data.gov/ed/collegescorecard/v1/schools?${params.toString()}`;
      const response = await fetch(url);

      if (!response.ok) {
        if (response.status === 401) {
          error.value = "College Scorecard API key is invalid";
        } else if (response.status === 429) {
          error.value = "Too many requests to College Scorecard API";
        } else {
          error.value = "Unable to fetch college data";
        }
        return null;
      }

      const apiData = (await response.json()) as CollegeScorecardResponse;

      // Validate API response structure
      try {
        await collegeScorecardResponseSchema.parseAsync(apiData);
      } catch (validationError) {
        error.value = "Invalid response from College Scorecard API";
        logger.error("API response validation failed:", validationError);
        return null;
      }

      if (!apiData.results || apiData.results.length === 0) {
        error.value = "School not found in College Scorecard database";
        return null;
      }

      const result = transformData(
        apiData.results[0] as unknown as Record<string, unknown>,
      );
      data.value = result;
      // Cache the result
      setCached(normalizedName, result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      error.value = `Failed to fetch college data: ${errorMessage}`;
      return null;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Fetch school data by College Scorecard ID
   */
  const fetchById = async (
    scoreId: string,
  ): Promise<CollegeDataResult | null> => {
    if (!scoreId) {
      error.value = "School ID is required";
      return null;
    }

    if (!apiKey) {
      error.value = "College Scorecard API not configured";
      return null;
    }

    // Check cache first using ID as key
    const cacheKey = `id:${scoreId}`;
    if (isCached(cacheKey)) {
      const cached = getCached(cacheKey);
      data.value = cached;
      return cached;
    }

    loading.value = true;
    error.value = null;
    data.value = null;

    try {
      const params = new URLSearchParams({
        api_key: apiKey,
        id: scoreId,
        fields:
          "id,school.name,school.city,school.state,school.school_url,location.lat,location.lon,latest.admissions.admission_rate.overall,latest.student.size,latest.cost.tuition.in_state,latest.cost.tuition.out_of_state",
      });

      const url = `https://api.data.gov/ed/collegescorecard/v1/schools?${params.toString()}`;
      const response = await fetch(url);

      if (!response.ok) {
        error.value = "Unable to fetch college data";
        return null;
      }

      const apiData = (await response.json()) as CollegeScorecardResponse;

      // Validate API response structure
      try {
        await collegeScorecardResponseSchema.parseAsync(apiData);
      } catch (validationError) {
        error.value = "Invalid response from College Scorecard API";
        logger.error("API response validation failed:", validationError);
        return null;
      }

      if (!apiData.results || apiData.results.length === 0) {
        error.value = "School not found";
        return null;
      }

      const result = transformData(
        apiData.results[0] as unknown as Record<string, unknown>,
      );
      data.value = result;
      // Cache the result
      setCached(cacheKey, result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      error.value = `Failed to fetch college data: ${errorMessage}`;
      return null;
    } finally {
      loading.value = false;
    }
  };

  return {
    data,
    loading,
    error,
    cacheSize,
    fetchByName,
    fetchById,
    // Cache methods (inlined from useCollegeScorecardCache)
    getCached,
    setCached,
    isCached,
    clearCache,
    invalidateEntry,
    getCacheStats,
    preloadCache,
  };
};
