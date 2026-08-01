/**
 * Favicon Scraper API
 * Fetches school logos from their website favicon
 * Handles caching to minimize external requests
 */

import { requireAuth } from "~/server/utils/auth";
import { useLogger } from "~/server/utils/logger";
import {
  findFaviconUrl,
  isAllowedDomain,
  normalizeDomain,
} from "~/server/utils/faviconLookup";

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "schools/favicon");
  await requireAuth(event);

  try {
    const { schoolDomain, schoolId } = getQuery(event);

    if (!schoolDomain) {
      throw createError({
        statusCode: 400,
        statusMessage: "schoolDomain query parameter required",
      });
    }

    const domain = normalizeDomain(String(schoolDomain));

    // Reject domains that could be used for SSRF attacks
    if (!isAllowedDomain(domain)) {
      throw createError({
        statusCode: 400,
        statusMessage: "Invalid or disallowed school domain",
      });
    }

    const faviconUrl = await findFaviconUrl(domain, String(schoolDomain));

    return {
      success: true,
      faviconUrl: faviconUrl || null,
      domain,
      schoolId,
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    if (err instanceof Error && "statusCode" in err) throw err;
    logger.error("Favicon scraper error", err);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to fetch favicon",
    });
  }
});
