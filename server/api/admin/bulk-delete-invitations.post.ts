/**
 * POST /api/admin/bulk-delete-invitations
 * Deletes multiple pending invitations at once
 *
 * Requires: Authentication header with valid JWT and is_admin: true
 * RESTRICTED: Admins only
 *
 * Request body: { invitationIds: string[] }
 * Response: { deletedCount: number }
 */

import { defineEventHandler, readBody, createError } from "h3";
import { requireAuth } from "~/server/utils/auth";
import { useSupabaseAdmin } from "~/server/utils/supabase";
import { createLogger } from "~/server/utils/logger";

const logger = createLogger("admin/bulk-delete-invitations");

interface BulkDeleteInvitationsRequest {
  invitationIds: string[];
}

interface BulkDeleteInvitationsResponse {
  deletedCount: number;
}

export default defineEventHandler(
  async (event): Promise<BulkDeleteInvitationsResponse> => {
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
        logger.warn(`Non-admin user ${user.id} attempted to bulk delete invitations`);
        throw createError({
          statusCode: 403,
          statusMessage: "Only administrators can delete invitations",
        });
      }

      // Parse and validate request body
      const body = await readBody<BulkDeleteInvitationsRequest>(event);
      const { invitationIds } = body;

      if (!Array.isArray(invitationIds) || invitationIds.length === 0) {
        throw createError({
          statusCode: 400,
          statusMessage: "At least one invitation ID is required",
        });
      }

      // Validate all IDs are strings
      if (!invitationIds.every((id) => typeof id === "string" && id.length > 0)) {
        throw createError({
          statusCode: 400,
          statusMessage: "All invitation IDs must be non-empty strings",
        });
      }

      // Delete all pending invitations with matching IDs
      const { error: deleteError, count } = await supabaseAdmin
        .from("account_links")
        .delete()
        .in("id", invitationIds)
        .eq("status", "pending");

      if (deleteError) {
        logger.error(`Failed to bulk delete invitations`, deleteError);
        throw createError({
          statusCode: 500,
          statusMessage: "Failed to delete invitations",
        });
      }

      logger.info(
        `Admin ${user.id} bulk deleted ${count || 0} pending invitations`,
      );

      return { deletedCount: count || 0 };
    } catch (error) {
      logger.error("Bulk delete invitations endpoint failed", error);

      if (error instanceof Error && "statusCode" in error) {
        throw error;
      }

      throw createError({
        statusCode: 500,
        statusMessage:
          error instanceof Error ? error.message : "Failed to delete invitations",
      });
    }
  },
);
