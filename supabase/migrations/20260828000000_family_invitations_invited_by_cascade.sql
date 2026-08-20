-- family_invitations.invited_by → public.users had ON DELETE NO ACTION, so
-- deleting a user who ever sent an invite FK-fails ("Database error deleting
-- user"). The app's process-account-deletions cron works around this by
-- deleting family_invitations manually, but the raw Supabase admin
-- deleteUser() path (used by E2E cleanup / global-teardown) chokes on it.
--
-- invited_by is NOT NULL, so ON DELETE SET NULL is not an option. CASCADE is
-- the correct semantics: an invitation authored by a now-deleted user is void.
-- This matches family_invitations.family_unit_id, which already cascades on
-- family_units delete. Deleting the invitation record does NOT remove any
-- already-accepted membership (family_members is a separate row).

ALTER TABLE public.family_invitations
  DROP CONSTRAINT IF EXISTS family_invitations_invited_by_fkey;

ALTER TABLE public.family_invitations
  ADD CONSTRAINT family_invitations_invited_by_fkey
  FOREIGN KEY (invited_by)
  REFERENCES public.users (id)
  ON DELETE CASCADE;
