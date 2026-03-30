import { ref, computed } from "vue";
import { defineStore } from "pinia";
import type { Coach } from "~/types/models";
import { createClientLogger } from "~/utils/logger";
import { useSupabase } from "~/composables/useSupabase";
import { sanitizeCoachFields } from "~/utils/sanitizers/entitySanitizer";
import { useUserStore } from "./user";

export interface CoachFilters {
  schoolId?: string;
  role?: string;
  search?: string;
}

export interface CoachState {
  coaches: Coach[];
  loading: boolean;
  error: string | null;
  isFetched: boolean;
  lastFetchedWithFilters: boolean;
  isFetchedBySchools: Record<string, boolean>; // Track which schools' coaches have been fetched
  filters: CoachFilters;
}

/**
 * Coaches store — manages coach data and communication tracking.
 *
 * Provides canonical state for coach CRUD and filtering.
 * Use via `useCoaches()` composable for full family-context orchestration.
 */
const logger = createClientLogger("stores/coaches");

export const useCoachStore = defineStore("coaches", () => {
  const coaches = ref<Coach[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const isFetched = ref(false);
  const lastFetchedWithFilters = ref<boolean>(false);
  const isFetchedBySchools = ref<Record<string, boolean>>({});
  const filters = ref<CoachFilters>({
    schoolId: undefined,
    role: undefined,
    search: undefined,
  });

  /**
   * Get coaches for a specific school
   */
  const coachesBySchool = (schoolId: string) =>
    coaches.value.filter((c) => c.school_id === schoolId);

  /**
   * Get coaches filtered by current filter state
   */
  const filteredCoaches = computed(() =>
    coaches.value.filter((c) => {
      if (filters.value.schoolId && c.school_id !== filters.value.schoolId)
        return false;
      if (filters.value.role && c.role !== filters.value.role) return false;
      if (filters.value.search) {
        const searchLower = filters.value.search.toLowerCase();
        return (
          c.first_name.toLowerCase().includes(searchLower) ||
          c.last_name.toLowerCase().includes(searchLower) ||
          c.email?.toLowerCase().includes(searchLower)
        );
      }
      return true;
    }),
  );

  /**
   * Get coaches sorted by last contact date (most recent first)
   */
  const coachesByLastContact = computed(() =>
    [...coaches.value].sort((a, b) => {
      if (!a.last_contact_date && !b.last_contact_date) return 0;
      if (!a.last_contact_date) return 1;
      if (!b.last_contact_date) return -1;
      return (
        new Date(b.last_contact_date).getTime() -
        new Date(a.last_contact_date).getTime()
      );
    }),
  );

  /**
   * Get coaches by role
   */
  const coachesByRole = (role: Coach["role"]) =>
    coaches.value.filter((c) => c.role === role);

  /**
   * Check if coaches for a school have been fetched
   */
  const areCoachesFetched = (schoolId: string) =>
    isFetchedBySchools.value[schoolId] === true;

  /**
   * Fetch coaches for a specific school
   */
  async function fetchCoaches(schoolId: string) {
    // Guard: don't refetch if already loaded for this school
    if (
      isFetchedBySchools.value[schoolId] &&
      coachesBySchool(schoolId).length > 0
    ) {
      return;
    }

    loading.value = true;
    error.value = null;

    try {
      const supabase = useSupabase();

      const { data, error: fetchError } = await supabase
        .from("coaches")
        .select("*")
        .eq("school_id", schoolId)
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;

      // Add new coaches or update existing ones
      const existingIds = new Set(
        coaches.value.filter((c) => c.school_id === schoolId).map((c) => c.id),
      );
      const newCoaches = (data || []).filter(
        (c: Coach) => !existingIds.has(c.id),
      );

      coaches.value.push(...newCoaches);
      isFetchedBySchools.value[schoolId] = true;
    } catch (err: unknown) {
      error.value =
        err instanceof Error ? err.message : "Failed to fetch coaches";
      logger.error("Failed to fetch coaches", err);
    } finally {
      loading.value = false;
    }
  }

  /**
   * Fetch all coaches with optional filters
   */
  async function fetchAllCoaches(filterOptions?: CoachFilters) {
    // Guard: don't refetch if already loaded
    // Only return cache if it was populated without filters
    if (
      isFetched.value &&
      coaches.value.length > 0 &&
      !filterOptions &&
      !lastFetchedWithFilters.value
    )
      return;

    loading.value = true;
    error.value = null;

    try {
      const supabase = useSupabase();

      let query = supabase.from("coaches").select("*");

      if (filterOptions?.schoolId) {
        query = query.eq("school_id", filterOptions.schoolId);
      }

      if (filterOptions?.role) {
        query = query.eq("role", filterOptions.role);
      }

      const { data, error: fetchError } = await query.order("last_name", {
        ascending: true,
      });

      if (fetchError) throw fetchError;

      let result = data || [];

      // Client-side filtering for search
      if (filterOptions?.search) {
        const searchLower = filterOptions.search.toLowerCase();
        result = result.filter(
          (coach: Coach) =>
            coach.first_name.toLowerCase().includes(searchLower) ||
            coach.last_name.toLowerCase().includes(searchLower) ||
            coach.email?.toLowerCase().includes(searchLower),
        );
      }

      coaches.value = result;
      isFetched.value = true;
      lastFetchedWithFilters.value = !!filterOptions;
    } catch (err: unknown) {
      error.value =
        err instanceof Error ? err.message : "Failed to fetch coaches";
      logger.error("Failed to fetch all coaches", err);
    } finally {
      loading.value = false;
    }
  }

  /**
   * Fetch coaches for multiple schools at once
   */
  async function fetchCoachesBySchools(schoolIds: string[]) {
    if (schoolIds.length === 0) {
      coaches.value = [];
      return;
    }

    loading.value = true;
    error.value = null;

    try {
      const supabase = useSupabase();

      const { data, error: fetchError } = await supabase
        .from("coaches")
        .select(
          "id, school_id, first_name, last_name, email, last_contact_date, role",
        )
        .in("school_id", schoolIds)
        .order("school_id", { ascending: true })
        .order("last_name", { ascending: true });

      if (fetchError) throw fetchError;

      coaches.value = (data || []) as Coach[];
      schoolIds.forEach((id) => {
        isFetchedBySchools.value[id] = true;
      });
    } catch (err: unknown) {
      error.value =
        err instanceof Error ? err.message : "Failed to fetch coaches";
      logger.error("Failed to fetch coaches by schools", err);
    } finally {
      loading.value = false;
    }
  }

  /**
   * Get a single coach by ID
   */
  async function getCoach(id: string): Promise<Coach | null> {
    const supabase = useSupabase();

    loading.value = true;
    error.value = null;

    try {
      const { data, error: fetchError } = await supabase
        .from("coaches")
        .select("*")
        .eq("id", id)
        .single();

      if (fetchError) throw fetchError;
      return data;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch coach";
      error.value = message;
      return null;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Create a new coach
   */
  async function createCoach(
    schoolId: string,
    coachData: Omit<Coach, "id" | "created_at" | "updated_at">,
  ) {
    const userStore = useUserStore();
    const supabase = useSupabase();

    loading.value = true;
    error.value = null;

    try {
      if (!userStore.user) {
        throw new Error("User not authenticated");
      }

      const sanitized = sanitizeCoachFields(coachData);

      const insertData = [
        {
          ...sanitized,
          school_id: schoolId,
          user_id: userStore.user.id,
          created_by: userStore.user.id,
          updated_by: userStore.user.id,
        },
      ];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error: insertError } = await (supabase as any)
        .from("coaches") // useSupabase() is untyped (SupabaseClient<any>); typed casts require useSupabase to use Database generic
        .insert(insertData)
        .select()
        .single();

      if (insertError) throw insertError;

      coaches.value.push(data as Coach);
      return data as Coach;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to create coach";
      error.value = message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Update an existing coach
   */
  async function updateCoach(id: string, updates: Partial<Coach>) {
    const userStore = useUserStore();
    const supabase = useSupabase();

    loading.value = true;
    error.value = null;

    try {
      if (!userStore.user) {
        throw new Error("User not authenticated");
      }

      const sanitized = sanitizeCoachFields(updates);

      const updateData = {
        ...sanitized,
        updated_by: userStore.user.id,
        updated_at: new Date().toISOString(),
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error: updateError } = await (supabase as any)
        .from("coaches") // see above
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (updateError) throw updateError;

      const updated = data as Coach;
      // Update local state
      const index = coaches.value.findIndex((c) => c.id === id);
      if (index !== -1) {
        coaches.value[index] = updated;
      }

      return updated;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to update coach";
      error.value = message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Delete a coach
   */
  async function deleteCoach(id: string) {
    const { useFamilyContext } = await import("~/composables/useFamilyContext");
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
        .from("coaches")
        .delete()
        .eq("id", id)
        .eq("family_unit_id", activeFamily.activeFamilyId.value);

      if (deleteError) throw deleteError;

      // Update local state
      coaches.value = coaches.value.filter((c) => c.id !== id);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to delete coach";
      error.value = message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Set filter state
   */
  function setFilters(newFilters: Partial<CoachFilters>) {
    filters.value = { ...filters.value, ...newFilters };
  }

  /**
   * Reset all filters
   */
  function resetFilters() {
    filters.value = {
      schoolId: undefined,
      role: undefined,
      search: undefined,
    };
  }

  /**
   * Clear error state
   */
  function clearError() {
    error.value = null;
  }

  return {
    coaches,
    loading,
    error,
    isFetched,
    lastFetchedWithFilters,
    isFetchedBySchools,
    filters,
    filteredCoaches,
    coachesByLastContact,
    coachesBySchool,
    coachesByRole,
    areCoachesFetched,
    fetchCoaches,
    fetchAllCoaches,
    fetchCoachesBySchools,
    getCoach,
    createCoach,
    updateCoach,
    deleteCoach,
    setFilters,
    resetFilters,
    clearError,
  };
});
