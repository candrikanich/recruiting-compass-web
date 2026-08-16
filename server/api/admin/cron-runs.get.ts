/**
 * GET /api/admin/cron-runs
 * Cron monitoring for the admin "Jobs" tab: per-job latest run + status +
 * staleness, plus recent run history. Reads the `cron_runs` table (written by
 * server/utils/cronRunner.ts).
 * Requires: Authentication + is_admin.
 */

import { defineEventHandler, createError } from "h3";
import { requireAdmin } from "~/server/utils/auth";
import { useSupabaseAdmin } from "~/server/utils/supabase";
import { useLogger } from "~/server/utils/logger";

const HOUR_MS = 60 * 60 * 1000;

// The registered Vercel crons (kept in sync with vercel.json). `maxAgeMs` is
// how long since the last SUCCESS before we flag the job stale — one cadence
// plus generous slack so a single late run doesn't cry wolf.
const CRON_JOBS: { jobName: string; schedule: string; maxAgeMs: number }[] = [
  {
    jobName: "cleanup-expired-invites",
    schedule: "0 0 * * *",
    maxAgeMs: 26 * HOUR_MS,
  },
  {
    jobName: "process-account-deletions",
    schedule: "0 0 * * *",
    maxAgeMs: 26 * HOUR_MS,
  },
  {
    jobName: "video-health-check",
    schedule: "0 6 * * *",
    maxAgeMs: 26 * HOUR_MS,
  },
  {
    jobName: "daily-suggestions",
    schedule: "0 7 * * *",
    maxAgeMs: 26 * HOUR_MS,
  },
  {
    jobName: "generate-notifications",
    schedule: "0 8 * * *",
    maxAgeMs: 26 * HOUR_MS,
  },
  { jobName: "health-ping", schedule: "0 12 * * *", maxAgeMs: 26 * HOUR_MS },
  {
    jobName: "weekly-digest",
    schedule: "0 13 * * 1",
    maxAgeMs: 8 * 24 * HOUR_MS,
  },
  {
    jobName: "notification-prune",
    schedule: "0 3 * * 0",
    maxAgeMs: 8 * 24 * HOUR_MS,
  },
  {
    jobName: "orphaned-storage-sweep",
    schedule: "0 4 * * 0",
    maxAgeMs: 8 * 24 * HOUR_MS,
  },
];

export interface CronRunRow {
  id: string;
  job_name: string;
  started_at: string;
  finished_at: string | null;
  status: "running" | "success" | "partial" | "error";
  rows_processed: number | null;
  rows_failed: number | null;
  duration_ms: number | null;
  error: string | null;
}

export interface CronJobSummary {
  jobName: string;
  schedule: string;
  lastRun: CronRunRow | null;
  lastSuccessAt: string | null;
  running: boolean;
  /** No successful run within the expected cadence (or never ran). */
  stale: boolean;
}

export interface AdminCronRunsResponse {
  jobs: CronJobSummary[];
  recent: CronRunRow[];
}

export default defineEventHandler(
  async (event): Promise<AdminCronRunsResponse> => {
    const logger = useLogger(event, "admin/cron-runs");
    try {
      await requireAdmin(event);
      const supabase = useSupabaseAdmin();

      // One pass over recent history covers ~4 weeks of 7 daily jobs; group in JS.
      const { data, error } = await supabase
        .from("cron_runs")
        .select(
          "id, job_name, started_at, finished_at, status, rows_processed, rows_failed, duration_ms, error",
        )
        .order("started_at", { ascending: false })
        .limit(250);

      if (error) {
        logger.error("Failed to fetch cron_runs", error);
        throw createError({
          statusCode: 500,
          statusMessage: "Failed to fetch cron runs",
        });
      }

      const rows = (data ?? []) as CronRunRow[];
      const now = Date.now();

      const jobs: CronJobSummary[] = CRON_JOBS.map((job) => {
        const runs = rows.filter((r) => r.job_name === job.jobName);
        const lastRun = runs[0] ?? null;
        const lastSuccess =
          runs.find((r) => r.status === "success" || r.status === "partial") ??
          null;
        const lastSuccessAt = lastSuccess?.started_at ?? null;
        const stale = lastSuccessAt
          ? now - new Date(lastSuccessAt).getTime() > job.maxAgeMs
          : true;
        return {
          jobName: job.jobName,
          schedule: job.schedule,
          lastRun,
          lastSuccessAt,
          running: lastRun?.status === "running",
          stale,
        };
      });

      return { jobs, recent: rows.slice(0, 50) };
    } catch (error) {
      logger.error("Admin cron-runs endpoint failed", error);
      if (error instanceof Error && "statusCode" in error) {
        throw error;
      }
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to fetch cron runs",
      });
    }
  },
);
