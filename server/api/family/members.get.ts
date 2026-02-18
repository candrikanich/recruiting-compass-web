import { defineEventHandler, createError, getQuery } from "h3";
import { requireAuth } from "~/server/utils/auth";
import { useSupabaseAdmin } from "~/server/utils/supabase";
import { useLogger } from "~/server/utils/logger";

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
  const logger = useLogger(event, "family/members");
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
    .maybeSingle();

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
    logger.debug("No family members found", { familyId });
    return {
      success: true,
      familyId,
      members: [],
      count: 0,
    };
  }

  logger.debug("Found family members", { count: members.length, familyId });

  const userIds = (members as FamilyMemberRow[]).map((m) => m.user_id);
  logger.debug("Fetching user details", { userIds });

  const { data: users, error: usersError } = await supabase
    .from("users")
    .select("id, email, full_name, role")
    .in("id", userIds);

  if (usersError) {
    logger.error("Failed to fetch user details", usersError);
    throw createError({
      statusCode: 500,
      message: "Failed to fetch user details",
    });
  }

  logger.debug("Successfully fetched users", { count: users?.length ?? 0 });

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

  logger.debug("Returning members with user details", {
    count: membersWithUsers.length,
  });

  return {
    success: true,
    familyId,
    members: membersWithUsers,
    count: membersWithUsers.length,
  };
});
