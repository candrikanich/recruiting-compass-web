/**
 * GET /api/family/inbound-address
 * Returns the caller's full inbound-forwarding email address for every
 * family they belong to (family-<token>@<domain>) for display in Settings.
 */
import { defineEventHandler, createError } from "h3";
import { useRuntimeConfig } from "#imports";
import { requireAuth } from "~/server/utils/auth";
import { useSupabaseAdmin } from "~/server/utils/supabase";
import { useLogger } from "~/server/utils/logger";
import { resolveFamilyUnitIds } from "~/server/utils/familyMembership";

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "family/inbound-address");
  try {
    const { id: userId } = await requireAuth(event);
    const familyUnitIds = await resolveFamilyUnitIds(event, userId);
    const admin = useSupabaseAdmin();

    const { data: families, error: familiesError } = await admin
      .from("family_units")
      .select("id, inbound_token, family_name")
      .in("id", familyUnitIds);
    if (familiesError || !families) {
      logger.error("Failed to load family inbound tokens", familiesError);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to load inbound address",
      });
    }

    const domain = useRuntimeConfig().public.inboundEmailDomain;
    return {
      addresses: families.map((family) => ({
        familyUnitId: family.id,
        familyName: family.family_name,
        address: `family-${family.inbound_token}@${domain}`,
      })),
    };
  } catch (err) {
    if (err instanceof Error && "statusCode" in err) throw err;
    logger.error("Failed to load inbound address", err);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to load inbound address",
    });
  }
});
