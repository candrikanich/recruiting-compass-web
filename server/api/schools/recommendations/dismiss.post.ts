/**
 * POST /api/schools/recommendations/dismiss
 *
 * Persist a "not this school" dismissal so it drops out of the empty-state
 * grid. Family-authorized; service-role write + cache bust.
 */

import { defineEventHandler, readBody, createError } from "h3";
import { z } from "zod";
import { requireAuth } from "~/server/utils/auth";
import { resolveTargetAthleteId } from "~/server/utils/athleteAccess";
import { useLogger } from "~/server/utils/logger";
import { useSupabaseAdmin } from "~/server/utils/supabase";
import { deleteShared } from "~/server/utils/sharedCache";
import { CACHE_KEYS } from "~/server/utils/redis";
import { catalogKeyFor } from "~/utils/schoolRecommendations";
import type { DismissSchoolRecommendationResponse } from "~/types/schoolRecommendations";

const bodySchema = z.object({
  catalogKey: z.string().trim().min(1).max(255),
  athleteId: z.string().uuid().optional(),
});

export default defineEventHandler(
  async (event): Promise<DismissSchoolRecommendationResponse> => {
    const logger = useLogger(event, "schools/recommendations/dismiss");
    const user = await requireAuth(event);

    const parsed = bodySchema.safeParse(await readBody(event));
    if (!parsed.success) {
      throw createError({
        statusCode: 400,
        statusMessage: "catalogKey is required",
      });
    }

    const athleteId = await resolveTargetAthleteId(
      event,
      user.id,
      parsed.data.athleteId,
    );
    const catalogKey = catalogKeyFor(parsed.data.catalogKey);
    if (!catalogKey) {
      throw createError({
        statusCode: 400,
        statusMessage: "catalogKey is required",
      });
    }

    const supabase = useSupabaseAdmin();
    const { data: membership, error: membershipError } = await supabase
      .from("family_members")
      .select("family_unit_id")
      .eq("user_id", athleteId)
      .limit(1)
      .maybeSingle();

    if (membershipError) {
      logger.error("Failed to resolve family for dismissal", membershipError);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to dismiss recommendation",
      });
    }

    if (!membership?.family_unit_id) {
      throw createError({
        statusCode: 400,
        statusMessage: "No family context for this athlete",
      });
    }

    const { error: insertError } = await supabase
      .from("school_recommendation_dismissals")
      .upsert(
        {
          family_unit_id: membership.family_unit_id,
          athlete_user_id: athleteId,
          catalog_key: catalogKey,
        },
        { onConflict: "family_unit_id,catalog_key", ignoreDuplicates: true },
      );

    if (insertError) {
      logger.error("Failed to persist recommendation dismissal", insertError);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to dismiss recommendation",
      });
    }

    await deleteShared(CACHE_KEYS.SCHOOL_RECS(athleteId));

    return { dismissed: true, catalogKey };
  },
);
