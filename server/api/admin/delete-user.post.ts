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

interface DeleteUserResponse {
  success: boolean;
  message: string;
}

import { defineEventHandler, readBody, createError } from "h3";
import { z } from "zod";
import { requireAdmin } from "~/server/utils/auth";
import { useSupabaseAdmin } from "~/server/utils/supabase";
import { resolveAdminDbEnv } from "~/server/utils/adminDbEnv";
import { useLogger } from "~/server/utils/logger";
import { emailSchema } from "~/utils/validation/validators";

// emailSchema validates .email() before its own .trim()/.toLowerCase(), so a
// whitespace-padded address (this endpoint's own removed manual check
// trimmed first) must be trimmed before it reaches the schema.
const deleteUserBodySchema = z.object({
  email: z.preprocess(
    (val) => (typeof val === "string" ? val.trim() : val),
    emailSchema,
  ),
  env: z.enum(["prod", "qa"]).optional(),
});
type DeleteUserRequest = z.infer<typeof deleteUserBodySchema>;

export default defineEventHandler(
  async (event): Promise<DeleteUserResponse> => {
    const logger = useLogger(event, "admin/delete-user");
    try {
      // 1. Verify user is an authenticated admin
      const user = await requireAdmin(event);

      // 2. Parse and validate request body
      const rawBody = await readBody(event);
      const parsed = deleteUserBodySchema.safeParse(rawBody);
      if (!parsed.success) {
        throw createError({
          statusCode: 400,
          statusMessage:
            "Invalid request: " + parsed.error.issues[0]?.message,
        });
      }
      const body: DeleteUserRequest = parsed.data;
      const dbEnv = resolveAdminDbEnv(body.env);

      // Create admin client with service role, scoped to the requested DB
      const supabaseAdmin = useSupabaseAdmin(dbEnv);

      const targetEmail = body.email;

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
          const { data: authUserData, error: authSearchError } =
            await supabaseAdmin.auth.admin.listUsers();

          if (authSearchError) {
            throw authSearchError;
          }

          const authUser = authUserData?.users?.find(
            (u) => u.email === targetEmail,
          );

          if (!authUser?.id) {
            logger.warn(
              `Delete user attempt for non-existent email: ${targetEmail}`,
            );
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
          logger.warn(
            `Delete user attempt for non-existent email: ${targetEmail}`,
          );
          throw createError({
            statusCode: 404,
            statusMessage: "User not found",
          });
        }
      }

      // 6. Delete all user data from database tables in order of dependencies
      // Only include tables that actually exist in the schema.
      //
      // "users" is deliberately NOT in this list — it's deleted as its own,
      // non-swallowed step below (step 6b), because two FK columns are NO ACTION
      // (RESTRICT, not CASCADE or SET NULL) and will silently block the users-row
      // delete if left in place: guardian_claims.claimed_by, and users' own
      // self-referencing guardian_consent_by. Neither table/column appeared in
      // this list before, and this endpoint swallowed every per-table error and
      // always reported success — so a guardian who had ever confirmed a claim
      // could never actually be deleted through this endpoint, silently. Found
      // live on QA: deleting a parent left the public.users + auth.users rows
      // fully intact with no error surfaced anywhere.
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
        // Family tables must be removed before users (no ON DELETE CASCADE on users FK)
        { table: "family_invitations", columns: ["invited_by"] },
        // admin_invitations.invited_by is also NO ACTION — an admin who has
        // minted any invitation would otherwise leave the auth.users delete
        // blocked by that FK (issue #854 review finding).
        { table: "admin_invitations", columns: ["invited_by"] },
        { table: "family_members", columns: ["user_id"] },
        { table: "family_units", columns: ["created_by_user_id"] },
        // NO ACTION FK to users.id -- must be cleared before the users delete,
        // not just before it happens to matter for THIS user's own claim.
        { table: "guardian_claims", columns: ["claimed_by"] },
      ];

      for (const { table, columns } of tableDeleteAttempts) {
        try {
          // Delete records where any of the user columns match
          for (const column of columns) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const response = await (supabaseAdmin.from(table as any) as any)
              .delete()
              .eq(column, targetUserId);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error: deleteError } = response as { error: any };

            if (deleteError && deleteError.code !== "42P01") {
              // 42P01 = relation does not exist (table doesn't exist, which is fine)
              logger.warn(
                `Failed to delete from ${table}.${column}:`,
                deleteError,
              );
            }
          }
        } catch (error) {
          logger.warn(
            `Error deleting from ${table} for user ${targetUserId}:`,
            error,
          );
        }
      }

      // 6a. Clear the self-referencing guardian_consent_by FK (also NO ACTION,
      // not auto-nulled by the DB) on any OTHER user's row that names this user
      // as the guardian who confirmed them.
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: consentClearError } = await (supabaseAdmin as any)
          .from("users")
          .update({
            guardian_consent_by: null,
            guardian_consent_at: null,
            guardian_consent_terms_version: null,
          })
          .eq("guardian_consent_by", targetUserId);
        if (consentClearError) {
          logger.warn(
            `Failed to clear guardian_consent_by referencing ${targetUserId}:`,
            consentClearError,
          );
        }
      } catch (error) {
        logger.warn(
          `Error clearing guardian_consent_by referencing ${targetUserId}:`,
          error,
        );
      }

      // 6b. Delete the users row itself as its own step, NOT swallowed like the
      // tables above -- this is the row the whole endpoint exists to remove, and
      // reporting success without it actually being gone is the exact ghost-data
      // bug this fix closes. Verified by re-selecting afterward rather than
      // trusting the delete call's own (sometimes silent) response.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: usersDeleteError } = await (supabaseAdmin as any)
        .from("users")
        .delete()
        .eq("id", targetUserId);

      if (usersDeleteError) {
        logger.error(
          `Failed to delete users row ${targetUserId} (${targetEmail}):`,
          usersDeleteError,
        );
      }

      const { data: stillExists, error: verifyError } = await (
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        supabaseAdmin as any
      )
        .from("users")
        .select("id")
        .eq("id", targetUserId)
        .maybeSingle();

      if (verifyError) {
        logger.error(
          `Could not verify deletion of users row ${targetUserId} (${targetEmail}):`,
          verifyError,
        );
        throw createError({
          statusCode: 500,
          statusMessage: `Could not confirm user deletion: verification read failed (${verifyError.message ?? "unknown database error"})`,
        });
      }

      if (stillExists) {
        logger.error(
          `users row ${targetUserId} (${targetEmail}) still exists after delete -- reporting failure instead of a false success`,
        );
        throw createError({
          statusCode: 500,
          statusMessage: usersDeleteError
            ? `Could not delete user: ${usersDeleteError.message ?? "unknown database error"}`
            : "Could not delete user: the row still exists after deletion for an unknown reason",
        });
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

      // 9. Log successful deletion
      logger.info(
        `User ${targetEmail} (${targetUserId}) and all associated data deleted from ${dbEnv} by admin ${user.id}. Auth record deleted: ${authDeleted}`,
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
        statusMessage: "Failed to delete user",
      });
    }
  },
);
