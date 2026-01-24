import { defineStore } from "pinia";
import type { School } from "~/types/models";

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
export const useSchoolStore = defineStore("schools", {
  state: (): SchoolState => ({
    schools: [],
    selectedSchoolId: null,
    loading: false,
    error: null,
    isFetched: false,
    filters: {
      division: "",
      state: "",
      verified: null,
    },
  }),

  getters: {
    /**
     * Get the currently selected school
     */
    selectedSchool: (state) =>
      state.schools.find((s) => s.id === state.selectedSchoolId) || null,

    /**
     * Get schools filtered by current filter state
     */
    filteredSchools: (state) =>
      state.schools.filter((s) => {
        if (state.filters.division && s.division !== state.filters.division)
          return false;
        if (state.filters.state && s.state !== state.filters.state)
          return false;
        if (state.filters.verified !== null) {
          // TODO: Add verified field to School type if needed
        }
        if (
          state.filters.priorityTiers &&
          state.filters.priorityTiers.length > 0 &&
          !state.filters.priorityTiers.includes(
            s.priority_tier as "A" | "B" | "C",
          )
        ) {
          return false;
        }
        return true;
      }),

    /**
     * Get favorite schools only
     */
    favoriteSchools: (state) => state.schools.filter((s) => s.is_favorite),

    /**
     * Get schools by status
     */
    schoolsByStatus: (state) => (status: School["status"]) =>
      state.schools.filter((s) => s.status === status),

    /**
     * Get schools by division
     */
    schoolsByDivision: (state) => (division: School["division"]) =>
      state.schools.filter((s) => s.division === division),

    /**
     * Get schools by priority tier
     */
    schoolsByPriorityTier: (state) => (tier: "A" | "B" | "C") =>
      state.schools.filter((s) => s.priority_tier === tier),

    /**
     * Check if schools have been fetched
     */
    hasSchools: (state) => state.schools.length > 0,
  },

  actions: {
    /**
     * Fetch all schools for the current user
     * Guards against redundant fetches with isFetched flag
     */
    async fetchSchools() {
      // Guard: don't refetch if already loaded
      if (this.isFetched && this.schools.length > 0) return;

      this.loading = true;
      this.error = null;

      try {
        const { useSupabase } = await import("~/composables/useSupabase");
        const { useUserStore } = await import("./user");
        const userStore = useUserStore();
        const supabase = useSupabase();

        if (!userStore.user) {
          throw new Error("User not authenticated");
        }

        const { data, error: fetchError } = await supabase
          .from("schools")
          .select("*")
          .eq("user_id", userStore.user.id)
          .order("ranking", { ascending: true, nullsFirst: false });

        if (fetchError) throw fetchError;

        this.schools = data || [];
        this.isFetched = true;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to fetch schools";
        this.error = message;
        console.error(message);
      } finally {
        this.loading = false;
      }
    },

    /**
     * Get a single school by ID
     */
    async getSchool(id: string): Promise<School | null> {
      const { useSupabase } = await import("~/composables/useSupabase");
      const { useUserStore } = await import("./user");
      const userStore = useUserStore();
      const supabase = useSupabase();

      this.loading = true;
      this.error = null;

      try {
        if (!userStore.user) {
          throw new Error("User not authenticated");
        }

        const { data, error: fetchError } = await supabase
          .from("schools")
          .select("*")
          .eq("id", id)
          .eq("user_id", userStore.user.id)
          .single();

        if (fetchError) throw fetchError;
        return data;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to fetch school";
        this.error = message;
        return null;
      } finally {
        this.loading = false;
      }
    },

    /**
     * Create a new school
     */
    async createSchool(
      schoolData: Omit<School, "id" | "created_at" | "updated_at">,
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

        // Sanitize text fields to prevent XSS
        const sanitized = { ...schoolData };
        if (sanitized.notes) {
          sanitized.notes = sanitizeHtml(sanitized.notes);
        }
        if (sanitized.pros && Array.isArray(sanitized.pros)) {
          sanitized.pros = sanitized.pros
            .filter((p: string | undefined): p is string => !!p)
            .map((p) => sanitizeHtml(p));
        }
        if (sanitized.cons && Array.isArray(sanitized.cons)) {
          sanitized.cons = sanitized.cons
            .filter((c: string | undefined): c is string => !!c)
            .map((c) => sanitizeHtml(c));
        }

        const { data, error: insertError } = await supabase
          .from("schools")
          .insert([
            {
              ...sanitized,
              user_id: userStore.user.id,
              created_by: userStore.user.id,
              updated_by: userStore.user.id,
            },
          ])
          .select()
          .single();

        if (insertError) throw insertError;

        this.schools.unshift(data);
        return data;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to create school";
        this.error = message;
        throw err;
      } finally {
        this.loading = false;
      }
    },

    /**
     * Update an existing school
     */
    async updateSchool(id: string, updates: Partial<School>) {
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

        // Sanitize text fields
        const sanitized = { ...updates };
        if (sanitized.notes) {
          sanitized.notes = sanitizeHtml(sanitized.notes);
        }
        if (sanitized.pros && Array.isArray(sanitized.pros)) {
          sanitized.pros = sanitized.pros
            .filter((p): p is string => !!p)
            .map((p) => sanitizeHtml(p));
        }
        if (sanitized.cons && Array.isArray(sanitized.cons)) {
          sanitized.cons = sanitized.cons
            .filter((c): c is string => !!c)
            .map((c) => sanitizeHtml(c));
        }

        const { data, error: updateError } = await supabase
          .from("schools")
          .update({
            ...sanitized,
            updated_by: userStore.user.id,
            updated_at: new Date().toISOString(),
          })
          .eq("id", id)
          .eq("user_id", userStore.user.id)
          .select()
          .single();

        if (updateError) throw updateError;

        // Update local state
        const index = this.schools.findIndex((s) => s.id === id);
        if (index !== -1) {
          this.schools[index] = data;
        }

        return data;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to update school";
        this.error = message;
        throw err;
      } finally {
        this.loading = false;
      }
    },

    /**
     * Delete a school
     */
    async deleteSchool(id: string) {
      const { useSupabase } = await import("~/composables/useSupabase");
      const { useUserStore } = await import("./user");
      const userStore = useUserStore();
      const supabase = useSupabase();

      this.loading = true;
      this.error = null;

      try {
        if (!userStore.user) {
          throw new Error("User not authenticated");
        }

        const { error: deleteError } = await supabase
          .from("schools")
          .delete()
          .eq("id", id)
          .eq("user_id", userStore.user.id);

        if (deleteError) throw deleteError;

        // Update local state
        this.schools = this.schools.filter((s) => s.id !== id);
        if (this.selectedSchoolId === id) {
          this.selectedSchoolId = null;
        }
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to delete school";
        this.error = message;
        throw err;
      } finally {
        this.loading = false;
      }
    },

    /**
     * Toggle favorite status of a school
     */
    async toggleFavorite(id: string, isFavorite: boolean) {
      return this.updateSchool(id, { is_favorite: !isFavorite });
    },

    /**
     * Update school rankings (batch operation)
     * Much faster than updating individually
     */
    async updateRanking(schools_: School[]) {
      const { useSupabase } = await import("~/composables/useSupabase");
      const { useUserStore } = await import("./user");
      const userStore = useUserStore();
      const supabase = useSupabase();

      this.loading = true;
      this.error = null;

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

        const { error: batchError } = await supabase
          .from("schools")
          .upsert(updates, { onConflict: "id" });

        if (batchError) throw batchError;

        this.schools = schools_;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to update ranking";
        this.error = message;
      } finally {
        this.loading = false;
      }
    },

    /**
     * Set the currently selected school
     */
    setSelectedSchool(id: string | null) {
      this.selectedSchoolId = id;
    },

    /**
     * Update filter state
     */
    setFilters(newFilters: Partial<SchoolFilters>) {
      this.filters = { ...this.filters, ...newFilters };
    },

    /**
     * Reset all filters
     */
    resetFilters() {
      this.filters = {
        division: "",
        state: "",
        verified: null,
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
