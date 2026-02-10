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

import { defineEventHandler, getHeader, getCookie } from "h3";
import { requireAuth } from "~/server/utils/auth";
import { createServerSupabaseClient } from "~/server/utils/supabase";

export default defineEventHandler(async (event) => {
  try {
    // Verify user is authenticated
    const user = await requireAuth(event);

    // Get user metadata
    const userId = user.id;
    const familyUnitId = user.user_metadata?.family_unit_id as
      | string
      | undefined;

    // Use admin client to check raw database state
    const supabase = createServerSupabaseClient();

    // Try to fetch data with family_unit_id filter
    const { data: schools, error: schoolsError } = await supabase
      .from("schools")
      .select("id, name")
      .eq("family_unit_id", familyUnitId || "");

    const { data: coaches, error: coachesError } = await supabase
      .from("coaches")
      .select("id, first_name, last_name")
      .eq("family_unit_id", familyUnitId || "");

    const { data: interactions, error: interactionsError } = await supabase
      .from("interactions")
      .select("id, type")
      .eq("family_unit_id", familyUnitId || "");

    // Check request headers/cookies
    const authHeader = getHeader(event, "authorization");
    const cookieToken = getCookie(event, "sb-access-token");

    return {
      authenticated: true,
      user: {
        id: userId,
        email: user.email,
        family_unit_id: familyUnitId,
        metadata: user.user_metadata,
      },
      auth_sources: {
        has_auth_header: !!authHeader,
        has_cookie: !!cookieToken,
      },
      queries: {
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
      diagnosis: {
        has_family_unit_id: !!familyUnitId,
        family_unit_id_value: familyUnitId || "❌ MISSING",
        likely_issue: familyUnitId
          ? "family_unit_id present but queries return no data - check RLS policies or data existence"
          : "❌ CRITICAL: family_unit_id is missing from user.user_metadata - this causes all queries to return empty",
        recommendation: familyUnitId
          ? "Check database for records with this family_unit_id"
          : "User signup may have failed to set family_unit_id. Check users table and signup logic.",
      },
    };
  } catch (error) {
    return {
      error: true,
      message: error instanceof Error ? error.message : "Unknown error",
      authenticated: false,
    };
  }
});
