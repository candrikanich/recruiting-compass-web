import { defineStore } from "pinia";
import type { Coach } from "~/types/models";
import { createClientLogger } from "~/utils/logger";

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
 * Coaches store - Manages coach data and communication tracking
 *
 * Provides centralized state management for:
 * - Coach CRUD operations
 * - Filtering by school, role, and search
 * - Responsiveness scoring
 * - Coach availability tracking
 *
 * @example
 * const coachStore = useCoachStore()
 * await coachStore.fetchCoaches(schoolId)
 * const responsive = coachStore.coachesByResponsiveness
 * const coaches = responsive.map((c: any) => ({ id: c.id, school_id: c.school_id, first_name: c.first_name, last_name: c.last_name, email: c.email, responsiveness_score: c.responsiveness_score, last_contact_date: c.last_contact_date, role: c.role }))
 */
const logger = createClientLogger("stores/coaches");

export const useCoachStore = defineStore("coaches", {
  state: (): CoachState => ({
    coaches: [],
    loading: false,
    error: null,
    isFetched: false,
    lastFetchedWithFilters: false as boolean,
    isFetchedBySchools: {},
    filters: {
      schoolId: undefined,
      role: undefined,
      search: undefined,
    },
  }),

  getters: {
    /**
     * Get coaches for a specific school
     */
    coachesBySchool: (state) => (schoolId: string) =>
      state.coaches.filter((c) => c.school_id === schoolId),

    /**
     * Get coaches filtered by current filter state
     */
    filteredCoaches: (state) =>
      state.coaches.filter((c) => {
        if (state.filters.schoolId && c.school_id !== state.filters.schoolId)
          return false;
        if (state.filters.role && c.role !== state.filters.role) return false;
        if (state.filters.search) {
          const searchLower = state.filters.search.toLowerCase();
          return (
            c.first_name.toLowerCase().includes(searchLower) ||
            c.last_name.toLowerCase().includes(searchLower) ||
            c.email?.toLowerCase().includes(searchLower)
          );
        }
        return true;
      }),

    /**
     * Get coaches sorted by responsiveness score (highest first)
     // eslint-disable-next-line @typescript-eslint/no-explicit-any
     */
    coachesByResponsiveness: (state) =>
      [...state.coaches].sort((a, b) => {
        const scoreA = a.responsiveness_score || 0;
        const scoreB = b.responsiveness_score || 0;
        return scoreB - scoreA;
      }),

    /**
     * Get coaches sorted by last contact date (most recent first)
     */
    coachesByLastContact: (state) =>
      [...state.coaches].sort((a, b) => {
        if (!a.last_contact_date && !b.last_contact_date) return 0;
        if (!a.last_contact_date) return 1;
        if (!b.last_contact_date) return -1;
        return (
          new Date(b.last_contact_date).getTime() -
          new Date(a.last_contact_date).getTime()
        );
      }),

    /**
     // eslint-disable-next-line @typescript-eslint/no-explicit-any
     * Get coaches by role
     */
    coachesByRole: (state) => (role: Coach["role"]) =>
      state.coaches.filter((c) => c.role === role),

    /**
     * Check if coaches for a school have been fetched
     */
    areCoachesFetched: (state) => (schoolId: string) =>
      state.isFetchedBySchools[schoolId] === true,
  },

  actions: {
    /**
     * Fetch coaches for a specific school
     */
    async fetchCoaches(schoolId: string) {
      // Guard: don't refetch if already loaded for this school
      if (
        this.isFetchedBySchools[schoolId] &&
        this.coachesBySchool(schoolId).length > 0
      ) {
        return;
      }

      this.loading = true;
      this.error = null;

      try {
        const { useSupabase } = await import("~/composables/useSupabase");
        const supabase = useSupabase();

        const { data, error: fetchError } = await supabase
          .from("coaches")
          .select("*")
          .eq("school_id", schoolId)
          .order("created_at", { ascending: false });

        if (fetchError) throw fetchError;

        // Add new coaches or update existing ones
        const existingIds = new Set(
          this.coaches.filter((c) => c.school_id === schoolId).map((c) => c.id),
        );
        const newCoaches = (data || []).filter(
          (c: Coach) => !existingIds.has(c.id),
        );

        this.coaches.push(...newCoaches);
        this.isFetchedBySchools[schoolId] = true;
      } catch (err: unknown) {
        this.error =
          err instanceof Error ? err.message : "Failed to fetch coaches";
        logger.error("Failed to fetch coaches", err);
      } finally {
        this.loading = false;
      }
    },

    /**
     * Fetch all coaches with optional filters
     */
    async fetchAllCoaches(filters?: CoachFilters) {
      // Guard: don't refetch if already loaded
      // Only return cache if it was populated without filters
      if (this.isFetched && this.coaches.length > 0 && !filters && !this.lastFetchedWithFilters) return;

      this.loading = true;
      this.error = null;

      try {
        const { useSupabase } = await import("~/composables/useSupabase");
        const supabase = useSupabase();

        let query = supabase.from("coaches").select("*");

        if (filters?.schoolId) {
          query = query.eq("school_id", filters.schoolId);
        }

        if (filters?.role) {
          query = query.eq("role", filters.role);
        }

        const { data, error: fetchError } = await query.order("last_name", {
          ascending: true,
        });

        if (fetchError) throw fetchError;

        let result = data || [];

        // Client-side filtering for search
        if (filters?.search) {
          const searchLower = filters.search.toLowerCase();
          result = result.filter(
            (coach: Coach) =>
              coach.first_name.toLowerCase().includes(searchLower) ||
              coach.last_name.toLowerCase().includes(searchLower) ||
              coach.email?.toLowerCase().includes(searchLower),
          );
        }

        this.coaches = result;
        this.isFetched = true;
        this.lastFetchedWithFilters = !!filters;
      } catch (err: unknown) {
        this.error =
          err instanceof Error ? err.message : "Failed to fetch coaches";
        logger.error("Failed to fetch all coaches", err);
      } finally {
        this.loading = false;
      }
    },

    /**
     * Fetch coaches for multiple schools at once
     */
    async fetchCoachesBySchools(schoolIds: string[]) {
      if (schoolIds.length === 0) {
        this.coaches = [];
        return;
      }

      this.loading = true;
      this.error = null;

      try {
        const { useSupabase } = await import("~/composables/useSupabase");
        const supabase = useSupabase();

        const { data, error: fetchError } = await supabase
          .from("coaches")
          .select(
            "id, school_id, first_name, last_name, email, responsiveness_score, last_contact_date, role",
          )
          .in("school_id", schoolIds)
          .order("school_id", { ascending: true })
          .order("last_name", { ascending: true });

        if (fetchError) throw fetchError;

        this.coaches = (data || []) as Coach[];
        schoolIds.forEach((id) => {
          this.isFetchedBySchools[id] = true;
        });
      } catch (err: unknown) {
        this.error =
          err instanceof Error ? err.message : "Failed to fetch coaches";
        logger.error("Failed to fetch coaches by schools", err);
      } finally {
        this.loading = false;
      }
    },

    /**
     * Get a single coach by ID
     */
    async getCoach(id: string): Promise<Coach | null> {
      const { useSupabase } = await import("~/composables/useSupabase");
      const supabase = useSupabase();

      this.loading = true;
      this.error = null;

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
        this.error = message;
        return null;
      } finally {
        this.loading = false;
      }
    },

    /**
     * Create a new coach
     */
    async createCoach(
      schoolId: string,
      coachData: Omit<Coach, "id" | "created_at" | "updated_at">,
    ) {
      const { useSupabase } = await import("~/composables/useSupabase");
      const { sanitizeHtml } = await import("~/utils/validation/sanitize");
      const { useUserStore } = await import("./user");
      const userStore = useUserStore();
      const supabase = useSupabase();

      this.loading = true;
      this.error = null;

      try {
        if (!userStore.user) {
          throw new Error("User not authenticated");
        }

        // Sanitize notes field
        const sanitized = { ...coachData };
        if (sanitized.notes) {
          sanitized.notes = sanitizeHtml(sanitized.notes);
        }

        const insertData = [
          {
            ...sanitized,
            school_id: schoolId,
            user_id: userStore.user.id,
            created_by: userStore.user.id,
            updated_by: userStore.user.id,
          },
        ];

        const response = (await supabase
          .from("coaches")
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .insert(insertData as any)
          .select()
          .single()) as {
          data: Coach;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          error: any;
        };

        const { data, error: insertError } = response;

        if (insertError) throw insertError;

        this.coaches.push(data);
        return data;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to create coach";
        this.error = message;
        throw err;
      } finally {
        this.loading = false;
      }
    },

    /**
     * Update an existing coach
     */
    async updateCoach(id: string, updates: Partial<Coach>) {
      const { useSupabase } = await import("~/composables/useSupabase");
      const { sanitizeHtml } = await import("~/utils/validation/sanitize");
      const { useUserStore } = await import("./user");
      const userStore = useUserStore();
      const supabase = useSupabase();

      this.loading = true;
      this.error = null;

      try {
        if (!userStore.user) {
          throw new Error("User not authenticated");
        }

        // Sanitize notes field
        const sanitized = { ...updates };
        if (sanitized.notes) {
          sanitized.notes = sanitizeHtml(sanitized.notes);
        }

        const updateData = {
          ...sanitized,
          updated_by: userStore.user.id,
          updated_at: new Date().toISOString(),
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const response = (await (supabase.from("coaches") as any)
          .update(updateData)
          .eq("id", id)
          .select()
          .single()) as {
          data: Coach;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          error: any;
        };

        const { data, error: updateError } = response;

        if (updateError) throw updateError;

        // Update local state
        const index = this.coaches.findIndex((c) => c.id === id);
        if (index !== -1) {
          this.coaches[index] = data;
        }

        return data;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to update coach";
        this.error = message;
        throw err;
      } finally {
        this.loading = false;
      }
    },

    /**
     * Delete a coach
     */
    async deleteCoach(id: string) {
      const { useSupabase } = await import("~/composables/useSupabase");
      const { useUserStore } = await import("./user");
      const { useFamilyContext } = await import(
        "~/composables/useFamilyContext"
      );
      const userStore = useUserStore();
      const activeFamily = useFamilyContext();
      const supabase = useSupabase();

      this.loading = true;
      this.error = null;

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
        this.coaches = this.coaches.filter((c) => c.id !== id);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to delete coach";
        this.error = message;
        throw err;
      } finally {
        this.loading = false;
      }
    },

    /**
     * Set filter state
     */
    setFilters(newFilters: Partial<CoachFilters>) {
      this.filters = { ...this.filters, ...newFilters };
    },

    /**
     * Reset all filters
     */
    resetFilters() {
      this.filters = {
        schoolId: undefined,
        role: undefined,
        search: undefined,
      };
    },

    /**
     * Clear error state
     */
    clearError() {
      this.error = null;
    },
  },
});
