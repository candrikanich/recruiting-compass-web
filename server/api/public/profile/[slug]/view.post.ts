import { defineEventHandler, getRouterParam, getQuery, getRequestHeader, createError } from "h3";
import { createServerSupabaseClient } from "~/server/utils/supabase";
import { useLogger } from "~/server/utils/logger";

const HASH_SLUG_RE = /^[a-z0-9]{6}$/;
const VANITY_SLUG_RE = /^[a-z0-9][a-z0-9-]{0,28}[a-z0-9]$/;

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "public/profile/view");
  try {
    const slug = getRouterParam(event, "slug")!;

    if (!HASH_SLUG_RE.test(slug) && !VANITY_SLUG_RE.test(slug)) {
      throw createError({ statusCode: 404, statusMessage: "Profile not found" });
    }

    const { ref } = getQuery(event) as { ref?: string };
    const rawUserAgent = getRequestHeader(event, "user-agent") ?? null;
    const userAgent = rawUserAgent ? rawUserAgent.slice(0, 512) : null;
    const supabase = createServerSupabaseClient();

    const { data: profile } = await supabase
      .from("player_profiles")
      .select("id")
      .or(`hash_slug.eq.${slug},vanity_slug.eq.${slug}`)
      .maybeSingle();

    if (!profile) {
      throw createError({ statusCode: 404, statusMessage: "Profile not found" });
    }

    // Resolve tracking link from ref token (if provided)
    let trackingLinkId: string | null = null;
    if (ref) {
      const { data: link } = await supabase
        .from("profile_tracking_links")
        .select("id")
        .eq("ref_token", ref)
        .maybeSingle();

      if (link) {
        trackingLinkId = link.id;
        // Atomic increment via SQL function defined in migration — fire and forget
        supabase
          .rpc("increment_profile_link_view", { link_id: link.id })
          .then(({ error: e }: { error: unknown }) => {
            if (e) logger.warn("Failed to increment view count", e);
          });
      }
    }

    // Insert detailed view log — fire and forget (don't block response)
    supabase
      .from("profile_views")
      .insert({ profile_id: profile.id, tracking_link_id: trackingLinkId, user_agent: userAgent })
      .then(({ error }: { error: unknown }) => {
        if (error) logger.warn("Failed to log profile view", error);
      });

    logger.debug("View recorded", { slug, hasRef: !!ref });
    return { ok: true };
  } catch (err) {
    if (err instanceof Error && "statusCode" in err) throw err;
    logger.error("Failed to record view", err);
    throw createError({ statusCode: 500, statusMessage: "Failed to record view" });
  }
});
