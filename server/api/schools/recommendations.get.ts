/**
 * GET /api/schools/recommendations
 *
 * Ranked NCAA-catalog schools for the empty-list surface. Auth required.
 * Parents pass ?athleteId= to view a linked athlete (family-authorized).
 */

import { defineEventHandler, getQuery, createError } from "h3";
import { requireAuth } from "~/server/utils/auth";
import { resolveTargetAthleteId } from "~/server/utils/athleteAccess";
import { useLogger } from "~/server/utils/logger";
import { useSupabaseAdmin } from "~/server/utils/supabase";
import { assembleSchoolRecommendations } from "~/server/utils/assembleSchoolRecommendations";
import { getOrSetShared } from "~/server/utils/sharedCache";
import { CACHE_KEYS, TTL } from "~/server/utils/redis";
import { DEFAULT_RECOMMENDATION_LIMIT } from "~/utils/schoolRecommendations";
import type { SchoolRecommendationsResponse } from "~/types/schoolRecommendations";

export default defineEventHandler(
  async (event): Promise<SchoolRecommendationsResponse> => {
    const logger = useLogger(event, "schools/recommendations");
    const user = await requireAuth(event);
    const query = getQuery(event);

    const athleteId = await resolveTargetAthleteId(
      event,
      user.id,
      typeof query.athleteId === "string" ? query.athleteId : undefined,
    );

    const parsedLimit = parseInt(String(query.limit ?? ""), 10);
    const limit = Number.isFinite(parsedLimit)
      ? Math.min(Math.max(parsedLimit, 1), 12)
      : DEFAULT_RECOMMENDATION_LIMIT;

    const cacheKey = CACHE_KEYS.SCHOOL_RECS(athleteId);

    try {
      const cached = await getOrSetShared(cacheKey, TTL.TWO_MINUTES, () =>
        assembleSchoolRecommendations(useSupabaseAdmin(), athleteId, 12),
      );

      return {
        recommendations: cached.data.recommendations.slice(0, limit),
        signals: cached.data.signals,
        cache: cached.source,
      };
    } catch (err) {
      logger.error("Failed to assemble school recommendations", err);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to load school recommendations",
      });
    }
  },
);
