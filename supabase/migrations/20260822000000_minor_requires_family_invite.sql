-- Minor consent: players aged 13-17 may only join through a parent/guardian family
-- invitation, never a standalone signup. Complements trg_enforce_minimum_age (which
-- blocks under-13). Product concept: parents and players work the recruiting process
-- together, so a minor's account is always established by a consenting guardian.
--
-- Enforcement lives at the DB layer because signup writes go browser -> Supabase
-- directly with no server endpoint (client gates are bypassable).
--
-- Discriminator (the users row itself looks identical for solo vs. invited signup):
--   * At INSERT (browser upsert in pages/join.vue): the family_invitations row already
--     exists as 'pending' and unexpired -> invited minor passes, solo minor is rejected.
--   * At later UPDATE (profile edits, guardian-consent stamping): the minor is already a
--     family_members row -> passes regardless of the original invitation's expiry. This
--     avoids false-rejecting joined minors once their invite naturally expires.
--
-- Fails OPEN on NULL date_of_birth (DOB is optional in some flows, never collected for
-- parents) and on 18+ players, so it never blocks legitimate rows.
--
-- The email match mirrors the accept endpoint's strict email-binding
-- (server/api/family/invite/[token]/accept.post.ts): a successful minor join already
-- requires signup email == invited_email, so this match introduces no new false-reject.

create or replace function public.enforce_minor_requires_invite()
returns trigger
language plpgsql
as $$
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
         -- Or has a valid, unexpired player invitation (initial signup insert)
         select 1
         from public.family_invitations fi
         where lower(fi.invited_email) = lower(new.email)
           and fi.role = 'player'
           and fi.status in ('pending', 'accepted')
           and fi.expires_at > now()
       ) then
      raise exception
        'Players under 18 must join through a parent or guardian family invitation.'
        using errcode = 'check_violation';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_minor_requires_invite on public.users;

create trigger trg_enforce_minor_requires_invite
  before insert or update on public.users
  for each row
  execute function public.enforce_minor_requires_invite();

-- Supports the trigger's case-insensitive invited_email lookup, run on every under-18
-- player INSERT/UPDATE. Existing invitation indexes cover only token and
-- (family_unit_id, status), not this path.
create index if not exists idx_family_invitations_invited_email_lower
  on public.family_invitations (lower(invited_email));

-- Guardian-consent record for minor accounts. Stamped by the invite-accept endpoint
-- (server, service-role) when a minor accepts. Proof that a consenting parent/guardian
-- established the account, and which Terms version they accepted on the minor's behalf.
alter table public.users
  add column if not exists guardian_consent_at timestamptz,
  add column if not exists guardian_consent_by uuid references public.users(id),
  add column if not exists guardian_consent_terms_version text;

comment on column public.users.guardian_consent_at is
  'When a parent/guardian consented to this minor player account (via family invite accept).';
comment on column public.users.guardian_consent_by is
  'The parent/guardian (family_invitations.invited_by) who consented on the minor''s behalf.';
comment on column public.users.guardian_consent_terms_version is
  'Terms of Service version the guardian accepted on the minor''s behalf (e.g. 2026-03-01).';
