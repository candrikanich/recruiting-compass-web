import { defineEventHandler, getQuery, createError } from "h3";
import { createServerSupabaseClient } from "~/server/utils/supabase";
import { requireAuth, getUserRole } from "~/server/utils/auth";
import { useLogger } from "~/server/utils/logger";
import {
  getSurfacedSuggestions,
  getPendingSuggestionCount,
} from "~/server/utils/suggestionStaggering";
import { triggerSuggestionUpdate } from "~/server/utils/triggerSuggestionUpdate";

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event);
  const supabase = createServerSupabaseClient();
  const logger = useLogger(event, "suggestions");
  const query = getQuery(event);

  try {
    const location = (query.location as string) || "dashboard";
    const schoolId = query.schoolId as string | undefined;

    // Resolve the athlete ID: parents view their linked player's data
    let athleteId = user.id;
    const role = await getUserRole(user.id, supabase);
    if (role === "parent") {
      const { data: familyMembership } = await supabase
        .from("family_members")
        .select("family_unit_id")
        .eq("user_id", user.id)
        .eq("role", "parent")
        .maybeSingle();

      if (familyMembership) {
        const { data: playerMember } = await supabase
          .from("family_members")
          .select("user_id")
          .eq("family_unit_id", familyMembership.family_unit_id)
          .eq("role", "player")
          .maybeSingle();

        if (playerMember?.user_id) {
          athleteId = playerMember.user_id;
        }
      }
    }

    let [suggestions, pendingCount] = await Promise.all([
      getSurfacedSuggestions(
        supabase,
        athleteId,
        location as "dashboard" | "school_detail",
        schoolId,
      ),
      getPendingSuggestionCount(supabase, athleteId),
    ]);

    // Bootstrap: if no surfaced/pending suggestions exist AND this user has never had
    // any suggestion generated before (including dismissed/completed), run the rule
    // engine inline so the first dashboard load returns populated results.
    // Checking all-time total prevents re-running on every visit once the user has
    // dismissed all their suggestions or the rules fire nothing.
    if (suggestions.length === 0 && pendingCount === 0) {
      if (role !== "parent") {
        const { count: totalEver } = await supabase
          .from("suggestion")
          .select("id", { count: "exact", head: true })
          .eq("athlete_id", athleteId);

        if (!totalEver) {
          logger.info(
            "No suggestions ever generated — bootstrapping for new user",
          );
          try {
            await triggerSuggestionUpdate(supabase, athleteId, "daily_refresh");
            [suggestions, pendingCount] = await Promise.all([
              getSurfacedSuggestions(
                supabase,
                athleteId,
                location as "dashboard" | "school_detail",
                schoolId,
              ),
              getPendingSuggestionCount(supabase, athleteId),
            ]);
          } catch (err) {
            // Bootstrap failure is non-fatal — return empty rather than erroring
            logger.warn("Suggestion bootstrap failed, returning empty", err);
          }
        }
      }
    }

    return { suggestions, pendingCount };
  } catch (error: unknown) {
    if (error instanceof Error && "statusCode" in error) throw error;
    logger.error("Failed to fetch suggestions", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to fetch suggestions",
    });
  }
});
