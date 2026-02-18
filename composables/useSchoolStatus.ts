import { ref, computed, inject } from "vue";
import { useSupabase } from "./useSupabase";
import { useUserStore } from "~/stores/user";
import { useActiveFamily } from "./useActiveFamily";
import { useFamilyContext } from "./useFamilyContext";
import type { School } from "~/types/models";

/**
 * useSchoolStatus composable
 * Handles school recruiting status updates with audit trail.
 * Status changes are recorded in school_status_history.
 */
export const useSchoolStatus = () => {
  const supabase = useSupabase();
  const userStore = useUserStore();
  const injectedFamily =
    inject<ReturnType<typeof useActiveFamily>>("activeFamily");

  if (!injectedFamily) {
    if (import.meta.dev) {
      throw new Error(
        "[useSchoolStatus] activeFamily was not provided. " +
          "Wrap the component tree with provide('activeFamily', useActiveFamily()) — " +
          "app.vue already does this for all pages.",
      );
    }
    console.warn(
      "[useSchoolStatus] activeFamily injection missing — data may be stale when parent switches athletes.",
    );
  }

  const activeFamily = injectedFamily ?? useFamilyContext();

  const loadingRef = ref(false);
  const errorRef = ref<string | null>(null);

  const loading = computed(() => loadingRef.value);
  const error = computed(() => errorRef.value);

  /**
   * Update school status with history tracking.
   * Story 3.4: Status change timestamped and tracked in history.
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
      // Fetch current status from DB (minimal data transfer)
      const fetchResponse = await supabase
        .from("schools")
        .select("id, status")
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

      const previousStatus = fetchedSchool.status;
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

  return { updateStatus, loading, error };
};
