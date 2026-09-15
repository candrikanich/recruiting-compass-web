-- Distinguish tokens superseded by a resend from tokens actually consumed
-- by a successful verification. Both previously shared consumed_at, so a
-- stale link from before a resend could still be treated as "verified"
-- (already_verified branch stamping email_verified_at on any consumed_at
-- row, invalidated or not).
alter table public.email_verification_tokens
  add column if not exists invalidated_at timestamptz null;

-- Backfill: pre-fix, a resend superseded the old token by stamping
-- consumed_at (the only state that existed), same field a genuine verify
-- uses. Any consumed_at row belonging to a still-unverified user can only
-- be one of those superseded tokens — a real verify would have set
-- email_verified_at already. Mark them invalidated_at (using their existing
-- consumed_at as the timestamp) so consumeVerificationToken's new
-- invalidated-branch catches stale pre-fix links instead of the
-- already_verified branch silently verifying the account.
update public.email_verification_tokens t
set invalidated_at = t.consumed_at
from public.users u
where t.user_id = u.id
  and t.consumed_at is not null
  and t.invalidated_at is null
  and u.email_verified_at is null;
