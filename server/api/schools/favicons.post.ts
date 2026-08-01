/**
 * Batch Favicon Scraper API
 * Resolves favicons for many schools in one request so the /schools page
 * doesn't fan out N parallel calls (Sentry N+1 detector).
 */

import { z } from "zod";
import { requireAuth } from "~/server/utils/auth";
import { useLogger } from "~/server/utils/logger";
import {
  findFaviconUrl,
  isAllowedDomain,
  normalizeDomain,
} from "~/server/utils/faviconLookup";

const batchFaviconSchema = z.object({
  schools: z
    .array(
      z.object({
        schoolId: z.string().min(1),
        schoolDomain: z.string().min(1),
      }),
    )
    .min(1)
    .max(50),
});

// 50 schools worst-case (all sources down): 5 chunks × PER_SCHOOL_DEADLINE_MS
// = 50s — must stay under the 60s Vercel serverless timeout
const CONCURRENCY = 10;
const PER_SCHOOL_DEADLINE_MS = 10_000;

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "schools/favicons");
  await requireAuth(event);

  try {
    const body = await readBody(event);
    const parsed = batchFaviconSchema.safeParse(body);
    if (!parsed.success) {
      logger.warn("Validation failed for batch favicon", parsed.error.issues);
      throw createError({ statusCode: 400, statusMessage: "Invalid request" });
    }

    const { schools } = parsed.data;
    const faviconUrls: Record<string, string | null> = {};

    // Resolve in small chunks — each lookup can probe up to 8 external sources
    for (let i = 0; i < schools.length; i += CONCURRENCY) {
      const chunk = schools.slice(i, i + CONCURRENCY);
      await Promise.all(
        chunk.map(async ({ schoolId, schoolDomain }) => {
          const domain = normalizeDomain(schoolDomain);
          if (!isAllowedDomain(domain)) {
            faviconUrls[schoolId] = null;
            return;
          }
          faviconUrls[schoolId] = await findFaviconUrl(domain, schoolDomain, {
            deadlineMs: PER_SCHOOL_DEADLINE_MS,
          });
        }),
      );
    }

    const found = Object.values(faviconUrls).filter(Boolean).length;
    logger.info(`Resolved ${found}/${schools.length} favicons`);

    return {
      success: true,
      faviconUrls,
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    if (err instanceof Error && "statusCode" in err) throw err;
    logger.error("Batch favicon scraper error", err);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to fetch favicons",
    });
  }
});
