/**
 * Social Media Sync Endpoint
 * Fetches recent posts from Twitter and Instagram for user's schools and coaches
 * RESTRICTED: Athletes only (parents have read-only access)
 */

import { defineEventHandler } from "h3";
import { createServerSupabaseClient } from "~/server/utils/supabase";
import { TwitterService } from "~/server/utils/twitterService";
import { InstagramService } from "~/server/utils/instagramService";
import { analyzeSentiment } from "~/utils/sentimentAnalysis";
import { requireAuth, assertNotParent } from "~/server/utils/auth";
import { filterValidHandles } from "~/server/utils/socialMediaValidator";
import { createLogger } from "~/server/utils/logger";
import { auditLog } from "~/server/utils/auditLog";

const logger = createLogger("social/sync");

interface SyncSummary {
  success: boolean;
  message: string;
  twitter: {
    fetched: number;
    new: number;
  };
  instagram: {
    fetched: number;
    new: number;
  };
}

// Helper to safely extract handles from entities
const getHandles = (entities: unknown[], handleKey: string): string[] => {
  if (!Array.isArray(entities)) return [];
  return entities
    .filter(
      (e): e is Record<string, unknown> =>
        typeof e === "object" &&
        e !== null &&
        handleKey in e &&
        typeof (e as Record<string, unknown>)[handleKey] === "string",
    )
    .map((e) => (e as Record<string, unknown>)[handleKey] as string);
};

// Helper to safely find entity by handle
const findEntityByHandle = (
  entities: unknown[],
  handleKey: string,
  targetHandle: string,
) => {
  if (!Array.isArray(entities)) return undefined;
  return entities.find(
    (e): e is Record<string, unknown> =>
      typeof e === "object" &&
      e !== null &&
      (e as Record<string, unknown>)[handleKey] === targetHandle,
  );
};

