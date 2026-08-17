/**
 * GET /api/admin/ops/db-health
 * DB health panel for the admin Ops "Health" tab: curated table row counts,
 * storage bucket object counts, and an orphaned-storage dryRun preview.
 *
 * SELECT/count/list only — no mutation. Every individual count/bucket/preview
 * is wrapped so ONE failure never fails the whole panel: it degrades to
 * `null` for that item instead of throwing (never a 500 for the whole panel).
 *
 * Requires: Authentication + is_admin.
 */

import { defineEventHandler } from "h3";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAdmin } from "~/server/utils/auth";
import { useSupabaseAdmin } from "~/server/utils/supabase";
import { useLogger } from "~/server/utils/logger";

/** Curated set of tables worth watching at a glance — not every table. */
const KEY_TABLES = [
  "users",
  "family_units",
  "schools",
  "coaches",
  "interactions",
  "offers",
  "events",
  "athlete_messages",
  "cron_runs",
  "admin_audit_log",
] as const;

export interface AdminDbHealthResponse {
  rowCounts: { table: string; count: number | null }[];
  storage: { bucket: string; objects: number | null }[];
  orphanedPreview: {
    deadUsers: number;
    objects: number;
    expiredExports: number;
  } | null;
}

interface SweepDryRunResult {
  dryRun?: boolean;
  perBucket?: Record<string, { deadUsers?: number; objects?: number }>;
  expiredExports?: number;
  totalObjects?: number;
}

async function loadRowCounts(
  db: ReturnType<typeof useSupabaseAdmin>,
  logger: ReturnType<typeof useLogger>,
): Promise<AdminDbHealthResponse["rowCounts"]> {
  // admin_audit_log is not yet in the generated Database schema (migration
  // applied live but not to the repo's generated types) — same untyped
  // client pattern used in server/utils/adminAudit.ts.
  const untypedDb = db as unknown as SupabaseClient;
  return Promise.all(
    KEY_TABLES.map(async (table) => {
      try {
        const { count, error } = await untypedDb
          .from(table)
          .select("id", { count: "exact", head: true });
        if (error) {
          logger.warn("Row count failed for table", { table, error });
          return { table, count: null };
        }
        return { table, count: count ?? 0 };
      } catch (err) {
        logger.warn("Row count threw for table", { table, err: String(err) });
        return { table, count: null };
      }
    }),
  );
}

async function loadStorage(
  db: ReturnType<typeof useSupabaseAdmin>,
  logger: ReturnType<typeof useLogger>,
): Promise<AdminDbHealthResponse["storage"]> {
  try {
    const { data: buckets, error } = await db.storage.listBuckets();
    if (error || !buckets) {
      logger.warn("listBuckets failed", { error });
      return [];
    }
    return Promise.all(
      buckets.map(async (bucket) => {
        try {
          // Shallow top-level list — an approximation of bucket size for a
          // health glance, not a recursive/exact object count.
          const { data, error: listError } = await db.storage
            .from(bucket.name)
            .list("", { limit: 1000 });
          if (listError) {
            logger.warn("Bucket list failed", {
              bucket: bucket.name,
              error: listError,
            });
            return { bucket: bucket.name, objects: null };
          }
          return { bucket: bucket.name, objects: data?.length ?? 0 };
        } catch (err) {
          logger.warn("Bucket list threw", {
            bucket: bucket.name,
            err: String(err),
          });
          return { bucket: bucket.name, objects: null };
        }
      }),
    );
  } catch (err) {
    logger.warn("Storage listing threw", { err: String(err) });
    return [];
  }
}

async function loadOrphanedPreview(
  logger: ReturnType<typeof useLogger>,
): Promise<AdminDbHealthResponse["orphanedPreview"]> {
  try {
    const secret = process.env.CRON_SECRET;
    if (!secret) {
      logger.warn("CRON_SECRET not configured; skipping orphaned preview");
      return null;
    }
    const sweep = await $fetch<SweepDryRunResult>(
      "/api/cron/orphaned-storage-sweep",
      { headers: { "x-cron-secret": secret }, query: { dryRun: 1 } },
    );
    const perBucketValues = Object.values(sweep.perBucket ?? {});
    return {
      deadUsers: perBucketValues.reduce(
        (sum, b) => sum + (b.deadUsers ?? 0),
        0,
      ),
      objects: sweep.totalObjects ?? 0,
      expiredExports: sweep.expiredExports ?? 0,
    };
  } catch (err) {
    logger.warn("Orphaned storage preview failed", { err: String(err) });
    return null;
  }
}

export default defineEventHandler(
  async (event): Promise<AdminDbHealthResponse> => {
    const logger = useLogger(event, "admin/ops/db-health");
    await requireAdmin(event);
    const db = useSupabaseAdmin();

    const [rowCounts, storage, orphanedPreview] = await Promise.all([
      loadRowCounts(db, logger),
      loadStorage(db, logger),
      loadOrphanedPreview(logger),
    ]);

    return { rowCounts, storage, orphanedPreview };
  },
);
