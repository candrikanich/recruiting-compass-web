import { ref, type Ref } from "vue";
import { useSupabase } from "./useSupabase";
import { useUserStore } from "~/stores/user";
import type { FormattedHistoryEntry } from "./useProfile";

/**
 * Map database field names to human-readable labels
 */
const FIELD_LABELS: Record<string, string> = {
  graduation_year: "Graduation Year",
  high_school: "High School",
  club_team: "Club/Travel Team",
  positions: "Positions",
  bats: "Bats",
  throws: "Throws",
  height_inches: "Height",
  weight_lbs: "Weight",
  gpa: "GPA",
  sat_score: "SAT Score",
  act_score: "ACT Score",
  ncaa_id: "NCAA ID",
  perfect_game_id: "Perfect Game ID",
  prep_baseball_id: "Prep Baseball ID",
  twitter_handle: "Twitter Handle",
  instagram_handle: "Instagram Handle",
  tiktok_handle: "TikTok Handle",
  facebook_url: "Facebook Profile",
  phone: "Phone Number",
  email: "Email",
  allow_share_phone: "Allow Coaches to See Phone",
  allow_share_email: "Allow Coaches to See Email",
  school_name: "School Name",
  school_address: "School Address",
  school_city: "School City",
  school_state: "School State",
  ninth_grade_team: "9th Grade Team",
  ninth_grade_coach: "9th Grade Coach",
  tenth_grade_team: "10th Grade Team",
  tenth_grade_coach: "10th Grade Coach",
  eleventh_grade_team: "11th Grade Team",
  eleventh_grade_coach: "11th Grade Coach",
  twelfth_grade_team: "12th Grade Team",
  twelfth_grade_coach: "12th Grade Coach",
  travel_team_year: "Travel Team Year",
  travel_team_name: "Travel Team Name",
  travel_team_coach: "Travel Team Coach",
};

export const useProfileEditHistory = (): {
  history: Ref<FormattedHistoryEntry[]>;
  loading: Ref<boolean>;
  error: Ref<string | null>;
  fetchHistory: () => Promise<void>;
} => {
  const supabase = useSupabase();
  const userStore = useUserStore();

  const history = ref<FormattedHistoryEntry[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const fetchHistory = async () => {
    loading.value = true;
    error.value = null;

    try {
      if (!userStore.user?.id) {
        error.value = "User not authenticated";
        return;
      }

      const { data, error: fetchError } = await supabase
        .from("user_preferences")
        .select("preference_history")
        .eq("user_id", userStore.user.id)
        .single();

      if (fetchError) {
        if (fetchError.code === "PGRST116") {
          // No preferences found
          history.value = [];
          return;
        }
        throw fetchError;
      }

      if (!data?.preference_history) {
        history.value = [];
        return;
      }

      // Map history entries with formatted labels, newest first
      history.value = (data.preference_history as PreferenceHistoryEntry[])
        .map((entry) => ({
          ...entry,
          changes: entry.changes.map((change) => ({
            ...change,
            fieldLabel: FIELD_LABELS[change.field] || change.field,
          })),
        }))
        .reverse();
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Failed to load edit history";
      console.error("Error fetching edit history:", err);
    } finally {
      loading.value = false;
    }
  };

  return {
    history,
    loading,
    error,
    fetchHistory,
  };
};