export default defineEventHandler(async (event): Promise<SyncSummary> => {
  try {
    // Check authentication
    const user = await requireAuth(event);
    const supabase = createServerSupabaseClient();

    // Ensure requesting user is not a parent (mutation restricted)
    await assertNotParent(user.id, supabase);

    const config = useRuntimeConfig();

    // Type assertion for Supabase operations without proper types
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabaseAny = supabase as any;

    // Initialize services
    const twitterService = new TwitterService(
      config.twitterBearerToken as string,
    );
    const instagramService = new InstagramService(
      config.instagramAccessToken as string,
    );

    // Get user's schools and coaches with social media handles
    const { data: schools, error: schoolsError } = await supabase
      .from("schools")
      .select("id, name, twitter_handle, instagram_handle")
      .eq("user_id", user.id);

    const { data: coaches, error: _coachesError } = await supabase
      .from("coaches")
      .select("id, name, twitter_handle, instagram_handle");

    if (schoolsError) {
      logger.error("Failed to fetch schools", schoolsError);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to fetch schools",
      });
    }

    // Collect all Twitter and Instagram handles using helper functions
    const rawTwitterHandles = [
      ...getHandles(
        (schools || []) as Array<{ twitter_handle?: string }>,
        "twitter_handle",
      ),
      ...getHandles(
        (coaches || []) as Array<{ twitter_handle?: string }>,
        "twitter_handle",
      ),
    ];

    const rawInstagramHandles = [
      ...getHandles(
        (schools || []) as Array<{ instagram_handle?: string }>,
        "instagram_handle",
      ),
      ...getHandles(
        (coaches || []) as Array<{ instagram_handle?: string }>,
        "instagram_handle",
      ),
    ];

    // Filter to only valid handles (prevents injection and API errors)
    const twitterHandles = filterValidHandles(rawTwitterHandles, "twitter");
    const instagramHandles = filterValidHandles(
      rawInstagramHandles,
      "instagram",
    );

    // Log if any handles were filtered out
    if (rawTwitterHandles.length > twitterHandles.length) {
      logger.warn(
        `Filtered out ${rawTwitterHandles.length - twitterHandles.length} invalid Twitter handles`,
      );
    }
    if (rawInstagramHandles.length > instagramHandles.length) {
      logger.warn(
        `Filtered out ${rawInstagramHandles.length - instagramHandles.length} invalid Instagram handles`,
      );
    }

    let twitterFetched = 0;
    let twitterNew = 0;
    let instagramFetched = 0;
    let instagramNew = 0;

    // Fetch Twitter posts
    if (twitterHandles.length > 0) {
      const twitterPosts =
        await twitterService.fetchTweetsForHandles(twitterHandles);
      twitterFetched = twitterPosts.length;

      if (twitterPosts.length > 0) {
        // Check for existing posts and insert new ones
        const newPosts = [];
        for (const post of twitterPosts) {
          const { data: existing } = await supabase
            .from("social_media_posts")
            .select("id")
            .eq("post_url", post.post_url)
            .single();

          if (!existing) {
            // Find associated school or coach
            const school = findEntityByHandle(
              schools as Array<{ id: string; twitter_handle?: string }>,
              "twitter_handle",
              post.author_handle,
            );
            const coach = findEntityByHandle(
              coaches as Array<{ id: string; twitter_handle?: string }>,
              "twitter_handle",
              post.author_handle,
            );

            // Analyze sentiment
            const sentimentResult = analyzeSentiment(post.post_content);

            newPosts.push({
              school_id: school?.id || null,
              coach_id: coach?.id || null,
              platform: post.platform,
              post_url: post.post_url,
              post_content: post.post_content,
              post_date: post.post_date,
              author_name: post.author_name,
              author_handle: post.author_handle,
              engagement_count: post.engagement_count,
              is_recruiting_related: post.is_recruiting_related,
              sentiment: sentimentResult.sentiment,
            });
          }
        }

        if (newPosts.length > 0) {
          const { error: insertError } = await supabaseAny
            .from("social_media_posts")
            .insert(newPosts);

          if (insertError) {
            logger.error("Failed to insert Twitter posts", insertError);
          } else {
            twitterNew = newPosts.length;
          }
        }
      }
    }

    // Fetch Instagram posts
    if (instagramHandles.length > 0) {
      const instagramPosts =
        await instagramService.fetchMediaForHandles(instagramHandles);
      instagramFetched = instagramPosts.length;

      if (instagramPosts.length > 0) {
        // Check for existing posts and insert new ones
        const newPosts = [];
        for (const post of instagramPosts) {
          const { data: existing } = await supabase
            .from("social_media_posts")
            .select("id")
            .eq("post_url", post.post_url)
            .single();

          if (!existing) {
            // Find associated school or coach
            const school = findEntityByHandle(
              schools as Array<{ id: string; instagram_handle?: string }>,
              "instagram_handle",
              post.author_handle,
            );
            const coach = findEntityByHandle(
              coaches as Array<{ id: string; instagram_handle?: string }>,
              "instagram_handle",
              post.author_handle,
            );

            // Analyze sentiment
            const sentimentResult = analyzeSentiment(post.post_content);

            newPosts.push({
              school_id: school?.id || null,
              coach_id: coach?.id || null,
              platform: post.platform,
              post_url: post.post_url,
              post_content: post.post_content,
              post_date: post.post_date,
              author_name: post.author_name,
              author_handle: post.author_handle,
              engagement_count: post.engagement_count,
              is_recruiting_related: post.is_recruiting_related,
              sentiment: sentimentResult.sentiment,
            });
          }
        }

        if (newPosts.length > 0) {
          const { error: insertError } = await supabaseAny
            .from("social_media_posts")
            .insert(newPosts);

          if (insertError) {
            logger.error("Failed to insert Instagram posts", insertError);
          } else {
            instagramNew = newPosts.length;
          }
        }
      }
    }

    // Log successful sync
    await auditLog(event, {
      userId: user.id,
      action: "CREATE",
      resourceType: "social_media_posts",
      description: `Synced social media (Twitter: ${twitterNew} new, Instagram: ${instagramNew} new)`,
      status: "success",
      metadata: {
        twitter_fetched: twitterFetched,
        twitter_new: twitterNew,
        instagram_fetched: instagramFetched,
        instagram_new: instagramNew,
      },
    });

    return {
      success: true,
      message: `Sync completed. Twitter: ${twitterNew}/${twitterFetched} new. Instagram: ${instagramNew}/${instagramFetched} new.`,
      twitter: {
        fetched: twitterFetched,
        new: twitterNew,
      },
      instagram: {
        fetched: instagramFetched,
        new: instagramNew,
      },
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Social media sync failed";

    // Log failed sync
    await auditLog(event, {
      userId: (
        await requireAuth(event).catch(
          () => ({ id: "unknown" }) as { id: string },
        )
      ).id,
      action: "CREATE",
      resourceType: "social_media_posts",
      errorMessage,
      status: "failure",
      description: "Social media sync failed",
    });

    logger.error("Social media sync failed", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Social media sync failed",
    });
  }
});
