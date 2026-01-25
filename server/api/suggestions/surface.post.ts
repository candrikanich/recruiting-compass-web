import { defineEventHandler } from "h3";
import { createServerSupabaseClient } from "~/server/utils/supabase";
import { requireAuth } from "~/server/utils/auth";
import { surfacePendingSuggestions } from "~/server/utils/suggestionStaggering";

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event);
  const supabase = createServerSupabaseClient();

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
  } catch (error) {
    console.error("Error surfacing suggestions:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
});
