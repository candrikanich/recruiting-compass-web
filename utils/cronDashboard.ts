/**
 * Client-safe cron job allowlists shared between the admin cron-trigger
 * server endpoint (`server/api/admin/cron/trigger.post.ts`) and the admin
 * Ops UI (Task 2). Lives outside `server/` so the UI can import it without
 * pulling server-only code into the client bundle.
 *
 * TRIGGERABLE_JOBS: safe to run on-demand from the admin UI, honoring the
 * caller's `dryRun` flag.
 * DRYRUN_ONLY_JOBS: can be triggered, but `dryRun` is always forced true
 * server-side regardless of what the caller requests.
 * BLOCKED_JOBS: destructive jobs — never triggerable from this endpoint,
 * listed here only so the UI can render them as disabled/hidden.
 */
export const TRIGGERABLE_JOBS = [
  "daily-suggestions",
  "generate-notifications",
  "weekly-digest",
  "health-ping",
  "video-health-check",
] as const;

export const DRYRUN_ONLY_JOBS = ["orphaned-storage-sweep"] as const;

export const BLOCKED_JOBS = [
  "process-account-deletions",
  "notification-prune",
  "cleanup-expired-invites",
] as const;

/**
 * Pure derivations for the admin Jobs tab (Task 2): sparklines and
 * consecutive-failure alerts computed client-side from the `recent` run
 * history returned by `GET /api/admin/cron-runs`. No I/O — safe to unit
 * test directly and reuse from both `pages/admin/jobs.vue` and the
 * component test.
 */
interface RunRow {
  job_name: string;
  status: string;
  duration_ms: number | null;
  started_at: string;
}

/** `recent` is ordered most-recent-first (cron-runs.get.ts orders started_at desc). */
export function recentForJob<T extends RunRow>(
  recent: T[],
  jobName: string,
  n: number,
): T[] {
  return recent.filter((r) => r.job_name === jobName).slice(0, n);
}

/** Counts trailing non-success runs from the most-recent run backwards. */
export function consecutiveFailures(recent: RunRow[], jobName: string): number {
  let n = 0;
  for (const r of recentForJob(recent, jobName, Number.MAX_SAFE_INTEGER)) {
    if (r.status === "success") break;
    n += 1;
  }
  return n;
}

export interface SparklineData {
  labels: string[];
  datasets: [{ data: number[] }];
}

/** Oldest→newest for a left-to-right trend; height = duration_ms. */
export function sparklineData(
  recent: RunRow[],
  jobName: string,
  n = 14,
): SparklineData {
  const rows = recentForJob(recent, jobName, n).slice().reverse();
  return {
    labels: rows.map((r) => r.started_at),
    datasets: [{ data: rows.map((r) => r.duration_ms ?? 0) }],
  };
}
