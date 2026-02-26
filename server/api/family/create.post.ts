import { defineEventHandler, createError } from "h3";
import { requireAuth, getUserRole } from "~/server/utils/auth";
import { useSupabaseAdmin } from "~/server/utils/supabase";
import { generateFamilyCode } from "~/server/utils/familyCode";
import { useLogger } from "~/server/utils/logger";
import type { Database } from "~/types/database";

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "family/create");
  try {
  const user = await requireAuth(event);
  const supabase = useSupabaseAdmin();

  // Only players can create families
  const userRole = await getUserRole(user.id, supabase);
  logger.debug("Resolved user role", { userRole, userId: user.id });
  if (userRole !== "player") {
    throw createError({
      statusCode: 403,
      message: "Only players can create families",
    });
  }

  // Check if player already has a family
  const fetchResponse = await supabase
    .from("family_units")
    .select("id, family_code")
    .eq("player_user_id", user.id)
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
      player_user_id: user.id,
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
    logger.error("Family creation failed", familyError);
    throw createError({
      statusCode: 500,
      message: "Failed to create family",
    });
  }

  // Add player to family_members
  const memberResponse = await supabase.from("family_members").insert({
    family_unit_id: newFamily.id,
    user_id: user.id,
    role: "player",
  } as Database["public"]["Tables"]["family_members"]["Insert"]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: memberError } = memberResponse as { error: any };

  if (memberError) {
    logger.error("Failed to add player to family members", memberError);
    // Clean up the orphaned family record
    try {
      await supabase.from("family_units").delete().eq("id", newFamily.id);
    } catch (cleanupErr) {
      logger.warn("Failed to clean up orphaned family record", cleanupErr);
    }
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
    logger.warn("Failed to log code generation", err),
  );

  return {
    success: true,
    familyId: newFamily.id,
    familyCode: familyCode,
    familyName: newFamily.family_name,
  };
  } catch (err) {
    if (err instanceof Error && "statusCode" in err) throw err;
    logger.error("Failed to create family", err);
    throw createError({ statusCode: 500, statusMessage: "Failed to create family" });
  }
});
