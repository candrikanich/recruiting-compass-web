import { ref, computed, toValue, onMounted, onUnmounted, type MaybeRefOrGetter, type Ref, type ComputedRef } from "vue";
import { FetchError } from "ofetch";
import { useAuthFetch } from "~/composables/useAuthFetch";
import { usePlayerProfileStore } from "~/stores/playerProfile";
import { createClientLogger } from "~/utils/logger";

const logger = createClientLogger("tracking-link");

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
  copied: Ref<boolean>;
  trackingUrl: ComputedRef<string | null>;
  fetchLink: () => Promise<void>;
  generateLink: () => Promise<void>;
  copyLink: () => Promise<void>;
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
  const copied = ref(false);
  let copyTimeout: ReturnType<typeof setTimeout> | null = null;

  const trackingUrl = computed(() => {
    if (!link.value || !profileStore.profileUrl) return null;
    const base = import.meta.client
      ? `${window.location.origin}${profileStore.profileUrl}`
      : profileStore.profileUrl;
    return `${base}?ref=${link.value.ref_token}`;
  });

  async function fetchLink(): Promise<void> {
    if (!profileStore.profile && !profileStore.loading) {
      profileStore.fetchProfile();
    }
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
        logger.error("Failed to load tracking link", err);
        loadError.value =
          err instanceof Error ? err.message : "Failed to load tracking link";
      }
    } finally {
      loading.value = false;
    }
  }

  async function copyLink(): Promise<void> {
    if (!trackingUrl.value) return;

    // Clear any existing timeout
    if (copyTimeout !== null) {
      clearTimeout(copyTimeout);
      copyTimeout = null;
    }

    try {
      // Check for browser runtime and clipboard API support
      if (typeof window !== 'undefined' && navigator && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(trackingUrl.value);
      } else {
        // Fallback: create temporary textarea and use execCommand
        const textArea = document.createElement('textarea');
        textArea.value = trackingUrl.value;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }

      copied.value = true;
      copyTimeout = setTimeout(() => {
        copied.value = false;
        copyTimeout = null;
      }, 2000);
    } catch (err) {
      console.error('Failed to copy tracking link:', err);
      // Still show copied state briefly to indicate attempt was made
      copied.value = true;
      copyTimeout = setTimeout(() => {
        copied.value = false;
        copyTimeout = null;
      }, 1000);
    }
  }

  onMounted(() => fetchLink());

  onUnmounted(() => {
    if (copyTimeout !== null) {
      clearTimeout(copyTimeout);
      copyTimeout = null;
    }
  });

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

  return { link, loading, loadError, error, copied, trackingUrl, fetchLink, generateLink, copyLink };
};
