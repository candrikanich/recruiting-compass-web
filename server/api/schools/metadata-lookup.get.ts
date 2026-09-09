/**
 * GET /api/schools/metadata-lookup?name=<school name>
 *
 * Pre-save school-metadata lookup for the "add school" flow (issue #581) —
 * called after NCAA-autocomplete selection, before the school row exists,
 * so it can't hang off /api/schools/[id]/enrich (no id yet). Thin wrapper
 * around the same lookupSchoolMetadata util the enrich endpoint (#582) and
 * cron backfill (#583) use. Read-only, authed-user-only (no family scoping
 * needed — this queries third-party data, not this family's records).
 */
import { defineEventHandler, getQuery, createError } from "h3";
import { requireAuth } from "~/server/utils/auth";
import { lookupSchoolMetadata } from "~/server/utils/schoolMetadataLookup";

export default defineEventHandler(async (event) => {
  await requireAuth(event);

  const query = getQuery(event);
  const name = typeof query.name === "string" ? query.name.trim() : "";

  if (!name) {
    throw createError({ statusCode: 400, statusMessage: "School name required" });
  }

  const data = lookupSchoolMetadata(name);
  return { success: true, data };
});
