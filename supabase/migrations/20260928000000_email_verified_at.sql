-- email_verified_at is this app's own verification record, decoupled from
-- Supabase's native email-confirmation gate (which withholds the session
-- until confirmed — incompatible with getting new users to the dashboard
-- immediately). See docs/superpowers/specs/2026-09-14-decoupled-email-verification-design.md.
alter table public.users
  add column if not exists email_verified_at timestamptz null;

-- Backfill: carry over any real prior Supabase confirmation.
update public.users u
set email_verified_at = au.email_confirmed_at
from auth.users au
where u.id = au.id
  and au.email_confirmed_at is not null
  and u.email_verified_at is null;

-- Grandfather every other existing account (including QA accounts created
-- while enable_confirmations = false, which never had anything to confirm) —
-- only accounts created after this ships go through the real gate.
update public.users
set email_verified_at = now()
where email_verified_at is null;
