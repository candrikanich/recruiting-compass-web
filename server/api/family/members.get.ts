import { defineEventHandler, createError, getQuery } from "h3";
import { requireAuth } from "~/server/utils/auth";
import { useSupabaseAdmin } from "~/server/utils/supabase";

interface FamilyMemberRow {
  id: string;
  family_unit_id: string;
  user_id: string;
  role: string;
  added_at: string;
}

interface User {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
}

interface FamilyMemberWithUser extends FamilyMemberRow {
  users: User;
}

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

  // Fetch all family members (without relationship to avoid RLS issues)
  const { data: members, error: membersError } = await supabase
    .from("family_members")
    .select("id, family_unit_id, user_id, role, added_at")
    .eq("family_unit_id", familyId)
    .order("added_at", { ascending: true });

  if (membersError) {
    throw createError({
      statusCode: 500,
      message: "Failed to fetch family members",
    });
  }

  // Fetch user details separately to ensure they're retrieved with admin privileges
  if (!members || members.length === 0) {
    console.log(
      `[family/members] No family members found for family ${familyId}`,
    );
    return {
      success: true,
      familyId,
      members: [],
      count: 0,
    };
  }

  console.log(
    `[family/members] Found ${members.length} family members for family ${familyId}`,
  );

  const userIds = (members as FamilyMemberRow[]).map((m) => m.user_id);
  console.log(`[family/members] Fetching user details for IDs:`, userIds);

  const { data: users, error: usersError } = await supabase
    .from("users")
    .select("id, email, full_name, role")
    .in("id", userIds);

  if (usersError) {
    console.error(`[family/members] Error fetching users:`, usersError);
    throw createError({
      statusCode: 500,
      message: `Failed to fetch user details: ${usersError.message}`,
    });
  }

  console.log(
    `[family/members] Successfully fetched ${users?.length || 0} users`,
  );

  // Map user details to family members
  const usersMap = new Map(users?.map((u: User) => [u.id, u]) || []);
  const membersWithUsers: FamilyMemberWithUser[] = (
    members as FamilyMemberRow[]
  ).map((m) => ({
    ...m,
    users: usersMap.get(m.user_id) || {
      id: m.user_id,
      email: "",
      full_name: null,
      role: "",
    },
  }));

  console.log(
    `[family/members] Returning ${membersWithUsers.length} members with user details`,
  );

  return {
    success: true,
    familyId,
    members: membersWithUsers,
    count: membersWithUsers.length,
  };
});
