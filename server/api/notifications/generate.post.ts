/**
 * POST /api/notifications/generate
 * Generate all notifications for athlete. Family-shared profile — a
 * parent's call is redirected to their linked athlete.
 */

import { defineEventHandler } from "h3";
import { createServerSupabaseClient } from "~/server/utils/supabase";
import {
  generateOfferNotifications,
  generateRecommendationNotifications,
  generateEventNotifications,
  generateCoachFollowupNotifications,
} from "~/server/utils/notificationGenerator";
import { requireAuth } from "~/server/utils/auth";
import { resolveActingAthleteId } from "~/server/utils/playerOwnedPreferences";
import { useLogger } from "~/server/utils/logger";

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "notifications/generate");
  try {
    const user = await requireAuth(event);
    const supabase = createServerSupabaseClient();

    const athleteId = await resolveActingAthleteId(user.id, supabase);

    // Generate notifications from all sources in parallel
    const results = await Promise.all([
      generateOfferNotifications(athleteId, supabase),
      generateRecommendationNotifications(athleteId, supabase),
      generateEventNotifications(athleteId, supabase),
      generateCoachFollowupNotifications(athleteId, supabase),
    ]);

    // Calculate totals
    const totalCreated = results.reduce((sum, r) => sum + r.count, 0);

    return {
      success: true,

      created: totalCreated,
      breakdown: {
        offers: results[0].count,
        recommendations: results[1].count,
        events: results[2].count,
        coaches: results[3].count,
      },
      timestamp: new Date().toISOString(),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    if (err instanceof Error && "statusCode" in err) throw err;
    logger.error("Failed to generate notifications", err);
    throw createError({
      statusCode: err.statusCode || 500,
      statusMessage: "Failed to generate notifications",
    });
  }
});
