/**
 * GET /api/cron/process-account-deletions
 * Daily cron job to hard-delete accounts whose deletion_requested_at is > 30 days ago.
 *
 * Cascade order (mirrors admin/delete-user):
 *   1. Application data (interactions, events, schools, coaches, etc.)
 *   2. Family membership (detach or dissolve unit if last member)
 *   3. Pending invitations sent or received by the user
 *   4. User record from public.users
 *   5. Auth record from Supabase auth
 *
 * Security: Vercel sends CRON_SECRET as "Authorization: Bearer <secret>".
 */

import { defineEventHandler, createError, getHeader } from "h3";
import { useSupabaseAdmin } from "~/server/utils/supabase";
import { createLogger } from "~/server/utils/logger";
import { verifySharedSecret } from "~/server/utils/secrets";

const logger = createLogger("cron/process-account-deletions");

const DATA_TABLES: Array<{ table: string; column: string }> = [
  { table: "parent_view_log", column: "parent_user_id" },
  { table: "parent_view_log", column: "athlete_id" },
  { table: "user_preferences", column: "user_id" },
  { table: "preference_history", column: "user_id" },
  { table: "athlete_task", column: "athlete_id" },
  { table: "suggestion", column: "athlete_id" },
  { table: "interactions", column: "logged_by" },
  { table: "events", column: "user_id" },
  { table: "performance_metrics", column: "user_id" },
  { table: "documents", column: "user_id" },
  { table: "offers", column: "user_id" },
  { table: "coaches", column: "user_id" },
  { table: "schools", column: "user_id" },
  { table: "notifications", column: "user_id" },
  { table: "communication_templates", column: "user_id" },
];

export default defineEventHandler(async (event) => {
  const authHeader = getHeader(event, "authorization");
  const cronSecretHeader = getHeader(event, "x-cron-secret");
  const cronSecret = process.env.CRON_SECRET;
  const bearerSecret = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : undefined;

  const isAuthorized =
    cronSecret &&
    ((bearerSecret && verifySharedSecret(bearerSecret, cronSecret)) ||
      (cronSecretHeader && verifySharedSecret(cronSecretHeader, cronSecret)));

  if (!isAuthorized) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  const supabase = useSupabaseAdmin();
  const thirtyDaysAgo = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();

  // Find accounts ready for hard deletion
  const { data: pendingUsers, error: fetchError } = await supabase
    .from("users")
    .select("id, email")
    .not("deletion_requested_at", "is", null)
    .lt("deletion_requested_at", thirtyDaysAgo);

  if (fetchError) {
    logger.error("Failed to fetch pending deletions", fetchError);
    return { deleted: 0, errors: 1 };
  }

  if (!pendingUsers?.length) {
    logger.info("No accounts ready for deletion");
    return { deleted: 0, errors: 0 };
  }

  logger.info("Processing account deletions", { count: pendingUsers.length });

  let deleted = 0;
  let errors = 0;

  for (const user of pendingUsers) {
    try {
      // 1. Delete application data
      for (const { table, column } of DATA_TABLES) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from(table as any) as any)
          .delete()
          .eq(column, user.id);
        if (error && error.code !== "42P01") {
          logger.warn(`Failed to delete from ${table}.${column}`, {
            userId: user.id,
            error,
          });
        }
      }

      // 2. Handle family membership
      const { data: memberships } = await supabase
        .from("family_members")
        .select("family_unit_id")
        .eq("user_id", user.id);

      for (const { family_unit_id } of memberships ?? []) {
        const { count } = await supabase
          .from("family_members")
          .select("id", { count: "exact", head: true })
          .eq("family_unit_id", family_unit_id);

        if ((count ?? 0) <= 1) {
          // Last member — dissolve the family unit
          await supabase
            .from("family_invitations")
            .delete()
            .eq("family_unit_id", family_unit_id);
          await supabase
            .from("family_members")
            .delete()
            .eq("family_unit_id", family_unit_id);
          await supabase.from("family_units").delete().eq("id", family_unit_id);
        } else {
          // Detach user from unit
          await supabase
            .from("family_members")
            .delete()
            .eq("user_id", user.id)
            .eq("family_unit_id", family_unit_id);
        }
      }

      // 3. Cancel remaining invitations sent by this user
      await supabase
        .from("family_invitations")
        .delete()
        .eq("invited_by", user.id);

      // 4. Delete user record
      await supabase.from("users").delete().eq("id", user.id);

      // 5. Delete auth record
      try {
        await supabase.auth.admin.deleteUser(user.id);
      } catch (authErr) {
        logger.warn("Failed to delete auth user (non-fatal)", {
          userId: user.id,
          authErr,
        });
      }

      logger.info("Account hard-deleted", {
        userId: user.id,
        email: user.email,
      });
      deleted++;
    } catch (err) {
      logger.error("Failed to hard-delete account", { userId: user.id, err });
      errors++;
    }
  }

  return { deleted, errors };
});
