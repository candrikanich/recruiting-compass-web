/**
 * POST /api/account-links/accept
 * Invitee accepts invitation (Step 2 of 3-step linking workflow)
 *
 * Body:
 *   - token: string (invitation token from email link)
 *
 * Auth: Required (invitee must be logged in)
 *
 * Logic:
 * 1. Validate token and find link
 * 2. Verify logged-in user email matches invited_email
 * 3. Update status to 'pending_confirmation'
 * 4. Set accepted_at timestamp
 * 5. Set user ID (parent_user_id or player_user_id) based on invitee's role
 * 6. Create notification for initiator
 * 7. Return success
 */

import { defineEventHandler, readBody, createError } from "h3";
import { requireAuth } from "~/server/utils/auth";
import { createServerSupabaseClient } from "~/server/utils/supabase";
import type { Database } from "~/types/database";

interface AcceptRequest {
  token: string;
}

type AccountLinkRow = Database["public"]["Tables"]["account_links"]["Row"];

export default defineEventHandler(async (event) => {
  try {
    const user = await requireAuth(event);

    const body = await readBody<AcceptRequest>(event);
    const { token } = body;

    if (!token) {
      throw createError({
        statusCode: 400,
        message: "Missing required field: token",
      });
    }

    const supabase = createServerSupabaseClient();

    // Find link by invitation token
    const { data: link, error: fetchError } = await supabase
      .from("account_links")
      .select("*")
      .eq("invitation_token", token)
      .single();

    if (fetchError || !link) {
      throw createError({
        statusCode: 404,
        message: "Invitation not found or is invalid",
      });
    }

    const linkData = link as AccountLinkRow;

    // Check if invitation has expired
    if (new Date(linkData.expires_at || "") < new Date()) {
      throw createError({
        statusCode: 400,
        message: "This invitation has expired",
      });
    }

    // Verify logged-in user email matches invited_email
    if (
      linkData.invited_email?.toLowerCase() !== user.email?.toLowerCase()
    ) {
      throw createError({
        statusCode: 403,
        message: "This invitation was sent to a different email address",
      });
    }

    // Prepare update based on invitee's role
    const updateData: Database["public"]["Tables"]["account_links"]["Update"] = {
      status: "pending_confirmation",
      accepted_at: new Date().toISOString(),
    };

    // Set the appropriate user ID field based on invitee's role
    if (user.role === "parent") {
      updateData.parent_user_id = user.id;
    } else if (user.role === "student") {
      updateData.player_user_id = user.id;
    }

    // Update link status to pending_confirmation
    const { error: updateError } = await supabase
      .from("account_links")
      .update(updateData)
      .eq("id", linkData.id);

    if (updateError) {
      throw createError({
        statusCode: 500,
        message: `Failed to accept invitation: ${updateError.message}`,
      });
    }

    // Create notification for initiator
    try {
      await supabase.from("notifications").insert([
        {
          user_id: linkData.initiator_user_id,
          type: "account_link_invitation_accepted",
          title: `${user.full_name} accepted your invitation`,
          message: `${user.full_name} has accepted your invitation. Please confirm this is the person you invited.`,
          priority: "high",
          action_url: "/settings/account-linking",
          scheduled_for: new Date().toISOString(),
        },
      ]);
    } catch (notifyErr) {
      console.warn("Failed to create notification:", notifyErr);
      // Continue despite notification error - link was updated successfully
    }

    return {
      success: true,
      message: "Invitation accepted successfully",
      linkId: linkData.id,
    };
  } catch (err) {
    console.error("Error in POST /api/account-links/accept:", err);

    if (err instanceof Error && "statusCode" in err) {
      throw err;
    }

    throw createError({
      statusCode: 500,
      message: "Failed to accept invitation",
    });
  }
});
