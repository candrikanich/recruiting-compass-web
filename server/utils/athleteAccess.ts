import type { H3Event } from "h3";
import { createError } from "h3";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "~/types/database";
import { useSupabaseAdmin } from "~/server/utils/supabase";
import { getUserRole } from "~/server/utils/auth";
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
    (m) =>
      m.user_id === requestedAthleteId && callerUnits.has(m.family_unit_id),
  );

  if (!shareUnit) {
    logger.warn("Cross-athlete access denied", {
      callerId,
      requestedAthleteId,
    });
    throw createError({
      statusCode: 403,
      statusMessage: "Not authorized to view this athlete",
    });
  }

  return requestedAthleteId;
}

/**
 * Resolve which athlete a viewer's dashboard should render.
 *
 * A player views their own data. A parent (no explicit athleteId param) is
 * auto-resolved to the linked player in their family unit, so parent and player
 * see the SAME derived timeline. Falls back to the caller when the viewer is not
 * a parent or has no linked player. This is the auto-resolution counterpart to
 * `resolveTargetAthleteId`, which authorizes an explicitly requested athleteId.
 */
export async function resolveViewerAthleteId(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<string> {
  const role = await getUserRole(userId, supabase);
  if (role !== "parent") {
    return userId;
  }

  const { data: familyMembership } = await supabase
    .from("family_members")
    .select("family_unit_id")
    .eq("user_id", userId)
    .eq("role", "parent")
    .maybeSingle();

  if (!familyMembership) {
    return userId;
  }

  const { data: playerMember } = await supabase
    .from("family_members")
    .select("user_id")
    .eq("family_unit_id", familyMembership.family_unit_id)
    .eq("role", "player")
    .maybeSingle();

  return playerMember?.user_id ?? userId;
}
