/**
 * Favicon Scraper API
 * Fetches school logos from their website favicon
 * Handles caching to minimize external requests
 */

import { requireAuth } from "~/server/utils/auth";
import { useLogger } from "~/server/utils/logger";

/**
 * Returns false for IP addresses and domains that could enable SSRF attacks.
 * Blocks: loopback, private ranges, link-local, domains without dots, domains with ports.
 */
function isAllowedDomain(domain: string): boolean {
  // Reject if port is present (already stripped by normalization but guard against colons)
  if (domain.includes(":")) return false;

  // Reject if no dot (bare hostnames like "localhost", "metadata", single-label names)
  if (!domain.includes(".")) return false;

  // Reject IP addresses matching private/loopback/link-local ranges
  const privateIpPattern =
    /^(localhost|0\.0\.0\.0|127\.\d{1,3}\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|169\.254\.\d{1,3}\.\d{1,3}|::1|fe80:)$/i;
  if (privateIpPattern.test(domain)) return false;

  return true;
}

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

    // Normalize domain (remove www. and protocol if present)
    let domain = String(schoolDomain)
      .replace(/^(https?:\/\/)?(www\.)?/, "")
      .replace(/\/$/, "");

    // Ensure domain is URL-safe (no spaces)
    domain = domain
      .toLowerCase()
      .replace(/[^a-z0-9.-]+/g, "-")
      .replace(/^-+|-+$/g, "");

    // Reject domains that could be used for SSRF attacks
    if (!isAllowedDomain(domain)) {
      throw createError({
        statusCode: 400,
        statusMessage: "Invalid or disallowed school domain",
      });
    }

    // Try multiple favicon sources in order of preference
    // Prioritize high-resolution icons, fall back to standard favicons
    const faviconSources = [
      // High-resolution sources (256x256 and above)
      `https://www.google.com/s2/favicons?sz=256&domain=${encodeURIComponent(String(schoolDomain))}`,
      `https://${domain}/apple-touch-icon.png`, // Usually 180x180
      `https://www.${domain}/apple-touch-icon.png`,
      `https://${domain}/apple-touch-icon-precomposed.png`,

      // Medium resolution (128x128)
      `https://www.google.com/s2/favicons?sz=128&domain=${encodeURIComponent(String(schoolDomain))}`,

      // Standard favicons (usually 16x16 or 32x32)
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
      } catch {
        // Continue to next source on error
        continue;
      }
    }


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
