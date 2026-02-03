/**
 * Onboarding Middleware
 * Redirects new users to onboarding page if they haven't completed assessment
 */

import { useSupabase } from "~/composables/useSupabase";
import { useAuth } from "~/composables/useAuth";

export default defineNuxtRouteMiddleware(async (to, _from) => {
  // Skip onboarding check for onboarding page itself
  if (to.path === "/onboarding" || to.path === "/login") {
    return;
  }

  try {
    const { session } = useAuth();

    // If not authenticated, skip (auth middleware will handle redirect)
    if (!session?.value?.user) {
      return;
    }

    const supabase = useSupabase();

    // Get user's onboarding status
    const { data, error } = (await supabase
      .from("users")
      .select("phase_milestone_data")
      .eq("id", session.value.user.id)
      .single()) as { data: { phase_milestone_data: any } | null; error: any };

    if (error) {
      console.error("Failed to check onboarding status:", error);
      return;
    }

    // Check if onboarding is complete
    const isOnboardingComplete =
      data?.phase_milestone_data?.onboarding_complete === true;

    // Redirect to onboarding if not complete
    if (!isOnboardingComplete) {
      return navigateTo("/onboarding");
    }
  } catch (err) {
    console.error("Onboarding middleware error:", err);
    // Don't block on error - let user continue
  }
});
