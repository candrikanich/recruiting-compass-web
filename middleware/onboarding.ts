/**
 * Onboarding Middleware
 * Redirects new users to onboarding page if they haven't completed assessment
 */

import { useSupabase } from "~/composables/useSupabase";
import { useAuth } from "~/composables/useAuth";
import { createClientLogger } from "~/utils/logger";

const logger = createClientLogger("middleware/onboarding");

export function shouldRedirectToOnboarding(input: {
  is_admin?: boolean | null;
  onboarding_complete?: boolean | null;
}): boolean {
  if (input.is_admin === true) return false;
  return input.onboarding_complete !== true;
}

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
      .select("phase_milestone_data, is_admin")
      .eq("id", session.value.user.id)
      .single()) as {
      data: { phase_milestone_data: { onboarding_complete?: boolean } | null; is_admin: boolean | null } | null;
      error: unknown;
    };

    if (error) {
      logger.error("Failed to check onboarding status", error);
      return;
    }

    if (
      shouldRedirectToOnboarding({
        is_admin: data?.is_admin,
        onboarding_complete: data?.phase_milestone_data?.onboarding_complete,
      })
    ) {
      return navigateTo("/onboarding");
    }
  } catch (err) {
    logger.error("Onboarding middleware error", err);
    // Don't block on error - let user continue
  }
});
