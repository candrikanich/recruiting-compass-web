import { computed, onMounted, ref, watch, getCurrentInstance } from "vue";
import { useRoute } from "vue-router";
import { useSupabase } from "./useSupabase";
import { useUserStore } from "~/stores/user";
import type { Database } from "~/types/database";

type FamilyMember = Database["public"]["Tables"]["family_members"]["Row"];

interface FamilyContext {
  familyUnitId: string;
  athleteId: string;
  isParentViewing: boolean;
}

/**
 * Composable for managing active family context
 *
 * Provides:
 * - Current family unit and athlete being viewed
 * - Family-scoped ID for queries (use in place of user_id)
 * - Parent athlete switching
 * - List of accessible athletes (for parents)
 *
 * Usage:
 * const { activeFamilyId, activeAthleteId, familyMembers } = useActiveFamily();
 *
 * Students: activeFamilyId returns their family, activeAthleteId returns their ID
 * Parents: activeFamilyId returns family of athlete in route.query.athlete_id or first family
 */

export const useActiveFamily = () => {
  const supabase = useSupabase();
  const userStore = useUserStore();
  const route = useRoute();

  const loading = ref(false);
  const error = ref<string | null>(null);

  const studentFamilyId = ref<string | null>(null);
  const parentAccessibleFamilies = ref<
    Array<{
      familyUnitId: string;
      athleteId: string;
      athleteName: string;
      graduationYear: number | null;
      familyName: string;
    }>
  >([]);
  const currentAthleteId = ref<string | null>(null);
  const familyMembers = ref<FamilyMember[]>([]);

  const isStudent = computed(() => userStore.user?.role === "student");
  const isParent = computed(() => userStore.user?.role === "parent");

  // Current active family unit ID
  const activeFamilyId = computed((): string | null => {
    if (isStudent.value) {
      return studentFamilyId.value;
    }

    // For parents, find family of currently viewed athlete
    if (isParent.value && currentAthleteId.value) {
      const family = parentAccessibleFamilies.value.find(
        (f) => f.athleteId === currentAthleteId.value,
      );
      return family?.familyUnitId || null;
    }

    return null;
  });

  // Current active athlete ID (subject being viewed)
  const activeAthleteId = computed((): string | null => {
    if (isStudent.value) {
      return userStore.user?.id || null;
    }

    if (isParent.value) {
      return currentAthleteId.value;
    }

    return null;
  });

  // Is current user a parent viewing another person's data?
  const isViewingAsParent = computed((): boolean => {
    return isParent.value && currentAthleteId.value !== null;
  });

  /**
   * Select athlete closest to graduation
   * Returns athlete with earliest (lowest) graduation year
   * Handles null graduation years by treating them as lowest priority
   */
  const selectClosestToGraduation = (): string | null => {
    if (parentAccessibleFamilies.value.length === 0) return null;

    const athletesWithYear = parentAccessibleFamilies.value.filter(
      (f) => f.graduationYear !== null,
    );

    if (athletesWithYear.length === 0) {
      // All null years, return first
      return parentAccessibleFamilies.value[0].athleteId;
    }

    // Sort by graduation year ascending (earliest first)
    const sorted = [...athletesWithYear].sort(
      (a, b) => a.graduationYear! - b.graduationYear!,
    );

    return sorted[0].athleteId;
  };

  // Fetch family structure for current user
  const initializeFamily = async () => {
    if (!userStore.user) {
      error.value = "No authenticated user";
      return;
    }

    loading.value = true;
    error.value = null;

    try {
      if (isStudent.value) {
        // For students, fetch their family unit
        const response = await supabase
          .from("family_units")
          .select("id, family_name")
          .eq("student_user_id", userStore.user.id)
          .maybeSingle();

        const { data, error: fetchError } = response as {
          data: { id: string; family_name: string | null } | null;
          error: any;
        };

        if (fetchError) {
          console.error(
            "[useActiveFamily] Error fetching student family unit:",
            fetchError,
          );
          // Don't throw - just log and continue. Family will be null but we can still proceed.
        }
        if (data) {
          studentFamilyId.value = data.id;
        }
      } else if (isParent.value) {
        // For parents, fetch all accessible families via API
        try {
          // Get auth session to include token
          const {
            data: { session },
          } = await supabase.auth.getSession();

          // Skip API call if no valid session (e.g., during logout)
          if (!session?.access_token) {
            console.debug(
              "[useActiveFamily] No valid session, skipping API call",
            );
            parentAccessibleFamilies.value = [];
            return;
          }

          const response = await $fetch("/api/family/accessible", {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          });

          console.debug(
            `[useActiveFamily] API response: ${response.families?.length || 0} families`,
            response.families,
          );

          if (response.families) {
            parentAccessibleFamilies.value = response.families;

            // Set current athlete: route param > localStorage > closest to graduation > first
            const athleteIdFromRoute = route.query.athlete_id as
              | string
              | undefined;

            if (
              athleteIdFromRoute &&
              parentAccessibleFamilies.value.some(
                (f) => f.athleteId === athleteIdFromRoute,
              )
            ) {
              // Query param takes precedence
              currentAthleteId.value = athleteIdFromRoute;
            } else if (typeof window !== "undefined") {
              // Try localStorage (only on client side)
              const savedAthleteId = localStorage.getItem(
                "parent_last_viewed_athlete",
              );

              if (
                savedAthleteId &&
                parentAccessibleFamilies.value.some(
                  (f) => f.athleteId === savedAthleteId,
                )
              ) {
                currentAthleteId.value = savedAthleteId;
              } else {
                // Auto-select athlete closest to graduation
                currentAthleteId.value = selectClosestToGraduation();
              }
            } else {
              // Server-side fallback
              currentAthleteId.value = selectClosestToGraduation();
            }
          }
        } catch (err) {
          // If API call fails, log the error for debugging
          const errMsg =
            err instanceof Error ? err.message : JSON.stringify(err);
          console.debug("[useActiveFamily] API call failed:", errMsg);
          parentAccessibleFamilies.value = [];
        }
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to load family info";
      error.value = message;
      console.error("[useActiveFamily] Error:", message);
    } finally {
      loading.value = false;
    }
  };

  // Fetch family members for current family
  const fetchFamilyMembers = async () => {
    if (!activeFamilyId.value) {
      familyMembers.value = [];
      return;
    }

    try {
      const { data, error: fetchError } = await supabase
        .from("family_members")
        .select("*")
        .eq("family_unit_id", activeFamilyId.value);

      if (fetchError) throw fetchError;
      familyMembers.value = data || [];
    } catch (err: unknown) {
      console.error("[useActiveFamily] Error fetching family members:", err);
    }
  };

  // Switch athlete (for parents)
  const switchAthlete = async (athleteId: string) => {
    if (!isParent.value) return;

    if (
      !parentAccessibleFamilies.value.some((f) => f.athleteId === athleteId)
    ) {
      error.value = "No access to this athlete";
      return;
    }

    const previousAthleteId = currentAthleteId.value;
    currentAthleteId.value = athleteId;

    console.debug(
      `[useActiveFamily] Athlete switched: ${previousAthleteId} → ${athleteId}, ` +
        `instance: ${_debugInstanceId}, family: ${activeFamilyId.value}`,
    );

    // Persist to localStorage
    if (typeof window !== "undefined") {
      localStorage.setItem("parent_last_viewed_athlete", athleteId);
    }

    // Fetch new family members
    await fetchFamilyMembers();
  };

  // Get accessible athletes (for parents)
  const getAccessibleAthletes = () => {
    if (!isParent.value) return [];
    return parentAccessibleFamilies.value;
  };

  // Get display context (for UI)
  const getDisplayContext = (): FamilyContext | null => {
    if (!activeFamilyId.value || !activeAthleteId.value) {
      return null;
    }

    return {
      familyUnitId: activeFamilyId.value,
      athleteId: activeAthleteId.value,
      isParentViewing: isViewingAsParent.value,
    };
  };

  // Initialize on mount and when user role changes
  // Only register lifecycle hook if we're in a component context
  if (getCurrentInstance()) {
    onMounted(async () => {
      await initializeFamily();
      await fetchFamilyMembers();
    });
  } else {
    // If not in component context (e.g., in middleware), initialize immediately
    // without awaiting to avoid blocking
    initializeFamily().catch((err) =>
      console.warn("Failed to initialize family context:", err),
    );
  }

  // Reinitialize if user role changes (e.g., from unloaded to parent/student)
  watch(
    () => userStore.user?.role,
    async (newRole) => {
      if (newRole) {
        console.debug(
          `[useActiveFamily] User role changed to "${newRole}", reinitializing...`,
        );
        await initializeFamily();
        await fetchFamilyMembers();
      }
    },
  );

  /**
   * Get the user ID that should own new data
   * - If viewing as parent (parent looking at child's data): return child's ID
   * - Otherwise: return logged-in user's ID
   *
   * This ensures data residency with the athlete/student, even when created by parent
   */
  const getDataOwnerUserId = (): string | null => {
    return activeAthleteId.value;
  };

  // Debug instance ID for verifying singleton usage
  const _debugInstanceId = (() => {
    const str = Math.random().toString(36);
    return str ? str.slice(2, 9) : "unknown";
  })();

  return {
    // State
    loading,
    error,
    activeFamilyId,
    activeAthleteId,
    isViewingAsParent,
    familyMembers,
    parentAccessibleFamilies,

    // Computed
    isStudent,
    isParent,

    // Methods
    initializeFamily,
    fetchFamilyMembers,
    switchAthlete,
    getAccessibleAthletes,
    getDisplayContext,
    getDataOwnerUserId,

    // Debug
    _debugInstanceId,
  };
};

export type UseActiveFamilyReturn = ReturnType<typeof useActiveFamily>;
