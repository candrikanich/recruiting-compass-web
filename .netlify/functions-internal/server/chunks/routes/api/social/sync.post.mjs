import { d as defineEventHandler, u as useRuntimeConfig, c as createLogger, a as createError } from '../../../nitro/nitro.mjs';
import { c as createServerSupabaseClient } from '../../../_/supabase.mjs';
import { T as TwitterService, I as InstagramService, a as analyzeSentiment } from '../../../_/sentimentAnalysis.mjs';
import { r as requireAuth, a as assertNotParent } from '../../../_/auth.mjs';
import { b as auditLog } from '../../../_/auditLog.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import 'crypto';
import '@supabase/supabase-js';
import '../../../_/sanitize.mjs';
import 'isomorphic-dompurify';

function isValidTwitterHandle(handle) {
  if (!handle || typeof handle !== "string") return false;
  const trimmed = handle.trim();
  const twitterRegex = /^@?[A-Za-z][A-Za-z0-9_]{0,29}$/;
  return twitterRegex.test(trimmed);
}
function isValidInstagramHandle(handle) {
  if (!handle || typeof handle !== "string") return false;
  const trimmed = handle.trim();
  const instagramRegex = /^[A-Za-z0-9._]{1,30}$/;
  if (trimmed.startsWith(".") || trimmed.startsWith("_")) return false;
  if (/[._]{2,}/.test(trimmed)) return false;
  return instagramRegex.test(trimmed);
}
function normalizeHandle(handle) {
  if (!handle || typeof handle !== "string") return "";
  return handle.replace(/^@+/, "").trim().toLowerCase();
}
function filterValidHandles(handles, platform) {
  return handles.filter((h) => h && typeof h === "string").map((h) => normalizeHandle(h)).filter((h) => {
    if (platform === "twitter") return isValidTwitterHandle(h);
    if (platform === "instagram") return isValidInstagramHandle(h);
    return false;
  });
}

const logger = createLogger();
const getHandles = (entities, handleKey) => {
  if (!Array.isArray(entities)) return [];
  return entities.filter((e) => typeof e === "object" && e !== null && handleKey in e && typeof e[handleKey] === "string").map((e) => e[handleKey]);
};
const findEntityByHandle = (entities, handleKey, targetHandle) => {
  if (!Array.isArray(entities)) return void 0;
  return entities.find((e) => typeof e === "object" && e !== null && e[handleKey] === targetHandle);
};
const sync_post = defineEventHandler(async (event) => {
  try {
    const user = await requireAuth(event);
    const supabase = createServerSupabaseClient();
    await assertNotParent(user.id, supabase);
    const config = useRuntimeConfig();
    const twitterService = new TwitterService(config.twitterBearerToken);
    const instagramService = new InstagramService(config.instagramAccessToken);
    const { data: schools, error: schoolsError } = await supabase.from("schools").select("id, name, twitter_handle, instagram_handle").eq("user_id", user.id);
    const { data: coaches, error: coachesError } = await supabase.from("coaches").select("id, name, twitter_handle, instagram_handle");
    if (schoolsError) {
      logger.error("Failed to fetch schools", schoolsError);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to fetch schools"
      });
    }
    const rawTwitterHandles = [
      ...getHandles(schools, "twitter_handle"),
      ...getHandles(coaches, "twitter_handle")
    ];
    const rawInstagramHandles = [
      ...getHandles(schools, "instagram_handle"),
      ...getHandles(coaches, "instagram_handle")
    ];
    const twitterHandles = filterValidHandles(rawTwitterHandles, "twitter");
    const instagramHandles = filterValidHandles(rawInstagramHandles, "instagram");
    if (rawTwitterHandles.length > twitterHandles.length) {
      logger.warn(
        `Filtered out ${rawTwitterHandles.length - twitterHandles.length} invalid Twitter handles`
      );
    }
    if (rawInstagramHandles.length > instagramHandles.length) {
      logger.warn(
        `Filtered out ${rawInstagramHandles.length - instagramHandles.length} invalid Instagram handles`
      );
    }
    let twitterFetched = 0;
    let twitterNew = 0;
    let instagramFetched = 0;
    let instagramNew = 0;
    if (twitterHandles.length > 0) {
      const twitterPosts = await twitterService.fetchTweetsForHandles(twitterHandles);
      twitterFetched = twitterPosts.length;
      if (twitterPosts.length > 0) {
        const newPosts = [];
        for (const post of twitterPosts) {
          const { data: existing } = await supabase.from("social_media_posts").select("id").eq("post_url", post.post_url).single();
          if (!existing) {
            const school = findEntityByHandle(schools, "twitter_handle", post.author_handle);
            const coach = findEntityByHandle(coaches, "twitter_handle", post.author_handle);
            const sentimentResult = analyzeSentiment(post.post_content);
            newPosts.push({
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
          }
        }
        if (newPosts.length > 0) {
          const { error: insertError } = await supabase.from("social_media_posts").insert(newPosts);
          if (insertError) {
            logger.error("Failed to insert Twitter posts", insertError);
          } else {
            twitterNew = newPosts.length;
          }
        }
      }
    }
    if (instagramHandles.length > 0) {
      const instagramPosts = await instagramService.fetchMediaForHandles(instagramHandles);
      instagramFetched = instagramPosts.length;
      if (instagramPosts.length > 0) {
        const newPosts = [];
        for (const post of instagramPosts) {
          const { data: existing } = await supabase.from("social_media_posts").select("id").eq("post_url", post.post_url).single();
          if (!existing) {
            const school = findEntityByHandle(schools, "instagram_handle", post.author_handle);
            const coach = findEntityByHandle(coaches, "instagram_handle", post.author_handle);
            const sentimentResult = analyzeSentiment(post.post_content);
            newPosts.push({
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
          }
        }
        if (newPosts.length > 0) {
          const { error: insertError } = await supabase.from("social_media_posts").insert(newPosts);
          if (insertError) {
            logger.error("Failed to insert Instagram posts", insertError);
          } else {
            instagramNew = newPosts.length;
          }
        }
      }
    }
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
        instagram_new: instagramNew
      }
    });
    return {
      success: true,
      message: `Sync completed. Twitter: ${twitterNew}/${twitterFetched} new. Instagram: ${instagramNew}/${instagramFetched} new.`,
      twitter: {
        fetched: twitterFetched,
        new: twitterNew
      },
      instagram: {
        fetched: instagramFetched,
        new: instagramNew
      }
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Social media sync failed";
    await auditLog(event, {
      userId: (await requireAuth(event).catch(() => ({ id: "unknown" }))).id,
      action: "CREATE",
      resourceType: "social_media_posts",
      errorMessage,
      status: "failure",
      description: "Social media sync failed"
    });
    throw createError({
      statusCode: 500,
      statusMessage: "Social media sync failed"
    });
  }
});

export { sync_post as default };
//# sourceMappingURL=sync.post.mjs.map
