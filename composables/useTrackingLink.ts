import { ref, computed, toValue, type MaybeRefOrGetter, type Ref, type ComputedRef } from "vue";
import { FetchError } from "ofetch";
import { useAuthFetch } from "~/composables/useAuthFetch";
import { usePlayerProfileStore } from "~/stores/playerProfile";

export interface TrackingLink {
  ref_token: string;
  view_count: number;
  last_viewed_at: string | null;
}

export interface UseTrackingLinkReturn {
  link: Ref<TrackingLink | null>;
  loading: Ref<boolean>;
  loadError: Ref<string | null>;
  error: Ref<string | null>;
  trackingUrl: ComputedRef<string | null>;
  fetchLink: () => Promise<void>;
  generateLink: () => Promise<void>;
}

export const useTrackingLink = (
  coachId: MaybeRefOrGetter<string>,
): UseTrackingLinkReturn => {
  const { $fetchAuth } = useAuthFetch();
  const profileStore = usePlayerProfileStore();

  const link = ref<TrackingLink | null>(null);
  const loading = ref(false);
  const loadError = ref<string | null>(null);
  const error = ref<string | null>(null);

  const trackingUrl = computed(() => {
    if (!link.value || !profileStore.profileUrl) return null;
    const base = import.meta.client
      ? `${window.location.origin}${profileStore.profileUrl}`
      : profileStore.profileUrl;
    return `${base}?ref=${link.value.ref_token}`;
  });

  async function fetchLink(): Promise<void> {
    const id = toValue(coachId);
    loading.value = true;
    loadError.value = null;
    try {
      const data = await $fetchAuth<TrackingLink>(
        `/api/player/profile/tracking-links/${id}`,
      );
      link.value = data;
    } catch (err) {
      if (err instanceof FetchError && err.statusCode === 404) {
        link.value = null;
      } else {
        loadError.value =
          err instanceof Error ? err.message : "Failed to load tracking link";
      }
    } finally {
      loading.value = false;
    }
  }

  async function generateLink(): Promise<void> {
    const id = toValue(coachId);
    loading.value = true;
    error.value = null;
    try {
      const data = await $fetchAuth<TrackingLink>(
        `/api/player/profile/tracking-links/${id}`,
        { method: "POST" },
      );
      link.value = data;
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Failed to generate link";
    } finally {
      loading.value = false;
    }
  }

  return { link, loading, loadError, error, trackingUrl, fetchLink, generateLink };
};
