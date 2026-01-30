/**
 * POST /api/account-links/reject
 * Initiator rejects confirmation (after invitee accepts in Step 2)
 *
 * Body:
 *   - linkId: string
 *
 * Auth: Required (initiator must be logged in)
 *
 * Logic:
 * 1. Validate linkId and fetch link
 * 2. Verify current user is the initiator
 * 3. Update status to 'rejected'
 * 4. Create notification for invitee
 * 5. Return success
 */

import { defineEventHandler, readBody, createError } from "h3";
import { requireAuth } from "~/server/utils/auth";
import { createServerSupabaseClient } from "~/server/utils/supabase";
import type { Database } from "~/types/database";

interface RejectRequest {
  linkId: string;
}

type AccountLinkRow = Database["public"]["Tables"]["account_links"]["Row"];

export default defineEventHandler(async (event) => {
  try {
    const user = await requireAuth(event);

    const body = await readBody<RejectRequest>(event);
    const { linkId } = body;

    if (!linkId) {
      throw createError({
        statusCode: 400,
        message: "Missing required field: linkId",
      });
    }

    const supabase = createServerSupabaseClient();

    // Get the link
    const { data: link, error: fetchError } = await supabase
      .from("account_links")
      .select("*")
      .eq("id", linkId)
      .single();

    if (fetchError || !link) {
      throw createError({
        statusCode: 404,
        message: "Link not found",
      });
    }

    const linkData = link as AccountLinkRow;

    // Verify current user is the initiator
    if (linkData.initiator_user_id !== user.id) {
      throw createError({
        statusCode: 403,
        message: "You are not authorized to reject this link",
      });
    }

    // Update status to rejected
    const { error: updateError } = await supabase
      .from("account_links")
      .update({ status: "rejected" })
      .eq("id", linkId);

    if (updateError) {
      throw createError({
        statusCode: 500,
        message: `Failed to reject link: ${updateError.message}`,
      });
    }

    // Get invitee details for notification
    const inviteeId = linkData.player_user_id || linkData.parent_user_id;
    if (inviteeId) {
      try {
        await supabase.from("notifications").insert([
          {
            user_id: inviteeId,
            type: "account_link_rejected",
            title: "Account link request rejected",
            message: "Your account link request was rejected. Please contact the initiator for more information.",
            priority: "medium",
            action_url: "/settings/account-linking",
            scheduled_for: new Date().toISOString(),
          },
        ]);
      } catch (notifyErr) {
        console.warn("Failed to create notification:", notifyErr);
        // Continue despite notification error
      }
    }

    return {
      success: true,
      message: "Link rejected successfully",
      linkId: linkData.id,
    };
  } catch (err) {
    console.error("Error in POST /api/account-links/reject:", err);

    if (err instanceof Error && "statusCode" in err) {
      throw err;
    }

    throw createError({
      statusCode: 500,
      message: "Failed to reject link",
    });
  }
});
