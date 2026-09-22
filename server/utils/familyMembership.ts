import type { H3Event } from "h3";
import { createError } from "h3";
import { useSupabaseAdmin } from "~/server/utils/supabase";
import { useLogger } from "~/server/utils/logger";

/**
 * Resolves the caller's family_unit_id(s) from `family_members`. A parent can
 * belong to more than one family (multi-family support, #141/#812), so this
 * always returns an array rather than assuming a single membership row.
 *
 * Throws 403 when the caller has zero membership rows, and 500 when the
 * lookup itself fails (a real DB error must never be reported to the user as
 * "not a family member"). Centralizes the ownership-check every inbound-email
 * endpoint needs before touching family-scoped data via the admin client.
 */
export async function resolveFamilyUnitIds(
  event: H3Event,
  userId: string,
): Promise<string[]> {
  const admin = useSupabaseAdmin();
  const logger = useLogger(event, "family-membership");

  const { data: memberships, error } = await admin
    .from("family_members")
    .select("family_unit_id")
    .eq("user_id", userId);

  if (error) {
    logger.error("Failed to resolve family membership", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to resolve family membership",
    });
  }
  if (!memberships || memberships.length === 0) {
    throw createError({
      statusCode: 403,
      statusMessage: "Not a family member",
    });
  }

  return memberships.map((m) => m.family_unit_id);
}
