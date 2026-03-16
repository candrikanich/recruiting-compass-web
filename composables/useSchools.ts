import { computed, inject, watch } from "vue";
import { useUserStore } from "~/stores/user";
import { useSchoolStore } from "~/stores/schools";
import { useActiveFamily } from "./useActiveFamily";
import { useFamilyContext } from "./useFamilyContext";
import type { School } from "~/types/models";
import { schoolSchema } from "~/utils/validation/schemas";
import { createClientLogger } from "~/utils/logger";
import { useAuthFetch } from "~/composables/useAuthFetch";

const logger = createClientLogger("useSchools");

/**
 * useSchools composable
 * Manages college/university program data and recruiting status
 *
 * FAMILY-BASED ACCESS CONTROL (v2.0):
 * - Schools are owned by family units, not individual users
 * - Students see their own schools (their family)
 * - Parents see all schools in accessible families
 * - Queries filter by family_unit_id instead of user_id
 * - Student-created schools are scoped to their family
 *
 * School status levels:
 * - researching: Initial exploration phase
 * - contacted: First contact made with coaches
 * - interested: School expressed interest
 * - offer_received: Scholarship offer received
 * - declined: Offer declined or program not pursuing
 * - committed: Committed to attend
 *
 * Features:
 * - Track school details (location, conference, division)
 * - Manage player pros/cons and notes
 * - Sort by user-defined ranking
 * - Link to multiple coaches per school
 * - Store social media handles for monitoring
 * - Academic and athletic requirements tracking
 */
