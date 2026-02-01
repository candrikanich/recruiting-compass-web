import { defineEventHandler, createError } from "h3";
import { requireAuth } from "~/server/utils/auth";
import { useSupabaseAdmin } from "~/server/utils/supabase";

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event);
  const memberId = event.context.params?.memberId as string;
  const supabase = useSupabaseAdmin();

  if (!memberId) {
    throw createError({
      statusCode: 400,
      message: "Member ID is required",
    });
  }

  // Fetch member with family details
  const { data: member, error: memberError } = await supabase
    .from("family_members")
    .select(
      `
      id,
      family_unit_id,
      user_id,
      role,
      family_units(id, family_name, student_user_id),
      users(id, email, full_name, role)
    `,
    )
    .eq("id", memberId)
    .single();

  if (memberError || !member) {
    throw createError({
      statusCode: 404,
      message: "Member not found",
    });
  }

  // Verify requester is the student who owns the family
  const family = member.family_units as unknown as {
    id: string;
    family_name: string;
    student_user_id: string;
  };

  if (family.student_user_id !== user.id) {
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
  const { error: deleteError } = await supabase
    .from("family_members")
    .delete()
    .eq("id", memberId);

  if (deleteError) {
    throw createError({
      statusCode: 500,
      message: "Failed to remove member",
    });
  }

  // Log action to family_code_usage_log
  await supabase
    .from("family_code_usage_log")
    .insert({
      family_unit_id: family.id,
      user_id: user.id,
      action: "removed_member",
      code_used: null,
    })
    .catch((err) => console.warn("Failed to log removal action:", err));

  // Get member info for notifications
  const memberInfo = member.users as unknown as {
    id: string;
    email: string;
    full_name: string | null;
    role: string;
  };

  // Create notification for removed parent (HIGH priority)
  await supabase
    .from("notifications")
    .insert({
      user_id: memberInfo.id,
      type: "family_member_removed",
      title: "Removed from family",
      message: `You have been removed from ${family.family_name}`,
      priority: "high",
    })
    .catch((err) => console.warn("Failed to create parent notification:", err));

  // Create notification for student (LOW priority)
  await supabase
    .from("notifications")
    .insert({
      user_id: user.id,
      type: "family_member_removed",
      title: "Family member removed",
      message: `${memberInfo.full_name || memberInfo.email} has been removed from your family`,
      priority: "low",
    })
    .catch((err) =>
      console.warn("Failed to create student notification:", err),
    );

  return {
    success: true,
    message: "Member removed successfully",
  };
});
