import { defineEventHandler } from "h3";
import { createServerSupabaseUserClient } from "~/server/utils/supabase";
import { extractRequestToken } from "~/server/utils/requestToken";
import { requireAuth } from "~/server/utils/auth";
import { useLogger } from "~/server/utils/logger";
import { surfacePendingSuggestions } from "~/server/utils/suggestionStaggering";

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "suggestions/surface");
  const user = await requireAuth(event);
  const token = extractRequestToken(event);
  const supabase = createServerSupabaseUserClient(token);

  try {
    const surfacedCount = await surfacePendingSuggestions(
      supabase,
      user.id,
      3, // Surface 3 at a time
    );

    return {
      success: true,
      surfacedCount,
    };
  } catch (err) {
    if (err instanceof Error && "statusCode" in err) throw err;
    logger.error("Error surfacing suggestions", err);
    return {
      success: false,
      error: "Failed to surface suggestions",
    };
  }
});
