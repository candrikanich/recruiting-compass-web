/**
 * POST /api/auth/admin-profile
 * Creates or updates an admin user profile
 * Uses service role credentials to bypass RLS
 */

import { defineEventHandler, readBody, createError } from "h3";
import { createLogger } from "~/server/utils/logger";
import { useSupabaseAdmin } from "~/server/utils/supabase";

interface AdminProfileRequest {
  userId: string;
  email: string;
  fullName: string;
}

const logger = createLogger("auth/admin-profile");

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody<AdminProfileRequest>(event);
    const { userId, email, fullName } = body;

    if (!userId || !email) {
      throw createError({
        statusCode: 400,
        statusMessage: "userId and email are required",
      });
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
      .eq("id", userId);

    if (error) {
      logger.error("Failed to create admin profile", error);
      throw createError({
        statusCode: 500,
        statusMessage: error.message || "Failed to create admin profile",
      });
    }

    logger.info(`Admin profile created for user ${userId}`);

    return { success: true };
  } catch (err) {
    logger.error("Admin profile creation failed", err);

    if (err instanceof Error && "statusCode" in err) {
      throw err;
    }

    throw createError({
      statusCode: 500,
      statusMessage: err instanceof Error ? err.message : "Profile creation failed",
    });
  }
});
