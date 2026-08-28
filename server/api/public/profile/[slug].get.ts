import {
  defineEventHandler,
  getRouterParam,
  createError,
  setHeader,
  getRequestHeader,
  setResponseStatus,
} from "h3";
import { useLogger } from "~/server/utils/logger";
import { getPublicProfile } from "~/server/utils/publicProfileRead";

export { assemblePublicProfile } from "~/server/utils/publicProfileAssemble";

const HASH_SLUG_RE = /^[a-z0-9]{6}$/;
const VANITY_SLUG_RE = /^[a-z0-9][a-z0-9-]{0,28}[a-z0-9]$/;

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "public/profile");
  try {
    const slug = getRouterParam(event, "slug")!;

    if (!HASH_SLUG_RE.test(slug) && !VANITY_SLUG_RE.test(slug)) {
      throw createError({
        statusCode: 404,
        statusMessage: "Profile not found",
      });
    }

    const result = await getPublicProfile(slug);

    if (result.kind === "not_found") {
      logger.warn("Profile slug not found", { slug });
      throw createError({
        statusCode: 404,
        statusMessage: "Profile not found",
      });
    }

    if (result.kind === "gone") {
      logger.info("Profile is unpublished", { slug });
      setHeader(event, "Cache-Control", "private, no-store");
      throw createError({
        statusCode: 410,
        statusMessage: "This profile is not currently available",
      });
    }

    // Revalidate on every request so unpublish cannot linger on a CDN.
    // ETag lets clients/proxies short-circuit with 304 after the publish check.
    setHeader(event, "Cache-Control", "private, no-cache");
    setHeader(event, "ETag", result.etag);
    setHeader(event, "X-Cache", result.source);

    const ifNoneMatch = getRequestHeader(event, "if-none-match");
    if (ifNoneMatch && ifNoneMatch === result.etag) {
      setResponseStatus(event, 304);
      return null;
    }

    logger.info("Public profile served", { slug, source: result.source });
    return result.data;
  } catch (err) {
    if (err instanceof Error && "statusCode" in err) throw err;
    logger.error("Failed to load profile", err);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to load profile",
    });
  }
});
