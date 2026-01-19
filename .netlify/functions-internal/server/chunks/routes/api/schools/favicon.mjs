import { d as defineEventHandler, b as getQuery, a as createError } from '../../../nitro/nitro.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import 'crypto';

const favicon = defineEventHandler(async (event) => {
  try {
    const { schoolDomain, schoolId } = getQuery(event);
    if (!schoolDomain) {
      throw createError({
        statusCode: 400,
        statusMessage: "schoolDomain query parameter required"
      });
    }
    let domain = String(schoolDomain).replace(/^(https?:\/\/)?(www\.)?/, "").replace(/\/$/, "");
    domain = domain.toLowerCase().replace(/[^a-z0-9.-]+/g, "-").replace(/^-+|-+$/g, "");
    const faviconSources = [
      `https://www.google.com/s2/favicons?sz=128&domain=${encodeURIComponent(String(schoolDomain))}`,
      `https://icons.duckduckgo.com/ip3/${domain}.ico`,
      `https://${domain}/favicon.ico`,
      `https://www.${domain}/favicon.ico`
    ];
    let faviconUrl = null;
    for (const source of faviconSources) {
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
            faviconUrl = source;
            break;
          }
        } catch (error) {
          clearTimeout(timeoutId);
          throw error;
        }
      } catch (error) {
        continue;
      }
    }
    if (faviconUrl && schoolId) {
      try {
        const cacheKey = `favicon-${schoolId}`;
      } catch (cacheError) {
        console.warn("Failed to cache favicon:", cacheError);
      }
    }
    return {
      success: true,
      faviconUrl: faviconUrl || null,
      domain,
      schoolId,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
  } catch (error) {
    console.error("Favicon scraper error:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to fetch favicon"
    });
  }
});

export { favicon as default };
//# sourceMappingURL=favicon.mjs.map
