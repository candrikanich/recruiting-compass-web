/**
 * POST /api/auth/admin-profile
 * Creates or updates an admin user profile during the admin signup flow.
 *
 * Security: requires a valid adminToken in the request body — the same token
 * validated by /api/auth/validate-admin-token earlier in the signup flow.
 * This prevents unauthenticated callers from escalating any account to admin.
 */

import { defineEventHandler, readBody, createError } from "h3";
import { validateAdminToken } from "~/server/utils/adminToken";
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

    // Two ways to reach this endpoint, both requiring the adminToken to have
    // been validated at some point — never trusted from the request body alone:
    // 1. Straight after admin signup (session already present, e.g. QA/E2E
    //    where confirm-email is off): adminToken is supplied fresh and
    //    validated here, same as always.
    // 2. Lazily on first login, once email confirmation is done (prod):
    //    the adminToken was already validated at signup time and the intent
    //    was carried forward as `pending_admin` in the user's own signUp()
    //    metadata — pulled from the verified JWT via requireAuth(), not from
    //    anything the client asserts in this request, so it can't be spoofed.
    const hasPendingAdminIntent =
      authUser.user_metadata?.pending_admin === true;

    if (!hasPendingAdminIntent) {
      if (!adminToken || typeof adminToken !== "string") {
        logger.warn("Admin profile creation attempted without admin token", {
          userId: authUser.id,
        });
        throw createError({ statusCode: 403, statusMessage: "Forbidden" });
      }

      const config = useRuntimeConfig(event);
      if (!validateAdminToken(adminToken, config.adminTokenSecret)) {
        logger.warn(
          "Admin profile creation attempted with invalid admin token",
          { userId: authUser.id },
        );
        throw createError({ statusCode: 403, statusMessage: "Forbidden" });
      }
    }

    // Use admin client to bypass RLS
    const supabase = useSupabaseAdmin();

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
