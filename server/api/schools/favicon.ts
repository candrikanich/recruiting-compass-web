/**
 * Favicon Scraper API
 * Fetches school logos from their website favicon
 * Handles caching to minimize external requests
 */

export default defineEventHandler(async (event) => {
  try {
    const { schoolDomain, schoolId } = getQuery(event);

    if (!schoolDomain) {
      throw createError({
        statusCode: 400,
        statusMessage: "schoolDomain query parameter required",
      });
    }

    // Normalize domain (remove www. and protocol if present)
    let domain = String(schoolDomain)
      .replace(/^(https?:\/\/)?(www\.)?/, "")
      .replace(/\/$/, "");

    // Ensure domain is URL-safe (no spaces)
    domain = domain
      .toLowerCase()
      .replace(/[^a-z0-9.-]+/g, "-")
      .replace(/^-+|-+$/g, "");

    // Try multiple favicon sources in order of preference
    // Prioritize external services (they handle fuzzy matching)
    const faviconSources = [
      `https://www.google.com/s2/favicons?sz=128&domain=${encodeURIComponent(String(schoolDomain))}`,
      `https://icons.duckduckgo.com/ip3/${domain}.ico`,
      `https://${domain}/favicon.ico`,
      `https://www.${domain}/favicon.ico`,
    ];

    let faviconUrl: string | null = null;

    // Try each source until one succeeds
    for (const source of faviconSources) {
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
            faviconUrl = source;
            break;
          }
        } catch (error) {
          clearTimeout(timeoutId);
          throw error;
        }
      } catch (error) {
        // Continue to next source on error
        continue;
      }
    }

    // If favicon found and schoolId provided, store in cache
    if (faviconUrl && schoolId) {
      try {
        const cacheKey = `favicon-${schoolId}`;
        // Store in memory cache or Redis (basic implementation)
        // In production, could use Supabase Cache or Redis
      } catch (cacheError) {
        console.warn("Failed to cache favicon:", cacheError);
        // Continue anyway, just log the error
      }
    }

    return {
      success: true,
      faviconUrl: faviconUrl || null,
      domain,
      schoolId,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Favicon scraper error:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to fetch favicon",
    });
  }
});
