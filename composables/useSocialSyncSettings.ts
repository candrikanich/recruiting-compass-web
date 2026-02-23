import { ref } from "vue";
import { useSupabase } from "~/composables/useSupabase";
import { useUserStore } from "~/stores/user";
import { createClientLogger } from "~/utils/logger";

const logger = createClientLogger("useSocialSyncSettings");

export function useSocialSyncSettings() {
  const supabase = useSupabase();
  const userStore = useUserStore();

  const autoSyncEnabled = ref(true);
  const notifyOnRecruitingPosts = ref(false);
  const notifyOnMentions = ref(false);
  const lastSyncTime = ref<string | null>(null);
  const saving = ref(false);

  const loadSettings = async () => {
    if (!userStore.user?.id) return;

    try {
      const { data } = await supabase
        .from("user_preferences")
        .select("social_sync_settings")
        .eq("user_id", userStore.user.id)
        .single();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const settings = (data as any)?.social_sync_settings;
      if (settings) {
        autoSyncEnabled.value = settings.autoSyncEnabled ?? true;
        notifyOnRecruitingPosts.value = settings.notifyOnRecruitingPosts ?? false;
        notifyOnMentions.value = settings.notifyOnMentions ?? false;
        lastSyncTime.value = settings.lastSyncTime ?? null;
      }
    } catch (err) {
      logger.error("loadSettings failed", err);
    }
  };

  const saveSettings = async (): Promise<{ success: boolean }> => {
    if (!userStore.user?.id) return { success: false };

    saving.value = true;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from("user_preferences") as any)
        .update({
          social_sync_settings: {
            autoSyncEnabled: autoSyncEnabled.value,
            notifyOnRecruitingPosts: notifyOnRecruitingPosts.value,
            notifyOnMentions: notifyOnMentions.value,
            lastSyncTime: lastSyncTime.value,
          },
        })
        .eq("user_id", userStore.user.id);

      if (error) throw error;
      return { success: true };
    } catch (err) {
      logger.error("saveSettings failed", err);
      return { success: false };
    } finally {
      saving.value = false;
    }
  };

  return {
    autoSyncEnabled,
    notifyOnRecruitingPosts,
    notifyOnMentions,
    lastSyncTime,
    saving,
    loadSettings,
    saveSettings,
  };
}
