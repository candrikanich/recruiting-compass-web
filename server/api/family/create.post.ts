import { defineEventHandler, createError } from "h3";
import { requireAuth, getUserRole } from "~/server/utils/auth";
import { useSupabaseAdmin } from "~/server/utils/supabase";
import { generateFamilyCode } from "~/server/utils/familyCode";
import { generateInboundToken } from "~/server/utils/familyInboundToken";
import { useLogger } from "~/server/utils/logger";
import type { Database } from "~/types/database";

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "family/create");
  try {
    const user = await requireAuth(event);
    const supabase = useSupabaseAdmin();

    // Both players and parents can create families
    const userRole = await getUserRole(user.id, supabase);
    logger.debug("Resolved user role", { userRole, userId: user.id });

    // Check if user already has a family
    const fetchResponse = await supabase
      .from("family_units")
      .select("id, family_code")
      .eq("created_by_user_id", user.id)
      .maybeSingle();

    const { data: existingFamily } = fetchResponse as {
      data: Database["public"]["Tables"]["family_units"]["Row"] | null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      error: any;
    };

    if (existingFamily) {
      logger.info("Family already exists", { familyId: existingFamily.id });
      return {
        success: true,
        familyId: existingFamily.id,
        familyCode: existingFamily.family_code,
        message: "Family already exists",
      };
    }

    // The check above only catches families this user CREATED. A player who
    // joined an existing family via invite accept has a family_members row
    // but never created a family_units row — without this check they'd fall
    // through to insert(), and the member-insert below would 500 on
    // idx_player_one_family (a player can only belong to one family).
    const membershipResponse = await supabase
      .from("family_members")
      .select("family_units!inner(id, family_code, family_name)")
      .eq("user_id", user.id)
      .maybeSingle();

    const { data: existingMembership } = membershipResponse as {
      data: {
        family_units: Pick<
          Database["public"]["Tables"]["family_units"]["Row"],
          "id" | "family_code" | "family_name"
        >;
      } | null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      error: any;
    };

    if (existingMembership?.family_units) {
      const family = existingMembership.family_units;
      logger.info("User already belongs to a family via invite", {
        familyId: family.id,
      });
      return {
        success: true,
        familyId: family.id,
        familyCode: family.family_code,
        familyName: family.family_name,
        message: "Family already exists",
      };
    }

    // Generate unique code + inbound-email token (inbound_token is NOT NULL —
    // required for the family-<token>@... inbound-forwarding address)
    const familyCode = await generateFamilyCode(supabase);
    const inboundToken = await generateInboundToken(supabase);

    // Create family unit
    const insertResponse = await supabase
      .from("family_units")
      .insert({
        created_by_user_id: user.id,
        family_name: "My Family",
        family_code: familyCode,
        code_generated_at: new Date().toISOString(),
        inbound_token: inboundToken,
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

    // Add creator to family_members with their actual role
    const memberResponse = await supabase.from("family_members").insert({
      family_unit_id: newFamily.id,
      user_id: user.id,
      role: userRole ?? "player",
    } as Database["public"]["Tables"]["family_members"]["Insert"]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: memberError } = memberResponse as { error: any };

    if (memberError) {
      logger.error("Failed to add user to family members", memberError);
      // Clean up the orphaned family record
      try {
        await supabase.from("family_units").delete().eq("id", newFamily.id);
      } catch (cleanupErr) {
        logger.warn("Failed to clean up orphaned family record", cleanupErr);
      }
      throw createError({
        statusCode: 500,
        message: "Failed to add user to family",
      });
    }

    // Log code generation (fire and forget)
    void supabase
      .from("family_code_usage_log")
      .insert({
        family_unit_id: newFamily.id,
        user_id: user.id,
        code_used: familyCode,
        action: "generated",
      } as Database["public"]["Tables"]["family_code_usage_log"]["Insert"])
      .then(({ error }) => {
        if (error) logger.warn("Failed to log code generation", error);
      });

    logger.info("Family created", { familyId: newFamily.id, familyCode });
    return {
      success: true,
      familyId: newFamily.id,
      familyCode: familyCode,
      familyName: newFamily.family_name,
    };
  } catch (err) {
    if (err instanceof Error && "statusCode" in err) throw err;
    logger.error("Failed to create family", err);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to create family",
    });
  }
});
