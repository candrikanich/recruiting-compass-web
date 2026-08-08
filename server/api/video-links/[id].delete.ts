/**
 * DELETE /api/video-links/:id
 * Deletes a video link owned by the authenticated player.
 */

import { defineEventHandler, createError } from "h3";
import { createServerSupabaseClient } from "~/server/utils/supabase";
import { requireAuth, assertNotParent } from "~/server/utils/auth";
import { useLogger } from "~/server/utils/logger";
import { requireUuidParam } from "~/server/utils/validation";

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "video-links/delete");
  try {
    const user = await requireAuth(event);
    const id = requireUuidParam(event, "id");
    const supabase = createServerSupabaseClient();

    await assertNotParent(user.id, supabase);

    // Verify ownership before deleting — RLS is bypassed by the service-role
    // client, so this explicit check is the only guard. Return 404 (not 403)
    // to avoid leaking whether the row exists.
    const { data: existing, error: fetchError } = await supabase
      .from("video_links")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (fetchError) {
      logger.error("Failed to verify video link ownership", fetchError);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to delete video link",
      });
    }

    if (!existing) {
      throw createError({
        statusCode: 404,
        statusMessage: "Video link not found",
      });
    }

    const { error: deleteError } = await supabase
      .from("video_links")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (deleteError) {
      logger.error("Failed to delete video link", deleteError);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to delete video link",
      });
    }

    return { success: true };
  } catch (err) {
    if (err instanceof Error && "statusCode" in err) throw err;
    logger.error("Unexpected error deleting video link", err);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to delete video link",
    });
  }
});
