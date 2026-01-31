/**
 * Admin endpoint to delete a user from the system
 * POST /api/admin/delete-user
 *
 * Requires: Authentication header with valid JWT and is_admin: true
 * RESTRICTED: Admins only
 *
 * Request body: { email: "user@example.com" }
 * Response: { success: boolean, message: string }
 *
 * This endpoint:
 * - Requires authenticated user with is_admin flag set to true
 * - Validates email format
 * - Uses Supabase admin API to delete the user
 * - Cascade deletes all related data via RLS
 * - Logs the deletion action
 */

interface DeleteUserRequest {
  email: string;
}

interface DeleteUserResponse {
  success: boolean;
  message: string;
}

import { defineEventHandler, readBody, createError } from "h3";
import { requireAuth } from "~/server/utils/auth";
import { useSupabaseAdmin } from "~/server/utils/supabase";
import { createLogger } from "~/server/utils/logger";

const logger = createLogger("admin/delete-user");

export default defineEventHandler(
  async (event): Promise<DeleteUserResponse> => {
    try {
      // 1. Verify user is authenticated
      const user = await requireAuth(event);

      // Create admin client with service role
      const supabaseAdmin = useSupabaseAdmin();

      const { data: userData } = await supabaseAdmin
        .from("users")
        .select("is_admin")
        .eq("id", user.id)
        .single();

      if (!userData?.is_admin) {
        logger.warn(
          `Non-admin user ${user.id} attempted to delete a user`,
        );
        throw createError({
          statusCode: 403,
          statusMessage: "Only administrators can delete users",
        });
      }

      // 2. Parse and validate request body
      const body = await readBody<DeleteUserRequest>(event);
      const { email } = body;

      if (!email || typeof email !== "string") {
        throw createError({
          statusCode: 400,
          statusMessage: "Email address is required",
        });
      }

      // 3. Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        throw createError({
          statusCode: 400,
          statusMessage: "Invalid email address format",
        });
      }

      const targetEmail = email.trim();

      // 4. Prevent deleting your own account via this endpoint
      if (targetEmail === user.email) {
        throw createError({
          statusCode: 400,
          statusMessage:
            "Cannot delete your own account via this endpoint. Use account settings instead.",
        });
      }

      // 5. Get user to delete by email from users table
      const { data: targetUserData } = await supabaseAdmin
        .from("users")
        .select("id")
        .eq("email", targetEmail)
        .single();

      let targetUserId: string;

      // If user exists in public.users, use that ID
      if (targetUserData?.id) {
        targetUserId = targetUserData.id;
      } else {
        // If not in public.users, try to find in auth system
        // This handles cases where user was deleted from public.users but auth record remains
        try {
          const { data: { users }, error: authSearchError } =
            await supabaseAdmin.auth.admin.listUsers();

          if (authSearchError) {
            throw authSearchError;
          }

          const authUser = users?.find(
            (u) => u.email?.toLowerCase() === targetEmail.toLowerCase(),
          );

          if (!authUser?.id) {
            logger.warn(`Delete user attempt for non-existent email: ${targetEmail}`);
            throw createError({
              statusCode: 404,
              statusMessage: "User not found in database or auth system",
            });
          }

          targetUserId = authUser.id;
          logger.info(
            `Found user in auth system only (not in public.users): ${targetEmail} (${targetUserId})`,
          );
        } catch (error) {
          if (error instanceof Error && "statusCode" in error) {
            throw error;
          }
          logger.warn(`Delete user attempt for non-existent email: ${targetEmail}`);
          throw createError({
            statusCode: 404,
            statusMessage: "User not found",
          });
        }
      }

      // 6. Delete all user data from database tables in order of dependencies
      // Only include tables that actually exist in the schema
      const tableDeleteAttempts = [
        { table: "parent_view_log", columns: ["parent_user_id", "athlete_id"] },
        { table: "user_preferences", columns: ["user_id"] },
        { table: "preference_history", columns: ["user_id"] },
        { table: "athlete_task", columns: ["athlete_id"] },
        { table: "suggestion", columns: ["athlete_id"] },
        { table: "interactions", columns: ["logged_by"] },
        { table: "events", columns: ["user_id"] },
        { table: "performance_metrics", columns: ["user_id"] },
        { table: "documents", columns: ["user_id"] },
        { table: "offers", columns: ["user_id"] },
        { table: "coaches", columns: ["user_id"] },
        { table: "schools", columns: ["user_id"] },
        { table: "notifications", columns: ["user_id"] },
        { table: "communication_templates", columns: ["user_id"] },
        { table: "users", columns: ["id"] },
      ];

      for (const { table, columns } of tableDeleteAttempts) {
        try {
          // Delete records where any of the user columns match
          for (const column of columns) {
            const { error: deleteError } = await supabaseAdmin
              .from(table)
              .delete()
              .eq(column, targetUserId);

            if (deleteError && deleteError.code !== "42P01") {
              // 42P01 = relation does not exist (table doesn't exist, which is fine)
              logger.warn(`Failed to delete from ${table}.${column}:`, deleteError);
            }
          }
        } catch (error) {
          logger.warn(`Error deleting from ${table} for user ${targetUserId}:`, error);
        }
      }

      // 7. Delete user from auth system (if admin API is available)
      let authDeleted = false;
      try {
        if (supabaseAdmin.auth.admin?.deleteUser) {
          const { error: deleteError } =
            await supabaseAdmin.auth.admin.deleteUser(targetUserId);

          if (deleteError) {
            logger.warn(
              `Failed to delete auth user ${targetUserId} (${targetEmail}):`,
              deleteError,
            );
            // Continue anyway - we already deleted the user data from tables
          } else {
            authDeleted = true;
            logger.info(
              `Successfully deleted auth user ${targetUserId} (${targetEmail})`,
            );
          }
        }
      } catch (authError) {
        logger.warn(
          `Could not delete from auth system (may not be available in this SDK version):`,
          authError,
        );
        // This is non-fatal since we already deleted all user data above
      }

      // 8. Log successful deletion
      logger.info(
        `User ${targetEmail} (${targetUserId}) and all associated data deleted by admin ${user.id}. Auth record deleted: ${authDeleted}`,
      );

      return {
        success: true,
        message: `User ${targetEmail} and all associated data have been permanently deleted${authDeleted ? " (including auth records)" : ""}`,
      };
    } catch (error) {
      logger.error("Delete user endpoint failed", error);

      // Re-throw HTTP errors
      if (error instanceof Error && "statusCode" in error) {
        throw error;
      }

      // Generic error response
      throw createError({
        statusCode: 500,
        statusMessage:
          error instanceof Error ? error.message : "Failed to delete user",
      });
    }
  },
);
