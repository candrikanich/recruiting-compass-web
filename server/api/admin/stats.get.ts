/**
 * GET /api/admin/stats
 * Returns key counts for admin overview (users, schools, coaches, interactions, family_units).
 * Requires: Authentication + is_admin.
 */

import { defineEventHandler, createError } from "h3";
import { requireAuth } from "~/server/utils/auth";
import { useSupabaseAdmin } from "~/server/utils/supabase";
import { createLogger } from "~/server/utils/logger";

const logger = createLogger("admin/stats");

export interface AdminStatsResponse {
  users: number;
  schools: number;
  coaches: number;
  interactions: number;
  family_units: number;
}

export default defineEventHandler(
  async (event): Promise<AdminStatsResponse> => {
    try {
      const user = await requireAuth(event);
      const supabaseAdmin = useSupabaseAdmin();

      const { data: adminCheck } = await supabaseAdmin
        .from("users")
        .select("is_admin")
        .eq("id", user.id)
        .single();

      if (!adminCheck?.is_admin) {
        logger.warn(`Non-admin user ${user.id} attempted to fetch stats`);
        throw createError({
          statusCode: 403,
          statusMessage: "Only administrators can view stats",
        });
      }

      const [usersRes, schoolsRes, coachesRes, interactionsRes, familyRes] =
        await Promise.all([
          supabaseAdmin
            .from("users")
            .select("*", { count: "exact", head: true }),
          supabaseAdmin
            .from("schools")
            .select("*", { count: "exact", head: true }),
          supabaseAdmin
            .from("coaches")
            .select("*", { count: "exact", head: true }),
          supabaseAdmin
            .from("interactions")
            .select("*", { count: "exact", head: true }),
          supabaseAdmin
            .from("family_units")
            .select("*", { count: "exact", head: true }),
        ]);

      return {
        users: usersRes.count ?? 0,
        schools: schoolsRes.count ?? 0,
        coaches: coachesRes.count ?? 0,
        interactions: interactionsRes.count ?? 0,
        family_units: familyRes.count ?? 0,
      };
    } catch (error) {
      logger.error("Admin stats endpoint failed", error);
      if (error instanceof Error && "statusCode" in error) {
        throw error;
      }
      throw createError({
        statusCode: 500,
        statusMessage:
          error instanceof Error ? error.message : "Failed to fetch stats",
      });
    }
  },
);
