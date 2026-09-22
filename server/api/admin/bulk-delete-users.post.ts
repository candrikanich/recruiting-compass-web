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
import { z } from "zod";
import { requireAdmin } from "~/server/utils/auth";
import { useSupabaseAdmin } from "~/server/utils/supabase";
import { resolveAdminDbEnv } from "~/server/utils/adminDbEnv";
import { useLogger } from "~/server/utils/logger";

// Length/type gate only -- the per-email format validation (with its own
// dedicated "which emails are invalid" message) stays a manual pass below,
// since it needs to report every bad address at once rather than fail on
// the first Zod issue.
const bulkDeleteBodySchema = z.object({
  emails: z.array(z.string()).min(1, "At least one email address is required"),
  env: z.enum(["prod", "qa"]).optional(),
});
type BulkDeleteUserRequest = z.infer<typeof bulkDeleteBodySchema>;

export default defineEventHandler(
  async (event): Promise<BulkDeleteUserResponse> => {
    const logger = useLogger(event, "admin/bulk-delete-users");
    try {
      // 1. Verify user is an authenticated admin
      const user = await requireAdmin(event);

      // 2. Parse and validate request body
      const rawBody = await readBody(event);
      const parsed = bulkDeleteBodySchema.safeParse(rawBody);
      if (!parsed.success) {
        throw createError({
          statusCode: 400,
          statusMessage:
            parsed.error.issues[0]?.message ?? "Invalid request body",
        });
      }
      const body: BulkDeleteUserRequest = parsed.data;
      const { emails } = body;
      const dbEnv = resolveAdminDbEnv(body.env);

      // Create admin client with service role, scoped to the requested DB
      const supabaseAdmin = useSupabaseAdmin(dbEnv);

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

          // PGRST116 = zero rows matched: a confirmed absence, not a lookup
          // failure. An earlier bulk-delete run can leave this state if the
          // public.users delete succeeded but the auth deletion below it
          // didn't (crash, transient error) — the row is gone but the auth
          // account survives. Only treat a confirmed absence as a candidate
          // for auth-only recovery; any other error must stay "failed" so a
          // retry doesn't silently skip it again. Check the error before the
          // data: a non-PGRST116 error means the data can't be trusted.
          if (getUserError && getUserError.code !== "PGRST116") {
            return { status: "lookup-error", email: targetEmail } as const;
          }
          if (!getUserError && targetUserData?.id) {
            return {
              status: "resolved",
              email: targetEmail,
              id: targetUserData.id,
            } as const;
          }
          return { status: "absent", email: targetEmail } as const;
        }),
      );

      const resolvedUsers: Array<{ email: string; id: string }> = [];
      const absentEmails: string[] = [];

      resolutionResults.forEach((result, index) => {
        if (result.status !== "fulfilled") {
          errors.push({
            email: normalizedEmails[index],
            reason: "Resolution failed",
          });
          return;
        }

        const value = result.value;
        if (value.status === "resolved") {
          resolvedUsers.push({ email: value.email, id: value.id });
        } else if (value.status === "absent") {
          absentEmails.push(value.email);
        } else {
          errors.push({ email: value.email, reason: "Resolution failed" });
        }
      });

      // Recover auth-only accounts: confirmed absent from public.users, but
      // may still exist in the auth system from a prior partial delete.
      // One listUsers call covers every absent email in this batch.
      const authOnlyUsers: Array<{ email: string; id: string }> = [];
      if (absentEmails.length > 0) {
        try {
          const { data: authUserData, error: authListError } =
            await supabaseAdmin.auth.admin.listUsers();

          if (authListError) {
            throw authListError;
          }

          const authUsersByEmail = new Map(
            (authUserData?.users ?? [])
              .filter((u) => u.email)
              .map((u) => [u.email as string, u.id]),
          );

          for (const email of absentEmails) {
            const authId = authUsersByEmail.get(email);
            if (authId) {
              authOnlyUsers.push({ email, id: authId });
            } else {
              errors.push({ email, reason: "User not found" });
            }
          }
        } catch (authLookupError) {
          logger.warn(
            "Failed to resolve auth-only users for absent emails:",
            authLookupError,
          );
          for (const email of absentEmails) {
            errors.push({ email, reason: "User not found" });
          }
        }
      }

      // Populated only when resolvedUsers is non-empty (the users-row delete +
      // survivor verification below only applies to them); authOnlyUsers have
      // no users row to survive, so they never appear in survivorIds.
      let usersDeleteError: { message?: string } | undefined;
      let verifyError: { message?: string } | undefined;
      const survivorIds = new Set<string>();

      if (resolvedUsers.length > 0) {
        const targetUserIds = resolvedUsers.map((u) => u.id);

        // Delete all user data from database tables in order of dependencies.
        // One query per table per column covers all target users at once.
        //
        // "users" is deliberately NOT in this list — see the dedicated step
        // below. Two FK columns are NO ACTION (RESTRICT, not CASCADE/SET NULL)
        // and silently block the users-row delete if left in place:
        // guardian_claims.claimed_by, and users' own self-referencing
        // guardian_consent_by. Same bug as the single-user delete-user.post.ts
        // endpoint (fixed alongside this one) — a guardian who'd confirmed a
        // claim could never actually be deleted, and this endpoint counted them
        // as successfully deleted anyway, based only on the auth-record delete.
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
          // Family tables must be removed before users (no ON DELETE CASCADE on users FK)
          { table: "family_invitations", columns: ["invited_by"] },
          { table: "family_members", columns: ["user_id"] },
          { table: "family_units", columns: ["created_by_user_id"] },
          // NO ACTION FK to users.id — must be cleared before the users delete.
          { table: "guardian_claims", columns: ["claimed_by"] },
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

        // Clear the self-referencing guardian_consent_by FK (also NO ACTION) on
        // any other user's row naming one of these users as the confirming
        // guardian.
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { error: consentClearError } = await (supabaseAdmin as any)
            .from("users")
            .update({
              guardian_consent_by: null,
              guardian_consent_at: null,
              guardian_consent_terms_version: null,
            })
            .in("guardian_consent_by", targetUserIds);
          if (consentClearError) {
            logger.warn(
              "Failed to clear guardian_consent_by for bulk delete:",
              consentClearError,
            );
          }
        } catch (error) {
          logger.warn("Error clearing guardian_consent_by:", error);
        }

        // Delete the users rows themselves as their own step, NOT swallowed
        // like the tables above — this is what the whole endpoint exists to
        // remove, and counting a user as deleted without it actually being gone
        // is the exact ghost-data bug this fix closes.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const usersDeleteResult = await (supabaseAdmin as any)
          .from("users")
          .delete()
          .in("id", targetUserIds);
        usersDeleteError = usersDeleteResult.error;

        if (usersDeleteError) {
          logger.error("Failed to delete users rows in bulk:", usersDeleteError);
        }

        // Verify — a NO ACTION FK violation (or an RLS denial) can come back as
        // a silently-no-op delete rather than a populated error, same as the
        // single-user endpoint. Anyone still present here is a real failure,
        // regardless of what the delete call above reported.
        const { data: survivors, error: verifyReadError } = await (
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          supabaseAdmin as any
        )
          .from("users")
          .select("id")
          .in("id", targetUserIds);
        verifyError = verifyReadError;

        if (verifyError) {
          logger.error(
            "Could not verify bulk deletion — verification read failed:",
            verifyError,
          );
        }

        // A failed verification read is not proof anyone was deleted — treat
        // every targeted user as unconfirmed rather than defaulting to an
        // empty survivor set, which would report false successes.
        const confirmedSurvivorIds = verifyError
          ? new Set(targetUserIds)
          : new Set(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              ((survivors ?? []) as any[]).map((row) => row.id as string),
            );
        confirmedSurvivorIds.forEach((id) => survivorIds.add(id));
      }

      // Delete each surviving-in-auth user from the auth system and record
      // results — but only for users whose users row is actually confirmed
      // gone; a survivor is reported as a failure, not a success. Includes
      // authOnlyUsers, whose public.users row is already gone — no table
      // deletes or survivor check needed for them, just the auth cleanup a
      // prior run missed.
      const authTargets = [...resolvedUsers, ...authOnlyUsers];
      if (authTargets.length > 0) {
        await Promise.all(
          authTargets.map(
            async ({ email: targetEmail, id: targetUserId }) => {
              if (survivorIds.has(targetUserId)) {
                errors.push({
                  email: targetEmail,
                  reason: verifyError
                    ? `Could not confirm user deletion: verification read failed (${verifyError.message ?? "unknown database error"})`
                    : (usersDeleteError?.message ??
                      "User row still exists after deletion (likely a foreign key constraint)"),
                });
                logger.error(
                  verifyError
                    ? `Could not confirm deletion of users row ${targetUserId} (${targetEmail}) — verification read failed, state unknown`
                    : `users row ${targetUserId} (${targetEmail}) still exists after bulk delete — reporting failure instead of a false success`,
                );
                return;
              }

              try {
                // Verify the primary user record is actually gone before
                // touching the auth record. A failed read must NOT be
                // treated as proof of deletion.
                const { data: verifyRow, error: verifyError } =
                  await supabaseAdmin
                    .from("users")
                    .select("id")
                    .eq("id", targetUserId)
                    .maybeSingle();

                if (verifyError) {
                  logger.error(
                    `Deletion verification query failed for ${targetEmail} (${targetUserId}):`,
                    verifyError,
                  );
                  errors.push({
                    email: targetEmail,
                    reason: "Could not verify deletion",
                  });
                  return;
                }

                if (verifyRow) {
                  logger.error(
                    `User ${targetEmail} (${targetUserId}) still present in users table after delete attempt`,
                  );
                  errors.push({
                    email: targetEmail,
                    reason: "User deletion did not complete",
                  });
                  return;
                }

                if (supabaseAdmin.auth.admin?.deleteUser) {
                  const { error: deleteError } =
                    await supabaseAdmin.auth.admin.deleteUser(targetUserId);

                  if (deleteError) {
                    logger.warn(
                      `Failed to delete auth user ${targetUserId} (${targetEmail}):`,
                      deleteError,
                    );
                    errors.push({
                      email: targetEmail,
                      reason: deleteError.message || "Auth deletion failed",
                    });
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
            },
          ),
        );
      }

      // 6. Log bulk operation summary
      logger.info(
        `Bulk delete completed on ${dbEnv}: ${deletedEmails.length} successful, ${errors.length} failed by admin ${user.id}`,
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
