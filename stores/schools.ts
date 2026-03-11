import { ref, computed } from "vue";
import { defineStore } from "pinia";
import type { School, SchoolStatusHistory } from "~/types/models";
import { createClientLogger } from "~/utils/logger";
import { useSupabase } from "~/composables/useSupabase";
import { sanitizeSchoolFields } from "~/utils/sanitizers/entitySanitizer";
import { useUserStore } from "./user";

export interface SchoolFilters {
  division: string;
  state: string;
  verified: boolean | null;
  priorityTiers?: ("A" | "B" | "C")[];
}

export interface SchoolState {
  schools: School[];
  selectedSchoolId: string | null;
  loading: boolean;
  error: string | null;
  isFetched: boolean;
  filters: SchoolFilters;
  statusHistory: Record<string, SchoolStatusHistory[]>;
}

/**
 * School store - Manages school data and recruiting status
 *
 * Provides centralized state management for:
 * - School CRUD operations
 * - Filtering and searching
 * - School selection and ranking
 * - Favorite management
 *
 * @example
 * const schoolStore = useSchoolStore()
 * await schoolStore.fetchSchools()
 * schoolStore.setSelectedSchool(schoolId)
 */
const logger = createClientLogger("stores/schools");

export const useSchoolStore = defineStore("schools", () => {
  const schools = ref<School[]>([]);
  const selectedSchoolId = ref<string | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const isFetched = ref(false);
  const filters = ref<SchoolFilters>({
    division: "",
    state: "",
    verified: null,
  });
  const statusHistory = ref<Record<string, SchoolStatusHistory[]>>({});

  /**
   * Get the currently selected school
   */
  const selectedSchool = computed(
    () => schools.value.find((s) => s.id === selectedSchoolId.value) || null,
  );

  /**
   * Get schools filtered by current filter state
   */
  const filteredSchools = computed(() =>
    schools.value.filter((s) => {
      if (filters.value.division && s.division !== filters.value.division)
        return false;
      if (filters.value.state && s.state !== filters.value.state) return false;
      if (filters.value.verified !== null) {
        // TODO: Add verified field to School type if needed
      }
      if (
        filters.value.priorityTiers &&
        filters.value.priorityTiers.length > 0 &&
        !filters.value.priorityTiers.includes(
          s.priority_tier as "A" | "B" | "C",
        )
      ) {
        return false;
      }
      return true;
    }),
  );

  /**
   * Get favorite schools only
   */
  const favoriteSchools = computed(() =>
    schools.value.filter((s) => s.is_favorite),
  );

  /**
   * Check if schools have been fetched
   */
  const hasSchools = computed(() => schools.value.length > 0);

  /**
   * Get schools by status
   */
  const schoolsByStatus = (status: School["status"]) =>
    schools.value.filter((s) => s.status === status);

  /**
   * Get schools by division
   */
  const schoolsByDivision = (division: School["division"]) =>
    schools.value.filter((s) => s.division === division);

  /**
   * Get schools by priority tier
   */
  const schoolsByPriorityTier = (tier: "A" | "B" | "C") =>
    schools.value.filter((s) => s.priority_tier === tier);

  /**
   * Get status history for a specific school
   */
  const statusHistoryFor = (schoolId: string) =>
    statusHistory.value[schoolId] || [];

  /**
   * Fetch all schools for the current user
   * Guards against redundant fetches with isFetched flag
   */
  async function fetchSchools() {
    // Guard: don't refetch if already loaded
    if (isFetched.value && schools.value.length > 0) return;

    loading.value = true;
    error.value = null;

    try {
      const { useFamilyContext } = await import(
        "~/composables/useFamilyContext"
      );
      const userStore = useUserStore();
      const activeFamily = useFamilyContext();
      const supabase = useSupabase();

      if (!userStore.user) {
        throw new Error("User not authenticated");
      }

      if (!activeFamily.activeFamilyId.value) {
        throw new Error("No family context");
      }

      const { data, error: fetchError } = await supabase
        .from("schools")
        .select("*")
        .eq("family_unit_id", activeFamily.activeFamilyId.value)
        .order("ranking", { ascending: true, nullsFirst: false });

      if (fetchError) throw fetchError;

      schools.value = data || [];
      isFetched.value = true;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch schools";
      error.value = message;
      logger.error(message);
    } finally {
      loading.value = false;
    }
  }

  /**
   * Get a single school by ID
   */
  async function getSchool(id: string): Promise<School | null> {
    const { useFamilyContext } = await import(
      "~/composables/useFamilyContext"
    );

    const userStore = useUserStore();
    const activeFamily = useFamilyContext();
    const supabase = useSupabase();

    loading.value = true;
    error.value = null;

    try {
      if (!userStore.user) {
        throw new Error("User not authenticated");
      }

      if (!activeFamily.activeFamilyId.value) {
        throw new Error("No family context");
      }

      const { data, error: fetchError } = await supabase
        .from("schools")
        .select("*")
        .eq("id", id)
        .eq("family_unit_id", activeFamily.activeFamilyId.value)
        .single();

      if (fetchError) throw fetchError;
      return data;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch school";
      error.value = message;
      return null;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Create a new school
   */
  async function createSchool(
    schoolData: Omit<School, "id" | "created_at" | "updated_at">,
  ) {
    const userStore = useUserStore();
    const supabase = useSupabase();

    loading.value = true;
    error.value = null;

    try {
      if (!userStore.user) {
        throw new Error("User not authenticated");
      }

      const sanitized = sanitizeSchoolFields({ ...schoolData });

      const insertData = [
        {
          ...sanitized,
          user_id: userStore.user.id,
          created_by: userStore.user.id,
          updated_by: userStore.user.id,
        },
      ];

      // useSupabase() returns SupabaseClient<any>; typed casts require the Database generic to be added to useSupabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error: insertError } = await (supabase as any)
        .from("schools")
        .insert(insertData)
        .select()
        .single();

      if (insertError) throw insertError;

      schools.value.unshift(data as School);
      return data as School;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to create school";
      error.value = message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Update an existing school
   */
  async function updateSchool(id: string, updates: Partial<School>) {
    const { useFamilyContext } = await import(
      "~/composables/useFamilyContext"
    );
    const userStore = useUserStore();
    const activeFamily = useFamilyContext();
    const supabase = useSupabase();

    loading.value = true;
    error.value = null;

    try {
      if (!userStore.user) {
        throw new Error("User not authenticated");
      }

      if (!activeFamily.activeFamilyId.value) {
        throw new Error("No family context");
      }

      const sanitized = sanitizeSchoolFields({ ...updates });

      const updateData = {
        ...sanitized,
        updated_by: userStore.user.id,
        updated_at: new Date().toISOString(),
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error: updateError } = await (supabase as any)
        .from("schools")
        .update(updateData)
        .eq("id", id)
        .eq("family_unit_id", activeFamily.activeFamilyId.value)
        .select()
        .single();

      if (updateError) throw updateError;

      // Update local state
      const index = schools.value.findIndex((s) => s.id === id);
      if (index !== -1) {
        schools.value[index] = data as School;
      }

      return data as School;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to update school";
      error.value = message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Delete a school
   */
  async function deleteSchool(id: string) {
    const { useFamilyContext } = await import(
      "~/composables/useFamilyContext"
    );
    const userStore = useUserStore();
    const activeFamily = useFamilyContext();
    const supabase = useSupabase();

    loading.value = true;
    error.value = null;

    try {
      if (!userStore.user) {
        throw new Error("User not authenticated");
      }

      if (!activeFamily.activeFamilyId.value) {
        throw new Error("No family context");
      }

      const { error: deleteError } = await supabase
        .from("schools")
        .delete()
        .eq("id", id)
        .eq("family_unit_id", activeFamily.activeFamilyId.value);

      if (deleteError) throw deleteError;

      // Update local state
      schools.value = schools.value.filter((s) => s.id !== id);
      if (selectedSchoolId.value === id) {
        selectedSchoolId.value = null;
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to delete school";
      error.value = message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Toggle favorite status of a school
   */
  async function toggleFavorite(id: string, isFavorite: boolean) {
    return updateSchool(id, { is_favorite: !isFavorite });
  }

  /**
   * Update school rankings (batch operation)
   * Much faster than updating individually
   */
  async function updateRanking(schools_: School[]) {
    const userStore = useUserStore();
    const supabase = useSupabase();

    loading.value = true;
    error.value = null;

    try {
      if (!userStore.user) {
        throw new Error("User not authenticated");
      }

      // Batch update all rankings in a single operation
      const updates = schools_.map((school, index) => ({
        id: school.id,
        ranking: index + 1,
        updated_by: userStore.user!.id,
        updated_at: new Date().toISOString(),
      }));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: batchError } = await (supabase as any)
        .from("schools")
        .upsert(updates, { onConflict: "id" });

      if (batchError) throw batchError;

      schools.value = schools_;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to update ranking";
      error.value = message;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Update school status and create a history entry
   * Story 3.4: Status change timestamped and tracked in history
   */
  async function updateStatus(
    schoolId: string,
    newStatus: School["status"],
    notes?: string,
  ) {
    const { useFamilyContext } = await import(
      "~/composables/useFamilyContext"
    );
    const userStore = useUserStore();
    const activeFamily = useFamilyContext();
    const supabase = useSupabase();

    loading.value = true;
    error.value = null;

    try {
      if (!userStore.user) {
        throw new Error("User not authenticated");
      }

      if (!activeFamily.activeFamilyId.value) {
        throw new Error("No family context");
      }

      // Fetch current status from DB to avoid stale-cache history corruption
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: currentSchool, error: selectError } = await (supabase as any)
        .from("schools")
        .select("status")
        .eq("id", schoolId)
        .eq("family_unit_id", activeFamily.activeFamilyId.value)
        .single();

      if (selectError) throw selectError;

      const previousStatus =
        (currentSchool as { status: School["status"] } | null)?.status ?? null;
      const now = new Date().toISOString();

      // Update school status and status_changed_at timestamp
      const schoolUpdateData = {
        status: newStatus,
        status_changed_at: now,
        updated_by: userStore.user.id,
        updated_at: now,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: updatedSchool, error: schoolError } = await (supabase as any)
        .from("schools")
        .update(schoolUpdateData)
        .eq("id", schoolId)
        .eq("family_unit_id", activeFamily.activeFamilyId.value)
        .select()
        .single();

      if (schoolError) throw schoolError;

      // Create status history entry
      const historyData = [
        {
          school_id: schoolId,
          previous_status: previousStatus,
          new_status: newStatus,
          changed_by: userStore.user.id,
          changed_at: now,
          notes: notes || null,
        },
      ];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: historyError } = await (supabase as any)
        .from("school_status_history")
        .insert(historyData);

      if (historyError) throw historyError;

      // Update local state
      const index = schools.value.findIndex((s) => s.id === schoolId);
      if (index !== -1) {
        schools.value[index] = updatedSchool as School;
      }

      // Clear status history cache for this school to force refresh
      delete statusHistory.value[schoolId];

      return updatedSchool as School;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to update school status";
      error.value = message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Fetch status history for a school
   * Story 3.4: View status change history and timeline
   */
  async function getStatusHistory(schoolId: string) {
    const supabase = useSupabase();

    try {
      // Check cache first
      if (schoolId in statusHistory.value) {
        return statusHistory.value[schoolId] || [];
      }

      const { data, error: fetchError } = await supabase
        .from("school_status_history")
        .select("*")
        .eq("school_id", schoolId)
        .order("changed_at", { ascending: false });

      if (fetchError) throw fetchError;

      // Cache the result
      statusHistory.value[schoolId] = data || [];
      return data || [];
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch status history";
      error.value = message;
      throw err;
    }
  }

  /**
   * Set the currently selected school
   */
  function setSelectedSchool(id: string | null) {
    selectedSchoolId.value = id;
  }

  /**
   * Update filter state
   */
  function setFilters(newFilters: Partial<SchoolFilters>) {
    filters.value = { ...filters.value, ...newFilters };
  }

  /**
   * Reset all filters
   */
  function resetFilters() {
    filters.value = {
      division: "",
      state: "",
      verified: null,
    };
  }

  /**
   * Clear error state
   */
  function clearError() {
    error.value = null;
  }

  return {
    // State
    schools,
    selectedSchoolId,
    loading,
    error,
    isFetched,
    filters,
    statusHistory,
    // Computed getters
    selectedSchool,
    filteredSchools,
    favoriteSchools,
    hasSchools,
    // Parameterized getters (plain functions)
    schoolsByStatus,
    schoolsByDivision,
    schoolsByPriorityTier,
    statusHistoryFor,
    // Actions
    fetchSchools,
    getSchool,
    createSchool,
    updateSchool,
    deleteSchool,
    toggleFavorite,
    updateRanking,
    updateStatus,
    getStatusHistory,
    setSelectedSchool,
    setFilters,
    resetFilters,
    clearError,
  };
});
