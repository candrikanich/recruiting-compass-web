import { ref } from "vue";
import { useSupabase } from "./useSupabase";
import { createClientLogger } from "~/utils/logger";
import { calculateProfileCompleteness } from "~/utils/profileCompletenessCalculation";
import { usePreferenceManager } from "./usePreferenceManager";

export interface ContextualPrompt {
  id: string;
  message: string;
  action?: string;
  priority: "high" | "medium" | "low";
}

export interface DismissedPrompt {
  id: string;
  dismissed_until: string;
}

/**
 * Composable for managing profile completeness calculation and prompts
 *
 * Calculates profile completeness percentage based on user data,
 * determines contextual prompts, and manages dismissal cooldowns.
 *
 * @example
 * const { completeness, updateCompleteness, getNextPrompt } = useProfileCompleteness()
 * await updateCompleteness()
 * const prompt = await getNextPrompt()
 * await dismissPrompt('gpa', 7) // Dismiss for 7 days
 */
const logger = createClientLogger("useProfileCompleteness");

export const useProfileCompleteness = () => {
  const supabase = useSupabase();
  const completeness = ref(0);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Defined prompts that can be shown to users
  const AVAILABLE_PROMPTS: ContextualPrompt[] = [
    {
      id: "gpa",
      message: "Add your GPA for better fit scores from colleges",
      action: "settings",
      priority: "medium",
    },
    {
      id: "test_scores",
      message: "Add your SAT or ACT scores to improve visibility",
      action: "settings",
      priority: "medium",
    },
    {
      id: "highlight_video",
      message: "Upload a highlight video to showcase your athletic abilities",
      action: "profile",
      priority: "high",
    },
  ];

  /**
   * Update profile completeness based on saved player preferences
   */
  const updateCompleteness = async (): Promise<void> => {
    loading.value = true;
    error.value = null;

    try {
      const { loadAllPreferences, getPlayerDetails } = usePreferenceManager();
      await loadAllPreferences();
      const details = getPlayerDetails();
      completeness.value = details ? calculateProfileCompleteness(details) : 0;
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to calculate profile completeness";
      error.value = message;
      logger.error("Profile completeness error:", err);
    } finally {
      loading.value = false;
    }
  };

  /**
   * Get next contextual prompt based on missing data
   * Returns null if all prompts dismissed or profile complete
   */
  const getNextPrompt = async (): Promise<ContextualPrompt | null> => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        return null;
      }

      // Fetch dismissed prompts from localStorage
      let dismissedPrompts: DismissedPrompt[] = [];
      if (typeof window !== "undefined") {
        const key = `dismissed_prompts_${session.user.id}`;
        const stored = localStorage.getItem(key);
        if (stored) {
          try {
            dismissedPrompts = JSON.parse(stored);
          } catch (e) {
            logger.error("Failed to parse stored dismissed prompts:", e);
            dismissedPrompts = [];
          }
        }
      }

      const now = new Date();

      // Filter out dismissed prompts that are still in cooldown
      const availablePrompts = AVAILABLE_PROMPTS.filter((prompt) => {
        const dismissed = dismissedPrompts.find((d) => d.id === prompt.id);
        if (!dismissed) return true;

        const dismissedUntil = new Date(dismissed.dismissed_until);
        return now > dismissedUntil;
      });

      // For now, return the first available prompt
      // In future, could add logic to select based on user data
      return availablePrompts.length > 0 ? availablePrompts[0] : null;
    } catch (err) {
      logger.error("Error getting next prompt:", err);
      return null;
    }
  };

  /**
   * Dismiss a prompt with optional cooldown duration (in days)
   * Stored in localStorage for client-side persistence
   */
  const dismissPrompt = async (
    promptId: string,
    durationDays: number = 7,
  ): Promise<void> => {
    loading.value = true;
    error.value = null;

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        throw new Error("Not authenticated");
      }

      const dismissedUntil = new Date(
        Date.now() + durationDays * 24 * 60 * 60 * 1000,
      ).toISOString();

      // Store in localStorage
      if (typeof window !== "undefined") {
        const key = `dismissed_prompts_${session.user.id}`;
        const stored = localStorage.getItem(key);
        let dismissed: DismissedPrompt[] = [];

        if (stored) {
          try {
            dismissed = JSON.parse(stored);
          } catch (e) {
            logger.error("Failed to parse stored dismissed prompts:", e);
            dismissed = [];
          }
        }

        // Update dismissed prompts list
        const updated = [
          ...dismissed.filter((d) => d.id !== promptId),
          { id: promptId, dismissed_until: dismissedUntil },
        ];

        localStorage.setItem(key, JSON.stringify(updated));
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to dismiss prompt";
      error.value = message;
      logger.error("Prompt dismiss error:", err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  return {
    // State
    completeness,
    loading,
    error,

    // Actions
    updateCompleteness,
    getNextPrompt,
    dismissPrompt,
  };
};
