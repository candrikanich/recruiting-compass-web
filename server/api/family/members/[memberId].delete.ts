import { defineEventHandler, createError } from "h3";
import { requireAuth } from "~/server/utils/auth";
import { useSupabaseAdmin } from "~/server/utils/supabase";
import { useLogger } from "~/server/utils/logger";
import { requireUuidParam } from "~/server/utils/validation";

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "family/members/delete");
  const user = await requireAuth(event);
  const memberId = requireUuidParam(event, "memberId");
  const supabase = useSupabaseAdmin();

  // Fetch member with family details
  const memberResponse = await supabase
    .from("family_members")
    .select(
      `
      id,
      family_unit_id,
      user_id,
      role,
      family_units(id, family_name, player_user_id),
      users(id, email)
    `,
    )
    .eq("id", memberId)
    .single();

  const { data: member, error: memberError } = memberResponse as {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    error: any;
  };

  if (memberError) {
    logger.error("Failed to fetch family member", memberError);
    throw createError({
      statusCode: 500,
      message: "Failed to fetch member details",
    });
  }

  if (!member) {
    throw createError({
      statusCode: 404,
      message: "Member not found",
    });
  }

  // Verify requester is the player who owns the family
  const family = member.family_units as unknown as {
    id: string;
    family_name: string;
    player_user_id: string;
  };

  if (!family || !family.player_user_id) {
    throw createError({
      statusCode: 500,
      message: "Family data not found for member",
    });
  }

  if (family.player_user_id !== user.id) {
    throw createError({
      statusCode: 403,
      message: "Only the family owner can remove members",
    });
  }

  // Prevent self-removal
  if (member.user_id === user.id) {
    throw createError({
      statusCode: 400,
      message: "You cannot remove yourself from the family",
    });
  }

  // Verify target is a parent
  if (member.role !== "parent") {
    throw createError({
      statusCode: 400,
      message: "Only parents can be removed",
    });
  }

  // Delete the family_members record
  const deleteResponse = await supabase
    .from("family_members")
    .delete()
    .eq("id", memberId);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: deleteError } = deleteResponse as { error: any };

  if (deleteError) {
    logger.error("Failed to delete family member", deleteError);
    throw createError({
      statusCode: 500,
      message: "Failed to remove member",
    });
  }

  // Return success immediately - other operations run in background
  // (Fire-and-forget operations that don't block the response)

  // Log action (non-blocking)
  const logPromise = supabase.from("family_code_usage_log").insert({
    family_unit_id: family.id,
    user_id: user.id,
    action: "removed_member",
    code_used: "",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (logPromise as any)
    .then(() => {
      // Success - do nothing
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .catch((err: any) => logger.warn("Failed to log removal action", err));

  // Get member info for notifications
  const memberInfo = member.users as unknown as {
    id: string;
    email: string;
  } | null;

  // Create notifications in background (non-blocking, fire-and-forget)
  if (memberInfo) {
    const notif1Promise = supabase.from("notifications").insert({
      user_id: memberInfo.id,
      type: "family_member_removed",
      title: "Removed from family",
      message: `You have been removed from ${family.family_name}`,
      priority: "high",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (notif1Promise as any)
      .then(() => {
        // Success - do nothing
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .catch((err: any) =>
        logger.warn("Failed to create parent notification", err),
      );

    const notif2Promise = supabase.from("notifications").insert({
      user_id: user.id,
      type: "family_member_removed",
      title: "Family member removed",
      message: `${memberInfo.email} has been removed from your family`,
      priority: "low",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (notif2Promise as any)
      .then(() => {
        // Success - do nothing
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .catch((err: any) =>
        logger.warn("Failed to create student notification", err),
      );
  }

  return {
    success: true,
    message: "Member removed successfully",
  };
});
