import { defineStore } from "pinia";
import { ref, computed } from "vue";
import type { PlayerProfile } from "~/types/models";
import { useAuthFetch } from "~/composables/useAuthFetch";
import { createClientLogger } from "~/utils/logger";

const logger = createClientLogger("stores/playerProfile");

export const usePlayerProfileStore = defineStore("playerProfile", () => {
  const profile = ref<PlayerProfile | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const isPublished = computed(() => profile.value?.is_published ?? false);
  const profileUrl = computed(() => {
    if (!profile.value) return null;
    const slug = profile.value.vanity_slug ?? profile.value.hash_slug;
    return `/p/${slug}`;
  });

  async function fetchProfile(): Promise<void> {
    const { $fetchAuth } = useAuthFetch();
    loading.value = true;
    error.value = null;
    try {
      const data = await $fetchAuth<PlayerProfile>("/api/player/profile");
      profile.value = data;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load profile";
      logger.error("fetchProfile failed", { message });
      error.value = message;
    } finally {
      loading.value = false;
    }
  }

  async function updateProfile(updates: Partial<PlayerProfile>): Promise<void> {
    const { $fetchAuth } = useAuthFetch();
    if (profile.value) {
      profile.value = { ...profile.value, ...updates };
    }
    try {
      await $fetchAuth("/api/player/profile", { method: "PUT", body: updates });
    } catch (err) {
      logger.error("updateProfile failed, re-fetching", err);
      await fetchProfile();
      throw err;
    }
  }

  return {
    profile,
    loading,
    error,
    isPublished,
    profileUrl,
    fetchProfile,
    updateProfile,
  };
});
