import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useUserStore } from "~/stores/user";
import { createClientLogger } from "~/utils/logger";

// Type for linked accounts (simplified from database structure)
interface LinkedAccount {
  user_id: string;
  full_name?: string;
  email: string;
  relationship: string;
}

const logger = createClientLogger("useParentContext");

/**
 * Composable to determine if current user is a parent viewing athlete data
 *
 * Provides:
 * - Detection of parent viewing linked athlete
 * - Current athlete being viewed
 * - Permissions for parent (read-only)
 * - Ability to switch between linked athletes
 */
export const useParentContext = () => {
  const route = useRoute();
  const router = useRouter();
  const userStore = useUserStore();

  // Lazily initialize store on first access (keep for backwards compat)
  const getUserStore = () => {
    return userStore;
  };

  const isParent = computed(() => getUserStore().user?.role === "parent");
  const linkedAthletes = ref<LinkedAccount[]>([]);
  const currentAthleteId = ref<string | null>(null);
  const isViewingAsParent = computed(() => {
    // True if user is a parent AND viewing a different athlete's data
    const store = getUserStore();
    return (
      isParent.value &&
      currentAthleteId.value !== null &&
      currentAthleteId.value !== store.user?.id
    );
  });

  /**
   * Initialize parent context
   * Fetch linked athletes and determine current viewing context
   * Priority: query param > localStorage > first athlete
   */
  const initialize = async () => {
    const store = getUserStore();
    if (!isParent.value) {
      currentAthleteId.value = null;
      linkedAthletes.value = [];
      return;
    }

    // Get linked athletes for this parent
    const linkedAccounts =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ((store.user as any)?.linked_accounts as LinkedAccount[]) || [];
    linkedAthletes.value = linkedAccounts.filter(
      (account: LinkedAccount) => account.relationship === "player",
    );

    // Determine which athlete is being viewed
    // Priority: 1) query param, 2) localStorage, 3) first athlete
    const athleteIdFromRoute = route.query.athlete_id as string | undefined;

    if (
      athleteIdFromRoute &&
      linkedAthletes.value.some(
        (a: LinkedAccount) => a.user_id === athleteIdFromRoute,
      )
    ) {
      // Query param takes precedence
      currentAthleteId.value = athleteIdFromRoute;
    } else if (typeof window !== "undefined") {
      // Try localStorage (only on client side)
      const lastViewed = localStorage.getItem("parent_last_viewed_athlete");
      if (
        lastViewed &&
        linkedAthletes.value.some(
          (a: LinkedAccount) => a.user_id === lastViewed,
        )
      ) {
        currentAthleteId.value = lastViewed;
      } else if (linkedAthletes.value.length > 0) {
        // Fallback to first athlete
        currentAthleteId.value = linkedAthletes.value[0].user_id;
      }
    } else if (linkedAthletes.value.length > 0) {
      // Server-side fallback (shouldn't normally happen)
      currentAthleteId.value = linkedAthletes.value[0].user_id;
    }
  };

  /**
   * Check if parent can view a specific athlete's data
   */
  const canViewAthlete = (athleteId: string): boolean => {
    if (!isParent.value) return false;
    return linkedAthletes.value.some(
      (a: LinkedAccount) => a.user_id === athleteId,
    );
  };

  /**
   * Switch to viewing different athlete
   * Updates URL query param and localStorage for persistence
   */
  const switchAthlete = async (athleteId: string) => {
    if (!canViewAthlete(athleteId)) {
      logger.error("Parent does not have access to this athlete");
      return;
    }
    currentAthleteId.value = athleteId;

    // Save to localStorage for persistence
    if (typeof window !== "undefined") {
      localStorage.setItem("parent_last_viewed_athlete", athleteId);
    }

    // Update URL with athlete ID
    await router.push({ query: { athlete_id: athleteId } });
  };

  /**
   * Get current athlete being viewed (if parent)
   */
  const getCurrentAthlete = () => {
    if (!isViewingAsParent.value) return null;
    return linkedAthletes.value.find(
      (a: LinkedAccount) => a.user_id === currentAthleteId.value,
    );
  };

  /**
   * Get display name for context (for UI)
   */
  const getContextDisplay = (): string => {
    if (!isViewingAsParent.value) return "";
    const athlete = getCurrentAthlete();
    return athlete
      ? `Viewing ${athlete.full_name || athlete.email}'s profile`
      : "";
  };

  return {
    isParent,
    isViewingAsParent,
    linkedAthletes,
    currentAthleteId,
    initialize,
    canViewAthlete,
    switchAthlete,
    getCurrentAthlete,
    getContextDisplay,
  };
};
