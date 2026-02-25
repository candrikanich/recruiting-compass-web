import { ref } from "vue";
import { useSupabase } from "~/composables/useSupabase";
import { useUserStore } from "~/stores/user";
import { createClientLogger } from "~/utils/logger";
import type { Database } from "~/types/database";

type RecommendationLetter =
  Database["public"]["Tables"]["recommendation_letters"]["Row"];

type LetterFormData = {
  writer_name: string;
  writer_email: string;
  writer_title: string;
  status: string;
  requested_date: string;
  due_date: string;
  received_date: string;
  relationship: string;
  schools_submitted_to: string[];
  notes: string;
};

const logger = createClientLogger("useRecommendationLetters");

export function useRecommendationLetters() {
  const supabase = useSupabase();
  const userStore = useUserStore();

  const letters = ref<RecommendationLetter[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const fetchLetters = async () => {
    if (!userStore.user?.id) return;

    loading.value = true;
    error.value = null;

    try {
      const { data, error: fetchError } = await supabase
        .from("recommendation_letters")
        .select("*")
        .eq("user_id", userStore.user.id)
        .order("requested_date", { ascending: false });

      if (fetchError) throw fetchError;
      letters.value = (data as RecommendationLetter[]) || [];
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load letters";
      error.value = message;
      logger.error("fetchLetters failed", err);
    } finally {
      loading.value = false;
    }
  };

  const saveLetter = async (
    formData: LetterFormData,
    existingId?: string | null,
  ) => {
    if (!userStore.user?.id) throw new Error("Not authenticated");

    loading.value = true;
    error.value = null;

    try {
      if (existingId) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: updateError } = await (supabase.from("recommendation_letters") as any)
          .update(formData)
          .eq("id", existingId);
        if (updateError) throw updateError;
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: insertError } = await (supabase.from("recommendation_letters") as any)
          .insert([{ ...formData, user_id: userStore.user.id }])
          .select();
        if (insertError) throw insertError;
      }

      const { data: refreshed, error: refreshError } = await supabase
        .from("recommendation_letters")
        .select("*")
        .eq("user_id", userStore.user.id)
        .order("requested_date", { ascending: false });
      if (refreshError) throw refreshError;
      letters.value = (refreshed as RecommendationLetter[]) || [];
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to save letter";
      error.value = message;
      logger.error("saveLetter failed", err);
    } finally {
      loading.value = false;
    }
  };

  const deleteLetter = async (id: string) => {
    loading.value = true;
    error.value = null;

    try {
      const { error: deleteError } = await supabase
        .from("recommendation_letters")
        .delete()
        .eq("id", id);
      if (deleteError) throw deleteError;

      await fetchLetters();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete letter";
      error.value = message;
      logger.error("deleteLetter failed", err);
    } finally {
      loading.value = false;
    }
  };

  return { letters, loading, error, fetchLetters, saveLetter, deleteLetter };
}
