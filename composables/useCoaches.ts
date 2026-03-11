import { computed, shallowReadonly, inject, watch, type ComputedRef } from "vue";
import { useActiveFamily } from "./useActiveFamily";
import { useFamilyContext } from "./useFamilyContext";
import type { Coach } from "~/types/models";
import { createClientLogger } from "~/utils/logger";
import { useAuthFetch } from "~/composables/useAuthFetch";
import { useCoachStore } from "~/stores/coaches";

const logger = createClientLogger("useCoaches");

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
  smartDelete: (id: string) => Promise<{ cascadeUsed: boolean }>;
} => {
  const coachStore = useCoachStore();
  const { $fetchAuth } = useAuthFetch();
  const injectedFamily =
    inject<ReturnType<typeof useActiveFamily>>("activeFamily");

  if (!injectedFamily) {
    logger.warn(
      "[useCoaches] activeFamily injection failed, using singleton fallback. " +
        "This may cause data sync issues when parent switches athletes.",
    );
  }

  const activeFamily = injectedFamily ?? useFamilyContext();

  const coaches = shallowReadonly(computed(() => coachStore.coaches));
  const loading = computed(() => coachStore.loading);
  const error = computed(() => coachStore.error);

  // Auto-invalidate cache when parent switches athlete
  watch(
    () => activeFamily.activeAthleteId?.value,
    async (newId, oldId) => {
      if (newId && newId !== oldId) {
        coachStore.coaches = [];
        await coachStore.fetchAllCoaches();
      }
    },
  );

  const fetchCoaches = (schoolId: string): Promise<void> =>
    coachStore.fetchCoaches(schoolId);

  const fetchAllCoaches = (filters?: {
    search?: string;
    role?: string;
    schoolId?: string;
  }): Promise<void> => coachStore.fetchAllCoaches(filters);

  const fetchCoachesBySchools = (schoolIds: string[]): Promise<void> =>
    coachStore.fetchCoachesBySchools(schoolIds);

  const getCoach = (id: string): Promise<Coach | null> =>
    coachStore.getCoach(id);

  const createCoach = (
    schoolId: string,
    coachData: Omit<Coach, "id" | "created_at" | "updated_at">,
  ): Promise<Coach> => coachStore.createCoach(schoolId, coachData);

  const updateCoach = (id: string, updates: Partial<Coach>): Promise<Coach> =>
    coachStore.updateCoach(id, updates);

  const deleteCoach = (id: string): Promise<void> =>
    coachStore.deleteCoach(id);

  const smartDelete = async (id: string): Promise<{ cascadeUsed: boolean }> => {
    try {
      await deleteCoach(id);
      return { cascadeUsed: false };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete coach";

      // Check if this is a FK constraint error
      if (
        message.includes("Cannot delete") ||
        message.includes("violates foreign key constraint") ||
        message.includes("still referenced")
      ) {
        // Try cascade delete via API endpoint
        const cascadeResponse = await $fetchAuth<Record<string, unknown>>(
          `/api/coaches/${id}/cascade-delete`,
          { method: "POST", body: { confirmDelete: true } },
        );
        if (cascadeResponse.success) {
          coachStore.coaches = coachStore.coaches.filter((c) => c.id !== id);
          return { cascadeUsed: true };
        }
        throw new Error(
          (cascadeResponse.message as string | undefined) ||
            "Cascade delete failed",
        );
      }
      throw err;
    }
  };

  return {
    coaches,
    loading,
    error,
    fetchCoaches,
    fetchAllCoaches,
    fetchCoachesBySchools,
    getCoach,
    createCoach,
    updateCoach,
    deleteCoach,
    smartDelete,
  };
};
