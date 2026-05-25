import type { H3Event } from "h3";
import { createError } from "h3";
import { useSupabaseAdmin } from "~/server/utils/supabase";
import { useLogger } from "~/server/utils/logger";

/**
 * Resolve which athlete a request should act on.
 *
 * Defaults to the caller. If a different `requestedAthleteId` is supplied (a
 * parent viewing a linked athlete), authorize it by confirming the caller and
 * the athlete belong to the same family unit. Rejects with 403 otherwise so the
 * athleteId query param can never be trusted blindly.
 *
 * Returns the authorized athlete id to use.
 */
export async function resolveTargetAthleteId(
  event: H3Event,
  callerId: string,
  requestedAthleteId: string | undefined,
): Promise<string> {
  if (!requestedAthleteId || requestedAthleteId === callerId) {
    return callerId;
  }

  const logger = useLogger(event, "athlete-access");
  const supabase = useSupabaseAdmin();

  const { data: memberships, error } = await supabase
    .from("family_members")
    .select("user_id, family_unit_id")
    .in("user_id", [callerId, requestedAthleteId]);

  if (error) {
    logger.error("Failed to verify family membership", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to verify athlete access",
    });
  }

  const callerUnits = new Set(
    (memberships ?? [])
      .filter((m) => m.user_id === callerId)
      .map((m) => m.family_unit_id),
  );
  const shareUnit = (memberships ?? []).some(
    (m) => m.user_id === requestedAthleteId && callerUnits.has(m.family_unit_id),
  );

  if (!shareUnit) {
    logger.warn("Cross-athlete access denied", { callerId, requestedAthleteId });
    throw createError({
      statusCode: 403,
      statusMessage: "Not authorized to view this athlete",
    });
  }

  return requestedAthleteId;
}
