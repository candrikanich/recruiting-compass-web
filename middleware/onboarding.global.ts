/**
 * Onboarding + Sport Gate Middleware (GLOBAL)
 *
 * Runs on every route. Two responsibilities:
 *   1. Redirect users who haven't finished onboarding to /onboarding.
 *   2. Safety net: force any authenticated player whose canonical
 *      `primary_sport` is null/blank to the minimal sport-pick screen,
 *      even if onboarding is already complete. Sport is required as of
 *      Phase 2 — this catches any legacy account that predates the rule.
 *
 * Fails OPEN on any error: a transient lookup failure must never lock a
 * user out of the app.
 */

import { useSupabase } from "~/composables/useSupabase";
import { useAuth } from "~/composables/useAuth";
import { createClientLogger } from "~/utils/logger";
import { getPublicRoutes } from "~/types/routes";

const logger = createClientLogger("middleware/onboarding");

const ONBOARDING_ROUTE = "/onboarding";
const SPORT_PICK_ROUTE = "/onboarding/select-sport";

// Public/landing/auth routes must never be gated. Since this middleware is now
// global it runs on these too; without the allowlist an authenticated user with
// incomplete onboarding could be bounced off the landing page or a password
// reset flow. Any path under /onboarding (index, /parent, /select-sport) is also
// exempt so the gate can't redirect-loop onto itself.
const EXEMPT_EXACT_PATHS = new Set(getPublicRoutes());

function isExemptPath(path: string): boolean {
  return path.startsWith(ONBOARDING_ROUTE) || EXEMPT_EXACT_PATHS.has(path);
}

export function shouldRedirectToOnboarding(input: {
  is_admin?: boolean | null;
  onboarding_complete?: boolean | null;
}): boolean {
  if (input.is_admin === true) return false;
  return input.onboarding_complete !== true;
}

/**
 * Whether the authenticated user must be sent to the sport-pick screen.
 * - Admins are never gated.
 * - Parents are never gated here: their player-owned `primary_sport` lives on
 *   the linked athlete's preference row, not their own, so their own blank
 *   value is expected and not actionable.
 * - Empty string is treated as unset, same as null/undefined.
 */
export function needsSportSelection(input: {
  is_admin?: boolean | null;
  role?: string | null;
  primary_sport?: unknown;
}): boolean {
  if (input.is_admin === true) return false;
  if (input.role === "parent") return false;
  const sport = input.primary_sport;
  return typeof sport !== "string" || sport.trim() === "";
}

export default defineNuxtRouteMiddleware(async (to, _from) => {
  // Never gate onboarding, auth, or public/landing routes.
  if (isExemptPath(to.path)) {
    return;
  }

  try {
    const { session } = useAuth();

    // If not authenticated, skip (auth middleware handles the redirect).
    if (!session?.value?.user) {
      return;
    }

    const supabase = useSupabase();

    // Onboarding status + role, in one users lookup.
    const { data, error } = (await supabase
      .from("users")
      .select("phase_milestone_data, is_admin, role")
      .eq("id", session.value.user.id)
      .single()) as {
      data: {
        phase_milestone_data: { onboarding_complete?: boolean } | null;
        is_admin: boolean | null;
        role: string | null;
      } | null;
      error: unknown;
    };

    if (error) {
      logger.error("Failed to check onboarding status", error);
      return;
    }

    // Phase-milestone onboarding redirect (unchanged behavior).
    if (
      shouldRedirectToOnboarding({
        is_admin: data?.is_admin,
        onboarding_complete: data?.phase_milestone_data?.onboarding_complete,
      })
    ) {
      return navigateTo(ONBOARDING_ROUTE);
    }

    // Onboarding is complete — sport-gate safety net for players only.
    // Skip the extra lookup entirely for admins and parents.
    if (data?.is_admin === true || data?.role === "parent") {
      return;
    }

    const { data: playerRow, error: playerError } = (await supabase
      .from("user_preferences")
      .select("data")
      .eq("user_id", session.value.user.id)
      .eq("category", "player")
      .maybeSingle()) as {
      data: { data: { primary_sport?: unknown } | null } | null;
      error: unknown;
    };

    if (playerError) {
      logger.error("Failed to check primary_sport", playerError);
      return;
    }

    if (
      needsSportSelection({
        is_admin: data?.is_admin,
        role: data?.role,
        primary_sport: playerRow?.data?.primary_sport,
      })
    ) {
      return navigateTo(SPORT_PICK_ROUTE);
    }
  } catch (err) {
    logger.error("Onboarding middleware error", err);
    // Don't block on error - let user continue (fail open).
  }
});
