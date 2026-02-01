import { defineEventHandler } from "h3";
import { requireAuth } from "~/server/utils/auth";
import { useSupabaseAdmin } from "~/server/utils/supabase";

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event);
  const supabase = useSupabaseAdmin();

  // Students: Get their family code
  if (user.role === "student") {
    const { data: family } = await supabase
      .from("family_units")
      .select("id, family_code, family_name, code_generated_at")
      .eq("student_user_id", user.id)
      .single();

    return {
      success: true,
      hasFamily: !!family,
      familyId: family?.id || null,
      familyCode: family?.family_code || null,
      familyName: family?.family_name || null,
      codeGeneratedAt: family?.code_generated_at || null,
    };
  }

  // Parents: Get codes for families they belong to
  const { data: memberships } = await supabase
    .from("family_members")
    .select(
      `
      family_unit_id,
      family_units!inner(id, family_code, family_name, code_generated_at)
    `,
    )
    .eq("user_id", user.id)
    .eq("role", "parent");

  type MembershipRow = {
    family_units: {
      id: string;
      family_code: string | null;
      family_name: string | null;
      code_generated_at: string | null;
    };
  };

  return {
    success: true,
    families:
      memberships?.map((m: MembershipRow) => ({
        familyId: m.family_units.id,
        familyCode: m.family_units.family_code,
        familyName: m.family_units.family_name,
        codeGeneratedAt: m.family_units.code_generated_at,
      })) || [],
  };
});
