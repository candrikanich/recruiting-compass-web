import {
  defineEventHandler,
  getQuery,
  createError,
} from "h3";
import { requireAuth } from "~/server/utils/auth";
import { useLogger } from "~/server/utils/logger";

const COLLEGE_SCORECARD_BASE =
  "https://api.data.gov/ed/collegescorecard/v1/schools";

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "colleges/search");
  await requireAuth(event);

  const { q, id, fields, per_page } = getQuery(event);

  if (!q && !id) {
    throw createError({
      statusCode: 400,
      statusMessage: "q or id query parameter required",
    });
  }

  if (q && String(q).length < 3) {
    throw createError({
      statusCode: 400,
      statusMessage: "q must be at least 3 characters",
    });
  }

  const config = useRuntimeConfig();
  const apiKey = config.collegeScorecardApiKey as string;

  const params = new URLSearchParams({ api_key: apiKey });

  if (q) params.set("school.name", String(q));
  if (id) params.set("id", String(id));
  if (fields) params.set("fields", String(fields));

  const limit = per_page ? Math.min(Number(per_page) || 10, 20) : 10;
  params.set("per_page", String(limit));

  try {
    const url = `${COLLEGE_SCORECARD_BASE}?${params.toString()}`;
    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 429) {
        throw createError({
          statusCode: 429,
          statusMessage: "College search rate limited",
        });
      }
      logger.warn("College Scorecard API error", { status: response.status });
      throw createError({
        statusCode: 502,
        statusMessage: "College search unavailable",
      });
    }

    return await response.json();
  } catch (err) {
    if (err instanceof Error && "statusCode" in err) throw err;
    logger.error("College Scorecard fetch failed", err);
    throw createError({
      statusCode: 503,
      statusMessage: "College search unavailable",
    });
  }
});
