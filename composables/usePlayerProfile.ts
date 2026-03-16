import { computed, onMounted } from "vue";
import { usePlayerProfileStore } from "~/stores/playerProfile";
import type { PlayerProfile } from "~/types/models";

export const usePlayerProfile = () => {
  const store = usePlayerProfileStore();

  const profile = computed(() => store.profile);
  const loading = computed(() => store.loading);
  const error = computed(() => store.error);
  const isPublished = computed(() => store.isPublished);

  /** Full absolute URL for sharing (uses current origin in browser, relative on server) */
  const publicUrl = computed(() => {
    if (!store.profileUrl) return null;
    if (import.meta.client) {
      return `${window.location.origin}${store.profileUrl}`;
    }
    return store.profileUrl;
  });

  const fetchProfile = (): Promise<void> => store.fetchProfile();
  const updateProfile = (updates: Partial<PlayerProfile>): Promise<void> =>
    store.updateProfile(updates);

  onMounted(() => {
    if (!store.profile && !store.loading) {
      fetchProfile();
    }
  });

  return {
    profile,
    loading,
    error,
    isPublished,
    publicUrl,
    fetchProfile,
    updateProfile,
  };
};
