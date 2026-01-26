/**
 * POST /api/suggestions/trigger-update
 * Trigger suggestion re-evaluation (called after interactions logged)
 * RESTRICTED: Athletes only
 */

import { defineEventHandler, readBody, createError } from "h3";
import { createServerSupabaseClient } from "~/server/utils/supabase";
import { requireAuth, assertNotParent } from "~/server/utils/auth";
import { triggerSuggestionUpdate } from "~/server/utils/triggerSuggestionUpdate";

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event);
  const supabase = createServerSupabaseClient();

  // Ensure requesting user is not a parent (mutation restricted)
  await assertNotParent(user.id, supabase);

  try {
    const body = await readBody<{
      reason: "profile_change" | "interaction_logged" | "daily_refresh";
      interactionSchoolId?: string;
      interactionCoachId?: string;
    }>(event);

    const { reason, interactionSchoolId, interactionCoachId } = body;

    if (!reason || !["profile_change", "interaction_logged", "daily_refresh"].includes(reason)) {
      throw createError({
        statusCode: 400,
        message: "Invalid trigger reason",
      });
    }

    const result = await triggerSuggestionUpdate(
      supabase,
      user.id,
      reason,
      {
        interactionSchoolId,
        interactionCoachId,
      },
    );

    return result;
  } catch (error: unknown) {
    if (error instanceof Error && "statusCode" in error) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      message:
        error instanceof Error ? error.message : "Failed to trigger suggestion update",
    });
  }
});
