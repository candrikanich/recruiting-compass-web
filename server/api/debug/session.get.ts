/**
 * Debug endpoint to check session and user data
 * Helps diagnose why QA shows no data vs Production
 *
 * GET /api/debug/session
 * Returns detailed session info including:
 * - User authentication status
 * - family_unit_id presence
 * - Sample data queries with counts
 */

import { defineEventHandler, getHeader, getCookie, createError } from "h3";
import { requireAuth } from "~/server/utils/auth";
import { createServerSupabaseClient } from "~/server/utils/supabase";
import { useLogger } from "~/server/utils/logger";

export default defineEventHandler(async (event) => {
  if (process.env.NODE_ENV === "production") {
    throw createError({ statusCode: 404, statusMessage: "Not found" });
  }

  const logger = useLogger(event, "debug/session");
  try {
    // Verify user is authenticated
    const user = await requireAuth(event);
    const userId = user.id;

    // Use admin client to check raw database state
    const supabase = createServerSupabaseClient();

    // family_unit_id lives in family_members now, not user_metadata (that
    // was the pre-family_members account_links model). A user can belong
    // to more than one family (multi-family parent support).
    const { data: memberships, error: membershipsError } = await supabase
      .from("family_members")
      .select("family_unit_id")
      .eq("user_id", userId);

    const familyUnitIds = (memberships ?? []).map((m) => m.family_unit_id);

    // Only run the dependent queries when membership resolution actually
    // succeeded and returned at least one family -- an empty familyUnitIds
    // from a failed membership lookup shouldn't masquerade as "no family".
    const canQueryFamilyData = !membershipsError && familyUnitIds.length > 0;

    const { data: schools, error: schoolsError } = canQueryFamilyData
      ? await supabase
          .from("schools")
          .select("id, name")
          .in("family_unit_id", familyUnitIds)
      : { data: [] as { id: string; name: string }[], error: null };

    const { data: coaches, error: coachesError } = canQueryFamilyData
      ? await supabase
          .from("coaches")
          .select("id, first_name, last_name")
          .in("family_unit_id", familyUnitIds)
      : {
          data: [] as { id: string; first_name: string; last_name: string }[],
          error: null,
        };

    const { data: interactions, error: interactionsError } =
      canQueryFamilyData
        ? await supabase
            .from("interactions")
            .select("id, type")
            .in("family_unit_id", familyUnitIds)
        : { data: [] as { id: string; type: string }[], error: null };

    // Check request headers/cookies
    const authHeader = getHeader(event, "authorization");
    const cookieToken = getCookie(event, "sb-access-token");

    return {
      authenticated: true,
      user: {
        id: userId,
        email: user.email,
        family_unit_ids: familyUnitIds,
      },
      auth_sources: {
        has_auth_header: !!authHeader,
        has_cookie: !!cookieToken,
      },
      queries: {
        family_members: {
          error: membershipsError?.message || null,
        },
        schools: {
          count: schools?.length || 0,
          error: schoolsError?.message || null,
          sample: schools?.[0] || null,
        },
        coaches: {
          count: coaches?.length || 0,
          error: coachesError?.message || null,
          sample: coaches?.[0] || null,
        },
        interactions: {
          count: interactions?.length || 0,
          error: interactionsError?.message || null,
          sample: interactions?.[0] || null,
        },
      },
      diagnosis: membershipsError
        ? {
            has_family_membership: null,
            family_unit_ids_value: "⚠️ UNKNOWN (membership lookup failed)",
            likely_issue: `family_members query failed: ${membershipsError.message} - membership status could not be determined`,
            recommendation:
              "Check the family_members query error above; this is not necessarily a missing-family case.",
          }
        : {
            has_family_membership: familyUnitIds.length > 0,
            family_unit_ids_value:
              familyUnitIds.length > 0 ? familyUnitIds : "❌ MISSING",
            likely_issue:
              familyUnitIds.length > 0
                ? "family_unit_id present but queries return no data - check RLS policies or data existence"
                : "❌ CRITICAL: user has no family_members row - this causes all queries to return empty",
            recommendation:
              familyUnitIds.length > 0
                ? "Check database for records with this family_unit_id"
                : "User signup/family creation may have failed. Check family_members and family_units tables.",
          },
    };
  } catch (error) {
    logger.warn("Debug session check failed", error);
    return {
      error: true,
      message: "Session check failed",
      authenticated: false,
    };
  }
});
