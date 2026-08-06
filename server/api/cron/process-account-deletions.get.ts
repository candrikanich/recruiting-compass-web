/**
 * GET /api/cron/process-account-deletions
 * Daily cron job to hard-delete accounts whose deletion_requested_at is > 30 days ago.
 *
 * Cascade order (mirrors admin/delete-user):
 *   1. Application data (interactions, events, schools, coaches, etc.)
 *   2. Family membership (detach or dissolve unit if last member)
 *   3. Pending invitations sent by the user
 *   4. User record from public.users
 *   5. Auth record from Supabase auth
 *
 * Every step's error is checked explicitly. If any application-data step
 * fails for a user, that user's deletion aborts immediately — the
 * public.users row and the auth.users record are both left in place so
 * the next run can retry, rather than reporting a false "deleted" while
 * silently leaving orphaned rows or an orphaned auth record behind.
 *
 * Security: Vercel sends CRON_SECRET as "Authorization: Bearer <secret>".
 */

import { defineEventHandler, createError, getHeader } from "h3";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useSupabaseAdmin } from "~/server/utils/supabase";
import { createLogger } from "~/server/utils/logger";
import { verifySharedSecret } from "~/server/utils/secrets";
import type { Database } from "~/types/database";

const logger = createLogger("cron/process-account-deletions");

export const DATA_TABLES: Array<{ table: string; column: string }> = [
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

/** Postgres error code for "relation does not exist" — tolerated since not
 * every environment has every optional table. Any other error aborts the
 * user's deletion. */
const UNDEFINED_TABLE = "42P01";

export interface PendingUser {
  id: string;
  email: string | null;
}

export type DeletionOutcome =
  { status: "deleted" } | { status: "failed"; step: string; reason: string };

/**
 * Delete all rows in `table` matching `column = userId`.
 * Returns an error message if the delete failed for a reason other than
 * the table simply not existing in this environment.
 */
async function deleteDataRows(
  supabase: SupabaseClient<Database>,
  table: string,
  column: string,
  userId: string,
): Promise<string | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from(table as any) as any)
    .delete()
    .eq(column, userId);

  if (error && error.code !== UNDEFINED_TABLE) {
    return `${table}.${column}: ${error.message} (${error.code ?? "no code"})`;
  }
  return null;
}

/**
 * Detach or dissolve every family unit this user belongs to. Aborts on
 * the first error and reports which step failed.
 */
async function deleteFamilyMembership(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<string | null> {
  const { data: memberships, error: membershipsError } = await supabase
    .from("family_members")
    .select("family_unit_id")
    .eq("user_id", userId);

  if (membershipsError) {
    return `family_members select: ${membershipsError.message}`;
  }

  for (const { family_unit_id } of memberships ?? []) {
    const { count, error: countError } = await supabase
      .from("family_members")
      .select("id", { count: "exact", head: true })
      .eq("family_unit_id", family_unit_id);

    if (countError) {
      return `family_members count for ${family_unit_id}: ${countError.message}`;
    }

    if ((count ?? 0) <= 1) {
      // Last member — dissolve the family unit entirely.
      const { error: invitationsError } = await supabase
        .from("family_invitations")
        .delete()
        .eq("family_unit_id", family_unit_id);
      if (invitationsError) {
        return `family_invitations delete for ${family_unit_id}: ${invitationsError.message}`;
      }

      const { error: membersError } = await supabase
        .from("family_members")
        .delete()
        .eq("family_unit_id", family_unit_id);
      if (membersError) {
        return `family_members delete for ${family_unit_id}: ${membersError.message}`;
      }

      const { error: unitError } = await supabase
        .from("family_units")
        .delete()
        .eq("id", family_unit_id);
      if (unitError) {
        return `family_units delete for ${family_unit_id}: ${unitError.message}`;
      }
    } else {
      // Other members remain — just detach this user.
      const { error: detachError } = await supabase
        .from("family_members")
        .delete()
        .eq("user_id", userId)
        .eq("family_unit_id", family_unit_id);
      if (detachError) {
        return `family_members detach for ${family_unit_id}: ${detachError.message}`;
      }
    }
  }

  return null;
}

/**
 * Runs every deletion step for a single user, aborting immediately if any
 * application-data step fails. Only reaches the auth.users delete once
 * every prior step has been confirmed to succeed.
 */
export async function deleteUserAccount(
  supabase: SupabaseClient<Database>,
  user: PendingUser,
): Promise<DeletionOutcome> {
  // 1. Application data owned solely by this user.
  for (const { table, column } of DATA_TABLES) {
    const error = await deleteDataRows(supabase, table, column, user.id);
    if (error) {
      return { status: "failed", step: `data:${table}`, reason: error };
    }
  }

  // 2. Family membership (detach or dissolve unit if last member).
  const familyError = await deleteFamilyMembership(supabase, user.id);
  if (familyError) {
    return { status: "failed", step: "family_membership", reason: familyError };
  }

  // 3. Pending invitations sent by this user.
  const { error: invitationsSentError } = await supabase
    .from("family_invitations")
    .delete()
    .eq("invited_by", user.id);
  if (invitationsSentError) {
    return {
      status: "failed",
      step: "family_invitations_sent",
      reason: invitationsSentError.message,
    };
  }

  // 4. public.users record. Only proceed to the auth delete if this
  // succeeds — otherwise we'd orphan the auth record with no profile row.
  const { error: userDeleteError } = await supabase
    .from("users")
    .delete()
    .eq("id", user.id);
  if (userDeleteError) {
    return {
      status: "failed",
      step: "users",
      reason: userDeleteError.message,
    };
  }

  // 5. auth.users record — last step, only after every application row is
  // confirmed gone.
  const { error: authError } = await supabase.auth.admin.deleteUser(user.id);
  if (authError) {
    return {
      status: "failed",
      step: "auth.deleteUser",
      reason: authError.message,
    };
  }

  return { status: "deleted" };
}

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
    return { deleted: 0, failed: 0, results: [] };
  }

  if (!pendingUsers?.length) {
    logger.info("No accounts ready for deletion");
    return { deleted: 0, failed: 0, results: [] };
  }

  logger.info("Processing account deletions", { count: pendingUsers.length });

  let deleted = 0;
  let failed = 0;
  const results: Array<{
    userId: string;
    email: string | null;
    status: "deleted" | "failed";
    step?: string;
    reason?: string;
  }> = [];

  for (const user of pendingUsers) {
    try {
      const outcome = await deleteUserAccount(supabase, user);

      if (outcome.status === "deleted") {
        logger.info("Account hard-deleted", {
          userId: user.id,
          email: user.email,
        });
        deleted++;
        results.push({
          userId: user.id,
          email: user.email,
          status: "deleted",
        });
      } else {
        logger.error(
          "Account deletion failed — leaving user intact for retry",
          {
            userId: user.id,
            email: user.email,
            step: outcome.step,
            reason: outcome.reason,
          },
        );
        failed++;
        results.push({
          userId: user.id,
          email: user.email,
          status: "failed",
          step: outcome.step,
          reason: outcome.reason,
        });
      }
    } catch (err) {
      logger.error("Unexpected error during account deletion", {
        userId: user.id,
        email: user.email,
        err,
      });
      failed++;
      results.push({
        userId: user.id,
        email: user.email,
        status: "failed",
        step: "unexpected",
        reason: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return { deleted, failed, results };
});
