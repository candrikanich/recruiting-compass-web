/**
 * DELETE /api/admin/pending-invitations/[id]
 * Deletes a specific pending invitation
 *
 * Requires: Authentication header with valid JWT and is_admin: true
 * RESTRICTED: Admins only
 *
 * Response: { success: boolean }
 */

import { defineEventHandler, createError } from "h3";
import { requireAuth } from "~/server/utils/auth";
import { useSupabaseAdmin } from "~/server/utils/supabase";
import { createLogger } from "~/server/utils/logger";

const logger = createLogger("admin/delete-invitation");

interface DeleteInvitationResponse {
  success: boolean;
}

export default defineEventHandler(
  async (event): Promise<DeleteInvitationResponse> => {
    try {
      // Verify user is authenticated
      const user = await requireAuth(event);

      // Create admin client with service role
      const supabaseAdmin = useSupabaseAdmin();

      // Check admin status
      const { data: adminCheck } = await supabaseAdmin
        .from("users")
        .select("is_admin")
        .eq("id", user.id)
        .single();

      if (!adminCheck?.is_admin) {
        logger.warn(
          `Non-admin user ${user.id} attempted to delete an invitation`,
        );
        throw createError({
          statusCode: 403,
          statusMessage: "Only administrators can delete invitations",
        });
      }

      // Get invitation ID from route parameter
      const invitationId = getRouterParam(event, "id");

      if (!invitationId || typeof invitationId !== "string") {
        throw createError({
          statusCode: 400,
          statusMessage: "Invitation ID is required",
        });
      }

      // Verify invitation exists and is pending
      const { data: invitation, error: fetchError } = await supabaseAdmin
        .from("account_links")
        .select("id, status, invited_email")
        .eq("id", invitationId)
        .single();

      if (fetchError || !invitation) {
        logger.warn(`Invitation not found: ${invitationId}`);
        throw createError({
          statusCode: 404,
          statusMessage: "Invitation not found",
        });
      }

      if (invitation.status !== "pending") {
        logger.warn(
          `Attempted to delete non-pending invitation: ${invitationId}`,
        );
        throw createError({
          statusCode: 400,
          statusMessage: "Only pending invitations can be deleted",
        });
      }

      // Delete the invitation
      const { error: deleteError } = await supabaseAdmin
        .from("account_links")
        .delete()
        .eq("id", invitationId);

      if (deleteError) {
        logger.error(
          `Failed to delete invitation ${invitationId}`,
          deleteError,
        );
        throw createError({
          statusCode: 500,
          statusMessage: "Failed to delete invitation",
        });
      }

      logger.info(
        `Admin ${user.id} deleted invitation ${invitationId} for ${invitation.invited_email}`,
      );

      return { success: true };
    } catch (error) {
      logger.error("Delete invitation endpoint failed", error);

      if (error instanceof Error && "statusCode" in error) {
        throw error;
      }

      throw createError({
        statusCode: 500,
        statusMessage:
          error instanceof Error
            ? error.message
            : "Failed to delete invitation",
      });
    }
  },
);
