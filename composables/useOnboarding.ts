/**
 * useOnboarding Composable
 * Handles late joiner assessment and onboarding flow
 */

import { ref } from "vue";
import { useSupabase } from "./useSupabase";
import { useAuthFetch } from "~/composables/useAuthFetch";
import { createClientLogger } from "~/utils/logger";

const logger = createClientLogger("useOnboarding");

export interface OnboardingAssessment {
  hasHighlightVideo: boolean;
  hasContactedCoaches: boolean;
  hasTargetSchools: boolean;
  hasRegisteredEligibility: boolean;
  hasTakenTestScores: boolean;
}

export interface OnboardingResult {
  assessment: OnboardingAssessment;
  completedTaskIds: string[];
  phase: "freshman" | "sophomore" | "junior" | "senior";
}

/**
 * Task IDs to auto-complete based on onboarding responses
 * Maps question answers to task IDs from the curriculum
 */
const ONBOARDING_TASK_MAPPING = {
  hasHighlightVideo: ["task-10-r1"], // Create highlight video
  hasContactedCoaches: ["task-10-r3", "task-10-r5", "task-11-r1"], // Coach outreach tasks
  hasTargetSchools: ["task-10-r3"], // Build initial college list
  hasRegisteredEligibility: ["task-11-a1"], // Register with eligibility center
  hasTakenTestScores: ["task-9-a1", "task-10-a2"], // Test score tasks
};

export const useOnboarding = () => {
  const supabase = useSupabase();
  const { $fetchAuth } = useAuthFetch();
  const loading = ref(false);
  const error = ref<string | null>(null);
  const isOnboardingComplete = ref(false);
  const currentStep = ref(0);
  const onboardingData = ref<Record<string, unknown>>({});

  /**
   * Determine appropriate starting phase based on assessment
   */
  const calculateStartingPhase = (
    assessment: OnboardingAssessment,
  ): "freshman" | "sophomore" | "junior" => {
    if (assessment.hasRegisteredEligibility || assessment.hasTakenTestScores) {
      return "junior";
    }
    if (assessment.hasHighlightVideo && assessment.hasTargetSchools) {
      return "sophomore";
    }
    return "freshman";
  };

  /**
   * Get list of task IDs to auto-complete based on assessment
   */
  const getTasksToComplete = (assessment: OnboardingAssessment): string[] => {
    const tasks = new Set<string>();

    if (assessment.hasHighlightVideo) {
      ONBOARDING_TASK_MAPPING.hasHighlightVideo.forEach((t) => tasks.add(t));
    }
    if (assessment.hasContactedCoaches) {
      ONBOARDING_TASK_MAPPING.hasContactedCoaches.forEach((t) => tasks.add(t));
    }
    if (assessment.hasTargetSchools) {
      ONBOARDING_TASK_MAPPING.hasTargetSchools.forEach((t) => tasks.add(t));
    }
    if (assessment.hasRegisteredEligibility) {
      ONBOARDING_TASK_MAPPING.hasRegisteredEligibility.forEach((t) =>
        tasks.add(t),
      );
    }
    if (assessment.hasTakenTestScores) {
      ONBOARDING_TASK_MAPPING.hasTakenTestScores.forEach((t) => tasks.add(t));
    }

    return Array.from(tasks);
  };

  /**
   * Complete the onboarding flow
   * 1. Auto-complete tasks based on assessment
   * 2. Update user phase
   * 3. Mark onboarding as complete
   */
  const completeOnboarding = async (
    assessment: OnboardingAssessment,
  ): Promise<OnboardingResult> => {
    loading.value = true;
    error.value = null;

    try {
      // Get current user
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        throw new Error("Not authenticated");
      }

      const userId = session.user.id;
      const tasksToComplete = getTasksToComplete(assessment);
      const startingPhase = calculateStartingPhase(assessment);

      // Auto-complete tasks
      if (tasksToComplete.length > 0) {
        const taskErrors: string[] = [];
        for (const taskId of tasksToComplete) {
          try {
            await $fetchAuth(`/api/athlete-tasks/${taskId}`, {
              method: "PATCH",
              body: { status: "completed" },
            });
          } catch (err) {
            logger.error(`Failed to complete task ${taskId}:`, err);
            taskErrors.push(taskId);
          }
        }
        if (taskErrors.length > 0) {
          throw new Error(`Failed to complete ${taskErrors.length} task(s). Please try again.`);
        }
      }

      // Update user phase and mark onboarding complete
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: updateError } = (await (supabase.from("users") as any)
        .update({
          current_phase: startingPhase,
          phase_milestone_data: {
            onboarding_complete: true,
            onboarding_completed_at: new Date().toISOString(),
            assessment_responses: assessment,
          },
        })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .eq("id", userId)) as { error: any };

      if (updateError) {
        throw updateError;
      }

      isOnboardingComplete.value = true;

      return {
        assessment,
        completedTaskIds: tasksToComplete,
        phase: startingPhase,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Onboarding failed";
      error.value = message;
      logger.error("Onboarding error:", err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Check if user has completed onboarding
   */
  const checkOnboardingStatus = async (userId?: string): Promise<boolean> => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const id = userId || session?.user?.id;

      if (!id) {
        return false;
      }

      const { data, error } = (await supabase
        .from("users")
        .select("phase_milestone_data")
        .eq("id", id)
        .single()) as {
        data: {
          phase_milestone_data?: { onboarding_complete?: boolean };
        } | null;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        error: any;
      };

      if (error) {
        logger.error("Failed to check onboarding status:", error);
        return false;
      }

      const isComplete =
        data?.phase_milestone_data?.onboarding_complete === true;
      isOnboardingComplete.value = isComplete;
      return isComplete;
    } catch (err) {
      logger.error("Error checking onboarding status:", err);
      return false;
    }
  };

  /**
   * Save onboarding step data
   * Persists step data to local state and localStorage for recovery if interrupted
   */
  const saveOnboardingStep = async (
    step: number,
    data: Record<string, unknown>,
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

      // Update local tracking
      currentStep.value = step;
      onboardingData.value = { ...onboardingData.value, ...data };

      // Persist to localStorage for recovery
      if (typeof window !== "undefined") {
        localStorage.setItem(
          `onboarding_progress_${session.user.id}`,
          JSON.stringify({
            current_step: step,
            step_data: onboardingData.value,
            updated_at: new Date().toISOString(),
          }),
        );
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to save onboarding step";
      error.value = message;
      logger.error("Onboarding step save error:", err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Get onboarding progress as percentage (0-100)
   * Based on completed steps tracked in state
   */
  const getOnboardingProgress = async (): Promise<number> => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        return 0;
      }

      // Try to restore from localStorage
      let currentStep = 0;
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem(
          `onboarding_progress_${session.user.id}`,
        );
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            currentStep = parsed.current_step || 0;
          } catch (e) {
            logger.error("Failed to parse stored onboarding progress:", e);
          }
        }
      }

      // 5 total onboarding screens (1-5)
      const totalSteps = 5;
      const progress = Math.min(
        100,
        Math.round((currentStep / totalSteps) * 100),
      );
      return progress;
    } catch (err) {
      logger.error("Error getting onboarding progress:", err);
      return 0;
    }
  };

  return {
    loading,
    error,
    isOnboardingComplete,
    currentStep,
    onboardingData,
    completeOnboarding,
    checkOnboardingStatus,
    calculateStartingPhase,
    getTasksToComplete,
    saveOnboardingStep,
    getOnboardingProgress,
  };
};
