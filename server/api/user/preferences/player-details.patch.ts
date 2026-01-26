/**
 * PATCH /api/user/preferences/player-details
 * Update athlete's player details with history tracking
 * Parents cannot perform this action (read-only view)
 */

import { defineEventHandler, readBody, createError } from "h3";
import { createServerSupabaseClient } from "~/server/utils/supabase";
import { requireAuth, assertNotParent } from "~/server/utils/auth";
import { logCRUD, logError } from "~/server/utils/auditLog";
import { playerDetailsSchema } from "~/utils/validation/schemas";
import { triggerSuggestionUpdate } from "~/server/utils/triggerSuggestionUpdate";
import type { PlayerDetails, PreferenceHistoryEntry } from "~/types/models";

/**
 * Compares old and new values, returns array of changes
 */
function compareFields(
  oldDetails: PlayerDetails | undefined,
  newDetails: PlayerDetails,
): Array<{ field: string; old_value: unknown; new_value: unknown }> {
  const changes: Array<{
    field: string;
    old_value: unknown;
    new_value: unknown;
  }> = [];
  const old = oldDetails || {};

  for (const key of Object.keys(newDetails) as (keyof PlayerDetails)[]) {
    const oldVal = old[key];
    const newVal = newDetails[key];

    // Deep comparison for arrays and objects
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changes.push({
        field: key,
        old_value: oldVal,
        new_value: newVal,
      });
    }
  }

  return changes;
}

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event);
  const supabase = createServerSupabaseClient();

  // Check if user is a parent - they cannot perform this action
  try {
    await assertNotParent(user.id, supabase);
  } catch (err) {
    // assertNotParent throws 403 error if parent
    if (err instanceof Error && "statusCode" in err) {
      throw err;
    }
    throw createError({
      statusCode: 403,
      statusMessage:
        "Parents cannot perform this action. This is a read-only view.",
    });
  }

  try {
    const body = await readBody<PlayerDetails>(event);

    // Validate request body using existing schema
    const validationResult = playerDetailsSchema.safeParse(body);
    if (!validationResult.success) {
      throw createError({
        statusCode: 400,
        statusMessage: "Invalid player details",
        data: validationResult.error.errors,
      });
    }

    const validatedDetails = validationResult.data as PlayerDetails;

    // Fetch current preferences
    const { data: currentPrefs, error: fetchError } = await supabase
      .from("user_preferences")
      .select("player_details, preference_history")
      .eq("user_id", user.id)
      .single();

    if (fetchError && fetchError.code !== "PGRST116") {
      // PGRST116 means no rows found, which is acceptable
      await logError(event, {
        userId: user.id,
        action: "READ",
        resourceType: "user_preferences",
        resourceId: user.id,
        errorMessage: fetchError.message,
        description: "Failed to fetch current preferences",
      });

      throw createError({
        statusCode: 500,
        statusMessage: "Failed to fetch current preferences",
      });
    }

    // Compare old and new details to create history entry
    const changes = compareFields(
      currentPrefs?.player_details,
      validatedDetails,
    );

    // Build history entry only if there are actual changes
    const historyEntry: PreferenceHistoryEntry | null =
      changes.length > 0
        ? {
            timestamp: new Date().toISOString(),
            changed_by: user.id,
            changes,
          }
        : null;

    // Update history - keep last 50 entries
    const currentHistory = currentPrefs?.preference_history || [];
    const newHistory =
      historyEntry !== null
        ? [...currentHistory.slice(-49), historyEntry]
        : currentHistory;

    // Update preferences with player details and history
    const { data: updatedPrefs, error: updateError } = await supabase
      .from("user_preferences")
      .update({
        player_details: validatedDetails,
        preference_history: newHistory,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id)
      .select()
      .single();

    if (updateError) {
      await logError(event, {
        userId: user.id,
        action: "UPDATE",
        resourceType: "user_preferences",
        resourceId: user.id,
        errorMessage: updateError.message,
        description: "Failed to update player details",
      });

      console.error(
        "Supabase error updating player details:",
        updateError,
      );
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to update player details",
      });
    }

    // Log successful update with changes
    await logCRUD(event, {
      userId: user.id,
      action: "UPDATE",
      resourceType: "user_preferences",
      resourceId: user.id,
      newValues: {
        player_details: validatedDetails,
        changes_count: changes.length,
      },
      description: `Updated player details with ${changes.length} field change(s)`,
    });

    // Trigger suggestion re-evaluation if profile data changed
    if (changes.length > 0) {
      try {
        await triggerSuggestionUpdate(supabase, user.id, "profile_change");
      } catch (triggerError) {
        // Log error but don't fail the request - suggestions are non-critical
        console.error("Failed to trigger suggestion update after profile change:", triggerError);
        await logError(event, {
          userId: user.id,
          action: "UPDATE",
          resourceType: "suggestions",
          resourceId: user.id,
          errorMessage: triggerError instanceof Error ? triggerError.message : "Unknown error",
          description: "Failed to trigger suggestion re-evaluation after player details update",
        });
      }
    }

    return {
      player_details: updatedPrefs.player_details,
      changes_made: changes.length,
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";

    // Log any unexpected errors
    if (!(err instanceof Error && "statusCode" in err)) {
      await logError(event, {
        userId: user.id,
        action: "UPDATE",
        resourceType: "user_preferences",
        resourceId: user.id,
        errorMessage,
        description: "Unexpected error updating player details",
      });
    }

    // Re-throw H3 errors (auth, validation, etc.)
    if (err instanceof Error && "statusCode" in err) {
      throw err;
    }

    console.error(
      "Error in PATCH /api/user/preferences/player-details:",
      err,
    );
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to update player details",
    });
  }
});
