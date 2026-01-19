import { d as defineEventHandler, c as createLogger, a as createError } from '../../../nitro/nitro.mjs';
import { c as createServerSupabaseClient } from '../../../_/supabase.mjs';
import { createClient } from '@supabase/supabase-js';
import { r as requireAuth, a as assertNotParent } from '../../../_/auth.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import 'crypto';

async function batchFetchLogos$1(userId) {
  const supabase = createClient(
    process.env.NUXT_PUBLIC_SUPABASE_URL,
    process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY
  );
  try {
    console.log("Starting batch favicon fetch for userId:", userId);
    let query = supabase.from("schools").select("id, name, website, favicon_url");
    if (userId) {
      console.log("Filtering schools by user_id:", userId);
      query = query.eq("user_id", userId);
    }
    const { data: schools, error } = await query;
    if (error) {
      console.error("Query error:", error);
      throw error;
    }
    if (!schools || schools.length === 0) {
      console.log("No schools found for userId:", userId);
      return { success: true, processed: 0, fetched: 0, message: "No schools found" };
    }
    console.log(`Found ${schools.length} schools for userId ${userId}`);
    console.log("Clearing existing favicon_url values to force re-fetch...");
    await supabase.from("schools").update({ favicon_url: null }).eq("user_id", userId);
    console.log(`Fetching favicons for ${schools.length} schools...`);
    let successCount = 0;
    for (const school of schools) {
      try {
        const logoUrl = await fetchFaviconForSchool(school);
        if (logoUrl) {
          const { error: updateError } = await supabase.from("schools").update({ favicon_url: logoUrl }).eq("id", school.id);
          if (updateError) {
            console.warn(`Failed to save logo for ${school.name}:`, updateError.message);
          } else {
            successCount++;
            console.log(`\u2713 Fetched logo for ${school.name}`);
          }
        } else {
          console.log(`\u2717 No logo found for ${school.name}`);
        }
        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch (error2) {
        console.error(`Error processing ${school.name}:`, error2);
      }
    }
    console.log(`
Batch fetch complete: ${successCount}/${schools.length} successful`);
    return {
      success: true,
      processed: schools.length,
      fetched: successCount,
      message: `Fetched favicons for ${successCount} out of ${schools.length} schools`
    };
  } catch (error) {
    console.error("Batch fetch failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
async function fetchFaviconForSchool(school) {
  try {
    let domain;
    if (school.website) {
      domain = school.website.replace(/^(https?:\/\/)?(www\.)?/, "").replace(/\/$/, "");
    } else {
      domain = school.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") + ".edu";
    }
    const sources = [
      `https://www.google.com/s2/favicons?sz=128&domain=${encodeURIComponent(school.website || school.name)}`,
      `https://icons.duckduckgo.com/ip3/${domain}.ico`,
      `https://${domain}/favicon.ico`,
      `https://www.${domain}/favicon.ico`
    ];
    for (const source of sources) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5e3);
        try {
          const response = await fetch(source, {
            method: "HEAD",
            signal: controller.signal
          });
          clearTimeout(timeoutId);
          if (response.ok) {
            return source;
          }
        } catch (error) {
          clearTimeout(timeoutId);
          throw error;
        }
      } catch (error) {
        continue;
      }
    }
    return null;
  } catch (error) {
    console.error(`Error fetching favicon for ${school.name}:`, error);
    return null;
  }
}

const logger = createLogger();
const batchFetchLogos = defineEventHandler(async (event) => {
  try {
    const user = await requireAuth(event);
    const supabase = createServerSupabaseClient();
    await assertNotParent(user.id, supabase);
    logger.info("Batch fetch logos endpoint called");
    return await batchFetchLogos$1(user.id);
  } catch (error) {
    if (error instanceof Error && "statusCode" in error) {
      throw error;
    }
    throw createError({
      statusCode: 500,
      statusMessage: error instanceof Error ? error.message : "Failed to batch fetch logos"
    });
  }
});

export { batchFetchLogos as default };
//# sourceMappingURL=batch-fetch-logos.mjs.map
