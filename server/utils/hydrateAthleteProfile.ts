/**
 * Hydrates an athlete's canonical profile from the parent-staged
 * `family_units.pending_player_details` blob when the player accepts their invite.
 *
 * Semantics are PLAYER-AUTHORITATIVE (fill-if-empty): parent-entered values only
 * populate fields the athlete has not already set. A value the player has entered
 * themselves is never overwritten here.
 *
 * The canonical stores are `user_preferences` (category `player`) for recruiting
 * fields and `users.date_of_birth` for DOB — the same DB-backed sources iOS reads,
 * so this makes parent -> player pre-fill work cross-platform (no query params).
 *
 * Fails OPEN: any error is logged and swallowed. Hydration must never block a
 * player from accepting an invite and joining their family.
 */
import type { useSupabaseAdmin } from "~/server/utils/supabase";

interface PendingPlayerDetails {
  playerName?: unknown;
  playerDob?: unknown;
  graduationYear?: unknown;
  sport?: unknown;
  position?: unknown;
}

interface HydrationLogger {
  info: (msg: string, meta?: Record<string, unknown>) => void;
  warn: (msg: string, meta?: Record<string, unknown>) => void;
}

const isEmpty = (value: unknown): boolean =>
  value === null ||
  value === undefined ||
  value === "" ||
  (Array.isArray(value) && value.length === 0);

export async function hydrateAthleteFromPendingDetails(
  supabase: ReturnType<typeof useSupabaseAdmin>,
  athleteUserId: string,
  pendingDetails: PendingPlayerDetails,
  logger: HydrationLogger,
): Promise<void> {
  try {
    await hydratePlayerPreferences(supabase, athleteUserId, pendingDetails);
    await hydrateDateOfBirth(supabase, athleteUserId, pendingDetails);
    logger.info("Athlete profile hydrated from parent-staged details", {
      athleteUserId,
    });
  } catch (err) {
    // Never block invite acceptance on a hydration failure.
    logger.warn("Failed to hydrate athlete profile from pending details", {
      athleteUserId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

async function hydratePlayerPreferences(
  supabase: ReturnType<typeof useSupabaseAdmin>,
  athleteUserId: string,
  pending: PendingPlayerDetails,
): Promise<void> {
  const { data: existingRow } = await supabase
    .from("user_preferences")
    .select("data")
    .eq("user_id", athleteUserId)
    .eq("category", "player")
    .maybeSingle();

  const existing = ((existingRow as { data?: Record<string, unknown> } | null)
    ?.data ?? {}) as Record<string, unknown>;

  const position =
    typeof pending.position === "string" ? pending.position : undefined;

  const candidate: Record<string, unknown> = {
    graduation_year:
      typeof pending.graduationYear === "number"
        ? pending.graduationYear
        : undefined,
    primary_sport:
      typeof pending.sport === "string" ? pending.sport : undefined,
    primary_position: position,
    positions: position ? [position] : undefined,
  };

  const merged = { ...existing };
  let changed = false;
  for (const [key, value] of Object.entries(candidate)) {
    if (value === undefined) continue;
    if (isEmpty(existing[key])) {
      merged[key] = value;
      changed = true;
    }
  }

  if (!changed) return;

  await supabase.from("user_preferences").upsert(
    {
      user_id: athleteUserId,
      category: "player",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: merged as any,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,category" },
  );
}

async function hydrateDateOfBirth(
  supabase: ReturnType<typeof useSupabaseAdmin>,
  athleteUserId: string,
  pending: PendingPlayerDetails,
): Promise<void> {
  const dob = typeof pending.playerDob === "string" ? pending.playerDob : null;
  if (!dob) return;

  const { data: userRow } = await supabase
    .from("users")
    .select("date_of_birth")
    .eq("id", athleteUserId)
    .maybeSingle();

  // Player-authoritative: the player's own signup DOB wins; only fill if absent.
  if (
    !isEmpty((userRow as { date_of_birth?: unknown } | null)?.date_of_birth)
  ) {
    return;
  }

  // The users age trigger validates 13+; if a bad value slips through it throws
  // and the outer catch keeps acceptance working.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from("users") as any)
    .update({ date_of_birth: dob })
    .eq("id", athleteUserId);
}
