import { defineEventHandler, createError } from "h3";
import { z } from "zod";
import { requireAuth } from "~/server/utils/auth";
import { useSupabaseAdmin } from "~/server/utils/supabase";
import { generateFamilyCode } from "~/server/utils/familyCode";
import { useLogger } from "~/server/utils/logger";
import { validateBody } from "~/server/utils/validation";
import type { Database } from "~/types/database";

const regenerateCodeSchema = z.object({
  familyId: z.string().uuid(),
});

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "family/code/regenerate");
  try {
  const user = await requireAuth(event);
  const { familyId } = await validateBody(event, regenerateCodeSchema);
  const supabase = useSupabaseAdmin();

  // Verify user is student owner of this family
  const familyResponse = await supabase
    .from("family_units")
    .select("id, player_user_id")
    .eq("id", familyId)
    .single();

  const { data: family } = familyResponse as {
    data: Database["public"]["Tables"]["family_units"]["Row"] | null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    error: any;
  };

  if (!family || family.player_user_id !== user.id) {
    throw createError({
      statusCode: 403,
      message: "Only the family owner can regenerate the code",
    });
  }

  // Generate new code
  const newCode = await generateFamilyCode(supabase);

  // Update family
  const updateResponse = await supabase
    .from("family_units")
    .update({
      family_code: newCode,
      code_generated_at: new Date().toISOString(),
    } as Database["public"]["Tables"]["family_units"]["Update"])
    .eq("id", familyId);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = updateResponse as { error: any };

  if (error) {
    throw createError({
      statusCode: 500,
      message: "Failed to regenerate code",
    });
  }

  // Log regeneration

  const logPromise = supabase.from("family_code_usage_log").insert({
    family_unit_id: familyId,
    user_id: user.id,
    code_used: newCode,
    action: "regenerated",
  } as Database["public"]["Tables"]["family_code_usage_log"]["Insert"]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (logPromise as any).catch(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (err: any) => logger.warn("Failed to log regeneration", err),
  );

  return {
    success: true,
    familyCode: newCode,
  };
  } catch (err) {
    if (err instanceof Error && "statusCode" in err) throw err;
    logger.error("Failed to regenerate family code", err);
    throw createError({ statusCode: 500, statusMessage: "Failed to regenerate family code" });
  }
});
