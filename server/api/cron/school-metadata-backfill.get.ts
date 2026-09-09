/**
 * GET /api/cron/school-metadata-backfill
 * Weekly: backfills mascot / athletics_url / school_colors on schools
 * missing any of them, via the static-JSON lookupSchoolMetadata util
 * (issue #580). Null-fill-only — a school with a user-entered value in any
 * of these columns is left untouched for that column (issue #583). Same
 * `current ?? found` merge as the enrich-confirm trigger (#582).
 *
 * Batched at BATCH_SIZE with a delay between batches. The static-JSON
 * lookup itself is instant/no-network (Wikidata was dropped per spike
 * #576 — 2.4% mascot coverage), but batching keeps this job's shape ready
 * for any future network-backed source without a rewrite.
 *
 * Security: Vercel sends CRON_SECRET as "Authorization: Bearer <secret>".
 * Manual callers may also pass it as "x-cron-secret: <secret>".
 */
import { defineEventHandler } from "h3";
import { withCronRun } from "~/server/utils/cronRunner";
import { useSupabaseAdmin } from "~/server/utils/supabase";
import { useLogger } from "~/server/utils/logger";
import { lookupSchoolMetadata } from "~/server/utils/schoolMetadataLookup";

const BATCH_SIZE = 5;
const BATCH_DELAY_MS = 1000;

interface CronResult {
  total: number;
  updated: number;
  skipped: number;
  failed: number;
}

interface SchoolRow {
  id: string;
  name: string;
  mascot: string | null;
  athletics_url: string | null;
  school_colors: string[] | null;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default defineEventHandler(async (event) =>
  withCronRun(event, "school-metadata-backfill", async (ctx) => {
    const logger = useLogger(event, "cron/school-metadata-backfill");
    const supabase = useSupabaseAdmin();

    const { data: schools, error } = (await supabase
      .from("schools")
      .select("id, name, mascot, athletics_url, school_colors")
      .or(
        "mascot.is.null,athletics_url.is.null,school_colors.is.null",
      )) as {
      data: SchoolRow[] | null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      error: any;
    };

    if (error || !schools) {
      logger.error("Failed to fetch backfill candidates", error);
      ctx.setFailed(1);
      return { total: 0, updated: 0, skipped: 0, failed: 1 };
    }

    const result: CronResult = {
      total: schools.length,
      updated: 0,
      skipped: 0,
      failed: 0,
    };

    for (let i = 0; i < schools.length; i += BATCH_SIZE) {
      const batch = schools.slice(i, i + BATCH_SIZE);

      for (const school of batch) {
        try {
          const found = lookupSchoolMetadata(school.name);

          const mascot = school.mascot ?? found.mascot;
          const athleticsUrl = school.athletics_url ?? found.athleticsUrl;
          const schoolColors =
            school.school_colors ??
            (found.colors && found.colors.length > 0 ? found.colors : null);

          const patch: Partial<SchoolRow> = {};
          if (school.mascot === null && mascot !== null) patch.mascot = mascot;
          if (school.athletics_url === null && athleticsUrl !== null)
            patch.athletics_url = athleticsUrl;
          if (school.school_colors === null && schoolColors !== null)
            patch.school_colors = schoolColors;

          if (Object.keys(patch).length === 0) {
            result.skipped++;
            continue;
          }

          const { error: updateError } = await supabase
            .from("schools")
            .update(patch)
            .eq("id", school.id);

          if (updateError) {
            result.failed++;
            logger.error(
              `Failed to backfill metadata for school ${school.id}`,
              updateError,
            );
            continue;
          }

          result.updated++;
        } catch (err) {
          result.failed++;
          logger.error(`Backfill error for school ${school.id}`, err);
        }
      }

      if (i + BATCH_SIZE < schools.length) {
        await sleep(BATCH_DELAY_MS);
      }
    }

    ctx.setProcessed(result.total);
    ctx.setFailed(result.failed);
    return result;
  }),
);
