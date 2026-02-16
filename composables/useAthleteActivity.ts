/**
 * Composable for fetching athlete activity data
 * Used by parent accounts to view their linked athletes' interactions
 */

import { ref } from "vue";
import { useSupabase } from "~/composables/useSupabase";
import { useUserStore } from "~/stores/user";
import type { Interaction, User } from "~/types/models";

interface AthleteActivityState {
  linkedAthletes: Ref<User[]>;
  recentInteractions: Ref<Interaction[]>;
  loading: Ref<boolean>;
  error: Ref<string | null>;
}

export const useAthleteActivity = (): AthleteActivityState & {
  fetchAthleteActivity: () => Promise<void>;
} => {
  const supabase = useSupabase();
  const userStore = useUserStore();

  const linkedAthletes = ref<User[]>([]);
  const recentInteractions = ref<Interaction[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const fetchAthleteActivity = async () => {
    if (!userStore.isParent || !userStore.user) {
      loading.value = false;
      return;
    }

    loading.value = true;
    error.value = null;

    try {
      // Fetch linked athletes
      const response = await supabase
        .from("account_links")
        .select("player_user_id")
        .eq("parent_user_id", userStore.user.id);

      const { data: accountLinks, error: linksError } = response as {
        data: Array<{ player_user_id: string | null }> | null;
        error: { message: string } | null;
      };

      if (linksError) {
        throw new Error(`Failed to fetch linked accounts: ${linksError.message}`);
      }

      if (!accountLinks || accountLinks.length === 0) {
        linkedAthletes.value = [];
        recentInteractions.value = [];
        return;
      }

      const athleteIds = accountLinks
        .map((link: { player_user_id: string | null }) => link.player_user_id)
        .filter((id: string | null): id is string => id !== null);

      if (athleteIds.length === 0) {
        linkedAthletes.value = [];
        recentInteractions.value = [];
        return;
      }

      // Fetch athlete user data
      const { data: athletes, error: athletesError } = await supabase
        .from("users")
        .select("*")
        .in("id", athleteIds);

      if (athletesError) {
        throw new Error(`Failed to fetch athletes: ${athletesError.message}`);
      }

      linkedAthletes.value = athletes || [];

      // Fetch 5 most recent interactions from linked athletes
      const { data: interactions, error: interactionsError } = await supabase
        .from("interactions")
        .select("*")
        .in("logged_by", athleteIds)
        .order("occurred_at", { ascending: false })
        .limit(5);

      if (interactionsError) {
        throw new Error(
          `Failed to fetch athlete interactions: ${interactionsError.message}`,
        );
      }

      recentInteractions.value = interactions || [];
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load athlete activity";
      error.value = message;
      console.error("[useAthleteActivity] Error:", err);
    } finally {
      loading.value = false;
    }
  };

  return {
    linkedAthletes,
    recentInteractions,
    loading,
    error,
    fetchAthleteActivity,
  };
};
