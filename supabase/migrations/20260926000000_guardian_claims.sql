-- Guardian-linked signup: let a 13-17 player start their own account and name a
-- guardian, instead of being turned away until a guardian invites them first.
--
-- Spec: planning/2026-09-11-guardian-linked-signup-spec.md (iOS repo).
--
-- The rule "a minor's account is linked to a consenting guardian" is UNCHANGED. What
-- changes is who may initiate it. Previously the only admissible proof was a
-- family_invitations row a guardian created; now a player-initiated guardian_claims row
-- is equally admissible, and the guardian converts it into real family membership plus a
-- guardian_consent_* stamp when they accept.
--
-- The 13 floor (trg_enforce_minimum_age) is untouched. COPPA is that floor; the 13-17
-- band is a product rule, and this migration only changes the product rule.

-- ORDERING NOTE (why the FK targets auth.users, not public.users):
-- The gate below is a BEFORE INSERT trigger on public.users, so a minor's profile row
-- cannot be inserted until a claim already exists — while an FK to public.users would
-- mean the claim cannot exist until the profile row does. Deadlock.
--
-- auth.users breaks it: Supabase creates the auth user first (it is the same uuid that
-- becomes public.users.id), so the signup endpoint can order the writes
--   auth user -> guardian_claims -> public.users
-- with referential integrity intact at every step and no deferred constraint needed.
-- Matches 20260909000000_profile_contacts.sql, which keys player_user_id the same way.
create table if not exists public.guardian_claims (
  id                uuid primary key default gen_random_uuid(),
  player_user_id    uuid not null references auth.users(id) on delete cascade,
  guardian_email    text not null,
  token             text not null unique,
  status            text not null default 'pending'
                      check (status in ('pending', 'claimed', 'expired', 'revoked')),
  created_at        timestamptz not null default now(),
  -- 45 days: the purge deadline from the spec's retention table. A claim that expires
  -- stops satisfying the trigger below, so an unclaimed minor cannot linger indefinitely.
  expires_at        timestamptz not null default (now() + interval '45 days'),
  claimed_at        timestamptz,
  claimed_by        uuid references public.users(id),
  last_reminder_at  timestamptz,
  reminder_count    int not null default 0
);

-- One live claim per player. Partial, so historical revoked/expired rows still accumulate
-- as an audit trail rather than being overwritten.
create unique index if not exists idx_guardian_claims_one_pending_per_player
  on public.guardian_claims (player_user_id)
  where status = 'pending';

-- Supports the trigger's per-INSERT lookup and the reminder cron's sweep.
create index if not exists idx_guardian_claims_player_status
  on public.guardian_claims (player_user_id, status);
create index if not exists idx_guardian_claims_pending_expiry
  on public.guardian_claims (expires_at)
  where status = 'pending';
create index if not exists idx_guardian_claims_guardian_email_lower
  on public.guardian_claims (lower(guardian_email));

-- Service-role only, no user-facing policies (same pattern as cache_snapshots).
--
-- Deliberate: `token` is the guardian's authorization to consent. A SELECT policy letting
-- the player read their own row would hand them their own guardian's token and let a minor
-- self-consent, defeating the entire mechanism. The pending-state banner is served by an
-- endpoint that returns status only, never the token.
alter table public.guardian_claims enable row level security;
alter table public.guardian_claims force row level security;

revoke all on table public.guardian_claims from anon, authenticated;
grant all on table public.guardian_claims to service_role;

comment on table public.guardian_claims is
  'Player-initiated request for a parent/guardian to confirm a 13-17 account. Converted to family membership + users.guardian_consent_* when the guardian accepts.';
comment on column public.guardian_claims.token is
  'Guardian authorization secret. Never exposed to the player — a minor holding it could self-consent.';

-- Widen the minor gate with a third admissible proof: a pending, unexpired claim.
--
-- security definer + pinned search_path are load-bearing and carried forward verbatim from
-- 20260925000020_fix_minor_invite_trigger_rls.sql: as SECURITY INVOKER the EXISTS checks
-- are filtered by the caller's own RLS, which made this trigger reject every legitimate
-- invited minor. guardian_claims is service-role-only, so without definer rights the new
-- branch below would likewise always see zero rows and reject every claim-based signup.
create or replace function public.enforce_minor_requires_invite()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
begin
  if new.role = 'player'
     and new.date_of_birth is not null
     and new.date_of_birth > (current_date - interval '18 years') then

    if not exists (
         -- Already a family member (post-join updates; expiry-proof)
         select 1
         from public.family_members fm
         where fm.user_id = new.id
       )
       and not exists (
         -- Guardian-initiated: a valid, unexpired invitation addressed to this email
         select 1
         from public.family_invitations fi
         where lower(fi.invited_email) = lower(new.email)
           and fi.role = 'player'
           and fi.status in ('pending', 'accepted')
           and fi.expires_at > now()
       )
       and not exists (
         -- Player-initiated: a pending, unexpired guardian claim for this player
         select 1
         from public.guardian_claims gc
         where gc.player_user_id = new.id
           and gc.status = 'pending'
           and gc.expires_at > now()
       ) then
      raise exception
        'Players under 18 must be linked to a parent or guardian.'
        using errcode = 'check_violation';
    end if;
  end if;

  return new;
end;
$function$;
