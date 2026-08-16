-- Cron execution history. Each scheduled job (Vercel cron) records one row per run
-- via server/utils/cronRunner.ts withCronRun(). Gives us last-run time, success/failure,
-- rows processed, duration, and error text — none of which was previously stored anywhere
-- (only ephemeral Vercel logs + the un-persisted HTTP response). Surfaced in the admin
-- "Jobs" tab.
--
-- Access: RLS enabled with NO policies. The service role (useSupabaseAdmin) bypasses RLS
-- for both the cron writers and the admin read endpoint; anon/authenticated clients get
-- zero rows. This table is operational metadata, never user-facing.

create table if not exists public.cron_runs (
  id uuid primary key default gen_random_uuid(),
  job_name text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running'
    check (status in ('running', 'success', 'partial', 'error')),
  rows_processed integer,
  rows_failed integer,
  duration_ms integer,
  error text,
  created_at timestamptz not null default now()
);

comment on table public.cron_runs is
  'Execution history for Vercel cron jobs. Written by server/utils/cronRunner.ts. Service-role only (RLS on, no policies).';

-- Fast "latest run per job" and per-job history lookups.
create index if not exists cron_runs_job_started_idx
  on public.cron_runs (job_name, started_at desc);

alter table public.cron_runs enable row level security;
