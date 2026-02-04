/**
 * GET endpoint for testing user deletion (temporary workaround for CSRF issues)
 * In production, use the POST endpoint with proper CSRF tokens
 */

import { defineEventHandler, createError, getQuery } from "h3";
import { requireAuth } from "~/server/utils/auth";
import { createLogger } from "~/server/utils/logger";

interface DeleteUserResponse {
  success: boolean;
  message: string;
}

const logger = createLogger("admin/delete-user");

export default defineEventHandler(
  async (event): Promise<DeleteUserResponse> => {
    try {
      const user = await requireAuth(event);

      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      const supabaseUrl = process.env.NUXT_PUBLIC_SUPABASE_URL;

      if (!supabaseServiceKey || !supabaseUrl) {
        logger.error("Missing Supabase configuration");
        throw createError({
          statusCode: 500,
          statusMessage: "Server configuration error",
        });
      }

      const { createClient } = await import("@supabase/supabase-js");
      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

      // Check if user is admin
      const { data: userData } = await supabaseAdmin
        .from("users")
        .select("is_admin")
        .eq("id", user.id)
        .single();

      if (!userData?.is_admin) {
        logger.warn(`Non-admin user ${user.id} attempted to delete a user`);
        throw createError({
          statusCode: 403,
          statusMessage: "Only administrators can delete users",
        });
      }

      // Get email from query string
      const query = getQuery(event);
      const email = query.email as string;

      if (!email || typeof email !== "string") {
        throw createError({
          statusCode: 400,
          statusMessage: "Email address is required",
        });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        throw createError({
          statusCode: 400,
          statusMessage: "Invalid email address format",
        });
      }

      const targetEmail = email.trim();

      // Prevent deleting your own account (check email from auth user)
      if (targetEmail === user.email) {
        throw createError({
          statusCode: 400,
          statusMessage:
            "Cannot delete your own account via this endpoint. Use account settings instead.",
        });
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await (supabaseAdmin.auth.admin as any).listUsers();

      const {
        data: { users },
        error: listError,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } = response as { data: { users: any[] }; error: any };

      if (listError || !users) {
        throw createError({
          statusCode: 500,
          statusMessage: "Failed to list users",
        });
      }

      const targetUser = users.find(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (u: any) => u.email?.toLowerCase() === targetEmail.toLowerCase(),
      );

      if (!targetUser?.id) {
        throw createError({
          statusCode: 404,
          statusMessage: "User not found",
        });
      }

      const targetUserId = targetUser.id;

      const { error: deleteError } =
        await supabaseAdmin.auth.admin.deleteUser(targetUserId);

      if (deleteError) {
        logger.error(
          `Failed to delete user ${targetUserId} (${targetEmail})`,
          deleteError,
        );
        throw createError({
          statusCode: 500,
          statusMessage: "Failed to delete user",
        });
      }

      logger.info(
        `User ${targetEmail} (${targetUserId}) deleted by admin ${user.id}`,
      );

      return {
        success: true,
        message: `User ${targetEmail} and all associated data have been permanently deleted`,
      };
    } catch (error) {
      logger.error("Delete user endpoint failed", error);

      if (error instanceof Error && "statusCode" in error) {
        throw error;
      }

      throw createError({
        statusCode: 500,
        statusMessage:
          error instanceof Error ? error.message : "Failed to delete user",
      });
    }
  },
);
