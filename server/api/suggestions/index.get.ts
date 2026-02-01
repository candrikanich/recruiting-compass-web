import { defineEventHandler, getQuery } from "h3";
import { createServerSupabaseClient } from "~/server/utils/supabase";
import { requireAuth } from "~/server/utils/auth";
import {
  getSurfacedSuggestions,
  getPendingSuggestionCount,
} from "~/server/utils/suggestionStaggering";

export default defineEventHandler(async (event) => {
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

  return { suggestions, pendingCount };
});
