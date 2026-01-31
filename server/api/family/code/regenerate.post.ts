import { defineEventHandler, readBody, createError } from "h3";
import { requireAuth } from "~/server/utils/auth";
import { useSupabaseAdmin } from "~/server/utils/supabase";
import { generateFamilyCode } from "~/server/utils/familyCode";

interface RegenerateCodeBody {
  familyId: string;
}

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event);
  const body = await readBody<RegenerateCodeBody>(event);
  const { familyId } = body;
  const supabase = useSupabaseAdmin();

  // Verify user is student owner of this family
  const { data: family } = await supabase
    .from("family_units")
    .select("id, student_user_id")
    .eq("id", familyId)
    .single();

  if (!family || family.student_user_id !== user.id) {
    throw createError({
      statusCode: 403,
      message: "Only the family owner can regenerate the code",
    });
  }

  // Generate new code
  const newCode = await generateFamilyCode(supabase);

  // Update family
  const { error } = await supabase
    .from("family_units")
    .update({
      family_code: newCode,
      code_generated_at: new Date().toISOString(),
    })
    .eq("id", familyId);

  if (error) {
    throw createError({
      statusCode: 500,
      message: "Failed to regenerate code",
    });
  }

  // Log regeneration
  await supabase
    .from("family_code_usage_log")
    .insert({
      family_unit_id: familyId,
      user_id: user.id,
      code_used: newCode,
      action: "regenerated",
    })
    .catch((err) => console.warn("Failed to log regeneration:", err));

  return {
    success: true,
    familyCode: newCode,
  };
});
