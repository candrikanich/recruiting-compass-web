import type { H3Event } from "h3";
import { createError } from "h3";
import { useSupabaseAdmin } from "~/server/utils/supabase";
import { useLogger } from "~/server/utils/logger";

/**
 * Resolves the caller's family_unit_id from `family_members`.
 *
 * Throws 403 when the caller has no membership row, and 500 when the lookup
 * itself fails (a real DB error must never be reported to the user as "not a
 * family member"). Centralizes the ownership-check every inbound-email
 * endpoint needs before touching family-scoped data via the admin client.
 */
export async function resolveFamilyUnitId(
  event: H3Event,
  userId: string,
): Promise<string> {
  const admin = useSupabaseAdmin();
  const logger = useLogger(event, "family-membership");

  const { data: membership, error } = await admin
    .from("family_members")
    .select("family_unit_id")
    .eq("user_id", userId)
    .single();

  if (error && error.code !== "PGRST116") {
    logger.error("Failed to resolve family membership", error);
    throw createError({ statusCode: 500, statusMessage: "Failed to resolve family membership" });
  }
  if (!membership) {
    throw createError({ statusCode: 403, statusMessage: "Not a family member" });
  }

  return membership.family_unit_id;
}
