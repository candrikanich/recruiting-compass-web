/**
 * GET /api/family/inbound-address
 * Returns the caller's family's full inbound-forwarding email address
 * (family-<token>@<domain>) for display in Settings.
 */
import { defineEventHandler, createError } from "h3";
import { useRuntimeConfig } from "#imports";
import { requireAuth } from "~/server/utils/auth";
import { useSupabaseAdmin } from "~/server/utils/supabase";
import { useLogger } from "~/server/utils/logger";
import { resolveFamilyUnitId } from "~/server/utils/familyMembership";

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "family/inbound-address");
  try {
    const { id: userId } = await requireAuth(event);
    const familyUnitId = await resolveFamilyUnitId(event, userId);
    const admin = useSupabaseAdmin();

    const { data: family, error: familyError } = await admin
      .from("family_units")
      .select("inbound_token")
      .eq("id", familyUnitId)
      .single();
    if (familyError || !family) {
      logger.error("Failed to load family inbound token", familyError);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to load inbound address",
      });
    }

    const domain = useRuntimeConfig().public.inboundEmailDomain;
    return { address: `family-${family.inbound_token}@${domain}` };
  } catch (err) {
    if (err instanceof Error && "statusCode" in err) throw err;
    logger.error("Failed to load inbound address", err);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to load inbound address",
    });
  }
});
