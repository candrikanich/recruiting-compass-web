import { defineEventHandler, createError } from "h3";
import { requireAuth } from "~/server/utils/auth";
import { useSupabaseAdmin } from "~/server/utils/supabase";
import { generateFamilyCode } from "~/server/utils/familyCode";

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event);
  const supabase = useSupabaseAdmin();

  // Only students can create families
  if (user.role !== "student") {
    throw createError({
      statusCode: 403,
      message: "Only students can create families",
    });
  }

  // Check if student already has a family
  const { data: existingFamily } = await supabase
    .from("family_units")
    .select("id, family_code")
    .eq("student_user_id", user.id)
    .single();

  if (existingFamily) {
    return {
      success: true,
      familyId: existingFamily.id,
      familyCode: existingFamily.family_code,
      message: "Family already exists",
    };
  }

  // Generate unique code
  const familyCode = await generateFamilyCode(supabase);

  // Create family unit
  const { data: newFamily, error: familyError } = await supabase
    .from("family_units")
    .insert({
      student_user_id: user.id,
      family_name: user.full_name ? `${user.full_name}'s Family` : "My Family",
      family_code: familyCode,
      code_generated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (familyError || !newFamily) {
    throw createError({
      statusCode: 500,
      message: "Failed to create family",
    });
  }

  // Add student to family_members
  const { error: memberError } = await supabase
    .from("family_members")
    .insert({
      family_unit_id: newFamily.id,
      user_id: user.id,
      role: "student",
    });

  if (memberError) {
    throw createError({
      statusCode: 500,
      message: "Failed to add student to family",
    });
  }

  // Log code generation
  await supabase
    .from("family_code_usage_log")
    .insert({
      family_unit_id: newFamily.id,
      user_id: user.id,
      code_used: familyCode,
      action: "generated",
    })
    .catch((err) => console.warn("Failed to log code generation:", err));

  return {
    success: true,
    familyId: newFamily.id,
    familyCode: familyCode,
    familyName: newFamily.family_name,
  };
});
