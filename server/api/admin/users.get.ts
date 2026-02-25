/**
 * GET /api/admin/users
 * Fetches users in the system with pagination
 *
 * Query params:
 *   limit  - users per page (default: 50, max: 100)
 *   offset - users to skip (default: 0)
 *
 * Requires: Authentication header with valid JWT and is_admin: true
 * RESTRICTED: Admins only
 *
 * Response: { users: User[], total: number, limit: number, offset: number }
 */

import { defineEventHandler, createError, getQuery } from "h3";
import { requireAdmin } from "~/server/utils/auth";
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
  total: number;
  limit: number;
  offset: number;
}

export default defineEventHandler(async (event): Promise<GetUsersResponse> => {
  const logger = useLogger(event, "admin/users");
  try {
    const user = await requireAdmin(event);
    const supabaseAdmin = useSupabaseAdmin();

    const query = getQuery(event);
    const limit = Math.min(parseInt(String(query.limit ?? "50"), 10) || 50, 100);
    const offset = Math.max(parseInt(String(query.offset ?? "0"), 10) || 0, 0);

    const { data: users, error: fetchError, count } = await supabaseAdmin
      .from("users")
      .select("id, email, full_name, role, is_admin, created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (fetchError) {
      logger.error("Failed to fetch users", fetchError);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to fetch users",
      });
    }

    const total = count ?? 0;
    logger.info(`Admin ${user.id} fetched users (${users?.length ?? 0} of ${total})`);

    return {
      users: (users || []) as User[],
      total,
      limit,
      offset,
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
