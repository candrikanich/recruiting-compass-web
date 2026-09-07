-- supabase/migrations/20260907000000_email_sends.sql
-- Issue #670 follow-up to #526 Phase 2 (email_events). Persists the Resend
-- messageId at send time together with the context that produced it (who,
-- why, and the originating entity), so /admin/email and admin user-detail
-- can answer "did this invite/digest/alert actually deliver?" instead of
-- showing a bare message_id. One row per attempted send (success or not);
-- message_id is null when Resend never returned an id (config/timeout/error).
-- Joins to email_events on message_id — that table remains the pure
-- webhook-ingested side and is untouched by this migration.

create table if not exists public.email_sends (
  id uuid primary key default gen_random_uuid(),
  message_id text,
  purpose text not null check (
    purpose in (
      'invite',
      'notification',
      'onboarding_nudge',
      'deadline_alert',
      'weekly_digest',
      'recurring',
      'feedback'
    )
  ),
  recipient_email text not null,
  user_id uuid references public.users (id) on delete set null,
  family_unit_id uuid references public.family_units (id) on delete set null,
  entity_type text,
  entity_id text,
  subject text,
  success boolean not null,
  error text,
  created_at timestamptz not null default now()
);

create index if not exists email_sends_message_id_idx
  on public.email_sends (message_id);
create index if not exists email_sends_user_id_idx
  on public.email_sends (user_id);
create index if not exists email_sends_family_unit_id_idx
  on public.email_sends (family_unit_id);
create index if not exists email_sends_created_at_idx
  on public.email_sends (created_at);

alter table public.email_sends enable row level security;
revoke all on public.email_sends from anon, authenticated;
grant select, insert on public.email_sends to service_role;
