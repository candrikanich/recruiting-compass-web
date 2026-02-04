import { defineEventHandler, createError } from "h3";
import { requireAuth, getUserRole } from "~/server/utils/auth";
import { useSupabaseAdmin } from "~/server/utils/supabase";
import { generateFamilyCode } from "~/server/utils/familyCode";
import type { Database } from "~/types/database";

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event);
  const supabase = useSupabaseAdmin();

  // Only students can create families
  const userRole = await getUserRole(user.id, supabase);
  if (userRole !== "student") {
    throw createError({
      statusCode: 403,
      message: "Only students can create families",
    });
  }

  // Check if student already has a family
  const fetchResponse = await supabase
    .from("family_units")
    .select("id, family_code")
    .eq("student_user_id", user.id)
    .maybeSingle();

  const { data: existingFamily } = fetchResponse as {
    data: Database["public"]["Tables"]["family_units"]["Row"] | null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    error: any;
  };

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
  const insertResponse = await supabase
    .from("family_units")
    .insert({
      student_user_id: user.id,
      family_name: "My Family",
      family_code: familyCode,
      code_generated_at: new Date().toISOString(),
    } as Database["public"]["Tables"]["family_units"]["Insert"])
    .select()
    .single();

  const { data: newFamily, error: familyError } = insertResponse as {
    data: Database["public"]["Tables"]["family_units"]["Row"] | null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    error: any;
  };

  if (familyError || !newFamily) {
    throw createError({
      statusCode: 500,
      message: "Failed to create family",
    });
  }

  // Add student to family_members
  const memberResponse = await supabase.from("family_members").insert({
    family_unit_id: newFamily.id,
    user_id: user.id,
    role: "student",
  } as Database["public"]["Tables"]["family_members"]["Insert"]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: memberError } = memberResponse as { error: any };

  if (memberError) {
    throw createError({
      statusCode: 500,
      message: "Failed to add student to family",
    });
  }

  // Log code generation
  const logResponse = await supabase.from("family_code_usage_log").insert({
    family_unit_id: newFamily.id,
    user_id: user.id,
    code_used: familyCode,
    action: "generated",
  } as Database["public"]["Tables"]["family_code_usage_log"]["Insert"]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (logResponse as any).catch((err: any) =>
    console.warn("Failed to log code generation:", err),
  );

  return {
    success: true,
    familyId: newFamily.id,
    familyCode: familyCode,
    familyName: newFamily.family_name,
  };
});
