/**
 * Batch fetch logos for all schools
 * Can be run one-time or periodically to update missing favicons
 */

import { createClient } from "@supabase/supabase-js";
import { createLogger } from "~/server/utils/logger";

const logger = createLogger("batch-fetch-logos");

export async function batchFetchLogos(userId?: string): Promise<{
  success: boolean;
  processed?: number;
  fetched?: number;
  message?: string;
  error?: string;
}> {
  const supabase = createClient(
    process.env.NUXT_PUBLIC_SUPABASE_URL!,
    process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  try {
    logger.info("Starting batch favicon fetch for userId:", userId);

    // Get all schools
    let query = supabase
      .from("schools")
      .select("id, name, website, favicon_url");

    if (userId) {
      logger.info("Filtering schools by user_id:", userId);
      query = query.eq("user_id", userId);
    }

    const { data: schools, error } = await query;

    if (error) {
      logger.error("Query error:", error);
      throw error;
    }

    if (!schools || schools.length === 0) {
      logger.info("No schools found for userId:", userId);
      return {
        success: true,
        processed: 0,
        fetched: 0,
        message: "No schools found",
      };
    }

    logger.info(`Found ${schools.length} schools for userId ${userId}`);

    // Clear existing favicon_url values to force re-fetch (in case they were invalid)
    // This ensures we always get fresh logos
    logger.info("Clearing existing favicon_url values to force re-fetch...");
    await supabase
      .from("schools")
      .update({ favicon_url: null })
      .eq("user_id", userId);

    // Fetch logos for all schools
    logger.info(`Fetching favicons for ${schools.length} schools...`);
    let successCount = 0;

    for (const school of schools) {
      try {
        const logoUrl = await fetchFaviconForSchool(school);

        if (logoUrl) {
          // Update school with favicon URL
          const { error: updateError } = await supabase
            .from("schools")
            .update({ favicon_url: logoUrl })
            .eq("id", school.id);

          if (updateError) {
            logger.warn(
              `Failed to save logo for ${school.name}:`,
              updateError.message,
            );
          } else {
            successCount++;
            logger.info(`Fetched logo for ${school.name}`);
          }
        } else {
          logger.info(`No logo found for ${school.name}`);
        }

        // Add small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch (error) {
        logger.error(`Error processing ${school.name}:`, error);
      }
    }

    logger.info(
      `Batch fetch complete: ${successCount}/${schools.length} successful`,
    );

    return {
      success: true,
      processed: schools.length,
      fetched: successCount,
      message: `Fetched favicons for ${successCount} out of ${schools.length} schools`,
    };
  } catch (error) {
    logger.error("Batch fetch failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Fetch favicon for a single school
 */
interface SchoolLogoInfo {
  id: string;
  name: string;
  website?: string | null;
  favicon_url?: string | null;
}

async function fetchFaviconForSchool(
  school: SchoolLogoInfo,
): Promise<string | null> {
  try {
    // Extract domain from website
    let domain: string;

    if (school.website) {
      // Clean existing website URL
      domain = school.website
        .replace(/^(https?:\/\/)?(www\.)?/, "")
        .replace(/\/$/, "");
    } else {
      // Create URL-safe slug from name
      domain =
        school.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-") // Replace non-alphanumeric with dashes
          .replace(/^-+|-+$/g, "") + // Trim dashes
        ".edu";
    }

    // Prioritize external favicon services (they handle fuzzy domain matching better)
    const sources = [
      `https://www.google.com/s2/favicons?sz=128&domain=${encodeURIComponent(school.website || school.name)}`,
      `https://icons.duckduckgo.com/ip3/${domain}.ico`,
      `https://${domain}/favicon.ico`,
      `https://www.${domain}/favicon.ico`,
    ];

    for (const source of sources) {
      try {
        // Use AbortController for proper timeout support
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        try {
          const response = await fetch(source, {
            method: "HEAD",
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (response.ok) {
            return source;
          }
        } catch (error) {
          clearTimeout(timeoutId);
          throw error;
        }
      } catch {
        // Continue to next source on error
        continue;
      }
    }

    return null;
  } catch (error) {
    logger.error(`Error fetching favicon for ${school.name}:`, error);
    return null;
  }
}
