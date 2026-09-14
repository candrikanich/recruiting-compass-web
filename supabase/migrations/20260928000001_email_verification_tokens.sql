-- Service-role-only verification tokens, decoupled from Supabase's native
-- confirmation OTPs. 24h expiry (spec: docs/superpowers/specs/2026-09-14-decoupled-email-verification-design.md §3).
create table if not exists public.email_verification_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null unique,
  expires_at timestamptz not null,
  consumed_at timestamptz null,
  created_at timestamptz not null default now()
);

create index if not exists email_verification_tokens_user_id_idx
  on public.email_verification_tokens (user_id);

alter table public.email_verification_tokens enable row level security;

-- No client-visible policies — service role (server/utils/supabase.ts
-- useSupabaseAdmin()) bypasses RLS entirely, matching admin_audit_log.
