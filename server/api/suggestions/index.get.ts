import { defineEventHandler, getQuery, createError } from "h3";
import { createServerSupabaseClient } from "~/server/utils/supabase";
import { requireAuth } from "~/server/utils/auth";
import { useLogger } from "~/server/utils/logger";
import {
  getSurfacedSuggestions,
  getPendingSuggestionCount,
} from "~/server/utils/suggestionStaggering";

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "suggestions");
  try {
    const user = await requireAuth(event);
    const supabase = createServerSupabaseClient();
    const query = getQuery(event);

    const location = (query.location as string) || "dashboard";
    const schoolId = query.schoolId as string | undefined;

    const [suggestions, pendingCount] = await Promise.all([
      getSurfacedSuggestions(
        supabase,
        user.id,
        location as "dashboard" | "school_detail",
        schoolId,
      ),
      getPendingSuggestionCount(supabase, user.id),
    ]);

    logger.info("Fetched suggestions", { location, count: suggestions.length });

    return { suggestions, pendingCount };
  } catch (err) {
    if (err instanceof Error && "statusCode" in err) throw err;
    logger.error("Failed to fetch suggestions", err);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to fetch suggestions",
    });
  }
});
