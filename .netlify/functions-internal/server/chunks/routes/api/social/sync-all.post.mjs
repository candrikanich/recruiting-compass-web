import { d as defineEventHandler, e as getHeader, u as useRuntimeConfig, a as createError, c as createLogger } from '../../../nitro/nitro.mjs';
import { createClient } from '@supabase/supabase-js';
import { T as TwitterService, I as InstagramService, a as analyzeSentiment } from '../../../_/sentimentAnalysis.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import 'crypto';
import '../../../_/sanitize.mjs';
import 'isomorphic-dompurify';

const logger = createLogger();
const syncAll_post = defineEventHandler(async (event) => {
  try {
    const authHeader = getHeader(event, "authorization");
    const config = useRuntimeConfig();
    const syncApiKey = process.env.SYNC_API_KEY;
    if (syncApiKey && authHeader !== `Bearer ${syncApiKey}`) {
      throw createError({
        statusCode: 401,
        statusMessage: "Invalid API key"
      });
    }
    const supabaseUrl = process.env.NUXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase credentials");
    }
    const supabase = createClient(supabaseUrl, supabaseKey);
    const twitterService = new TwitterService(config.twitterBearerToken);
    const instagramService = new InstagramService(config.instagramAccessToken);
    const { data: users, error: usersError } = await supabase.from("users").select("id");
    if (usersError) {
      logger.error("Failed to fetch users", usersError);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to fetch users"
      });
    }
    const stats = {
      totalUsers: (users == null ? void 0 : users.length) || 0,
      successfulUsers: 0,
      failedUsers: 0,
      totalPostsFetched: 0,
      totalPostsInserted: 0,
      errors: []
    };
    for (const user of users || []) {
      try {
        const { data: schools, error: schoolsError } = await supabase.from("schools").select("id, name, twitter_handle, instagram_handle").eq("user_id", user.id);
        const { data: coaches } = await supabase.from("coaches").select("id, name, twitter_handle, instagram_handle");
        if (schoolsError) {
          stats.failedUsers++;
          stats.errors.push(`User ${user.id}: Failed to fetch schools`);
          continue;
        }
        const twitterHandles = [
          ...(schools || []).filter((s) => s.twitter_handle).map((s) => s.twitter_handle),
          ...(coaches || []).filter((c) => c.twitter_handle).map((c) => c.twitter_handle)
        ].filter((h) => h && typeof h === "string");
        const instagramHandles = [
          ...(schools || []).filter((s) => s.instagram_handle).map((s) => s.instagram_handle),
          ...(coaches || []).filter((c) => c.instagram_handle).map((c) => c.instagram_handle)
        ].filter((h) => h && typeof h === "string");
        let postsInserted = 0;
        if (twitterHandles.length > 0) {
          const twitterPosts = await twitterService.fetchTweetsForHandles(twitterHandles);
          stats.totalPostsFetched += twitterPosts.length;
          for (const post of twitterPosts) {
            const { data: existing } = await supabase.from("social_media_posts").select("id").eq("post_url", post.post_url).single();
            if (!existing) {
              const school = schools == null ? void 0 : schools.find((s) => s.twitter_handle === post.author_handle);
              const coach = coaches == null ? void 0 : coaches.find((c) => c.twitter_handle === post.author_handle);
              const sentimentResult = analyzeSentiment(post.post_content);
              const { error: insertError } = await supabase.from("social_media_posts").insert({
                school_id: (school == null ? void 0 : school.id) || null,
                coach_id: (coach == null ? void 0 : coach.id) || null,
                platform: post.platform,
                post_url: post.post_url,
                post_content: post.post_content,
                post_date: post.post_date,
                author_name: post.author_name,
                author_handle: post.author_handle,
                engagement_count: post.engagement_count,
                is_recruiting_related: post.is_recruiting_related,
                sentiment: sentimentResult.sentiment
              });
              if (!insertError) {
                postsInserted++;
              }
            }
          }
        }
        if (instagramHandles.length > 0) {
          const instagramPosts = await instagramService.fetchMediaForHandles(instagramHandles);
          stats.totalPostsFetched += instagramPosts.length;
          for (const post of instagramPosts) {
            const { data: existing } = await supabase.from("social_media_posts").select("id").eq("post_url", post.post_url).single();
            if (!existing) {
              const school = schools == null ? void 0 : schools.find((s) => s.instagram_handle === post.author_handle);
              const coach = coaches == null ? void 0 : coaches.find((c) => c.instagram_handle === post.author_handle);
              const sentimentResult = analyzeSentiment(post.post_content);
              const { error: insertError } = await supabase.from("social_media_posts").insert({
                school_id: (school == null ? void 0 : school.id) || null,
                coach_id: (coach == null ? void 0 : coach.id) || null,
                platform: post.platform,
                post_url: post.post_url,
                post_content: post.post_content,
                post_date: post.post_date,
                author_name: post.author_name,
                author_handle: post.author_handle,
                engagement_count: post.engagement_count,
                is_recruiting_related: post.is_recruiting_related,
                sentiment: sentimentResult.sentiment
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
        stats.errors.push(`User ${user.id}: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }
    logger.info("Social media sync completed");
    return stats;
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: error instanceof Error ? error.message : "Sync failed"
    });
  }
});

export { syncAll_post as default };
//# sourceMappingURL=sync-all.post.mjs.map
