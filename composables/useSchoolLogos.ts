/**
 * useSchoolLogos composable
 * Handles fetching and caching school logos from favicons
 * Provides fallback generic icon when favicon unavailable
 *
 * Caching layers:
 * 1. schools.favicon_url in database (permanent, positive results only)
 * 2. localStorage (survives reloads; negative results too, shorter TTL)
 * 3. In-memory module cache (session)
 */

import { ref, computed } from "vue";
import { useSupabase } from "./useSupabase";
import { useAuthFetch } from "./useAuthFetch";
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
const NEGATIVE_CACHE_TTL = 24 * 60 * 60 * 1000; // Retry failed lookups daily
const GENERIC_SCHOOL_ICON = "🏫"; // Fallback emoji
const STORAGE_KEY = "trc-school-logo-cache";
const BATCH_SIZE = 50; // Matches /api/schools/favicons request cap

const isFresh = (entry: CachedLogo): boolean => {
  const ttl = entry.faviconUrl ? CACHE_TTL : NEGATIVE_CACHE_TTL;
  return Date.now() - entry.fetchedAt < ttl;
};

let storageLoaded = false;

const loadPersistedCache = () => {
  if (storageLoaded || typeof window === "undefined") return;
  storageLoaded = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const entries = JSON.parse(raw) as Record<string, CachedLogo>;
    for (const [schoolId, entry] of Object.entries(entries)) {
      if (isFresh(entry)) logoCache.set(schoolId, entry);
    }
  } catch {
    // Corrupted cache — drop it and refetch lazily
    window.localStorage.removeItem(STORAGE_KEY);
  }
};

const persistCache = () => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(Object.fromEntries(logoCache)),
    );
  } catch {
    // Quota exceeded / private mode — in-memory cache still works
  }
};

export const useSchoolLogos = () => {
  const supabase = useSupabase();
  const _userStore = useUserStore();
  const fetchingLogos = ref(new Set<string>());
  const logoMap = ref(new Map<string, string | null>());

  loadPersistedCache();

  /**
   * Get school domain from URL or extract from school data.
   * Returns null when the school has no website — fabricating a domain from
   * the name guarantees dead external lookups on every page load.
   */
  const extractDomain = (school: School | string): string | null => {
    if (typeof school === "string") {
      // Assume it's already a domain
      return school.replace(/^(https?:\/\/)?(www\.)?/, "").replace(/\/$/, "");
    }

    if (school.website) {
      return school.website
        .replace(/^(https?:\/\/)?(www\.)?/, "")
        .replace(/\/$/, "");
    }

    return null;
  };

  const setCache = (
    schoolId: string,
    faviconUrl: string | null,
    domain: string,
    fromDatabase: boolean,
  ) => {
    logoCache.set(schoolId, {
      schoolId,
      faviconUrl,
      fetchedAt: Date.now(),
      domain,
      fromDatabase,
    });
    logoMap.value.set(schoolId, faviconUrl);
    persistCache();
  };

  /**
   * Persist a found favicon to the database so future sessions skip the API
   */
  const persistFaviconToDb = async (schoolId: string, faviconUrl: string) => {
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
    if (cached && !options.forceRefresh && isFresh(cached)) {
      logoMap.value.set(schoolId, cached.faviconUrl);
      return cached.faviconUrl;
    }

    // Check if already fetching
    if (fetchingLogos.value.has(schoolId)) {
      return logoMap.value.get(schoolId) || null;
    }

    fetchingLogos.value.add(schoolId);

    try {
      // 1. Check database first
      if (school.favicon_url && !options.forceRefresh) {
        setCache(schoolId, school.favicon_url, domain ?? "", true);
        return school.favicon_url;
      }

      // 2. No website — nothing to look up, cache the miss
      if (!domain) {
        setCache(schoolId, null, "", false);
        return null;
      }

      // 3. Fetch from API
      logger.debug(
        `[useSchoolLogos] Fetching favicon from API for ${school.name} with domain: ${domain}`,
      );
      const { $fetchAuth } = useAuthFetch();
      const response = await $fetchAuth<{ faviconUrl: string | null }>(
        "/api/schools/favicon",
        {
          query: {
            schoolDomain: domain,
            schoolId,
          },
        },
      );

      const faviconUrl = response.faviconUrl;

      // 4. Save to database for persistence
      if (faviconUrl) {
        await persistFaviconToDb(schoolId, faviconUrl);
      }

      // 5. Cache the result (negatives too, so misses don't refetch each load)
      setCache(schoolId, faviconUrl, domain, false);

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
   * Fetch logos for multiple schools via one batched API call
   */
  const fetchMultipleLogos = async (
    schools: School[],
    options: { forceRefresh?: boolean } = {},
  ): Promise<Map<string, string | null>> => {
    const toFetch: { school: School; domain: string }[] = [];

    for (const school of schools) {
      if (fetchingLogos.value.has(school.id)) continue;

      const cached = logoCache.get(school.id);
      if (cached && !options.forceRefresh && isFresh(cached)) {
        logoMap.value.set(school.id, cached.faviconUrl);
        continue;
      }

      if (school.favicon_url && !options.forceRefresh) {
        setCache(school.id, school.favicon_url, extractDomain(school) ?? "", true);
        continue;
      }

      const domain = extractDomain(school);
      if (!domain) {
        setCache(school.id, null, "", false);
        continue;
      }

      toFetch.push({ school, domain });
    }

    if (toFetch.length === 0) return logoMap.value;

    logger.info(
      `[useSchoolLogos] Batch fetching favicons for ${toFetch.length} schools`,
    );

    toFetch.forEach(({ school }) => fetchingLogos.value.add(school.id));

    try {
      const { $fetchAuth } = useAuthFetch();

      for (let i = 0; i < toFetch.length; i += BATCH_SIZE) {
        const chunk = toFetch.slice(i, i + BATCH_SIZE);
        const response = await $fetchAuth<{
          faviconUrls: Record<string, string | null>;
        }>("/api/schools/favicons", {
          method: "POST",
          body: {
            schools: chunk.map(({ school, domain }) => ({
              schoolId: school.id,
              schoolDomain: domain,
            })),
          },
        });

        for (const { school, domain } of chunk) {
          const faviconUrl = response.faviconUrls[school.id] ?? null;
          setCache(school.id, faviconUrl, domain, false);
          if (faviconUrl) {
            await persistFaviconToDb(school.id, faviconUrl);
          }
        }
      }
    } catch (error) {
      logger.warn("[useSchoolLogos] Batch favicon fetch failed:", error);
      toFetch.forEach(({ school }) => logoMap.value.set(school.id, null));
    } finally {
      toFetch.forEach(({ school }) => fetchingLogos.value.delete(school.id));
    }

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
    persistCache();
  };

  /**
   * Clear all cached logos
   */
  const clearAllLogos = () => {
    logoCache.clear();
    logoMap.value.clear();
    persistCache();
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
