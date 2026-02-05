import { ref, computed, shallowRef, inject } from "vue";
import { useSupabase } from "./useSupabase";
import { useUserStore } from "~/stores/user";
import { useActiveFamily } from "./useActiveFamily";
import { useFamilyContext } from "./useFamilyContext";
import type { School } from "~/types/models";
import { schoolSchema } from "~/utils/validation/schemas";
import { sanitizeHtml } from "~/utils/validation/sanitize";

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
  return useSchoolsInternal();
};

const useSchoolsInternal = (): {
  schools: ComputedRef<School[]>;
  favoriteSchools: ComputedRef<School[]>;
  loading: ComputedRef<boolean>;
  error: ComputedRef<string | null>;
  fetchSchools: () => Promise<void>;
  getSchool: (id: string) => Promise<School | null>;
  createSchool: (
    schoolData: Omit<School, "id" | "createdAt" | "updatedAt">,
  ) => Promise<School>;
  updateSchool: (id: string, updates: Partial<School>) => Promise<School>;
  deleteSchool: (id: string) => Promise<void>;
  toggleFavorite: (id: string, isFavorite: boolean) => Promise<School>;
  updateRanking: (schools_: School[]) => Promise<void>;
  updateStatus: (
    schoolId: string,
    newStatus: School["status"],
    notes?: string,
  ) => Promise<School>;
  findDuplicate: (
    schoolData: Partial<School> | Record<string, string | null | undefined>,
  ) => {
    duplicate: School | null;
    matchType: "name" | "domain" | "ncaa_id" | null;
  };
  hasDuplicate: ComputedRef<(schoolData: Partial<School>) => boolean>;
  isNameDuplicate: (newName: string | undefined) => School | null;
  isDomainDuplicate: (website: string | null | undefined) => School | null;
  isNCAAAIDuplicate: (ncaaId: string | null | undefined) => School | null;
} => {
  const supabase = useSupabase();
  const userStore = useUserStore();
  // Try to get the provided family context (from page), fall back to singleton
  const injectedFamily =
    inject<ReturnType<typeof useActiveFamily>>("activeFamily");
  const activeFamily = injectedFamily || useFamilyContext();

  if (!injectedFamily) {
    console.warn(
      "[useSchools] activeFamily injection failed, using singleton fallback. " +
        "This may cause data sync issues when parent switches athletes.",
    );
  }

  const schools = shallowRef<School[]>([]);
  const loadingRef = ref(false);
  const errorRef = ref<string | null>(null);

  const loading = computed(() => loadingRef.value);
  const error = computed(() => errorRef.value);

  const favoriteSchools = computed(() =>
    schools.value.filter((s) => s.is_favorite),
  );

  const fetchSchools = async () => {
    console.debug("[useSchools] fetchSchools called");
    console.debug(`[useSchools] User: ${userStore.user?.id || "null"}`);
    console.debug(
      `[useSchools] Active Family ID: ${activeFamily.activeFamilyId?.value || "null"}`,
    );

    // Ensure we have both user and family context
    if (!userStore.user) {
      console.debug("[useSchools] No user, skipping fetch");
      return;
    }

    if (!activeFamily.activeFamilyId?.value) {
      console.debug("[useSchools] No family context, skipping fetch");
      return;
    }

    console.debug(
      `[useSchools] Fetching for family: ${activeFamily.activeFamilyId.value}`,
    );
    loadingRef.value = true;
    errorRef.value = null;

    try {
      const schoolsResponse = await supabase
        .from("schools")
        .select("*")
        .eq("family_unit_id", activeFamily.activeFamilyId.value)
        .order("ranking", { ascending: true, nullsFirst: false });

      const { data, error: fetchError } = schoolsResponse as {
        data: School[];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        error: any;
      };

      if (fetchError) throw fetchError;

      // Deduplicate by ID (keep first occurrence)
      const seen = new Set<string>();
      const deduplicated = (data || []).filter((school) => {
        if (seen.has(school.id)) {
          console.warn(
            `[useSchools] Duplicate school detected: ${school.name} (ID: ${school.id})`,
          );
          return false;
        }
        seen.add(school.id);
        return true;
      });

      schools.value = deduplicated;
      console.debug(`[useSchools] Loaded ${schools.value.length} schools`);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch schools";
      errorRef.value = message;
      console.error("[useSchools] Error:", message);
    } finally {
      loadingRef.value = false;
    }
  };

  const getSchool = async (id: string): Promise<School | null> => {
    if (!userStore.user || !activeFamily.activeFamilyId.value) return null;

    loadingRef.value = true;
    errorRef.value = null;

    try {
      const schoolResponse = await supabase
        .from("schools")
        .select("*")
        .eq("id", id)
        .eq("family_unit_id", activeFamily.activeFamilyId.value)
        .single();

      const { data, error: fetchError } = schoolResponse as {
        data: School;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        error: any;
      };

      if (fetchError) throw fetchError;
      return data;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch school";
      errorRef.value = message;
      return null;
    } finally {
      loadingRef.value = false;
    }
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

    loadingRef.value = true;
    errorRef.value = null;

    try {
      // Validate school data with Zod schema
      const validated = await schoolSchema.parseAsync(schoolData);

      // Sanitize text fields to prevent XSS
      if (validated.notes) {
        validated.notes = sanitizeHtml(validated.notes);
      }
      if (validated.pros && Array.isArray(validated.pros)) {
        validated.pros = validated.pros.map((p: string | undefined) =>
          p ? sanitizeHtml(p) : p,
        );
      }
      if (validated.cons && Array.isArray(validated.cons)) {
        validated.cons = validated.cons.map((c: string | undefined) =>
          c ? sanitizeHtml(c) : c,
        );
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const insertResponse = await (supabase.from("schools") as any)
        .insert([
          {
            ...validated,
            user_id: dataOwnerUserId,
            family_unit_id: activeFamily.activeFamilyId.value,
            created_by: userStore.user.id,
            updated_by: userStore.user.id,
          },
        ])
        .select()
        .single();

      const { data, error: insertError } = insertResponse as {
        data: School;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        error: any;
      };

      if (insertError) throw insertError;

      schools.value = [...schools.value, data];

      // Fetch logo asynchronously (don't block school creation)
      // Use dynamic import to avoid circular dependency
      try {
        const { useSchoolLogos } = await import("./useSchoolLogos");
        const { fetchSchoolLogo } = useSchoolLogos();
        fetchSchoolLogo(data).catch((err) => {
          console.warn("Failed to fetch logo for new school:", err);
          // Don't fail school creation if logo fetch fails
        });
      } catch (logoError) {
        console.warn("Failed to initialize logo fetching:", logoError);
        // Don't fail school creation if logo fetching initialization fails
      }

      return data;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to create school";
      errorRef.value = message;
      throw err;
    } finally {
      loadingRef.value = false;
    }
  };

  const updateSchool = async (id: string, updates: Partial<School>) => {
    if (!userStore.user || !activeFamily.activeFamilyId.value) {
      throw new Error("User not authenticated or family not loaded");
    }

    loadingRef.value = true;
    errorRef.value = null;

    try {
      // Sanitize text fields to prevent XSS
      const sanitizedUpdates = { ...updates };

      if (sanitizedUpdates.notes) {
        sanitizedUpdates.notes = sanitizeHtml(sanitizedUpdates.notes);
      }
      if (sanitizedUpdates.pros && Array.isArray(sanitizedUpdates.pros)) {
        sanitizedUpdates.pros = sanitizedUpdates.pros
          .filter((p): p is string => !!p)
          .map((p) => sanitizeHtml(p));
      }
      if (sanitizedUpdates.cons && Array.isArray(sanitizedUpdates.cons)) {
        sanitizedUpdates.cons = sanitizedUpdates.cons
          .filter((c): c is string => !!c)
          .map((c) => sanitizeHtml(c));
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updateResponse = await (supabase.from("schools") as any)
        .update({
          ...sanitizedUpdates,
          updated_by: userStore.user.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("family_unit_id", activeFamily.activeFamilyId.value)
        .select()
        .single();

      const { data, error: updateError } = updateResponse as {
        data: School;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        error: any;
      };

      if (updateError) throw updateError;

      // Update local state
      const index = schools.value.findIndex((s) => s.id === id);
      if (index !== -1) {
        schools.value[index] = data;
      }

      return data;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to update school";
      errorRef.value = message;
      throw err;
    } finally {
      loadingRef.value = false;
    }
  };

  const deleteSchool = async (id: string) => {
    if (!userStore.user || !activeFamily.activeFamilyId.value) {
      throw new Error("User not authenticated or family not loaded");
    }

    loadingRef.value = true;
    errorRef.value = null;

    try {
      const deleteResponse = await supabase
        .from("schools")
        .delete()
        .eq("id", id)
        .eq("family_unit_id", activeFamily.activeFamilyId.value);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: deleteError } = deleteResponse as { error: any };

      if (deleteError) throw deleteError;

      // Update local state
      schools.value = schools.value.filter((s) => s.id !== id);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to delete school";
      errorRef.value = message;
      throw err;
    } finally {
      loadingRef.value = false;
    }
  };

  const toggleFavorite = async (id: string, isFavorite: boolean) => {
    return updateSchool(id, { is_favorite: !isFavorite });
  };

  const updateRanking = async (schools_: School[]) => {
    if (!userStore.user) throw new Error("User not authenticated");

    loadingRef.value = true;
    errorRef.value = null;

    try {
      // Batch update all rankings in a single operation (28x faster than loop)
      const updates = schools_.map((school, index) => ({
        id: school.id,
        ranking: index + 1,
        updated_by: userStore.user!.id,
        updated_at: new Date().toISOString(),
      }));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const upsertResponse = await (supabase.from("schools") as any).upsert(
        updates,
        { onConflict: "id" },
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: batchError } = upsertResponse as { error: any };

      if (batchError) throw batchError;

      schools.value = schools_;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to update ranking";
      errorRef.value = message;
    } finally {
      loadingRef.value = false;
    }
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
    // Check name first (most reliable)
    const nameDuplicate = isNameDuplicate(
      schoolData.name === null ? undefined : schoolData.name,
    );
    if (nameDuplicate) {
      return { duplicate: nameDuplicate, matchType: "name" };
    }

    // Check domain second
    const domainDuplicate = isDomainDuplicate(schoolData.website);
    if (domainDuplicate) {
      return { duplicate: domainDuplicate, matchType: "domain" };
    }

    // Check NCAA ID last
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
   * Update school status with history tracking
   * Story 3.4: Status change timestamped and tracked in history
   */
  const updateStatus = async (
    schoolId: string,
    newStatus: School["status"],
    notes?: string,
  ): Promise<School> => {
    if (!userStore.user || !activeFamily.activeFamilyId.value) {
      throw new Error("User not authenticated or family not loaded");
    }

    loadingRef.value = true;
    errorRef.value = null;

    try {
      // Find current school to get previous status (from local cache or fetch from DB)
      let school = schools.value.find((s) => s.id === schoolId);

      if (!school) {
        // If not in local cache, fetch from database (e.g., viewing detail page)
        const fetchResponse = await supabase
          .from("schools")
          .select("*")
          .eq("id", schoolId)
          .eq("family_unit_id", activeFamily.activeFamilyId.value)
          .single();

        const { data: fetchedSchool, error: fetchError } = fetchResponse as {
          data: School;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          error: any;
        };

        if (fetchError || !fetchedSchool) {
          throw new Error("School not found");
        }
        school = fetchedSchool;
      }

      const previousStatus = school.status;
      const now = new Date().toISOString();

      // Update school status and status_changed_at timestamp
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updateStatusResponse = await (supabase.from("schools") as any)
        .update({
          status: newStatus,
          status_changed_at: now,
          updated_by: userStore.user.id,
          updated_at: now,
        })
        .eq("id", schoolId)
        .eq("family_unit_id", activeFamily.activeFamilyId.value)
        .select()
        .single();

      const { data: updatedSchool, error: schoolError } =
        updateStatusResponse as {
          data: School;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          error: any;
        };

      if (schoolError) throw schoolError;

      // Create status history entry
      const historyResponse =
        await // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from("school_status_history") as any).insert([
          {
            school_id: schoolId,
            previous_status: previousStatus,
            new_status: newStatus,
            changed_by: userStore.user.id,
            changed_at: now,
            notes: notes || null,
          },
        ]);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: historyError } = historyResponse as { error: any };

      if (historyError) throw historyError;

      // Update local state
      const index = schools.value.findIndex((s) => s.id === schoolId);
      if (index !== -1) {
        schools.value[index] = updatedSchool;
      }

      return updatedSchool;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to update school status";
      errorRef.value = message;
      throw err;
    } finally {
      loadingRef.value = false;
    }
  };

  return {
    schools: computed(() => schools.value),
    favoriteSchools,
    loading,
    error,
    fetchSchools,
    getSchool,
    createSchool,
    updateSchool,
    deleteSchool,
    toggleFavorite,
    updateRanking,
    updateStatus,
    findDuplicate,
    hasDuplicate,
    isNameDuplicate,
    isDomainDuplicate,
    isNCAAAIDuplicate,
  };
};
