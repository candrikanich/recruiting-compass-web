/**
 * POST /api/video-links
 * Creates a video link for the authenticated player. Parents cannot post
 * (read-only). Enforces a max of 5 video links per player.
 */

import { defineEventHandler, readBody, createError } from "h3";
import { createServerSupabaseClient } from "~/server/utils/supabase";
import { requireAuth, assertNotParent } from "~/server/utils/auth";
import { useLogger } from "~/server/utils/logger";
import { createVideoLinkSchema } from "~/utils/validation/schemas";
import type { VideoLinkRow } from "~/types/models";

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "video-links/create");
  try {
    const user = await requireAuth(event);
    const supabase = createServerSupabaseClient();

    await assertNotParent(user.id, supabase);

    const parsed = createVideoLinkSchema.safeParse(await readBody(event));
    if (!parsed.success) {
      throw createError({
        statusCode: 422,
        statusMessage: parsed.error.issues[0].message,
      });
    }

    const { count, error: countError } = await supabase
      .from("video_links")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    if (countError) {
      logger.error("Failed to count existing video links", countError);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to create video link",
      });
    }

    if ((count ?? 0) >= 5) {
      throw createError({
        statusCode: 409,
        statusMessage: "Maximum of 5 video links reached",
      });
    }

    const { data: fam } = await supabase
      .from("family_members")
      .select("family_unit_id")
      .eq("user_id", user.id)
      .eq("role", "player")
      .maybeSingle();

    const insert = {
      user_id: user.id,
      family_unit_id: fam?.family_unit_id ?? null,
      platform: parsed.data.platform,
      url: parsed.data.url,
      title: parsed.data.title ?? null,
      position: parsed.data.position ?? count ?? 0,
    };

    const { data, error } = await supabase
      .from("video_links")
      .insert(insert)
      .select()
      .single();

    if (error) {
      logger.error("Failed to create video link", error);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to create video link",
      });
    }

    return { videoLink: data as VideoLinkRow };
  } catch (err) {
    if (err instanceof Error && "statusCode" in err) throw err;
    logger.error("Unexpected error creating video link", err);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to create video link",
    });
  }
});
