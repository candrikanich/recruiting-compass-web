/**
 * GET /api/admin/pending-invitations
 * Lists pending account link invitations (invited_email, status, created_at).
 * Requires: Authentication + is_admin.
 * Returns empty list if account_links table is not present (e.g. after migration 024).
 */

import { defineEventHandler, createError } from "h3";
import { requireAuth } from "~/server/utils/auth";
import { useSupabaseAdmin } from "~/server/utils/supabase";
import { createLogger } from "~/server/utils/logger";

const logger = createLogger("admin/pending-invitations");

export interface PendingInvitation {
  id: string;
  invited_email: string;
  status: string;
  initiator_role: string;
  created_at: string | null;
}

export interface PendingInvitationsResponse {
  invitations: PendingInvitation[];
  error?: string;
}

export default defineEventHandler(
  async (event): Promise<PendingInvitationsResponse> => {
    try {
      const user = await requireAuth(event);
      const supabaseAdmin = useSupabaseAdmin();

      const { data: adminCheck } = await supabaseAdmin
        .from("users")
        .select("is_admin")
        .eq("id", user.id)
        .single();

      if (!adminCheck?.is_admin) {
        logger.warn(
          `Non-admin user ${user.id} attempted to list pending invitations`,
        );
        throw createError({
          statusCode: 403,
          statusMessage: "Only administrators can view pending invitations",
        });
      }

      const { data: rows, error } = await supabaseAdmin
        .from("account_links")
        .select("id, invited_email, status, initiator_role, created_at")
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) {
        // Table may have been dropped (migration 024)
        logger.warn(
          "Pending invitations fetch failed (table may not exist)",
          error,
        );
        return {
          invitations: [],
          error: "Invitations table not available",
        };
      }

      return {
        invitations: (rows ?? []) as PendingInvitation[],
      };
    } catch (error) {
      logger.error("Admin pending-invitations endpoint failed", error);
      if (error instanceof Error && "statusCode" in error) {
        throw error;
      }
      throw createError({
        statusCode: 500,
        statusMessage:
          error instanceof Error
            ? error.message
            : "Failed to fetch pending invitations",
      });
    }
  },
);
