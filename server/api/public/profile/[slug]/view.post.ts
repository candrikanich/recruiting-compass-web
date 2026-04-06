import {
  defineEventHandler,
  getRouterParam,
  getQuery,
  getRequestHeader,
  createError,
} from "h3";
import { createServerSupabaseClient } from "~/server/utils/supabase";
import { useLogger } from "~/server/utils/logger";

const HASH_SLUG_RE = /^[a-z0-9]{6}$/;
const VANITY_SLUG_RE = /^[a-z0-9][a-z0-9-]{0,28}[a-z0-9]$/;

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "public/profile/view");
  try {
    const slug = getRouterParam(event, "slug")!;

    if (!HASH_SLUG_RE.test(slug) && !VANITY_SLUG_RE.test(slug)) {
      throw createError({
        statusCode: 404,
        statusMessage: "Profile not found",
      });
    }

    const { ref } = getQuery(event) as { ref?: string };
    const rawUserAgent = getRequestHeader(event, "user-agent") ?? null;
    const userAgent = rawUserAgent ? rawUserAgent.slice(0, 512) : null;
    const supabase = createServerSupabaseClient();

    // Resolve by hash_slug first, then vanity_slug
    let profileResult = await supabase
      .from("player_profiles")
      .select("id")
      .eq("hash_slug", slug)
      .maybeSingle();
    if (profileResult.error) {
      logger.error(
        "Failed to query player_profiles by hash_slug",
        profileResult.error,
      );
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to record view",
      });
    }
    if (!profileResult.data) {
      profileResult = await supabase
        .from("player_profiles")
        .select("id")
        .eq("vanity_slug", slug)
        .maybeSingle();
      if (profileResult.error) {
        logger.error(
          "Failed to query player_profiles by vanity_slug",
          profileResult.error,
        );
        throw createError({
          statusCode: 500,
          statusMessage: "Failed to record view",
        });
      }
    }
    const profile = profileResult.data;

    if (!profile) {
      throw createError({
        statusCode: 404,
        statusMessage: "Profile not found",
      });
    }

    // Resolve tracking link from ref token (if provided), validating it belongs to this profile
    let trackingLinkId: string | null = null;
    if (ref) {
      const { data: link, error: linkError } = await supabase
        .from("profile_tracking_links")
        .select("id")
        .eq("ref_token", ref)
        .eq("profile_id", profile.id)
        .maybeSingle();

      if (linkError) {
        logger.warn("Failed to resolve ref token", linkError);
      } else if (link) {
        trackingLinkId = link.id;
      }
    }

    // Await both analytics writes so data is not silently lost
    const results = await Promise.allSettled([
      trackingLinkId
        ? supabase.rpc("increment_profile_link_view", {
            link_id: trackingLinkId,
          })
        : Promise.resolve({ error: null }),
      supabase
        .from("profile_views")
        .insert({
          profile_id: profile.id,
          tracking_link_id: trackingLinkId,
          user_agent: userAgent,
        }),
    ]);

    for (const result of results) {
      if (result.status === "rejected") {
        logger.warn("Analytics write threw unexpectedly", result.reason);
      } else if ((result.value as { error: unknown }).error) {
        logger.warn(
          "Analytics write returned error",
          (result.value as { error: unknown }).error,
        );
      }
    }

    logger.debug("View recorded", { slug, hasRef: !!ref });
    return { ok: true };
  } catch (err) {
    if (err instanceof Error && "statusCode" in err) throw err;
    logger.error("Failed to record view", err);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to record view",
    });
  }
});
