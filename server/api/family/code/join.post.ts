import { defineEventHandler, readBody, getRequestIP, createError } from "h3";
import { requireAuth, getUserRole } from "~/server/utils/auth";
import { useSupabaseAdmin } from "~/server/utils/supabase";
import {
  isValidFamilyCodeFormat,
  checkRateLimit,
} from "~/server/utils/familyCode";

interface JoinByCodeBody {
  familyCode: string;
}

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event);
  const body = await readBody<JoinByCodeBody>(event);
  const { familyCode } = body;
  const supabase = useSupabaseAdmin();

  // Get user role from database
  const userRole = await getUserRole(user.id, supabase);
  if (userRole !== "parent") {
    throw createError({
      statusCode: 403,
      message: "Only parents can join families using codes",
    });
  }

  // Rate limiting
  const ip = getRequestIP(event) || "unknown";
  if (!checkRateLimit(ip)) {
    throw createError({
      statusCode: 429,
      message: "Too many attempts. Please try again in 5 minutes.",
    });
  }

  // Validate format
  if (!isValidFamilyCodeFormat(familyCode)) {
    throw createError({
      statusCode: 400,
      message: "Invalid family code format. Expected: FAM-XXXXXX",
    });
  }

  // Find family by code
  const { data: family, error: familyError } = await supabase
    .from("family_units")
    .select("id, family_name, student_user_id")
    .eq("family_code", familyCode)
    .single();

  if (familyError || !family) {
    throw createError({
      statusCode: 404,
      message: "Family code not found. Please check and try again.",
    });
  }

  // Prevent joining own family
  if (family.student_user_id === user.id) {
    throw createError({
      statusCode: 400,
      message: "You cannot join your own family",
    });
  }

  // Check if already a member
  const { data: existingMember } = await supabase
    .from("family_members")
    .select("id")
    .eq("family_unit_id", family.id)
    .eq("user_id", user.id)
    .single();

  if (existingMember) {
    return {
      success: true,
      message: "You are already a member of this family",
      familyId: family.id,
    };
  }

  // Add parent to family_members
  const { error: memberError } = await supabase.from("family_members").insert({
    family_unit_id: family.id,
    user_id: user.id,
    role: "parent",
  });

  if (memberError) {
    throw createError({
      statusCode: 500,
      message: "Failed to join family",
    });
  }

  // Return success immediately - other operations run in background
  const successResponse = {
    success: true,
    familyId: family.id,
    familyName: family.family_name,
    message: `Successfully joined ${family.family_name}`,
  };

  // Log usage (non-blocking, fire-and-forget)
  supabase
    .from("family_code_usage_log")
    .insert({
      family_unit_id: family.id,
      user_id: user.id,
      code_used: familyCode,
      action: "joined",
    })
    .then(() => {
      // Success - do nothing
    })
    .catch((err) => console.warn("Failed to log join action:", err));

  // Create notification for student (non-blocking, fire-and-forget)
  supabase
    .from("notifications")
    .insert({
      user_id: family.student_user_id,
      type: "family_member_joined",
      title: "New family member joined",
      message: `${user.full_name || user.email} joined your family`,
      priority: "medium",
    })
    .then(() => {
      // Success - do nothing
    })
    .catch((err) => console.warn("Notification creation failed:", err));

  return successResponse;
});
