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
