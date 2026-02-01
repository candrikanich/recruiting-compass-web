import { ref, computed, inject, type ComputedRef } from "vue";
import { useSupabase } from "./useSupabase";
import { useUserStore } from "~/stores/user";
import { useActiveFamily } from "./useActiveFamily";
import { useFamilyContext } from "./useFamilyContext";
import type { Coach } from "~/types/models";
import type { Database } from "~/types/database";
import { coachSchema } from "~/utils/validation/schemas";
import { sanitizeHtml } from "~/utils/validation/sanitize";

type _CoachesInsert = Database["public"]["Tables"]["coaches"]["Insert"];
type CoachesUpdate = Database["public"]["Tables"]["coaches"]["Update"];

/**
 * useCoaches composable
 * Manages coach information and communication tracking
 *
 * FAMILY-BASED ACCESS CONTROL (v2.0):
 * - Coaches are owned by family units, not individual users
 * - Students see their own coaches (their family)
 * - Parents see all coaches in accessible families
 * - Queries filter by family_unit_id instead of user_id
 * - Coach-created coaches are scoped to their family
 *
 * Coach roles:
 * - head: Head coach
 * - assistant: Assistant coach (pitching, hitting, defense, recruiting)
 * - recruiting: Dedicated recruiting coordinator
 *
 * Features:
 * - Track coach contact information (email, phone)
 * - Monitor communication responsiveness
 * - Store social media handles for outreach
 * - Track last contact date
 * - Maintain coach availability and preferences
 * - Group coaches by school
 * - Calculate responsiveness score (responses/outreach ratio)
 *
 * Responsiveness tracking helps identify which coaches are most engaged
 */
