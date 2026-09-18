/**
 * POST /api/auth/admin-profile
 * Creates or updates an admin user profile during the admin signup flow.
 *
 * Security: requires a valid, unconsumed, unexpired, email-bound
 * admin_invitations token (issue #854) in the request body on every call —
 * the same token validated by /api/auth/validate-admin-token earlier in the
 * signup flow. Validation, single-use consumption, AND the is_admin grant
 * all happen atomically inside the consume_admin_invitation Postgres
 * function — a second call with the same token 403s, and a failed grant
 * never burns the token (both roll back together). The invitation's email
 * is checked against the CALLER'S OWN authenticated email (authUser.email,
 * from requireAuth's verified JWT), never a client-supplied one — review
 * caught that trusting a request-body email let any token holder consume
 * an invitation meant for a different address while granting admin to
 * their own, different, authenticated account. Accounts are always
 * auto-confirmed with a session issued immediately (see
 * server/utils/accountCreation.ts), so the admin signup page calls this
 * endpoint synchronously with the real token right after signup — there is
 * no legitimate case where a session-less "carry the intent forward" path
 * is needed. A prior version trusted a `pending_admin` flag out of the
 * user's own JWT metadata as an alternative to the token check; since
 * /api/auth/signup could be called directly with arbitrary metadata, that
 * flag was attacker-settable and let any signup escalate itself to admin
 * on next sign-in. Never resurrect that shortcut — always consume a
 * freshly supplied admin_invitations token here.
 */

import { defineEventHandler, readBody, createError } from "h3";
import { useLogger } from "~/server/utils/logger";
import { useSupabaseAdmin } from "~/server/utils/supabase";
import { requireAuth } from "~/server/utils/auth";

interface AdminProfileRequest {
  fullName: string;
  adminToken?: string;
}

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "auth/admin-profile");
  try {
    const authUser = await requireAuth(event);

    if (!authUser.email) {
      logger.warn("Admin profile creation attempted with no email on session", {
        userId: authUser.id,
      });
      throw createError({ statusCode: 403, statusMessage: "Forbidden" });
    }

    const body = await readBody<AdminProfileRequest>(event);
    const { fullName, adminToken } = body;

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
      {
        p_token: adminToken,
        p_user_id: authUser.id,
        p_email: authUser.email,
        p_full_name: fullName,
      },
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
