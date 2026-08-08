/**
 * PATCH /api/video-links/:id
 * Updates a video link owned by the authenticated player. Editing the url
 * resets health-check state so the next cron re-checks it.
 */

import { defineEventHandler, readBody, createError } from "h3";
import { createServerSupabaseClient } from "~/server/utils/supabase";
import { requireAuth, assertNotParent } from "~/server/utils/auth";
import { useLogger } from "~/server/utils/logger";
import { requireUuidParam } from "~/server/utils/validation";
import { updateVideoLinkSchema } from "~/utils/validation/schemas";
import type { VideoLinkRow } from "~/types/models";
import type { Database } from "~/types/database";

type VideoLinkUpdate = Database["public"]["Tables"]["video_links"]["Update"];

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "video-links/update");
  try {
    const user = await requireAuth(event);
    const id = requireUuidParam(event, "id");
    const supabase = createServerSupabaseClient();

    await assertNotParent(user.id, supabase);

    const parsed = updateVideoLinkSchema.safeParse(await readBody(event));
    if (!parsed.success) {
      throw createError({
        statusCode: 422,
        statusMessage: parsed.error.issues[0].message,
      });
    }

    const update: VideoLinkUpdate = { ...parsed.data };
    if (parsed.data.url !== undefined) {
      update.health_status = "unknown";
      update.last_health_check = null;
    }

    const { data, error } = await supabase
      .from("video_links")
      .update(update)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .maybeSingle();

    if (error) {
      logger.error("Failed to update video link", error);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to update video link",
      });
    }

    if (!data) {
      throw createError({
        statusCode: 404,
        statusMessage: "Video link not found",
      });
    }

    return { videoLink: data as VideoLinkRow };
  } catch (err) {
    if (err instanceof Error && "statusCode" in err) throw err;
    logger.error("Unexpected error updating video link", err);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to update video link",
    });
  }
});
