-- supabase/migrations/20260906000001_inbound_email_tables.sql
-- Phase 1 (issue #586): raw inbound-email sink + parsed/matched draft
-- interactions awaiting player confirmation (Phase 2 UI, not built yet).
-- Mirrors the profile_contacts lead-capture shape: service-role writes only,
-- family-scoped RLS read, no coach/school row ever created from this input.

create table if not exists public.raw_inbound_emails (
  id uuid primary key default gen_random_uuid(),
  family_unit_id uuid references public.family_units(id) on delete cascade,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.raw_inbound_emails enable row level security;
-- No SELECT policy: raw payloads may contain full email bodies/headers and
-- are for debugging only, purged after 7 days by a cron job (Task 6). Only
-- the service-role client (webhook + purge cron) ever touches this table.

create index if not exists idx_raw_inbound_emails_created_at
  on public.raw_inbound_emails (created_at);

create table if not exists public.inbound_email_drafts (
  id uuid primary key default gen_random_uuid(),
  family_unit_id uuid not null references public.family_units(id) on delete cascade,
  raw_email_id uuid references public.raw_inbound_emails(id) on delete set null,
  matched_coach_id uuid references public.coaches(id) on delete set null,
  matched_school_id uuid references public.schools(id) on delete set null,
  sender_name text,
  sender_email text,
  subject text,
  body_text text,
  occurred_at timestamptz not null default now(),
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'discarded')),
  confirmed_interaction_id uuid references public.interactions(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.inbound_email_drafts enable row level security;

-- Family members read their own pending drafts (Phase 2 review UI). No
-- INSERT/UPDATE/DELETE policy yet — the webhook writes via service-role;
-- confirm/discard mutations are added in Phase 2 alongside the UI that
-- calls them, scoped narrowly to status transitions only.
create policy "inbound_email_drafts family read"
  on public.inbound_email_drafts
  for select
  using (
    family_unit_id in (
      select family_unit_id
      from public.family_members
      where user_id = auth.uid()
    )
  );

create index if not exists idx_inbound_email_drafts_family
  on public.inbound_email_drafts (family_unit_id, status, created_at desc);
