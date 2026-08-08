/**
 * GET /api/video-links
 * Returns the caller's own video links plus their family's, ordered by position.
 */

import { defineEventHandler, createError } from "h3";
import { createServerSupabaseClient } from "~/server/utils/supabase";
import { requireAuth } from "~/server/utils/auth";
import { useLogger } from "~/server/utils/logger";
import type { VideoLinkRow } from "~/types/models";

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "video-links/list");
  try {
    const user = await requireAuth(event);
    const supabase = createServerSupabaseClient();

    // Service-role client bypasses RLS — explicit ownership/family filter
    // is the only guard here.
    const { data: fams } = await supabase
      .from("family_members")
      .select("family_unit_id")
      .eq("user_id", user.id);
    const familyIds = (fams ?? [])
      .map((f) => f.family_unit_id)
      .filter((id): id is string => Boolean(id));

    let query = supabase.from("video_links").select("*");
    query = familyIds.length
      ? query.or(
          `user_id.eq.${user.id},family_unit_id.in.(${familyIds.join(",")})`,
        )
      : query.eq("user_id", user.id);

    const { data, error } = await query.order("position", {
      ascending: true,
    });

    if (error) {
      logger.error("Failed to load video links", error);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to load video links",
      });
    }

    return { videoLinks: (data ?? []) as VideoLinkRow[] };
  } catch (err) {
    if (err instanceof Error && "statusCode" in err) throw err;
    logger.error("Unexpected error listing video links", err);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to load video links",
    });
  }
});
