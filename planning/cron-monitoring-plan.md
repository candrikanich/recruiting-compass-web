# Cron Monitoring — Plan

Branch: `worktree-feat+cron-monitoring` (worktree, based off main / PR #368)

## Problem

7 Vercel crons run daily/weekly. Zero execution history in DB — success/failure/last-run
lives only in ephemeral Vercel logs + the un-stored HTTP response. Failure signaling is
inconsistent: `cleanup-expired-invites`, `process-account-deletions`, and `health-ping`
(degraded) return HTTP 200 even when work failed, so Vercel's dashboard shows green while
the job is broken. Can't answer "did cleanup run last night, did it succeed?".

## Goal

Record every cron run to a DB table; surface last-run + status + errors in an admin tab.
Foundation for later housekeeping crons (audit-log retention, notification prune, orphaned
storage) — so we can prove they actually run.

## Deliverables

1. **`cron_runs` table** — migration `20260825000000_cron_runs.sql`. Columns:
   `id, job_name, started_at, finished_at, status(running|success|partial|error),
   rows_processed, rows_failed, duration_ms, error, created_at`. Index `(job_name, started_at desc)`.
   RLS enabled, **no policies** → service-role only (admin endpoint uses service role).
2. **`server/utils/cronRunner.ts`**
   - `requireCronAuth(event)` — extracts the duplicated CRON_SECRET check (Bearer or
     `x-cron-secret`, `verifySharedSecret`), throws 401. DRYs all 7 crons.
   - `withCronRun(event, jobName, fn)` — auth → insert `running` row → run `fn(ctx)` →
     update `success`/`partial`/`error` + counts + duration. On throw: record `error`, rethrow
     (so Vercel sees non-2xx). `ctx.setProcessed(n)` / `ctx.setFailed(n)`; `partial` when failed>0.
     All `cron_runs` writes are best-effort (try/catch, log only) — recording never breaks the cron.
3. **Wrap all 7 crons** with `withCronRun` — minimal diff, return statements intact.
4. **`server/api/admin/cron-runs.get.ts`** — `requireAdmin`; returns per-job latest run +
   recent history + staleness (expected cadence vs last success).
5. **`composables/useAdminCronRuns.ts`** — mirrors `useAdminHealthCheck`.
6. **`pages/admin/index.vue`** — add "Jobs" tab: card per cron, red if failed/stale, last error.
7. **Retention** — `cleanup-expired-invites` also prunes `cron_runs` older than 30d.
8. **Tests** — `cronRunner` unit test (records success/partial/error, auth 401, recording
   failure doesn't break fn).

## Not in scope (follow-up)

The 3 new housekeeping crons (audit-log retention, notification prune, orphaned-storage sweep)
and dead-device-token pruning. Build after monitoring lands.
