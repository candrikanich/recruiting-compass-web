import { defineEventHandler } from "h3";
import { requireAuth, getUserRole } from "~/server/utils/auth";
import { useSupabaseAdmin } from "~/server/utils/supabase";
import type { Database } from "~/types/database";

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event);
  const supabase = useSupabaseAdmin();

  const userRole = await getUserRole(user.id, supabase);

  // Students: Get their family code
  if (userRole === "player") {
    const familyResponse = await supabase
      .from("family_units")
      .select("id, family_code, family_name, code_generated_at")
      .eq("player_user_id", user.id)
      .maybeSingle();

    const { data: family } = familyResponse as {
      data: Database["public"]["Tables"]["family_units"]["Row"] | null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      error: any;
    };

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
  const membershipsResponse = await supabase
    .from("family_members")
    .select(
      `
      family_unit_id,
      family_units!inner(id, family_code, family_name, code_generated_at)
    `,
    )
    .eq("user_id", user.id)
    .eq("role", "parent");

  const { data: memberships } = membershipsResponse as {
    data: Array<{
      family_units: {
        id: string;
        family_code: string | null;
        family_name: string | null;
        code_generated_at: string | null;
      };
    }> | null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    error: any;
  };

  return {
    success: true,
    families:
      memberships?.map((m) => ({
        familyId: m.family_units.id,
        familyCode: m.family_units.family_code,
        familyName: m.family_units.family_name,
        codeGeneratedAt: m.family_units.code_generated_at,
      })) || [],
  };
});
