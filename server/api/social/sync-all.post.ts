/**
 * Social Media Sync All Endpoint
 * Admin endpoint for syncing all users' social media posts (used by background jobs)
 */

import { defineEventHandler, getHeader, createError } from "h3";
import { createClient } from "@supabase/supabase-js";
import { TwitterService } from "~/server/utils/twitterService";
import { InstagramService } from "~/server/utils/instagramService";
import { analyzeSentiment } from "~/utils/sentimentAnalysis";
import { createLogger } from "~/server/utils/logger";

const logger = createLogger("social/sync-all");

interface SyncStats {
  totalUsers: number;
  successfulUsers: number;
  failedUsers: number;
  totalPostsFetched: number;
  totalPostsInserted: number;
  errors: string[];
}

export default defineEventHandler(async (event): Promise<SyncStats> => {
  // Auth checks run before the try/catch so errors propagate with correct status codes
  const authHeader = getHeader(event, "authorization");
  const syncApiKey = process.env.SYNC_API_KEY;

  if (!syncApiKey) {
    throw createError({
      statusCode: 500,
      statusMessage: "SYNC_API_KEY not configured — endpoint disabled",
    });
  }
  if (authHeader !== `Bearer ${syncApiKey}`) {
    throw createError({
      statusCode: 401,
      statusMessage: "Invalid API key",
    });
  }

  try {
    const config = useRuntimeConfig();
    const supabaseUrl = process.env.NUXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase credentials");
    }
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Initialize services
    const twitterBearerToken = config.twitterBearerToken as string | undefined;
    const instagramAccessToken = config.instagramAccessToken as string | undefined;
    const twitterService = new TwitterService(twitterBearerToken ?? "");
    const instagramService = new InstagramService(instagramAccessToken ?? "");

    // Get all users
    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("id");

    if (usersError) {
      logger.error("Failed to fetch users", usersError);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to fetch users",
      });
    }

    const stats: SyncStats = {
      totalUsers: users?.length || 0,
      successfulUsers: 0,
      failedUsers: 0,
      totalPostsFetched: 0,
      totalPostsInserted: 0,
      errors: [],
    };

    // Process each user
    for (const user of users || []) {
      try {
        // Get user's schools and coaches
        const { data: schools, error: schoolsError } = await supabase
          .from("schools")
          .select("id, name, twitter_handle, instagram_handle")
          .eq("user_id", user.id);

        const { data: coaches } = await supabase
          .from("coaches")
          .select("id, name, twitter_handle, instagram_handle")
          .eq("user_id", user.id);

        if (schoolsError) {
          stats.failedUsers++;
          stats.errors.push(`User ${user.id}: Failed to fetch schools`);
          continue;
        }

        // Collect handles
        const twitterHandles = [
          ...(schools || [])
            .filter((s) => s.twitter_handle)
            .map((s) => s.twitter_handle),
          ...(coaches || [])
            .filter((c) => c.twitter_handle)
            .map((c) => c.twitter_handle),
        ].filter((h) => h && typeof h === "string") as string[];

        const instagramHandles = [
          ...(schools || [])
            .filter((s) => s.instagram_handle)
            .map((s) => s.instagram_handle),
          ...(coaches || [])
            .filter((c) => c.instagram_handle)
            .map((c) => c.instagram_handle),
        ].filter((h) => h && typeof h === "string") as string[];

        let postsInserted = 0;

        // Gather all posts upfront
        const twitterPosts =
          twitterHandles.length > 0
            ? await twitterService.fetchTweetsForHandles(twitterHandles)
            : [];
        const instagramPosts =
          instagramHandles.length > 0
            ? await instagramService.fetchMediaForHandles(instagramHandles)
            : [];

        stats.totalPostsFetched += twitterPosts.length + instagramPosts.length;

        const allPosts = [...twitterPosts, ...instagramPosts];
        if (allPosts.length > 0) {
          // Batch-check for existing posts in one query instead of N+1
          const allPostUrls = allPosts.map((p) => p.post_url);
          const { data: existingPosts } = await supabase
            .from("social_media_posts")
            .select("post_url")
            .in("post_url", allPostUrls);

          const existingUrlSet = new Set(
            (existingPosts || []).map((p) => p.post_url),
          );

          for (const post of allPosts) {
            if (!existingUrlSet.has(post.post_url)) {
              const school = schools?.find(
                (s) =>
                  s.twitter_handle === post.author_handle ||
                  s.instagram_handle === post.author_handle,
              );
              const coach = coaches?.find(
                (c) =>
                  c.twitter_handle === post.author_handle ||
                  c.instagram_handle === post.author_handle,
              );

              const sentimentResult = analyzeSentiment(post.post_content);

              const { error: insertError } = await supabase
                .from("social_media_posts")
                .insert({
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

              if (!insertError) {
                postsInserted++;
              }
            }
          }
        }

        stats.totalPostsInserted += postsInserted;
        stats.successfulUsers++;
      } catch (error) {
        stats.failedUsers++;
        stats.errors.push(
          `User ${user.id}: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    }

    // Log results
    logger.info("Social media sync completed");

    return stats;
  } catch (error) {
    logger.error("Social media sync failed", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Sync failed",
    });
  }
});
