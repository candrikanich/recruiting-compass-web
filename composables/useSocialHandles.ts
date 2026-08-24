import type { Ref } from "vue";
import { useAppToast } from "~/composables/useAppToast";
import { normalizeHandle } from "~/utils/social";
import { SOCIAL_PLATFORMS } from "~/utils/playerDetails/formOptions";
import type { PlayerDetails } from "~/types/models";

/**
 * Social-handle blur normalization for the player-details form. On blur, strips a
 * pasted handle/URL down to the bare username (per platform), writes it back to
 * the form, warns when a short link was pasted, and autosaves. facebook_url has
 * no platform normalizer → left as-is. Extracted from usePlayerDetailsForm.
 */
export function useSocialHandles(
  form: Ref<PlayerDetails>,
  triggerSave: () => void,
) {
  const { showToast } = useAppToast();

  const handleSocialBlur = (key: string, value: string): void => {
    const platform = SOCIAL_PLATFORMS[key];
    if (!platform) return;

    const { handle, isShortUrl } = normalizeHandle(value, platform);
    (form.value as Record<string, unknown>)[key] = handle;

    if (isShortUrl) {
      showToast(
        "Short links can't be used as handles — enter your username directly.",
        "warning",
      );
    }

    triggerSave();
  };

  return { handleSocialBlur };
}
