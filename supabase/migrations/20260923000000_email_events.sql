-- supabase/migrations/20260923000000_email_events.sql
-- Resend outbound email lifecycle events (sent/delivered/bounced/complained/
-- opened/clicked), ingested by POST /api/webhooks/resend-events. One row per
-- event (Resend can send multiple events per message_id over its lifetime).
-- Service-role only — no RLS policies, same pattern as admin_audit_log and
-- cache_snapshots. Not linked to family_unit_id/user_id: that would require
-- retrofitting every sendViaResend() call site with context, which is out of
-- scope for this table (see plan header).

create table if not exists public.email_events (
  id uuid primary key default gen_random_uuid(),
  message_id text not null,
  event_type text not null check (
    event_type in (
      'sent',
      'delivered',
      'delivery_delayed',
      'bounced',
      'complained',
      'opened',
      'clicked',
      'failed'
    )
  ),
  recipient_email text,
  subject text,
  occurred_at timestamptz not null,
  raw_payload jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists email_events_message_id_idx
  on public.email_events (message_id);
create index if not exists email_events_event_type_occurred_at_idx
  on public.email_events (event_type, occurred_at desc);
create index if not exists email_events_created_at_idx
  on public.email_events (created_at);

alter table public.email_events enable row level security;
revoke all on public.email_events from anon, authenticated;
grant select, insert, delete on public.email_events to service_role;
