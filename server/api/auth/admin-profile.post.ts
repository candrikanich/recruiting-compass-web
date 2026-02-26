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
import { createLogger } from "~/server/utils/logger";
import { useSupabaseAdmin } from "~/server/utils/supabase";
import { requireAuth } from "~/server/utils/auth";

interface AdminProfileRequest {
  email: string;
  fullName: string;
  adminToken: string;
}

const logger = createLogger("auth/admin-profile");

export default defineEventHandler(async (event) => {
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

    // Require a valid admin token — prevents unauthenticated privilege escalation.
    if (!adminToken || typeof adminToken !== "string") {
      logger.warn("Admin profile creation attempted without admin token", {
        userId: authUser.id,
      });
      throw createError({ statusCode: 403, statusMessage: "Forbidden" });
    }

    const config = useRuntimeConfig(event);
    if (!validateAdminToken(adminToken, config.adminTokenSecret)) {
      logger.warn("Admin profile creation attempted with invalid admin token", {
        userId: authUser.id,
      });
      throw createError({ statusCode: 403, statusMessage: "Forbidden" });
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
