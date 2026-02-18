/**
 * GET /api/admin/users
 * Fetches all users in the system
 *
 * Requires: Authentication header with valid JWT and is_admin: true
 * RESTRICTED: Admins only
 *
 * Response: { users: User[] }
 *
 * This endpoint uses the service role to bypass RLS and fetch all users
 */

import { defineEventHandler, createError } from "h3";
import { requireAuth } from "~/server/utils/auth";
import { useSupabaseAdmin } from "~/server/utils/supabase";
import { useLogger } from "~/server/utils/logger";

interface User {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  is_admin: boolean;
  created_at?: string;
}

interface GetUsersResponse {
  users: User[];
}

export default defineEventHandler(async (event): Promise<GetUsersResponse> => {
  const logger = useLogger(event, "admin/users");
  try {
    // Verify user is authenticated
    const user = await requireAuth(event);

    // Create admin client with service role
    const supabaseAdmin = useSupabaseAdmin();

    const { data: adminCheck } = await supabaseAdmin
      .from("users")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!adminCheck?.is_admin) {
      logger.warn(`Non-admin user ${user.id} attempted to fetch all users`);
      throw createError({
        statusCode: 403,
        statusMessage: "Only administrators can view all users",
      });
    }

    // Fetch all users, ordered by creation date (newest first)
    const { data: users, error: fetchError } = await supabaseAdmin
      .from("users")
      .select("id, email, full_name, role, is_admin, created_at")
      .order("created_at", { ascending: false });

    if (fetchError) {
      logger.error("Failed to fetch users", fetchError);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to fetch users",
      });
    }

    const userCount = users?.length || 0;
    logger.info(`Admin ${user.id} fetched all users (${userCount} total)`);
    logger.info(`Fetched ${userCount} users from database`);

    return {
      users: (users || []) as User[],
    };
  } catch (error) {
    logger.error("Get users endpoint failed", error);

    if (error instanceof Error && "statusCode" in error) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      statusMessage: "Failed to fetch users",
    });
  }
});
