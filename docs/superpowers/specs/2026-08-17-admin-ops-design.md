# Admin Ops Health (#2) — Design Spec

**Date:** 2026-08-17
**Status:** Approved (design), pending implementation plan
**Author:** Chris + Claude
**Subsystem:** Spec C of 4 (Foundation → #1 Support → **#2 Ops** → #3 Growth)
**Builds on:** admin foundation (merged to develop) — `layouts/admin.vue`, `components/Admin/*`, `adminAudit`, `cron_runs`/`cron-runs.get.ts`.

## Context

The admin area has a Jobs tab (cron status cards + recent-runs table) and a
minimal Health tab (2 trivial checks). Ops health adds operational visibility +
one safe control:
1. **Cron dashboard upgrade** — per-job sparklines + consecutive-failure alerts,
   plus a **safe manual "Run now"** for non-destructive jobs.
2. **DB health panel** — table row counts, storage bucket sizes, orphaned-storage
   preview.

Codebase findings that shaped this:
- `cron_runs` table (`job_name, started_at, finished_at, status, rows_processed,
  rows_failed, duration_ms, error, created_at`; RLS no-policy/service-role).
  `cron-runs.get.ts` returns `{ jobs, recent }` (recent = last 50). `withCronRun`
  (`server/utils/cronRunner.ts`) records every run and accepts `x-cron-secret`.
- 9 crons in `vercel.json`. **Destructive:** `process-account-deletions`
  (hard-deletes users), `notification-prune`, `cleanup-expired-invites` (no
  dryRun), `orphaned-storage-sweep` (has `?dryRun=1`). Non-destructive:
  `daily-suggestions`, `generate-notifications`, `weekly-digest`, `health-ping`,
  `video-health-check`.
- No manual-trigger mechanism today; crons gate on `CRON_SECRET`, not admin
  session.
- Health check today = DB connectivity + Resend key presence only. No
  row-count/size/slow-query utilities exist.
- Foundation rails all present: `AdminChart` (sparkline preset), `AdminStatTile`,
  `AdminDataTable`, `adminQuery`, `adminAudit`.

## Decisions (locked with Chris)

| Fork | Decision |
|---|---|
| Spec C scope | Cron upgrade + DB health panel. **Sentry feed deferred to Spec C2** (needs a new `SENTRY_AUTH_TOKEN` issue:read; org/project already hardcoded `chris-andrikanich`/`javascript-nuxt`). |
| Manual cron trigger | **Safe jobs only.** Allowlist the 5 non-destructive; `orphaned-storage-sweep` dryRun-only; the 3 hard-delete jobs 403 from the UI. Each trigger audited. |
| Placement | Enhance the existing **Jobs** tab (cron) and **Health** tab (DB) in place — no new `/admin/ops` page. |
| Cron invocation | Trigger endpoint invokes the target cron carrying `CRON_SECRET` so the run records itself; the plan/implementer picks the robust mechanism (internal call with the secret vs extracting handler bodies). |
| pg-level metrics | `pg_database_size` / slow-query stats **deferred** (need a Postgres RPC or the Management API — not cheap via supabase-js). |

## Scope

### 1. Cron dashboard upgrade (`pages/admin/jobs.vue`)

- **Per-job sparkline** (`AdminChart` type `sparkline`): last ~14 runs' outcome
  (success=up/fail=down or duration trend) per job, computed **client-side** from
  the `recent` rows already returned by `cron-runs.get.ts`, grouped by `job_name`.
  If `recent` (50 rows) is too few to show ~14 per job across 9 jobs, raise
  `cron-runs.get.ts`'s recent slice (e.g. to 150) — a one-line change, still one
  query.
- **Consecutive-failure alert badge** per card: count trailing non-success runs
  for that job from the recent rows; badge when ≥ a threshold (e.g. 2).
- Keep existing status cards + recent-runs table unchanged.

### 2. Manual cron trigger (safe subset)

**Endpoint** `POST /api/admin/cron/trigger`:
- `requireAdmin(event)` first. Body validated with Zod: `{ jobName: string, dryRun?: boolean }`.
- **Server-side allowlist** (the gate — never trust the UI):
  ```
  TRIGGERABLE = daily-suggestions, generate-notifications, weekly-digest,
                health-ping, video-health-check
  DRYRUN_ONLY = orphaned-storage-sweep   // endpoint forces dryRun=true
  BLOCKED     = process-account-deletions, notification-prune,
                cleanup-expired-invites  // 403 always
  ```
  Unknown or blocked jobName → 403. `orphaned-storage-sweep` → force `dryRun=true`
  regardless of body.
- Invoke the target cron so it records a `cron_runs` row via `withCronRun`. The
  implementer picks the robust mechanism: preferred = a server-side call to the
  cron's route with the `x-cron-secret: <CRON_SECRET>` header (env-provided);
  acceptable alternative = extracting each triggerable cron's core into a shared
  function the endpoint calls directly. Either way the run is recorded and the
  destructive jobs are never reachable.
- **Audit**: add `"cron.trigger"` to `AdminAuditAction` (`server/utils/adminAudit.ts`);
  `logAdminAction(event, { action: "cron.trigger", meta: { jobName, dryRun } })`.
- Return `{ ok, jobName, dryRun, result? }` (surface the sweep's dryRun preview
  when present).

**UI** (`pages/admin/jobs.vue`): a **"Run now"** button on triggerable job cards
(calls the endpoint, then refetches cron-runs). `orphaned-storage-sweep`'s button
reads **"Preview (dry run)"** and shows the returned preview. The 3 destructive
jobs render no button + a small "scheduled only" note. Button disabled while a
trigger is in flight.

### 3. DB health panel (Health tab)

**Endpoint** — extend `server/api/admin/health.get.ts` OR add
`server/api/admin/ops/db-health.get.ts` (implementer's call; keep the existing
connectivity + Resend checks working). `requireAdmin`, service-role:
- **Row counts** for a curated key-table set (e.g. `users`, `family_units`,
  `schools`, `coaches`, `interactions`, `offers`, `events`, `athlete_messages`,
  `cron_runs`, `admin_audit_log`) via `.select("id", { count: "exact", head: true })`.
- **Storage buckets**: object counts / sizes via the Supabase storage API
  (list buckets → per-bucket object listing/size).
- **Orphaned-storage preview**: reuse `orphaned-storage-sweep`'s `dryRun` output
  (dead users, objects, expired exports) — call it in dryRun the same way the
  trigger endpoint does.

**UI** (Health tab): `AdminStatTile` row for counts + `AdminDataTable` for
storage buckets and the orphaned preview. Keep existing health checks visible.

## Security

- `requireAdmin` on both new endpoints before any work.
- **Trigger allowlist enforced server-side** — UI hiding is cosmetic; a blocked
  `jobName` returns 403 regardless of client. `orphaned-storage-sweep` forced to
  dryRun server-side (the UI cannot override).
- `CRON_SECRET` stays server-only; never sent to the client.
- Every trigger writes a `cron.trigger` audit row (`logAdminAction` never throws).
- DB-health endpoint is count/SELECT + storage-list only — no mutation.

## Error handling

- Trigger: invalid/blocked job → 403; downstream cron error → surface a generic
  failure + the cron records its own `error` row (visible in the dashboard). No
  raw secret/Postgres text to the client.
- DB-health: per-check failures degrade gracefully (a failed count shows "—", not
  a 500 for the whole panel).
- Composables: `{ data, loading, error }`, friendly messages.

## Testing

- **Unit:** trigger allowlist (safe job invokes + records; each destructive job →
  403; sweep → dryRun forced true; audit `cron.trigger` fired with jobName/dryRun);
  db-health aggregation shape + graceful per-check failure; sparkline + consecutive-
  failure derivation from recent rows.
- **Component:** job card renders sparkline; "Run now" present for triggerable jobs,
  ABSENT for the 3 destructive jobs; sweep card shows "Preview (dry run)".
- **E2E:** admin triggers a safe job (e.g. `health-ping`) and the dashboard reflects
  a new run; DB health panel renders. Run with `NUXT_PUBLIC_ADMIN_HOST=localhost:3003`.
  Verify a `cron.trigger` audit row lands.

## Reuse (from foundation)

`AdminChart` (sparkline), `AdminStatTile`, `AdminDataTable`, `adminAudit`
(+ new `cron.trigger` enum), `cron_runs` + `cron-runs.get.ts`, `withCronRun`,
`orphaned-storage-sweep` dryRun, existing Jobs + Health tabs.

## NOT in scope (YAGNI)

- Sentry issue feed (→ Spec C2; needs `SENTRY_AUTH_TOKEN`).
- Triggering destructive jobs from the UI (permanent server-side block).
- `pg_database_size` / slow-query metrics (deferred — needs RPC/Management API).
- A new consolidated `/admin/ops` page (enhancing Jobs + Health instead).

## Open items

- Confirm the exact triggerable-cron route paths + how `withCronRun` is invoked
  when calling internally (the implementer verifies `requireCronAuth` accepts the
  `x-cron-secret` header path and that a self-call records a `cron_runs` row).
- Confirm the storage bucket list API available to the service-role client.
