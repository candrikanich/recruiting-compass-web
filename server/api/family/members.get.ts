import { defineEventHandler, createError, getQuery } from "h3";
import { requireAuth } from "~/server/utils/auth";
import { useSupabaseAdmin } from "~/server/utils/supabase";

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event);
  const supabase = useSupabaseAdmin();
  const query = getQuery(event);
  const familyId = query.familyId as string;

  if (!familyId) {
    throw createError({
      statusCode: 400,
      message: "familyId query parameter is required",
    });
  }

  // Verify user has access to this family
  const { data: access, error: accessError } = await supabase
    .from("family_members")
    .select("id")
    .eq("family_unit_id", familyId)
    .eq("user_id", user.id)
    .single();

  if (accessError || !access) {
    throw createError({
      statusCode: 403,
      message: "You do not have access to this family",
    });
  }

  // Fetch all family members with user details
  const { data: members, error: membersError } = await supabase
    .from("family_members")
    .select(
      `
      id,
      family_unit_id,
      user_id,
      role,
      added_at,
      users(id, email, full_name, role)
    `,
    )
    .eq("family_unit_id", familyId)
    .order("added_at", { ascending: true });

  if (membersError) {
    throw createError({
      statusCode: 500,
      message: "Failed to fetch family members",
    });
  }

  return {
    success: true,
    familyId,
    members: members || [],
    count: members?.length || 0,
  };
});
