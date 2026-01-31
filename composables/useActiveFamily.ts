import { computed, onMounted, ref } from "vue";
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
        (f) => f.athleteId === currentAthleteId.value
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
        const { data, error: fetchError } = await supabase
          .from("family_units")
          .select("id, family_name")
          .eq("student_user_id", userStore.user.id)
          .single();

        if (fetchError) throw fetchError;
        if (data) {
          studentFamilyId.value = data.id;
        }
      } else if (isParent.value) {
        // For parents, fetch all accessible families
        const { data, error: fetchError } = await supabase
          .from("family_members")
          .select(
            `
            family_unit_id,
            family_units (
              id,
              student_user_id,
              family_name
            )
          `
          )
          .eq("user_id", userStore.user.id)
          .eq("role", "parent");

        if (fetchError) throw fetchError;

        if (data) {
          parentAccessibleFamilies.value = data
            .map((member) => {
              const family = member.family_units as unknown as {
                id: string;
                student_user_id: string;
                family_name: string | null;
              };
              return {
                familyUnitId: member.family_unit_id,
                athleteId: family.student_user_id,
                athleteName: "Unknown", // Will fetch full names separately if needed
                familyName: family.family_name || "Family",
              };
            })
            .filter((f) => f.athleteId);

          // Set current athlete from route param or first accessible
          const athleteIdFromRoute = route.query.athlete_id as string | undefined;
          if (
            athleteIdFromRoute &&
            parentAccessibleFamilies.value.some(
              (f) => f.athleteId === athleteIdFromRoute
            )
          ) {
            currentAthleteId.value = athleteIdFromRoute;
          } else if (parentAccessibleFamilies.value.length > 0) {
            // Use first family, or check localStorage
            const savedAthleteId =
              typeof window !== "undefined"
                ? localStorage.getItem("parent_last_viewed_athlete")
                : null;

            if (
              savedAthleteId &&
              parentAccessibleFamilies.value.some(
                (f) => f.athleteId === savedAthleteId
              )
            ) {
              currentAthleteId.value = savedAthleteId;
            } else {
              currentAthleteId.value = parentAccessibleFamilies.value[0].athleteId;
            }
          }
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

    currentAthleteId.value = athleteId;

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

  // Initialize on mount
  onMounted(async () => {
    await initializeFamily();
    await fetchFamilyMembers();
  });

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
  };
};
