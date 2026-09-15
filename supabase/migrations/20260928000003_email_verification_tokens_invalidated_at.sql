-- Distinguish tokens superseded by a resend from tokens actually consumed
-- by a successful verification. Both previously shared consumed_at, so a
-- stale link from before a resend could still be treated as "verified"
-- (already_verified branch stamping email_verified_at on any consumed_at
-- row, invalidated or not).
alter table public.email_verification_tokens
  add column if not exists invalidated_at timestamptz null;