export const useSchools = () => {
  const userStore = useUserStore();
  const schoolStore = useSchoolStore();
  const { $fetchAuth } = useAuthFetch();
  const injectedFamily =
    inject<ReturnType<typeof useActiveFamily>>("activeFamily");

  if (!injectedFamily) {
    logger.warn(
      "[useSchools] activeFamily injection failed, using singleton fallback. " +
        "This may cause data sync issues when parent switches athletes.",
    );
  }

  const activeFamily = injectedFamily ?? useFamilyContext();

  const schools = computed(() => schoolStore.schools);
  const loading = computed(() => schoolStore.loading);
  const error = computed(() => schoolStore.error);
  const favoriteSchools = computed(() => schoolStore.favoriteSchools);

  // Auto-invalidate cache when parent switches athlete
  watch(
    () => activeFamily.activeAthleteId?.value,
    async (newId, oldId) => {
      if (newId && newId !== oldId) {
        schoolStore.$patch({ schools: [], isFetched: false });
        await fetchSchools();
      }
    },
  );

  // Fetch when family context first becomes available (covers the race where
  // activeAthleteId was already set but activeFamilyId wasn't ready yet)
  watch(
    () => activeFamily.activeFamilyId?.value,
    async (newId, oldId) => {
      if (newId && !oldId) {
        await fetchSchools();
      }
    },
  );

  const fetchSchools = async (): Promise<void> => {
    logger.debug("[useSchools] fetchSchools called");
    logger.debug(`[useSchools] User: ${userStore.user?.id || "null"}`);
    logger.debug(
      `[useSchools] Active Family ID: ${activeFamily.activeFamilyId?.value || "null"}`,
    );

    if (!userStore.user) {
      logger.debug("[useSchools] No user, skipping fetch");
      return;
    }

    if (!activeFamily.activeFamilyId?.value) {
      logger.debug("[useSchools] No family context, skipping fetch");
      return;
    }

    logger.debug(
      `[useSchools] Fetching for family: ${activeFamily.activeFamilyId.value}`,
    );

    await schoolStore.fetchSchools(activeFamily.activeFamilyId.value);
  };

  const getSchool = async (id: string): Promise<School | null> => {
    return schoolStore.getSchool(id, activeFamily.activeFamilyId.value ?? "");
  };

  const createSchool = async (
    schoolData: Omit<School, "id" | "createdAt" | "updatedAt">,
  ) => {
    if (!userStore.user) {
      throw new Error("User not authenticated");
    }
    if (!activeFamily.activeFamilyId.value) {
      throw new Error("Family context not loaded");
    }

    const dataOwnerUserId = activeFamily.getDataOwnerUserId();
    if (!dataOwnerUserId) {
      throw new Error("Athlete context not set");
    }

    // Validate school data with Zod schema (composable responsibility)
    await schoolSchema.parseAsync(schoolData);

    const result = await schoolStore.createSchool(
      schoolData as Omit<School, "id" | "created_at" | "updated_at">,
    );

    const { $posthog } = useNuxtApp();
    $posthog?.capture("school_added", { division: schoolData.division ?? null });

    // Fetch logo asynchronously (don't block school creation)
    try {
      const { useSchoolLogos } = await import("./useSchoolLogos");
      const { fetchSchoolLogo } = useSchoolLogos();
      fetchSchoolLogo(result).catch((err) => {
        logger.warn("Failed to fetch logo for new school:", err);
      });
    } catch (logoError) {
      logger.warn("Failed to initialize logo fetching:", logoError);
    }

    return result;
  };

  const updateSchool = async (id: string, updates: Partial<School>) => {
    return schoolStore.updateSchool(id, updates, activeFamily.activeFamilyId.value ?? "");
  };

  const deleteSchool = async (id: string) => {
    try {
      return await schoolStore.deleteSchool(id, activeFamily.activeFamilyId.value ?? "");
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : (err as { message?: string })?.message ?? "Failed to delete school";
      // Rewrite FK constraint errors to a user-friendly message
      if (
        message.includes("violates foreign key constraint") ||
        message.includes("still referenced")
      ) {
        const betterMessage =
          "Cannot delete this school because it has associated coaches, documents, or interactions. Please remove these first.";
        // Update store error so callers reading error.value see the friendly message
        schoolStore.$patch({ error: betterMessage });
        throw new Error(betterMessage);
      }
      throw err;
    }
  };

  const toggleFavorite = async (id: string, currentFavorite: boolean) => {
    return schoolStore.toggleFavorite(id, currentFavorite, activeFamily.activeFamilyId.value ?? "");
  };

  const updateRanking = async (schools_: School[]) => {
    if (!userStore.user) throw new Error("User not authenticated");
    return schoolStore.updateRanking(schools_);
  };

  /**
   * Extract domain from URL (helper for duplicate detection)
   */
  const extractDomain = (url: string | null | undefined): string | null => {
    if (!url) return null;
    try {
      const domain = new URL(url).hostname.replace(/^www\./, "");
      return domain;
    } catch {
      return null;
    }
  };

  /**
   * Check if a school name matches an existing school (case-insensitive)
   */
  const isNameDuplicate = (newName: string | undefined): School | null => {
    if (!newName) return null;
    const normalized = newName.trim().toLowerCase();
    return (
      schools.value.find((s) => s.name.toLowerCase() === normalized) || null
    );
  };

  /**
   * Check if NCAA ID matches an existing school
   */
  const isNCAAAIDuplicate = (
    ncaaId: string | null | undefined,
  ): School | null => {
    if (!ncaaId) return null;
    const normalizedId = ncaaId.trim().toLowerCase();
    return (
      schools.value.find((s) => {
        if (!s.ncaa_id) return false;
        return s.ncaa_id.toLowerCase() === normalizedId;
      }) || null
    );
  };

  /**
   * Check if website domain matches an existing school
   */
  const isDomainDuplicate = (
    website: string | null | undefined,
  ): School | null => {
    if (!website) return null;
    const newDomain = extractDomain(website);
    if (!newDomain) return null;

    return (
      schools.value.find((s) => {
        const existingDomain = extractDomain(s.website);
        return existingDomain && existingDomain === newDomain;
      }) || null
    );
  };

  /**
   * Find duplicate school by any matching criteria
   * Returns the first match found (name > domain > NCAA ID)
   */
  const findDuplicate = (
    schoolData: Partial<School> | Record<string, string | null | undefined>,
  ): {
    duplicate: School | null;
    matchType: "name" | "domain" | "ncaa_id" | null;
  } => {
    const nameDuplicate = isNameDuplicate(
      schoolData.name === null ? undefined : schoolData.name,
    );
    if (nameDuplicate) {
      return { duplicate: nameDuplicate, matchType: "name" };
    }

    const domainDuplicate = isDomainDuplicate(schoolData.website);
    if (domainDuplicate) {
      return { duplicate: domainDuplicate, matchType: "domain" };
    }

    const ncaaIdDuplicate = isNCAAAIDuplicate(schoolData.ncaa_id);
    if (ncaaIdDuplicate) {
      return { duplicate: ncaaIdDuplicate, matchType: "ncaa_id" };
    }

    return { duplicate: null, matchType: null };
  };

  /**
   * Check if school data would create a duplicate
   */
  const hasDuplicate = computed(() => (schoolData: Partial<School>) => {
    return findDuplicate(schoolData).duplicate !== null;
  });

  /**
   * Smart delete: tries simple delete first, falls back to cascade-delete
   * if there are related records blocking deletion
   */
  const smartDelete = async (id: string): Promise<{ cascadeUsed: boolean }> => {
    try {
      await deleteSchool(id);
      return { cascadeUsed: false };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete school";

      if (
        message.includes("Cannot delete this school") ||
        message.includes("violates foreign key constraint") ||
        message.includes("still referenced")
      ) {
        const response = await $fetchAuth<Record<string, unknown>>(
          `/api/schools/${id}/cascade-delete`,
          { method: "POST", body: { confirmDelete: true } },
        );

        if (response.success) {
          schoolStore.$patch({
            schools: schoolStore.schools.filter((s) => s.id !== id),
          });
          return { cascadeUsed: true };
        }
        throw new Error(
          (response.message as string | undefined) || "Cascade delete failed",
        );
      }

      throw err;
    }
  };

  return {
    schools,
    favoriteSchools,
    loading,
    error,
    fetchSchools,
    getSchool,
    createSchool,
    updateSchool,
    deleteSchool,
    smartDelete,
    toggleFavorite,
    updateRanking,
    findDuplicate,
    hasDuplicate,
    isNameDuplicate,
    isDomainDuplicate,
    isNCAAAIDuplicate,
  };
};
