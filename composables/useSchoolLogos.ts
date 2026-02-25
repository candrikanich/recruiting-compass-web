/**
 * useSchoolLogos composable
 * Handles fetching and caching school logos from favicons
 * Provides fallback generic icon when favicon unavailable
 */

import { ref, computed } from "vue";
import { useSupabase } from "./useSupabase";
import { useUserStore } from "~/stores/user";
import type { School } from "~/types/models";
import { createClientLogger } from "~/utils/logger";

const logger = createClientLogger("useSchoolLogos");

interface CachedLogo {
  schoolId: string;
  faviconUrl: string | null;
  fetchedAt: number;
  domain: string;
  fromDatabase: boolean;
}

const logoCache = new Map<string, CachedLogo>();
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
const GENERIC_SCHOOL_ICON = "🏫"; // Fallback emoji

export const useSchoolLogos = () => {
  const supabase = useSupabase();
  const _userStore = useUserStore();
  const fetchingLogos = ref(new Set<string>());
  const logoMap = ref(new Map<string, string | null>());

  /**
   * Get school domain from URL or extract from school data
   */
  const extractDomain = (school: School | string): string => {
    if (typeof school === "string") {
      // Assume it's already a domain
      return school.replace(/^(https?:\/\/)?(www\.)?/, "").replace(/\/$/, "");
    }

    // Try to get domain from school website
    if (school.website) {
      return school.website
        .replace(/^(https?:\/\/)?(www\.)?/, "")
        .replace(/\/$/, "");
    }

    // Fallback: try to construct from school name
    const name = school.name || "";
    const slug = name
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/[^a-z0-9]/g, "");

    return `${slug}.edu`;
  };

  /**
   * Fetch favicon for a school - checks database first, then API
   */
  const fetchSchoolLogo = async (
    school: School,
    options: { forceRefresh?: boolean } = {},
  ): Promise<string | null> => {
    const schoolId = school.id;
    const domain = extractDomain(school);

    // Check in-memory cache first
    const cached = logoCache.get(schoolId);
    if (cached && !options.forceRefresh) {
      const age = Date.now() - cached.fetchedAt;
      if (age < CACHE_TTL) {
        logoMap.value.set(schoolId, cached.faviconUrl);
        return cached.faviconUrl;
      }
    }

    // Check if already fetching
    if (fetchingLogos.value.has(schoolId)) {
      return logoMap.value.get(schoolId) || null;
    }

    fetchingLogos.value.add(schoolId);

    try {
      // 1. Check database first
      if (school.favicon_url && !options.forceRefresh) {
        // Cache from database
        logger.info(
          `[useSchoolLogos] Found favicon_url in database for ${school.name}: ${school.favicon_url}`,
        );
        logoCache.set(schoolId, {
          schoolId,
          faviconUrl: school.favicon_url,
          fetchedAt: Date.now(),
          domain,
          fromDatabase: true,
        });
        logoMap.value.set(schoolId, school.favicon_url);
        return school.favicon_url;
      }

      // 2. Fetch from API if not in database
      logger.info(
        `[useSchoolLogos] Fetching favicon from API for ${school.name} with domain: ${domain}`,
      );
      const response = await $fetch("/api/schools/favicon", {
        query: {
          schoolDomain: domain,
          schoolId,
        },
      });

      const faviconUrl = response.faviconUrl;
      logger.info(`[useSchoolLogos] API returned: ${faviconUrl}`);

      // 3. Save to database for persistence
      if (faviconUrl) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { error: dbError } = (await (supabase.from("schools") as any)
            .update({ favicon_url: faviconUrl })
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .eq("id", schoolId)) as { error?: any };
          if (dbError) {
            logger.warn(
              `Failed to save favicon to database for ${schoolId}:`,
              dbError,
            );
          }
        } catch (dbError) {
          logger.warn(
            `Failed to save favicon to database for ${schoolId}:`,
            dbError,
          );
          // Continue anyway, just log the error
        }
      }

      // 4. Cache the result
      logoCache.set(schoolId, {
        schoolId,
        faviconUrl,
        fetchedAt: Date.now(),
        domain,
        fromDatabase: false,
      });

      // Store in map for reactive access
      logoMap.value.set(schoolId, faviconUrl);

      return faviconUrl;
    } catch (error) {
      logger.warn(`Failed to fetch logo for school ${schoolId}:`, error);
      logoMap.value.set(schoolId, null);
      return null;
    } finally {
      fetchingLogos.value.delete(schoolId);
    }
  };

  /**
   * Fetch logos for multiple schools in parallel
   */
  const fetchMultipleLogos = async (
    schools: School[],
    options: { forceRefresh?: boolean } = {},
  ): Promise<Map<string, string | null>> => {
    // Fetch all logos in parallel (with reasonable concurrency)
    const promises = schools.map((school) =>
      fetchSchoolLogo(school, options).catch(() => null),
    );

    await Promise.allSettled(promises);
    return logoMap.value;
  };

  /**
   * Get logo for a school (from cache or fetch)
   */
  const getSchoolLogo = async (school: School): Promise<string | null> => {
    // Check cache first
    if (logoMap.value.has(school.id)) {
      return logoMap.value.get(school.id) || null;
    }

    // Fetch if not cached
    return fetchSchoolLogo(school);
  };

  /**
   * Get logo synchronously from cache (returns undefined if not cached yet)
   */
  const getSchoolLogoCached = (schoolId: string): string | null | undefined => {
    return logoMap.value.get(schoolId);
  };

  /**
   * Clear cache for a school
   */
  const clearSchoolLogoCache = (schoolId: string) => {
    logoCache.delete(schoolId);
    logoMap.value.delete(schoolId);
  };

  /**
   * Clear all cached logos
   */
  const clearAllLogos = () => {
    logoCache.clear();
    logoMap.value.clear();
  };

  /**
   * Batch fetch logos for schools missing favicons from database
   * Useful for one-time initialization or periodic refresh
   */
  const batchFetchMissingLogos = async (schools: School[]): Promise<number> => {
    const schoolsNeedingLogos = schools.filter((s) => !s.favicon_url);

    if (schoolsNeedingLogos.length === 0) {
      logger.info("All schools already have favicons in database");
      return 0;
    }

    logger.info(`Fetching logos for ${schoolsNeedingLogos.length} schools...`);

    const results = await fetchMultipleLogos(schoolsNeedingLogos);

    // Count how many were successfully fetched
    const successCount = Array.from(results.values()).filter(
      (url) => url !== null,
    ).length;

    logger.info(
      `Successfully fetched ${successCount}/${schoolsNeedingLogos.length} logos`,
    );

    return successCount;
  };

  /**
   * Get display URL or fallback icon
   */
  const getDisplayLogo = (schoolId: string): string => {
    const logoUrl = getSchoolLogoCached(schoolId);
    return logoUrl || GENERIC_SCHOOL_ICON;
  };

  /**
   * Check if logo is loading
   */
  const isLoading = computed(() => fetchingLogos.value.size > 0);

  /**
   * Get number of cached logos
   */
  const cachedCount = computed(() => logoCache.size);

  return {
    // Methods
    fetchSchoolLogo,
    fetchMultipleLogos,
    batchFetchMissingLogos,
    getSchoolLogo,
    getSchoolLogoCached,
    getDisplayLogo,
    clearSchoolLogoCache,
    clearAllLogos,
    extractDomain,

    // State
    logoMap: computed(() => logoMap.value),
    isLoading,
    cachedCount,

    // Constants
    GENERIC_SCHOOL_ICON,
    CACHE_TTL,
  };
};
