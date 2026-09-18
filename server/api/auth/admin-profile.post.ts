/**
 * POST /api/auth/admin-profile
 * Creates or updates an admin user profile during the admin signup flow.
 *
 * Security: requires a valid, unconsumed, unexpired, email-bound
 * admin_invitations token (issue #854) in the request body on every call —
 * the same token validated by /api/auth/validate-admin-token earlier in the
 * signup flow. Consuming it here (via the consume_admin_invitation RPC) is
 * the actual grant and is single-use — a second call with the same token
 * 403s. Accounts are always auto-confirmed with a session issued
 * immediately (see server/utils/accountCreation.ts), so the admin signup
 * page calls this endpoint synchronously with the real token right after
 * signup — there is no legitimate case where a session-less "carry the
 * intent forward" path is needed. A prior version trusted a `pending_admin`
 * flag out of the user's own JWT metadata as an alternative to the token
 * check; since /api/auth/signup could be called directly with arbitrary
 * metadata, that flag was attacker-settable and let any signup escalate
 * itself to admin on next sign-in. Never resurrect that shortcut — always
 * consume a freshly supplied admin_invitations token here.
 */

import { defineEventHandler, readBody, createError } from "h3";
import { useLogger } from "~/server/utils/logger";
import { useSupabaseAdmin } from "~/server/utils/supabase";
import { requireAuth } from "~/server/utils/auth";

interface AdminProfileRequest {
  email: string;
  fullName: string;
  adminToken?: string;
}

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "auth/admin-profile");
  try {
    const authUser = await requireAuth(event);
    const body = await readBody<AdminProfileRequest>(event);
    const { email, fullName, adminToken } = body;

    if (!email) {
      throw createError({
        statusCode: 400,
        statusMessage: "email is required",
      });
    }

    // Require a valid admin token — prevents unauthenticated privilege
    // escalation. Never trusted from anything but a fresh, validated token.
    if (!adminToken || typeof adminToken !== "string") {
      logger.warn("Admin profile creation attempted without admin token", {
        userId: authUser.id,
      });
      throw createError({ statusCode: 403, statusMessage: "Forbidden" });
    }

    // Use admin client to bypass RLS
    const supabase = useSupabaseAdmin();

    const { data: consumeResult, error: consumeError } = await supabase.rpc(
      "consume_admin_invitation",
      { p_token: adminToken, p_email: email },
    );

    if (consumeError) {
      logger.error("Failed to consume admin invitation", consumeError);
      throw createError({ statusCode: 500, statusMessage: "Forbidden" });
    }

    const status = consumeResult?.[0]?.status;
    if (status !== "consumed") {
      logger.warn("Admin profile creation attempted with invalid admin token", {
        userId: authUser.id,
        status,
      });
      throw createError({ statusCode: 403, statusMessage: "Forbidden" });
    }

    // Update existing user record with admin flag and parent role
    const { data: _data, error } = await supabase
      .from("users")
      .update({
        full_name: fullName,
        role: "parent",
        is_admin: true,
      })
      .eq("id", authUser.id);

    if (error) {
      logger.error("Failed to create admin profile", error);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to create admin profile",
      });
    }

    logger.info(`Admin profile created for user ${authUser.id}`);

    return { success: true };
  } catch (err) {
    logger.error("Admin profile creation failed", err);

    if (err instanceof Error && "statusCode" in err) {
      throw err;
    }

    throw createError({
      statusCode: 500,
      statusMessage: "Profile creation failed",
    });
  }
});
