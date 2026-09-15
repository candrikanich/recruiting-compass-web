-- Reverses the "a minor's account is always linked to a consenting guardian" invariant
-- introduced in 20260822000000_minor_requires_family_invite.sql and extended in
-- 20260926000000_guardian_claims.sql. That invariant was never a legal requirement —
-- COPPA covers under-13 only (see trg_enforce_minimum_age, untouched by this migration);
-- the 13-17 guardian-link requirement was an unreviewed product decision. This app's
-- actual goal is voluntary family collaboration, not a signup gate, and competitor
-- recruiting platforms (NCSA, CaptainU, SportsRecruits) don't gate account creation on a
-- parent at all. See docs/superpowers/specs/2026-09-12-guardian-optional-signup-wizard-design.md.
--
-- Dropped rather than left as a no-op: nothing else in the schema depends on this
-- trigger or function once the guardian-link check is removed — the under-13 floor lives
-- in a separate trigger (trg_enforce_minimum_age) that this migration does not touch.
drop trigger if exists trg_enforce_minor_requires_invite on public.users;
drop function if exists public.enforce_minor_requires_invite();

comment on table public.guardian_claims is
  'Player-initiated request for a parent/guardian to confirm a 13-17 account. Optional — '
  'a player may skip naming a guardian entirely (see 20260927000000_guardian_link_optional.sql) '
  'and invite one later from the dashboard. Converted to family membership + '
  'users.guardian_consent_* when the guardian accepts.';
