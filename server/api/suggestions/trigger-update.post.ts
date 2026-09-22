/**
 * POST /api/suggestions/trigger-update
 * Trigger suggestion re-evaluation (called after interactions logged).
 * Family-shared profile — a parent's call is redirected to their linked athlete.
 */

import { defineEventHandler, readBody, createError } from "h3";
import { z } from "zod";
import { createServerSupabaseClient } from "~/server/utils/supabase";
import { requireAuth } from "~/server/utils/auth";
import { resolveActingAthleteId } from "~/server/utils/playerOwnedPreferences";
import { useLogger } from "~/server/utils/logger";
import { triggerSuggestionUpdate } from "~/server/utils/triggerSuggestionUpdate";

// No current client (web or iOS) calls this route directly -- it's only
// invoked server-to-server via triggerSuggestionUpdate()'s other callers.
// Still validated since the endpoint remains exposed to any authenticated caller.
const triggerUpdateBodySchema = z.object({
  reason: z.enum(["profile_change", "interaction_logged", "daily_refresh"], {
    message: "Invalid trigger reason",
  }),
  interactionSchoolId: z.string().uuid().optional(),
  interactionCoachId: z.string().uuid().optional(),
});

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "suggestions/trigger-update");
  const user = await requireAuth(event);
  const supabase = createServerSupabaseClient();

  try {
    const athleteId = await resolveActingAthleteId(user.id, supabase);

    const rawBody = await readBody(event);
    const parsedBody = triggerUpdateBodySchema.safeParse(rawBody);
    if (!parsedBody.success) {
      throw createError({
        statusCode: 400,
        message: parsedBody.error.issues[0]?.message ?? "Invalid request body",
      });
    }
    const { reason, interactionSchoolId, interactionCoachId } =
      parsedBody.data;

    logger.info("Triggering suggestion update", { reason });

    const result = await triggerSuggestionUpdate(supabase, athleteId, reason, {
      interactionSchoolId,
      interactionCoachId,
    });

    return result;
  } catch (err: unknown) {
    if (err instanceof Error && "statusCode" in err) {
      throw err;
    }

    logger.error("Failed to trigger suggestion update", err);

    throw createError({
      statusCode: 500,
      message: "Failed to trigger suggestion update",
    });
  }
});