export const useCoaches = (): {
  coaches: ComputedRef<Coach[]>;
  loading: ComputedRef<boolean>;
  error: ComputedRef<string | null>;
  fetchCoaches: (schoolId: string) => Promise<void>;
  fetchAllCoaches: (filters?: {
    search?: string;
    role?: string;
    schoolId?: string;
  }) => Promise<void>;
  fetchCoachesBySchools: (schoolIds: string[]) => Promise<void>;
  getCoach: (id: string) => Promise<Coach | null>;
  createCoach: (
    schoolId: string,
    coachData: Omit<Coach, "id" | "created_at" | "updated_at">,
  ) => Promise<Coach>;
  updateCoach: (id: string, updates: Partial<Coach>) => Promise<Coach>;
  deleteCoach: (id: string) => Promise<void>;
} => {
  const supabase = useSupabase();
  const userStore = useUserStore();
  // Try to get the provided family context (from page), fall back to singleton
  const injectedFamily =
    inject<ReturnType<typeof useActiveFamily>>("activeFamily");
  const activeFamily = injectedFamily || useFamilyContext();

  if (!injectedFamily) {
    console.warn(
      "[useCoaches] activeFamily injection failed, using singleton fallback. " +
        "This may cause data sync issues when parent switches athletes.",
    );
  }

  const coaches = ref<Coach[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const fetchCoaches = async (schoolId: string) => {
    loading.value = true;
    error.value = null;

    try {
      const { data, error: fetchError } = await supabase
        .from("coaches")
        .select("*")
        .eq("school_id", schoolId)
        .order("created_at", { ascending: false });

      if (fetchError) {
        console.error("Fetch error:", fetchError);
        throw fetchError;
      }

      coaches.value = data || [];
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch coaches";
      error.value = message;
      console.error("Coach fetch error:", message);
    } finally {
      loading.value = false;
    }
  };

  const fetchAllCoaches = async (filters?: {
    search?: string;
    role?: string;
    schoolId?: string;
  }) => {
    if (!activeFamily.activeFamilyId.value) {
      error.value = "No family context";
      return;
    }

    loading.value = true;
    error.value = null;

    try {
      let query = supabase
        .from("coaches")
        .select("*")
        .eq("family_unit_id", activeFamily.activeFamilyId.value);

      if (filters?.schoolId) {
        query = query.eq("school_id", filters.schoolId);
      }

      if (filters?.role) {
        query = query.eq("role", filters.role);
      }

      // Use server-side full-text search via textSearch (utilizes GIN index from migration 017)
      if (filters?.search) {
        query = query.textSearch("search_vec", filters.search, {
          type: "websearch",
          config: "english",
        });
      } else {
        query = query.order("last_name", { ascending: true });
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        console.error("Fetch error:", fetchError);
        throw fetchError;
      }

      coaches.value = data || [];
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch coaches";
      error.value = message;
      console.error("Coach fetch error:", message);
    } finally {
      loading.value = false;
    }
  };

  const fetchCoachesBySchools = async (schoolIds: string[]) => {
    if (schoolIds.length === 0 || !activeFamily.activeFamilyId.value) {
      coaches.value = [];
      return;
    }

    loading.value = true;
    error.value = null;

    try {
      const { data, error: fetchError } = await supabase
        .from("coaches")
        .select("*")
        .in("school_id", schoolIds)
        .eq("family_unit_id", activeFamily.activeFamilyId.value)
        .order("school_id", { ascending: true })
        .order("last_name", { ascending: true });

      if (fetchError) throw fetchError;

      coaches.value = (data || []) as Coach[];
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch coaches";
      error.value = message;
    } finally {
      loading.value = false;
    }
  };

  const getCoach = async (id: string): Promise<Coach | null> => {
    if (!userStore.user) return null;

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
  };

  const createCoach = async (
    schoolId: string,
    coachData: Omit<Coach, "id" | "created_at" | "updated_at">,
  ) => {
    if (!userStore.user || !activeFamily.activeFamilyId.value) {
      throw new Error("User not authenticated or family not loaded");
    }

    loading.value = true;
    error.value = null;

    try {
      // Validate coach data with Zod schema
      const validated = await coachSchema.parseAsync(coachData);

      // Sanitize notes field to prevent XSS
      if (validated.notes) {
        validated.notes = sanitizeHtml(validated.notes);
      }

      // Convert empty strings to null for optional fields
      const dataToInsert = {
        ...validated,
        school_id: schoolId,
        user_id: activeFamily.getDataOwnerUserId(),
        family_unit_id: activeFamily.activeFamilyId.value,
        email: validated.email || null,
        phone: validated.phone || null,
        twitter_handle: validated.twitter_handle || null,
        instagram_handle: validated.instagram_handle || null,
        notes: validated.notes || null,
      };

      const { data, error: insertError } = await supabase
        .from("coaches")
        .insert([dataToInsert])
        .select()
        .single();

      if (insertError) {
        console.error("Supabase insert error details:", {
          message: insertError.message,
          details: insertError.details,
          hint: insertError.hint,
          code: insertError.code,
          dataAttempted: dataToInsert,
        });
        throw insertError;
      }

      coaches.value.push(data);
      return data;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to create coach";
      error.value = message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const updateCoach = async (id: string, updates: Partial<Coach>) => {
    if (!userStore.user || !activeFamily.activeFamilyId.value) {
      throw new Error("User not authenticated or family not loaded");
    }

    loading.value = true;
    error.value = null;

    try {
      // Sanitize notes field to prevent XSS
      const sanitizedUpdates = { ...updates };

      if (sanitizedUpdates.notes) {
        sanitizedUpdates.notes = sanitizeHtml(sanitizedUpdates.notes);
      }

      const { data, error: updateError } = await supabase
        .from("coaches")
        .update({
          ...sanitizedUpdates,
          updated_by: userStore.user.id,
          updated_at: new Date().toISOString(),
        } as CoachesUpdate)
        .eq("id", id)
        .eq("family_unit_id", activeFamily.activeFamilyId.value)
        .select()
        .single();

      if (updateError) throw updateError;

      // Update local state
      const index = coaches.value.findIndex((c) => c.id === id);
      if (index !== -1) {
        coaches.value[index] = data;
      }

      return data;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to update coach";
      error.value = message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const deleteCoach = async (id: string) => {
    if (!userStore.user || !activeFamily.activeFamilyId.value) {
      throw new Error("User not authenticated or family not loaded");
    }

    loading.value = true;
    error.value = null;

    try {
      const { error: deleteError } = await supabase
        .from("coaches")
        .delete()
        .eq("id", id)
        .eq("family_unit_id", activeFamily.activeFamilyId.value)
        .eq("user_id", userStore.user.id);

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
  };

  return {
    coaches: computed(() => coaches.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    fetchCoaches,
    fetchAllCoaches,
    fetchCoachesBySchools,
    getCoach,
    createCoach,
    updateCoach,
    deleteCoach,
  };
};
