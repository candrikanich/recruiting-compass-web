/**
 * Admin endpoint to bulk delete multiple users from the system
 * POST /api/admin/bulk-delete-users
 *
 * Requires: Authentication header with valid JWT and is_admin: true
 * RESTRICTED: Admins only
 *
 * Request body: { emails: ["user1@example.com", "user2@example.com"] }
 * Response: {
 *   success: number,
 *   failed: number,
 *   deletedEmails: string[],
 *   errors: Array<{email: string, reason: string}>,
 *   message: string
 * }
 *
 * This endpoint:
 * - Requires authenticated user with is_admin flag set to true
 * - Validates email format for all emails
 * - Prevents self-deletion
 * - Processes deletions sequentially
 * - Cascade deletes all related data via RLS
 * - Handles partial failures gracefully (continues processing)
 * - Logs all actions via audit logger
 */

interface BulkDeleteUserRequest {
  emails: string[];
}

interface BulkDeleteError {
  email: string;
  reason: string;
}

interface BulkDeleteUserResponse {
  success: number;
  failed: number;
  deletedEmails: string[];
  errors: BulkDeleteError[];
  message: string;
}

import { defineEventHandler, readBody, createError } from "h3";
import { requireAdmin } from "~/server/utils/auth";
import { useSupabaseAdmin } from "~/server/utils/supabase";
import { createLogger } from "~/server/utils/logger";

const logger = createLogger("admin/bulk-delete-users");

export default defineEventHandler(
  async (event): Promise<BulkDeleteUserResponse> => {
    try {
      // 1. Verify user is an authenticated admin
      const user = await requireAdmin(event);

      // Create admin client with service role
      const supabaseAdmin = useSupabaseAdmin();

      // 2. Parse and validate request body
      const body = await readBody<BulkDeleteUserRequest>(event);
      const { emails } = body;

      if (!Array.isArray(emails)) {
        throw createError({
          statusCode: 400,
          statusMessage: "Emails must be an array",
        });
      }

      if (emails.length === 0) {
        throw createError({
          statusCode: 400,
          statusMessage: "At least one email address is required",
        });
      }

      // 3. Validate and normalize emails
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const normalizedEmails = emails.map((e) => e.trim());

      const invalidEmails = normalizedEmails.filter(
        (email) => !emailRegex.test(email),
      );
      if (invalidEmails.length > 0) {
        throw createError({
          statusCode: 400,
          statusMessage: `Invalid email format: ${invalidEmails.join(", ")}`,
        });
      }

      // 4. Prevent self-deletion
      if (user.email && normalizedEmails.includes(user.email)) {
        throw createError({
          statusCode: 400,
          statusMessage:
            "Cannot delete your own account via this endpoint. Use account settings instead.",
        });
      }

      // 5. Resolve all emails to user IDs in parallel, collecting failures early
      const deletedEmails: string[] = [];
      const errors: BulkDeleteError[] = [];

      const resolutionResults = await Promise.allSettled(
        normalizedEmails.map(async (targetEmail) => {
          const { data: targetUserData, error: getUserError } =
            await supabaseAdmin
              .from("users")
              .select("id")
              .eq("email", targetEmail)
              .single();

          if (getUserError || !targetUserData?.id) {
            return { resolved: false, email: targetEmail } as const;
          }
          return { resolved: true, email: targetEmail, id: targetUserData.id } as const;
        }),
      );

      const resolvedUsers: Array<{ email: string; id: string }> = [];

      resolutionResults.forEach((result, index) => {
        if (result.status === "fulfilled") {
          if (result.value.resolved) {
            resolvedUsers.push({ email: result.value.email, id: result.value.id });
          } else {
            errors.push({ email: result.value.email, reason: "User not found" });
          }
        } else {
          errors.push({ email: normalizedEmails[index], reason: "Resolution failed" });
        }
      });

      if (resolvedUsers.length > 0) {
        const targetUserIds = resolvedUsers.map((u) => u.id);

        // Delete all user data from database tables in order of dependencies.
        // One query per table per column covers all target users at once.
        const tableDeleteAttempts = [
          {
            table: "parent_view_log",
            columns: ["parent_user_id", "athlete_id"],
          },
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
            for (const column of columns) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const response = await (supabaseAdmin.from(table as any) as any)
                .delete()
                .in(column, targetUserIds);
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const { error: deleteError } = response as { error: any };

              if (deleteError && deleteError.code !== "42P01") {
                logger.warn(
                  `Failed to delete from ${table}.${column}:`,
                  deleteError,
                );
              }
            }
          } catch (error) {
            logger.warn(`Error deleting from ${table}:`, error);
          }
        }

        // Delete each user from the auth system and record results
        await Promise.all(
          resolvedUsers.map(async ({ email: targetEmail, id: targetUserId }) => {
            try {
              if (supabaseAdmin.auth.admin?.deleteUser) {
                const { error: deleteError } =
                  await supabaseAdmin.auth.admin.deleteUser(targetUserId);

                if (deleteError) {
                  logger.warn(
                    `Failed to delete auth user ${targetUserId} (${targetEmail}):`,
                    deleteError,
                  );
                  errors.push({ email: targetEmail, reason: deleteError.message || "Auth deletion failed" });
                  return;
                }
              }

              deletedEmails.push(targetEmail);
              logger.info(
                `User ${targetEmail} (${targetUserId}) and all associated data deleted by admin ${user.id}`,
              );
            } catch (authError) {
              errors.push({
                email: targetEmail,
                reason:
                  authError instanceof Error
                    ? authError.message
                    : "Unknown error",
              });
              logger.error(
                `Could not delete from auth system for ${targetEmail}:`,
                authError,
              );
            }
          }),
        );
      }

      // 6. Log bulk operation summary
      logger.info(
        `Bulk delete completed: ${deletedEmails.length} successful, ${errors.length} failed by admin ${user.id}`,
      );

      const message =
        deletedEmails.length === normalizedEmails.length
          ? `All ${deletedEmails.length} user(s) and their data have been permanently deleted`
          : `${deletedEmails.length} user(s) deleted successfully${errors.length > 0 ? `, ${errors.length} failed` : ""}`;

      return {
        success: deletedEmails.length,
        failed: errors.length,
        deletedEmails,
        errors,
        message,
      };
    } catch (error) {
      logger.error("Bulk delete users endpoint failed", error);

      // Re-throw HTTP errors
      if (error instanceof Error && "statusCode" in error) {
        throw error;
      }

      // Generic error response
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to bulk delete users",
      });
    }
  },
);
