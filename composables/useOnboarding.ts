/**
 * useOnboarding Composable
 * Handles late joiner assessment and onboarding flow
 */

import { ref } from "vue";
import { useSupabase } from "./useSupabase";

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
  const loading = ref(false);
  const error = ref<string | null>(null);
  const isOnboardingComplete = ref(false);

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
        for (const taskId of tasksToComplete) {
          try {
            await $fetch(`/api/athlete-tasks/${taskId}`, {
              method: "PATCH",
              body: { status: "completed" },
            });
          } catch (err) {
            // Log error but continue - task might not exist for this user
            console.error(`Failed to complete task ${taskId}:`, err);
          }
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
      console.error("Onboarding error:", err);
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
        console.error("Failed to check onboarding status:", error);
        return false;
      }

      const isComplete =
        data?.phase_milestone_data?.onboarding_complete === true;
      isOnboardingComplete.value = isComplete;
      return isComplete;
    } catch (err) {
      console.error("Error checking onboarding status:", err);
      return false;
    }
  };

  return {
    loading,
    error,
    isOnboardingComplete,
    completeOnboarding,
    checkOnboardingStatus,
    calculateStartingPhase,
    getTasksToComplete,
  };
};
