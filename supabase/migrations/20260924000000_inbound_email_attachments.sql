-- supabase/migrations/20260924000000_inbound_email_attachments.sql
-- Phase 3 Task 3 (issue #586): stage a forwarded coach email's attachments
-- (questionnaires, camp invites) alongside its draft, and link them into
-- `documents` only once the draft is confirmed into a real interaction.
-- Mirrors raw_inbound_emails: service-role writes only, no SELECT policy
-- (the storage object itself, not this row, is what a family member reads).

alter type public.document_type add value if not exists 'coach_attachment';

create table if not exists public.raw_inbound_attachments (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid not null references public.inbound_email_drafts(id) on delete cascade,
  family_unit_id uuid not null references public.family_units(id) on delete cascade,
  filename text not null,
  content_type text,
  storage_path text not null,
  created_at timestamptz not null default now()
);

alter table public.raw_inbound_attachments enable row level security;
-- No SELECT policy: only the webhook (staging) and confirm endpoint
-- (reading its own draft's rows to create `documents`) ever touch this
-- table, both via the service-role client. The purge cron (extended in
-- this task) also needs no policy — service-role bypasses RLS.

create index if not exists idx_raw_inbound_attachments_draft
  on public.raw_inbound_attachments (draft_id);

alter table public.documents
  add column if not exists interaction_id uuid references public.interactions(id) on delete set null;

create index if not exists idx_documents_interaction
  on public.documents (interaction_id)
  where interaction_id is not null;
