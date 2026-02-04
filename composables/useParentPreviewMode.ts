import { ref } from "vue";
import { useSupabase } from "./useSupabase";

/**
 * Composable for managing preview mode for parents
 *
 * Allows parents to preview a demo player profile before linking to a real player.
 * Handles entering preview mode, loading demo data, and exiting to link real profiles.
 *
 * @example
 * const { enterPreviewMode, exitPreviewMode, isInPreviewMode } = useParentPreviewMode()
 * await enterPreviewMode('demo-profile-id')
 * const isPreview = isInPreviewMode()
 * await exitPreviewMode('real-player-id')
 */
export const useParentPreviewMode = () => {
  const supabase = useSupabase();

  const isPreviewMode = ref(false);
  const demoProfile = ref<Record<string, unknown> | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  /**
   * Enter preview mode and load demo profile data
   * @param demoProfileId - ID of the demo player profile to load
   */
  const enterPreviewMode = async (demoProfileId: string): Promise<void> => {
    loading.value = true;
    error.value = null;

    try {
      // Verify parent is authenticated
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        throw new Error("Not authenticated");
      }

      // Load demo profile data
      const { data, error: profileError } = (await supabase
        .from("users")
        .select("*")
        .eq("id", demoProfileId)
        .single()) as {
        data: Record<string, unknown> | null;
        error: unknown;
      };

      if (profileError || !data) {
        throw profileError || new Error("Demo profile not found");
      }

      // Update state
      demoProfile.value = data;
      isPreviewMode.value = true;

      // Persist to localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem("preview_mode", "true");
        localStorage.setItem("demo_profile_id", demoProfileId);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to enter preview mode";
      error.value = message;
      console.error("Preview mode entry error:", err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Exit preview mode and link to real player profile
   * @param realPlayerProfileId - ID of the real player profile to link
   */
  const exitPreviewMode = async (
    realPlayerProfileId: string,
  ): Promise<void> => {
    loading.value = true;
    error.value = null;

    try {
      // Verify parent is authenticated
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        throw new Error("Not authenticated");
      }

      // Load real player profile
      const { data: realProfile, error: profileError } = (await supabase
        .from("users")
        .select("*")
        .eq("id", realPlayerProfileId)
        .single()) as {
        data: Record<string, unknown> | null;
        error: unknown;
      };

      if (profileError || !realProfile) {
        throw profileError || new Error("Player profile not found");
      }

      // Clear preview state
      demoProfile.value = null;
      isPreviewMode.value = false;

      // Clear from localStorage
      if (typeof window !== "undefined") {
        localStorage.removeItem("preview_mode");
        localStorage.removeItem("demo_profile_id");
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to exit preview mode";
      error.value = message;
      console.error("Preview mode exit error:", err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Check if currently in preview mode
   */
  const isInPreviewMode = (): boolean => {
    return isPreviewMode.value;
  };

  /**
   * Get demo profile data (or null if not in preview mode)
   */
  const getDemoProfileData = (): Record<string, unknown> | null => {
    if (!isInPreviewMode()) {
      return null;
    }
    return demoProfile.value;
  };

  return {
    // State
    isPreviewMode,
    demoProfile,
    loading,
    error,

    // Actions
    enterPreviewMode,
    exitPreviewMode,
    isInPreviewMode,
    getDemoProfileData,
  };
};
