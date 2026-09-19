import { useSupabaseAdmin } from "~/server/utils/supabase";
import { calculateCurrentGrade, gradeToPhase } from "~/utils/gradeHelpers";

/**
 * Stamp the same phase_milestone_data.onboarding_complete flag the onboarding
 * wizard itself sets (see useOnboarding.completeOnboarding) — the global
 * onboarding middleware gates every route on this flag, so any server path that
 * skips the wizard client-side must set it here or strand the user in a
 * redirect loop back to /onboarding.
 */
export async function markOnboardingComplete(
  supabase: ReturnType<typeof useSupabaseAdmin>,
  userId: string,
  graduationYear?: number,
): Promise<void> {
  const currentPhase = graduationYear
    ? gradeToPhase(calculateCurrentGrade(graduationYear))
    : "freshman";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("users") as any)
    .update({
      current_phase: currentPhase,
      phase_milestone_data: {
        onboarding_complete: true,
        onboarding_completed_at: new Date().toISOString(),
      },
    })
    .eq("id", userId);

  if (error) {
    throw error;
  }
}
