/**
 * POST /api/account-links/confirm
 * Initiator confirms link (Step 3 of 3-step linking workflow)
 *
 * Body:
 *   - linkId: string
 *
 * Auth: Required (initiator must be logged in)
 *
 * Logic:
 * 1. Validate linkId and fetch link
 * 2. Verify current user is the initiator
 * 3. Verify status is 'pending_confirmation'
 * 4. Update status to 'accepted' and set confirmed_at
 * 5. Call snapshot_data_ownership RPC to record ownership
 * 6. Create notifications for both users
 * 7. Return success
 */

import { defineEventHandler, readBody, createError } from "h3";
import { requireAuth } from "~/server/utils/auth";
import { createServerSupabaseClient } from "~/server/utils/supabase";
import type { Database } from "~/types/database";

interface ConfirmRequest {
  linkId: string;
}

type AccountLinkRow = Database["public"]["Tables"]["account_links"]["Row"];

export default defineEventHandler(async (event) => {
  try {
    const user = await requireAuth(event);

    const body = await readBody<ConfirmRequest>(event);
    const { linkId } = body;

    if (!linkId) {
      throw createError({
        statusCode: 400,
        message: "Missing required field: linkId",
      });
    }

    const supabase = createServerSupabaseClient();

    // Get the link details
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
        message: "You are not authorized to confirm this link",
      });
    }

    // Verify status is pending_confirmation
    if (linkData.status !== "pending_confirmation") {
      throw createError({
        statusCode: 400,
        message: "This link is not awaiting confirmation",
      });
    }

    // Update status to accepted
    const { error: updateError } = await supabase
      .from("account_links")
      .update({
        status: "accepted",
        confirmed_at: new Date().toISOString(),
      })
      .eq("id", linkId);

    if (updateError) {
      throw createError({
        statusCode: 500,
        message: `Failed to confirm link: ${updateError.message}`,
      });
    }

    // Create/manage family structure and add members
    try {
      const parentId = linkData.parent_user_id;
      const playerId = linkData.player_user_id;

      if (parentId && playerId) {
        // Get or create family unit for the player
        const { data: existingFamily } = await supabase
          .from("family_units")
          .select("id")
          .eq("student_user_id", playerId)
          .single();

        let familyUnitId = existingFamily?.id;

        // Create family unit if it doesn't exist
        if (!familyUnitId) {
          const { data: playerData } = await supabase
            .from("users")
            .select("full_name")
            .eq("id", playerId)
            .single();

          const { data: newFamily, error: familyCreateError } = await supabase
            .from("family_units")
            .insert({
              student_user_id: playerId,
              family_name: playerData?.full_name
                ? `${playerData.full_name}'s Family`
                : "Family",
            })
            .select()
            .single();

          if (familyCreateError) {
            console.warn(
              "[confirm.post] Failed to create family unit:",
              familyCreateError
            );
          } else {
            familyUnitId = newFamily?.id;
          }
        }

        // Add player to family_members as student (if not already there)
        if (familyUnitId && playerId) {
          const { error: studentInsertError } = await supabase
            .from("family_members")
            .insert({
              family_unit_id: familyUnitId,
              user_id: playerId,
              role: "student",
            })
            .onConflict("family_unit_id,user_id")
            .ignore();

          if (studentInsertError) {
            console.warn(
              "[confirm.post] Failed to add student to family:",
              studentInsertError
            );
          }
        }

        // Add parent to family_members as parent
        if (familyUnitId && parentId) {
          const { error: parentInsertError } = await supabase
            .from("family_members")
            .insert({
              family_unit_id: familyUnitId,
              user_id: parentId,
              role: "parent",
            })
            .onConflict("family_unit_id,user_id")
            .ignore();

          if (parentInsertError) {
            console.warn(
              "[confirm.post] Failed to add parent to family:",
              parentInsertError
            );
          }
        }

        // Also add initiator as parent if they're a parent (for parent-parent links)
        if (familyUnitId && linkData.initiator_role === "parent") {
          const { error: initiatorInsertError } = await supabase
            .from("family_members")
            .insert({
              family_unit_id: familyUnitId,
              user_id: linkData.initiator_user_id,
              role: "parent",
            })
            .onConflict("family_unit_id,user_id")
            .ignore();

          if (initiatorInsertError) {
            console.warn(
              "[confirm.post] Failed to add initiator parent to family:",
              initiatorInsertError
            );
          }
        }

        console.log(
          `[confirm.post] Family structure created for player ${playerId}, family: ${familyUnitId}`
        );
      }
    } catch (familyErr) {
      console.warn("Failed to create family structure:", familyErr);
      // Continue despite error - link is still accepted
    }

    // Call snapshot function to record data ownership
    try {
      const parentId = linkData.parent_user_id;
      const playerId = linkData.player_user_id;

      if (parentId && playerId) {
        await supabase.rpc("snapshot_data_ownership", {
          p_link_id: linkId,
          p_parent_id: parentId,
          p_player_id: playerId,
        });
      }
    } catch (snapshotErr) {
      console.warn("Failed to snapshot data ownership:", snapshotErr);
      // Continue despite snapshot error - link is still accepted
    }

    // Get invitee details for notification
    const inviteeId = linkData.player_user_id || linkData.parent_user_id;
    let inviteeName = "Family member";

    if (inviteeId) {
      const { data: invitee } = await supabase
        .from("users")
        .select("full_name")
        .eq("id", inviteeId)
        .single();

      if (invitee?.full_name) {
        inviteeName = invitee.full_name;
      }
    }

    // Create notifications for both users
    try {
      const notifications = [
        // Notification for invitee
        {
          user_id: inviteeId,
          type: "account_link_confirmed",
          title: "Account link confirmed",
          message: "Your account link has been confirmed. Data sharing is now active.",
          priority: "medium",
          action_url: "/settings/account-linking",
          scheduled_for: new Date().toISOString(),
        },
        // Notification for initiator
        {
          user_id: linkData.initiator_user_id,
          type: "account_link_confirmed",
          title: "Account link confirmed",
          message: `Account link with ${inviteeName} confirmed. Data sharing is now active.`,
          priority: "medium",
          action_url: "/settings/account-linking",
          scheduled_for: new Date().toISOString(),
        },
      ];

      await supabase.from("notifications").insert(notifications);
    } catch (notifyErr) {
      console.warn("Failed to create notifications:", notifyErr);
      // Continue despite notification error
    }

    return {
      success: true,
      message: "Link confirmed successfully. Data sharing is now active.",
      linkId: linkData.id,
    };
  } catch (err) {
    console.error("Error in POST /api/account-links/confirm:", err);

    if (err instanceof Error && "statusCode" in err) {
      throw err;
    }

    throw createError({
      statusCode: 500,
      message: "Failed to confirm link",
    });
  }
});
