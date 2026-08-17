-- server/migrations/020_admin_audit_log.sql
create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_admin_id uuid not null references auth.users(id),
  action text not null,
  target_user_id uuid references auth.users(id),
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.admin_audit_log enable row level security;
-- No policies: service-role only (matches cron_runs).
create index if not exists admin_audit_log_created_at_idx on public.admin_audit_log (created_at desc);
create index if not exists admin_audit_log_actor_idx on public.admin_audit_log (actor_admin_id);
create index if not exists admin_audit_log_target_idx on public.admin_audit_log (target_user_id);
