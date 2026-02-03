import { defineEventHandler, readBody, getRequestIP, createError } from "h3";
import { requireAuth, getUserRole } from "~/server/utils/auth";
import { useSupabaseAdmin } from "~/server/utils/supabase";
import {
  isValidFamilyCodeFormat,
  checkRateLimit,
} from "~/server/utils/familyCode";
import type { Database } from "~/types/database";

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
  const familyResponse = await supabase
    .from("family_units")
    .select("id, family_name, student_user_id")
    .eq("family_code", familyCode)
    .single();

  const { data: family, error: familyError } = familyResponse as {
    data: Database["public"]["Tables"]["family_units"]["Row"] | null;
    error: any;
  };

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
  const existingResponse = await supabase
    .from("family_members")
    .select("id")
    .eq("family_unit_id", family.id)
    .eq("user_id", user.id)
    .single();

  const { data: existingMember } = existingResponse as {
    data: Database["public"]["Tables"]["family_members"]["Row"] | null;
    error: any;
  };

  if (existingMember) {
    return {
      success: true,
      message: "You are already a member of this family",
      familyId: family.id,
    };
  }

  // Add parent to family_members
  const memberResponse = await supabase.from("family_members").insert({
    family_unit_id: family.id,
    user_id: user.id,
    role: "parent",
  } as Database["public"]["Tables"]["family_members"]["Insert"]);

  const { error: memberError } = memberResponse as { error: any };

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
  const logPromise = supabase.from("family_code_usage_log").insert({
    family_unit_id: family.id,
    user_id: user.id,
    code_used: familyCode,
    action: "joined",
  } as Database["public"]["Tables"]["family_code_usage_log"]["Insert"]);

  (logPromise as any)
    .then(() => {
      // Success - do nothing
    })
    .catch((err: any) => console.warn("Failed to log join action:", err));

  // Create notification for student (non-blocking, fire-and-forget)
  const notifPromise = supabase.from("notifications").insert({
    user_id: family.student_user_id,
    type: "family_member_joined",
    title: "New family member joined",
    message: `${user.email || "A user"} joined your family`,
    priority: "medium",
  } as any);

  (notifPromise as any)
    .then(() => {
      // Success - do nothing
    })
    .catch((err: any) => console.warn("Notification creation failed:", err));

  return successResponse;
});
