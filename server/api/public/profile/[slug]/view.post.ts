import { defineEventHandler, getRouterParam, getQuery, getRequestHeader, createError } from "h3";
import { createServerSupabaseClient } from "~/server/utils/supabase";
import { useLogger } from "~/server/utils/logger";

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "public/profile/view");
  const slug = getRouterParam(event, "slug")!;
  const { ref } = getQuery(event) as { ref?: string };
  const userAgent = getRequestHeader(event, "user-agent") ?? null;
  const supabase = createServerSupabaseClient();

  const { data: profile } = await (supabase as any)
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
    const { data: link } = await (supabase as any)
      .from("profile_tracking_links")
      .select("id")
      .eq("ref_token", ref)
      .maybeSingle();

    if (link) {
      trackingLinkId = link.id;
      // Atomic increment via SQL function defined in migration — fire and forget
      (supabase as any)
        .rpc("increment_profile_link_view", { link_id: link.id })
        .then(({ error: e }: { error: unknown }) => {
          if (e) logger.warn("Failed to increment view count", e);
        });
    }
  }

  // Insert detailed view log — fire and forget (don't block response)
  (supabase as any)
    .from("profile_views")
    .insert({ profile_id: profile.id, tracking_link_id: trackingLinkId, user_agent: userAgent })
    .then(({ error }: { error: unknown }) => {
      if (error) logger.warn("Failed to log profile view", error);
    });

  logger.debug("View recorded", { slug, hasRef: !!ref });
  return { ok: true };
});
